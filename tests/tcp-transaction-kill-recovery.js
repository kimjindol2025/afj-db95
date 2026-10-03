"use strict";

const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

function waitForOutput(child, expected) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`start timeout: ${output}`)), 30000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(expected)) {
        clearTimeout(timer);
        child.stdout.off("data", onData);
        child.stderr.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => reject(new Error(`daemon exited ${code}: ${output}`)));
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
        if (Date.now() >= deadline) reject(new Error("port did not open"));
        else setTimeout(probe, 50);
      });
    };
    probe();
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
    socket.once("connect", () => resolve({
      socket,
      request(body) {
        return new Promise((resolveRequest, rejectRequest) => {
          pending.push({ resolve: resolveRequest, reject: rejectRequest });
          socket.write(`${JSON.stringify(body)}\n`);
        });
      },
    }));
  });
}

async function startDaemon(port, walPath) {
  const daemon = spawn(process.execPath,
    ["/root/freelang-surface-v0-clean-ek3qo2/v11/bootstrap.js", "run", "tests/tcp-daemon.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env,
      AFJ_DB_MODE: "development", AFJ_DB_PORT: String(port),
      AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_WAL: walPath },
      stdio: ["ignore", "pipe", "pipe"] });
  await waitForOutput(daemon, "TCP server STARTED");
  await waitForPort(port);
  return daemon;
}

async function main() {
  const port = await freePort();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-tx-kill-"));
  const walPath = path.join(directory, "tcp.wal");
  let daemon;
  let client;
  try {
    daemon = await startDaemon(port, walPath);
    client = await connectClient(port);
    const login = await client.request({ type: "login", user: "root", password: "development-only" });
    assert.strictEqual(login.ok, true);
    const token = login.token;
    assert.strictEqual((await client.request({ type: "query", token,
      statement: "CREATE TABLE tx_kill_users (id INT PRIMARY KEY, name TEXT)" })).ok, true);
    assert.strictEqual((await client.request({ type: "query", token,
      statement: "INSERT INTO tx_kill_users (id,name) VALUES (1,'Committed')" })).ok, true);
    const begun = await client.request({ type: "query", token, statement: "START TRANSACTION" });
    assert.strictEqual(begun && begun.ok, true, JSON.stringify(begun));
    assert.strictEqual((await client.request({ type: "query", token,
      statement: "INSERT INTO tx_kill_users (id,name) VALUES (2,'Uncommitted')" })).ok, true);
    client.socket.destroy();
    daemon.kill("SIGKILL");
    await new Promise((resolve) => daemon.once("exit", resolve));
    daemon = await startDaemon(port, walPath);
    client = await connectClient(port);
    const restartedLogin = await client.request({ type: "login", user: "root", password: "development-only" });
    assert.strictEqual(restartedLogin.ok, true);
    const selected = await client.request({ type: "query", token: restartedLogin.token,
      statement: "SELECT * FROM tx_kill_users ORDER BY id" });
    assert.strictEqual(selected.ok, true);
    assert.deepStrictEqual(selected.result.rows, [{ id: "1", name: "Committed" }]);
    console.log("afj-db95 TCP transaction forced-kill recovery PASS");
  } finally {
    if (client) client.socket.destroy();
    if (daemon && !daemon.killed) daemon.kill("SIGTERM");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
