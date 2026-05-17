#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, isAbsolute, join } from "node:path";
import { cwd, exit } from "node:process";

import {
  discoverCodexSessions,
  findCodexSessionFiles,
  parseCodexSessionJsonl,
} from "../../adapters/src/index.js";
import {
  createDashboardServedHtml,
  DASHBOARD_WEB_CSS,
  DASHBOARD_WEB_JS,
  renderDashboardGatesPage,
  renderDashboardHandoffsPage,
  renderDashboardMapsPage,
  renderDashboardSessionsPage,
  renderDashboardWorkPage,
} from "../../web/src/index.js";
import {
  createDashboardSummary,
  createDashboardHtml,
  createFinishSummary,
  createDoctorSummary,
  createInitPlan,
  createNextPrompt,
  createPromptRewrite,
  createSessionAttachPlan,
  createSessionListSummary,
  createSplitPlan,
  createStatusSummary,
  createTermExplanation,
  createWorkListSummary,
  parseGitStatusLines,
  parseSessionListLimit,
  parseSessionListSince,
  parseSessionListSort,
  readProjectHealth,
  readDashboardMaps,
  readDevflowConfig,
  readDevflowState,
  readMistakeMemory,
  recordFinishEvent,
  recordManualSessionNoteEvent,
  recordSessionAttachedEvent,
  recordSplitWorkEvents,
  recordWorkBlockedEvent,
  recordWorkCreatedEvent,
  recordWorkReadyEvent,
  recordWorkStartedEvent,
  runConfiguredGate,
  writeInitPlan,
} from "../../core/src/index.js";

const args = process.argv.slice(2);
const command = args[0];

try {
  if (command === "init") {
    await renderInit(args.slice(1));
  } else if (command === "health") {
    await renderHealth(args.slice(1));
  } else if (command === "status") {
    await renderStatus(args.slice(1));
  } else if (command === "dashboard" && args[1] === "serve") {
    await renderDashboardServe(args.slice(2));
  } else if (command === "dashboard") {
    await renderDashboard(args.slice(1));
  } else if (command === "explain") {
    renderExplain(args.slice(1));
  } else if (command === "split") {
    await renderSplit(args.slice(1));
  } else if (command === "finish") {
    await renderFinish(args.slice(1));
  } else if (command === "doctor") {
    await renderDoctor(args.slice(1));
  } else if (command === "gates" && args[1] === "run") {
    await renderGatesRun(args.slice(2));
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
  } else if (command === "work" && args[1] === "create") {
    await renderWorkCreate(args.slice(2));
  } else if (command === "work" && args[1] === "start") {
    await renderWorkStart(args.slice(2));
  } else if (command === "work" && args[1] === "ready") {
    await renderWorkReady(args.slice(2));
  } else if (command === "work" && args[1] === "block") {
    await renderWorkBlock(args.slice(2));
  } else if (command === "work" && args[1] === "list") {
    await renderWorkList(args.slice(2));
  } else {
    throw new Error(`Unknown command: ${args.join(" ") || "<none>"}`);
  }
} catch (error) {
  console.error(error.message);
  exit(1);
}

async function renderInit(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const plan = createInitPlan({
    repo: repoPath,
    profile: options.profile,
    platform: options.platform ?? defaultPlatformName(),
  });

  if (options.confirm) {
    const result = await writeInitPlan(repoPath, plan, { confirmed: true });
    render({ ...plan, result }, options.json);
    return;
  }

  render(plan, options.json);
}

async function renderHealth(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const config = await readDevflowConfig(repoPath);
  const summary = await readProjectHealth(repoPath, config);

  render(summary, options.json);
}

async function renderStatus(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const config = await readDevflowConfig(repoPath);
  const summary = createStatusSummary({
    repo: readGitRepo(repoPath),
    changedFiles: readChangedFiles(repoPath),
    state,
    workItemId: options.work,
    agent: options.agent,
    gates: config.gates ?? [{ id: "docs-check", command: "npm run docs:check", recommended: true }],
    warnings: config.warnings,
  });

  if (options.simple) {
    renderSimpleStatus(summary);
    return;
  }

  render(summary, options.json);
}

async function renderDashboard(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const maps = await readDashboardMaps(repoPath);
  const summary = createDashboardSummary({
    repo: readGitRepo(repoPath),
    state,
    maps,
  });

  if (options.html) {
    const htmlPath = isAbsolute(options.html) ? options.html : join(repoPath, options.html);
    const htmlParent = dirname(htmlPath);
    if (htmlParent && htmlParent !== ".") {
      await mkdir(htmlParent, { recursive: true });
    }
    await writeFile(htmlPath, createDashboardHtml(summary), "utf8");

    render(
      {
        schemaVersion: "0.1",
        command: "dashboard_html",
        path: htmlPath,
        dashboard: summary,
      },
      options.json,
    );
    return;
  }

  if (options.json) {
    render(summary, true);
    return;
  }

  renderDashboardText(summary);
}

async function renderDashboardServe(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const port = options.port === undefined ? 8787 : Number.parseInt(options.port, 10);
  const host = options.host ?? "127.0.0.1";

  if (Number.isNaN(port) || port < 0 || port > 65535) {
    throw new Error("dashboard serve requires --port <0-65535>");
  }

  const server = createServer(async (request, response) => {
    const requestPath = request.url?.split("?")[0] ?? "/";
    const state = await readDevflowState(repoPath);
    const maps = await readDashboardMaps(repoPath);
    const summary = createDashboardSummary({
      repo: readGitRepo(repoPath),
      state,
      maps,
    });

    if (requestPath === "/dashboard.json") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(summary, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/assets/dashboard.css") {
      response.writeHead(200, { "content-type": "text/css; charset=utf-8" });
      response.end(DASHBOARD_WEB_CSS, () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/assets/dashboard.js") {
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      response.end(DASHBOARD_WEB_JS, () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/gates.json") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(summary.gates, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/gates") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardGatesPage(summary), () => closeServerOnce(server, options.once));
      return;
    }

    const gateJsonMatch = requestPath.match(/^\/gates\/([^/]+)\.json$/);
    if (gateJsonMatch) {
      const gate = findDashboardGate(summary, decodeURIComponent(gateJsonMatch[1]));
      if (!gate) {
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(`${JSON.stringify({ error: "gate not found" })}\n`, () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(gate, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    const gateHtmlMatch = requestPath.match(/^\/gates\/([^/]+)$/);
    if (gateHtmlMatch) {
      const gate = findDashboardGate(summary, decodeURIComponent(gateHtmlMatch[1]));
      if (!gate) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end(renderDashboardNotFoundPage("Gate not found"), () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardGatePage(gate), () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/sessions.json") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(summary.sessions, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/sessions") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardSessionsPage(summary), () => closeServerOnce(server, options.once));
      return;
    }

    const sessionJsonMatch = requestPath.match(/^\/sessions\/(.+)\.json$/);
    if (sessionJsonMatch) {
      const session = findDashboardSession(summary, decodeURIComponent(sessionJsonMatch[1]));
      if (!session) {
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(`${JSON.stringify({ error: "session not found" })}\n`, () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(session, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    const sessionHtmlMatch = requestPath.match(/^\/sessions\/(.+)$/);
    if (sessionHtmlMatch) {
      const session = findDashboardSession(summary, decodeURIComponent(sessionHtmlMatch[1]));
      if (!session) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end(renderDashboardNotFoundPage("Session not found"), () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardSessionPage(session), () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/handoffs.json") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(summary.handoffs, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/handoffs") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardHandoffsPage(summary), () => closeServerOnce(server, options.once));
      return;
    }

    const handoffJsonMatch = requestPath.match(/^\/handoffs\/([^/]+)\.json$/);
    if (handoffJsonMatch) {
      const handoff = findDashboardHandoff(summary, decodeURIComponent(handoffJsonMatch[1]));
      if (!handoff) {
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(`${JSON.stringify({ error: "handoff not found" })}\n`, () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(handoff, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    const handoffHtmlMatch = requestPath.match(/^\/handoffs\/([^/]+)$/);
    if (handoffHtmlMatch) {
      const handoff = findDashboardHandoff(summary, decodeURIComponent(handoffHtmlMatch[1]));
      if (!handoff) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end(renderDashboardNotFoundPage("Handoff not found"), () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardHandoffPage(handoff), () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/maps.json") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(summary.maps, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    if (requestPath === "/maps") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardMapsPage(summary), () => closeServerOnce(server, options.once));
      return;
    }

    const mapJsonMatch = requestPath.match(/^\/maps\/([^/]+)\.json$/);
    if (mapJsonMatch) {
      const map = findDashboardMap(summary, decodeURIComponent(mapJsonMatch[1]));
      if (!map) {
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(`${JSON.stringify({ error: "map not found" })}\n`, () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(map, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    const mapHtmlMatch = requestPath.match(/^\/maps\/([^/]+)$/);
    if (mapHtmlMatch) {
      const map = findDashboardMap(summary, decodeURIComponent(mapHtmlMatch[1]));
      if (!map) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end(renderDashboardNotFoundPage("Map not found"), () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardMapPage(map), () => closeServerOnce(server, options.once));
      return;
    }

    const workJsonMatch = requestPath.match(/^\/work\/([^/]+)\.json$/);
    if (workJsonMatch) {
      const workItem = findDashboardWorkItem(summary, decodeURIComponent(workJsonMatch[1]));
      if (!workItem) {
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(`${JSON.stringify({ error: "work item not found" })}\n`, () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify(workItem, null, 2)}\n`, () => closeServerOnce(server, options.once));
      return;
    }

    const workHtmlMatch = requestPath.match(/^\/work\/([^/]+)$/);
    if (workHtmlMatch) {
      const workItem = findDashboardWorkItem(summary, decodeURIComponent(workHtmlMatch[1]));
      if (!workItem) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end(renderDashboardNotFoundPage("Work item not found"), () =>
          closeServerOnce(server, options.once),
        );
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDashboardWorkPage(workItem), () => closeServerOnce(server, options.once));
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(createDashboardServedHtml(createDashboardHtml(summary)), () => closeServerOnce(server, options.once));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;
  render(
    {
      schemaVersion: "0.1",
      command: "dashboard_serve",
      url: `http://${host}:${resolvedPort}/`,
      jsonUrl: `http://${host}:${resolvedPort}/dashboard.json`,
      repo: {
        absolutePath: repoPath,
      },
    },
    options.json,
  );
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

  if (options.register) {
    plan.registration = await recordSplitWorkEvents(repoPath, plan, {
      start: Boolean(options.start),
    });
  }

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

async function renderGatesRun(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const id = positional[0];
  const config = await readDevflowConfig(repoPath);
  const summary = await runConfiguredGate(repoPath, {
    id,
    gates: config.gates,
    workItemId: options.work,
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
  const limit = parseSessionListLimit(options.limit, "sessions list requires --limit <positive-integer>.");
  const since = parseSessionListSince(options.since, "sessions list requires --since <iso-date>.");
  const sort = parseSessionListSort(
    options.sort,
    "sessions list requires --sort observedAt:asc|observedAt:desc.",
  );
  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: {
      absolutePath: repoPath,
    },
    state,
    agent: options.agent,
    workItemId: options.work,
    since,
    sort,
    limit,
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

async function renderWorkCreate(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkCreatedEvent(repoPath, {
    id: options.id,
    title: options.title,
    description: options.description,
    ownedPaths: collectRepeated(options["owned-path"]),
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_create",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkStart(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkStartedEvent(repoPath, {
    id: positional[0] ?? options.id,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_start",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkReady(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkReadyEvent(repoPath, {
    id: positional[0] ?? options.id,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_ready",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkBlock(argsForCommand) {
  const { options, positional } = parseOptionsAndPositionals(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const event = await recordWorkBlockedEvent(repoPath, {
    id: positional[0] ?? options.id,
    reason: options.reason,
  });

  render(
    {
      schemaVersion: "0.1",
      command: "work_block",
      workItem: event.payload,
      event,
    },
    options.json,
  );
}

async function renderWorkList(argsForCommand) {
  const options = parseOptions(argsForCommand);
  const repoPath = options.repo ?? cwd();
  const state = await readDevflowState(repoPath);
  const summary = createWorkListSummary({
    repo: {
      absolutePath: repoPath,
    },
    state,
    status: options.status,
  });

  if (options.json) {
    render(summary, true);
    return;
  }

  renderWorkListText(summary);
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
    `Work filter: ${summary.filters.workItemId ?? "all"}`,
    `Agent filter: ${summary.filters.agent ?? "all"}`,
    `Changed files: ${changedCount}`,
    `Sessions: ${summary.sessions.attached.length}`,
    `Latest session: ${latestSession?.workItemId ?? "none"}`,
    `Latest session id: ${latestSession?.sessionId ?? "none"}`,
    `Latest session time: ${latestSession?.observedAt ?? "none"}`,
    `Latest session agent: ${latestSession?.agent ?? "none"}`,
    `Latest session kind: ${latestSession?.kind ?? "none"}`,
    `Latest session summary: ${latestSession?.summary ?? "none"}`,
    `Latest session files: ${latestSession ? (latestSession.changedFiles?.length ?? 0) : "none"}`,
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
  if (summary.filters.agent) {
    lines.push(`Agent: ${summary.filters.agent}`);
  }
  if (summary.filters.since) {
    lines.push(`Since: ${summary.filters.since}`);
  }
  if (summary.filters.sort) {
    lines.push(`Sort: ${summary.filters.sort}`);
  }
  if (summary.filters.limit) {
    lines.push(`Limit: ${summary.filters.limit}`);
    lines.push(`Total: ${summary.totalCount}`);
  }
  if (summary.warnings.length > 0) {
    lines.push(`Warnings: ${summary.warnings.length}`);
  }

  for (const session of summary.sessions) {
    const changedFileCount = session.changedFiles?.length;
    const detail = session.summary ?? `${session.sessionId} files:${changedFileCount ?? 0}`;
    lines.push(
      `${session.kind ?? "session"} ${session.workItemId ?? "unknown"} ${session.agent ?? "unknown"} ${session.observedAt ?? "unknown-time"} ${detail}`,
    );
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderWorkListText(summary) {
  const lines = ["Work items", `Filter: ${summary.filters.status ?? "all"}`, `Count: ${summary.count}`];
  if (summary.warnings.length > 0) {
    lines.push(`Warnings: ${summary.warnings.length}`);
  }

  for (const item of summary.items) {
    lines.push(`${item.status} ${item.id} ${item.title}`);
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function renderDashboardText(summary) {
  const lines = [
    "Devflow dashboard",
    `Active work: ${summary.work.counts.active}`,
    `Blocked work: ${summary.work.counts.blocked}`,
    `Ready to finish: ${summary.work.counts.readyToFinish}`,
    `Latest gates: ${summary.gates.counts.total}`,
    `Failing gates: ${summary.gates.counts.failed}`,
    `Sessions: ${summary.sessions.counts.total}`,
    `Latest session: ${summary.sessions.latest?.workItemId ?? "none"}`,
    `Latest handoff: ${summary.handoffs.latest?.workItemId ?? "none"}`,
    `Stale handoffs: ${summary.handoffs.counts.stale}`,
  ];

  for (const item of summary.work.active) {
    lines.push(`active ${item.id} ${item.title}`);
  }

  for (const item of summary.work.blocked) {
    const reason = item.blockedReason ? ` reason:${item.blockedReason}` : "";
    lines.push(`blocked ${item.id} ${item.title}${reason}`);
  }

  for (const item of summary.work.readyToFinish) {
    lines.push(`ready ${item.id} ${item.title}`);
  }

  for (const gate of summary.gates.latest) {
    lines.push(`gate ${gate.id} ${gate.status} ${gate.command}`);
  }

  for (const session of summary.sessions.recent) {
    lines.push(`session ${session.agent} ${session.workItemId} ${session.kind}`);
  }

  if (summary.recommendations.length > 0) {
    lines.push(`Next: ${summary.recommendations[0].message}`);
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function findDashboardGate(summary, id) {
  return (summary.gates.latest ?? []).find((gate) => gate.id === id);
}

function renderDashboardGatePage(gate) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Gate Detail</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #171a1f; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    dl { display: grid; grid-template-columns: 140px 1fr; gap: 10px 16px; background: #fff; border: 1px solid #d9dde5; border-radius: 8px; padding: 16px; }
    dt { color: #5b6270; font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Devflow Gate Detail</h1>
    <dl>
      <dt>ID</dt><dd>${escapeHtml(gate.id)}</dd>
      <dt>Status</dt><dd>${escapeHtml(gate.status)}</dd>
      <dt>Command</dt><dd>${escapeHtml(gate.command)}</dd>
      <dt>Work</dt><dd>${escapeHtml(gate.workItemId ?? "none")}</dd>
    </dl>
  </main>
</body>
</html>
`;
}

function findDashboardSession(summary, sessionId) {
  return (summary.sessions.recent ?? []).find((session) => session.sessionId === sessionId);
}

function renderDashboardSessionPage(session) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Session Detail</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #171a1f; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    dl { display: grid; grid-template-columns: 140px 1fr; gap: 10px 16px; background: #fff; border: 1px solid #d9dde5; border-radius: 8px; padding: 16px; }
    dt { color: #5b6270; font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Devflow Session Detail</h1>
    <dl>
      <dt>ID</dt><dd>${escapeHtml(session.sessionId)}</dd>
      <dt>Agent</dt><dd>${escapeHtml(session.agent)}</dd>
      <dt>Kind</dt><dd>${escapeHtml(session.kind)}</dd>
      <dt>Work</dt><dd>${escapeHtml(session.workItemId ?? "none")}</dd>
      <dt>Observed</dt><dd>${escapeHtml(session.observedAt ?? "unknown")}</dd>
      <dt>Summary</dt><dd>${escapeHtml(session.summary ?? "none")}</dd>
    </dl>
  </main>
</body>
</html>
`;
}

function findDashboardHandoff(summary, workItemId) {
  return [summary.handoffs.latest, ...(summary.handoffs.stale ?? [])]
    .filter(Boolean)
    .find((handoff) => handoff.workItemId === workItemId);
}

function renderDashboardHandoffPage(handoff) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Handoff Detail</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #171a1f; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    dl { display: grid; grid-template-columns: 140px 1fr; gap: 10px 16px; background: #fff; border: 1px solid #d9dde5; border-radius: 8px; padding: 16px; }
    dt { color: #5b6270; font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Devflow Handoff Detail</h1>
    <dl>
      <dt>Work</dt><dd>${escapeHtml(handoff.workItemId)}</dd>
      <dt>Title</dt><dd>${escapeHtml(handoff.title ?? "Untitled handoff")}</dd>
      <dt>Observed</dt><dd>${escapeHtml(handoff.observedAt ?? "unknown")}</dd>
      <dt>Prompt</dt><dd>${escapeHtml(handoff.prompt ?? "none")}</dd>
    </dl>
  </main>
</body>
</html>
`;
}

function findDashboardMap(summary, id) {
  return (summary.maps.items ?? []).find((map) => map.id === id);
}

function renderDashboardMapPage(map) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Map Detail</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #171a1f; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    dl { display: grid; grid-template-columns: 140px 1fr; gap: 10px 16px; background: #fff; border: 1px solid #d9dde5; border-radius: 8px; padding: 16px; }
    dt { color: #5b6270; font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Devflow Map Detail</h1>
    <dl>
      <dt>ID</dt><dd>${escapeHtml(map.id)}</dd>
      <dt>Title</dt><dd>${escapeHtml(map.title)}</dd>
      <dt>Path</dt><dd>${escapeHtml(map.path)}</dd>
    </dl>
  </main>
</body>
</html>
`;
}

function findDashboardWorkItem(summary, id) {
  return [
    ...(summary.work.active ?? []),
    ...(summary.work.blocked ?? []),
    ...(summary.work.readyToFinish ?? []),
  ].find((item) => item.id === id);
}

function renderDashboardNotFoundPage(message) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Not Found</title>
</head>
<body>
  <main>
    <h1>${escapeHtml(message)}</h1>
  </main>
</body>
</html>
`;
}

function closeServerOnce(server, once) {
  if (once) {
    server.close();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    if (key === "json" || key === "simple" || key === "guided" || key === "confirm" || key === "register" || key === "start" || key === "once") {
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
  return parseGitStatusLines(runGit(repoPath, ["status", "--short", "-uall"], { trim: false }));
}

function runGit(repoPath, gitArgs, options = {}) {
  try {
    const output = execFileSync("git", gitArgs, {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return options.trim === false ? output : output.trim();
  } catch {
    return "";
  }
}
