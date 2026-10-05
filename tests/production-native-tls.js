"use strict";

const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const tls = require("tls");
const { execFileSync, spawn } = require("child_process");
const { resolveBootstrap } = require("./runtime-path");

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
    const timer = setTimeout(() => reject(new Error(`start timeout: ${output}`)), 20000);
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

function tlsPing(port, ca) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: "127.0.0.1", port, servername: "localhost",
      ca, rejectUnauthorized: true });
    let response = "";
    socket.once("error", reject);
    socket.once("secureConnect", () => socket.write("{\"type\":\"ping\"}\n"));
    socket.on("data", (chunk) => { response += chunk.toString(); socket.end(); });
    socket.once("close", () => resolve(response));
  });
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-prod-tls-"));
  const cert = path.join(directory, "server.crt");
  const key = path.join(directory, "server.key");
  const wal = path.join(directory, "db.wal");
  const audit = path.join(directory, "audit.jsonl");
  const authState = path.join(directory, "auth-state.jsonl");
  const pages = path.join(directory, "pages");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost"],
    { stdio: "ignore" });
  const port = await freePort();
  const child = spawn(process.execPath,
    [resolveBootstrap(), "run", "tests/tcp-daemon.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env,
      AFJ_DB_MODE: "production", AFJ_DB_PORT: String(port), AFJ_DB_BIND_HOST: "0.0.0.0",
      AFJ_DB_ROOT_PASSWORD: "production-test-password", AFJ_DB_WAL: wal,
      AFJ_DB_AUDIT_LOG: audit, AFJ_DB_AUTH_STATE: authState,
      AFJ_DB_CATALOG_PAGES: pages, AFJ_DB_TLS_CERT: cert, AFJ_DB_TLS_KEY: key },
      stdio: ["ignore", "pipe", "pipe"] });
  try {
    await waitForOutput(child, "afj-db95 TCP server STARTED");
    assert.strictEqual(await tlsPing(port, fs.readFileSync(cert)), "{\"ok\":true,\"type\":\"pong\"}\n");
    console.log("afj-db95 production native TLS integration PASS");
  } finally {
    child.kill("SIGTERM");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
