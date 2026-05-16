export function discoverCodexSessions(input = {}) {
  const repoPath = input.repoPath ?? process.cwd();
  const records = input.records ?? [];

  return {
    schemaVersion: "0.1",
    adapter: "codex",
    sessions: records.map((record) => normalizeCodexRecord(record, repoPath)),
    warnings: [],
  };
}

function normalizeCodexRecord(record, repoPath) {
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
    adapter: "codex",
    sessionId: record.id ?? record.sessionId ?? "unknown",
    agent: "Codex",
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
    warnings: createWarnings(record, project),
  };
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

function createWarnings(record, project) {
  const warnings = [];

  if (!record.cwd) {
    warnings.push("No cwd metadata was available for this Codex session.");
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
