"use strict";

const net = require("net");

async function waitForTcpListener(host, port, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect(port, host);
        socket.once("connect", () => {
          socket.destroy();
          resolve();
        });
        socket.once("error", reject);
      });
      return;
    } catch (error) {
      lastError = error;
      if (error.code !== "ECONNREFUSED" && error.code !== "ETIMEDOUT") {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error(`TCP listener ${host}:${port} did not become ready: ${lastError}`);
}

module.exports = { waitForTcpListener };
