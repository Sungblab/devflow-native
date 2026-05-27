import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function readHookInput() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (!input.trim()) {
    return {};
  }

  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

export function writeHookContext(eventName, additionalContext, extra = {}) {
  process.stdout.write(
    `${JSON.stringify({
      ...extra,
      hookSpecificOutput: {
        hookEventName: eventName,
        additionalContext,
        ...(extra.hookSpecificOutput ?? {}),
      },
    })}\n`,
  );
}

export function runDevflow(repoPath, args) {
  const localCli = join(repoPath, "packages", "cli", "src", "index.js");
  const command = existsSync(localCli) ? process.execPath : "devflow";
  const commandArgs = existsSync(localCli) ? [localCli, ...args] : args;

  try {
    return execFileSync(command, commandArgs, {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  } catch {
    return "";
  }
}

export function compactJson(value, maxLength = 4000) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...truncated...` : text;
}

export function readLatestHandoffPrompt(repoPath, maxLength = 2200) {
  try {
    const prompt = readFileSync(join(repoPath, ".devflow", "next-prompt.md"), "utf8").trim();
    return compactJson(prompt, maxLength);
  } catch {
    return "";
  }
}

export function detectIntent(prompt = "") {
  const normalized = prompt.trim().toLowerCase();
  if (/^(ㄱㄱ|고|go|이어가|계속|다음|알아서)/i.test(normalized)) {
    return "continue_or_start";
  }
  if (/(끝내|마무리|finish|done|완료)/i.test(normalized)) {
    return "finish";
  }
  if (/(pr\s*ㄱㄱ|pr|pull request|리뷰)/i.test(normalized)) {
    return "review_or_pr";
  }
  if (/(시각화|html|artifact|리포트|보드)/i.test(normalized)) {
    return "artifact_requested";
  }
  return null;
}
