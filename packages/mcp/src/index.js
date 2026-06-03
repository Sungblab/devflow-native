import { readFile } from "node:fs/promises";

import {
  discoverClaudeSessions,
  discoverCodexSessions,
  discoverClineSessions,
  findAgentSessionFiles,
  findCodexSessionFiles,
  discoverOpenCodeSessions,
  parseClineSessionJson,
  parseCodexSessionJsonl,
  parseClaudeSessionJsonl,
  parseOpenCodeSessionRecord,
} from "../../adapters/src/index.js";
import {
  createDoctorSummary,
  createFinishSummary,
  createNextPrompt,
  createPromptRewrite,
  createReviewRequest,
  createSessionAttachPlan,
  createSessionListSummary,
  createSplitPlan,
  createStatusSummary,
  createTermExplanation,
  createWorkListSummary,
  parseSessionListLimit,
  parseSessionListSince,
  parseSessionListSort,
  readHarnessHealth,
  readHarnessInspect,
  readHarnessPlan,
  readProjectHealth,
  readDevflowConfig,
  readDevflowState,
  readLatestHandoff,
  readMistakeMemory,
  recordFinishEvent,
  recordGateEvent,
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
  writeHarnessRepair,
} from "../../core/src/index.js";

const tools = [
  {
    name: "devflow.status",
    description: "Read local repo state, handoffs, gate evidence, and recommendations.",
  },
  {
    name: "devflow.health",
    description: "Inspect required scaffold files and configured verification gates.",
  },
  {
    name: "devflow.harness_inspect",
    description: "Inspect Codex, Claude Code, Superpowers, and optional CodeGraph-style harness readiness without writing files.",
  },
  {
    name: "devflow.harness_plan",
    description: "Plan native harness adoption or repair actions as a dry run without writing files.",
  },
  {
    name: "devflow.harness_health",
    description: "Validate installed native harness manifests, MCP config, hook scripts, and gates.",
  },
  {
    name: "devflow.harness_repair",
    description: "Repair confirmed native harness failures such as required review config or broken installed manifests.",
  },
  {
    name: "devflow.split",
    description: "Plan safe parallel sessions with worktree commands and prompts.",
  },
  {
    name: "devflow.explain_term",
    description: "Explain development terms in plain language with project context.",
  },
  {
    name: "devflow.rewrite_prompt",
    description: "Rewrite vague maintainer requests into agent-ready requirements.",
  },
  {
    name: "devflow.sessions_codex",
    description: "Read explicit Codex session metadata through the Devflow adapter contract.",
  },
  {
    name: "devflow.sessions_claude",
    description: "Normalize caller-provided Claude Code session metadata through the Devflow adapter contract.",
  },
  {
    name: "devflow.sessions_opencode",
    description: "Normalize caller-provided OpenCode session metadata through the Devflow adapter contract.",
  },
  {
    name: "devflow.sessions_cline",
    description: "Normalize caller-provided Cline session metadata through the Devflow adapter contract.",
  },
  {
    name: "devflow.sessions_attach_plan",
    description: "Plan session-to-work-item links without writing Devflow state.",
  },
  {
    name: "devflow.sessions_attach",
    description: "Write a confirmed session-to-work-item link into local Devflow state.",
  },
  {
    name: "devflow.sessions_list",
    description: "List attached sessions from local Devflow state, optionally filtered by agent/work item/time, sorted by observed time, and limited to recent matches.",
  },
  {
    name: "devflow.sessions_note",
    description: "Record a manual session note into local Devflow state.",
  },
  {
    name: "devflow.work_create",
    description: "Create a local Devflow work item.",
  },
  {
    name: "devflow.work_start",
    description: "Mark a local Devflow work item as active.",
  },
  {
    name: "devflow.work_update",
    description: "Update local Devflow work item metadata.",
  },
  {
    name: "devflow.work_rename",
    description: "Rename a local Devflow work item.",
  },
  {
    name: "devflow.work_ready",
    description: "Mark a local Devflow work item as ready to finish.",
  },
  {
    name: "devflow.work_block",
    description: "Mark a local Devflow work item as blocked.",
  },
  {
    name: "devflow.work_unblock",
    description: "Return a blocked local Devflow work item to active.",
  },
  {
    name: "devflow.work_list",
    description: "List local Devflow work items.",
  },
  {
    name: "devflow.review_record",
    description: "Record local code review evidence for a work item.",
  },
  {
    name: "devflow.review_request",
    description: "Create a copy-paste prompt for strict agent code review before finish.",
  },
  {
    name: "devflow.doctor",
    description: "Inspect local execution rules and repeated-mistake memory.",
  },
  {
    name: "devflow.finish",
    description: "Record completion evidence and generate a next-session prompt.",
  },
  {
    name: "devflow.record_gate",
    description: "Record standalone gate evidence without closing a work item.",
  },
  {
    name: "devflow.gates_run",
    description: "Run a configured verification gate and record command evidence.",
  },
  {
    name: "devflow.next_prompt",
    description: "Generate a copy-paste next-session prompt.",
  },
  {
    name: "devflow.handoff_latest",
    description: "Read the latest persisted next-session handoff prompt.",
  },
];

export function listTools() {
  return tools;
}

export async function callTool(name, args = {}) {
  if (name === "devflow.status") {
    return callStatus(args);
  }

  if (name === "devflow.health") {
    return callHealth(args);
  }

  if (name === "devflow.harness_inspect") {
    return callHarnessInspect(args);
  }

  if (name === "devflow.harness_plan") {
    return callHarnessPlan(args);
  }

  if (name === "devflow.harness_health") {
    return callHarnessHealth(args);
  }

  if (name === "devflow.harness_repair") {
    return callHarnessRepair(args);
  }

  if (name === "devflow.split") {
    return callSplit(args);
  }

  if (name === "devflow.explain_term") {
    return callExplainTerm(args);
  }

  if (name === "devflow.rewrite_prompt") {
    return callRewritePrompt(args);
  }

  if (name === "devflow.sessions_codex") {
    return callCodexSessions(args);
  }

  if (name === "devflow.sessions_claude") {
    return callAgentSessions("claude", args);
  }

  if (name === "devflow.sessions_opencode") {
    return callAgentSessions("opencode", args);
  }

  if (name === "devflow.sessions_cline") {
    return callAgentSessions("cline", args);
  }

  if (name === "devflow.sessions_attach_plan") {
    return callSessionAttachPlan(args);
  }

  if (name === "devflow.sessions_attach") {
    return callSessionAttach(args);
  }

  if (name === "devflow.sessions_list") {
    return callSessionList(args);
  }

  if (name === "devflow.sessions_note") {
    return callSessionNote(args);
  }

  if (name === "devflow.work_create") {
    return callWorkCreate(args);
  }

  if (name === "devflow.work_start") {
    return callWorkStart(args);
  }

  if (name === "devflow.work_update") {
    return callWorkUpdate(args);
  }

  if (name === "devflow.work_rename") {
    return callWorkRename(args);
  }

  if (name === "devflow.work_ready") {
    return callWorkReady(args);
  }

  if (name === "devflow.work_block") {
    return callWorkBlock(args);
  }

  if (name === "devflow.work_unblock") {
    return callWorkUnblock(args);
  }

  if (name === "devflow.work_list") {
    return callWorkList(args);
  }

  if (name === "devflow.review_record") {
    return callReviewRecord(args);
  }

  if (name === "devflow.review_request") {
    return callReviewRequest(args);
  }

  if (name === "devflow.doctor") {
    return callDoctor(args);
  }

  if (name === "devflow.finish") {
    return callFinish(args);
  }

  if (name === "devflow.record_gate") {
    return callRecordGate(args);
  }

  if (name === "devflow.gates_run") {
    return callGatesRun(args);
  }

  if (name === "devflow.next_prompt") {
    return callNextPrompt(args);
  }

  if (name === "devflow.handoff_latest") {
    return callLatestHandoff(args);
  }

  throw new Error(`Unknown devflow MCP tool: ${name}`);
}

async function callStatus(args) {
  const repoPath = args.repo ?? process.cwd();
  const state = await readDevflowState(repoPath);
  const config = await readDevflowConfig(repoPath);
  const summary = createStatusSummary({
    repo: {
      absolutePath: repoPath,
      root: ".",
      branch: args.branch ?? null,
      head: args.head ?? null,
    },
    changedFiles: args.changedFiles ?? [],
    state,
    workItemId: args.work ?? args.workItemId,
    agent: args.agent,
    gates: args.gates ?? config.gates ?? [{ id: "docs-check", command: "npm run docs:check", recommended: true }],
    reviewRequired: Boolean(config.review?.required),
    warnings: config.warnings,
    profile: {
      name: args.profile ?? "standard",
      source: "mcp",
    },
    platform: {
      name: args.platform ?? "windows-powershell",
      shell: args.shell ?? "pwsh",
      pathStyle: args.pathStyle ?? "windows",
    },
  });

  return toolResult(summary, `devflow status: ${summary.repo.absolutePath}`);
}

async function callHealth(args) {
  const repoPath = args.repo ?? process.cwd();
  const config = await readDevflowConfig(repoPath);
  const summary = await readProjectHealth(repoPath, config);

  return toolResult(summary, `devflow health: ${summary.status}`);
}

async function callHarnessInspect(args) {
  const repoPath = args.repo ?? process.cwd();
  const summary = await readHarnessInspect(repoPath, {
    targets: parseHarnessTargets(args.targets),
  });

  return toolResult(summary, `devflow harness_inspect: ${summary.status}`);
}

async function callHarnessPlan(args) {
  const repoPath = args.repo ?? process.cwd();
  const summary = await readHarnessPlan(repoPath, {
    targets: parseHarnessTargets(args.targets),
  });

  return toolResult(summary, `devflow harness_plan: ${summary.status}`);
}

async function callHarnessHealth(args) {
  const repoPath = args.repo ?? process.cwd();
  const summary = await readHarnessHealth(repoPath, {
    targets: parseHarnessTargets(args.targets),
  });

  const text = summary.nextAction
    ? `devflow harness_health: ${summary.status}\nNext action: ${summary.nextAction.command}\nReason: ${summary.nextAction.reason}`
    : `devflow harness_health: ${summary.status}`;

  return toolResult(summary, text);
}

async function callHarnessRepair(args) {
  const repoPath = args.repo ?? process.cwd();
  const summary = await writeHarnessRepair(repoPath, {
    targets: parseHarnessTargets(args.targets),
    confirmed: Boolean(args.confirm),
  });

  const text = `devflow harness_repair: ${summary.status}`;
  return toolResult(summary, text);
}

async function callSplit(args) {
  const repoPath = args.repo ?? process.cwd();
  const config = await readDevflowConfig(repoPath);
  const plan = createSplitPlan({
    runId: args.runId,
    goal: args.goal,
    sessionCount: args.sessionCount ?? args.sessions,
    profile: args.profile,
    platform: args.platform,
    baseBranch: args.baseBranch,
    baseRef: args.baseRef,
    worktreeRoot: args.worktreeRoot,
    tasks: args.tasks,
    config,
  });

  if (args.register) {
    plan.registration = await recordSplitWorkEvents(repoPath, plan, {
      start: Boolean(args.start),
    });
  }

  return toolResult(plan, `devflow split: ${plan.sessions.length} sessions`);
}

function callExplainTerm(args) {
  const explanation = createTermExplanation({
    term: args.term,
    context: args.context,
  });

  return toolResult(explanation, `devflow explain_term: ${explanation.term}`);
}

function callRewritePrompt(args) {
  const rewrite = createPromptRewrite({
    request: args.request,
    context: args.context,
  });

  return toolResult(rewrite, "devflow rewrite_prompt");
}

async function callCodexSessions(args) {
  const repoPath = args.repo ?? process.cwd();
  const candidates = await findCodexSessionFiles({
    codexHome: args.codexHome ?? args["codex-home"],
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

  return toolResult(summary, `devflow sessions_codex: ${summary.files.length} files`);
}

async function callAgentSessions(adapter, args) {
  const repoPath = args.repo ?? process.cwd();
  const { records, files, warnings } = await readAgentRecords(adapter, args);
  const discovery = discoverRecords(adapter, {
    repoPath,
    records,
  });
  const command = `sessions_${adapter}`;
  const summary = {
    schemaVersion: "0.1",
    command,
    repo: {
      absolutePath: repoPath,
    },
    files,
    discovery,
    warnings,
  };

  return toolResult(summary, `devflow ${command}: ${summary.discovery.sessions.length} sessions`);
}

async function readAgentRecords(adapter, args) {
  const records = (args.records ?? []).map((record) => parseAgentRecord(adapter, record));
  const files = [];
  const warnings = [];

  if (args.historyPath) {
    const candidates = await findAgentSessionFiles(adapter, {
      historyPath: args.historyPath,
    });
    files.push(...candidates.files);
    warnings.push(...candidates.warnings);

    for (const file of candidates.files) {
      try {
        const content = await readFile(file.path, "utf8");
        records.push(...parseAgentSessionFile(adapter, file, content));
      } catch (error) {
        warnings.push(`Failed to read ${adapter} session candidate ${file.path}: ${error.message}`);
      }
    }
  }

  return { records, files, warnings };
}

function parseAgentSessionFile(adapter, file, content) {
  if (adapter === "claude" && file.kind === "session-jsonl") {
    return [
      parseClaudeSessionJsonl(content, {
        sourcePath: file.path,
      }),
    ];
  }

  if (file.kind === "session-jsonl") {
    return String(content ?? "")
      .split(/\r?\n/u)
      .filter((line) => line.trim().length > 0)
      .map((line) => parseAgentRecord(adapter, JSON.parse(line), { sourcePath: file.path }));
  }

  const parsed = JSON.parse(content);
  const rawRecords = Array.isArray(parsed) ? parsed : parsed.records ?? [parsed];
  return rawRecords.map((record) => parseAgentRecord(adapter, record, { sourcePath: file.path }));
}

function parseAgentRecord(adapter, record, input = {}) {
  if (adapter === "opencode") {
    return parseOpenCodeSessionRecord(record, input);
  }

  if (adapter === "cline") {
    return parseClineSessionJson(record, input);
  }

  return {
    ...record,
    sourcePath: input.sourcePath ?? record.sourcePath,
  };
}

function discoverRecords(adapter, input) {
  if (adapter === "claude") {
    return discoverClaudeSessions(input);
  }

  if (adapter === "opencode") {
    return discoverOpenCodeSessions(input);
  }

  if (adapter === "cline") {
    return discoverClineSessions(input);
  }

  throw new Error(`Unsupported session adapter: ${adapter}`);
}

function callSessionAttachPlan(args) {
  const plan = createSessionAttachPlan({
    workItems: args.workItems ?? [],
    sessions: args.sessions ?? [],
    warnings: args.warnings ?? [],
  });

  return toolResult(plan, `devflow sessions_attach_plan: ${plan.proposals.length} proposals`);
}

async function callSessionAttach(args) {
  const repoPath = args.repo ?? process.cwd();
  const proposal = args.proposal;

  if (!args.confirm) {
    throw new Error("devflow.sessions_attach requires confirm: true.");
  }

  const event = await recordSessionAttachedEvent(repoPath, proposal, {
    confirmed: true,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "session_attach",
      event,
    },
    `devflow sessions_attach: ${event.payload.sessionId}`,
  );
}

async function callSessionList(args) {
  const repoPath = args.repo ?? process.cwd();
  const limit = parseSessionListLimit(
    args.limit,
    "devflow.sessions_list requires limit to be a positive integer.",
  );
  const since = parseSessionListSince(
    args.since,
    "devflow.sessions_list requires since to be an ISO date.",
  );
  const sort = parseSessionListSort(
    args.sort,
    "devflow.sessions_list requires sort to be observedAt:asc or observedAt:desc.",
  );
  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: {
      absolutePath: repoPath,
    },
    state,
    agent: args.agent,
    workItemId: args.workItemId ?? args.work,
    since,
    sort,
    limit,
  });

  return toolResult(summary, `devflow sessions_list: ${summary.count} sessions`);
}

async function callSessionNote(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordManualSessionNoteEvent(repoPath, {
    workItemId: args.workItemId ?? args.work,
    agent: args.agent ?? "manual",
    summary: args.summary,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "session_note",
      event,
    },
    `devflow sessions_note: ${event.payload.sessionId}`,
  );
}

async function callWorkCreate(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordWorkCreatedEvent(repoPath, {
    id: args.id,
    title: args.title,
    description: args.description,
    ownedPaths: args.ownedPaths ?? [],
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "work_create",
      workItem: event.payload,
      event,
    },
    `devflow work_create: ${event.payload.id}`,
  );
}

async function callWorkStart(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordWorkStartedEvent(repoPath, {
    id: args.id,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "work_start",
      workItem: event.payload,
      event,
    },
    `devflow work_start: ${event.payload.id}`,
  );
}

async function callWorkUpdate(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordWorkUpdatedEvent(repoPath, {
    id: args.id,
    title: args.title,
    description: args.description,
    ownedPaths: args.ownedPaths,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "work_update",
      workItem: event.payload,
      event,
    },
    `devflow work_update: ${event.payload.id}`,
  );
}

async function callWorkRename(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordWorkRenamedEvent(repoPath, {
    id: args.id,
    title: args.title,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "work_rename",
      workItem: event.payload,
      event,
    },
    `devflow work_rename: ${event.payload.id}`,
  );
}

async function callWorkReady(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordWorkReadyEvent(repoPath, {
    id: args.id,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "work_ready",
      workItem: event.payload,
      event,
    },
    `devflow work_ready: ${event.payload.id}`,
  );
}

async function callWorkBlock(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordWorkBlockedEvent(repoPath, {
    id: args.id,
    reason: args.reason,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "work_block",
      workItem: event.payload,
      event,
    },
    `devflow work_block: ${event.payload.id}`,
  );
}

async function callWorkUnblock(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordWorkUnblockedEvent(repoPath, {
    id: args.id,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "work_unblock",
      workItem: event.payload,
      event,
    },
    `devflow work_unblock: ${event.payload.id}`,
  );
}

async function callWorkList(args) {
  const repoPath = args.repo ?? process.cwd();
  const state = await readDevflowState(repoPath);
  const summary = createWorkListSummary({
    repo: {
      absolutePath: repoPath,
    },
    state,
    status: args.status,
  });

  return toolResult(summary, `devflow work_list: ${summary.count} items`);
}

async function callReviewRecord(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordReviewEvent(repoPath, {
    workItemId: args.workItemId ?? args.work,
    reviewer: args.reviewer,
    status: args.status ?? "passed",
    summary: args.summary,
    source: args.source ?? "mcp",
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "review_record",
      review: event.payload,
      event,
    },
    `devflow review_record: ${event.payload.workItemId}`,
  );
}

async function callReviewRequest(args) {
  const repoPath = args.repo ?? process.cwd();
  const state = await readDevflowState(repoPath);
  const workItemId = args.workItemId ?? args.work ?? "local-work";
  const recordedGates = Object.values(state.gates.latestById).filter(
    (gate) => !gate.workItemId || gate.workItemId === workItemId,
  );
  const request = createReviewRequest({
    workItem: {
      id: workItemId,
      title: args.title ?? workItemId,
    },
    intent: args.intent,
    target: args.target ?? "reviewer",
    persona: args.persona ?? "strict-reviewer",
    changedFiles: args.changedFiles ?? [],
    gates: [...recordedGates, ...(args.gates ?? [])],
    reviewRecordCommand: `devflow review record --work ${workItemId} --reviewer <reviewer> --status <passed|changes-requested> --summary <summary>`,
  });

  return toolResult(
    request,
    [
      `devflow review_request: ${request.workItemId}`,
      `Record command: ${request.reviewRecordCommand}`,
    ].join("\n"),
  );
}

async function callDoctor(args) {
  const repoPath = args.repo ?? process.cwd();
  const memory = await readMistakeMemory(repoPath);
  const summary = createDoctorSummary({
    repo: {
      absolutePath: repoPath,
      root: ".",
    },
    platform: {
      name: args.platform ?? "windows-powershell",
    },
    mistakes: memory.mistakes,
    warnings: memory.warnings,
  });

  return toolResult(summary, `devflow doctor: ${summary.platform.name}`);
}

async function callFinish(args) {
  const repoPath = args.repo ?? process.cwd();
  const config = await readDevflowConfig(repoPath);
  const state = await readDevflowState(repoPath);
  const workItemId = args.work ?? "local-work";
  const risks = (args.risks ?? []).map((risk) =>
    typeof risk === "string" ? { severity: "low", message: risk } : risk,
  );
  const recordedGates = Object.values(state.gates.latestByWorkItemId?.[workItemId] ?? {});
  const gateEvidence = [...recordedGates, ...(args.gates ?? [])];
  const summary = createFinishSummary({
    workItem: {
      id: workItemId,
      title: args.title ?? args.work ?? "Local work",
    },
    intent: args.intent ?? "Record local completion evidence.",
    changedFiles: args.changedFiles ?? [],
    gates: gateEvidence,
    requiredGates: args.requiredGates ?? config.gates ?? [],
    reviewRequired: Boolean(config.review?.required),
    reviewEvidence: state.reviews.latestByWorkItemId[workItemId] ?? null,
    skipped: args.skipped ?? [],
    risks,
    nextTask: args.nextTask,
    nextSession: {
      recommendedAgent: args.recommendedAgent,
      profile: args.profile,
      platform: args.platform,
    },
  });

  await recordFinishEvent(repoPath, summary);

  return toolResult(summary, `devflow finish: ${summary.workItem.id}`);
}

async function callRecordGate(args) {
  const repoPath = args.repo ?? process.cwd();
  const event = await recordGateEvent(repoPath, {
    id: args.id,
    command: args.command,
    status: args.status,
    summary: args.summary,
    workItemId: args.workItemId ?? args.work,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "record_gate",
      gate: event.payload,
      event,
    },
    `devflow record_gate: ${event.payload.id}`,
  );
}

async function callGatesRun(args) {
  const repoPath = args.repo ?? process.cwd();
  const config = await readDevflowConfig(repoPath);
  const summary = await runConfiguredGate(repoPath, {
    id: args.id,
    gates: args.gates ?? config.gates,
    workItemId: args.workItemId ?? args.work,
  });

  return toolResult(summary, `devflow gates_run: ${summary.gate.id} ${summary.status}`);
}

function callNextPrompt(args) {
  const prompt = createNextPrompt({
    objective: args.objective,
    changedFiles: args.changedFiles ?? [],
    commands: args.commands ?? [],
    risks: args.risks ?? [],
    nextTask: args.nextTask,
  });

  return toolResult(
    {
      schemaVersion: "0.1",
      command: "next_prompt",
      prompt,
    },
    "devflow next_prompt",
  );
}

async function callLatestHandoff(args) {
  const repoPath = args.repo ?? process.cwd();
  const latest = await readLatestHandoff(repoPath);
  const text = latest.handoff
    ? `devflow handoff_latest: ${latest.handoff.workItemId}`
    : "devflow handoff_latest: none";

  return toolResult(latest, text);
}

function toolResult(structuredContent, text) {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

function parseHarnessTargets(targets) {
  if (targets === undefined) {
    return undefined;
  }

  const values = Array.isArray(targets) ? targets : [targets];
  return values
    .flatMap((target) => String(target).split(","))
    .map((target) => target.trim())
    .filter(Boolean);
}
