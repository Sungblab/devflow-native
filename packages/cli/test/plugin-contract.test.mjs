import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  const mcpConfig = JSON.parse(await readFile("plugins/devflow/.mcp.json", "utf8"));
  const geminiConfig = JSON.parse(await readFile("templates/gemini/settings.json", "utf8"));
  const startSkill = await readFile("plugins/devflow/skills/start/SKILL.md", "utf8");
  const splitSkill = await readFile("plugins/devflow/skills/split/SKILL.md", "utf8");
  const finishSkill = await readFile("plugins/devflow/skills/finish/SKILL.md", "utf8");

  assert.equal(manifest.name, "devflow");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.match(manifest.interface.shortDescription, /project truth/i);
  assert.equal(claudeManifest.name, "devflow");
  assert.match(claudeManifest.description, /continuity/i);
  assert.ok(claudeManifest.keywords.includes("handoff"));
  assert.deepEqual(mcpConfig.mcpServers.devflow.command, "node");
  assert.deepEqual(mcpConfig.mcpServers.devflow.args, ["packages/mcp/src/stdio.js"]);
  assert.deepEqual(geminiConfig.mcpServers.devflow.command, "node");
  assert.deepEqual(geminiConfig.mcpServers.devflow.args, ["packages/mcp/src/stdio.js"]);
  assert.equal(geminiConfig.mcpServers.devflow.cwd, ".");
  assert.equal(geminiConfig.mcpServers.devflow.trust, false);

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

  assert.match(finishSkill, /devflow finish/);
  assert.match(finishSkill, /documentation needs an update/);
  assert.match(finishSkill, /Codex goal/);
  assert.match(finishSkill, /gh CLI/);
  assert.match(finishSkill, /commit, PR, continue, or next-session prompt/);
});
