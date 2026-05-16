import assert from "node:assert/strict";
import test from "node:test";

import { discoverCodexSessions } from "../src/index.js";

test("Codex discovery maps matching session metadata into normalized events", () => {
  const result = discoverCodexSessions({
    repoPath: "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
    records: [
      {
        id: "019c6e27-e55b-73d1-87d8-4e01f1f75043",
        cwd: "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
        startedAt: "2026-05-16T10:00:00+09:00",
        updatedAt: "2026-05-16T10:42:00+09:00",
        sourcePath: "C:\\Users\\Sungbin\\.codex\\sessions\\2026\\05\\16\\rollout.jsonl",
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
    repoPath: "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
    records: [
      {
        id: "uncertain",
        cwd: null,
        sourcePath: "C:\\Users\\Sungbin\\.codex\\sessions\\unknown.jsonl",
      },
    ],
  });

  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].project.confidence, "low");
  assert.equal(result.sessions[0].project.absolutePath, null);
  assert.match(result.sessions[0].warnings[0], /No cwd metadata/);
});
