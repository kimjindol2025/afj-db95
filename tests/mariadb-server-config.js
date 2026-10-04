"use strict";

const assert = require("assert");
const net = require("net");
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

function expectStartupRejected(env, expected) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath,
      [require("./runtime-bootstrap"), "run", "src/server.fls"],
      { cwd: path.join(__dirname, ".."), env: { ...process.env,
        AFJ_DB_MODE: "development", AFJ_DB_ROOT_PASSWORD: "config-test-password",
        ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`invalid server config did not exit: ${output}`));
    }, 10000);
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      try {
        assert.notStrictEqual(code, 0, `expected startup rejection: ${expected}`);
        assert.ok(output.includes(expected), `expected ${expected}, got: ${output}`);
        resolve();
      } catch (error) { reject(error); }
    });
  });
}

async function main() {
  const shared = await freePort();
  const json = await freePort();
  let maria = await freePort();
  while (maria === json || maria === shared) maria = await freePort();
  await expectStartupRejected({ AFJ_DB_PORT: String(shared),
    AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_MARIADB_PORT: String(shared) },
  "AFJ_DB_MARIADB_REQUIRES_DISTINCT_LOOPBACK_PORT");
  await expectStartupRejected({ AFJ_DB_PORT: String(json),
    AFJ_DB_BIND_HOST: "0.0.0.0", AFJ_DB_MARIADB_PORT: String(maria) },
  "AFJ_DB_MARIADB_REQUIRES_DISTINCT_LOOPBACK_PORT");
  await expectStartupRejected({ AFJ_DB_PORT: String(json),
    AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_MARIADB_PORT: "0" },
  "AFJ_DB_MARIADB_PORT_INVALID");
  console.log("afj-db95 MariaDB listener config fail-closed PASS");
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
