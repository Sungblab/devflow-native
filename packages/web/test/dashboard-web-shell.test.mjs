import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createDashboardServedHtml,
  DASHBOARD_WEB_CSS,
  DASHBOARD_WEB_JS,
  renderDashboardLiveSection,
  renderDashboardRouteLinks,
  renderDashboardGatesPage,
  renderDashboardSessionsPage,
  renderDashboardHandoffsPage,
  renderDashboardMapsPage,
  renderDashboardWorkPage,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("web package owns the no-build dashboard shell assets", () => {
  const staticHtml = "<!doctype html><html><head><title>Devflow Dashboard</title></head><body><main>Fallback</main></body></html>";
  const servedHtml = createDashboardServedHtml(staticHtml);

  assert.match(servedHtml, /class="devflow-dashboard-shell"/);
  assert.match(servedHtml, /\/assets\/dashboard\.css/);
  assert.match(servedHtml, /\/assets\/dashboard\.js/);
  assert.match(DASHBOARD_WEB_CSS, /devflow-dashboard/);
  assert.ok(DASHBOARD_WEB_JS.includes('fetch("/dashboard.json")'));
});

test("web package renders dashboard JSON into a live summary section", () => {
  const html = renderDashboardLiveSection({
    work: { counts: { active: 2, blocked: 1, readyToFinish: 3 } },
    gates: { counts: { failing: 4 } },
    sessions: { counts: { total: 5 } },
    handoffs: { counts: { stale: 6 } },
  });

  assert.match(html, /Active work/);
  assert.match(html, />2</);
  assert.match(html, /Blocked/);
  assert.match(html, />1</);
  assert.match(html, /Failing gates/);
  assert.match(html, />4</);
  assert.match(html, /Sessions/);
  assert.match(html, />5</);
});

test("web package renders latest evidence details in the live section", () => {
  const html = renderDashboardLiveSection({
    work: { counts: { active: 1, blocked: 0, readyToFinish: 0 } },
    gates: {
      counts: { failing: 0 },
      latest: [{ id: "unit", status: "passed", command: "npm test" }],
    },
    sessions: {
      counts: { total: 1 },
      latest: {
        sessionId: "manual:dashboard",
        agent: "Codex",
        summary: "Rendered the dashboard panel.",
      },
    },
    handoffs: {
      counts: { stale: 0 },
      latest: {
        workItemId: "dashboard-web-panel",
        title: "Dashboard web panel",
        prompt: "Continue dashboard panel work.",
      },
    },
  });

  assert.match(html, /Latest gate/);
  assert.match(html, /unit/);
  assert.match(html, /passed/);
  assert.match(html, /Latest session/);
  assert.match(html, /Rendered the dashboard panel/);
  assert.match(html, /Latest handoff/);
  assert.match(html, /Continue dashboard panel work/);
});

test("web package renders route-aware dashboard links", () => {
  const html = renderDashboardRouteLinks({
    gates: { counts: { total: 2 } },
    sessions: { counts: { total: 3 } },
    handoffs: { counts: { stale: 1 } },
    maps: { counts: { total: 4 } },
    work: { counts: { active: 5, blocked: 6, readyToFinish: 7 } },
  });

  assert.match(html, /href="\/gates"/);
  assert.match(html, /Gates/);
  assert.match(html, /2/);
  assert.match(html, /href="\/sessions"/);
  assert.match(html, /3/);
  assert.match(html, /href="\/handoffs"/);
  assert.match(html, /href="\/maps"/);
  assert.match(html, /href="\/work"/);
  assert.match(html, /18/);
});

test("web package renders the gates slice page", () => {
  const html = renderDashboardGatesPage({
    gates: {
      counts: { passed: 1, failed: 1, total: 2 },
      latest: [
        { id: "docs-check", status: "passed", command: "npm run docs:check", workItemId: "docs" },
        { id: "unit", status: "failed", command: "npm test", workItemId: null },
      ],
    },
  });

  assert.match(html, /Devflow Gates/);
  assert.match(html, /1 passed \/ 1 failed \/ 2 total/);
  assert.match(html, /docs-check/);
  assert.match(html, /npm run docs:check/);
  assert.match(html, /unit/);
  assert.match(html, /failed/);
});

test("web package renders the sessions slice page", () => {
  const html = renderDashboardSessionsPage({
    sessions: {
      counts: { total: 2, manualNotes: 1, attached: 1 },
      recent: [
        {
          agent: "Codex",
          kind: "manual-note",
          workItemId: "dashboard-sessions",
          summary: "Moved session rendering into the web package.",
          sessionId: "manual:dashboard-sessions",
        },
        {
          agent: "Claude",
          kind: "attached",
          workItemId: null,
          summary: null,
          sessionId: "session-2",
        },
      ],
    },
  });

  assert.match(html, /Devflow Sessions/);
  assert.match(html, /2 total \/ 1 manual \/ 1 attached/);
  assert.match(html, /Codex/);
  assert.match(html, /dashboard-sessions/);
  assert.match(html, /Moved session rendering into the web package/);
  assert.match(html, /Claude/);
  assert.match(html, /session-2/);
});

test("web package renders the handoffs slice page", () => {
  const html = renderDashboardHandoffsPage({
    handoffs: {
      counts: { stale: 1 },
      latest: {
        workItemId: "dashboard-handoff-latest",
        title: "Latest dashboard handoff",
        prompt: "Continue from the latest handoff.",
      },
      stale: [
        {
          workItemId: "dashboard-handoff-stale",
          title: "Stale dashboard handoff",
          prompt: "Refresh this handoff.",
        },
      ],
    },
  });

  assert.match(html, /Devflow Handoffs/);
  assert.match(html, /1 stale handoffs/);
  assert.match(html, /Latest dashboard handoff/);
  assert.match(html, /Continue from the latest handoff/);
  assert.match(html, /Stale dashboard handoff/);
  assert.match(html, /Refresh this handoff/);
});

test("web package renders the maps slice page", () => {
  const html = renderDashboardMapsPage({
    maps: {
      counts: { total: 2 },
      items: [
        {
          id: "workflow-map",
          title: "Workflow Map",
          path: "docs/architecture/maps/workflow-map.md",
        },
        {
          id: "dashboard-map",
          title: "Dashboard Map",
          path: "docs/architecture/maps/dashboard-map.md",
        },
      ],
    },
  });

  assert.match(html, /Devflow Maps/);
  assert.match(html, /2 architecture maps/);
  assert.match(html, /Workflow Map/);
  assert.match(html, /workflow-map/);
  assert.match(html, /docs\/architecture\/maps\/workflow-map\.md/);
  assert.match(html, /Dashboard Map/);
});

test("web package renders the work detail page", () => {
  const html = renderDashboardWorkPage({
    id: "dashboard-work-detail",
    title: "Dashboard work detail",
    status: "blocked",
    description: "Render work details from the web package.",
    blockedReason: "Waiting on final extraction.",
  });

  assert.match(html, /Devflow Work Detail/);
  assert.match(html, /dashboard-work-detail/);
  assert.match(html, /Dashboard work detail/);
  assert.match(html, /blocked/);
  assert.match(html, /Render work details from the web package/);
  assert.match(html, /Waiting on final extraction/);
});

test("web package declares a Vite React build boundary", async () => {
  const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  const viteConfig = await readFile(join(packageRoot, "vite.config.js"), "utf8");
  const html = await readFile(join(packageRoot, "index.html"), "utf8");
  const app = await readFile(join(packageRoot, "src", "dashboard-app.jsx"), "utf8");
  const entry = await readFile(join(packageRoot, "src", "dashboard-entry.jsx"), "utf8");

  assert.equal(packageJson.name, "@devflow/web");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.build, "vite build");
  assert.equal(packageJson.dependencies.react, "^19.2.6");
  assert.equal(packageJson.dependencies["react-dom"], "^19.2.6");
  assert.equal(packageJson.devDependencies["@vitejs/plugin-react"], "^6.0.2");
  assert.equal(packageJson.devDependencies.vite, "^8.0.13");
  assert.match(viteConfig, /@vitejs\/plugin-react/);
  assert.match(viteConfig, /outDir: "dist"/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(entry, /createRoot/);
  assert.match(entry, /DashboardApp/);
  assert.match(app, /export function DashboardApp/);
  assert.match(app, /\/dashboard\.json/);
});

test("web package derives a React dashboard view model", async () => {
  const { createDashboardRouteViewModel, createDashboardViewModel, filterDashboardViewModel } = await import("../src/dashboard-view-model.js");
  const viewModel = createDashboardViewModel({
    work: {
      counts: { active: 2, blocked: 1, readyToFinish: 3 },
      active: [{ id: "active-work", title: "Active work", status: "active" }],
      blocked: [
        {
          id: "blocked-work",
          title: "Blocked work",
          status: "blocked",
          blockedReason: "Waiting on review.",
        },
      ],
      readyToFinish: [{ id: "ready-work", title: "Ready work", status: "ready-to-finish" }],
    },
    gates: {
      counts: { failing: 1, total: 4 },
      latest: [
        { id: "unit", status: "failed", command: "npm test", workItemId: "active-work" },
      ],
    },
    sessions: {
      counts: { total: 5 },
      latest: { summary: "Attached the latest Codex session.", sessionId: "session-1" },
      recent: [
        {
          summary: "Attached the latest Codex session.",
          sessionId: "session-1",
          agent: "Codex",
          workItemId: "active-work",
        },
      ],
    },
    handoffs: {
      counts: { stale: 2 },
      latest: { prompt: "Continue the dashboard UI.", workItemId: "dashboard-ui" },
      stale: [{ title: "Refresh stale handoff", prompt: "Refresh this handoff.", workItemId: "stale-work" }],
    },
    maps: {
      counts: { total: 6 },
      items: [{ id: "workflow-map", title: "Workflow Map", path: "docs/architecture/maps/workflow-map.md" }],
    },
    timeline: {
      counts: { total: 2 },
      recent: [
        {
          title: "unit passed",
          detail: "npm test",
          type: "gate.finished",
          observedAt: "2026-05-17T13:00:00.000Z",
          workItemId: "active-work",
        },
      ],
    },
  });

  assert.deepEqual(viewModel.metrics, [
    { label: "Active work", value: 2 },
    { label: "Blocked", value: 1 },
    { label: "Ready", value: 3 },
    { label: "Failing gates", value: 1 },
    { label: "Sessions", value: 5 },
    { label: "Stale handoffs", value: 2 },
  ]);
  assert.deepEqual(viewModel.routes, [
    { href: "/gates", label: "Gates", count: 4 },
    { href: "/sessions", label: "Sessions", count: 5 },
    { href: "/handoffs", label: "Handoffs", count: 2 },
    { href: "/maps", label: "Maps", count: 6 },
    { href: "/work", label: "Work", count: 6 },
  ]);
  assert.deepEqual(viewModel.evidence, [
    { label: "Latest gate", value: "unit failed", detail: "npm test" },
    { label: "Latest session", value: "Attached the latest Codex session.", detail: "session-1" },
    { label: "Latest handoff", value: "Continue the dashboard UI.", detail: "dashboard-ui" },
  ]);
  assert.deepEqual(viewModel.workSections, [
    {
      label: "Active",
      items: [
        {
          href: "/work/active-work",
          title: "Active work",
          meta: "active-work",
          facts: [
            { label: "Status", value: "active" },
            { label: "Work", value: "active-work" },
          ],
        },
      ],
    },
    {
      label: "Blocked",
      items: [
        {
          href: "/work/blocked-work",
          title: "Blocked work",
          meta: "Waiting on review.",
          facts: [
            { label: "Status", value: "blocked" },
            { label: "Work", value: "blocked-work" },
          ],
        },
      ],
    },
    {
      label: "Ready",
      items: [
        {
          href: "/work/ready-work",
          title: "Ready work",
          meta: "ready-work",
          facts: [
            { label: "Status", value: "ready-to-finish" },
            { label: "Work", value: "ready-work" },
          ],
        },
      ],
    },
  ]);
  assert.deepEqual(viewModel.timeline, {
    count: 2,
    items: [
      {
        title: "unit passed",
        detail: "npm test",
        meta: "2026-05-17T13:00:00.000Z",
        href: "/work/active-work",
      },
    ],
  });
  assert.deepEqual(viewModel.detailSections, [
    {
      label: "Gate evidence",
      count: 4,
      href: "/gates",
      items: [
        {
          href: "/gates/unit",
          title: "unit failed",
          meta: "npm test",
          detail: "active-work",
          facts: [
            { label: "Command", value: "npm test" },
            { label: "Work", value: "active-work" },
          ],
        },
      ],
    },
    {
      label: "Sessions",
      count: 5,
      href: "/sessions",
      items: [
        {
          href: "/sessions/session-1",
          title: "Attached the latest Codex session.",
          meta: "Codex",
          detail: "active-work",
          facts: [
            { label: "Agent", value: "Codex" },
            { label: "Work", value: "active-work" },
          ],
        },
      ],
    },
    {
      label: "Handoffs",
      count: 2,
      href: "/handoffs",
      items: [
        {
          href: "/handoffs/stale-work",
          title: "Refresh stale handoff",
          meta: "Refresh this handoff.",
          detail: "stale-work",
          facts: [
            { label: "Prompt", value: "Refresh this handoff." },
            { label: "Work", value: "stale-work" },
          ],
        },
      ],
    },
    {
      label: "Maps",
      count: 6,
      href: "/maps",
      items: [
        {
          href: "/maps/workflow-map",
          title: "Workflow Map",
          meta: "docs/architecture/maps/workflow-map.md",
          detail: "workflow-map",
          facts: [
            { label: "Path", value: "docs/architecture/maps/workflow-map.md" },
            { label: "Map", value: "workflow-map" },
          ],
        },
      ],
    },
  ]);

  const filtered = filterDashboardViewModel(viewModel, "unit");
  assert.deepEqual(filtered.workSections.map((section) => section.items), [[], [], []]);
  assert.deepEqual(filtered.timeline.items, [
    {
      title: "unit passed",
      detail: "npm test",
      meta: "2026-05-17T13:00:00.000Z",
      href: "/work/active-work",
    },
  ]);
  assert.deepEqual(filtered.detailSections.map((section) => section.items), [
    [
      {
        href: "/gates/unit",
        title: "unit failed",
        meta: "npm test",
        detail: "active-work",
        facts: [
          { label: "Command", value: "npm test" },
          { label: "Work", value: "active-work" },
        ],
      },
    ],
    [],
    [],
    [],
  ]);
  assert.equal(filterDashboardViewModel(viewModel, "   "), viewModel);
  assert.deepEqual(createDashboardRouteViewModel(viewModel, "/gates"), {
    kind: "section",
    title: "Gate evidence",
    count: 4,
    emptyText: "No gate evidence.",
    items: [
      {
        href: "/gates/unit",
        title: "unit failed",
        meta: "npm test",
        detail: "active-work",
        facts: [
          { label: "Command", value: "npm test" },
          { label: "Work", value: "active-work" },
        ],
      },
    ],
  });
  assert.deepEqual(createDashboardRouteViewModel(viewModel, "/work"), {
    kind: "section",
    title: "Work",
    count: 3,
    emptyText: "No work items.",
    items: [
      {
        href: "/work/active-work",
        title: "Active work",
        meta: "active-work",
        facts: [
          { label: "Status", value: "active" },
          { label: "Work", value: "active-work" },
        ],
      },
      {
        href: "/work/blocked-work",
        title: "Blocked work",
        meta: "Waiting on review.",
        facts: [
          { label: "Status", value: "blocked" },
          { label: "Work", value: "blocked-work" },
        ],
      },
      {
        href: "/work/ready-work",
        title: "Ready work",
        meta: "ready-work",
        facts: [
          { label: "Status", value: "ready-to-finish" },
          { label: "Work", value: "ready-work" },
        ],
      },
    ],
  });
  assert.deepEqual(createDashboardRouteViewModel(viewModel, "/gates/unit"), {
    kind: "detail",
    title: "unit failed",
    meta: "npm test",
    detail: "active-work",
    facts: [
      { label: "Command", value: "npm test" },
      { label: "Work", value: "active-work" },
    ],
    backHref: "/gates",
    backLabel: "Gate evidence",
  });
  assert.deepEqual(createDashboardRouteViewModel(viewModel, "/sessions/session-1"), {
    kind: "detail",
    title: "Attached the latest Codex session.",
    meta: "Codex",
    detail: "active-work",
    facts: [
      { label: "Agent", value: "Codex" },
      { label: "Work", value: "active-work" },
    ],
    backHref: "/sessions",
    backLabel: "Sessions",
  });
  assert.deepEqual(createDashboardRouteViewModel(viewModel, "/work/active-work"), {
    kind: "detail",
    title: "Active work",
    meta: "active-work",
    detail: "Active",
    facts: [
      { label: "Status", value: "active" },
      { label: "Work", value: "active-work" },
    ],
    backHref: "/",
    backLabel: "Dashboard",
  });
  assert.deepEqual(createDashboardRouteViewModel(viewModel, "/gates/missing"), {
    kind: "not_found",
    title: "Gate not found",
    backHref: "/gates",
    backLabel: "Gate evidence",
  });
  assert.equal(createDashboardRouteViewModel(viewModel, "/"), null);
});
