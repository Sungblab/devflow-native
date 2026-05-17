import assert from "node:assert/strict";
import test from "node:test";

import {
  createDashboardServedHtml,
  DASHBOARD_WEB_CSS,
  DASHBOARD_WEB_JS,
  renderDashboardLiveSection,
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
