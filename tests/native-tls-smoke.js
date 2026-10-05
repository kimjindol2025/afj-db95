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
    const timer = setTimeout(() => reject(new Error(`TLS start timeout: ${output}`)), 15000);
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
    child.once("exit", (code) => reject(new Error(`TLS daemon exited ${code}: ${output}`)));
  });
}

function tlsEcho(port, ca) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: "127.0.0.1", port, servername: "localhost", ca,
      rejectUnauthorized: true });
    let response = "";
    socket.once("error", reject);
    socket.once("secureConnect", () => socket.write("native-tls\n"));
    socket.on("data", (chunk) => { response += chunk.toString(); socket.end(); });
    socket.once("close", () => resolve(response));
  });
}

function plainConnectionRejected(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    let data = "";
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("plain TCP was not rejected")); }, 5000);
    socket.once("connect", () => socket.write("plain\n"));
    socket.on("data", (chunk) => { data += chunk.toString(); });
    socket.once("error", () => { clearTimeout(timer); resolve(data); });
    socket.once("close", () => { clearTimeout(timer); resolve(data); });
  });
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-native-tls-"));
  const cert = path.join(directory, "server.crt");
  const key = path.join(directory, "server.key");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost"],
    { stdio: "ignore" });
  const port = await freePort();
  const child = spawn(process.execPath,
    [resolveBootstrap(), "run", "tests/native-tls-daemon.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env,
      AFJ_NATIVE_TLS_PORT: String(port), AFJ_NATIVE_TLS_CERT: cert,
      AFJ_NATIVE_TLS_KEY: key, AFJ_NATIVE_TLS_HOST: "127.0.0.1" },
      stdio: ["ignore", "pipe", "pipe"] });
  try {
    await waitForOutput(child, "afj-db95 native TLS STARTED");
    assert.strictEqual(await tlsEcho(port, fs.readFileSync(cert)), "native-tls\n");
    await plainConnectionRejected(port);
    console.log("afj-db95 native TLS listener PASS");
  } finally {
    child.kill("SIGTERM");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
