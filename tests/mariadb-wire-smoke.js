"use strict";

const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { createMariaDbWireServer } = require("../tools/afj-mariadb-wire");
const { resolveBootstrap } = require("./runtime-path");

let daemonOutput = "";

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
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${text}: ${output}`)), 30000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(text)) {
        clearTimeout(timer);
        resolve(output);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited ${code}: ${output}`));
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
        if (Date.now() >= deadline) reject(new Error(`upstream port ${port} did not open`));
        else setTimeout(probe, 50);
      });
    };
    probe();
  });
}

function jsonProbe(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    let buffer = "";
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`FreeLang JSON probe timeout\nFreeLang daemon:\n${daemonOutput}`));
    }, 3000);
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.write("{\"type\":\"login\",\"user\":\"root\",\"password\":\"development-only\"}\n"));
    socket.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.includes("\n")) {
        clearTimeout(timer);
        socket.destroy();
        resolve(buffer);
      }
    });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
}

function runMaria(port, statement) {
  return new Promise((resolve, reject) => {
    const child = spawn("mariadb", [
      "--protocol=tcp", "--host=127.0.0.1", `--port=${port}`, "--connect-timeout=3", "--skip-ssl",
      "--user=root", "--password=development-only",
      "--batch", "--skip-column-names", "--raw", "--execute", statement,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0
      ? resolve(output)
      : reject(new Error(`mariadb exited ${code}: ${errors}\nFreeLang daemon:\n${daemonOutput}`)));
  });
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(() => resolve()));
}

async function main() {
  const upstreamPort = await freePort();
  const wirePort = await freePort();
  const walPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-wire-")), "tcp.wal");
  const bootstrap = resolveBootstrap();
  const daemon = spawn(process.execPath, [bootstrap, "run", "tests/tcp-daemon.fls"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      AFJ_DB_MODE: "development",
      AFJ_DB_PORT: String(upstreamPort),
      AFJ_DB_BIND_HOST: "127.0.0.1",
      AFJ_DB_WAL: walPath,
      AFJ_DB_ROOT_PASSWORD: "development-only",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  daemon.stdout.on("data", (chunk) => { daemonOutput += chunk.toString(); });
  daemon.stderr.on("data", (chunk) => { daemonOutput += chunk.toString(); });
  let wire;
  try {
    await waitForOutput(daemon, "TCP server STARTED");
    await waitForPort(upstreamPort);
    await jsonProbe(upstreamPort);
    wire = createMariaDbWireServer({ port: wirePort, upstreamPort });
    await new Promise((resolve, reject) => {
      wire.once("error", reject);
      wire.listen(wirePort, "127.0.0.1", resolve);
    });
    await runMaria(wirePort, "CREATE TABLE wire_users (id INT PRIMARY KEY, name TEXT)");
    await runMaria(wirePort, "INSERT INTO wire_users (id,name) VALUES (1,'Kim')");
    const selected = await runMaria(wirePort, "SELECT * FROM wire_users");
    assert.strictEqual(selected, "1\tKim\n");
    console.log("afj-db95 MariaDB wire standard-client PASS");
  } finally {
    if (wire) await closeServer(wire);
    daemon.kill("SIGTERM");
    fs.rmSync(path.dirname(walPath), { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
