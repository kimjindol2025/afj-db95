"use strict";

const assert = require("assert");
const net = require("net");
const { spawn } = require("child_process");
const { createMariaDbWireServer } = require("../tools/afj-mariadb-wire");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function runMaria(port) {
  return new Promise((resolve, reject) => {
    const child = spawn("mariadb", [
      "--protocol=tcp", "--host=127.0.0.1", `--port=${port}`,
      "--connect-timeout=3", "--skip-ssl", "--user=root", "--password=development-only",
      "--batch", "--skip-column-names", "--raw", "--execute", "SELECT 1",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0
      ? resolve(output)
      : reject(new Error(`mariadb exited ${code}: ${errors}`)));
  });
}

async function main() {
  const upstream = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const request = JSON.parse(line);
        const response = request.type === "login"
          ? { ok: true, token: "wire-unit-token" }
          : { ok: true, result: { rows: [{ id: 1, name: "Kim" }] } };
        socket.write(`${JSON.stringify(response)}\n`);
      }
    });
  });
  const upstreamPort = await listen(upstream);
  const wire = createMariaDbWireServer({ port: 0, upstreamPort });
  await listen(wire);
  await new Promise((resolve, reject) => {
    const probe = net.connect(wire.address().port, "127.0.0.1");
    probe.once("data", (data) => {
      assert.ok(data.length > 4);
      probe.destroy();
      resolve();
    });
    probe.once("error", reject);
  });
  try {
    const output = await runMaria(wire.address().port);
    assert.strictEqual(output, "1\tKim\n");
    console.log("afj-db95 MariaDB wire packet unit PASS");
  } finally {
    await close(wire);
    await close(upstream);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
