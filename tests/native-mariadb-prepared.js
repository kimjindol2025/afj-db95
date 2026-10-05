"use strict";

const assert = require("assert");
const crypto = require("crypto");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const { resolveBootstrap } = require("./runtime-path");

const CAP = 0x0002a201;
function packet(payload, sequence) {
  const header = Buffer.alloc(4);
  header.writeUIntLE(payload.length, 0, 3); header[3] = sequence;
  return Buffer.concat([header, payload]);
}
function sha1(value) { return crypto.createHash("sha1").update(value).digest(); }
function nativeToken(password, scramble) {
  const a = sha1(Buffer.from(password));
  const b = sha1(a);
  const c = sha1(Buffer.concat([scramble, b]));
  return Buffer.from(a.map((byte, index) => byte ^ c[index]));
}
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { const p = server.address().port; server.close(() => resolve(p)); });
  });
}
function waitForOutput(child, expected) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`native prepared timeout: ${output}`)), 60000);
    const onData = (chunk) => { output += chunk.toString(); if (output.includes(expected)) { clearTimeout(timer); resolve(); } };
    child.stdout.on("data", (chunk) => { output += chunk.toString(); process.stderr.write(chunk); if (output.includes(expected)) { clearTimeout(timer); resolve(); } });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); process.stderr.write(chunk); });
    child.once("exit", (code) => { if (code !== null) reject(new Error(`daemon exited ${code}: ${output}`)); });
  });
}
function runMaria(port, statement) {
  return new Promise((resolve, reject) => {
    const child = spawn("mariadb", ["--protocol=tcp", "--host=127.0.0.1", `--port=${port}`,
      "--connect-timeout=5", "--skip-ssl", "--user=root", "--password=development-only",
      "--batch", "--skip-column-names", "--raw", "--execute", statement], { stdio: ["ignore", "pipe", "pipe"] });
    let out = ""; let err = "";
    child.stdout.on("data", (x) => { out += x.toString(); }); child.stderr.on("data", (x) => { err += x.toString(); });
    child.once("close", (code) => code === 0 ? resolve(out) : reject(new Error(err)));
  });
}
class Reader {
  constructor(socket) { this.socket = socket; this.buffer = Buffer.alloc(0); this.queue = []; this.waiters = [];
    socket.on("data", (chunk) => { this.buffer = Buffer.concat([this.buffer, chunk]); while (this.buffer.length >= 4) {
      const n = this.buffer.readUIntLE(0, 3); if (this.buffer.length < n + 4) break;
      const p = this.buffer.subarray(4, n + 4); this.buffer = this.buffer.subarray(n + 4);
      const waiter = this.waiters.shift(); if (waiter) waiter(p); else this.queue.push(p);
    }}); }
  read() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("native prepared packet timeout")), 15000);
      this.waiters.push((payload) => { clearTimeout(timer); resolve(payload); });
    });
  }
}
function lenenc(value) {
  const bytes = Buffer.from(String(value), "utf8");
  if (bytes.length >= 251) throw new Error("test lenenc value too large");
  return Buffer.concat([Buffer.from([bytes.length]), bytes]);
}
function executePayload(statementId, types, values, nullBitmap = 0, newTypes = 1) {
  const typeBytes = [];
  for (const type of types) typeBytes.push(Buffer.from([type, 0]));
  const valueBytes = [];
  for (let index = 0; index < types.length; index += 1) {
    if ((nullBitmap & (1 << index)) !== 0) continue;
    if (types[index] === 3) { const value = Buffer.alloc(4); value.writeUInt32LE(values[index], 0); valueBytes.push(value); }
    else valueBytes.push(lenenc(values[index]));
  }
  const payload = Buffer.concat([
    Buffer.from([0x17]), Buffer.alloc(4), Buffer.from([0]), Buffer.alloc(4),
    Buffer.from([nullBitmap]), Buffer.from([newTypes]), ...(newTypes === 1 ? typeBytes : []), ...valueBytes,
  ]);
  payload.writeUInt32LE(statementId, 1);
  return payload;
}
function scrambleFromHandshake(payload) {
  let offset = 1; while (payload[offset]) offset += 1; offset += 1 + 4;
  const first = payload.subarray(offset, offset + 8); offset += 8 + 1 + 2 + 1 + 2 + 2 + 1 + 10;
  const second = payload.subarray(offset, offset + 12); return Buffer.concat([first, second]);
}
async function main() {
  const port = await freePort();
  const child = spawn(process.execPath, [resolveBootstrap(), "run", "tests/native-mariadb-daemon.fls"],
    { cwd: path.join(__dirname, ".."), env: { ...process.env, AFJ_NATIVE_MARIADB_PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  try {
    await waitForOutput(child, "afj-db95 native MariaDB STARTED");
    await runMaria(port, "CREATE TABLE native_prepared (id INT PRIMARY KEY, name TEXT)");
    await runMaria(port, "INSERT INTO native_prepared (id,name) VALUES (7,'prepared')");
    const socket = net.connect(port, "127.0.0.1"); const reader = new Reader(socket);
    const handshake = await reader.read(); const scramble = scrambleFromHandshake(handshake);
    const login = Buffer.alloc(4 + 4 + 1 + 23); login.writeUInt32LE(CAP, 0); login[8] = 0x21;
    socket.write(packet(Buffer.concat([login, Buffer.from("root\0"), Buffer.from([20]), nativeToken("development-only", scramble)]), 1));
    assert.strictEqual((await reader.read())[0], 0);
    socket.write(packet(Buffer.concat([Buffer.from([0x16]), Buffer.from("SELECT * FROM native_prepared WHERE id=?")]), 0));
    const prepare = await reader.read(); assert.strictEqual(prepare[0], 0); const statementId = prepare.readUInt32LE(1);
    assert.strictEqual(prepare.readUInt16LE(7), 1);
    const execute = Buffer.alloc(18); let o = 0; execute[o++] = 0x17; execute.writeUInt32LE(statementId, o); o += 4;
    execute[o++] = 0; execute.writeUInt32LE(1, o); o += 4; execute[o++] = 0; execute[o++] = 1;
    execute[o++] = 3; execute[o++] = 0; execute.writeUInt32LE(7, o);
    socket.write(packet(execute, 0));
    const firstPacket = await reader.read();
    const packets = [firstPacket]; for (let i = 1; i < 6; i += 1) packets.push(await reader.read());
    assert.strictEqual(packets[0][0], 2); assert.ok(packets.some((p) => p.toString("utf8").includes("prepared")));

    socket.write(packet(Buffer.concat([Buffer.from([0x16]), Buffer.from("INSERT INTO native_prepared (id,name) VALUES (?,?)")]), 0));
    const multiPrepare = await reader.read(); assert.strictEqual(multiPrepare[0], 0); const multiId = multiPrepare.readUInt32LE(1);
    assert.strictEqual(multiPrepare.readUInt16LE(7), 2);
    socket.write(packet(executePayload(multiId, [3, 253], [9, "multi"]), 0));
    assert.strictEqual((await reader.read())[0], 0);
    assert.ok((await runMaria(port, "SELECT * FROM native_prepared WHERE name='multi'")).includes("multi"));

    socket.write(packet(Buffer.concat([Buffer.from([0x16]), Buffer.from("INSERT INTO native_prepared (id,name) VALUES (?,?)")]), 0));
    const nullPrepare = await reader.read(); assert.strictEqual(nullPrepare[0], 0); const nullId = nullPrepare.readUInt32LE(1);
    socket.write(packet(executePayload(nullId, [3, 253], [10, null], 2), 0));
    assert.strictEqual((await reader.read())[0], 0);
    const nullRows = await runMaria(port, "SELECT * FROM native_prepared WHERE name IS NULL");
    assert.ok(nullRows.includes("10"));

    socket.write(packet(Buffer.concat([Buffer.from([0x16]), Buffer.from("SELECT * FROM native_prepared WHERE name=?")]), 0));
    const stringPrepare = await reader.read(); assert.strictEqual(stringPrepare[0], 0); const stringId = stringPrepare.readUInt32LE(1);
    socket.write(packet(executePayload(stringId, [253], ["multi"]), 0));
    const stringFirst = await reader.read();
    const stringPackets = [stringFirst]; for (let i = 1; i < 6; i += 1) stringPackets.push(await reader.read());
    assert.ok(stringPackets.some((p) => p.toString("utf8").includes("multi")));
    socket.write(packet(executePayload(stringId, [253], ["multi"], 0, 0), 0));
    const cachedPackets = []; for (let i = 0; i < 6; i += 1) cachedPackets.push(await reader.read());
    assert.ok(cachedPackets.some((p) => p.toString("utf8").includes("multi")));
    socket.destroy(); console.log("afj-db95 native MariaDB prepared PASS");
  } finally { child.kill("SIGTERM"); }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
