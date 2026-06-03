import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  discoverAgentSessions,
  discoverClaudeSessions,
  discoverCodexSessions,
  discoverClineSessions,
  findAgentSessionFiles,
  findCodexSessionFiles,
  discoverOpenCodeSessions,
  parseClaudeSessionJsonl,
  parseCodexSessionJsonl,
  parseClineSessionJson,
  parseOpenCodeSessionRecord,
} from "../src/index.js";

test("Codex discovery maps matching session metadata into normalized events", () => {
  const result = discoverCodexSessions({
    repoPath: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
    records: [
      {
        id: "019c6e27-e55b-73d1-87d8-4e01f1f75043",
        cwd: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
        startedAt: "2026-05-16T10:00:00+09:00",
        updatedAt: "2026-05-16T10:42:00+09:00",
        sourcePath: "C:\\Users\\You\\.codex\\sessions\\2026\\05\\16\\rollout.jsonl",
        hasToolCalls: true,
        hasFileEdits: true,
        changedFiles: ["packages/adapters/src/index.js"],
      },
    ],
  });

  assert.equal(result.schemaVersion, "0.1");
  assert.equal(result.adapter, "codex");
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].sessionId, "019c6e27-e55b-73d1-87d8-4e01f1f75043");
  assert.equal(result.sessions[0].project.confidence, "high");
  assert.equal(result.sessions[0].signals.hasToolCalls, true);
  assert.equal(result.sessions[0].signals.hasFileEdits, true);
  assert.equal(result.sessions[0].events[0].type, "session.discovered");
  assert.deepEqual(result.sessions[0].events[1], {
    type: "git.diff.captured",
    changedFiles: ["packages/adapters/src/index.js"],
  });
});

test("Codex discovery keeps uncertain records visible with warnings", () => {
  const result = discoverCodexSessions({
    repoPath: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
    records: [
      {
        id: "uncertain",
        cwd: null,
        sourcePath: "C:\\Users\\You\\.codex\\sessions\\unknown.jsonl",
      },
    ],
  });

  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].project.confidence, "low");
  assert.equal(result.sessions[0].project.absolutePath, null);
  assert.match(result.sessions[0].warnings[0], /No cwd metadata/);
});

test("Codex file discovery finds JSONL candidates under an explicit codex home", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "devflow-codex-home-"));
  const sessionDir = join(codexHome, "sessions", "2026", "05", "16");
  await mkdir(sessionDir, { recursive: true });
  await mkdir(join(codexHome, "logs"), { recursive: true });
  await writeFile(join(sessionDir, "rollout.jsonl"), "{}\n");
  await writeFile(join(sessionDir, "debug.log"), "ignore\n");
  await writeFile(join(codexHome, "logs", "other.jsonl"), "{}\n");

  const result = await findCodexSessionFiles({ codexHome });

  assert.equal(result.schemaVersion, "0.1");
  assert.equal(result.adapter, "codex");
  assert.equal(result.codexHome, codexHome);
  assert.equal(result.files.length, 1);
  assert.match(result.files[0].path, /rollout\.jsonl$/);
  assert.equal(result.files[0].kind, "session-jsonl");
  assert.equal(result.files[0].sourceKind, "local-history");
  assert.equal(result.files[0].sizeBytes, 3);
});

test("agent file discovery reads only explicit history paths for non-Codex adapters", async () => {
  const historyRoot = await mkdtemp(join(tmpdir(), "devflow-agent-history-"));
  await mkdir(join(historyRoot, "nested"), { recursive: true });
  await writeFile(join(historyRoot, "claude.jsonl"), "{}\n");
  await writeFile(join(historyRoot, "nested", "cline.json"), "{}\n");
  await writeFile(join(historyRoot, "ignore.txt"), "ignore\n");

  const claude = await findAgentSessionFiles("claude", { historyPath: historyRoot });
  const cline = await findAgentSessionFiles("cline", { historyPath: historyRoot });
  const missing = await findAgentSessionFiles("opencode", {});

  assert.equal(claude.adapter, "claude");
  assert.equal(claude.historyPath, historyRoot);
  assert.equal(claude.files.length, 1);
  assert.match(claude.files[0].path, /claude\.jsonl$/);
  assert.equal(claude.files[0].kind, "session-jsonl");
  assert.equal(cline.adapter, "cline");
  assert.equal(cline.files.length, 1);
  assert.match(cline.files[0].path, /cline\.json$/);
  assert.equal(cline.files[0].kind, "session-json");
  assert.deepEqual(missing.files, []);
  assert.match(missing.warnings[0], /historyPath is required/);
});

test("Codex JSONL parser extracts safe metadata from a synthetic fixture", () => {
  const content = [
    JSON.stringify({
      type: "session_meta",
      payload: {
        id: "019c7714-3b77-74d1-9866-e1f484aae2ab",
        cwd: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
        timestamp: "2026-05-16T11:00:00+09:00",
      },
    }),
    JSON.stringify({
      type: "response_item",
      payload: { type: "function_call", name: "shell_command" },
    }),
    JSON.stringify({
      type: "response_item",
      payload: { type: "function_call", name: "apply_patch" },
    }),
    "{not json",
  ].join("\n");

  const record = parseCodexSessionJsonl(content, {
    sourcePath: "C:\\Users\\You\\.codex\\sessions\\fixture.jsonl",
  });

  assert.equal(record.id, "019c7714-3b77-74d1-9866-e1f484aae2ab");
  assert.equal(record.cwd, "C:\\Users\\You\\Documents\\GitHub\\devflow-demo");
  assert.equal(record.startedAt, "2026-05-16T11:00:00+09:00");
  assert.equal(record.updatedAt, "2026-05-16T11:00:00+09:00");
  assert.equal(record.hasToolCalls, true);
  assert.equal(record.hasFileEdits, true);
  assert.equal(record.sourceKind, "local-history");
  assert.match(record.warnings[0], /Invalid JSONL/);
});

test("Claude discovery maps project JSONL metadata into normalized session events", () => {
  const result = discoverClaudeSessions({
    repoPath: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
    records: [
      {
        id: "claude-session-1",
        cwd: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
        startedAt: "2026-06-03T09:00:00.000Z",
        updatedAt: "2026-06-03T09:30:00.000Z",
        sourcePath: "C:\\Users\\You\\.claude\\projects\\devflow.jsonl",
        hasToolCalls: true,
        hasFileEdits: true,
        changedFiles: ["packages/adapters/src/index.js"],
      },
    ],
  });

  assert.equal(result.adapter, "claude");
  assert.equal(result.sessions[0].agent, "Claude Code");
  assert.equal(result.sessions[0].sessionId, "claude-session-1");
  assert.equal(result.sessions[0].project.confidence, "high");
  assert.equal(result.sessions[0].signals.hasFileEdits, true);
  assert.deepEqual(result.sessions[0].events[1], {
    type: "git.diff.captured",
    changedFiles: ["packages/adapters/src/index.js"],
  });
});

test("Claude discovery warnings name the Claude adapter when cwd is missing", () => {
  const result = discoverClaudeSessions({
    repoPath: "C:\\repo",
    records: [{ id: "claude-missing-cwd" }],
  });

  assert.match(result.sessions[0].warnings[0], /Claude Code session/);
});

test("Claude JSONL parser extracts safe metadata from synthetic project history", () => {
  const content = [
    JSON.stringify({
      sessionId: "claude-jsonl-1",
      cwd: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
      timestamp: "2026-06-03T10:00:00.000Z",
      type: "tool_use",
      name: "Edit",
      changedFiles: ["packages/core/src/index.js"],
    }),
    JSON.stringify({
      timestamp: "2026-06-03T10:05:00.000Z",
      type: "tool_use",
      name: "Bash",
    }),
  ].join("\n");

  const record = parseClaudeSessionJsonl(content, {
    sourcePath: "C:\\Users\\You\\.claude\\projects\\fixture.jsonl",
  });

  assert.equal(record.id, "claude-jsonl-1");
  assert.equal(record.cwd, "C:\\Users\\You\\Documents\\GitHub\\devflow-demo");
  assert.equal(record.startedAt, "2026-06-03T10:00:00.000Z");
  assert.equal(record.updatedAt, "2026-06-03T10:05:00.000Z");
  assert.equal(record.hasToolCalls, true);
  assert.equal(record.hasFileEdits, true);
  assert.deepEqual(record.changedFiles, ["packages/core/src/index.js"]);
});

test("OpenCode and Cline records normalize through the shared agent adapter contract", () => {
  const opencodeRecord = parseOpenCodeSessionRecord({
    id: "opencode-1",
    workspace: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
    createdAt: "2026-06-03T11:00:00.000Z",
    updatedAt: "2026-06-03T11:10:00.000Z",
    toolCalls: [{ name: "edit" }],
    files: ["packages/mcp/src/index.js"],
  });
  const clineRecord = parseClineSessionJson({
    taskId: "cline-1",
    cwd: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
    ts: "2026-06-03T12:00:00.000Z",
    messages: [{ type: "tool_use", tool: "editedExistingFile" }],
    changedFiles: ["packages/cli/src/index.js"],
  });

  const opencode = discoverOpenCodeSessions({
    repoPath: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
    records: [opencodeRecord],
  });
  const cline = discoverClineSessions({
    repoPath: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
    records: [clineRecord],
  });

  assert.equal(opencode.sessions[0].agent, "OpenCode");
  assert.equal(opencode.sessions[0].signals.hasToolCalls, true);
  assert.deepEqual(opencode.sessions[0].events[1].changedFiles, ["packages/mcp/src/index.js"]);
  assert.equal(cline.sessions[0].agent, "Cline");
  assert.equal(cline.sessions[0].signals.hasFileEdits, true);
  assert.deepEqual(cline.sessions[0].events[1].changedFiles, ["packages/cli/src/index.js"]);
});

test("generic agent discovery rejects unsupported session adapters explicitly", () => {
  assert.throws(
    () =>
      discoverAgentSessions("cursor", {
        repoPath: "C:\\repo",
        records: [],
      }),
    /Unsupported session adapter/,
  );
});
