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

function isAlreadyPublishedError(error) {
  const output = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}\n${error?.message ?? ""}`;
  return /cannot publish over the previously published versions/i.test(output);
}

function isPublishedPackageVersion(name, version) {
  try {
    runNpm(["view", `${name}@${version}`, "version", "--json"]);
    return true;
  } catch {
    return false;
  }
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

if (manifest.name.includes("/") && manifest.publishConfig?.access !== "public") {
  throw new Error("Scoped package must set publishConfig.access to public.");
}

if (manifest.bin?.devflow !== "packages/cli/src/index.js") {
  throw new Error("Package must expose the devflow CLI binary.");
}

const packOutput = runNpm(["pack", "--dry-run", "--json"]);
const packRuns = JSON.parse(packOutput);
const pack = Array.isArray(packRuns) ? packRuns[0] : packRuns;

if (pack.name !== manifest.name || pack.version !== manifest.version) {
  throw new Error(`Unexpected pack target: ${pack.name}@${pack.version}`);
}

const files = pack.files?.map((file) => file.path) ?? [];
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

const alreadyPublished = isPublishedPackageVersion(manifest.name, manifest.version);

if (!alreadyPublished) {
  let output = "";
  try {
    output = runNpm(["publish", "--dry-run", "--json"]);
  } catch (error) {
    if (isAlreadyPublishedError(error)) {
      process.stdout.write(
        `npm pack dry-run passed for already-published ${manifest.name}@${manifest.version} with ${files.length} files.\n`,
      );
      process.exit(0);
    }
    throw error;
  }
  const dryRun = JSON.parse(output);

  if (dryRun.id !== `${manifest.name}@${manifest.version}`) {
    throw new Error(`Unexpected dry-run package id: ${dryRun.id}`);
  }

  process.stdout.write(`npm publish dry-run passed for ${dryRun.id} with ${files.length} files.\n`);
} else {
  process.stdout.write(
    `npm pack dry-run passed for already-published ${manifest.name}@${manifest.version} with ${files.length} files.\n`,
  );
}
