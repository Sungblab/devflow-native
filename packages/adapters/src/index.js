import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

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
