"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

class PacketSocket {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.pending = [];
    this.waiters = [];
    socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.flush();
    });
    socket.on("error", (error) => this.fail(error));
    socket.on("close", () => this.fail(new Error("MariaDB socket closed")));
  }

  flush() {
    while (this.buffer.length >= 4) {
      const length = this.buffer[0] | (this.buffer[1] << 8) | (this.buffer[2] << 16);
      if (this.buffer.length < length + 4) return;
      const sequence = this.buffer[3];
      const payload = this.buffer.subarray(4, length + 4);
      this.buffer = this.buffer.subarray(length + 4);
      const waiter = this.waiters.shift();
      if (waiter) waiter.resolve({ sequence, payload });
      else this.pending.push({ sequence, payload });
    }
  }

  fail(error) {
    while (this.waiters.length) this.waiters.shift().reject(error);
  }

  next() {
    if (this.pending.length) return Promise.resolve(this.pending.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timed out waiting for MariaDB packet")), 5000);
      this.waiters.push({
        resolve: (packet) => { clearTimeout(timer); resolve(packet); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
    });
  }

  send(sequence, payload) {
    const header = Buffer.alloc(4);
    header.writeUIntLE(payload.length, 0, 3);
    header[3] = sequence;
    this.socket.write(Buffer.concat([header, payload]));
  }
}

function lenenc(buffer, offset = 0) {
  const first = buffer[offset];
  if (first <= 250) return { value: first, offset: offset + 1 };
  if (first === 251) return { value: null, offset: offset + 1 };
  const size = first === 252 ? 2 : first === 253 ? 3 : 8;
  let value = 0;
  for (let i = 0; i < size; i++) value += buffer[offset + 1 + i] * (256 ** i);
  return { value, offset: offset + 1 + size };
}

function lenencString(buffer, offset) {
  const size = lenenc(buffer, offset);
  if (size.value === null) return { value: null, offset: size.offset };
  const end = size.offset + size.value;
  return { value: buffer.toString("utf8", size.offset, end), offset: end };
}

function parseHandshake(payload) {
  assert.strictEqual(payload[0], 10, "server must use protocol 10");
  const versionEnd = payload.indexOf(0, 1);
  const authStart = versionEnd + 1 + 4;
  const firstChallenge = payload.subarray(authStart, authStart + 8);
  const lowerOffset = authStart + 9;
  const lower = payload.readUInt16LE(lowerOffset);
  const upperOffset = lowerOffset + 5;
  const upper = payload.readUInt16LE(upperOffset);
  const capabilities = lower | (upper << 16);
  const authLength = payload[upperOffset + 2];
  const secondStart = upperOffset + 13;
  const secondLength = Math.max(0, Math.min(12, authLength - 9));
  const challenge = Buffer.concat([firstChallenge, payload.subarray(secondStart, secondStart + secondLength)]);
  return { capabilities, challenge };
}

function mysqlNativeToken(password, challenge) {
  const sha1 = (value) => crypto.createHash("sha1").update(value).digest();
  const first = sha1(Buffer.from(password, "utf8"));
  const second = sha1(first);
  const third = sha1(Buffer.concat([challenge, second]));
  return Buffer.from(first.map((value, index) => value ^ third[index]));
}

async function connectMaria(port, password) {
  const deadline = Date.now() + 15000;
  let socket;
  while (Date.now() < deadline) {
    socket = net.connect(port, "127.0.0.1");
    try {
      await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("error", reject);
      });
      break;
    } catch {
      socket.destroy();
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  if (!socket || socket.destroyed) throw new Error(`could not connect to MariaDB port ${port}`);
  const wire = new PacketSocket(socket);
  const greeting = await wire.next();
  assert.strictEqual(greeting.sequence, 0);
  const handshake = parseHandshake(greeting.payload);
  const wanted = 1 | 512 | 8192 | 32768;
  const capabilities = wanted & handshake.capabilities;
  const token = mysqlNativeToken(password, handshake.challenge);
  const login = Buffer.alloc(4 + 4 + 1 + 23);
  login.writeUInt32LE(capabilities, 0);
  login.writeUInt32LE(1024 * 1024, 4);
  login[8] = 33;
  const user = Buffer.from("root\0", "utf8");
  const authLength = Buffer.from([token.length]);
  wire.send(1, Buffer.concat([login, user, authLength, token]));
  const response = await wire.next();
  assert.strictEqual(response.sequence, 2);
  assert.strictEqual(response.payload[0], 0, `login rejected: ${response.payload.toString("hex")}`);
  return wire;
}

async function readResult(wire, first) {
  if (first.payload[0] === 0xff) throw new Error(`SQL error: ${first.payload.toString("hex")}`);
  if (first.payload[0] === 0) return { ok: true, rows: [] };
  const columns = lenenc(first.payload).value;
  for (let i = 0; i < columns; i++) await wire.next();
  let packet = await wire.next();
  assert.strictEqual(packet.payload[0], 0xfe, "expected result metadata terminator");
  const rows = [];
  for (;;) {
    packet = await wire.next();
    if (packet.payload[0] === 0xfe && packet.payload.length < 9) break;
    let offset = 0;
    const row = [];
    for (let i = 0; i < columns; i++) {
      const item = lenencString(packet.payload, offset);
      row.push(item.value);
      offset = item.offset;
    }
    rows.push(row);
  }
  return { ok: true, rows };
}

async function query(wire, sql) {
  wire.send(0, Buffer.concat([Buffer.from([3]), Buffer.from(sql, "utf8")]));
  return readResult(wire, await wire.next());
}

async function preparedSelect(wire, id, name) {
  wire.send(0, Buffer.concat([Buffer.from([22]), Buffer.from(
    "SELECT * FROM independent_client WHERE id = ? AND name = ?", "utf8")]));
  const prepared = await wire.next();
  assert.strictEqual(prepared.sequence, 1);
  assert.strictEqual(prepared.payload[0], 0, "COM_STMT_PREPARE must succeed");
  assert.strictEqual(prepared.payload.readUInt16LE(7), 2, "server must report two parameters");
  const statementId = prepared.payload.readUInt32LE(1);
  const prefix = Buffer.alloc(10);
  prefix[0] = 23;
  prefix.writeUInt32LE(statementId, 1);
  prefix.writeUInt32LE(1, 6);
  const parameters = Buffer.concat([
    prefix,
    Buffer.from([0, 1, 3, 0, 253, 0]),
    Buffer.from([id & 255, (id >>> 8) & 255, (id >>> 16) & 255, (id >>> 24) & 255]),
    Buffer.from([Buffer.byteLength(name)]),
    Buffer.from(name, "utf8"),
  ]);
  wire.send(0, parameters);
  return readResult(wire, await wire.next());
}

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

function waitForPort(port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const probe = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) reject(new Error(`server port ${port} did not open`));
        else setTimeout(probe, 25);
      });
    };
    probe();
  });
}

async function startService(bootstrap, tcpPort, mariaPort, walPath, password) {
  const child = spawn(process.execPath, [bootstrap, "run", "src/server.fls"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, AFJ_DB_MODE: "development", AFJ_DB_PORT: String(tcpPort),
      AFJ_DB_BIND_HOST: "127.0.0.1", AFJ_DB_WAL: walPath,
      AFJ_DB_ROOT_PASSWORD: password, AFJ_DB_MARIADB_PORT: String(mariaPort) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const deadline = Date.now() + 15000;
  while (!output.includes("afj-db95 MariaDB wire READY")) {
    if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}: ${output}`);
    if (Date.now() >= deadline) {
      await stopService(child);
      throw new Error(`server startup timeout: ${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  await waitForPort(mariaPort);
  return child;
}

function stopService(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    child.once("close", resolve);
    child.kill("SIGTERM");
  });
}

async function main() {
  const tcpPort = await freePort();
  let mariaPort = await freePort();
  while (mariaPort === tcpPort) mariaPort = await freePort();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "afj-db95-native-client-"));
  const bootstrap = require("./runtime-bootstrap");
  const password = "mariadb-service-test-password";
  const walPath = path.join(temp, "native.wal");
  let child = null;
  let wire;
  try {
    child = await startService(bootstrap, tcpPort, mariaPort, walPath, password);
    wire = await connectMaria(mariaPort, password);
    await query(wire, "CREATE TABLE independent_client (id INT PRIMARY KEY, name TEXT, note TEXT)");
    await query(wire, "INSERT INTO independent_client (id,name,note) VALUES (1,'FreeLang','한글🙂'),(2,'AFJ',NULL)");
    const selected = await query(wire, "SELECT * FROM independent_client");
    assert.deepStrictEqual(selected.rows, [["1", "FreeLang", "한글🙂"], ["2", "AFJ", null]]);
    const prepared = await preparedSelect(wire, 1, "FreeLang");
    assert.deepStrictEqual(prepared.rows, [["1", "FreeLang", "한글🙂"]]);
    wire.socket.destroy();
    wire = null;
    await stopService(child);
    child = await startService(bootstrap, tcpPort, mariaPort, walPath, password);
    wire = await connectMaria(mariaPort, password);
    const recovered = await query(wire, "SELECT * FROM independent_client");
    assert.deepStrictEqual(recovered.rows, [["1", "FreeLang", "한글🙂"], ["2", "AFJ", null]]);
    console.log("afj-db95 integrated MariaDB client/auth/prepared/WAL restart PASS");
  } catch (error) {
    throw new Error(`${error.stack || error.message}`);
  } finally {
    if (wire) wire.socket.destroy();
    await stopService(child);
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
