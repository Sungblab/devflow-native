import assert from "node:assert/strict";
import test from "node:test";

import { createDashboardServedHtml, DASHBOARD_WEB_CSS, DASHBOARD_WEB_JS } from "../src/index.js";

test("web package owns the no-build dashboard shell assets", () => {
  const staticHtml = "<!doctype html><html><head><title>Devflow Dashboard</title></head><body><main>Fallback</main></body></html>";
  const servedHtml = createDashboardServedHtml(staticHtml);

  assert.match(servedHtml, /class="devflow-dashboard-shell"/);
  assert.match(servedHtml, /\/assets\/dashboard\.css/);
  assert.match(servedHtml, /\/assets\/dashboard\.js/);
  assert.match(DASHBOARD_WEB_CSS, /devflow-dashboard/);
  assert.ok(DASHBOARD_WEB_JS.includes('fetch("/dashboard.json")'));
});
