"use strict";

const assert = require("assert");
const crypto = require("crypto");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
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

function packet(payload, sequence) {
  const header = Buffer.alloc(4);
  header.writeUIntLE(payload.length, 0, 3);
  header[3] = sequence;
  return Buffer.concat([header, payload]);
}

function readPacket(socket) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(() => reject(new Error("native auth packet timeout")), 10000);
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length >= 4 && buffer.length >= 4 + buffer.readUIntLE(0, 3)) {
        clearTimeout(timer);
        socket.off("data", onData);
        resolve(buffer.subarray(4, 4 + buffer.readUIntLE(0, 3)));
      }
    };
    socket.on("data", onData);
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
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
        if (Date.now() >= deadline) reject(new Error("native auth port timeout"));
        else setTimeout(probe, 50);
      });
    };
    probe();
  });
}

function nativeToken(password, scramble) {
  const sha1 = (value) => crypto.createHash("sha1").update(value).digest();
  const first = sha1(Buffer.from(password));
  const second = sha1(first);
  const digest = sha1(Buffer.concat([scramble, second]));
  return Buffer.from(first.map((value, index) => value ^ digest[index]));
}

function scrambleFromHandshake(payload) {
  let offset = 1;
  while (payload[offset] !== 0) offset += 1;
  offset += 1 + 4;
  const first = payload.subarray(offset, offset + 8);
  offset += 8 + 1 + 2 + 1 + 2 + 2 + 1 + 10;
  const second = payload.subarray(offset, offset + 12);
  return Buffer.concat([first, second]);
}

function loginPayload(user, token) {
  const flags = Buffer.alloc(4); flags.writeUInt32LE(512, 0);
  const maxPacket = Buffer.alloc(4); maxPacket.writeUInt32LE(1048576, 0);
  return Buffer.concat([flags, maxPacket, Buffer.from([33]), Buffer.alloc(23),
    Buffer.from(`${user}\0`), Buffer.from([token.length]), token]);
}

async function main() {
  const port = await freePort();
  const child = spawn(process.execPath,
    [resolveBootstrap(), "run", "tests/native-mariadb-daemon.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env, AFJ_NATIVE_MARIADB_PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`auth daemon timeout: ${output}`)), 30000);
      const onData = () => { if (output.includes("afj-db95 native MariaDB STARTED")) { clearTimeout(timer); resolve(); } };
      child.stdout.on("data", onData); child.stderr.on("data", onData);
    });
    await waitForPort(port);
    const socket = net.connect(port, "127.0.0.1");
    await new Promise((resolve, reject) => { socket.once("connect", resolve); socket.once("error", reject); });
    const handshake = await readPacket(socket);
    const scramble = scrambleFromHandshake(handshake);
    socket.write(packet(loginPayload("root", nativeToken("wrong-password", scramble)), 1));
    const response = await readPacket(socket);
    assert.strictEqual(response[0], 255);
    assert.strictEqual(response.readUInt16LE(1), 1045);
    socket.destroy();

    const valid = net.connect(port, "127.0.0.1");
    await new Promise((resolve, reject) => { valid.once("connect", resolve); valid.once("error", reject); });
    const validHandshake = await readPacket(valid);
    const validScramble = scrambleFromHandshake(validHandshake);
    valid.write(packet(loginPayload("root", nativeToken("development-only", validScramble)), 1));
    const accepted = await readPacket(valid);
    assert.strictEqual(accepted[0], 0);
    valid.destroy();
    console.log("afj-db95 native MariaDB auth rejection PASS");
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
