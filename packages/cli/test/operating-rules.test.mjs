import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("agent guide and finish skill encode end-of-answer operating rules", async () => {
  const agents = await readFile("AGENTS.md", "utf8");
  const finishSkill = await readFile("skills/devflow-finish/SKILL.md", "utf8");
  const mistakesExample = await readFile(".devflow/mistakes.example.json", "utf8");

  assert.match(agents, /Before every final response/);
  assert.match(agents, /Decide whether documentation needs an update/);
  assert.match(agents, /Ask whether to commit, open a PR, or continue/);
  assert.match(agents, /Prefer `gh` CLI for GitHub PR operations/);
  assert.match(agents, /Codex goal/);
  assert.match(agents, /Analyze the maintainer's natural-language request/);
  assert.match(agents, /Do not reduce examples to an exhaustive list/);
  assert.match(agents, /tooling version drift/);
  assert.match(agents, /Minimize maintainer questions/);
  assert.match(agents, /When the maintainer says to handle it autonomously/);

  assert.match(finishSkill, /documentation needs an update/);
  assert.match(finishSkill, /commit, PR, continue, or next-session prompt/);
  assert.match(finishSkill, /Prefer `gh` CLI/);
  assert.match(finishSkill, /Codex goal/);
  assert.match(finishSkill, /prompt intent analysis/);

  assert.match(mistakesExample, /github-pr-transport-preference/);
  assert.match(mistakesExample, /framework-major-version-drift/);
  assert.match(mistakesExample, /shell-file-io-friction/);
  assert.doesNotMatch(mistakesExample, /tailwind/i);
  assert.doesNotMatch(mistakesExample, /Sungbin/);
});
