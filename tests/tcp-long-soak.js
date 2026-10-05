"use strict";

const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { resolveBootstrap } = require("./runtime-path");

function freePort() { return new Promise((resolve, reject) => { const s = net.createServer(); s.once("error", reject); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); }); }); }
function waitForOutput(child, expected) { return new Promise((resolve, reject) => { let output = ""; const timer = setTimeout(() => reject(new Error(`soak start timeout: ${output}`)), 60000); const onData = (x) => { output += x.toString(); if (output.includes(expected)) { clearTimeout(timer); resolve(); } }; child.stdout.on("data", onData); child.stderr.on("data", onData); child.once("exit", (code) => { if (code !== null) reject(new Error(`soak daemon exited ${code}: ${output}`)); }); }); }
function waitForPort(port) { return new Promise((resolve, reject) => { const end = Date.now() + 30000; const probe = () => { const s = net.connect(port, "127.0.0.1"); s.once("connect", () => { s.destroy(); resolve(); }); s.once("error", () => { s.destroy(); if (Date.now() >= end) reject(new Error("soak port timeout")); else setTimeout(probe, 50); }); }; probe(); }); }
function connectClient(port) { return new Promise((resolve, reject) => { const socket = net.connect(port, "127.0.0.1"); socket.setEncoding("utf8"); let buffer = ""; const pending = []; const fail = (e) => { while (pending.length) pending.shift().reject(e); reject(e); }; socket.on("data", (x) => { buffer += x; let n; while ((n = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, n); buffer = buffer.slice(n + 1); const waiter = pending.shift(); if (waiter) waiter.resolve(JSON.parse(line)); } }); socket.once("error", fail); socket.once("connect", () => resolve({ socket, request(body) { return new Promise((res, rej) => { const timer = setTimeout(() => rej(new Error(`soak request timeout: ${body.statement || body.type}`)), 20000); pending.push({ resolve: (v) => { clearTimeout(timer); res(v); }, reject: (e) => { clearTimeout(timer); rej(e); } }); socket.write(`${JSON.stringify(body)}\n`); }); } })); }); }
function percentile(values, fraction) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] || 0; }
async function main() {
  const port = await freePort(); const directory = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-soak-")); const wal = path.join(directory, "tcp.wal");
  const child = spawn(process.execPath, [resolveBootstrap(), "run", "tests/tcp-soak-daemon.fls"], { cwd: path.join(__dirname, ".."), env: { ...process.env, AFJ_DB_MODE: "development", AFJ_DB_PORT: String(port), AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_WAL: wal, AFJ_DB_RATE_MAX_REQUESTS: "10000", AFJ_DB_RATE_WINDOW_MS: "60000" }, stdio: ["ignore", "pipe", "pipe"] });
  const clients = [];
  try {
    await waitForOutput(child, "TCP soak server STARTED"); await waitForPort(port);
    for (let i = 0; i < 8; i += 1) { const c = await connectClient(port); const login = await c.request({ type: "login", user: "root", password: "development-only" }); assert.strictEqual(login.ok, true); c.token = login.token; clients.push(c); }
    const table = await clients[0].request({ type: "query", token: clients[0].token, statement: "CREATE TABLE soak_users (id INT PRIMARY KEY, name TEXT)" }); assert.strictEqual(table.ok, true);
    const soakMs = Number(process.env.AFJ_SOAK_MS || 60000);
    const deadline = Date.now() + soakMs; let nextId = 0; let writes = 0; let batches = 0; const latencies = [];
    while (Date.now() < deadline) {
      const batch = clients.map((client) => { const id = nextId++; const started = Date.now(); return client.request({ type: "query", token: client.token, statement: `INSERT INTO soak_users (id,name) VALUES (${id},'soak-${id}')` }).then((response) => { latencies.push(Date.now() - started); assert.strictEqual(response.ok, true); writes += 1; }); });
      await Promise.all(batch);
      batches += 1;
      if (batches % 10 === 0) {
        const checkpoint = await clients[0].request({ type: "query", token: clients[0].token, statement: `SELECT * FROM soak_users WHERE id=${nextId - 1}` });
        assert.strictEqual(checkpoint.ok, true); assert.strictEqual(checkpoint.result.rows.length, 1);
      }
    }
    const selected = await clients[0].request({ type: "query", token: clients[0].token, statement: `SELECT * FROM soak_users WHERE id=${nextId - 1}` });
    assert.strictEqual(selected.ok, true); assert.strictEqual(selected.result.rows.length, 1);
    assert.ok(writes >= 8); const p95 = percentile(latencies, 0.95); const max = Math.max(...latencies); const throughput = writes / (soakMs / 1000);
    const maxLatency = Number(process.env.AFJ_SOAK_MAX_LATENCY_MS || 20000); const p95Limit = Number(process.env.AFJ_SOAK_P95_LATENCY_MS || 5000);
    assert.ok(max <= maxLatency, `soak max latency ${max}ms > ${maxLatency}ms`); assert.ok(p95 <= p95Limit, `soak p95 latency ${p95}ms > ${p95Limit}ms`);
    console.log(`afj-db95 TCP ${Math.round(soakMs / 1000)}s soak PASS writes=${writes} throughput=${throughput.toFixed(2)}/s p95=${p95}ms max=${max}ms`);
  } finally { for (const c of clients) c.socket.destroy(); child.kill("SIGTERM"); fs.rmSync(directory, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
