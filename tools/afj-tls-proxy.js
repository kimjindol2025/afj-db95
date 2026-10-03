"use strict";

// Minimal transport adapter only. SQL, auth, WAL and transaction semantics
// remain in FreeLang; this process terminates TLS and forwards opaque JSON/TCP
// bytes to the loopback AFJ-DB listener.
const fs = require("fs");
const net = require("net");
const tls = require("tls");
const { X509Certificate } = require("crypto");

function integerEnv(name, fallback, min, max) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name}_INVALID`);
  }
  return value;
}

function materialFrom(options) {
  const certPath = options.certPath || process.env.AFJ_DB_TLS_CERT;
  const keyPath = options.keyPath || process.env.AFJ_DB_TLS_KEY;
  if (!certPath || !keyPath) throw new Error("AFJ_DB_TLS_CERT_KEY_REQUIRED");
  const cert = fs.readFileSync(certPath);
  const key = fs.readFileSync(keyPath);
  const certificate = new X509Certificate(cert);
  const expiresAt = Date.parse(certificate.validTo);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("AFJ_DB_TLS_CERT_EXPIRED");
  }
  return { cert, key, ca: options.ca || process.env.AFJ_DB_TLS_CA };
}

function createTlsProxy(options = {}) {
  const config = {
    bindHost: options.bindHost || process.env.AFJ_DB_TLS_BIND_HOST || "127.0.0.1",
    port: options.port ?? integerEnv("AFJ_DB_TLS_PORT", 43996, 1, 65535),
    upstreamHost: options.upstreamHost || process.env.AFJ_DB_UPSTREAM_HOST || "127.0.0.1",
    upstreamPort: options.upstreamPort ?? integerEnv("AFJ_DB_PORT", 43995, 1, 65535),
    idleTimeoutMs: options.idleTimeoutMs ?? integerEnv("AFJ_DB_TLS_IDLE_TIMEOUT_MS", 60000, 100, 3600000),
    requireClientCert: options.requireClientCert ?? process.env.AFJ_DB_TLS_REQUIRE_CLIENT_CERT === "1",
  };
  let material = materialFrom(options);
  const sockets = new Set();
  const tlsOptions = {
    key: material.key,
    cert: material.cert,
    minVersion: "TLSv1.2",
    requestCert: config.requireClientCert,
    rejectUnauthorized: config.requireClientCert,
  };
  if (material.ca) tlsOptions.ca = material.ca;

  const server = tls.createServer(tlsOptions, (client) => {
    sockets.add(client);
    client.setTimeout(config.idleTimeoutMs, () => client.destroy(new Error("TLS_IDLE_TIMEOUT")));
    const upstream = net.createConnection({
      host: config.upstreamHost,
      port: config.upstreamPort,
    });
    sockets.add(upstream);
    const remove = () => {
      sockets.delete(client);
      sockets.delete(upstream);
    };
    upstream.once("connect", () => client.pipe(upstream).pipe(client));
    upstream.once("error", (error) => client.destroy(error));
    client.once("error", () => upstream.destroy());
    client.once("close", remove);
    upstream.once("close", remove);
  });

  server.reloadCertificates = () => {
    material = materialFrom(options);
    const context = { key: material.key, cert: material.cert };
    if (material.ca) context.ca = material.ca;
    server.setSecureContext(context);
    return true;
  };
  server.closeProxy = (callback) => {
    for (const socket of sockets) socket.destroy();
    server.close(callback);
  };
  server.proxyConfig = config;
  return server;
}

if (require.main === module) {
  const proxy = createTlsProxy();
  proxy.on("error", (error) => {
    console.error(`afj-tls-proxy: ${error.message}`);
    process.exitCode = 1;
  });
  proxy.listen(proxy.proxyConfig.port, proxy.proxyConfig.bindHost, () => {
    console.log(`afj-tls-proxy listening on ${proxy.proxyConfig.bindHost}:${proxy.address().port}`);
  });
  process.on("SIGHUP", () => {
    try {
      proxy.reloadCertificates();
      console.log("afj-tls-proxy certificates reloaded");
    } catch (error) {
      console.error(`afj-tls-proxy reload failed: ${error.message}`);
      process.exitCode = 1;
    }
  });
  process.on("SIGTERM", () => proxy.closeProxy(() => process.exit(0)));
}

module.exports = { createTlsProxy };
