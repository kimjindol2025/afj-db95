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
    const timer = setTimeout(() => reject(new Error(`mTLS start timeout: ${output}`)), 15000);
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
    child.once("exit", (code) => reject(new Error(`mTLS daemon exited ${code}: ${output}`)));
  });
}

function tlsRequest(port, options, request) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    let settled = false;
    let retrying = false;
    const open = () => {
      const socket = tls.connect({ host: "127.0.0.1", port, servername: "localhost",
        rejectUnauthorized: true, ...options });
    let response = "";
    const timer = setTimeout(() => { if (!settled) { settled = true; socket.destroy(); reject(new Error("mTLS request timeout")); } }, 7000);
    socket.once("error", (error) => {
      clearTimeout(timer);
      if (error.code === "ECONNREFUSED" && attempts++ < 20) { retrying = true; setTimeout(() => { retrying = false; open(); }, 100); }
      else if (!settled) { settled = true; reject(error); }
    });
    socket.once("secureConnect", () => socket.write(request));
    socket.on("data", (chunk) => {
      response += chunk.toString();
      if (response.includes("\n")) socket.end();
    });
    socket.once("close", () => { clearTimeout(timer); if (!settled && !retrying) { settled = true; resolve(response); } });
    };
    open();
  });
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-native-mtls-"));
  const cert = path.join(directory, "server.crt");
  const key = path.join(directory, "server.key");
  const nextCert = path.join(directory, "server-next.crt");
  const nextKey = path.join(directory, "server-next.key");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", nextKey, "-out", nextCert, "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
  const port = await freePort();
  const child = spawn(process.execPath,
    [resolveBootstrap(), "run", "tests/native-tls-policy-daemon.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env,
      AFJ_NATIVE_TLS_PORT: String(port), AFJ_NATIVE_TLS_CERT: cert,
      AFJ_NATIVE_TLS_KEY: key, AFJ_NATIVE_TLS_CA: cert,
      AFJ_NATIVE_TLS_HOST: "127.0.0.1" }, stdio: ["ignore", "pipe", "pipe"] });
  try {
    await waitForOutput(child, "afj-db95 native TLS mTLS STARTED");
    await assert.rejects(() => tlsRequest(port, { ca: fs.readFileSync(cert) }, "unauthenticated\n"));
    const clientOptions = { ca: fs.readFileSync(cert), cert: fs.readFileSync(cert), key: fs.readFileSync(key) };
    assert.strictEqual(await tlsRequest(port, clientOptions, "reload-bad\n"), "BAD:TLS_RELOAD_FAILED\n");
    fs.copyFileSync(nextCert, cert);
    fs.copyFileSync(nextKey, key);
    assert.strictEqual(await tlsRequest(port, clientOptions, "reload\n"), "RELOAD:ok\n");
    const rotatedOptions = { ca: fs.readFileSync(nextCert), cert: fs.readFileSync(cert), key: fs.readFileSync(key) };
    assert.strictEqual(await tlsRequest(port, rotatedOptions, "native-mtls\n"), "native-mtls\n");
    console.log("afj-db95 native TLS mTLS/reload PASS");
  } finally {
    child.kill("SIGTERM");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
