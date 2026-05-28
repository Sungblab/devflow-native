#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function runNpm(args, options = {}) {
  const merged = {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  };

  if (process.env.npm_execpath) {
    return execFileSync(process.execPath, [process.env.npm_execpath, ...args], merged);
  }

  if (process.platform === "win32") {
    return execFileSync("cmd.exe", ["/d", "/s", "/c", "npm", ...args], merged);
  }

  return execFileSync("npm", args, merged);
}

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const requiredFields = ["name", "version", "description", "license", "bin", "files", "repository"];
const missing = requiredFields.filter((field) => manifest[field] === undefined);

if (missing.length > 0) {
  throw new Error(`Missing package fields: ${missing.join(", ")}`);
}

if (manifest.private === true) {
  throw new Error("Package manifest is still private.");
}

if (!manifest.name.startsWith("@sungblab/")) {
  throw new Error(`Unexpected package scope: ${manifest.name}`);
}

if (manifest.publishConfig?.access !== "public") {
  throw new Error("Scoped package must set publishConfig.access to public.");
}

if (manifest.bin?.devflow !== "packages/cli/src/index.js") {
  throw new Error("Package must expose the devflow CLI binary.");
}

const output = runNpm(["publish", "--dry-run", "--json"]);
const dryRun = JSON.parse(output);

if (dryRun.id !== `${manifest.name}@${manifest.version}`) {
  throw new Error(`Unexpected dry-run package id: ${dryRun.id}`);
}

const files = dryRun.files?.map((file) => file.path) ?? [];
const requiredPackageFiles = [
  "LICENSE",
  "README.md",
  "package.json",
  "packages/cli/src/index.js",
  "packages/core/src/index.js",
  "packages/mcp/src/stdio.js",
  "plugins/devflow/.codex-plugin/plugin.json",
  "plugins/devflow/.claude-plugin/plugin.json",
];
const missingFiles = requiredPackageFiles.filter((file) => !files.includes(file));

if (missingFiles.length > 0) {
  throw new Error(`Dry-run package is missing files: ${missingFiles.join(", ")}`);
}

const forbiddenPrefixes = [
  ".devflow/state/",
  ".git/",
  ".obsidian/",
  "docs/research/papers/",
];
const forbiddenFiles = files.filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));

if (forbiddenFiles.length > 0) {
  throw new Error(`Dry-run package includes forbidden files: ${forbiddenFiles.join(", ")}`);
}

process.stdout.write(`npm publish dry-run passed for ${dryRun.id} with ${files.length} files.\n`);
