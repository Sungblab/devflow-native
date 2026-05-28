import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { join } from "node:path";
import test from "node:test";

test("repo-local Codex plugin exposes devflow start skill and marketplace entry", async () => {
  const manifest = JSON.parse(
    await readFile("plugins/devflow/.codex-plugin/plugin.json", "utf8"),
  );
  const claudeManifest = JSON.parse(
    await readFile("plugins/devflow/.claude-plugin/plugin.json", "utf8"),
  );
  const marketplace = JSON.parse(
    await readFile(".agents/plugins/marketplace.json", "utf8"),
  );
  const hooks = JSON.parse(await readFile("plugins/devflow/hooks/hooks.json", "utf8"));
  const mcpConfig = JSON.parse(await readFile("plugins/devflow/.mcp.json", "utf8"));
  const startSkill = await readFile("plugins/devflow/skills/start/SKILL.md", "utf8");
  const splitSkill = await readFile("plugins/devflow/skills/split/SKILL.md", "utf8");
  const nextSkill = await readFile("plugins/devflow/skills/next/SKILL.md", "utf8");
  const explainSkill = await readFile("plugins/devflow/skills/explain/SKILL.md", "utf8");
  const rewriteSkill = await readFile("plugins/devflow/skills/rewrite/SKILL.md", "utf8");
  const sessionsSkill = await readFile("plugins/devflow/skills/sessions/SKILL.md", "utf8");
  const finishSkill = await readFile("plugins/devflow/skills/finish/SKILL.md", "utf8");

  assert.equal(manifest.name, "devflow");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(manifest.hooks, "./hooks/hooks.json");
  assert.match(manifest.interface.shortDescription, /project truth/i);
  assert.equal(claudeManifest.name, "devflow");
  assert.equal(claudeManifest.hooks, "./hooks/hooks.json");
  assert.match(claudeManifest.description, /continuity/i);
  assert.ok(claudeManifest.keywords.includes("handoff"));
  assert.equal(hooks.hooks.SessionStart[0].matcher, "startup|resume");
  assert.match(hooks.hooks.SessionStart[0].hooks[0].command, /session-start\.mjs/);
  assert.match(hooks.hooks.UserPromptSubmit[0].hooks[0].command, /user-prompt-submit\.mjs/);
  assert.match(hooks.hooks.Stop[0].hooks[0].command, /stop\.mjs/);
  assert.deepEqual(mcpConfig.mcpServers.devflow.command, "node");
  assert.deepEqual(mcpConfig.mcpServers.devflow.args, ["packages/mcp/src/stdio.js"]);

  assert.deepEqual(marketplace.plugins[0], {
    name: "devflow",
    source: {
      source: "local",
      path: "./plugins/devflow",
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: "Productivity",
  });

  assert.match(startSkill, /devflow doctor --json/);
  assert.match(startSkill, /not dependent on any one profile/);
  assert.match(startSkill, /Get-Content -LiteralPath/);

  assert.match(splitSkill, /devflow split --json/);
  assert.match(splitSkill, /owned paths/);
  assert.match(splitSkill, /worktree/);

  assert.match(nextSkill, /devflow prompt next/);
  assert.match(nextSkill, /copy-paste/);
  assert.match(nextSkill, /latest status/);

  assert.match(explainSkill, /devflow explain/);
  assert.match(explainSkill, /plain language/);
  assert.match(explainSkill, /project context/);

  assert.match(rewriteSkill, /devflow prompt rewrite/);
  assert.match(rewriteSkill, /vague maintainer request/);
  assert.match(rewriteSkill, /agent-ready/);

  assert.match(sessionsSkill, /devflow sessions codex/);
  assert.match(sessionsSkill, /devflow sessions attach-plan/);
  assert.match(sessionsSkill, /devflow\.sessions_attach_plan/);
  assert.match(sessionsSkill, /devflow sessions attach/);
  assert.match(sessionsSkill, /devflow sessions list/);
  assert.match(sessionsSkill, /devflow sessions note/);
  assert.match(sessionsSkill, /devflow\.sessions_attach/);
  assert.match(sessionsSkill, /devflow\.sessions_list/);
  assert.match(sessionsSkill, /devflow\.sessions_note/);
  assert.match(sessionsSkill, /--codex-home/);
  assert.match(sessionsSkill, /read-only/);
  assert.match(sessionsSkill, /confirmation-gated/);

  assert.match(finishSkill, /devflow finish/);
  assert.match(finishSkill, /devflow review request/);
  assert.match(finishSkill, /devflow review record/);
  assert.match(finishSkill, /review\.nextAction\.recordCommand/);
  assert.match(finishSkill, /documentation needs an update/);
  assert.match(finishSkill, /Codex goal/);
  assert.match(finishSkill, /gh CLI/);
  assert.match(finishSkill, /commit, PR, continue, or next-session prompt/);
});

test("repo-local plugin hooks emit compact context for agent sessions", async () => {
  const sessionStart = await runHook("plugins/devflow/hooks/session-start.mjs", {
    hook_event_name: "SessionStart",
    source: "startup",
    cwd: process.cwd(),
  });
  const userPrompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "ㄱㄱ",
  });
  const stop = await runHook("plugins/devflow/hooks/stop.mjs", {
    hook_event_name: "Stop",
    cwd: process.cwd(),
    last_assistant_message: "Continuing the current slice.",
  });

  assert.equal(sessionStart.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Devflow start context/);
  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Use structured state and compact summaries/);
  assert.equal(userPrompt.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(userPrompt.hookSpecificOutput.additionalContext, /continue_or_start/);
  assert.match(userPrompt.hookSpecificOutput.additionalContext, /Do not generate HTML unless requested/);
  assert.match(userPrompt.hookSpecificOutput.additionalContext, /devflow review request/);
  assert.equal(stop.hookSpecificOutput.hookEventName, "Stop");
  assert.match(stop.hookSpecificOutput.additionalContext, /Devflow stop context/);
  assert.match(stop.hookSpecificOutput.additionalContext, /devflow review request/);
  assert.match(stop.hookSpecificOutput.additionalContext, /devflow review record/);
  assert.match(stop.hookSpecificOutput.additionalContext, /Current compact status/);
});

test("repo-local session start hook surfaces the latest persisted handoff", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-plugin-handoff-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "next-prompt.md"),
    "# Next Prompt\n\nContinue the session-start handoff smoke slice.\n",
    "utf8",
  );

  const sessionStart = await runHook("plugins/devflow/hooks/session-start.mjs", {
    hook_event_name: "SessionStart",
    source: "startup",
    cwd: repoPath,
  });

  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Latest handoff prompt/);
  assert.match(
    sessionStart.hookSpecificOutput.additionalContext,
    /Continue the session-start handoff smoke slice/,
  );
});

test("repo-local stop hook blocks completion when status still recommends review", async () => {
  const blocked = await runHook("plugins/devflow/hooks/stop.mjs", {
    hook_event_name: "Stop",
    cwd: process.cwd(),
    last_assistant_message: "Implemented and tests pass. Done.",
    devflow_status_json: JSON.stringify({
      recommendations: [
        {
          kind: "review",
          command: "devflow review request --work guarded-work --target reviewer --persona strict-reviewer",
        },
      ],
    }),
  });

  assert.equal(blocked.decision, "block");
  assert.match(blocked.reason, /devflow review request --work guarded-work/);
  assert.match(blocked.reason, /record the review outcome/);
});

async function runHook(path, payload) {
  const child = spawn(process.execPath, [path], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.stdin.end(`${JSON.stringify(payload)}\n`);

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  assert.equal(exitCode, 0, stderr);
  return JSON.parse(stdout);
}
