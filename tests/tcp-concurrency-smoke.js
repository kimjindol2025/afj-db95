"use strict";

const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function waitForOutput(child, text) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`daemon start timeout: ${output}`)), 30000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(text)) {
        clearTimeout(timer);
        child.stdout.off("data", onData);
        child.stderr.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`daemon exited ${code}: ${output}`));
    });
  });
}

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    let buffer = "";
    const pending = [];
    const fail = (error) => {
      while (pending.length) pending.shift().reject(error);
      reject(error);
    };
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const waiter = pending.shift();
        if (waiter) waiter.resolve(JSON.parse(line));
      }
    });
    socket.once("error", fail);
    socket.once("connect", () => {
      resolve({
        socket,
        request(body) {
          return new Promise((resolveRequest, rejectRequest) => {
            pending.push({ resolve: resolveRequest, reject: rejectRequest });
            socket.write(`${JSON.stringify(body)}\n`);
          });
        },
      });
    });
  });
}

function waitForPort(port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 30000;
    const probe = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) reject(new Error(`port ${port} did not open`));
        else setTimeout(probe, 50);
      });
    };
    probe();
  });
}

function waitForExit(child, timeoutMs = 5000, diagnostic = "") {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not exit after shutdown: ${diagnostic}`)), timeoutMs);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
}

async function main() {
  const port = await freePort();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-concurrency-"));
  const walPath = path.join(directory, "tcp.wal");
  const bootstrap = require("./runtime-bootstrap");
  const daemon = spawn(process.execPath, [bootstrap, "run", "src/server.fls"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, AFJ_DB_MODE: "development", AFJ_DB_PORT: String(port),
      AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_WAL: walPath,
      AFJ_DB_ROOT_PASSWORD: "entrypoint-test-password" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const clients = [];
  let restartedDaemon = null;
  let restartedClient = null;
  let daemonOutput = "";
  daemon.stdout.on("data", (chunk) => { daemonOutput += chunk.toString(); });
  daemon.stderr.on("data", (chunk) => { daemonOutput += chunk.toString(); });
  try {
    await waitForOutput(daemon, "afj-db95 server READY");
    await waitForPort(port);
    for (let index = 0; index < 8; index += 1) {
      const client = await connectClient(port);
      const login = await client.request({ type: "login", user: "root", password: "entrypoint-test-password" });
      assert.strictEqual(login.ok, true);
      client.token = login.token;
      clients.push(client);
    }
    const assertQueryOk = async (client, statement) => {
      const response = await client.request({ type: "query", token: client.token, statement });
      assert.strictEqual(response.ok, true, `${statement}: ${JSON.stringify(response)}`);
      return response;
    };
    await assertQueryOk(clients[0],
      "CREATE TABLE ddl_generation_guard (id INT PRIMARY KEY, note TEXT)");
    await assertQueryOk(clients[0],
      "INSERT INTO ddl_generation_guard (id,note) VALUES (1,'old')");
    await assertQueryOk(clients[0], "CREATE TABLE ddl_generation_sink (id INT PRIMARY KEY)");
    await assertQueryOk(clients[0], "START TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const generationRead = await clients[0].request({ type: "query", token: clients[0].token,
      statement: "SELECT * FROM ddl_generation_guard WHERE id=1" });
    assert.strictEqual(generationRead.ok, true);
    await assertQueryOk(clients[1], "START TRANSACTION");
    await assertQueryOk(clients[1], "DROP TABLE ddl_generation_guard");
    await assertQueryOk(clients[1],
      "CREATE TABLE ddl_generation_guard (id INT PRIMARY KEY, note TEXT)");
    await assertQueryOk(clients[1],
      "INSERT INTO ddl_generation_guard (id,note) VALUES (1,'new')");
    const generationWriterCommit = await clients[1].request({ type: "query",
      token: clients[1].token, statement: "COMMIT" });
    assert.strictEqual(generationWriterCommit.ok, true,
      JSON.stringify(generationWriterCommit));
    await assertQueryOk(clients[0],
      "INSERT INTO ddl_generation_sink (id) VALUES (10)");
    const staleGenerationCommit = await clients[0].request({ type: "query",
      token: clients[0].token, statement: "COMMIT" });
    assert.strictEqual(staleGenerationCommit.ok, false,
      JSON.stringify(staleGenerationCommit));
    assert.strictEqual(staleGenerationCommit.error, "TX_CONFLICT");
    const sinkRows = await clients[0].request({ type: "query", token: clients[0].token,
      statement: "SELECT * FROM ddl_generation_sink" });
    assert.strictEqual(sinkRows.ok, true);
    assert.deepStrictEqual(sinkRows.result.rows, [],
      "a stale reader's unrelated staged write must roll back after table recreation");

    await assertQueryOk(clients[0],
      "CREATE TABLE ddl_alter_guard (id INT PRIMARY KEY)");
    await assertQueryOk(clients[0], "INSERT INTO ddl_alter_guard (id) VALUES (1)");
    await assertQueryOk(clients[0],
      "CREATE TABLE ddl_alter_sink (id INT PRIMARY KEY)");
    await assertQueryOk(clients[0], "START TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const alterRead = await clients[0].request({ type: "query", token: clients[0].token,
      statement: "SELECT * FROM ddl_alter_guard WHERE id=1" });
    assert.strictEqual(alterRead.ok, true);
    await assertQueryOk(clients[1], "START TRANSACTION");
    await assertQueryOk(clients[1], "ALTER TABLE ddl_alter_guard ADD COLUMN note TEXT");
    const alterWriterCommit = await clients[1].request({ type: "query",
      token: clients[1].token, statement: "COMMIT" });
    assert.strictEqual(alterWriterCommit.ok, true, JSON.stringify(alterWriterCommit));
    await assertQueryOk(clients[0], "INSERT INTO ddl_alter_sink (id) VALUES (11)");
    const staleAlterCommit = await clients[0].request({ type: "query",
      token: clients[0].token, statement: "COMMIT" });
    assert.strictEqual(staleAlterCommit.ok, false, JSON.stringify(staleAlterCommit));
    assert.strictEqual(staleAlterCommit.error, "TX_CONFLICT");
    const alterSinkRows = await clients[0].request({ type: "query", token: clients[0].token,
      statement: "SELECT * FROM ddl_alter_sink" });
    assert.strictEqual(alterSinkRows.ok, true);
    assert.deepStrictEqual(alterSinkRows.result.rows, [],
      "a stale reader's unrelated write must roll back after schema alteration");

    const create = await clients[0].request({
      type: "query", token: clients[0].token,
      statement: "CREATE TABLE concurrent_users (id INT PRIMARY KEY, name TEXT)",
    });
    assert.strictEqual(create.ok, true);
    await Promise.all(clients.map((client, index) => client.request({
      type: "query", token: client.token,
      statement: `INSERT INTO concurrent_users (id,name) VALUES (${index},'client-${index}')`,
    })));
    const selected = await clients[0].request({
      type: "query", token: clients[0].token,
      statement: "SELECT * FROM concurrent_users",
    });
    assert.strictEqual(selected.ok, true);
    assert.strictEqual(selected.result.rows.length, 8);
    const shutdown = await clients[0].request({ type: "shutdown", token: clients[0].token });
    assert.strictEqual(shutdown.ok, true);
    assert.strictEqual(shutdown.status, "stopping");
    await waitForExit(daemon, 5000, daemonOutput);

    let restartOutput = "";
    restartedDaemon = spawn(process.execPath, [bootstrap, "run", "src/server.fls"], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, AFJ_DB_MODE: "development", AFJ_DB_PORT: String(port),
        AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_WAL: walPath,
        AFJ_DB_ROOT_PASSWORD: "entrypoint-test-password" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    restartedDaemon.stdout.on("data", (chunk) => { restartOutput += chunk.toString(); });
    restartedDaemon.stderr.on("data", (chunk) => { restartOutput += chunk.toString(); });
    await waitForOutput(restartedDaemon, "afj-db95 server READY");
    await waitForPort(port);
    restartedClient = await connectClient(port);
    const restartLogin = await restartedClient.request({
      type: "login", user: "root", password: "entrypoint-test-password",
    });
    assert.strictEqual(restartLogin.ok, true);
    const recovered = await restartedClient.request({
      type: "query", token: restartLogin.token,
      statement: "SELECT * FROM concurrent_users",
    });
    assert.strictEqual(recovered.ok, true);
    assert.strictEqual(recovered.result.rows.length, 8, "WAL rows must survive a real server restart");
    const restartShutdown = await restartedClient.request({
      type: "shutdown", token: restartLogin.token,
    });
    assert.strictEqual(restartShutdown.ok, true);
    await waitForExit(restartedDaemon, 5000, restartOutput);
    console.log("afj-db95 TCP concurrency and DDL MVCC PASS");
  } finally {
    for (const client of clients) client.socket.destroy();
    if (restartedClient) restartedClient.socket.destroy();
    if (daemon.exitCode === null && daemon.signalCode === null) {
      daemon.kill("SIGTERM");
      await waitForExit(daemon);
    }
    if (restartedDaemon && restartedDaemon.exitCode === null && restartedDaemon.signalCode === null) {
      restartedDaemon.kill("SIGTERM");
      await waitForExit(restartedDaemon);
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
