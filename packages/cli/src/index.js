#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd, exit } from "node:process";

import {
  discoverCodexSessions,
  findCodexSessionFiles,
  parseCodexSessionJsonl,
} from "../../adapters/src/index.js";
import {
  createFinishSummary,
  readHarnessInspect,
  readHarnessHealth,
  readHarnessPlan,
  createDoctorSummary,
  createInitPlan,
  createNextPrompt,
  createPromptRewrite,
  createReviewRequest,
  createSessionAttachPlan,
  createSessionListSummary,
  createSplitPlan,
  createStatusSummary,
  createTermExplanation,
  createWorkListSummary,
  parseGitStatusLines,
  parseSessionListLimit,
  parseSessionListSince,
  parseSessionListSort,
  readProjectHealth,
  readDevflowConfig,
  readDevflowState,
  readMistakeMemory,
  recordFinishEvent,
  recordManualSessionNoteEvent,
  recordReviewEvent,
  recordSessionAttachedEvent,
  recordSplitWorkEvents,
  recordWorkBlockedEvent,
  recordWorkCreatedEvent,
  recordWorkReadyEvent,
  recordWorkRenamedEvent,
  recordWorkStartedEvent,
  recordWorkUpdatedEvent,
  recordWorkUnblockedEvent,
  runConfiguredGate,
  writeHarnessInstall,
  writeHarnessRepair,
  writeInitPlan,
} from "../../core/src/index.js";

const args = process.argv.slice(2);
const command = args[0];

try {
  if (command === "init") {
    await renderInit(args.slice(1));
  } else if (command === "health") {
    await renderHealth(args.slice(1));
  } else if (command === "harness" && args[1] === "inspect") {
    await renderHarnessInspect(args.slice(2));
  } else if (command === "harness" && args[1] === "plan") {
    await renderHarnessPlan(args.slice(2));
  } else if (command === "harness" && args[1] === "install") {
    await renderHarnessInstall(args.slice(2));
  } else if (command === "harness" && args[1] === "health") {
    await renderHarnessHealth(args.slice(2));
  } else if (command === "harness" && args[1] === "repair") {
    await renderHarnessRepair(args.slice(2));
  } else if (command === "status") {
    await renderStatus(args.slice(1));
  } else if (command === "explain") {
    renderExplain(args.slice(1));
  } else if (command === "split") {
    await renderSplit(args.slice(1));
  } else if (command === "finish") {
    await renderFinish(args.slice(1));
  } else if (command === "doctor") {
    await renderDoctor(args.slice(1));
  } else if (command === "gates" && args[1] === "run") {
    await renderGatesRun(args.slice(2));
  } else if (command === "review" && args[1] === "record") {
    await renderReviewRecord(args.slice(2));
  } else if (command === "review" && args[1] === "request") {
    await renderReviewRequest(args.slice(2));
  } else if (command === "prompt" && args[1] === "next") {
    renderNextPrompt(args.slice(2));
  } else if (command === "prompt" && args[1] === "rewrite") {
    renderPromptRewrite(args.slice(2));
  } else if (command === "sessions" && args[1] === "codex") {
    await renderCodexSessions(args.slice(2));
  } else if (command === "sessions" && args[1] === "attach-plan") {
    await renderSessionAttachPlan(args.slice(2));
  } else if (command === "sessions" && args[1] === "attach") {
    await renderSessionAttach(args.slice(2));
  } else if (command === "sessions" && args[1] === "list") {
    await renderSessionList(args.slice(2));
  } else if (command === "sessions" && args[1] === "note") {
    await renderSessionNote(args.slice(2));
  } else if (command === "work" && args[1] === "create") {
    await renderWorkCreate(args.slice(2));
  } else if (command === "work" && args[1] === "start") {
    await renderWorkStart(args.slice(2));
  } else if (command === "work" && args[1] === "update") {
    await renderWorkUpdate(args.slice(2));
  } else if (command === "work" && args[1] === "rename") {
    await renderWorkRename(args.slice(2));
  } else if (command === "work" && args[1] === "ready") {
    await renderWorkReady(args.slice(2));
  } else if (command === "work" && args[1] === "block") {
    await renderWorkBlock(args.slice(2));
  } else if (command === "work" && args[1] === "unblock") {
    await renderWorkUnblock(args.slice(2));
  } else if (command === "work" && args[1] === "list") {
    await renderWorkList(args.slice(2));
  } else {
    throw new Error(`Unknown command: ${args.join(" ") || "<none>"}`);
  }
} catch (error) {
  console.error(error.message);
  exit(1);
}

async function renderInit(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const plan = createInitPlan({
    repo: repoPath,
    profile: options.profile,
    platform: options.platform ?? defaultPlatformName(),
  });

  if (options.confirm) {
    const result = await writeInitPlan(repoPath, plan, { confirmed: true });
    render({ ...plan, result }, options.json);
    return;
  }

  render(plan, options.json);
}

async function renderHealth(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const config = await readDevflowConfig(repoPath);
  const summary = await readProjectHealth(repoPath, config);

  render(summary, options.json);
}

async function renderHarnessInspect(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const summary = await readHarnessInspect(repoPath, {
    targets: parseTargetList(options.targets),
  });

  render(summary, options.json);
}

async function renderHarnessPlan(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const summary = await readHarnessPlan(repoPath, {
    targets: parseTargetList(options.targets),
  });

  render(summary, options.json);
}

async function renderHarnessInstall(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const summary = await writeHarnessInstall(repoPath, {
    targets: parseTargetList(options.targets),
    confirmed: Boolean(options.confirm),
  });

  render(summary, options.json);
}

async function renderHarnessHealth(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const summary = await readHarnessHealth(repoPath, {
    targets: parseTargetList(options.targets),
  });

  if (options.json) {
    render(summary, true);
    return;
  }

  renderHarnessHealthText(summary);
}

async function renderHarnessRepair(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const summary = await writeHarnessRepair(repoPath, {
    targets: parseTargetList(options.targets),
    confirmed: Boolean(options.confirm),
  });

  render(summary, options.json);
}

async function renderStatus(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const config = await readDevflowConfig(repoPath);
  const summary = createStatusSummary({
    repo: readGitRepo(repoPath),
    changedFiles: readChangedFiles(repoPath),
    state,
    workItemId: options.work,
    agent: options.agent,
    gates: config.gates ?? [{ id: "docs-check", command: "npm run docs:check", recommended: true }],
    reviewRequired: Boolean(config.review?.required),
    warnings: config.warnings,
  });

  if (options.simple) {
    renderSimpleStatus(summary);
    return;
  }

  render(summary, options.json);
}

function renderExplain(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const explanation = createTermExplanation({
    term: positional.join(" "),
    context: options.context,
  });

  render(explanation, options.json);
}

async function renderSplit(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const config = await readDevflowConfig(repoPath);
  const plan = createSplitPlan({
    runId: options["run-id"],
    goal: options.goal,
    sessionCount: options.sessions ? Number.parseInt(options.sessions, 10) : undefined,
    profile: options.profile,
    platform: options.platform ?? defaultPlatformName(),
    baseBranch: options["base-branch"],
    baseRef: options["base-ref"],
    worktreeRoot: options["worktree-root"],
    config,
  });

  if (options.register) {
    plan.registration = await recordSplitWorkEvents(repoPath, plan, {
      start: Boolean(options.start),
    });
  }

  render(plan, options.json);
}

async function renderFinish(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const config = await readDevflowConfig(repoPath);
  const state = await readDevflowState(repoPath);
  const gates = collectRepeated(options.gate).map(parseGate);
  const gateEvidence = [...Object.values(state.gates.latestById), ...gates];
  const risks = collectRepeated(options.risk).map((message) => ({
    severity: "low",
    message,
  }));

  const summary = createFinishSummary({
    workItem: {
      id: options.work ?? "local-work",
      title: options.title ?? options.work ?? "Local work",
    },
    intent: options.intent ?? "Record local completion evidence.",
    changedFiles: readChangedFiles(repoPath),
    gates: gateEvidence,
    requiredGates: config.gates ?? [],
    reviewRequired: Boolean(config.review?.required),
    reviewEvidence: state.reviews.latestByWorkItemId[options.work ?? "local-work"] ?? null,
    skipped: collectRepeated(options.skipped).map((reason, index) => ({
      id: `skipped-${index + 1}`,
      reason,
    })),
    risks,
    nextTask: options["next-task"],
  });

  await recordFinishEvent(repoPath, summary);
  if (options.guided) {
    renderGuidedFinish(summary);
    return;
  }

  render(summary, options.json);
}

async function renderReviewRecord(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordReviewEvent(repoPath, {
    workItemId: options.work ?? options.id,
    reviewer: options.reviewer,
    status: options.status ?? "passed",
    summary: options.summary,
    source: options.source ?? "local",
  });

  render(
    {
      schemaVersion: "0.1",
      command: "review_record",
      review: event.payload,
      event,
    },
    options.json,
  );
}

async function renderReviewRequest(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const workItemId = options.work ?? options.id ?? "local-work";
  const recordedGates = Object.values(state.gates.latestById).filter(
    (gate) => !gate.workItemId || gate.workItemId === workItemId,
  );
  const gates = [...recordedGates, ...collectRepeated(options.gate).map(parseGate)];
  const request = createReviewRequest({
    workItem: {
      id: workItemId,
      title: options.title ?? workItemId,
    },
    intent: options.intent,
    target: options.target ?? "reviewer",
    persona: options.persona ?? "strict-reviewer",
    changedFiles: readChangedFiles(repoPath),
    gates,
    reviewRecordCommand: `devflow review record --work ${workItemId} --reviewer <reviewer> --status <passed|changes-requested> --summary <summary>`,
  });

  if (options.json) {
    render(request, true);
  } else {
    renderReviewRequestText(request);
  }
}

async function renderDoctor(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const memory = await readMistakeMemory(repoPath);
  const summary = createDoctorSummary({
    repo: {
      absolutePath: repoPath,
      root: ".",
    },
    platform: {
      name: options.platform ?? defaultPlatformName(),
    },
    tools: {
      git: detectTool("git"),
      rg: detectTool("rg"),
      gh: detectTool("gh"),
      node: detectTool("node"),
    },
    mistakes: memory.mistakes,
    warnings: memory.warnings,
  });

  render(summary, options.json);
}

async function renderGatesRun(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const id = positional[0];
  const config = await readDevflowConfig(repoPath);
  const summary = await runConfiguredGate(repoPath, {
    id,
    gates: config.gates,
    workItemId: options.work,
  });

  render(summary, options.json);
}

function renderNextPrompt(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const prompt = createNextPrompt({
    objective: options.objective,
    changedFiles: readChangedFiles(options.repo ?? cwd()).map((file) => file.path),
    commands: collectRepeated(options.command),
    risks: collectRepeated(options.risk),
    nextTask: options["next-task"] ?? "Inspect `devflow status` and continue the MVP loop.",
  });

  process.stdout.write(prompt);
}

function renderPromptRewrite(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const rewrite = createPromptRewrite({
    request: options.request,
    context: options.context,
  });

  render(rewrite, options.json);
}

async function renderCodexSessions(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const candidates = await findCodexSessionFiles({
    codexHome: options["codex-home"],
  });
  const records = [];
  const warnings = [...candidates.warnings];

  for (const file of candidates.files) {
    try {
      const content = await readFile(file.path, "utf8");
      const record = parseCodexSessionJsonl(content, {
        sourcePath: file.path,
      });
      records.push(record);
      warnings.push(...record.warnings);
    } catch (error) {
      warnings.push(`Failed to read Codex session candidate ${file.path}: ${error.message}`);
    }
  }

  const summary = {
    schemaVersion: "0.1",
    command: "sessions_codex",
    repo: {
      absolutePath: repoPath,
    },
    files: candidates.files,
    discovery: discoverCodexSessions({
      repoPath,
      records,
    }),
    warnings,
  };

  render(summary, options.json);
}

async function renderSessionAttachPlan(argsForCommand) {
  const options = parseOptions(argsForCommand);
  if (!options.input) {
    throw new Error("sessions attach-plan requires --input <json-file>.");
  }

  const raw = await readFile(options.input, "utf8");
  const input = JSON.parse(raw);
  const plan = createSessionAttachPlan(input);

  render(plan, options.json);
}

async function renderSessionAttach(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();

  if (!options.input) {
    throw new Error("sessions attach requires --input <json-file>.");
  }

  if (!options.session) {
    throw new Error("sessions attach requires --session <session-id>.");
  }

  if (!options.confirm) {
    throw new Error("sessions attach requires --confirm.");
  }

  const raw = await readFile(options.input, "utf8");
  const input = JSON.parse(raw);
  const proposal = (input.proposals ?? []).find(
    (candidate) => candidate.sessionId === options.session,
  );

  if (!proposal) {
    throw new Error(`No attach proposal found for session: ${options.session}`);
  }

  const event = await recordSessionAttachedEvent(repoPath, proposal, {
    confirmed: true,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "session_attach",
      event,
    },
    options.json,
  );
}

async function renderSessionList(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const limit = parseSessionListLimit(options.limit, "sessions list requires --limit <positive-integer>.");
  const since = parseSessionListSince(options.since, "sessions list requires --since <iso-date>.");
  const sort = parseSessionListSort(
    options.sort,
    "sessions list requires --sort observedAt:asc|observedAt:desc.",
  );
  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: {
      absolutePath: repoPath,
    },
    state,
    agent: options.agent,
    workItemId: options.work,
    since,
    sort,
    limit,
  });

  if (options.json) {
    render(summary, true);
    return;
  }

  renderSessionListText(summary);
}

async function renderSessionNote(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();

  if (!options.work) {
    throw new Error("sessions note requires --work <work-item-id>.");
  }

  if (!options.summary) {
    throw new Error("sessions note requires --summary <text>.");
  }

  const event = await recordManualSessionNoteEvent(repoPath, {
    workItemId: options.work,
    agent: options.agent ?? "manual",
    summary: options.summary,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "session_note",
      event,
    },
    options.json,
  );
}

async function renderWorkCreate(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkCreatedEvent(repoPath, {
    id: options.id,
    title: options.title,
    description: options.description,
    ownedPaths: collectRepeated(options["owned-path"]),
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_create",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkStart(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkStartedEvent(repoPath, {
    id: positional[0] ?? options.id,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_start",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkUpdate(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const ownedPaths = Object.hasOwn(options, "owned-path")
    ? collectRepeated(options["owned-path"])
    : undefined;
  const event = await recordWorkUpdatedEvent(repoPath, {
    id: positional[0] ?? options.id,
    title: options.title,
    description: options.description,
    ownedPaths,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_update",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkRename(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkRenamedEvent(repoPath, {
    id: positional[0] ?? options.id,
    title: options.title,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_rename",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkReady(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkReadyEvent(repoPath, {
    id: positional[0] ?? options.id,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_ready",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkBlock(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkBlockedEvent(repoPath, {
    id: positional[0] ?? options.id,
    reason: options.reason,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_block",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkUnblock(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkUnblockedEvent(repoPath, {
    id: positional[0] ?? options.id,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_unblock",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkList(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const summary = createWorkListSummary({
    repo: {
      absolutePath: repoPath,
    },
    state,
    status: options.status,
  });

  if (options.json) {
    render(summary, true);
    return;
  }

  renderWorkListText(summary);
}

function defaultPlatformName() {
  if (process.platform === "win32") {
    return "windows-powershell";
  }

  if (process.platform === "darwin") {
    return "macos";
  }

  return "linux";
}

function detectTool(command) {
  try {
    execFileSync(command, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { available: true, command };
  } catch {
    return { available: false, command };
  }
}

function render(summary, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${summary.command}: ${summary.schemaVersion}\n`);
}

function renderHarnessHealthText(summary) {
  const lines = [
    `harness_health: ${summary.status}`,
  ];

  if (summary.nextAction) {
    lines.push(
      `Next action: ${summary.nextAction.command}`,
      `Reason: ${summary.nextAction.reason}`,
    );
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderReviewRequestText(request) {
  const lines = [
    "Review request",
    `Work: ${request.workItemId}`,
    `Target: ${request.target}`,
    `Persona: ${request.persona}`,
    `Changed files: ${request.changedFiles.length}`,
    `Gate evidence: ${request.gates.length}`,
    `Record command: ${request.reviewRecordCommand}`,
    "",
    request.prompt.trimEnd(),
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderSimpleStatus(summary) {
  const changedCount = summary.git.changedFiles.length;
  const nextGate = summary.gates.find((gate) => gate.recommended) ?? summary.gates[0];
  const handoff = summary.handoffs.latest;
  const latestSession = summary.sessions.attached.at(-1);
  const lines = [
    "Project status",
    `Branch: ${summary.repo.branch ?? "unknown"}`,
    `Work filter: ${summary.filters.workItemId ?? "all"}`,
    `Agent filter: ${summary.filters.agent ?? "all"}`,
    `Changed files: ${changedCount}`,
    `Sessions: ${summary.sessions.attached.length}`,
    `Latest session: ${latestSession?.workItemId ?? "none"}`,
    `Latest session id: ${latestSession?.sessionId ?? "none"}`,
    `Latest session time: ${latestSession?.observedAt ?? "none"}`,
    `Latest session agent: ${latestSession?.agent ?? "none"}`,
    `Latest session kind: ${latestSession?.kind ?? "none"}`,
    `Latest session summary: ${latestSession?.summary ?? "none"}`,
    `Latest session files: ${latestSession ? (latestSession.changedFiles?.length ?? 0) : "none"}`,
    `Latest handoff: ${handoff ? handoff.workItemId : "none"}`,
    `Next check: ${nextGate ? nextGate.command : "none"}`,
    `Next step: ${summary.recommendations[0]?.message ?? "Pick the next crisp work item."}`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderGuidedFinish(summary) {
  const lines = [
    "Finish checklist",
    `Work: ${summary.workItem.id}`,
    `Title: ${summary.workItem.title}`,
    `Changed files: ${summary.summary.changedFiles.length}`,
    `Verified gates: ${summary.evidence.gates.length}`,
    `Skipped checks: ${summary.evidence.skipped.length}`,
    `Known risks: ${summary.risks.length}`,
    `Can claim done: ${summary.canClaimDone ? "yes" : "no"}`,
    `Done blockers: ${summary.doneBlockers.length}`,
    `Review recommendation: ${summary.review.recommendation}`,
    `Review next: ${summary.review.nextAction?.command ?? "none"}`,
    `Review record: ${summary.review.nextAction?.recordCommand ?? "none"}`,
    `Next task: ${extractNextTask(summary.nextSession.prompt)}`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderSessionListText(summary) {
  const lines = [
    "Sessions",
    `Filter: ${summary.filters.workItemId ?? "all"}`,
    `Count: ${summary.count}`,
  ];
  if (summary.filters.agent) {
    lines.push(`Agent: ${summary.filters.agent}`);
  }
  if (summary.filters.since) {
    lines.push(`Since: ${summary.filters.since}`);
  }
  if (summary.filters.sort) {
    lines.push(`Sort: ${summary.filters.sort}`);
  }
  if (summary.filters.limit) {
    lines.push(`Limit: ${summary.filters.limit}`);
    lines.push(`Total: ${summary.totalCount}`);
  }
  if (summary.warnings.length > 0) {
    lines.push(`Warnings: ${summary.warnings.length}`);
  }

  for (const session of summary.sessions) {
    const changedFileCount = session.changedFiles?.length;
    const detail = session.summary ?? `${session.sessionId} files:${changedFileCount ?? 0}`;
    lines.push(
      `${session.kind ?? "session"} ${session.workItemId ?? "unknown"} ${session.agent ?? "unknown"} ${session.observedAt ?? "unknown-time"} ${detail}`,
    );
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderWorkListText(summary) {
  const lines = ["Work items", `Filter: ${summary.filters.status ?? "all"}`, `Count: ${summary.count}`];
  if (summary.warnings.length > 0) {
    lines.push(`Warnings: ${summary.warnings.length}`);
  }

  for (const item of summary.items) {
    lines.push(`${item.status} ${item.id} ${item.title}`);
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function extractNextTask(prompt) {
  const match = prompt.match(/^Next task:\s*(.+)$/m);
  return match?.[1] ?? "Inspect devflow status and choose the next slice.";
}

function parseOptions(rawArgs) {
  return parseOptionsAndPositionals(rawArgs).options;
}

function parseOptionsAndPositionals(rawArgs) {
  const options = {};
  const positional = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    if (
      key === "json" ||
      key === "simple" ||
      key === "guided" ||
      key === "confirm" ||
      key === "register" ||
      key === "start" ||
      key === "once"
    ) {
      options[key] = true;
      continue;
    }

    const value = rawArgs[index + 1];
    index += 1;

    if (options[key] === undefined) {
      options[key] = value;
    } else if (Array.isArray(options[key])) {
      options[key].push(value);
    } else {
      options[key] = [options[key], value];
    }
  }

  return { options, positional };
}

function collectRepeated(value) {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parseTargetList(value) {
  if (value === undefined) {
    return undefined;
  }

  return collectRepeated(value)
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseGate(value) {
  const firstSeparator = value.indexOf(":");
  const lastSeparator = value.lastIndexOf(":");

  if (firstSeparator <= 0 || lastSeparator <= firstSeparator) {
    throw new Error(`Invalid gate format: ${value}`);
  }

  return {
    id: value.slice(0, firstSeparator),
    command: value.slice(firstSeparator + 1, lastSeparator),
    status: value.slice(lastSeparator + 1),
  };
}

function readGitRepo(repoPath) {
  return {
    absolutePath: repoPath,
    root: ".",
    branch: runGit(repoPath, ["branch", "--show-current"]) || null,
    head: runGit(repoPath, ["rev-parse", "--short", "HEAD"]) || null,
  };
}

function readChangedFiles(repoPath) {
  return parseGitStatusLines(runGit(repoPath, ["status", "--short", "-uall"], { trim: false }));
}

function runGit(repoPath, gitArgs, options = {}) {
  try {
    const output = execFileSync("git", gitArgs, {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return options.trim === false ? output : output.trim();
  } catch {
    return "";
  }
}
