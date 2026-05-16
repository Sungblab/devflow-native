import {
  createDoctorSummary,
  createFinishSummary,
  createNextPrompt,
  createStatusSummary,
  readDevflowState,
  readMistakeMemory,
  recordFinishEvent,
} from "../../core/src/index.js";

const tools = [
  {
    name: "devflow.status",
    description: "Read local repo state, handoffs, gate evidence, and recommendations.",
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

  if (name === "devflow.doctor") {
    return callDoctor(args);
  }

  if (name === "devflow.finish") {
    return callFinish(args);
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
