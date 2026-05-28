#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const tempRoot = mkdtempSync(join(tmpdir(), "devflow-pack-check-"));

function runNpm(args, options) {
  if (process.env.npm_execpath) {
    return execFileSync(process.execPath, [process.env.npm_execpath, ...args], options);
  }

  return execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, options);
}

function runBin(binPath, args, options) {
  if (process.platform === "win32") {
    return execFileSync("cmd.exe", ["/d", "/s", "/c", binPath, ...args], options);
  }

  return execFileSync(binPath, args, options);
}

try {
  const packOutput = runNpm(["pack", "--json", "--pack-destination", tempRoot], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const [pack] = JSON.parse(packOutput);
  const tarballPath = join(tempRoot, pack.filename);
  const consumer = join(tempRoot, "consumer");

  runNpm(["init", "-y"], {
    cwd: tempRoot,
    encoding: "utf8",
    stdio: "ignore",
  });
  runNpm(["install", tarballPath, "--prefix", consumer], {
    cwd: tempRoot,
    encoding: "utf8",
    stdio: "ignore",
  });

  const binPath = process.platform === "win32"
    ? join(consumer, "node_modules", ".bin", "devflow.cmd")
    : join(consumer, "node_modules", ".bin", "devflow");
  const help = runBin(binPath, ["--help"], {
    cwd: consumer,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const version = runBin(binPath, ["--version"], {
    cwd: consumer,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!help.includes("Devflow Native")) {
    throw new Error("Packed devflow binary did not render help.");
  }

  if (!version.trim().startsWith("devflow ")) {
    throw new Error("Packed devflow binary did not render a version.");
  }

  process.stdout.write(`Package install check passed: ${pack.filename}\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
