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

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    let buffer = "";
    const pending = [];
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const waiter = pending.shift();
        if (waiter) waiter(JSON.parse(line));
      }
    });
    socket.once("error", reject);
    socket.once("connect", () => resolve({
      socket,
      request(body) {
        return new Promise((done) => {
          pending.push(done);
          socket.write(`${JSON.stringify(body)}\n`);
        });
      },
    }));
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

async function main() {
  const port = await freePort();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-ip-rate-"));
  const daemon = spawn(process.execPath,
    ["/root/freelang-surface-v0-clean-ek3qo2/v11/bootstrap.js", "run", "tests/tcp-daemon.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env,
      AFJ_DB_MODE: "development", AFJ_DB_PORT: String(port),
      AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_WAL: path.join(directory, "tcp.wal"),
      AFJ_DB_RATE_MAX_REQUESTS: "3" }, stdio: ["ignore", "pipe", "pipe"] });
  const clients = [];
  try {
    await waitForOutput(daemon, "TCP server STARTED");
    await waitForPort(port);
    const first = await connectClient(port);
    const second = await connectClient(port);
    clients.push(first, second);
    assert.strictEqual((await first.request({ type: "ping" })).ok, true);
    assert.strictEqual((await second.request({ type: "ping" })).ok, true);
    assert.strictEqual((await first.request({ type: "ping" })).ok, true);
    assert.strictEqual((await second.request({ type: "ping" })).error, "RATE_LIMITED");
    console.log("afj-db95 runtime peer IP rate limit PASS");
  } finally {
    for (const client of clients) client.socket.destroy();
    daemon.kill("SIGTERM");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
