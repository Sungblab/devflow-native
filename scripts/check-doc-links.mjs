import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";

const root = process.cwd();
const errors = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      out.push(...walk(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(path);
    }
  }
  return out;
}

function rel(path) {
  return normalize(path).replace(root, "").replace(/^[/\\]/, "").replaceAll("\\", "/");
}

for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  const dir = dirname(file);
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const raw = match[1].trim();
    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("#")
    ) {
      continue;
    }
    const target = raw.split("#", 1)[0];
    if (!target) continue;
    const full = resolve(dir, target);
    if (!existsSync(full)) {
      errors.push(`${rel(file)} -> missing ${raw}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Documentation link check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Documentation link check passed.");

