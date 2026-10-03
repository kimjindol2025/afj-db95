"use strict";

const assert = require("assert");
const crypto = require("crypto");
const net = require("net");
const { createMariaDbWireServer } = require("../tools/afj-mariadb-wire");

const CLIENT_PROTOCOL_41 = 0x00000200;
const CLIENT_SECURE_CONNECTION = 0x00008000;
const CLIENT_TRANSACTIONS = 0x00002000;
const CLIENT_MULTI_RESULTS = 0x00020000;
const CLIENT_LONG_PASSWORD = 0x00000001;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function packet(payload, sequence) {
  const header = Buffer.alloc(4);
  header.writeUIntLE(payload.length, 0, 3);
  header[3] = sequence & 0xff;
  return Buffer.concat([header, payload]);
}

function sha1(value) {
  return crypto.createHash("sha1").update(value).digest();
}

function nativeToken(password, scramble) {
  const stage1 = sha1(Buffer.from(password));
  const stage2 = sha1(stage1);
  const digest = sha1(Buffer.concat([scramble, stage2]));
  return Buffer.from(stage1.map((byte, index) => byte ^ digest[index]));
}

class PacketReader {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.queue = [];
    this.waiters = [];
    socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      while (this.buffer.length >= 4) {
        const length = this.buffer.readUIntLE(0, 3);
        if (this.buffer.length < length + 4) break;
        const payload = this.buffer.subarray(4, length + 4);
        this.buffer = this.buffer.subarray(length + 4);
        const waiter = this.waiters.shift();
        if (waiter) waiter(payload);
        else this.queue.push(payload);
      }
    });
  }

  read() {
    if (this.queue.length > 0) return Promise.resolve(this.queue.shift());
    return new Promise((resolve) => this.waiters.push(resolve));
  }
}

function handshakeScramble(payload) {
  let offset = 1;
  while (payload[offset] !== 0) offset += 1;
  offset += 1 + 4;
  const first = payload.subarray(offset, offset + 8);
  offset += 8 + 1 + 2 + 1 + 2 + 2 + 1 + 10;
  const secondLength = Math.max(13, payload[offset - 11] - 8);
  const second = payload.subarray(offset, offset + secondLength - 1);
  return Buffer.concat([first, second]);
}

async function main() {
  const upstream = net.createServer((socket) => {
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const request = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        let response = { ok: true, token: "prepared-wire-token" };
        if (request.type === "prepare") response = { ok: true, "statement-id": "upstream-prepared-1" };
        if (request.type === "execute") {
          response = { ok: true, result: { rows: [{ id: request.parameters[0], name: "prepared" }] } };
        }
        socket.write(`${JSON.stringify(response)}\n`);
      }
    });
  });
  const upstreamPort = await listen(upstream);
  const wire = createMariaDbWireServer({ port: 0, upstreamPort });
  const wirePort = await listen(wire);
  const socket = net.connect(wirePort, "127.0.0.1");
  const reader = new PacketReader(socket);
  try {
    const handshake = await reader.read();
    const scramble = handshakeScramble(handshake);
    const capabilities = CLIENT_LONG_PASSWORD | CLIENT_PROTOCOL_41 |
      CLIENT_TRANSACTIONS | CLIENT_SECURE_CONNECTION | CLIENT_MULTI_RESULTS;
    const login = Buffer.alloc(4 + 4 + 1 + 23);
    login.writeUInt32LE(capabilities, 0);
    login.writeUInt32LE(0, 4);
    login[8] = 0x21;
    const username = Buffer.from("root\0", "utf8");
    const auth = nativeToken("development-only", scramble);
    const loginPayload = Buffer.concat([login, username, Buffer.from([auth.length]), auth]);
    socket.write(packet(loginPayload, 1));
    const loginResponse = await reader.read();
    assert.strictEqual(loginResponse[0], 0x00);

    socket.write(packet(Buffer.concat([
      Buffer.from([0x16]), Buffer.from("SELECT * FROM prepared_users WHERE id=?"),
    ]), 0));
    const prepareResponse = await reader.read();
    assert.strictEqual(prepareResponse[0], 0x00);
    const statementId = prepareResponse.readUInt32LE(1);
    assert.strictEqual(prepareResponse.readUInt16LE(7), 1);

    const executePayload = Buffer.alloc(1 + 4 + 1 + 4 + 1 + 1 + 2 + 4);
    let offset = 0;
    executePayload[offset++] = 0x17;
    executePayload.writeUInt32LE(statementId, offset); offset += 4;
    executePayload[offset++] = 0;
    executePayload.writeUInt32LE(1, offset); offset += 4;
    executePayload[offset++] = 0;
    executePayload[offset++] = 1;
    executePayload[offset++] = 0x03;
    executePayload[offset++] = 0;
    executePayload.writeInt32LE(7, offset);
    socket.write(packet(executePayload, 0));
    const resultPackets = [];
    for (let index = 0; index < 6; index += 1) resultPackets.push(await reader.read());
    assert.strictEqual(resultPackets[0][0], 2);
    assert.ok(resultPackets.some((payload) => payload.toString("utf8").includes("prepared")));
    socket.write(packet(Buffer.from([0x19, statementId & 0xff, (statementId >> 8) & 0xff,
      (statementId >> 16) & 0xff, (statementId >> 24) & 0xff]), 0));
    console.log("afj-db95 MariaDB wire prepared PASS");
  } finally {
    socket.destroy();
    await close(wire);
    await close(upstream);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
