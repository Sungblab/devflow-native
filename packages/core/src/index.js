import { mkdir, readFile, appendFile } from "node:fs/promises";
import { join } from "node:path";

export function createStatusSummary(input = {}) {
  const changedFiles = input.changedFiles ?? [];
  const state = input.state ?? emptyDevflowState();
  const gates = mergeGateEvidence(input.gates ?? [], state.gates.latestById);
  const repo = input.repo ?? {};

  return {
    schemaVersion: "0.1",
    command: "status",
    repo: {
      absolutePath: repo.absolutePath ?? process.cwd(),
      root: repo.root ?? ".",
      branch: repo.branch ?? null,
      head: repo.head ?? null,
      dirty: changedFiles.length > 0,
    },
    profile: {
      name: input.profile?.name ?? "standard",
      source: input.profile?.source ?? "cli",
      requiredRuntime: false,
    },
    platform: input.platform ?? {
      name: "powershell",
      shell: "pwsh",
      pathStyle: "windows",
    },
    git: {
      changedFiles,
      worktrees: input.worktrees ?? [],
    },
    work: {
      active: input.work?.active ?? [],
      blocked: input.work?.blocked ?? [],
      readyToFinish: input.work?.readyToFinish ?? [],
    },
    sessions: {
      discovered: input.sessions?.discovered ?? [],
      attached: input.sessions?.attached ?? [],
    },
    gates,
    handoffs: {
      latest: input.handoffs?.latest ?? state.handoffs.latest,
      stale: input.handoffs?.stale ?? state.handoffs.stale,
    },
    recommendations: createStatusRecommendations(gates, changedFiles),
    warnings: [...(input.warnings ?? []), ...state.warnings],
  };
}

export function createFinishSummary(input) {
  const nextTask = input.nextTask ?? "Continue from the recorded handoff.";
  const nextPrompt =
    input.nextPrompt ??
    createNextPrompt({
      objective: input.intent,
      changedFiles: input.changedFiles?.map((file) => file.path) ?? [],
      commands: input.gates?.map((gate) => gate.command) ?? [],
      risks: input.risks?.map((risk) => risk.message) ?? [],
      nextTask,
    });

  return {
    schemaVersion: "0.1",
    command: "finish",
    workItem: {
      id: input.workItem.id,
      title: input.workItem.title,
      status: "completed",
    },
    summary: {
      intent: input.intent,
      changedFiles: input.changedFiles ?? [],
    },
    evidence: {
      gates: input.gates ?? [],
      skipped: input.skipped ?? [],
    },
    review: {
      recommendation: input.review?.recommendation ?? "local-record",
      reason: input.review?.reason ?? "MVP local evidence capture only.",
      prUrl: input.review?.prUrl ?? null,
    },
    risks: input.risks ?? [],
    nextSession: {
      recommendedAgent: input.nextSession?.recommendedAgent ?? "Codex",
      profile: input.nextSession?.profile ?? "standard",
      platform: input.nextSession?.platform ?? "powershell",
      prompt: nextPrompt,
    },
  };
}

export function createDoctorSummary(input = {}) {
  const platform = normalizePlatform(input.platform);
  const mistakes = input.mistakes ?? [];

  return {
    schemaVersion: "0.1",
    command: "doctor",
    repo: {
      absolutePath: input.repo?.absolutePath ?? process.cwd(),
      root: input.repo?.root ?? ".",
    },
    platform,
    tools: input.tools ?? {},
    executionContract: createExecutionContract(platform),
    memory: {
      source: input.memorySource ?? ".devflow/mistakes.json",
      repeatedMistakes: mistakes,
    },
    recommendations: createDoctorRecommendations(platform, mistakes),
    warnings: input.warnings ?? [],
  };
}

export function createNextPrompt(input) {
  const lines = [
    input.objective ?? "Continue Solo Devflow OS from the latest handoff.",
    "",
    "Changed files:",
    ...formatList(input.changedFiles ?? []),
    "",
    "Evidence commands:",
    ...formatList(input.commands ?? []),
    "",
    "Risks:",
    ...formatList(input.risks ?? []),
    "",
    `Next task: ${input.nextTask ?? "Inspect devflow status and choose the next slice."}`,
  ];

  return `${lines.join("\n")}\n`;
}

export function parseGitStatusLines(output) {
  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2).trim() || "modified",
      path: line.slice(3).replaceAll("\\", "/"),
    }));
}

export async function readMistakeMemory(repoPath) {
  let raw;
  try {
    raw = await readFile(join(repoPath, ".devflow", "mistakes.json"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return { mistakes: [], warnings: [] };
    }

    throw error;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      warnings: [],
    };
  } catch {
    return {
      mistakes: [],
      warnings: ["Ignoring invalid .devflow/mistakes.json."],
    };
  }
}

export async function recordFinishEvent(repoPath, finishSummary, options = {}) {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const event = {
    schemaVersion: "0.1",
    type: "work.completed",
    observedAt,
    payload: finishSummary,
  };

  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await appendFile(join(stateDir, "events.jsonl"), `${JSON.stringify(event)}\n`, "utf8");

  return event;
}

export async function readDevflowState(repoPath) {
  let raw;
  try {
    raw = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return emptyDevflowState();
    }

    throw error;
  }

  const events = [];
  const warnings = [];

  for (const [index, line] of raw.split("\n").entries()) {
    if (!line.trim()) {
      continue;
    }

    try {
      events.push(JSON.parse(line));
    } catch {
      warnings.push(`Ignoring invalid devflow event log line ${index + 1}.`);
    }
  }

  return deriveStateFromEvents(events, warnings);
}

function normalizePlatform(platform = {}) {
  const name = platform.name ?? "windows-powershell";

  if (name === "windows-powershell") {
    return {
      name,
      shell: platform.shell ?? "pwsh",
      pathStyle: platform.pathStyle ?? "windows",
    };
  }

  if (name === "wsl-linux" || name === "linux") {
    return {
      name,
      shell: platform.shell ?? "sh",
      pathStyle: platform.pathStyle ?? "posix",
    };
  }

  if (name === "macos") {
    return {
      name,
      shell: platform.shell ?? "zsh",
      pathStyle: platform.pathStyle ?? "posix",
    };
  }

  return {
    name,
    shell: platform.shell ?? "unknown",
    pathStyle: platform.pathStyle ?? "unknown",
  };
}

function createExecutionContract(platform) {
  if (platform.name === "windows-powershell") {
    return {
      preferredReadCommand: "Get-Content -LiteralPath",
      preferredSearchCommand: "rg",
      pathQuoting: "single-quote literal Windows paths",
      avoid: ["bash-specific syntax", "tmux assumptions", "unquoted paths with spaces"],
    };
  }

  return {
    preferredReadCommand: "cat",
    preferredSearchCommand: "rg",
    pathQuoting: "quote paths with spaces",
    avoid: ["host-specific credentials", "silent destructive commands"],
  };
}

function createDoctorRecommendations(platform, mistakes) {
  const recommendations = [];

  if (platform.name === "windows-powershell") {
    recommendations.push({
      kind: "platform",
      message: "Use Get-Content -LiteralPath for file reads and keep commands PowerShell-compatible.",
    });
  }

  for (const mistake of mistakes) {
    recommendations.push({
      kind: "mistake-memory",
      message: mistake.correction,
      source: mistake.id,
    });
  }

  return recommendations;
}

function deriveStateFromEvents(events, warnings = []) {
  const completedWork = events.filter(
    (event) => event.type === "work.completed" && event.payload?.command === "finish",
  );
  const latestCompletion = completedWork.at(-1);
  const olderCompletions = completedWork.slice(0, -1);

  return {
    events,
    warnings,
    handoffs: {
      latest: latestCompletion ? createHandoffEvidence(latestCompletion) : null,
      stale: olderCompletions.map(createHandoffEvidence).reverse(),
    },
    gates: {
      latestById: createLatestGateEvidence(completedWork),
    },
  };
}

function createHandoffEvidence(event) {
  return {
    workItemId: event.payload.workItem.id,
    title: event.payload.workItem.title,
    observedAt: event.observedAt,
    prompt: event.payload.nextSession.prompt,
  };
}

function createLatestGateEvidence(events) {
  const latestById = {};

  for (const event of events) {
    for (const gate of event.payload.evidence.gates ?? []) {
      latestById[gate.id] = {
        id: gate.id,
        command: gate.command,
        status: gate.status,
        observedAt: gate.observedAt ?? event.observedAt,
        summary: gate.summary ?? null,
        workItemId: event.payload.workItem.id,
      };
    }
  }

  return latestById;
}

function mergeGateEvidence(configuredGates, latestById) {
  const merged = [];
  const seen = new Set();

  for (const gateEvidence of Object.values(latestById)) {
    merged.push({
      id: gateEvidence.id,
      command: gateEvidence.command,
      recommended: false,
      lastRun: gateEvidence,
    });
    seen.add(gateEvidence.id);
  }

  for (const gate of configuredGates) {
    if (seen.has(gate.id)) {
      const existing = merged.find((candidate) => candidate.id === gate.id);
      Object.assign(existing, gate, { lastRun: existing.lastRun });
      continue;
    }

    merged.push(gate);
  }

  return merged;
}

function emptyDevflowState() {
  return {
    events: [],
    warnings: [],
    handoffs: {
      latest: null,
      stale: [],
    },
    gates: {
      latestById: {},
    },
  };
}

function createStatusRecommendations(gates, changedFiles) {
  const gateRecommendations = gates
    .filter((gate) => gate.recommended)
    .map((gate) => ({
      kind: "gate",
      message: `Run ${gate.command} before finishing.`,
    }));

  if (gateRecommendations.length > 0) {
    return gateRecommendations;
  }

  if (changedFiles.length > 0) {
    return [
      {
        kind: "finish",
        message: "Record changed files, verification, risks, and the next-session prompt.",
      },
    ];
  }

  return [
    {
      kind: "status",
      message: "No changed files detected. Pick the next crisp work item.",
    },
  ];
}

function formatList(items) {
  if (items.length === 0) {
    return ["- None recorded."];
  }

  return items.map((item) => `- ${item}`);
}
