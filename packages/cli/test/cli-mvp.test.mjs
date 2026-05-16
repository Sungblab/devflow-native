import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("CLI status renders JSON contract", async () => {
  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "status");
  assert.equal(parsed.schemaVersion, "0.1");
  assert.ok(Array.isArray(parsed.git.changedFiles));
});

test("CLI prompt next renders a copy-paste prompt", async () => {
  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "prompt",
    "next",
    "--objective",
    "Continue MVP loop",
  ]);

  assert.match(stdout, /Continue MVP loop/);
  assert.match(stdout, /Next task/);
});

test("CLI split renders JSON worktree session plan", async () => {
  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "split",
    "--goal",
    "Continue Devflow split support",
    "--sessions",
    "2",
    "--platform",
    "windows-powershell",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "split");
  assert.equal(parsed.sessions.length, 2);
  assert.equal(parsed.sessions[0].branch, "codex/implementation");
  assert.match(parsed.sessions[0].commands[0].variants.powershell, /git worktree add/);
  assert.match(parsed.sessions[0].prompt, /Continue Devflow split support/);
});

test("CLI finish renders JSON evidence summary", async () => {
  const repoPath = await createTempGitRepo();
  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "finish",
    "--repo",
    repoPath,
    "--work",
    "mvp-loop",
    "--title",
    "MVP loop",
    "--intent",
    "Close the first implementation slice",
    "--gate",
    "unit:npm test:passed",
    "--gate",
    "docs:npm run docs:check:passed",
    "--risk",
    "No persistent store yet.",
    "--next-task",
    "Add file-backed state persistence.",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "finish");
  assert.equal(parsed.workItem.id, "mvp-loop");
  assert.equal(parsed.evidence.gates[0].status, "passed");
  assert.deepEqual(parsed.evidence.gates[1], {
    id: "docs",
    command: "npm run docs:check",
    status: "passed",
  });
  assert.match(parsed.nextSession.prompt, /file-backed state persistence/);
});

test("CLI finish persists evidence and status reads the latest local state", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "finish",
    "--repo",
    repoPath,
    "--work",
    "state-persistence",
    "--title",
    "State persistence",
    "--intent",
    "Persist finish evidence locally",
    "--gate",
    "unit:npm test:passed",
    "--risk",
    "JSONL has no compaction yet.",
    "--next-task",
    "Read events from status.",
    "--json",
  ]);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"work.completed"/);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.handoffs.latest.workItemId, "state-persistence");
  assert.match(parsed.handoffs.latest.prompt, /Read events from status/);
  assert.equal(parsed.gates[0].lastRun.status, "passed");
});

test("CLI doctor renders platform and mistake memory JSON", async () => {
  const repoPath = await createTempGitRepo();
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "mistakes.json"),
    `${JSON.stringify(
      {
        mistakes: [
          {
            id: "powershell-literal-path",
            symptom: "Agent used Bash-style path handling in PowerShell.",
            correction: "Use Get-Content -LiteralPath and quote Windows paths.",
            appliesTo: ["windows-powershell"],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "doctor",
    "--repo",
    repoPath,
    "--platform",
    "windows-powershell",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "doctor");
  assert.equal(parsed.platform.name, "windows-powershell");
  assert.equal(parsed.memory.repeatedMistakes[0].id, "powershell-literal-path");
  assert.match(parsed.recommendations[0].message, /Get-Content -LiteralPath/);
});

async function createTempGitRepo() {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-cli-"));
  await execFileAsync("git", ["init"], { cwd: repoPath });
  return repoPath;
}
