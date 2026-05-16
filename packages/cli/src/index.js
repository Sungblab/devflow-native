#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { cwd, exit } from "node:process";

import {
  discoverCodexSessions,
  findCodexSessionFiles,
  parseCodexSessionJsonl,
} from "../../adapters/src/index.js";
import {
  createFinishSummary,
  createDoctorSummary,
  createNextPrompt,
  createPromptRewrite,
  createSessionAttachPlan,
  createSessionListSummary,
  createSplitPlan,
  createStatusSummary,
  createTermExplanation,
  parseGitStatusLines,
  readDevflowConfig,
  readDevflowState,
  readMistakeMemory,
  recordFinishEvent,
  recordManualSessionNoteEvent,
  recordSessionAttachedEvent,
} from "../../core/src/index.js";

const args = process.argv.slice(2);
const command = args[0];

try {
  if (command === "status") {
    await renderStatus(args.slice(1));
  } else if (command === "explain") {
    renderExplain(args.slice(1));
  } else if (command === "split") {
    await renderSplit(args.slice(1));
  } else if (command === "finish") {
    await renderFinish(args.slice(1));
  } else if (command === "doctor") {
    await renderDoctor(args.slice(1));
  } else if (command === "prompt" && args[1] === "next") {
    renderNextPrompt(args.slice(2));
  } else if (command === "prompt" && args[1] === "rewrite") {
    renderPromptRewrite(args.slice(2));
  } else if (command === "sessions" && args[1] === "codex") {
    await renderCodexSessions(args.slice(2));
  } else if (command === "sessions" && args[1] === "attach-plan") {
    await renderSessionAttachPlan(args.slice(2));
  } else if (command === "sessions" && args[1] === "attach") {
    await renderSessionAttach(args.slice(2));
  } else if (command === "sessions" && args[1] === "list") {
    await renderSessionList(args.slice(2));
  } else if (command === "sessions" && args[1] === "note") {
    await renderSessionNote(args.slice(2));
  } else {
    throw new Error(`Unknown command: ${args.join(" ") || "<none>"}`);
  }
} catch (error) {
  console.error(error.message);
  exit(1);
}

async function renderStatus(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const summary = createStatusSummary({
    repo: readGitRepo(repoPath),
    changedFiles: readChangedFiles(repoPath),
    state,
    gates: [{ id: "docs-check", command: "npm run docs:check", recommended: true }],
  });

  if (options.simple) {
    renderSimpleStatus(summary);
    return;
  }

  render(summary, options.json);
}

function renderExplain(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const explanation = createTermExplanation({
    term: positional.join(" "),
    context: options.context,
  });

  render(explanation, options.json);
}

async function renderSplit(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const config = await readDevflowConfig(repoPath);
  const plan = createSplitPlan({
    runId: options["run-id"],
    goal: options.goal,
    sessionCount: options.sessions ? Number.parseInt(options.sessions, 10) : undefined,
    profile: options.profile,
    platform: options.platform ?? defaultPlatformName(),
    baseBranch: options["base-branch"],
    baseRef: options["base-ref"],
    worktreeRoot: options["worktree-root"],
    config,
  });

  render(plan, options.json);
}

async function renderFinish(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const gates = collectRepeated(options.gate).map(parseGate);
  const risks = collectRepeated(options.risk).map((message) => ({
    severity: "low",
    message,
  }));

  const summary = createFinishSummary({
    workItem: {
      id: options.work ?? "local-work",
      title: options.title ?? options.work ?? "Local work",
    },
    intent: options.intent ?? "Record local completion evidence.",
    changedFiles: readChangedFiles(repoPath),
    gates,
    skipped: collectRepeated(options.skipped).map((reason, index) => ({
      id: `skipped-${index + 1}`,
      reason,
    })),
    risks,
    nextTask: options["next-task"],
  });

  await recordFinishEvent(repoPath, summary);
  if (options.guided) {
    renderGuidedFinish(summary);
    return;
  }

  render(summary, options.json);
}

async function renderDoctor(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const memory = await readMistakeMemory(repoPath);
  const summary = createDoctorSummary({
    repo: {
      absolutePath: repoPath,
      root: ".",
    },
    platform: {
      name: options.platform ?? defaultPlatformName(),
    },
    tools: {
      git: detectTool("git"),
      rg: detectTool("rg"),
      gh: detectTool("gh"),
      node: detectTool("node"),
    },
    mistakes: memory.mistakes,
    warnings: memory.warnings,
  });

  render(summary, options.json);
}

function renderNextPrompt(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const prompt = createNextPrompt({
    objective: options.objective,
    changedFiles: readChangedFiles(options.repo ?? cwd()).map((file) => file.path),
    commands: collectRepeated(options.command),
    risks: collectRepeated(options.risk),
    nextTask: options["next-task"] ?? "Inspect `devflow status` and continue the MVP loop.",
  });

  process.stdout.write(prompt);
}

function renderPromptRewrite(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const rewrite = createPromptRewrite({
    request: options.request,
    context: options.context,
  });

  render(rewrite, options.json);
}

async function renderCodexSessions(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const candidates = await findCodexSessionFiles({
    codexHome: options["codex-home"],
  });
  const records = [];
  const warnings = [...candidates.warnings];

  for (const file of candidates.files) {
    try {
      const content = await readFile(file.path, "utf8");
      const record = parseCodexSessionJsonl(content, {
        sourcePath: file.path,
      });
      records.push(record);
      warnings.push(...record.warnings);
    } catch (error) {
      warnings.push(`Failed to read Codex session candidate ${file.path}: ${error.message}`);
    }
  }

  const summary = {
    schemaVersion: "0.1",
    command: "sessions_codex",
    repo: {
      absolutePath: repoPath,
    },
    files: candidates.files,
    discovery: discoverCodexSessions({
      repoPath,
      records,
    }),
    warnings,
  };

  render(summary, options.json);
}

async function renderSessionAttachPlan(argsForCommand) {
  const options = parseOptions(argsForCommand);
  if (!options.input) {
    throw new Error("sessions attach-plan requires --input <json-file>.");
  }

  const raw = await readFile(options.input, "utf8");
  const input = JSON.parse(raw);
  const plan = createSessionAttachPlan(input);

  render(plan, options.json);
}

async function renderSessionAttach(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();

  if (!options.input) {
    throw new Error("sessions attach requires --input <json-file>.");
  }

  if (!options.session) {
    throw new Error("sessions attach requires --session <session-id>.");
  }

  if (!options.confirm) {
    throw new Error("sessions attach requires --confirm.");
  }

  const raw = await readFile(options.input, "utf8");
  const input = JSON.parse(raw);
  const proposal = (input.proposals ?? []).find(
    (candidate) => candidate.sessionId === options.session,
  );

  if (!proposal) {
    throw new Error(`No attach proposal found for session: ${options.session}`);
  }

  const event = await recordSessionAttachedEvent(repoPath, proposal, {
    confirmed: true,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "session_attach",
      event,
    },
    options.json,
  );
}

async function renderSessionList(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: {
      absolutePath: repoPath,
    },
    state,
    workItemId: options.work,
  });

  if (options.json) {
    render(summary, true);
    return;
  }

  renderSessionListText(summary);
}

async function renderSessionNote(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();

  if (!options.work) {
    throw new Error("sessions note requires --work <work-item-id>.");
  }

  if (!options.summary) {
    throw new Error("sessions note requires --summary <text>.");
  }

  const event = await recordManualSessionNoteEvent(repoPath, {
    workItemId: options.work,
    agent: options.agent ?? "manual",
    summary: options.summary,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "session_note",
      event,
    },
    options.json,
  );
}

function defaultPlatformName() {
  if (process.platform === "win32") {
    return "windows-powershell";
  }

  if (process.platform === "darwin") {
    return "macos";
  }

  return "linux";
}

function detectTool(command) {
  try {
    execFileSync(command, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { available: true, command };
  } catch {
    return { available: false, command };
  }
}

function render(summary, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${summary.command}: ${summary.schemaVersion}\n`);
}

function renderSimpleStatus(summary) {
  const changedCount = summary.git.changedFiles.length;
  const nextGate = summary.gates.find((gate) => gate.recommended) ?? summary.gates[0];
  const handoff = summary.handoffs.latest;
  const latestSession = summary.sessions.attached.at(-1);
  const lines = [
    "Project status",
    `Branch: ${summary.repo.branch ?? "unknown"}`,
    `Changed files: ${changedCount}`,
    `Sessions: ${summary.sessions.attached.length}`,
    `Latest session: ${latestSession?.workItemId ?? "none"}`,
    `Latest handoff: ${handoff ? handoff.workItemId : "none"}`,
    `Next check: ${nextGate ? nextGate.command : "none"}`,
    `Next step: ${summary.recommendations[0]?.message ?? "Pick the next crisp work item."}`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderGuidedFinish(summary) {
  const lines = [
    "Finish checklist",
    `Work: ${summary.workItem.id}`,
    `Title: ${summary.workItem.title}`,
    `Changed files: ${summary.summary.changedFiles.length}`,
    `Verified gates: ${summary.evidence.gates.length}`,
    `Skipped checks: ${summary.evidence.skipped.length}`,
    `Known risks: ${summary.risks.length}`,
    `Review recommendation: ${summary.review.recommendation}`,
    `Next task: ${extractNextTask(summary.nextSession.prompt)}`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderSessionListText(summary) {
  const lines = [
    "Sessions",
    `Filter: ${summary.filters.workItemId ?? "all"}`,
    `Count: ${summary.count}`,
  ];

  for (const session of summary.sessions) {
    lines.push(
      `${session.kind ?? "session"} ${session.workItemId ?? "unknown"} ${session.agent ?? "unknown"} ${session.summary ?? session.sessionId}`,
    );
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function extractNextTask(prompt) {
  const match = prompt.match(/^Next task:\s*(.+)$/m);
  return match?.[1] ?? "Inspect devflow status and choose the next slice.";
}

function parseOptions(rawArgs) {
  return parseOptionsAndPositionals(rawArgs).options;
}

function parseOptionsAndPositionals(rawArgs) {
  const options = {};
  const positional = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    if (key === "json" || key === "simple" || key === "guided" || key === "confirm") {
      options[key] = true;
      continue;
    }

    const value = rawArgs[index + 1];
    index += 1;

    if (options[key] === undefined) {
      options[key] = value;
    } else if (Array.isArray(options[key])) {
      options[key].push(value);
    } else {
      options[key] = [options[key], value];
    }
  }

  return { options, positional };
}

function collectRepeated(value) {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parseGate(value) {
  const firstSeparator = value.indexOf(":");
  const lastSeparator = value.lastIndexOf(":");

  if (firstSeparator <= 0 || lastSeparator <= firstSeparator) {
    throw new Error(`Invalid gate format: ${value}`);
  }

  return {
    id: value.slice(0, firstSeparator),
    command: value.slice(firstSeparator + 1, lastSeparator),
    status: value.slice(lastSeparator + 1),
  };
}

function readGitRepo(repoPath) {
  return {
    absolutePath: repoPath,
    root: ".",
    branch: runGit(repoPath, ["branch", "--show-current"]) || null,
    head: runGit(repoPath, ["rev-parse", "--short", "HEAD"]) || null,
  };
}

function readChangedFiles(repoPath) {
  return parseGitStatusLines(runGit(repoPath, ["status", "--short", "-uall"]));
}

function runGit(repoPath, gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}
