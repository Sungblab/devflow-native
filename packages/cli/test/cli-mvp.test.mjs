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

test("CLI gates run executes configured gate and writes evidence", async () => {
  const repoPath = await createTempGitRepo();
  const scriptPath = join(repoPath, "gate-script.mjs");
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(scriptPath, "console.log('cli gate stdout');\n", "utf8");
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "unit", command: `${JSON.stringify(process.execPath)} ${JSON.stringify(scriptPath)}` }],
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "gates",
    "run",
    "unit",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.command, "gates_run");
  assert.equal(parsed.gate.id, "unit");
  assert.equal(parsed.status, "passed");
  assert.equal(parsed.exitCode, 0);
  assert.match(parsed.stdout.summary, /cli gate stdout/);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"gate.finished"/);
  assert.match(log, /cli gate stdout/);
});

test("CLI gates run supports npm commands from config", async () => {
  const repoPath = await createTempGitRepo();
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "npm-version", command: "npm --version" }],
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "gates",
    "run",
    "npm-version",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.command, "gates_run");
  assert.equal(parsed.status, "passed");
  assert.equal(parsed.exitCode, 0);
  assert.match(parsed.stdout.summary, /\d+\.\d+\.\d+/);
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

test("CLI sessions attach-plan renders dry-run attach proposals", async () => {
  const inputPath = join(await mkdtemp(join(tmpdir(), "devflow-cli-attach-plan-")), "input.json");
  await writeFile(
    inputPath,
    `${JSON.stringify({
      workItems: [
        {
          id: "phase-6-session-import",
          title: "Phase 6 session import",
          ownedPaths: ["packages/adapters/**"],
        },
      ],
      sessions: [
        {
          sessionId: "high-confidence",
          agent: "Codex",
          project: { confidence: "high" },
          events: [
            {
              type: "git.diff.captured",
              changedFiles: ["packages/adapters/src/index.js"],
            },
          ],
        },
      ],
    })}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "attach-plan",
    "--input",
    inputPath,
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "session_attach_plan");
  assert.equal(parsed.proposals[0].sessionId, "high-confidence");
  assert.equal(parsed.proposals[0].recommendedWorkItemId, "phase-6-session-import");
  assert.equal(parsed.proposals[0].action, "attach-ready");
});

test("CLI sessions attach writes approved proposal events", async () => {
  const repoPath = await createTempGitRepo();
  const inputPath = join(await mkdtemp(join(tmpdir(), "devflow-cli-attach-")), "plan.json");
  await writeFile(
    inputPath,
    `${JSON.stringify({
      proposals: [
        {
          sessionId: "high-confidence",
          agent: "Codex",
          recommendedWorkItemId: "phase-6-session-import",
          action: "attach-ready",
          requiresConfirmation: false,
          confidence: "high",
          changedFiles: ["packages/adapters/src/index.js"],
          reason: "Session has high confidence.",
          warnings: [],
        },
      ],
    })}\n`,
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "attach",
    "--repo",
    repoPath,
    "--input",
    inputPath,
    "--session",
    "high-confidence",
    "--confirm",
    "--json",
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.command, "session_attach");
  assert.equal(parsed.event.type, "session.attached");
  assert.equal(parsed.event.payload.workItemId, "phase-6-session-import");

  const status = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "status",
    "--repo",
    repoPath,
    "--json",
  ]);
  const statusJson = JSON.parse(status.stdout);
  assert.equal(statusJson.sessions.attached[0].sessionId, "high-confidence");
});

test("CLI sessions attach reports existing links without duplicate events", async () => {
  const repoPath = await createTempGitRepo();
  const inputPath = join(await mkdtemp(join(tmpdir(), "devflow-cli-attach-dedupe-")), "plan.json");
  await writeFile(
    inputPath,
    `${JSON.stringify({
      proposals: [
        {
          sessionId: "high-confidence",
          agent: "Codex",
          recommendedWorkItemId: "phase-6-session-import",
          action: "attach-ready",
          requiresConfirmation: false,
          confidence: "high",
          changedFiles: ["packages/adapters/src/index.js"],
          reason: "Session has high confidence.",
          warnings: [],
        },
      ],
    })}\n`,
  );
  const commandArgs = [
    "packages/cli/src/index.js",
    "sessions",
    "attach",
    "--repo",
    repoPath,
    "--input",
    inputPath,
    "--session",
    "high-confidence",
    "--confirm",
    "--json",
  ];

  await execFileAsync("node", commandArgs);
  const { stdout } = await execFileAsync("node", commandArgs);
  const parsed = JSON.parse(stdout);
  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");

  assert.equal(parsed.event.existing, true);
  assert.equal(log.trim().split("\n").length, 1);
});

test("CLI sessions list renders attached sessions", async () => {
  const repoPath = await createTempGitRepo();
  const inputPath = join(await mkdtemp(join(tmpdir(), "devflow-cli-list-")), "plan.json");
  await writeFile(
    inputPath,
    `${JSON.stringify({
      proposals: [
        {
          sessionId: "high-confidence",
          agent: "Codex",
          recommendedWorkItemId: "phase-6-session-import",
          action: "attach-ready",
          requiresConfirmation: false,
          confidence: "high",
          changedFiles: ["packages/adapters/src/index.js"],
          reason: "Session has high confidence.",
          warnings: [],
        },
      ],
    })}\n`,
  );

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "attach",
    "--repo",
    repoPath,
    "--input",
    inputPath,
    "--session",
    "high-confidence",
    "--confirm",
    "--json",
  ]);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.command, "session_list");
  assert.equal(parsed.count, 1);
  assert.equal(parsed.sessions[0].sessionId, "high-confidence");
  assert.equal(parsed.sessions[0].workItemId, "phase-6-session-import");
});

test("CLI sessions note records a manual session and lists it", async () => {
  const repoPath = await createTempGitRepo();

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "note",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--agent",
    "manual",
    "--summary",
    "Reviewed local session context outside an agent transcript.",
    "--json",
  ]);
  const noted = JSON.parse(stdout);

  assert.equal(noted.command, "session_note");
  assert.equal(noted.event.type, "session.message");
  assert.equal(noted.event.payload.workItemId, "phase-6-session-import");

  const list = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--json",
  ]);
  const parsed = JSON.parse(list.stdout);

  assert.equal(parsed.sessions[0].kind, "manual-note");
  assert.match(parsed.sessions[0].summary, /Reviewed local session context/);
});

test("CLI sessions list filters by work item", async () => {
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
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.count, 1);
  assert.equal(parsed.filters.workItemId, "phase-6-session-import");
  assert.equal(parsed.sessions[0].workItemId, "phase-6-session-import");
});

test("CLI sessions list limits after work item filtering", async () => {
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
    "First import note.",
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
  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "note",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--summary",
    "Second import note.",
    "--json",
  ]);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--limit",
    "1",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.count, 1);
  assert.equal(parsed.totalCount, 2);
  assert.equal(parsed.filters.limit, 1);
  assert.match(parsed.sessions[0].summary, /Second import note/);

  const text = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--limit",
    "1",
  ]);

  assert.match(text.stdout, /^Limit: 1$/m);
  assert.match(text.stdout, /^Total: 2$/m);
  assert.match(text.stdout, /Second import note/);
  assert.doesNotMatch(text.stdout, /First import note/);
});

test("CLI sessions list rejects invalid limit values", async () => {
  const repoPath = await createTempGitRepo();

  await assert.rejects(
    execFileAsync("node", [
      "packages/cli/src/index.js",
      "sessions",
      "list",
      "--repo",
      repoPath,
      "--limit",
      "0",
    ]),
    /sessions list requires --limit <positive-integer>/,
  );

  await assert.rejects(
    execFileAsync("node", [
      "packages/cli/src/index.js",
      "sessions",
      "list",
      "--repo",
      repoPath,
      "--limit",
      "abc",
    ]),
    /sessions list requires --limit <positive-integer>/,
  );
});

test("CLI sessions list sorts by observed time before limit", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T00:00:00.000Z",
      payload: {
        sessionId: "middle",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Middle Codex note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-15T00:00:00.000Z",
      payload: {
        sessionId: "old",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Old Codex note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-17T00:00:00.000Z",
      payload: {
        sessionId: "new",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "New Codex note.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--sort",
    "observedAt:asc",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.deepEqual(
    parsed.sessions.map((session) => session.summary),
    ["Old Codex note.", "Middle Codex note.", "New Codex note."],
  );
  assert.equal(parsed.filters.sort, "observedAt:asc");

  const text = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--sort",
    "observedAt:desc",
    "--limit",
    "1",
  ]);

  assert.match(text.stdout, /^Sort: observedAt:desc$/m);
  assert.match(text.stdout, /^Limit: 1$/m);
  assert.match(text.stdout, /^Total: 3$/m);
  assert.match(text.stdout, /New Codex note/);
  assert.doesNotMatch(text.stdout, /Middle Codex note/);
  assert.doesNotMatch(text.stdout, /Old Codex note/);
});

test("CLI sessions list rejects invalid sort values", async () => {
  const repoPath = await createTempGitRepo();

  await assert.rejects(
    execFileAsync("node", [
      "packages/cli/src/index.js",
      "sessions",
      "list",
      "--repo",
      repoPath,
      "--sort",
      "observedAt:newest",
    ]),
    /sessions list requires --sort observedAt:asc\|observedAt:desc/,
  );
});

test("CLI sessions list filters by agent", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "note",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--agent",
    "manual",
    "--summary",
    "Manual import note.",
    "--json",
  ]);
  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "note",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--agent",
    "Codex",
    "--summary",
    "Codex import note.",
    "--json",
  ]);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--agent",
    "Codex",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.count, 1);
  assert.equal(parsed.filters.agent, "Codex");
  assert.equal(parsed.sessions[0].agent, "Codex");
  assert.match(parsed.sessions[0].summary, /Codex import note/);

  const text = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--agent",
    "Codex",
  ]);

  assert.match(text.stdout, /^Agent: Codex$/m);
  assert.match(text.stdout, /Codex import note/);
  assert.doesNotMatch(text.stdout, /Manual import note/);
});

test("CLI sessions list filters by observed time", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-15T00:00:00.000Z",
      payload: {
        sessionId: "old",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Old Codex note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T00:00:00.000Z",
      payload: {
        sessionId: "new",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "New Codex note.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--since",
    "2026-05-15T12:00:00.000Z",
    "--json",
  ]);
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.count, 1);
  assert.equal(parsed.totalCount, 1);
  assert.equal(parsed.filters.since, "2026-05-15T12:00:00.000Z");
  assert.match(parsed.sessions[0].summary, /New Codex note/);

  const text = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--since",
    "2026-05-15T12:00:00.000Z",
  ]);

  assert.match(text.stdout, /^Since: 2026-05-15T12:00:00.000Z$/m);
  assert.match(text.stdout, /New Codex note/);
  assert.doesNotMatch(text.stdout, /Old Codex note/);
});

test("CLI sessions list rejects invalid since values", async () => {
  const repoPath = await createTempGitRepo();

  await assert.rejects(
    execFileAsync("node", [
      "packages/cli/src/index.js",
      "sessions",
      "list",
      "--repo",
      repoPath,
      "--since",
      "not-a-date",
    ]),
    /sessions list requires --since <iso-date>/,
  );
});

test("CLI sessions list renders filtered text output", async () => {
  const repoPath = await createTempGitRepo();

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "note",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
    "--agent",
    "manual",
    "--summary",
    "Reviewed local session context.",
    "--json",
  ]);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
    "--work",
    "phase-6-session-import",
  ]);

  assert.match(stdout, /^Sessions$/m);
  assert.match(stdout, /^Filter: phase-6-session-import$/m);
  assert.match(stdout, /^Count: 1$/m);
  assert.match(stdout, /manual-note\s+phase-6-session-import\s+manual\s+\S+\s+Reviewed local session context\./);
});

test("CLI sessions list text output shows attached session details", async () => {
  const repoPath = await createTempGitRepo();
  const inputPath = join(await mkdtemp(join(tmpdir(), "devflow-cli-list-text-")), "plan.json");
  await writeFile(
    inputPath,
    `${JSON.stringify({
      proposals: [
        {
          sessionId: "high-confidence",
          agent: "Codex",
          recommendedWorkItemId: "phase-6-session-import",
          action: "attach-ready",
          requiresConfirmation: false,
          confidence: "high",
          changedFiles: ["packages/adapters/src/index.js"],
          reason: "Session has high confidence.",
          warnings: [],
        },
      ],
    })}\n`,
  );

  await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "attach",
    "--repo",
    repoPath,
    "--input",
    inputPath,
    "--session",
    "high-confidence",
    "--confirm",
    "--json",
  ]);

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
  ]);

  assert.match(stdout, /attached\s+phase-6-session-import\s+Codex\s+\S+\s+high-confidence\s+files:1/);
});

test("CLI sessions list text output shows observed time", async () => {
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
        sessionId: "manual-note-1",
        workItemId: "phase-6-session-import",
        agent: "manual",
        kind: "manual-note",
        summary: "Reviewed local context.",
      },
    })}\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
  ]);

  assert.match(
    stdout,
    /manual-note\s+phase-6-session-import\s+manual\s+2026-05-16T11:00:00.000Z\s+Reviewed local context\./,
  );
});

test("CLI sessions list text output surfaces state warnings", async () => {
  const repoPath = await createTempGitRepo();
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(join(stateDir, "events.jsonl"), "{not-json}\n", "utf8");

  const { stdout } = await execFileAsync("node", [
    "packages/cli/src/index.js",
    "sessions",
    "list",
    "--repo",
    repoPath,
  ]);

  assert.match(stdout, /^Warnings: 1$/m);
});

async function createTempGitRepo() {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-cli-"));
  await execFileAsync("git", ["init"], { cwd: repoPath });
  return repoPath;
}
