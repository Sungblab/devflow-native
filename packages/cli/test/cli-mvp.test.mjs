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

test("CLI status renders simple beginner-friendly summary", async () => {
  const repoPath = await createTempGitRepo();
  await writeFile(join(repoPath, "README.md"), "changed\n");

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--simple",
  ]);

  assert.match(stdout, /Project status/);
  assert.match(stdout, /Changed files: 1/);
  assert.match(stdout, /Next check: npm run docs:check/);
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

test("CLI prompt rewrite renders agent-ready prompt JSON", async () => {
  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "prompt",
    "rewrite",
    "--request",
    "알아서 다음 구현 계속해",
    "--context",
    "Phase 7 still needs prompt rewrite helper.",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "prompt_rewrite");
  assert.match(parsed.agentReadyPrompt, /Objective:/);
  assert.match(parsed.agentReadyPrompt, /Phase 7/);
});

test("CLI explain renders beginner-friendly term JSON", async () => {
  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "explain",
    "toast notification",
    "--context",
    "Agent said saving should show a toast notification.",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "explain");
  assert.equal(parsed.term, "toast notification");
  assert.match(parsed.plainExplanation, /small message/);
  assert.match(parsed.projectContext, /saving/);
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

test("CLI split reads project-specific tasks from devflow config", async () => {
  const repoPath = await createTempGitRepo();
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      defaultProfile: "superpowers",
      defaultPlatform: "windows-powershell",
      split: {
        tasks: [
          {
            id: "configured-cli",
            ownedPaths: ["packages/cli/**"],
            avoidPaths: ["packages/web/**"],
            verification: [{ cwd: ".", command: "npm test" }],
          },
        ],
      },
    })}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "split",
    "--repo",
    repoPath,
    "--goal",
    "Use configured CLI split",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.profile.name, "superpowers");
  assert.equal(parsed.sessions[0].id, "configured-cli");
  assert.deepEqual(parsed.sessions[0].ownedPaths, ["packages/cli/**"]);
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

test("CLI finish renders guided checklist and still records evidence", async () => {
  const repoPath = await createTempGitRepo();
  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "finish",
    "--repo",
    repoPath,
    "--work",
    "guided-finish",
    "--title",
    "Guided finish",
    "--intent",
    "Show a guided finish checklist",
    "--gate",
    "unit:npm test:passed",
    "--risk",
    "No browser smoke run.",
    "--next-task",
    "Add browser smoke coverage.",
    "--guided",
  ]);

  assert.match(stdout, /Finish checklist/);
  assert.match(stdout, /Work: guided-finish/);
  assert.match(stdout, /Verified gates: 1/);
  assert.match(stdout, /Known risks: 1/);
  assert.match(stdout, /Next task: Add browser smoke coverage/);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"work.completed"/);
  assert.match(log, /guided-finish/);
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

test("CLI sessions codex renders explicit read-only Codex discovery JSON", async () => {
  const repoPath = await createTempGitRepo();
  const codexHome = await mkdtemp(join(tmpdir(), "devflow-cli-codex-home-"));
  const sessionDir = join(codexHome, "sessions", "2026", "05", "16");
  await mkdir(sessionDir, { recursive: true });
  await writeFile(
    join(sessionDir, "fixture.jsonl"),
    `${JSON.stringify({
      type: "session_meta",
      payload: {
        id: "019c7714-3b77-74d1-9866-e1f484aae2ab",
        cwd: repoPath,
        timestamp: "2026-05-16T11:00:00+09:00",
      },
    })}\n${JSON.stringify({
      type: "response_item",
      payload: { type: "function_call", name: "apply_patch" },
    })}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "codex",
    "--repo",
    repoPath,
    "--codex-home",
    codexHome,
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "sessions_codex");
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.discovery.sessions[0].sessionId, "019c7714-3b77-74d1-9866-e1f484aae2ab");
  assert.equal(parsed.discovery.sessions[0].project.confidence, "high");
  assert.equal(parsed.discovery.sessions[0].signals.hasFileEdits, true);
});

async function createTempGitRepo() {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-cli-"));
  await execFileAsync("git", ["init"], { cwd: repoPath });
  return repoPath;
}
