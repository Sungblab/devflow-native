import assert from "node:assert/strict";
import test from "node:test";

import {
  createDashboardServedHtml,
  DASHBOARD_WEB_CSS,
  DASHBOARD_WEB_JS,
  renderDashboardLiveSection,
  renderDashboardRouteLinks,
  renderDashboardGatesPage,
  renderDashboardSessionsPage,
  renderDashboardHandoffsPage,
} from "../src/index.js";

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
