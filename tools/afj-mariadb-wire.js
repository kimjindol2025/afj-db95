"use strict";

// Minimal MariaDB/MySQL protocol adapter. The database engine remains in
// FreeLang; this adapter translates the standard client's handshake and
// COM_QUERY packets to the existing loopback JSON TCP contract.
const crypto = require("crypto");
const net = require("net");

const CLIENT_LONG_PASSWORD = 0x00000001;
const CLIENT_CONNECT_WITH_DB = 0x00000008;
const CLIENT_PROTOCOL_41 = 0x00000200;
const CLIENT_TRANSACTIONS = 0x00002000;
const CLIENT_SECURE_CONNECTION = 0x00008000;
const CLIENT_MULTI_RESULTS = 0x00020000;
const CLIENT_PLUGIN_AUTH = 0x00080000;
const CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA = 0x00200000;
const COM_STMT_PREPARE = 0x16;
const COM_STMT_EXECUTE = 0x17;
const COM_STMT_CLOSE = 0x19;

function lenencInt(value) {
  if (value < 0xfb) return Buffer.from([value]);
  if (value <= 0xffff) {
    const out = Buffer.alloc(3);
    out[0] = 0xfc;
    out.writeUInt16LE(value, 1);
    return out;
  }
  const out = Buffer.alloc(9);
  out[0] = 0xfd;
  out.writeUIntLE(value, 1, 6);
  return out;
}

function lenencString(value) {
  const data = Buffer.from(String(value), "utf8");
  return Buffer.concat([lenencInt(data.length), data]);
}

function packet(payload, sequence) {
  const header = Buffer.alloc(4);
  header.writeUIntLE(payload.length, 0, 3);
  header[3] = sequence & 0xff;
  return Buffer.concat([header, payload]);
}

function statementPreparePacket(statementId, parameterCount, sequence = 1) {
  const payload = Buffer.alloc(12);
  payload[0] = 0x00;
  payload.writeUInt32LE(statementId, 1);
  payload.writeUInt16LE(0, 5);
  payload.writeUInt16LE(parameterCount, 7);
  payload[9] = 0;
  payload.writeUInt16LE(0, 10);
  return packet(payload, sequence);
}

function countPlaceholders(statement) {
  let quoted = false;
  let count = 0;
  for (const character of String(statement)) {
    if (character === "'") quoted = !quoted;
    else if (!quoted && character === "?") count += 1;
  }
  return count;
}

function parseStatementExecute(payload, prepared) {
  if (payload.length < 10) throw new Error("COM_STMT_EXECUTE_INVALID");
  const statementId = payload.readUInt32LE(1);
  const entry = prepared.get(statementId);
  if (!entry) throw new Error("PREPARED_NOT_FOUND");
  const parameterCount = entry.parameterCount;
  if (parameterCount === 0) return { entry, parameters: [] };
  let offset = 10;
  const nullBitmapLength = Math.ceil(parameterCount / 8);
  if (payload.length < offset + nullBitmapLength + 1) {
    throw new Error("COM_STMT_EXECUTE_INVALID");
  }
  const nullBitmap = payload.subarray(offset, offset + nullBitmapLength);
  offset += nullBitmapLength;
  const newTypes = payload[offset++];
  if (newTypes !== 1 && !entry.types) throw new Error("COM_STMT_TYPES_REQUIRED");
  if (newTypes === 1) {
    entry.types = [];
    for (let index = 0; index < parameterCount; index += 1) {
      if (offset + 2 > payload.length) throw new Error("COM_STMT_TYPES_INVALID");
      entry.types.push({ type: payload[offset], unsigned: payload[offset + 1] !== 0 });
      offset += 2;
    }
  }
  const parameters = [];
  for (let index = 0; index < parameterCount; index += 1) {
    if ((nullBitmap[Math.floor(index / 8)] & (1 << (index % 8))) !== 0) {
      parameters.push(null);
      continue;
    }
    const type = entry.types[index].type;
    if (type === 0x01) {
      parameters.push(payload.readInt8(offset));
      offset += 1;
    } else if (type === 0x02) {
      parameters.push(payload.readInt16LE(offset));
      offset += 2;
    } else if (type === 0x03) {
      parameters.push(entry.types[index].unsigned
        ? payload.readUInt32LE(offset) : payload.readInt32LE(offset));
      offset += 4;
    } else if (type === 0x08) {
      parameters.push(entry.types[index].unsigned
        ? Number(payload.readBigUInt64LE(offset)) : Number(payload.readBigInt64LE(offset)));
      offset += 8;
    } else if (type === 0x0f || type === 0xfd || type === 0xfe || type === 0xfc) {
      const length = readLenenc(payload, offset);
      parameters.push(payload.subarray(length.offset, length.offset + length.value).toString("utf8"));
      offset = length.offset + length.value;
    } else {
      throw new Error(`COM_STMT_TYPE_UNSUPPORTED:${type}`);
    }
  }
  return { entry, parameters };
}

function okPacket(affectedRows = 0, sequence = 1) {
  return packet(Buffer.concat([
    Buffer.from([0x00]), lenencInt(affectedRows), lenencInt(0),
    Buffer.from([0x02, 0x00, 0x00, 0x00]),
  ]), sequence);
}

function errorPacket(message, sequence = 1, code = 1064) {
  const text = Buffer.from(String(message || "SQL_ERROR"), "utf8");
  return packet(Buffer.concat([
    Buffer.from([0xff]), Buffer.from([code & 0xff, (code >> 8) & 0xff]),
    Buffer.from("#42000", "ascii"), text,
  ]), sequence);
}

function eofPacket(sequence = 1) {
  return packet(Buffer.from([0xfe, 0x00, 0x00, 0x02, 0x00]), sequence);
}

function sha1(value) {
  return crypto.createHash("sha1").update(value).digest();
}

function nativePasswordToken(password, scramble) {
  const stage1 = sha1(Buffer.from(password, "utf8"));
  const stage2 = sha1(stage1);
  const digest = sha1(Buffer.concat([scramble, stage2]));
  return Buffer.from(stage1.map((byte, index) => byte ^ digest[index]));
}

function constantTimeEqual(left, right) {
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readNull(buffer, offset) {
  const end = buffer.indexOf(0, offset);
  if (end < 0) return { value: buffer.subarray(offset).toString("utf8"), offset: buffer.length };
  return { value: buffer.subarray(offset, end).toString("utf8"), offset: end + 1 };
}

function readLenenc(buffer, offset) {
  const marker = buffer[offset];
  if (marker < 0xfb) return { value: marker, offset: offset + 1 };
  if (marker === 0xfc) return { value: buffer.readUInt16LE(offset + 1), offset: offset + 3 };
  if (marker === 0xfd) return { value: buffer.readUIntLE(offset + 1, 3), offset: offset + 4 };
  const value = Number(buffer.readBigUInt64LE(offset + 1));
  return { value, offset: offset + 9 };
}

function parseLogin(payload) {
  if (payload.length < 36) throw new Error("CLIENT_LOGIN_PACKET_INVALID");
  const capabilities = payload.readUInt32LE(0);
  let offset = 4 + 4 + 1 + 23;
  const user = readNull(payload, offset);
  offset = user.offset;
  let auth;
  if (capabilities & CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA) {
    const length = readLenenc(payload, offset);
    auth = payload.subarray(length.offset, length.offset + length.value);
    offset = length.offset + length.value;
  } else {
    const length = payload[offset] || 0;
    offset += 1;
    auth = payload.subarray(offset, offset + length);
    offset += length;
  }
  let database = null;
  if (capabilities & CLIENT_CONNECT_WITH_DB) {
    const parsed = readNull(payload, offset);
    database = parsed.value;
  }
  return { capabilities, user: user.value, auth, database };
}

function handshakePacket(connectionId, scramble, capabilities) {
  const version = Buffer.from("afj-db95-0.1\0", "ascii");
  const authPart1 = scramble.subarray(0, 8);
  const authPart2 = Buffer.concat([scramble.subarray(8), Buffer.from([0])]);
  const fixed = Buffer.alloc(18);
  fixed.writeUInt16LE(capabilities & 0xffff, 0);
  fixed[2] = 0x21;
  fixed.writeUInt16LE(0x0002, 3);
  fixed.writeUInt16LE((capabilities >>> 16) & 0xffff, 5);
  fixed[7] = scramble.length + 1;
  // bytes 8..12 are reserved and remain zero
  const plugin = capabilities & CLIENT_PLUGIN_AUTH
    ? Buffer.from("mysql_native_password\0", "ascii") : Buffer.alloc(0);
  return Buffer.concat([
    Buffer.from([0x0a]), version,
    Buffer.from([connectionId & 0xff, (connectionId >> 8) & 0xff,
      (connectionId >> 16) & 0xff, (connectionId >> 24) & 0xff]),
    authPart1, Buffer.from([0]), fixed, authPart2,
    plugin,
  ]);
}

function mapErrorCode(error) {
  const text = String(error || "");
  if (/AUTH|PASSWORD/i.test(text)) return 1045;
  if (/NOT_FOUND|TABLE/i.test(text)) return 1146;
  if (/UNIQUE/i.test(text)) return 1062;
  return 1064;
}

function columnDefinition(name, sequence) {
  const fixed = Buffer.alloc(13);
  fixed[0] = 0x0c;
  fixed.writeUInt16LE(0x21, 1);
  fixed.writeUInt32LE(0, 3);
  fixed[7] = 0xfd;
  fixed.writeUInt16LE(0, 8);
  fixed[10] = 0;
  fixed.writeUInt16LE(0, 11);
  return packet(Buffer.concat([
    lenencString("def"), lenencString(""), lenencString(""),
    lenencString(""), lenencString(name), lenencString(name),
    fixed,
  ]), sequence);
}

function resultPackets(result) {
  const rows = Array.isArray(result && result.rows) ? result.rows : [];
  const names = [];
  for (const row of rows) {
    for (const name of Object.keys(row || {})) if (!names.includes(name)) names.push(name);
  }
  const packets = [packet(lenencInt(names.length), 1)];
  names.forEach((name, index) => packets.push(columnDefinition(name, index + 2)));
  packets.push(eofPacket(names.length + 2));
  rows.forEach((row, rowIndex) => {
    const fields = names.map((name) => row[name] === null || row[name] === undefined
      ? Buffer.from([0xfb]) : lenencString(row[name]));
    packets.push(packet(Buffer.concat(fields), names.length + 3 + rowIndex));
  });
  packets.push(eofPacket(names.length + 3 + rows.length));
  return Buffer.concat(packets);
}

class JsonSession {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = "";
    this.waiting = [];
  }

  request(body) {
    return new Promise((resolve, reject) => {
      this.waiting.push({ resolve, reject });
      if (!this.socket) {
        this.socket = net.createConnection({ host: this.host, port: this.port });
        this.socket.setEncoding("utf8");
        this.socket.on("data", (chunk) => {
          this.onData(chunk);
        });
        this.socket.on("error", (error) => {
          this.fail(error);
        });
        this.socket.on("close", () => { this.socket = null; });
      }
      this.socket.write(`${JSON.stringify(body)}\n`);
    });
  }

  onData(chunk) {
    this.buffer += chunk;
    let newline;
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      const waiter = this.waiting.shift();
      if (!waiter) continue;
      try { waiter.resolve(JSON.parse(line)); } catch (error) { waiter.reject(error); }
    }
  }

  fail(error) {
    const waiters = this.waiting.splice(0);
    waiters.forEach((waiter) => waiter.reject(error));
  }
}

function createMariaDbWireServer(options = {}) {
  const config = {
    bindHost: options.bindHost || process.env.AFJ_DB_WIRE_BIND_HOST || "127.0.0.1",
    port: options.port ?? Number(process.env.AFJ_DB_WIRE_PORT || 3307),
    upstreamHost: options.upstreamHost || "127.0.0.1",
    upstreamPort: options.upstreamPort ?? Number(process.env.AFJ_DB_PORT || 43995),
    user: options.user || process.env.AFJ_DB_ROOT_USER || "root",
    password: options.password ?? process.env.AFJ_DB_ROOT_PASSWORD ?? "development-only",
  };
  const capabilities = CLIENT_LONG_PASSWORD | CLIENT_PROTOCOL_41 |
    CLIENT_TRANSACTIONS | CLIENT_SECURE_CONNECTION | CLIENT_MULTI_RESULTS;
  let connectionId = 1;

  const server = net.createServer((socket) => {
    const scramble = crypto.randomBytes(20);
    const json = new JsonSession(config.upstreamHost, config.upstreamPort);
    let phase = "login";
    let buffer = Buffer.alloc(0);
    let token = null;
    const prepared = new Map();
    let nextStatementId = 1;
    socket.write(packet(handshakePacket(connectionId++, scramble, capabilities), 0));

    const sendLoginError = (message, code = 1045) => socket.end(errorPacket(message, 2, code));
    const onPacket = async (payload) => {
      if (phase === "login") {
        try {
          const login = parseLogin(payload);
          const expected = nativePasswordToken(config.password, scramble);
          if (login.user !== config.user || !constantTimeEqual(login.auth, expected)) {
            sendLoginError("Access denied");
            return;
          }
          const upstreamLogin = await json.request({ type: "login", user: login.user, password: config.password });
          if (!upstreamLogin.ok) {
            sendLoginError(upstreamLogin.error || "AUTH_FAILED");
            return;
          }
          token = upstreamLogin.token;
          phase = "ready";
          socket.write(okPacket(0, 2));
        } catch (error) {
          sendLoginError(error.message);
        }
        return;
      }
      const command = payload[0];
      if (command === 0x01) return socket.end();
      if (command === 0x0e) return socket.write(okPacket(0, 1));
      if (command === 0x02) return socket.write(okPacket(0, 1));
      if (command === COM_STMT_PREPARE) {
        try {
          const statement = payload.subarray(1).toString("utf8");
          const response = await json.request({ type: "prepare", token, statement });
          if (!response.ok) return socket.write(errorPacket(response.error || "SQL_ERROR", 1, mapErrorCode(response.error)));
          const statementId = nextStatementId++;
          const parameterCount = countPlaceholders(statement);
          prepared.set(statementId, {
            upstreamId: response["statement-id"],
            parameterCount,
            types: null,
          });
          return socket.write(statementPreparePacket(statementId, parameterCount));
        } catch (error) {
          return socket.write(errorPacket(error.message, 1, mapErrorCode(error.message)));
        }
      }
      if (command === COM_STMT_EXECUTE) {
        try {
          const decoded = parseStatementExecute(payload, prepared);
          const response = await json.request({
            type: "execute",
            token,
            "statement-id": decoded.entry.upstreamId,
            parameters: decoded.parameters,
          });
          if (!response.ok) return socket.write(errorPacket(response.error || "SQL_ERROR", 1, mapErrorCode(response.error)));
          if (response.result && Array.isArray(response.result.rows)) socket.write(resultPackets(response.result));
          else socket.write(okPacket(response.result && Number(response.result.count) || 0, 1));
        } catch (error) {
          socket.write(errorPacket(error.message, 1, mapErrorCode(error.message)));
        }
        return;
      }
      if (command === COM_STMT_CLOSE) {
        if (payload.length >= 5) prepared.delete(payload.readUInt32LE(1));
        return;
      }
      if (command !== 0x03) return socket.write(errorPacket("COM_QUERY_ONLY", 1, 1047));
      try {
        const statement = payload.subarray(1).toString("utf8");
        const response = await json.request({ type: "query", token, statement });
        if (!response.ok) {
          socket.write(errorPacket(response.error || "SQL_ERROR", 1, mapErrorCode(response.error)));
        } else if (response.result && Array.isArray(response.result.rows)) {
          socket.write(resultPackets(response.result));
        } else {
          const count = response.result && Number(response.result.count) || 0;
          socket.write(okPacket(count, 1));
        }
      } catch (error) {
        socket.write(errorPacket(error.message, 1, mapErrorCode(error.message)));
      }
    };

    socket.on("data", (chunk) => {
      if (process.env.AFJ_DB_WIRE_DEBUG === "1") console.error(`wire client bytes ${chunk.length}`);
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 4) {
        const length = buffer.readUIntLE(0, 3);
        if (buffer.length < length + 4) break;
        const payload = buffer.subarray(4, length + 4);
        buffer = buffer.subarray(length + 4);
        onPacket(payload);
      }
    });
    socket.on("error", () => json.socket && json.socket.destroy());
    socket.on("close", () => json.socket && json.socket.destroy());
  });
  server.wireConfig = config;
  return server;
}

if (require.main === module) {
  const server = createMariaDbWireServer();
  server.on("error", (error) => {
    console.error(`afj-mariadb-wire: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(server.wireConfig.port, server.wireConfig.bindHost, () => {
    console.log(`afj-mariadb-wire listening on ${server.wireConfig.bindHost}:${server.address().port}`);
  });
}

module.exports = { createMariaDbWireServer };
