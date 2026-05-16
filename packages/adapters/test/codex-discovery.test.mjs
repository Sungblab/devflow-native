import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { discoverCodexSessions, findCodexSessionFiles } from "../src/index.js";

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
