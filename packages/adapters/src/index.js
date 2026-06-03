import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export function discoverCodexSessions(input = {}) {
  return discoverAgentSessions("codex", input);
}

export function discoverClaudeSessions(input = {}) {
  return discoverAgentSessions("claude", input);
}

export function discoverOpenCodeSessions(input = {}) {
  return discoverAgentSessions("opencode", input);
}

export function discoverClineSessions(input = {}) {
  return discoverAgentSessions("cline", input);
}

export function discoverAgentSessions(adapter, input = {}) {
  const definition = getAdapterDefinition(adapter);
  const repoPath = input.repoPath ?? process.cwd();
  const records = input.records ?? [];

  return {
    schemaVersion: "0.1",
    adapter: definition.id,
    sessions: records.map((record) => normalizeSessionRecord(record, repoPath, definition)),
    warnings: [],
  };
}

export async function findCodexSessionFiles(input = {}) {
  const codexHome = input.codexHome;
  const limit = input.limit ?? 200;
  const warnings = [];

  if (!codexHome) {
    return {
      schemaVersion: "0.1",
      adapter: "codex",
      codexHome: null,
      files: [],
      warnings: ["codexHome is required for Codex session file discovery."],
    };
  }

  const sessionsRoot = join(codexHome, "sessions");
  const files = [];

  try {
    await collectJsonlFiles(sessionsRoot, files, limit);
  } catch (error) {
    if (error?.code === "ENOENT") {
      warnings.push("Codex sessions directory was not found.");
    } else {
      throw error;
    }
  }

  return {
    schemaVersion: "0.1",
    adapter: "codex",
    codexHome,
    files,
    warnings,
  };
}

export async function findAgentSessionFiles(adapter, input = {}) {
  const definition = getAdapterDefinition(adapter);
  const historyPath = input.historyPath ?? input.path;
  const limit = input.limit ?? 200;
  const warnings = [];

  if (!historyPath) {
    return {
      schemaVersion: "0.1",
      adapter: definition.id,
      historyPath: null,
      files: [],
      warnings: [`historyPath is required for ${definition.agent} session file discovery.`],
    };
  }

  const files = [];

  try {
    await collectAgentSessionFiles(definition.id, historyPath, files, limit);
  } catch (error) {
    if (error?.code === "ENOENT") {
      warnings.push(`${definition.agent} history path was not found.`);
    } else {
      throw error;
    }
  }

  return {
    schemaVersion: "0.1",
    adapter: definition.id,
    historyPath,
    files,
    warnings,
  };
}

export function parseCodexSessionJsonl(content, input = {}) {
  return parseAgentJsonl(content, input, "codex");
}

export function parseClaudeSessionJsonl(content, input = {}) {
  return parseAgentJsonl(content, input, "claude");
}

export function parseOpenCodeSessionRecord(record = {}, input = {}) {
  const toolCalls = record.toolCalls ?? record.tools ?? [];
  const changedFiles = record.changedFiles ?? record.files ?? [];

  return {
    id: input.id ?? record.id ?? record.sessionId ?? null,
    cwd: input.cwd ?? record.cwd ?? record.workspace ?? record.projectPath ?? null,
    startedAt: record.startedAt ?? record.createdAt ?? input.startedAt ?? null,
    updatedAt: record.updatedAt ?? record.lastUpdatedAt ?? input.updatedAt ?? null,
    sourcePath: input.sourcePath ?? record.sourcePath ?? null,
    sourceKind: input.sourceKind ?? record.sourceKind ?? "local-history",
    hasToolCalls: Array.isArray(toolCalls) ? toolCalls.length > 0 : Boolean(toolCalls),
    hasFileEdits: Boolean(record.hasFileEdits ?? changedFiles.length > 0),
    hasPendingApproval: Boolean(record.hasPendingApproval),
    changedFiles,
    warnings: [],
  };
}

export function parseClineSessionJson(record = {}, input = {}) {
  const messages = record.messages ?? record.history ?? [];
  const changedFiles = record.changedFiles ?? record.files ?? [];
  const hasToolCalls = Array.isArray(messages)
    ? messages.some((message) => message.type === "tool_use" || message.tool || message.name)
    : Boolean(messages);
  const hasFileEdits = Array.isArray(messages)
    ? messages.some((message) => isFileEditTool(message.tool ?? message.name ?? message.type))
    : false;

  return {
    id: input.id ?? record.id ?? record.taskId ?? record.sessionId ?? null,
    cwd: input.cwd ?? record.cwd ?? record.workspace ?? record.projectPath ?? null,
    startedAt: record.startedAt ?? record.createdAt ?? record.ts ?? input.startedAt ?? null,
    updatedAt: record.updatedAt ?? record.lastUpdatedAt ?? record.ts ?? input.updatedAt ?? null,
    sourcePath: input.sourcePath ?? record.sourcePath ?? null,
    sourceKind: input.sourceKind ?? record.sourceKind ?? "local-history",
    hasToolCalls,
    hasFileEdits: Boolean(record.hasFileEdits ?? hasFileEdits ?? changedFiles.length > 0),
    hasPendingApproval: Boolean(record.hasPendingApproval),
    changedFiles,
    warnings: [],
  };
}

function normalizeSessionRecord(record, repoPath, definition) {
  const project = normalizeProject(record.cwd, repoPath);
  const changedFiles = record.changedFiles ?? [];
  const events = [
    {
      type: "session.discovered",
      confidence: project.confidence,
    },
  ];

  if (changedFiles.length > 0) {
    events.push({
      type: "git.diff.captured",
      changedFiles,
    });
  }

  return {
    adapter: definition.id,
    sessionId: record.id ?? record.sessionId ?? "unknown",
    agent: definition.agent,
    project,
    startedAt: record.startedAt ?? null,
    updatedAt: record.updatedAt ?? null,
    state: record.state ?? "unknown",
    signals: {
      hasToolCalls: Boolean(record.hasToolCalls),
      hasFileEdits: Boolean(record.hasFileEdits ?? changedFiles.length > 0),
      hasPendingApproval: Boolean(record.hasPendingApproval),
    },
    source: {
      kind: record.sourceKind ?? "local-history",
      path: record.sourcePath ?? null,
    },
    events,
    warnings: createWarnings(record, project, definition),
  };
}

function getAdapterDefinition(adapter) {
  const key = String(adapter ?? "").toLowerCase();
  const definitions = {
    codex: { id: "codex", agent: "Codex" },
    claude: { id: "claude", agent: "Claude Code" },
    "claude-code": { id: "claude", agent: "Claude Code" },
    opencode: { id: "opencode", agent: "OpenCode" },
    cline: { id: "cline", agent: "Cline" },
  };
  const definition = definitions[key];

  if (!definition) {
    throw new Error(`Unsupported session adapter: ${adapter}`);
  }

  return definition;
}

function normalizeProject(cwd, repoPath) {
  if (!cwd) {
    return {
      absolutePath: null,
      confidence: "low",
    };
  }

  return {
    absolutePath: cwd,
    confidence: samePath(cwd, repoPath) ? "high" : "medium",
  };
}

function createWarnings(record, project, definition) {
  const warnings = [];

  if (!record.cwd) {
    warnings.push(`No cwd metadata was available for this ${definition.agent} session.`);
  }

  if (project.confidence !== "high") {
    warnings.push("Session should not be auto-attached without maintainer confirmation.");
  }

  return warnings;
}

function samePath(left, right) {
  return normalizePath(left) === normalizePath(right);
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/\/+$/u, "").toLowerCase();
}

function applyCodexJsonlEvent(record, event) {
  const payload = event.payload ?? event;
  const timestamp = payload.timestamp ?? event.timestamp ?? payload.createdAt ?? event.createdAt;

  if (!record.id) {
    record.id = payload.id ?? payload.sessionId ?? event.id ?? event.sessionId ?? null;
  }

  if (!record.cwd) {
    record.cwd = payload.cwd ?? payload.currentWorkingDirectory ?? event.cwd ?? null;
  }

  if (timestamp) {
    record.startedAt ??= timestamp;
    record.updatedAt = timestamp;
  }

  const toolName = payload.name ?? payload.toolName ?? event.name ?? event.toolName;
  const payloadType = payload.type ?? event.type;
  if (payloadType === "function_call" || toolName) {
    record.hasToolCalls = true;
  }

  if (toolName === "apply_patch" || toolName === "shell_command" || payloadType === "file_edit") {
    record.hasFileEdits = record.hasFileEdits || isFileEditTool(toolName) || payloadType === "file_edit";
  }

  const changedFiles = payload.changedFiles ?? event.changedFiles ?? [];
  if (Array.isArray(changedFiles)) {
    record.changedFiles.push(...changedFiles);
    record.hasFileEdits = record.hasFileEdits || changedFiles.length > 0;
  }
}

function parseAgentJsonl(content, input = {}, adapter = "codex") {
  const record = {
    id: input.id ?? null,
    cwd: input.cwd ?? null,
    startedAt: null,
    updatedAt: null,
    sourcePath: input.sourcePath ?? null,
    sourceKind: "local-history",
    hasToolCalls: false,
    hasFileEdits: false,
    changedFiles: [],
    warnings: [],
  };
  const lines = String(content ?? "").split(/\r?\n/u).filter((line) => line.trim().length > 0);

  lines.forEach((line, index) => {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      record.warnings.push(`Invalid JSONL at line ${index + 1}; skipped.`);
      return;
    }

    if (adapter === "claude") {
      applyClaudeJsonlEvent(record, event);
      return;
    }

    applyCodexJsonlEvent(record, event);
  });

  return record;
}

function applyClaudeJsonlEvent(record, event) {
  const payload = event.payload ?? event;
  const timestamp = payload.timestamp ?? event.timestamp ?? payload.createdAt ?? event.createdAt;

  if (!record.id) {
    record.id = payload.sessionId ?? payload.id ?? event.sessionId ?? event.id ?? null;
  }

  if (!record.cwd) {
    record.cwd = payload.cwd ?? payload.projectPath ?? payload.workspace ?? event.cwd ?? null;
  }

  if (timestamp) {
    record.startedAt ??= timestamp;
    record.updatedAt = timestamp;
  }

  const toolName = payload.name ?? payload.tool ?? payload.toolName ?? event.name ?? event.toolName;
  const payloadType = payload.type ?? event.type;
  if (payloadType === "tool_use" || payloadType === "function_call" || toolName) {
    record.hasToolCalls = true;
  }

  if (isFileEditTool(toolName) || payloadType === "file_edit") {
    record.hasFileEdits = true;
  }

  const changedFiles = payload.changedFiles ?? event.changedFiles ?? [];
  if (Array.isArray(changedFiles)) {
    record.changedFiles.push(...changedFiles);
    record.hasFileEdits = record.hasFileEdits || changedFiles.length > 0;
  }
}

function isFileEditTool(name) {
  return [
    "apply_patch",
    "edit",
    "write",
    "multiedit",
    "notebookedit",
    "str_replace_editor",
    "editedexistingfile",
    "newfile",
  ].includes(String(name ?? "").toLowerCase());
}

async function collectJsonlFiles(directory, files, limit) {
  if (files.length >= limit) {
    return;
  }

  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (files.length >= limit) {
      return;
    }

    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await collectJsonlFiles(fullPath, files, limit);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
      continue;
    }

    const metadata = await stat(fullPath);
    files.push({
      path: fullPath,
      kind: "session-jsonl",
      sourceKind: "local-history",
      sizeBytes: metadata.size,
      modifiedAt: metadata.mtime.toISOString(),
    });
  }
}

async function collectAgentSessionFiles(adapter, path, files, limit) {
  if (files.length >= limit) {
    return;
  }

  const metadata = await stat(path);

  if (metadata.isDirectory()) {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= limit) {
        return;
      }

      await collectAgentSessionFiles(adapter, join(path, entry.name), files, limit);
    }
    return;
  }

  if (!metadata.isFile() || !isSupportedSessionFile(adapter, path)) {
    return;
  }

  const isJsonl = path.endsWith(".jsonl");
  files.push({
    path,
    kind: isJsonl ? "session-jsonl" : "session-json",
    sourceKind: "local-history",
    sizeBytes: metadata.size,
    modifiedAt: metadata.mtime.toISOString(),
  });
}

function isSupportedSessionFile(adapter, path) {
  const lower = path.toLowerCase();
  if (adapter === "claude") {
    return lower.endsWith(".jsonl");
  }

  if (adapter === "opencode") {
    return lower.endsWith(".json") || lower.endsWith(".jsonl");
  }

  if (adapter === "cline") {
    return lower.endsWith(".json");
  }

  return false;
}
