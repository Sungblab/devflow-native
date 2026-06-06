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

export function writeHookJson(value = {}) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
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

export function parseJson(value) {
  if (!value) {
    return null;
  }
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
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

export function extractToolCommand(input = {}) {
  return (
    input.tool_input?.command ??
    input.tool_input?.script ??
    input.tool_input?.cmd ??
    input.command ??
    ""
  );
}

export function extractUserPrompt(input = {}) {
  return (
    input.prompt ??
    input.user_prompt ??
    input.message ??
    input.command ??
    input.expanded_prompt ??
    input.expansion ??
    ""
  );
}

export function shouldRewritePrompt(prompt = "", intent = null) {
  const trimmed = String(prompt).trim();
  if (!trimmed || intent) {
    return false;
  }

  if (trimmed.length >= 12) {
    return true;
  }

  return /[가-힣]/.test(trimmed) && /(해|줘|봐|ㄱㄱ|어케|계속)/.test(trimmed);
}

export function extractToolFailureText(input = {}) {
  return [
    input.error,
    input.stderr,
    input.tool_output?.stderr,
    input.tool_response?.stderr,
    input.output?.stderr,
    input.result?.stderr,
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractToolStdout(input = {}) {
  return [
    input.stdout,
    input.tool_output?.stdout,
    input.tool_response?.stdout,
    input.output?.stdout,
    input.result?.stdout,
  ]
    .filter(Boolean)
    .join("\n");
}

export function inferHookPlatform(input = {}) {
  const explicit = input.platform?.name ?? input.platform ?? input.os ?? "";
  if (/windows|powershell|pwsh/i.test(explicit)) {
    return "windows-powershell";
  }
  if (process.platform === "win32") {
    return "windows-powershell";
  }
  return "posix";
}

export function detectPreToolIssue(input = {}) {
  const command = extractToolCommand(input);
  const platform = inferHookPlatform(input);
  const windows = platform === "windows-powershell";

  if (!command || !windows) {
    return null;
  }

  if (/<<-?\s*['"]?[A-Za-z_][A-Za-z0-9_]*/.test(command)) {
    return {
      id: "powershell-bash-heredoc-redirection",
      reason: "Bash heredoc redirection is not valid in Windows PowerShell.",
      correction:
        "Use a PowerShell here-string piped to the command, for example @'... '@ | node script.mjs, or pass input through a file/API that the repo already uses.",
    };
  }

  if (/Select-Object\s+-Index\s+\d+\.\.\d+/i.test(command)) {
    return {
      id: "powershell-select-object-range-syntax",
      reason: "PowerShell parses an unparenthesized range as a string for Select-Object -Index.",
      correction: "Wrap the range in parentheses, for example Select-Object -Index (108..156).",
    };
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
