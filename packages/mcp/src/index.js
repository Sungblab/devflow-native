import { readFile } from "node:fs/promises";

import {
  discoverCodexSessions,
  findCodexSessionFiles,
  parseCodexSessionJsonl,
} from "../../adapters/src/index.js";
import {
  createDoctorSummary,
  createFinishSummary,
  createNextPrompt,
  createPromptRewrite,
  createSessionAttachPlan,
  createSessionListSummary,
  createSplitPlan,
  createStatusSummary,
  createTermExplanation,
  readDevflowConfig,
  readDevflowState,
  readMistakeMemory,
  recordFinishEvent,
  recordGateEvent,
  recordManualSessionNoteEvent,
  recordSessionAttachedEvent,
} from "../../core/src/index.js";

const tools = [
  {
    name: "devflow.status",
    description: "Read local repo state, handoffs, gate evidence, and recommendations.",
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
    name: "devflow.sessions_attach_plan",
    description: "Plan session-to-work-item links without writing Devflow state.",
  },
  {
    name: "devflow.sessions_attach",
    description: "Write a confirmed session-to-work-item link into local Devflow state.",
  },
  {
    name: "devflow.sessions_list",
    description: "List attached sessions from local Devflow state, optionally filtered by agent/work item/time and limited to recent matches.",
  },
  {
    name: "devflow.sessions_note",
    description: "Record a manual session note into local Devflow state.",
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
    name: "devflow.next_prompt",
    description: "Generate a copy-paste next-session prompt.",
  },
];

export function listTools() {
  return tools;
}

export async function callTool(name, args = {}) {
  if (name === "devflow.status") {
    return callStatus(args);
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

  if (name === "devflow.doctor") {
    return callDoctor(args);
  }

  if (name === "devflow.finish") {
    return callFinish(args);
  }

  if (name === "devflow.record_gate") {
    return callRecordGate(args);
  }

  if (name === "devflow.next_prompt") {
    return callNextPrompt(args);
  }

  throw new Error(`Unknown devflow MCP tool: ${name}`);
}

async function callStatus(args) {
  const repoPath = args.repo ?? process.cwd();
  const state = await readDevflowState(repoPath);
  const summary = createStatusSummary({
    repo: {
      absolutePath: repoPath,
      root: ".",
      branch: args.branch ?? null,
      head: args.head ?? null,
    },
    changedFiles: args.changedFiles ?? [],
    state,
    gates: args.gates ?? [{ id: "docs-check", command: "npm run docs:check", recommended: true }],
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
  const limit = parsePositiveIntegerArg(
    args.limit,
    "devflow.sessions_list requires limit to be a positive integer.",
  );
  const since = parseIsoDateArg(
    args.since,
    "devflow.sessions_list requires since to be an ISO date.",
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
  const risks = (args.risks ?? []).map((risk) =>
    typeof risk === "string" ? { severity: "low", message: risk } : risk,
  );
  const summary = createFinishSummary({
    workItem: {
      id: args.work ?? "local-work",
      title: args.title ?? args.work ?? "Local work",
    },
    intent: args.intent ?? "Record local completion evidence.",
    changedFiles: args.changedFiles ?? [],
    gates: args.gates ?? [],
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

function toolResult(structuredContent, text) {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

function parsePositiveIntegerArg(value, message) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(message);
  }

  return parsed;
}

function parseIsoDateArg(value, message) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(message);
  }

  return value;
}
