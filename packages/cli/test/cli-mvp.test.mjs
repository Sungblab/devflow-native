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
  assert.match(stdout, /Sessions: 0/);
  assert.match(stdout, /Latest session: none/);
  assert.match(stdout, /Next check: npm run docs:check/);
});

test("CLI status simple summary counts attached sessions", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "note",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--summary",
    "Session import note.",
    "--json",
  ]);
  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "note",
    "--repo",
    repoPath,
    "--work",
    "phase-7-beginner-guidance",
    "--summary",
    "Beginner guidance note.",
    "--json",
  ]);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--simple",
  ]);

  assert.match(stdout, /Sessions: 2/);
  assert.match(stdout, /Latest session: phase-7-beginner-guidance/);
});

test("CLI status simple summary shows latest session observed time", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T10:00:00.000Z",
      payload: {
        sessionId: "old-note",
        workItemId: "phase-6-session-import",
        agent: "manual",
        kind: "manual-note",
        summary: "Old note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T11:00:00.000Z",
      payload: {
        sessionId: "new-note",
        workItemId: "phase-7-beginner-guidance",
        agent: "manual",
        kind: "manual-note",
        summary: "New note.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--simple",
  ]);

  assert.match(stdout, /Latest session: phase-7-beginner-guidance/);
  assert.match(stdout, /Latest session time: 2026-05-16T11:00:00.000Z/);
});

test("CLI status simple summary shows latest session agent and kind", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T11:00:00.000Z",
      payload: {
        sessionId: "codex-note",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Imported Codex context.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--simple",
  ]);

  assert.match(stdout, /Latest session agent: Codex/);
  assert.match(stdout, /Latest session kind: manual-note/);
});

test("CLI status simple summary shows latest session id", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T11:00:00.000Z",
      payload: {
        sessionId: "codex-session-123",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Imported Codex context.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--simple",
  ]);

  assert.match(stdout, /Latest session id: codex-session-123/);
});

test("CLI status simple summary shows latest session summary", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T11:00:00.000Z",
      payload: {
        sessionId: "codex-session-123",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Imported Codex context.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--simple",
  ]);

  assert.match(stdout, /Latest session summary: Imported Codex context\./);
});

test("CLI status simple summary shows latest session changed-file count", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.attached",
      observedAt: "2026-05-16T11:00:00.000Z",
      payload: {
        sessionId: "codex-session-123",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        confidence: "high",
        changedFiles: ["packages/cli/src/index.js", "packages/cli/test/cli-mvp.test.mjs"],
        warnings: [],
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--simple",
  ]);

  assert.match(stdout, /Latest session files: 2/);
});

test("CLI status simple summary can focus sessions by work item", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T10:00:00.000Z",
      payload: {
        sessionId: "session-import-note",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Session import note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T11:00:00.000Z",
      payload: {
        sessionId: "beginner-guidance-note",
        workItemId: "phase-7-beginner-guidance",
        agent: "Codex",
        kind: "manual-note",
        summary: "Beginner guidance note.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--simple",
  ]);

  assert.match(stdout, /Work filter: phase-6-session-import/);
  assert.match(stdout, /Sessions: 1/);
  assert.match(stdout, /Latest session: phase-6-session-import/);
  assert.match(stdout, /Latest session summary: Session import note\./);
  assert.doesNotMatch(stdout, /Beginner guidance note/);
});

test("CLI status simple summary can focus sessions by agent", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T10:00:00.000Z",
      payload: {
        sessionId: "codex-note",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Codex import note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T11:00:00.000Z",
      payload: {
        sessionId: "manual-note",
        workItemId: "phase-6-session-import",
        agent: "manual",
        kind: "manual-note",
        summary: "Manual import note.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--agent",
    "Codex",
    "--simple",
  ]);

  assert.match(stdout, /Agent filter: Codex/);
  assert.match(stdout, /Sessions: 1/);
  assert.match(stdout, /Latest session agent: Codex/);
  assert.match(stdout, /Latest session summary: Codex import note\./);
  assert.doesNotMatch(stdout, /Manual import note/);
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

test("CLI prompt next preserves modified tracked file names from git status", async () => {
  const repoPath = await createTempGitRepo();
  await writeFile(join(repoPath, "README.md"), "before\n");
  await execFileAsync("git", ["add", "README.md"], { cwd: repoPath });
  await execFileAsync(
    "git",
    ["-c", "user.name=Devflow Test", "-c", "user.email=devflow@example.test", "commit", "-m", "initial"],
    { cwd: repoPath },
  );
  await writeFile(join(repoPath, "README.md"), "after\n");

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "prompt",
    "next",
    "--repo",
    repoPath,
    "--objective",
    "Continue after README edit",
  ]);

  assert.match(stdout, /^- README\.md$/m);
  assert.doesNotMatch(stdout, /^- EADME\.md$/m);
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
            avoidPaths: ["packages/artifacts/**"],
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

test("CLI split can register and start generated work items", async () => {
  const repoPath = await createTempGitRepo();
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        split: {
          tasks: [
            {
              id: "core-cli",
              goal: "Wire CLI split registration.",
              ownedPaths: ["packages/core/**", "packages/cli/**"],
            },
            {
              id: "mcp-docs",
              goal: "Expose split registration through MCP and docs.",
              ownedPaths: ["packages/mcp/**", "docs/**"],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "split",
    "--repo",
    repoPath,
    "--register",
    "--start",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.command, "split");
  assert.equal(parsed.registration.command, "split_register");
  assert.equal(parsed.registration.created.length, 2);
  assert.equal(parsed.registration.started.length, 2);

  const listed = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "list",
    "--repo",
    repoPath,
    "--json",
  ]);
  const listJson = JSON.parse(listed.stdout);
  assert.deepEqual(
    listJson.items.map((item) => item.status),
    ["active", "active"],
  );
  assert.equal(listJson.items[1].title, "Expose split registration through MCP and docs.");
});

test("CLI init renders scaffold plan without writing files by default", async () => {
  const repoPath = await createTempGitRepo();

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "init",
    "--repo",
    repoPath,
    "--profile",
    "standard",
    "--platform",
    "windows-powershell",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.command, "init");
  assert.equal(parsed.repo.absolutePath, repoPath);
  assert.ok(parsed.files.some((file) => file.path === ".devflow/config.json"));
  await assert.rejects(() => readFile(join(repoPath, ".devflow", "config.json"), "utf8"), {
    code: "ENOENT",
  });
});

test("CLI init --confirm writes the minimum project scaffold", async () => {
  const repoPath = await createTempGitRepo();

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "init",
    "--repo",
    repoPath,
    "--profile",
    "standard",
    "--platform",
    "windows-powershell",
    "--confirm",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);
  const config = JSON.parse(await readFile(join(repoPath, ".devflow", "config.json"), "utf8"));

  assert.equal(parsed.command, "init");
  assert.equal(parsed.result.written.length, parsed.files.length);
  assert.equal(config.defaultProfile, "standard");
  assert.equal(config.defaultPlatform, "windows-powershell");
});

test("CLI health reports missing scaffold files", async () => {
  const repoPath = await createTempGitRepo();

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "health",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.command, "health");
  assert.equal(parsed.status, "missing");
  assert.ok(parsed.missingFiles.some((file) => file.path === ".devflow/config.json"));
});

test("CLI health passes after confirmed init scaffold", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "init",
    "--repo",
    repoPath,
    "--confirm",
    "--json",
  ]);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "health",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.missingFiles.length, 0);
});

test("CLI health reports invalid configured gates", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "init",
    "--repo",
    repoPath,
    "--confirm",
    "--json",
  ]);
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [
        { id: "docs-check", command: "npm run docs:check" },
        { id: "docs-check", command: "" },
      ],
    })}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "health",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.status, "invalid");
  assert.ok(parsed.invalidGates.some((gate) => gate.reason === "duplicate-id"));
  assert.ok(parsed.invalidGates.some((gate) => gate.reason === "missing-command"));
});

test("CLI status reads gate definitions from devflow config", async () => {
  const repoPath = await createTempGitRepo();
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "custom", command: "npm run custom" }],
    })}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.gates[0].id, "custom");
  assert.equal(parsed.gates[0].command, "npm run custom");
});

test("CLI work create, start, and list persist local work item state", async () => {
  const repoPath = await createTempGitRepo();

  const created = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "create",
    "--repo",
    repoPath,
    "--id",
    "phase-3-work-registry",
    "--title",
    "Phase 3 work registry",
    "--owned-path",
    "packages/core/**",
    "--owned-path",
    "packages/cli/**",
    "--json",
  ]);
  const createJson = JSON.parse(created.stdout);
  assert.equal(createJson.command, "work_create");
  assert.equal(createJson.workItem.id, "phase-3-work-registry");

  const started = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "start",
    "phase-3-work-registry",
    "--repo",
    repoPath,
    "--json",
  ]);
  const startJson = JSON.parse(started.stdout);
  assert.equal(startJson.command, "work_start");
  assert.equal(startJson.workItem.id, "phase-3-work-registry");

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "list",
    "--repo",
    repoPath,
    "--json",
  ]);
  const listJson = JSON.parse(stdout);

  assert.equal(listJson.command, "work_list");
  assert.equal(listJson.items[0].id, "phase-3-work-registry");
  assert.equal(listJson.items[0].status, "active");
  assert.deepEqual(listJson.items[0].ownedPaths, ["packages/core/**", "packages/cli/**"]);
});

test("CLI work create is idempotent for existing ids", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "create",
    "--repo",
    repoPath,
    "--id",
    "duplicate-safe",
    "--title",
    "Duplicate safe",
    "--json",
  ]);
  const repeated = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "create",
    "--repo",
    repoPath,
    "--id",
    "duplicate-safe",
    "--title",
    "Changed title",
    "--json",
  ]);
  const repeatedJson = JSON.parse(repeated.stdout);

  assert.equal(repeatedJson.event.existing, true);
  assert.equal(repeatedJson.workItem.title, "Duplicate safe");

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.equal(log.trim().split("\n").length, 1);
});

test("CLI work ready and block update lifecycle state", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "create",
    "--repo",
    repoPath,
    "--id",
    "ready-work",
    "--title",
    "Ready work",
    "--json",
  ]);
  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "create",
    "--repo",
    repoPath,
    "--id",
    "blocked-work",
    "--title",
    "Blocked work",
    "--json",
  ]);

  const ready = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "ready",
    "ready-work",
    "--repo",
    repoPath,
    "--json",
  ]);
  const blocked = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "work",
    "block",
    "blocked-work",
    "--repo",
    repoPath,
    "--reason",
    "Waiting for review.",
    "--json",
  ]);
  const status = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--json",
  ]);

  assert.equal(JSON.parse(ready.stdout).command, "work_ready");
  assert.equal(JSON.parse(blocked.stdout).command, "work_block");

  const statusJson = JSON.parse(status.stdout);
  assert.equal(statusJson.work.readyToFinish[0].id, "ready-work");
  assert.equal(statusJson.work.blocked[0].id, "blocked-work");
  assert.equal(statusJson.work.blocked[0].blockedReason, "Waiting for review.");
});

async function createTempGitRepo() {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-cli-"));
  await execFileAsync("git", ["init"], { cwd: repoPath });
  await execFileAsync("git", ["config", "user.email", "devflow@example.test"], { cwd: repoPath });
  await execFileAsync("git", ["config", "user.name", "Devflow Test"], { cwd: repoPath });
  await writeFile(join(repoPath, "README.md"), "# Temp repo\n", "utf8");
  await execFileAsync("git", ["add", "README.md"], { cwd: repoPath });
  await execFileAsync("git", ["commit", "-m", "init"], { cwd: repoPath });
  return repoPath;
}

