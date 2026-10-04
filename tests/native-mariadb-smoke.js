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

function waitForOutput(child, expected) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`native MariaDB start timeout: ${output}`));
    }, 60000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(expected)) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      if (code !== null) reject(new Error(`native MariaDB daemon exited ${code}: ${output}`));
    });
  });
}

function runMaria(port, statement, password) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.MARIADB_CLI || "mariadb", ["--protocol=tcp", "--host=127.0.0.1", `--port=${port}`,
      "--connect-timeout=5", "--skip-ssl", "--user=root", `--password=${password}`,
      "--batch", "--skip-column-names", "--raw", "--execute", statement],
    { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += chunk.toString(); });
    child.stderr.on("data", (chunk) => { err += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve(out) : reject(new Error(`mariadb ${code}: ${err}`)));
  });
}

function waitForPort(port) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const probe = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", (error) => {
        socket.destroy();
        if (error.code === "ECONNREFUSED" && attempts++ < 30) setTimeout(probe, 100);
        else reject(error);
      });
    };
    probe();
  });
}

async function main() {
  const tcpPort = await freePort();
  let port = await freePort();
  while (port === tcpPort) port = await freePort();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-native-smoke-"));
  const password = "mariadb-smoke-test-password";
  const child = spawn(process.execPath,
    [require("./runtime-bootstrap"), "run", "src/server.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env,
      AFJ_DB_MODE: "development", AFJ_DB_PORT: String(tcpPort),
      AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_WAL: path.join(temp, "smoke.wal"),
      AFJ_DB_ROOT_PASSWORD: password, AFJ_DB_MARIADB_PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"] });
  let daemonOutput = "";
  child.stdout.on("data", (chunk) => { daemonOutput += chunk.toString(); });
  child.stderr.on("data", (chunk) => { daemonOutput += chunk.toString(); });
  try {
    await waitForOutput(child, "afj-db95 MariaDB wire READY");
    await waitForPort(port);
    try {
      await runMaria(port, "CREATE TABLE native_wire_users (id INT PRIMARY KEY, name TEXT)", password);
      await runMaria(port, "INSERT INTO native_wire_users (id,name) VALUES (1,'Kim')", password);
      assert.strictEqual(await runMaria(port, "SELECT * FROM native_wire_users", password), "1\tKim\n");
      await assert.rejects(
        () => runMaria(port,
          "CREATE TABLE unsupported_collation (name TEXT) COLLATE=utf8mb4_bin",
          password),
        /ERROR 1064/);
      assert.strictEqual(await runMaria(port, "SELECT * FROM native_wire_users", password), "1\tKim\n");
    } catch (error) {
      throw new Error(`${error.message}\nFreeLang daemon:\n${daemonOutput}`);
    }
    console.log("afj-db95 integrated MariaDB standard-client PASS");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once("close", resolve); child.kill("SIGTERM"); });
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
