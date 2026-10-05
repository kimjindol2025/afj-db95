"use strict";

const fs = require("fs");
const path = require("path");

function resolveBootstrap() {
  const configured = process.env.AFJ_BOOTSTRAP ||
    (process.env.FREELANG_AFJ_ROOT &&
      path.join(process.env.FREELANG_AFJ_ROOT, "bootstrap.js"));
  if (!configured) {
    throw new Error(
      "AFJ_BOOTSTRAP 또는 FREELANG_AFJ_ROOT를 지정해야 합니다 " +
      "(예: AFJ_BOOTSTRAP=/path/to/freelang-afj/bootstrap.js)"
    );
  }
  const resolved = path.resolve(configured);
  if (!fs.existsSync(resolved)) {
    throw new Error(`AFJ bootstrap not found: ${resolved}`);
  }
  return resolved;
}

module.exports = { resolveBootstrap };
