import { mkdir, readFile, appendFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export function createStatusSummary(input = {}) {
  const changedFiles = input.changedFiles ?? [];
  const state = input.state ?? emptyDevflowState();
  const gates = mergeGateEvidence(input.gates ?? [], state.gates.latestById);
  const repo = input.repo ?? {};
  const workItemId = input.workItemId ?? input.filters?.workItemId ?? null;
  const agent = input.agent ?? input.filters?.agent ?? null;
  const attachedSessions = filterStatusSessions(
    input.sessions?.attached ?? state.sessions?.attached ?? [],
    { workItemId, agent },
  );

  return {
    schemaVersion: "0.1",
    command: "status",
    filters: {
      workItemId,
      agent,
    },
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
      discovered: input.sessions?.discovered ?? state.sessions?.discovered ?? [],
      attached: attachedSessions,
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

export function createPromptRewrite(input = {}) {
  const request = input.request ?? "";
  const context = input.context ?? "No project context provided.";
  const inferredIntent = inferPromptIntent(request, context);
  const requirements = [
    "Infer the broader user intent from repository context instead of taking examples as exhaustive.",
    "Identify missing requirements and make conservative assumptions when safe.",
    "Inspect relevant docs, code, git state, and verification gates before implementing.",
    "Update docs when product behavior, workflow policy, plugin behavior, or repeated agent rules change.",
    "Run verification and report known gaps before claiming completion.",
  ];
  const missingDetails = [
    "target repository or feature area",
    "required verification commands",
    "acceptable scope boundaries",
  ];
  const agentReadyPrompt = [
    `Objective: ${inferredIntent}`,
    "",
    `Original request: ${request || "No raw request provided."}`,
    `Project context: ${context}`,
    "",
    "Requirements:",
    ...formatList(requirements),
    "",
    "Missing details to resolve from local context:",
    ...formatList(missingDetails),
    "",
    "Deliverable: implement the next safe slice, verify it, update docs if needed, and provide a concise handoff.",
  ].join("\n");

  return {
    schemaVersion: "0.1",
    command: "prompt_rewrite",
    originalRequest: request,
    inferredIntent,
    context,
    requirements,
    missingDetails,
    agentReadyPrompt: `${agentReadyPrompt}\n`,
  };
}

export function createInitPlan(input = {}) {
  const repoPath = input.repo ?? process.cwd();
  const profile = input.profile ?? "standard";
  const platform = input.platform ?? "windows-powershell";
  const files = [
    {
      path: ".devflow/config.json",
      kind: "config",
      content: `${JSON.stringify(
        {
          schemaVersion: 1,
          defaultProfile: profile,
          defaultPlatform: platform,
          gates: [{ id: "docs-check", command: "npm run docs:check" }],
        },
        null,
        2,
      )}\n`,
    },
    {
      path: "docs/README.md",
      kind: "docs-router",
      content: [
        "# Project Contract",
        "",
        "This project is managed with Solo Devflow OS.",
        "",
        "## Read First",
        "",
        "- AGENTS.md",
        "- docs/contributing/workflow.md",
        "- docs/testing/strategy.md",
        "- docs/architecture/maps/README.md",
        "",
      ].join("\n"),
    },
    {
      path: "docs/contributing/workflow.md",
      kind: "workflow",
      content: [
        "# Development Workflow",
        "",
        "1. Run `devflow status` before starting.",
        "2. Record completed work with `devflow finish`.",
        "3. Include changed files, gates, risks, and the next-session prompt.",
        "",
      ].join("\n"),
    },
    {
      path: "docs/testing/strategy.md",
      kind: "testing",
      content: [
        "# Testing Strategy",
        "",
        "Record every verification gate that proves a work item is ready.",
        "",
        "## Initial Gate",
        "",
        "- `npm run docs:check`",
        "",
      ].join("\n"),
    },
    {
      path: "docs/architecture/maps/README.md",
      kind: "architecture-map",
      content: [
        "# Architecture Maps",
        "",
        "Add routes from product docs to owning code paths and verification gates.",
        "",
      ].join("\n"),
    },
    {
      path: "AGENTS.md",
      kind: "agent-guide",
      content: [
        "# Agent Guide",
        "",
        "Start with `devflow doctor` and `devflow status` before command-heavy work.",
        "Finish by recording evidence with `devflow finish`.",
        "",
      ].join("\n"),
    },
  ];

  return {
    schemaVersion: "0.1",
    command: "init",
    repo: {
      absolutePath: repoPath,
    },
    profile: {
      name: profile,
      requiredRuntime: false,
    },
    platform: normalizePlatform(platform),
    files: files.map((file) => ({
      path: file.path,
      kind: file.kind,
      action: "create-if-missing",
      content: file.content,
    })),
    warnings: [],
  };
}

export function createHealthSummary(input = {}) {
  const requiredFiles = (input.requiredFiles ?? defaultRequiredFiles()).map((file) => {
    const path = typeof file === "string" ? file : file.path;
    return {
      path,
      kind: typeof file === "string" ? "required" : file.kind,
      present: (input.existingPaths ?? []).includes(path),
    };
  });
  const missingFiles = requiredFiles.filter((file) => !file.present);
  const gates = normalizeGates(input.gates);

  return {
    schemaVersion: "0.1",
    command: "health",
    repo: {
      absolutePath: input.repo?.absolutePath ?? process.cwd(),
    },
    status: missingFiles.length === 0 && gates.length > 0 ? "ok" : "missing",
    requiredFiles,
    missingFiles,
    gates,
    recommendations: createHealthRecommendations(missingFiles, gates),
    warnings: input.warnings ?? [],
  };
}

export async function readProjectHealth(repoPath, config = {}) {
  const requiredFiles = defaultRequiredFiles();
  const existingPaths = [];

  for (const file of requiredFiles) {
    try {
      await readFile(join(repoPath, file.path), "utf8");
      existingPaths.push(file.path);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return createHealthSummary({
    repo: { absolutePath: repoPath },
    requiredFiles,
    existingPaths,
    gates: config.gates,
    warnings: config.warnings,
  });
}

export async function writeInitPlan(repoPath, plan, options = {}) {
  if (!options.confirmed) {
    throw new Error("devflow init requires explicit confirmation before writing files.");
  }

  const written = [];
  const skipped = [];

  for (const file of plan.files ?? []) {
    const target = join(repoPath, file.path);
    try {
      await readFile(target, "utf8");
      skipped.push({ path: file.path, reason: "already-exists" });
      continue;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
    written.push({ path: file.path });
  }

  return {
    schemaVersion: "0.1",
    command: "init_result",
    written,
    skipped,
  };
}

export function createSessionAttachPlan(input = {}) {
  const workItems = input.workItems ?? [];
  const sessions = input.sessions ?? [];

  return {
    schemaVersion: "0.1",
    command: "session_attach_plan",
    proposals: sessions.map((session) => createSessionAttachProposal(session, workItems)),
    warnings: input.warnings ?? [],
  };
}

export function createSessionListSummary(input = {}) {
  const state = input.state ?? emptyDevflowState();
  const agent = input.agent ?? null;
  const workItemId = input.workItemId ?? null;
  const since = input.since ?? null;
  const sort = normalizeSessionSort(input.sort);
  const sinceTime = since ? Date.parse(since) : null;
  const limit = normalizePositiveInteger(input.limit);
  const allSessions = input.sessions ?? state.sessions?.attached ?? [];
  const agentFilteredSessions = agent
    ? allSessions.filter((session) => session.agent === agent)
    : allSessions;
  const workFilteredSessions = workItemId
    ? agentFilteredSessions.filter((session) => session.workItemId === workItemId)
    : agentFilteredSessions;
  const filteredSessions = since
    ? workFilteredSessions.filter((session) => Date.parse(session.observedAt) >= sinceTime)
    : workFilteredSessions;
  const orderedSessions = sort ? sortSessionsByObservedAt(filteredSessions, sort) : filteredSessions;
  const sessions = limit
    ? sort
      ? orderedSessions.slice(0, limit)
      : orderedSessions.slice(-limit)
    : orderedSessions;

  return {
    schemaVersion: "0.1",
    command: "session_list",
    repo: {
      absolutePath: input.repo?.absolutePath ?? process.cwd(),
    },
    filters: {
      agent,
      workItemId,
      since,
      sort,
      limit,
    },
    sessions,
    count: sessions.length,
    totalCount: filteredSessions.length,
    warnings: [...(input.warnings ?? []), ...(state.warnings ?? [])],
  };
}

export function parseSessionListLimit(value, message) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(message);
  }

  return parsed;
}

export function parseSessionListSince(value, message) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(message);
  }

  return value;
}

export function parseSessionListSort(value, message) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value !== "observedAt:asc" && value !== "observedAt:desc") {
    throw new Error(message);
  }

  return value;
}

function sortSessionsByObservedAt(sessions, sort) {
  const direction = sort === "observedAt:asc" ? 1 : -1;

  return sessions
    .map((session, index) => ({ session, index }))
    .sort((left, right) => {
      const leftTime = Date.parse(left.session.observedAt);
      const rightTime = Date.parse(right.session.observedAt);

      if (leftTime === rightTime) {
        return left.index - right.index;
      }

      return (leftTime - rightTime) * direction;
    })
    .map(({ session }) => session);
}

function filterStatusSessions(sessions, filters) {
  return sessions.filter((session) => {
    if (filters.workItemId && session.workItemId !== filters.workItemId) {
      return false;
    }

    if (filters.agent && session.agent !== filters.agent) {
      return false;
    }

    return true;
  });
}

function normalizeSessionSort(value) {
  if (value !== "observedAt:asc" && value !== "observedAt:desc") {
    return null;
  }

  return value;
}

export function createTermExplanation(input = {}) {
  const term = normalizeTerm(input.term);
  const entry = glossary[term] ?? createFallbackGlossaryEntry(term);

  return {
    schemaVersion: "0.1",
    command: "explain",
    term,
    plainExplanation: entry.plainExplanation,
    projectContext: createProjectContext(term, input.context),
    whyItMatters: entry.whyItMatters,
    verifyBy: entry.verifyBy,
    relatedTerms: entry.relatedTerms,
    warnings: entry.known ? [] : ["Term is not in the built-in glossary seed."],
  };
}

function createSessionAttachProposal(session, workItems) {
  const confidence = session.project?.confidence ?? "low";
  const changedFiles = collectSessionChangedFiles(session);
  const recommendedWorkItem = findBestWorkItem(changedFiles, workItems);
  const requiresConfirmation = confidence !== "high";

  return {
    sessionId: session.sessionId,
    agent: session.agent ?? "unknown",
    recommendedWorkItemId: recommendedWorkItem?.id ?? null,
    action: requiresConfirmation ? "confirmation-required" : "attach-ready",
    requiresConfirmation,
    confidence,
    changedFiles,
    reason: requiresConfirmation
      ? `Session has ${confidence} confidence and should be confirmed before attaching.`
      : "Session has high confidence and matches the recommended work item paths.",
    warnings: session.warnings ?? [],
  };
}

function collectSessionChangedFiles(session) {
  const files = [];

  for (const event of session.events ?? []) {
    if (Array.isArray(event.changedFiles)) {
      files.push(...event.changedFiles);
    }
  }

  return files;
}

function findBestWorkItem(changedFiles, workItems) {
  return (
    workItems.find((workItem) =>
      changedFiles.some((file) =>
        (workItem.ownedPaths ?? []).some((pattern) => pathMatchesPattern(file, pattern)),
      ),
    ) ?? workItems[0] ?? null
  );
}

function pathMatchesPattern(path, pattern) {
  if (pattern.endsWith("/**")) {
    return path.startsWith(pattern.slice(0, -3));
  }

  return path === pattern;
}

export function createSplitPlan(input = {}) {
  const config = input.config ?? {};
  const configuredTasks = config.split?.tasks ?? config.splitTasks;
  const sessionCount = input.sessionCount ?? input.sessions ?? configuredTasks?.length ?? 2;
  const tasks = normalizeSplitTasks(input.tasks ?? configuredTasks, sessionCount);
  const profileName = input.profile ?? config.defaultProfile ?? "standard";
  const platform = normalizePlatform(input.platform ?? config.defaultPlatform ?? "powershell");
  const base = {
    branch: input.baseBranch ?? "main",
    ref: input.baseRef ?? "origin/main",
  };
  const sessions = tasks.map((task, index) =>
    createSplitSession({
      task,
      index,
      goal: input.goal ?? "Continue Solo Devflow OS from the latest project state.",
      profileName,
      platform,
      baseRef: base.ref,
      worktreeRoot: input.worktreeRoot ?? ".worktrees",
    }),
  );

  return {
    schemaVersion: "0.1",
    command: "split",
    runId: input.runId ?? createRunId(input.goal),
    goal: input.goal ?? "Continue Solo Devflow OS from the latest project state.",
    profile: {
      name: profileName,
      requiredRuntime: false,
    },
    platform,
    base,
    sessions,
    mergeOrder: createMergeOrder(sessions),
    collisionRisks: createCollisionRisks(sessions),
    warnings: config.warnings ?? [],
  };
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

export async function readDevflowConfig(repoPath) {
  let raw;
  try {
    raw = await readFile(join(repoPath, ".devflow", "config.json"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return { warnings: [] };
    }

    throw error;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      warnings: [],
    };
  } catch {
    return {
      warnings: ["Ignoring invalid .devflow/config.json."],
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

export async function recordGateEvent(repoPath, gateEvidence, options = {}) {
  const observedAt = options.observedAt ?? gateEvidence.observedAt ?? new Date().toISOString();
  const event = {
    schemaVersion: "0.1",
    type: "gate.finished",
    observedAt,
    payload: {
      id: gateEvidence.id,
      command: gateEvidence.command,
      status: gateEvidence.status,
      observedAt,
      summary: gateEvidence.summary ?? null,
      workItemId: gateEvidence.workItemId ?? null,
    },
  };

  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await appendFile(join(stateDir, "events.jsonl"), `${JSON.stringify(event)}\n`, "utf8");

  return event;
}

export async function recordSessionAttachedEvent(repoPath, proposal, options = {}) {
  if (!options.confirmed) {
    throw new Error("session attach requires explicit confirmation.");
  }

  if (!proposal?.sessionId) {
    throw new Error("session attach requires a proposal with sessionId.");
  }

  if (!proposal.recommendedWorkItemId) {
    throw new Error("session attach requires a proposal with recommendedWorkItemId.");
  }

  const state = await readDevflowState(repoPath);
  const existing = state.events.find(
    (event) =>
      event.type === "session.attached" &&
      event.payload?.sessionId === proposal.sessionId &&
      event.payload?.workItemId === proposal.recommendedWorkItemId,
  );

  if (existing) {
    return {
      ...existing,
      existing: true,
    };
  }

  const observedAt = options.observedAt ?? new Date().toISOString();
  const event = {
    schemaVersion: "0.1",
    type: "session.attached",
    observedAt,
    payload: {
      sessionId: proposal.sessionId,
      workItemId: proposal.recommendedWorkItemId,
      agent: proposal.agent ?? "unknown",
      confidence: proposal.confidence ?? "low",
      changedFiles: proposal.changedFiles ?? [],
      reason: proposal.reason ?? null,
      warnings: proposal.warnings ?? [],
      confirmed: true,
    },
  };

  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await appendFile(join(stateDir, "events.jsonl"), `${JSON.stringify(event)}\n`, "utf8");

  return event;
}

export async function recordManualSessionNoteEvent(repoPath, note, options = {}) {
  if (!note?.workItemId) {
    throw new Error("session note requires workItemId.");
  }

  if (!note.summary) {
    throw new Error("session note requires summary.");
  }

  const observedAt = options.observedAt ?? new Date().toISOString();
  const event = {
    schemaVersion: "0.1",
    type: "session.message",
    observedAt,
    payload: {
      sessionId: note.sessionId ?? `manual:${note.workItemId}:${observedAt}`,
      workItemId: note.workItemId,
      agent: note.agent ?? "manual",
      kind: "manual-note",
      summary: note.summary,
    },
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
  if (typeof platform === "string") {
    return normalizePlatform({
      name: platform === "powershell" ? "windows-powershell" : platform,
    });
  }

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
      latestById: createLatestGateEvidence(events),
    },
    sessions: {
      discovered: [],
      attached: createAttachedSessionEvidence(events),
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
    if (event.type === "gate.finished") {
      latestById[event.payload.id] = {
        id: event.payload.id,
        command: event.payload.command,
        status: event.payload.status,
        observedAt: event.payload.observedAt ?? event.observedAt,
        summary: event.payload.summary ?? null,
        workItemId: event.payload.workItemId ?? null,
      };
      continue;
    }

    if (event.type !== "work.completed" || event.payload?.command !== "finish") {
      continue;
    }

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

function createAttachedSessionEvidence(events) {
  const attached = events
    .filter((event) => event.type === "session.attached")
    .map((event) => ({
      sessionId: event.payload.sessionId,
      workItemId: event.payload.workItemId,
      agent: event.payload.agent,
      kind: "attached",
      confidence: event.payload.confidence,
      changedFiles: event.payload.changedFiles ?? [],
      observedAt: event.observedAt,
      warnings: event.payload.warnings ?? [],
    }));
  const notes = events
    .filter((event) => event.type === "session.message" && event.payload?.kind === "manual-note")
    .map((event) => ({
      sessionId: event.payload.sessionId,
      workItemId: event.payload.workItemId,
      agent: event.payload.agent,
      kind: "manual-note",
      confidence: "manual",
      changedFiles: [],
      observedAt: event.observedAt,
      summary: event.payload.summary,
      warnings: [],
    }));

  return [...attached, ...notes];
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

function normalizeGates(gates) {
  if (!Array.isArray(gates) || gates.length === 0) {
    return [{ id: "docs-check", command: "npm run docs:check", recommended: true }];
  }

  return gates.map((gate) => ({
    id: gate.id,
    command: gate.command,
    recommended: gate.recommended ?? true,
  }));
}

function defaultRequiredFiles() {
  return [
    { path: ".devflow/config.json", kind: "config" },
    { path: "AGENTS.md", kind: "agent-guide" },
    { path: "docs/README.md", kind: "docs-router" },
    { path: "docs/contributing/workflow.md", kind: "workflow" },
    { path: "docs/testing/strategy.md", kind: "testing" },
    { path: "docs/architecture/maps/README.md", kind: "architecture-map" },
  ];
}

function createHealthRecommendations(missingFiles, gates) {
  const recommendations = missingFiles.map((file) => ({
    kind: "missing-file",
    message: `Create ${file.path} with devflow init --confirm or project-specific scaffolding.`,
  }));

  if (gates.length === 0) {
    recommendations.push({
      kind: "missing-gate",
      message: "Configure at least one verification gate in .devflow/config.json.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      kind: "healthy",
      message: "Project scaffold and configured gates are present.",
    });
  }

  return recommendations;
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
    sessions: {
      discovered: [],
      attached: [],
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

function inferPromptIntent(request, context) {
  const normalized = `${request} ${context}`.toLowerCase();

  if (normalized.includes("phase 7") || normalized.includes("beginner")) {
    return "Continue the beginner guidance profile with the next small, verifiable implementation slice.";
  }

  if (normalized.includes("split") || normalized.includes("parallel")) {
    return "Prepare safe parallel development sessions with clear ownership and verification.";
  }

  if (normalized.includes("finish") || normalized.includes("handoff")) {
    return "Close the current work with evidence, risks, and a next-session handoff.";
  }

  return "Continue the next safe Solo Devflow OS implementation slice from current repo state.";
}

const glossary = {
  "toast notification": {
    known: true,
    plainExplanation:
      "A small message that appears briefly to confirm something happened, usually without blocking the page.",
    whyItMatters:
      "It tells the user that an action such as saving, copying, or deleting worked or failed.",
    verifyBy: ["Trigger the action.", "Check that the message appears and then disappears."],
    relatedTerms: ["modal", "banner", "alert"],
  },
  modal: {
    known: true,
    plainExplanation:
      "A focused dialog that appears above the page and usually asks the user to confirm, edit, or choose something.",
    whyItMatters: "It interrupts the workflow, so it should be used only when the decision matters.",
    verifyBy: ["Open the dialog.", "Check focus, cancel, confirm, and keyboard behavior."],
    relatedTerms: ["toast notification", "popover", "dialog"],
  },
  middleware: {
    known: true,
    plainExplanation:
      "Code that runs between a request and the final route handler, often to check auth, log, redirect, or prepare data.",
    whyItMatters:
      "It changes behavior before feature code runs, so it can affect many routes at once.",
    verifyBy: ["Exercise a route that should pass.", "Exercise a route that should be blocked or redirected."],
    relatedTerms: ["route", "handler", "auth guard"],
  },
  route: {
    known: true,
    plainExplanation: "A URL path or endpoint that maps a user request to a page or API handler.",
    whyItMatters: "It is often the boundary between UI navigation and backend behavior.",
    verifyBy: ["Open the URL or call the endpoint.", "Check success and error states."],
    relatedTerms: ["middleware", "handler", "page"],
  },
  "state management": {
    known: true,
    plainExplanation:
      "The way an app stores and updates changing information such as selected items, form values, or logged-in user data.",
    whyItMatters: "Poor state handling causes stale UI, lost input, and inconsistent behavior.",
    verifyBy: ["Change the value.", "Navigate or refresh if relevant.", "Check the UI still matches the data."],
    relatedTerms: ["store", "cache", "props"],
  },
  "responsive layout": {
    known: true,
    plainExplanation:
      "A layout that adapts to different screen sizes without overlapping, clipping, or hiding important controls.",
    whyItMatters: "It keeps the same feature usable on mobile, tablet, and desktop.",
    verifyBy: ["Check mobile width.", "Check desktop width.", "Confirm text and controls do not overlap."],
    relatedTerms: ["breakpoint", "viewport", "layout"],
  },
};

function normalizeTerm(term) {
  return String(term ?? "unknown term").trim().toLowerCase();
}

function normalizePositiveInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function createFallbackGlossaryEntry(term) {
  return {
    known: false,
    plainExplanation: `No built-in explanation exists for "${term}" yet.`,
    whyItMatters:
      "Ask for the term with the surrounding agent output or project context so Devflow can explain it at the point of work.",
    verifyBy: ["Find where the term appeared.", "Attach the file, command output, or agent message around it."],
    relatedTerms: [],
  };
}

function createProjectContext(term, context) {
  if (!context) {
    return `Explain "${term}" in the context of the current Devflow-managed project.`;
  }

  return `In this project context: ${context}`;
}

function normalizeSplitTasks(tasks, sessionCount) {
  if (Array.isArray(tasks) && tasks.length > 0) {
    return tasks.slice(0, sessionCount);
  }

  return Array.from({ length: sessionCount }, (_, index) => ({
    id: index === 0 ? "implementation" : `review-${index}`,
    role: index === 0 ? "implementation" : "audit",
    ownedPaths: index === 0 ? ["packages/**"] : ["docs/**"],
    avoidPaths: index === 0 ? ["docs/**"] : ["packages/**"],
    verification: [{ cwd: ".", command: index === 0 ? "npm test" : "npm run docs:check" }],
  }));
}

function createSplitSession({ task, index, goal, profileName, platform, baseRef, worktreeRoot }) {
  const id = slugify(task.id ?? task.title ?? `session-${index + 1}`);
  const branch = task.branch ?? `codex/${id}`;
  const worktreePath = task.worktreePath ?? `${worktreeRoot}/${id}`;
  const role = task.role ?? (index === 0 ? "implementation" : "audit");
  const ownedPaths = task.ownedPaths ?? [];
  const avoidPaths = task.avoidPaths ?? [];
  const verification = task.verification ?? [{ cwd: ".", command: "npm test" }];

  return {
    id,
    role,
    agent: task.agent ?? { preferred: "Codex", fallback: "generic-shell" },
    branch,
    worktreePath,
    ownedPaths,
    avoidPaths,
    readFirst: task.readFirst ?? ["AGENTS.md", "docs/README.md", "docs/roadmap.md"],
    goal: task.goal ?? goal,
    commands: [createWorktreeCommand(id, branch, worktreePath, baseRef)],
    verification,
    prompt: createSplitPrompt({
      id,
      role,
      goal: task.goal ?? goal,
      profileName,
      platform,
      ownedPaths,
      avoidPaths,
      verification,
    }),
  };
}

function createWorktreeCommand(id, branch, worktreePath, baseRef) {
  return {
    id: `create-${id}-worktree`,
    intent: "createWorktree",
    cwd: ".",
    args: {
      branch,
      path: worktreePath,
      base: baseRef,
    },
    variants: {
      powershell: `git fetch origin; git worktree add '${worktreePath}' -b '${branch}' '${baseRef}'`,
      posix: `git fetch origin && git worktree add ${worktreePath} -b ${branch} ${baseRef}`,
    },
  };
}

function createSplitPrompt(input) {
  const lines = [
    `You are working on ${input.id} for Solo Devflow OS.`,
    `Role: ${input.role}.`,
    `Goal: ${input.goal}`,
    `Profile: ${input.profileName}.`,
    `Platform: ${input.platform.name}.`,
    "",
    "Read first:",
    "- AGENTS.md",
    "- docs/README.md",
    "- docs/roadmap.md",
    "",
    "Owned paths:",
    ...formatList(input.ownedPaths),
    "",
    "Avoid paths:",
    ...formatList(input.avoidPaths),
    "",
    "Verification:",
    ...formatList(input.verification.map((gate) => `${gate.cwd ?? "."}: ${gate.command}`)),
    "",
    "Finish by recording changed files, gates, risks, and a next-session prompt.",
  ];

  return `${lines.join("\n")}\n`;
}

function createMergeOrder(sessions) {
  return [...sessions]
    .sort((left, right) => {
      if (left.role === right.role) {
        return 0;
      }

      return left.role === "audit" ? -1 : 1;
    })
    .map((session) => session.id);
}

function createCollisionRisks(sessions) {
  const risks = [];

  for (let leftIndex = 0; leftIndex < sessions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sessions.length; rightIndex += 1) {
      const overlap = findPathOverlap(
        sessions[leftIndex].ownedPaths,
        sessions[rightIndex].ownedPaths,
      );

      if (overlap.length > 0) {
        risks.push({
          paths: overlap,
          reason: `${sessions[leftIndex].id} and ${sessions[rightIndex].id} share owned paths.`,
        });
      }
    }
  }

  return risks;
}

function findPathOverlap(leftPaths, rightPaths) {
  const right = new Set(rightPaths);
  return leftPaths.filter((path) => right.has(path));
}

function createRunId(goal) {
  return slugify(goal ?? "devflow-split");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
