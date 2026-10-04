"use strict";

const path = require("path");

const bootstrap = process.env.FREELANG_BOOTSTRAP;
if (!bootstrap) {
  throw new Error("Set FREELANG_BOOTSTRAP to the FreeLang runtime bootstrap.js path");
}

module.exports = path.resolve(bootstrap);
