"use strict";

const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const tls = require("tls");
const { createTlsProxy } = require("../tools/afj-tls-proxy");
const { resolveBootstrap } = require("./runtime-path");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  if (typeof server.closeProxy === "function") {
    return new Promise((resolve) => server.closeProxy(() => resolve()));
  }
  return new Promise((resolve) => server.close(() => resolve()));
}

function waitForPort(port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 20000;
    const probe = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) reject(new Error("AFJ port did not open"));
        else setTimeout(probe, 50);
      });
    };
    probe();
  });
}

function tlsRequest(port, options) {
  return new Promise((resolve) => {
    const client = tls.connect({
      host: "127.0.0.1",
      port,
      ...options,
    });
    const chunks = [];
    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    client.on("secureConnect", () => client.write("{\"type\":\"ping\"}\n"));
    client.on("data", (chunk) => chunks.push(chunk));
    client.on("error", (error) => finish({ error }));
    client.on("close", () => finish({
      response: Buffer.concat(chunks).toString("utf8"),
    }));
    client.on("data", () => client.end());
  });
}

function startAfjDaemon(port, walPath) {
  const bootstrap = resolveBootstrap();
  const daemon = path.resolve(__dirname, "tcp-daemon.fls");
  const child = spawn(process.execPath, [bootstrap, "run", daemon], {
    env: {
      ...process.env,
      AFJ_DB_MODE: "development",
      AFJ_DB_PORT: String(port),
      AFJ_DB_BIND_HOST: "127.0.0.1",
      AFJ_DB_WAL: walPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`AFJ daemon start timeout: ${output}`));
    }, 60000);
    const onData = (chunk) => {
      output += chunk.toString("utf8");
      if (output.includes("afj-db95 TCP server STARTED")) {
        clearTimeout(timer);
        child.stdout.off("data", onData);
        waitForPort(port).then(() => resolve(child), reject);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      if (code !== null && !output.includes("afj-db95 TCP server STARTED")) {
        clearTimeout(timer);
        reject(new Error(`AFJ daemon exited before start: ${code}`));
      }
    });
  });
}

function stopAfjDaemon(child) {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
  });
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-tls-"));
  const keyPath = path.join(directory, "server.key");
  const certPath = path.join(directory, "server.crt");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", keyPath, "-out", certPath, "-days", "1",
    "-subj", "/CN=localhost",
  ], { stdio: "ignore" });

  const upstream = net.createServer((socket) => socket.pipe(socket));
  const upstreamPort = await listen(upstream);
  const ca = fs.readFileSync(certPath);
  const proxy = createTlsProxy({
    certPath,
    keyPath,
    upstreamPort,
    port: 0,
    idleTimeoutMs: 1000,
  });
  await listen(proxy);

  const response = await tlsRequest(proxy.address().port, {
    servername: "localhost",
    ca,
    rejectUnauthorized: true,
  });
  assert.strictEqual(response.response, "{\"type\":\"ping\"}\n");
  const wrongHost = await tlsRequest(proxy.address().port, {
    servername: "wrong.example",
    ca,
    rejectUnauthorized: true,
  });
  assert.ok(wrongHost.error, "wrong hostname must fail verification");
  assert.strictEqual(proxy.reloadCertificates(), true);
  const certificateBytes = fs.readFileSync(certPath);
  fs.unlinkSync(certPath);
  assert.throws(() => proxy.reloadCertificates(), /ENOENT/);
  fs.writeFileSync(certPath, certificateBytes);
  await close(proxy);

  const daemonWal = path.join(directory, "afj-tcp-integration.wal");
  const daemonPortProbe = net.createServer();
  const daemonPort = await listen(daemonPortProbe);
  await close(daemonPortProbe);
  const daemon = await startAfjDaemon(daemonPort, daemonWal);
  const integrationProxy = createTlsProxy({
    certPath,
    keyPath,
    upstreamPort: daemonPort,
    port: 0,
    idleTimeoutMs: 1000,
  });
  await listen(integrationProxy);
  const integrationResponse = await tlsRequest(integrationProxy.address().port, {
    servername: "localhost",
    ca,
    rejectUnauthorized: true,
  });
  assert.strictEqual(integrationResponse.response, '{"ok":true,"type":"pong"}\n');
  await close(integrationProxy);
  await stopAfjDaemon(daemon);

  const mtlsProxy = createTlsProxy({
    certPath,
    keyPath,
    ca,
    requireClientCert: true,
    upstreamPort,
    port: 0,
    idleTimeoutMs: 1000,
  });
  await listen(mtlsProxy);
  const missingClientCert = await tlsRequest(mtlsProxy.address().port, {
    servername: "localhost",
    ca,
    rejectUnauthorized: true,
  });
  assert.ok(missingClientCert.error, "mTLS must reject missing client certificate");
  const clientCert = await tlsRequest(mtlsProxy.address().port, {
    servername: "localhost",
    ca,
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    rejectUnauthorized: true,
  });
  assert.strictEqual(clientCert.response, "{\"type\":\"ping\"}\n");
  await close(mtlsProxy);
  await close(upstream);
  fs.rmSync(directory, { recursive: true, force: true });
  console.log("afj-db95 TLS proxy handshake/reload PASS");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
