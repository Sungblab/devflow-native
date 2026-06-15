import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { writeHarnessInstall } from "../../core/src/index.js";
import { callTool, listTools } from "../src/index.js";

test("MCP lists initial devflow tools", () => {
  const tools = listTools();
  const names = tools.map((tool) => tool.name);

  assert.ok(names.includes("devflow.doctor"));
  assert.ok(names.includes("devflow.status"));
  assert.ok(names.includes("devflow.health"));
  assert.ok(names.includes("devflow.init"));
  assert.ok(names.includes("devflow.harness_inspect"));
  assert.ok(names.includes("devflow.harness_plan"));
  assert.ok(names.includes("devflow.harness_health"));
  assert.ok(names.includes("devflow.harness_smoke"));
  assert.ok(names.includes("devflow.harness_repair"));
  assert.ok(names.includes("devflow.finish"));
  assert.ok(names.includes("devflow.next_prompt"));
  assert.ok(names.includes("devflow.handoff_latest"));
  assert.ok(names.includes("devflow.record_gate"));
  assert.ok(names.includes("devflow.gates_run"));
  assert.ok(names.includes("devflow.split"));
  assert.ok(names.includes("devflow.explain_term"));
  assert.ok(names.includes("devflow.rewrite_prompt"));
  assert.ok(names.includes("devflow.sessions_codex"));
  assert.ok(names.includes("devflow.sessions_claude"));
  assert.ok(names.includes("devflow.sessions_opencode"));
  assert.ok(names.includes("devflow.sessions_cline"));
  assert.ok(names.includes("devflow.sessions_attach_plan"));
  assert.ok(names.includes("devflow.sessions_attach"));
  assert.ok(names.includes("devflow.sessions_list"));
  assert.ok(names.includes("devflow.sessions_note"));
  assert.ok(names.includes("devflow.work_create"));
  assert.ok(names.includes("devflow.work_start"));
  assert.ok(names.includes("devflow.work_update"));
  assert.ok(names.includes("devflow.work_rename"));
  assert.ok(names.includes("devflow.work_ready"));
  assert.ok(names.includes("devflow.work_block"));
  assert.ok(names.includes("devflow.work_unblock"));
  assert.ok(names.includes("devflow.work_list"));
  assert.ok(names.includes("devflow.review_record"));
  assert.ok(names.includes("devflow.review_request"));
  assert.ok(names.includes("devflow.mistakes_add"));
  assert.ok(names.includes("devflow.mistakes_list"));
  assert.ok(names.includes("devflow.mistakes_detect"));
  assert.ok(tools.every((tool) => tool.inputSchema?.type === "object"));
});

test("MCP init renders a preset bootstrap dry run without writing files", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-init-plan-"));
  await writeFile(
    join(repoPath, "package.json"),
    `${JSON.stringify({
      scripts: {
        "docs:check": "node scripts/check-doc-links.mjs",
        lint: "eslint .",
        test: "node --test",
        build: "vite build",
      },
    })}\n`,
    "utf8",
  );

  const result = await callTool("devflow.init", {
    repo: repoPath,
    preset: "solo-product",
    targets: "codex,claude",
    ci: "github",
    review: "required",
  });

  assert.equal(result.structuredContent.command, "init");
  assert.equal(result.structuredContent.preset, "solo-product");
  assert.deepEqual(result.structuredContent.targets, ["codex", "claude"]);
  assert.equal(result.structuredContent.ci, "github");
  assert.deepEqual(
    JSON.parse(result.structuredContent.files.find((file) => file.path === ".devflow/config.json").content).gates.map(
      (gate) => gate.command,
    ),
    ["npm run docs:check", "npm run lint", "npm test", "npm run build"],
  );
  assert.ok(result.structuredContent.files.some((file) => file.path === "plugins/devflow/skills/init/SKILL.md"));
  assert.match(result.content[0].text, /devflow init: plan/);
  await assert.rejects(readFile(join(repoPath, ".devflow", "config.json"), "utf8"), /ENOENT/);
});

test("MCP init writes confirmed preset bootstrap files", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-init-confirm-"));
  await writeFile(join(repoPath, "AGENTS.md"), "# Existing Rules\n\nKeep this.\n", "utf8");
  await writeFile(
    join(repoPath, "package.json"),
    `${JSON.stringify({
      scripts: {
        "docs:check": "node scripts/check-doc-links.mjs",
        test: "node --test",
      },
    })}\n`,
    "utf8",
  );

  const result = await callTool("devflow.init", {
    repo: repoPath,
    preset: "solo-product",
    targets: ["codex", "claude"],
    ci: "github",
    review: "required",
    confirm: true,
  });
  const config = JSON.parse(await readFile(join(repoPath, ".devflow", "config.json"), "utf8"));
  const agents = await readFile(join(repoPath, "AGENTS.md"), "utf8");
  const workflow = await readFile(join(repoPath, ".github", "workflows", "devflow.yml"), "utf8");
  const initSkill = await readFile(join(repoPath, "plugins", "devflow", "skills", "init", "SKILL.md"), "utf8");

  assert.equal(result.structuredContent.result.command, "init_result");
  assert.ok(result.structuredContent.result.updated.some((file) => file.path === "AGENTS.md"));
  assert.equal(config.preset, "solo-product");
  assert.equal(config.review.required, true);
  assert.match(agents, /Keep this/);
  assert.match(agents, /## Devflow Native/);
  assert.match(workflow, /npm run docs:check/);
  assert.match(initSkill, /devflow init --preset/);
  assert.match(result.content[0].text, /devflow init: written/);
});

test("MCP harness tools inspect, plan, and health-check native setup", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-harness-"));
  await writeFile(join(repoPath, "AGENTS.md"), "# Agent Guide\n");

  const inspect = await callTool("devflow.harness_inspect", {
    repo: repoPath,
    targets: ["codex", "claude", "superpowers", "codegraph"],
  });
  const plan = await callTool("devflow.harness_plan", {
    repo: repoPath,
    targets: "codex,claude,codegraph",
  });

  assert.equal(inspect.structuredContent.command, "harness_inspect");
  assert.equal(inspect.structuredContent.targets.codex.status, "missing");
  assert.match(inspect.content[0].text, /harness_inspect/);
  assert.equal(plan.structuredContent.command, "harness_plan");
  assert.equal(plan.structuredContent.dryRun, true);
  assert.ok(plan.structuredContent.actions.some((action) => action.target === "codex"));

  await writeHarnessInstall(repoPath, {
    targets: ["codex", "claude"],
    confirmed: true,
  });
  const health = await callTool("devflow.harness_health", {
    repo: repoPath,
    targets: ["codex", "claude"],
  });

  assert.equal(health.structuredContent.command, "harness_health");
  assert.equal(health.structuredContent.status, "ok");
  assert.ok(health.structuredContent.checks.some((check) => check.kind === "hook-script" && check.status === "passed"));
  assert.match(health.content[0].text, /harness_health: ok/);
});

test("MCP harness smoke validates native packaging with skipped host commands", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-harness-smoke-"));
  await writeHarnessInstall(repoPath, {
    targets: ["codex", "claude"],
    confirmed: true,
  });

  const smoke = await callTool("devflow.harness_smoke", {
    repo: repoPath,
    targets: ["codex", "claude"],
    skipHostCommands: true,
  });

  assert.equal(smoke.structuredContent.command, "harness_smoke");
  assert.equal(smoke.structuredContent.status, "partial");
  assert.ok(smoke.structuredContent.checks.some((check) => check.name === "codex-plugin-list" && check.status === "skipped"));
  assert.ok(smoke.structuredContent.checks.some((check) => check.name === "codex-local-plugin-add" && check.status === "skipped"));
  assert.ok(smoke.structuredContent.checks.some((check) => check.name === "path:plugins/devflow/commands/status.md" && check.status === "passed"));
  assert.match(smoke.content[0].text, /harness_smoke: partial/);
});

test("MCP harness health surfaces repair command for missing required review", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-harness-review-"));
  await writeHarnessInstall(repoPath, {
    targets: ["codex"],
    confirmed: true,
  });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ gates: [{ id: "unit", command: "npm test" }] })}\n`,
  );

  const health = await callTool("devflow.harness_health", {
    repo: repoPath,
    targets: ["codex"],
  });

  assert.equal(health.structuredContent.command, "harness_health");
  assert.equal(health.structuredContent.status, "failed");
  assert.equal(health.structuredContent.nextAction.command, "devflow harness repair --confirm");
  assert.ok(health.structuredContent.checks.some((check) => check.kind === "review-required" && check.status === "failed"));
  assert.match(health.content[0].text, /devflow harness repair --confirm/);
});

test("MCP harness repair requires confirmation and repairs required review config", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-harness-repair-"));
  await writeHarnessInstall(repoPath, {
    targets: ["codex"],
    confirmed: true,
  });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ gates: [{ id: "unit", command: "npm test" }] })}\n`,
  );

  await assert.rejects(
    callTool("devflow.harness_repair", {
      repo: repoPath,
      targets: ["codex"],
    }),
    /requires --confirm/,
  );

  const repaired = await callTool("devflow.harness_repair", {
    repo: repoPath,
    targets: ["codex"],
    confirm: true,
  });
  const config = JSON.parse(await readFile(join(repoPath, ".devflow", "config.json"), "utf8"));

  assert.equal(repaired.structuredContent.command, "harness_repair");
  assert.equal(repaired.structuredContent.status, "repaired");
  assert.ok(repaired.structuredContent.repaired.some((item) => item.kind === "review-required"));
  assert.equal(config.review.required, true);
  assert.match(repaired.content[0].text, /harness_repair: repaired/);
});

test("MCP health reports missing scaffold files", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-health-"));
  const result = await callTool("devflow.health", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.command, "health");
  assert.equal(result.structuredContent.status, "missing");
  assert.ok(result.structuredContent.missingFiles.some((file) => file.path === ".devflow/config.json"));
  assert.match(result.content[0].text, /health/);
});

test("MCP status reads configured gates from devflow config", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-config-gates-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "custom", command: "npm run custom" }],
    })}\n`,
  );

  const result = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.gates[0].id, "custom");
  assert.equal(result.structuredContent.gates[0].command, "npm run custom");
});

test("MCP health reports invalid configured gates", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-health-invalid-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(join(repoPath, ".devflow", "config.json"), "{}\n");
  await mkdir(join(repoPath, "docs", "contributing"), { recursive: true });
  await mkdir(join(repoPath, "docs", "testing"), { recursive: true });
  await mkdir(join(repoPath, "docs", "architecture", "maps"), { recursive: true });
  await writeFile(join(repoPath, "AGENTS.md"), "# Agent Guide\n");
  await writeFile(join(repoPath, "docs", "README.md"), "# Project Contract\n");
  await writeFile(join(repoPath, "docs", "contributing", "workflow.md"), "# Workflow\n");
  await writeFile(join(repoPath, "docs", "testing", "strategy.md"), "# Testing\n");
  await writeFile(join(repoPath, "docs", "architecture", "maps", "README.md"), "# Maps\n");
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [
        { id: "unit", command: "npm test" },
        { id: "unit", command: "" },
      ],
    })}\n`,
  );

  const result = await callTool("devflow.health", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.status, "invalid");
  assert.ok(result.structuredContent.invalidGates.some((gate) => gate.reason === "duplicate-id"));
  assert.ok(result.structuredContent.invalidGates.some((gate) => gate.reason === "missing-command"));
  assert.match(result.content[0].text, /invalid/);
});

test("MCP status returns local repo state and latest handoff evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-"));
  await callTool("devflow.finish", {
    repo: repoPath,
    work: "status-source",
    title: "Status source",
    intent: "Seed status evidence.",
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    nextTask: "Read status through MCP.",
  });

  const result = await callTool("devflow.status", {
    repo: repoPath,
    changedFiles: [{ path: "packages/mcp/src/index.js", status: "modified" }],
  });

  assert.equal(result.structuredContent.command, "status");
  assert.equal(result.structuredContent.repo.absolutePath, repoPath);
  assert.equal(result.structuredContent.git.changedFiles[0].path, "packages/mcp/src/index.js");
  assert.equal(result.structuredContent.handoffs.latest.workItemId, "status-source");
  assert.match(result.content[0].text, /status/);
});

test("MCP status can focus attached sessions by work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-work-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "Codex",
    summary: "Session import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-7-beginner-guidance",
    agent: "Codex",
    summary: "Beginner guidance note.",
  });

  const result = await callTool("devflow.status", {
    repo: repoPath,
    work: "phase-6-session-import",
  });

  assert.equal(result.structuredContent.filters.workItemId, "phase-6-session-import");
  assert.equal(result.structuredContent.sessions.attached.length, 1);
  assert.equal(result.structuredContent.sessions.attached[0].workItemId, "phase-6-session-import");
  assert.match(result.structuredContent.sessions.attached[0].summary, /Session import note/);
});

test("MCP status can focus attached sessions by agent", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-agent-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "Codex",
    summary: "Codex import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "manual",
    summary: "Manual import note.",
  });

  const result = await callTool("devflow.status", {
    repo: repoPath,
    agent: "Codex",
  });

  assert.equal(result.structuredContent.filters.agent, "Codex");
  assert.equal(result.structuredContent.sessions.attached.length, 1);
  assert.equal(result.structuredContent.sessions.attached[0].agent, "Codex");
  assert.match(result.structuredContent.sessions.attached[0].summary, /Codex import note/);
});

test("MCP status recommends review request for focused work when review is required", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-review-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ review: { required: true } })}\n`,
  );

  const result = await callTool("devflow.status", {
    repo: repoPath,
    work: "review-focused-work",
  });

  assert.equal(result.structuredContent.recommendations[0].kind, "review");
  assert.match(
    result.structuredContent.recommendations[0].command,
    /devflow review request --work review-focused-work/,
  );
});

test("MCP status recommends review request for ready work without a work filter", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-review-ready-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ review: { required: true } })}\n`,
  );
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "ready-review-work",
    title: "Ready review work",
  });
  await callTool("devflow.work_ready", {
    repo: repoPath,
    id: "ready-review-work",
  });

  const result = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.filters.workItemId, null);
  assert.equal(result.structuredContent.recommendations[0].kind, "review");
  assert.match(
    result.structuredContent.recommendations[0].command,
    /devflow review request --work ready-review-work/,
  );
});

test("MCP doctor returns the same structured execution contract", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-doctor-"));
  const result = await callTool("devflow.doctor", {
    repo: repoPath,
    platform: "windows-powershell",
  });

  assert.equal(result.structuredContent.command, "doctor");
  assert.equal(result.structuredContent.platform.name, "windows-powershell");
  assert.equal(
    result.structuredContent.executionContract.preferredReadCommand,
    "Get-Content -LiteralPath",
  );
  assert.match(result.content[0].text, /doctor/);
});

test("MCP mistakes tools record detected candidates for doctor memory", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-mistakes-"));

  const detected = await callTool("devflow.mistakes_detect", {
    repo: repoPath,
    platform: "windows-powershell",
    command: "Get-Content -LiteralPath docs\\product-plan.md | Select-Object -Index 108..156",
    stderr: "Cannot bind parameter 'Index'. Cannot convert value \"108..156\" to type \"System.Int32\".",
    record: true,
  });

  assert.equal(detected.structuredContent.command, "mistakes_detect");
  assert.equal(detected.structuredContent.candidates[0].id, "powershell-select-object-range-syntax");
  assert.equal(detected.structuredContent.recorded[0].id, "powershell-select-object-range-syntax");

  const listed = await callTool("devflow.mistakes_list", {
    repo: repoPath,
  });

  assert.equal(listed.structuredContent.command, "mistakes_list");
  assert.equal(listed.structuredContent.count, 1);

  const added = await callTool("devflow.mistakes_add", {
    repo: repoPath,
    id: "playwright-module-unavailable",
    category: "setup-tool-availability",
    symptom: "Agent tried to run Playwright before the package or workspace runtime was available.",
    correction: "Inspect package manager state before loading Playwright.",
    appliesTo: ["playwright"],
  });

  assert.equal(added.structuredContent.command, "mistakes_add");
  assert.equal(added.structuredContent.mistake.id, "playwright-module-unavailable");

  const doctor = await callTool("devflow.doctor", {
    repo: repoPath,
    platform: "windows-powershell",
  });

  assert.equal(doctor.structuredContent.memory.repeatedMistakes.length, 2);
  assert.ok(
    doctor.structuredContent.recommendations.some(
      (item) => item.source === "playwright-module-unavailable",
    ),
  );
});

test("MCP finish records evidence into local state", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-finish-"));
  const result = await callTool("devflow.finish", {
    repo: repoPath,
    work: "mcp-finish",
    title: "MCP finish",
    intent: "Record finish evidence from MCP.",
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    risks: ["No stdio transport yet."],
    nextTask: "Add stdio MCP protocol transport.",
  });

  assert.equal(result.structuredContent.command, "finish");
  assert.equal(result.structuredContent.workItem.id, "mcp-finish");
  assert.match(result.structuredContent.nextSession.prompt, /stdio MCP protocol/);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"work.completed"/);
  assert.match(log, /mcp-finish/);
});

test("MCP finish blocks done claim when configured gate has no recorded evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-finish-guard-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "unit", command: "npm test" }],
    })}\n`,
  );

  const result = await callTool("devflow.finish", {
    repo: repoPath,
    work: "missing-gate",
    title: "Missing gate",
    intent: "Block completion without recorded gate evidence.",
  });

  assert.equal(result.structuredContent.canClaimDone, false);
  assert.equal(result.structuredContent.unknownGates[0].id, "unit");
  assert.equal(result.structuredContent.doneBlockers[0].kind, "unknown_gate");
});

test("MCP handoff latest returns persisted next prompt projection", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-handoff-latest-"));

  await callTool("devflow.finish", {
    repo: repoPath,
    work: "mcp-handoff-latest",
    title: "MCP handoff latest",
    intent: "Persist a latest prompt for MCP lookup.",
    gates: [{ id: "unit", command: "node --test", status: "passed" }],
    nextTask: "Load this prompt in the next MCP session.",
  });

  const latest = await callTool("devflow.handoff_latest", {
    repo: repoPath,
  });

  assert.equal(latest.structuredContent.command, "handoff_latest");
  assert.equal(latest.structuredContent.handoff.workItemId, "mcp-handoff-latest");
  assert.equal(latest.structuredContent.path, ".devflow/next-prompt.md");
  assert.match(latest.structuredContent.prompt, /Persist a latest prompt for MCP lookup/);
  assert.match(latest.content[0].text, /devflow handoff_latest: mcp-handoff-latest/);
});

test("MCP finish requires recorded review when configured", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-review-required-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ review: { required: true } })}\n`,
  );

  const blocked = await callTool("devflow.finish", {
    repo: repoPath,
    work: "reviewed-work",
    title: "Reviewed work",
  });
  assert.equal(blocked.structuredContent.canClaimDone, false);
  assert.ok(blocked.structuredContent.doneBlockers.some((blocker) => blocker.kind === "missing_review"));
  assert.equal(
    blocked.structuredContent.review.nextAction.command,
    "devflow review request --work reviewed-work --target reviewer --persona strict-reviewer",
  );
  assert.equal(
    blocked.structuredContent.review.nextAction.recordCommand,
    "devflow review record --work reviewed-work --reviewer <reviewer> --status <passed|changes-requested> --summary <summary>",
  );

  const review = await callTool("devflow.review_record", {
    repo: repoPath,
    work: "reviewed-work",
    reviewer: "Claude Code",
    status: "passed",
    summary: "No blocking findings.",
  });
  assert.equal(review.structuredContent.command, "review_record");

  const finished = await callTool("devflow.finish", {
    repo: repoPath,
    work: "reviewed-work",
    title: "Reviewed work",
  });

  assert.equal(finished.structuredContent.canClaimDone, true);
  assert.equal(finished.structuredContent.review.status, "passed");
});

test("MCP review_request emits a strict reviewer prompt", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-review-request-"));
  const result = await callTool("devflow.review_request", {
    repo: repoPath,
    work: "review-request",
    title: "Review request",
    intent: "Review before finish.",
    target: "codex",
    persona: "strict-reviewer",
    changedFiles: [{ path: "packages/mcp/src/index.js", status: "modified" }],
  });

  assert.equal(result.structuredContent.command, "review_request");
  assert.equal(result.structuredContent.target, "codex");
  assert.match(result.structuredContent.prompt, /Assume another coding agent wrote this change/);
  assert.match(result.structuredContent.prompt, /packages\/mcp\/src\/index\.js/);
  assert.match(result.structuredContent.prompt, /devflow review record --work review-request/);
  assert.match(result.content[0].text, /devflow review_request: review-request/);
  assert.match(result.content[0].text, /Record command: devflow review record --work review-request/);
});

test("MCP review_request keeps recorded gate evidence scoped to the work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-review-request-scope-"));
  await callTool("devflow.record_gate", {
    repo: repoPath,
    id: "other-unit",
    command: "npm test",
    status: "passed",
    work: "other-work",
  });
  await callTool("devflow.record_gate", {
    repo: repoPath,
    id: "target-unit",
    command: "node --test packages/mcp/test/mcp-contract.test.mjs",
    status: "passed",
    work: "target-work",
  });

  const result = await callTool("devflow.review_request", {
    repo: repoPath,
    work: "target-work",
    title: "Target work",
  });

  assert.match(result.structuredContent.prompt, /target-unit/);
  assert.doesNotMatch(result.structuredContent.prompt, /other-unit/);
});

test("MCP finish allows done claim when configured gate evidence was recorded", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-finish-recorded-gate-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "unit", command: "npm test" }],
    })}\n`,
  );
  await callTool("devflow.record_gate", {
    repo: repoPath,
    id: "unit",
    command: "npm test",
    status: "passed",
    workItemId: "recorded-gate",
  });

  const result = await callTool("devflow.finish", {
    repo: repoPath,
    work: "recorded-gate",
    title: "Recorded gate",
    intent: "Allow completion after recorded gate evidence.",
  });

  assert.equal(result.structuredContent.canClaimDone, true);
  assert.deepEqual(result.structuredContent.doneBlockers, []);
  assert.equal(result.structuredContent.gateEvidence[0].id, "unit");
});

test("MCP finish keeps gate evidence scoped to the requested work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-finish-gate-scope-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "unit", command: "npm test" }],
    })}\n`,
  );
  await callTool("devflow.record_gate", {
    repo: repoPath,
    id: "unit",
    command: "npm test",
    status: "passed",
    workItemId: "other-work",
  });

  const blocked = await callTool("devflow.finish", {
    repo: repoPath,
    work: "target-work",
    title: "Target work",
    intent: "Do not borrow gate evidence from another work item.",
  });

  assert.equal(blocked.structuredContent.canClaimDone, false);
  assert.equal(blocked.structuredContent.unknownGates[0].id, "unit");
  assert.equal(blocked.structuredContent.doneBlockers[0].kind, "unknown_gate");

  await callTool("devflow.record_gate", {
    repo: repoPath,
    id: "unit",
    command: "npm test",
    status: "passed",
    workItemId: "target-work",
  });
  const finished = await callTool("devflow.finish", {
    repo: repoPath,
    work: "target-work",
    title: "Target work",
    intent: "Use only target work gate evidence.",
  });

  assert.equal(finished.structuredContent.canClaimDone, true);
  assert.equal(finished.structuredContent.gateEvidence.length, 1);
  assert.equal(finished.structuredContent.gateEvidence[0].workItemId, "target-work");
});

test("MCP record_gate records standalone gate evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-record-gate-"));
  const result = await callTool("devflow.record_gate", {
    repo: repoPath,
    id: "docs",
    command: "npm run docs:check",
    status: "passed",
    summary: "Documentation link check passed.",
    workItemId: "docs-check",
  });

  assert.equal(result.structuredContent.command, "record_gate");
  assert.equal(result.structuredContent.gate.id, "docs");
  assert.equal(result.structuredContent.gate.status, "passed");
  assert.match(result.content[0].text, /record_gate/);

  const status = await callTool("devflow.status", {
    repo: repoPath,
    gates: [{ id: "docs", command: "npm run docs:check", recommended: true }],
  });

  assert.equal(status.structuredContent.gates[0].lastRun.status, "passed");
  assert.equal(status.structuredContent.gates[0].lastRun.workItemId, "docs-check");

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"gate.finished"/);
  assert.match(log, /docs-check/);
});

test("MCP work tools create, start, and list work items", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-"));
  const created = await callTool("devflow.work_create", {
    repo: repoPath,
    id: "phase-3-work-registry",
    title: "Phase 3 work registry",
    ownedPaths: ["packages/core/**", "packages/mcp/**"],
  });
  const started = await callTool("devflow.work_start", {
    repo: repoPath,
    id: "phase-3-work-registry",
  });
  const listed = await callTool("devflow.work_list", {
    repo: repoPath,
  });

  assert.equal(created.structuredContent.command, "work_create");
  assert.equal(started.structuredContent.command, "work_start");
  assert.equal(listed.structuredContent.command, "work_list");
  assert.equal(listed.structuredContent.items[0].status, "active");
  assert.deepEqual(listed.structuredContent.items[0].ownedPaths, ["packages/core/**", "packages/mcp/**"]);
});

test("MCP work_create is idempotent for existing ids", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-idempotent-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "duplicate-safe",
    title: "Duplicate safe",
  });
  const repeated = await callTool("devflow.work_create", {
    repo: repoPath,
    id: "duplicate-safe",
    title: "Changed title",
  });

  assert.equal(repeated.structuredContent.event.existing, true);
  assert.equal(repeated.structuredContent.workItem.title, "Duplicate safe");

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.equal(log.trim().split("\n").length, 1);
});

test("MCP work lifecycle tools mark items ready and blocked", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-lifecycle-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "ready-work",
    title: "Ready work",
  });
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "blocked-work",
    title: "Blocked work",
  });

  const ready = await callTool("devflow.work_ready", {
    repo: repoPath,
    id: "ready-work",
  });
  const blocked = await callTool("devflow.work_block", {
    repo: repoPath,
    id: "blocked-work",
    reason: "Waiting for review.",
  });
  const status = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(ready.structuredContent.command, "work_ready");
  assert.equal(blocked.structuredContent.command, "work_block");
  assert.equal(status.structuredContent.work.readyToFinish[0].id, "ready-work");
  assert.equal(status.structuredContent.work.blocked[0].id, "blocked-work");
  assert.equal(status.structuredContent.work.blocked[0].blockedReason, "Waiting for review.");
});

test("MCP work_update changes metadata without changing lifecycle state", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-update-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "update-work",
    title: "Original title",
    description: "Original description",
    ownedPaths: ["docs/**"],
  });
  await callTool("devflow.work_start", {
    repo: repoPath,
    id: "update-work",
  });

  const updated = await callTool("devflow.work_update", {
    repo: repoPath,
    id: "update-work",
    title: "Updated title",
    description: "Updated description",
    ownedPaths: ["packages/core/**", "packages/mcp/**"],
  });
  const status = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(updated.structuredContent.command, "work_update");
  assert.equal(status.structuredContent.work.active[0].id, "update-work");
  assert.equal(status.structuredContent.work.active[0].title, "Updated title");
  assert.equal(status.structuredContent.work.active[0].description, "Updated description");
  assert.deepEqual(status.structuredContent.work.active[0].ownedPaths, ["packages/core/**", "packages/mcp/**"]);
});

test("MCP work_rename updates only the work item title", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-rename-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "rename-work",
    title: "Original title",
    description: "Keep description",
    ownedPaths: ["docs/**"],
  });
  await callTool("devflow.work_start", {
    repo: repoPath,
    id: "rename-work",
  });

  const renamed = await callTool("devflow.work_rename", {
    repo: repoPath,
    id: "rename-work",
    title: "Renamed title",
  });
  const status = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(renamed.structuredContent.command, "work_rename");
  assert.equal(status.structuredContent.work.active[0].id, "rename-work");
  assert.equal(status.structuredContent.work.active[0].title, "Renamed title");
  assert.equal(status.structuredContent.work.active[0].description, "Keep description");
  assert.deepEqual(status.structuredContent.work.active[0].ownedPaths, ["docs/**"]);
});

test("MCP work_unblock returns blocked work to active state", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-unblock-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "blocked-work",
    title: "Blocked work",
  });
  await callTool("devflow.work_block", {
    repo: repoPath,
    id: "blocked-work",
    reason: "Waiting for review.",
  });

  const unblocked = await callTool("devflow.work_unblock", {
    repo: repoPath,
    id: "blocked-work",
  });
  const status = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(unblocked.structuredContent.command, "work_unblock");
  assert.equal(status.structuredContent.work.active[0].id, "blocked-work");
  assert.equal(status.structuredContent.work.active[0].blockedReason, null);
  assert.equal(status.structuredContent.work.blocked.length, 0);
});

test("MCP gates_run executes configured gate and records evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-gates-run-"));
  const scriptPath = join(repoPath, "gate-script.mjs");
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(scriptPath, "console.log('mcp gate stdout');\n", "utf8");
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "unit", command: `${JSON.stringify(process.execPath)} ${JSON.stringify(scriptPath)}` }],
    })}\n`,
    "utf8",
  );

  const result = await callTool("devflow.gates_run", {
    repo: repoPath,
    id: "unit",
  });

  assert.equal(result.structuredContent.command, "gates_run");
  assert.equal(result.structuredContent.gate.id, "unit");
  assert.equal(result.structuredContent.status, "passed");
  assert.equal(result.structuredContent.exitCode, 0);
  assert.match(result.structuredContent.stdout.summary, /mcp gate stdout/);
  assert.match(result.content[0].text, /gates_run/);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"gate.finished"/);
  assert.match(log, /mcp gate stdout/);
});

test("MCP split returns worktree sessions and copy-paste prompts", async () => {
  const result = await callTool("devflow.split", {
    runId: "2026-05-16-mcp-split",
    goal: "Split the next Devflow implementation.",
    sessionCount: 2,
    platform: "windows-powershell",
    tasks: [
      {
        id: "mcp-split-tool",
        ownedPaths: ["packages/mcp/**", "packages/core/**"],
        avoidPaths: ["docs/**"],
        verification: [{ cwd: ".", command: "npm test" }],
      },
      {
        id: "docs-split-contract",
        role: "audit",
        ownedPaths: ["docs/**"],
        avoidPaths: ["packages/**"],
        verification: [{ cwd: ".", command: "npm run docs:check" }],
      },
    ],
  });

  assert.equal(result.structuredContent.command, "split");
  assert.equal(result.structuredContent.sessions.length, 2);
  assert.equal(result.structuredContent.sessions[0].branch, "codex/mcp-split-tool");
  assert.match(result.structuredContent.sessions[0].prompt, /packages\/mcp\/\*\*/);
  assert.match(result.content[0].text, /split/);
});

test("MCP split reads project-specific tasks from devflow config", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-config-split-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      defaultProfile: "hermes",
      defaultPlatform: "windows-powershell",
      split: {
        tasks: [
          {
            id: "configured-mcp",
            ownedPaths: ["packages/mcp/**"],
            avoidPaths: ["docs/**"],
            verification: [{ cwd: ".", command: "npm test" }],
          },
        ],
      },
    })}\n`,
  );

  const result = await callTool("devflow.split", {
    repo: repoPath,
    goal: "Use configured MCP split.",
  });

  assert.equal(result.structuredContent.profile.name, "hermes");
  assert.equal(result.structuredContent.sessions[0].id, "configured-mcp");
  assert.deepEqual(result.structuredContent.sessions[0].ownedPaths, ["packages/mcp/**"]);
});

test("MCP split can register and start generated work items", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-split-register-"));
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

  const split = await callTool("devflow.split", {
    repo: repoPath,
    register: true,
    start: true,
  });
  const listed = await callTool("devflow.work_list", {
    repo: repoPath,
  });

  assert.equal(split.structuredContent.registration.command, "split_register");
  assert.equal(split.structuredContent.registration.created.length, 2);
  assert.equal(split.structuredContent.registration.started.length, 2);
  assert.deepEqual(
    listed.structuredContent.items.map((item) => item.status),
    ["active", "active"],
  );
});

test("MCP explain_term returns beginner-friendly structured explanation", async () => {
  const result = await callTool("devflow.explain_term", {
    term: "middleware",
    context: "The agent said to add middleware before the route handler.",
  });

  assert.equal(result.structuredContent.command, "explain");
  assert.equal(result.structuredContent.term, "middleware");
  assert.match(result.structuredContent.plainExplanation, /between/);
  assert.match(result.content[0].text, /explain_term/);
});

test("MCP rewrite_prompt turns vague request into agent-ready requirements", async () => {
  const result = await callTool("devflow.rewrite_prompt", {
    request: "알아서 다음 구현 계속해",
    context: "Phase 7 still needs MCP prompt rewrite.",
  });

  assert.equal(result.structuredContent.command, "prompt_rewrite");
  assert.equal(result.structuredContent.originalRequest, "알아서 다음 구현 계속해");
  assert.match(result.structuredContent.agentReadyPrompt, /Objective:/);
  assert.match(result.structuredContent.agentReadyPrompt, /Phase 7/);
  assert.match(result.content[0].text, /rewrite_prompt/);
});

test("MCP sessions_codex renders explicit read-only Codex discovery JSON", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-codex-repo-"));
  const codexHome = await mkdtemp(join(tmpdir(), "devflow-mcp-codex-home-"));
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

  const result = await callTool("devflow.sessions_codex", {
    repo: repoPath,
    codexHome,
  });

  assert.equal(result.structuredContent.command, "sessions_codex");
  assert.equal(result.structuredContent.files.length, 1);
  assert.equal(
    result.structuredContent.discovery.sessions[0].sessionId,
    "019c7714-3b77-74d1-9866-e1f484aae2ab",
  );
  assert.equal(result.structuredContent.discovery.sessions[0].project.confidence, "high");
  assert.equal(result.structuredContent.discovery.sessions[0].signals.hasFileEdits, true);
  assert.match(result.content[0].text, /sessions_codex/);
});

test("MCP session adapter tools normalize explicit Claude OpenCode and Cline records", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-agent-records-"));
  const claude = await callTool("devflow.sessions_claude", {
    repo: repoPath,
    records: [
      {
        id: "claude-mcp-1",
        cwd: repoPath,
        hasToolCalls: true,
        changedFiles: ["packages/adapters/src/index.js"],
      },
    ],
  });
  const opencode = await callTool("devflow.sessions_opencode", {
    repo: repoPath,
    records: [
      {
        id: "opencode-mcp-1",
        workspace: repoPath,
        toolCalls: [{ name: "edit" }],
        files: ["packages/mcp/src/index.js"],
      },
    ],
  });
  const cline = await callTool("devflow.sessions_cline", {
    repo: repoPath,
    records: [
      {
        taskId: "cline-mcp-1",
        cwd: repoPath,
        messages: [{ type: "tool_use", tool: "editedExistingFile" }],
        changedFiles: ["packages/cli/src/index.js"],
      },
    ],
  });

  assert.equal(claude.structuredContent.command, "sessions_claude");
  assert.equal(claude.structuredContent.discovery.sessions[0].agent, "Claude Code");
  assert.equal(claude.structuredContent.discovery.sessions[0].project.confidence, "high");
  assert.equal(opencode.structuredContent.discovery.sessions[0].agent, "OpenCode");
  assert.equal(opencode.structuredContent.discovery.sessions[0].signals.hasFileEdits, true);
  assert.equal(cline.structuredContent.discovery.sessions[0].agent, "Cline");
  assert.equal(cline.structuredContent.discovery.sessions[0].sessionId, "cline-mcp-1");
});

test("MCP session adapter tools can read explicit Claude history paths", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-claude-history-repo-"));
  const historyRoot = await mkdtemp(join(tmpdir(), "devflow-mcp-claude-history-"));
  await writeFile(
    join(historyRoot, "project.jsonl"),
    `${JSON.stringify({
      sessionId: "claude-history-mcp-1",
      cwd: repoPath,
      timestamp: "2026-06-03T13:30:00.000Z",
      type: "tool_use",
      name: "Edit",
      changedFiles: ["packages/mcp/src/index.js"],
    })}\n`,
  );

  const result = await callTool("devflow.sessions_claude", {
    repo: repoPath,
    historyPath: historyRoot,
  });

  assert.equal(result.structuredContent.command, "sessions_claude");
  assert.equal(result.structuredContent.files.length, 1);
  assert.equal(result.structuredContent.discovery.sessions[0].sessionId, "claude-history-mcp-1");
  assert.equal(result.structuredContent.discovery.sessions[0].project.confidence, "high");
  assert.equal(result.structuredContent.discovery.sessions[0].signals.hasFileEdits, true);
});

test("MCP sessions_attach_plan renders dry-run attach proposals", async () => {
  const result = await callTool("devflow.sessions_attach_plan", {
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
  });

  assert.equal(result.structuredContent.command, "session_attach_plan");
  assert.equal(result.structuredContent.proposals[0].sessionId, "high-confidence");
  assert.equal(result.structuredContent.proposals[0].recommendedWorkItemId, "phase-6-session-import");
  assert.equal(result.structuredContent.proposals[0].action, "attach-ready");
  assert.match(result.content[0].text, /sessions_attach_plan/);
});

test("MCP sessions_attach writes confirmed session attach events", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-attach-"));
  const result = await callTool("devflow.sessions_attach", {
    repo: repoPath,
    confirm: true,
    proposal: {
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
  });

  assert.equal(result.structuredContent.command, "session_attach");
  assert.equal(result.structuredContent.event.type, "session.attached");
  assert.equal(result.structuredContent.event.payload.sessionId, "high-confidence");
  assert.match(result.content[0].text, /sessions_attach/);

  const status = await callTool("devflow.status", { repo: repoPath });
  assert.equal(status.structuredContent.sessions.attached[0].sessionId, "high-confidence");
});

test("MCP sessions_attach reports existing links without duplicate events", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-attach-dedupe-"));
  const args = {
    repo: repoPath,
    confirm: true,
    proposal: {
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
  };

  await callTool("devflow.sessions_attach", args);
  const second = await callTool("devflow.sessions_attach", args);
  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");

  assert.equal(second.structuredContent.event.existing, true);
  assert.equal(log.trim().split("\n").length, 1);
});

test("MCP sessions_list renders attached sessions", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-"));
  await callTool("devflow.sessions_attach", {
    repo: repoPath,
    confirm: true,
    proposal: {
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
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.command, "session_list");
  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.sessions[0].sessionId, "high-confidence");
  assert.match(result.content[0].text, /sessions_list/);
});

test("MCP sessions_note records a manual session note", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-note-"));
  const result = await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "manual",
    summary: "Reviewed local session context outside an agent transcript.",
  });

  assert.equal(result.structuredContent.command, "session_note");
  assert.equal(result.structuredContent.event.type, "session.message");
  assert.equal(result.structuredContent.event.payload.workItemId, "phase-6-session-import");

  const list = await callTool("devflow.sessions_list", { repo: repoPath });
  assert.equal(list.structuredContent.sessions[0].kind, "manual-note");
  assert.match(list.structuredContent.sessions[0].summary, /Reviewed local session context/);
});

test("MCP sessions_list filters by work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-filter-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    summary: "Session import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-7-beginner-guidance",
    summary: "Beginner guidance note.",
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    work: "phase-6-session-import",
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.filters.workItemId, "phase-6-session-import");
  assert.equal(result.structuredContent.sessions[0].workItemId, "phase-6-session-import");
});

test("MCP sessions_list limits after work item filtering", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-limit-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    summary: "First import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-7-beginner-guidance",
    summary: "Beginner guidance note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    summary: "Second import note.",
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    work: "phase-6-session-import",
    limit: 1,
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.totalCount, 2);
  assert.equal(result.structuredContent.filters.limit, 1);
  assert.match(result.structuredContent.sessions[0].summary, /Second import note/);
});

test("MCP sessions_list rejects invalid limit values", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-invalid-limit-"));

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      limit: 0,
    }),
    /devflow.sessions_list requires limit to be a positive integer/,
  );

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      limit: "abc",
    }),
    /devflow.sessions_list requires limit to be a positive integer/,
  );
});

test("MCP sessions_list filters by agent", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-agent-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "manual",
    summary: "Manual import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "Codex",
    summary: "Codex import note.",
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    agent: "Codex",
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.filters.agent, "Codex");
  assert.equal(result.structuredContent.sessions[0].agent, "Codex");
  assert.match(result.structuredContent.sessions[0].summary, /Codex import note/);
});

test("MCP sessions_list filters by observed time", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-since-"));
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

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    since: "2026-05-15T12:00:00.000Z",
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.totalCount, 1);
  assert.equal(result.structuredContent.filters.since, "2026-05-15T12:00:00.000Z");
  assert.match(result.structuredContent.sessions[0].summary, /New Codex note/);
});

test("MCP sessions_list rejects invalid since values", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-invalid-since-"));

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      since: "not-a-date",
    }),
    /devflow.sessions_list requires since to be an ISO date/,
  );
});

test("MCP sessions_list sorts by observed time before limit", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-sort-"));
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

  const ascending = await callTool("devflow.sessions_list", {
    repo: repoPath,
    sort: "observedAt:asc",
  });
  const descendingLimited = await callTool("devflow.sessions_list", {
    repo: repoPath,
    sort: "observedAt:desc",
    limit: 1,
  });

  assert.deepEqual(
    ascending.structuredContent.sessions.map((session) => session.summary),
    ["Old Codex note.", "Middle Codex note.", "New Codex note."],
  );
  assert.equal(ascending.structuredContent.filters.sort, "observedAt:asc");
  assert.equal(descendingLimited.structuredContent.count, 1);
  assert.equal(descendingLimited.structuredContent.totalCount, 3);
  assert.equal(descendingLimited.structuredContent.filters.sort, "observedAt:desc");
  assert.match(descendingLimited.structuredContent.sessions[0].summary, /New Codex note/);
});

test("MCP sessions_list rejects invalid sort values", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-invalid-sort-"));

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      sort: "observedAt:newest",
    }),
    /devflow.sessions_list requires sort to be observedAt:asc or observedAt:desc/,
  );
});
