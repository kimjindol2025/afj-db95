#!/usr/bin/env node
"use strict";

// Adapter only: AFJ-DB95 remains FreeLang Script. This bridge translates the
// generic FreeLang Tools SCRIPT commands to the repository's AFJ bootstrap.
const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const bootstrap = process.env.AFJ_BOOTSTRAP || process.env.FREELANG_AFJ_RUNNER;

if (!bootstrap) {
  console.error("AFJ_BOOTSTRAP_REQUIRED");
  process.exit(2);
}

const command = process.argv[2];
const args = process.argv.slice(3);
let child;

if (command === "test") {
  child = spawnSync("bash", [path.join(repoRoot, ".freelang", "test.sh")], {
    cwd: repoRoot,
    env: { ...process.env, AFJ_BOOTSTRAP: bootstrap },
    stdio: "inherit",
  });
} else if (command === "check") {
  child = spawnSync("bash", [path.join(repoRoot, ".freelang", "check.sh")], {
    cwd: repoRoot,
    env: { ...process.env, AFJ_BOOTSTRAP: bootstrap },
    stdio: "inherit",
  });
} else {
  child = spawnSync(process.execPath, [bootstrap, command, ...args], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
}

process.exit(child.status === null ? 1 : child.status);
