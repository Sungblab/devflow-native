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
  const claudeHooks = JSON.parse(await readFile("plugins/devflow/hooks/claude-hooks.json", "utf8"));
  const mcpConfig = JSON.parse(await readFile("plugins/devflow/.mcp.json", "utf8"));
  const startSkill = await readFile("plugins/devflow/skills/start/SKILL.md", "utf8");
  const statusSkill = await readFile("plugins/devflow/skills/status/SKILL.md", "utf8");
  const doctorSkill = await readFile("plugins/devflow/skills/doctor/SKILL.md", "utf8");
  const harnessSkill = await readFile("plugins/devflow/skills/harness/SKILL.md", "utf8");
  const workSkill = await readFile("plugins/devflow/skills/work/SKILL.md", "utf8");
  const gatesSkill = await readFile("plugins/devflow/skills/gates/SKILL.md", "utf8");
  const reviewSkill = await readFile("plugins/devflow/skills/review/SKILL.md", "utf8");
  const splitSkill = await readFile("plugins/devflow/skills/split/SKILL.md", "utf8");
  const nextSkill = await readFile("plugins/devflow/skills/next/SKILL.md", "utf8");
  const explainSkill = await readFile("plugins/devflow/skills/explain/SKILL.md", "utf8");
  const rewriteSkill = await readFile("plugins/devflow/skills/rewrite/SKILL.md", "utf8");
  const sessionsSkill = await readFile("plugins/devflow/skills/sessions/SKILL.md", "utf8");
  const finishSkill = await readFile("plugins/devflow/skills/finish/SKILL.md", "utf8");
  const startCommand = await readFile("plugins/devflow/commands/start.md", "utf8");
  const statusCommand = await readFile("plugins/devflow/commands/status.md", "utf8");
  const explainCommand = await readFile("plugins/devflow/commands/explain.md", "utf8");
  const reviewCommand = await readFile("plugins/devflow/commands/review.md", "utf8");
  const finishCommand = await readFile("plugins/devflow/commands/finish.md", "utf8");

  assert.equal(manifest.name, "devflow");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(manifest.hooks, "./hooks/hooks.json");
  assert.match(manifest.interface.shortDescription, /project truth/i);
  assert.equal(claudeManifest.name, "devflow");
  assert.equal(claudeManifest.hooks, "./hooks/claude-hooks.json");
  assert.match(claudeManifest.description, /continuity/i);
  assert.ok(claudeManifest.keywords.includes("handoff"));
  assert.equal(hooks.hooks.SessionStart[0].matcher, "startup|resume");
  assert.match(hooks.hooks.SessionStart[0].hooks[0].command, /session-start\.mjs/);
  assert.match(hooks.hooks.UserPromptSubmit[0].hooks[0].command, /user-prompt-submit\.mjs/);
  assert.match(hooks.hooks.PreToolUse[0].hooks[0].command, /pre-tool-use\.mjs/);
  assert.match(hooks.hooks.PostToolUse[0].hooks[0].command, /tool-result\.mjs/);
  assert.match(hooks.hooks.Stop[0].hooks[0].command, /stop\.mjs/);
  assert.match(hooks.hooks.Stop[0].hooks[0].command, /CLAUDE_PLUGIN_ROOT/);
  assert.match(claudeHooks.hooks.UserPromptExpansion[0].hooks[0].command, /user-prompt-submit\.mjs/);
  assert.match(claudeHooks.hooks.PostToolUseFailure[0].hooks[0].command, /tool-result\.mjs/);
  assert.deepEqual(mcpConfig.mcpServers.devflow.command, "npx");
  assert.deepEqual(mcpConfig.mcpServers.devflow.args, ["--yes", "devflow-native@latest", "mcp", "stdio"]);

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

  assert.match(statusSkill, /devflow status --json/);
  assert.match(doctorSkill, /devflow doctor --json/);
  assert.match(harnessSkill, /devflow harness inspect/);
  assert.match(workSkill, /devflow work list --json/);
  assert.match(gatesSkill, /devflow gates run/);
  assert.match(reviewSkill, /devflow review request/);
  assert.match(reviewSkill, /devflow review record/);

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
  assert.match(startCommand, /devflow doctor --json/);
  assert.match(startCommand, /devflow status --json/);
  assert.match(statusCommand, /devflow status --json/);
  assert.match(explainCommand, /devflow explain/);
  assert.match(explainCommand, /plain-language/);
  assert.match(reviewCommand, /devflow review/);
  assert.match(finishCommand, /devflow finish/);
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
    prompt: "continue",
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
  assert.deepEqual(Object.keys(userPrompt.hookSpecificOutput).sort(), ["additionalContext", "hookEventName"]);
  assert.equal(stop.hookSpecificOutput.hookEventName, "Stop");
  assert.match(stop.hookSpecificOutput.additionalContext, /Devflow stop context/);
  assert.match(stop.hookSpecificOutput.additionalContext, /devflow review request/);
  assert.match(stop.hookSpecificOutput.additionalContext, /devflow review record/);
  assert.match(stop.hookSpecificOutput.additionalContext, /Current compact status/);
});

test("repo-local tool hooks block shell mismatch and record mistake candidates", async () => {
  const blocked = await runHook("plugins/devflow/hooks/pre-tool-use.mjs", {
    hook_event_name: "PreToolUse",
    cwd: process.cwd(),
    platform: { name: "windows-powershell" },
    tool_name: "Bash",
    tool_input: {
      command: "Get-Content -LiteralPath packages/core/src/index.js | Select-Object -Index 108..156",
    },
  });
  const heredocBlocked = await runHook("plugins/devflow/hooks/pre-tool-use.mjs", {
    hook_event_name: "PreToolUse",
    cwd: process.cwd(),
    platform: { name: "windows-powershell" },
    tool_name: "Bash",
    tool_input: {
      command: "node packages/mcp/src/stdio.js << 'EOF'",
    },
  });
  const toolResult = await runHook("plugins/devflow/hooks/tool-result.mjs", {
    hook_event_name: "PostToolUseFailure",
    cwd: process.cwd(),
    platform: { name: "windows-powershell" },
    tool_name: "Bash",
    tool_input: {
      command: "node packages/mcp/src/stdio.js << 'EOF'",
    },
    error: "ParserError: Missing file specification after redirection operator.",
    record: false,
  });

  assert.equal(blocked.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(blocked.hookSpecificOutput.permissionDecision, "deny");
  assert.match(blocked.hookSpecificOutput.permissionDecisionReason, /Select-Object -Index/);
  assert.equal(heredocBlocked.hookSpecificOutput.permissionDecision, "deny");
  assert.match(heredocBlocked.hookSpecificOutput.permissionDecisionReason, /Bash heredoc/);
  assert.equal(toolResult.hookSpecificOutput.hookEventName, "PostToolUseFailure");
  assert.match(toolResult.hookSpecificOutput.additionalContext, /powershell-bash-heredoc-redirection/);
});

test("repo-local pre-tool hook reads promoted config-backed mistake rules", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-hook-promoted-rule-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    JSON.stringify(
      {
        mistakes: {
          rules: [
            {
              id: "custom-node-eval-rule",
              target: "hook",
              status: "active",
              pattern: "node -e",
              reason: "This repo routes inline Node scripts through checked-in smoke files.",
              correction: "Use a checked-in smoke file instead of node -e.",
              appliesTo: ["windows-powershell"],
            },
          ],
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const blocked = await runHook("plugins/devflow/hooks/pre-tool-use.mjs", {
    hook_event_name: "PreToolUse",
    cwd: repoPath,
    platform: { name: "windows-powershell" },
    tool_name: "Bash",
    tool_input: {
      command: "node -e \"console.log('inline')\"",
    },
  });

  assert.equal(blocked.hookSpecificOutput.permissionDecision, "deny");
  assert.match(blocked.hookSpecificOutput.permissionDecisionReason, /custom-node-eval-rule/);
  assert.match(blocked.hookSpecificOutput.permissionDecisionReason, /checked-in smoke file/);
});

test("repo-local prompt hook understands terse Korean maintainer commands", async () => {
  const continuePrompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "ㄱㄱ 진행해",
  });
  const finishPrompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "끝내",
  });
  const shorthandFinishPrompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "ㄱㄱ 진행해 끝내",
  });

  assert.match(continuePrompt.hookSpecificOutput.additionalContext, /continue_or_start/);
  assert.match(finishPrompt.hookSpecificOutput.additionalContext, /finish/);
  assert.match(shorthandFinishPrompt.hookSpecificOutput.additionalContext, /finish/);
});

test("repo-local prompt hook applies workflow intent priority and next actions", async () => {
  const handoffPrompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "여기까지 하고 다음 세션 프롬프트 줘",
  });
  const prPrompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "pr ㄱㄱ",
  });
  const artifactPrompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "html 리포트 ㄱㄱ",
  });

  assert.match(handoffPrompt.hookSpecificOutput.additionalContext, /handoff/);
  assert.match(handoffPrompt.hookSpecificOutput.additionalContext, /devflow prompt next/);
  assert.match(prPrompt.hookSpecificOutput.additionalContext, /review_or_pr/);
  assert.match(prPrompt.hookSpecificOutput.additionalContext, /devflow review request/);
  assert.match(artifactPrompt.hookSpecificOutput.additionalContext, /artifact_requested/);
  assert.match(artifactPrompt.hookSpecificOutput.additionalContext, /devflow status --json/);
});

test("repo-local prompt hook rewrites vague maintainer requests into agent context", async () => {
  const prompt = await runHook("plugins/devflow/hooks/user-prompt-submit.mjs", {
    hook_event_name: "UserPromptSubmit",
    cwd: process.cwd(),
    prompt: "클코랑 코덱스에서 내 기능 전부 더 네이티브 하게 만들어줘",
  });

  assert.equal(prompt.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.deepEqual(Object.keys(prompt.hookSpecificOutput).sort(), ["additionalContext", "hookEventName"]);
  assert.match(prompt.hookSpecificOutput.additionalContext, /Devflow prompt interpretation context/);
  assert.match(prompt.hookSpecificOutput.additionalContext, /Agent-ready prompt/);
  assert.match(prompt.hookSpecificOutput.additionalContext, /Objective:/);
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

test("repo-local stop hook reports completion guard through Codex hook context", async () => {
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

  assert.equal(blocked.decision, undefined);
  assert.equal(blocked.hookSpecificOutput.hookEventName, "Stop");
  assert.match(blocked.hookSpecificOutput.additionalContext, /Devflow review guard/);
  assert.match(blocked.hookSpecificOutput.additionalContext, /devflow review request --work guarded-work/);
  assert.match(blocked.hookSpecificOutput.additionalContext, /record the review outcome/);
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
