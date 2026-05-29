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
  if (/(finish|done|complete|wrap up|마무리|완료|끝내|닫아|마감)/i.test(normalized)) {
    return "finish";
  }
  if (/(handoff|next session|next-session|다음 세션|다음세션|인수인계|프롬프트 줘|프롬프트줘|여기까지)/i.test(normalized)) {
    return "handoff";
  }
  if (/(review|pull request|pr|리뷰)/i.test(normalized)) {
    return "review_or_pr";
  }
  if (/(시각화|html|artifact|리포트|보드)/i.test(normalized)) {
    return "artifact_requested";
  }
  if (/^(continue|next|go|proceed|resume|계속|다음|진행|진행해|가자|ㄱㄱ|고고)/i.test(normalized)) {
    return "continue_or_start";
  }
  return null;
}

export function intentNextActions(intent) {
  switch (intent) {
    case "finish":
      return [
        "devflow finish --guided",
        "If finish reports review.nextAction.command, run it and record the outcome with review.nextAction.recordCommand.",
      ];
    case "handoff":
      return [
        "devflow status --json",
        "devflow prompt next",
        "Record changed files, verification, risks, and a copy-paste next-session prompt.",
      ];
    case "review_or_pr":
      return [
        "devflow review request --work <work-id> --target reviewer --persona strict-reviewer",
        "devflow review record --work <work-id> --reviewer <reviewer> --status <passed|changes-requested> --summary <summary>",
      ];
    case "artifact_requested":
      return [
        "devflow status --json",
        "Generate an artifact only when the repo state is visually dense or the maintainer explicitly asked for it.",
      ];
    case "continue_or_start":
      return [
        "devflow status --json",
        "devflow prompt latest",
        "Continue from repo state and latest handoff before asking the maintainer for more context.",
      ];
    default:
      return [];
  }
}
