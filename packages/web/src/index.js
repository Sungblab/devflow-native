export const DASHBOARD_WEB_CSS = `.devflow-dashboard-shell {
  min-height: 100vh;
}

.devflow-dashboard-live {
  border-top: 1px solid #d9dde5;
  margin-top: 16px;
  padding-top: 12px;
}
`;

export const DASHBOARD_WEB_JS = `async function loadDashboard() {
  const response = await fetch("/dashboard.json");
  if (!response.ok) {
    throw new Error("Unable to load dashboard JSON");
  }
  const dashboard = await response.json();
  const live = document.getElementById("devflow-dashboard-live");
  if (live) {
    live.innerHTML = renderDashboardLiveSection(dashboard) + renderDashboardRouteLinks(dashboard);
  }
  document.documentElement.dataset.devflowDashboard = "ready";
  document.documentElement.dataset.devflowActiveWork = String(dashboard.work?.counts?.active ?? 0);
}

function renderDashboardLiveSection(dashboard) {
  const work = dashboard.work?.counts ?? {};
  const gates = dashboard.gates?.counts ?? {};
  const sessions = dashboard.sessions?.counts ?? {};
  const handoffs = dashboard.handoffs?.counts ?? {};
  const metrics = [
    ["Active work", work.active ?? 0],
    ["Blocked", work.blocked ?? 0],
    ["Ready", work.readyToFinish ?? 0],
    ["Failing gates", gates.failing ?? 0],
    ["Sessions", sessions.total ?? 0],
    ["Stale handoffs", handoffs.stale ?? 0],
  ]
    .map(([label, value]) => '<article><span>' + label + '</span><strong>' + value + '</strong></article>')
    .join("");
  const latestGate = dashboard.gates?.latest?.[0];
  const latestSession = dashboard.sessions?.latest;
  const latestHandoff = dashboard.handoffs?.latest;
  const details = [
    latestGate ? ["Latest gate", latestGate.id + " " + latestGate.status] : null,
    latestSession ? ["Latest session", latestSession.summary || latestSession.sessionId] : null,
    latestHandoff ? ["Latest handoff", latestHandoff.prompt || latestHandoff.title || latestHandoff.workItemId] : null,
  ]
    .filter(Boolean)
    .map(([label, value]) => '<article><span>' + label + '</span><strong>' + value + '</strong></article>')
    .join("");
  return metrics + details;
}

function renderDashboardRouteLinks(dashboard) {
  const work = dashboard.work?.counts ?? {};
  const workTotal = (work.active ?? 0) + (work.blocked ?? 0) + (work.readyToFinish ?? 0);
  return [
    ["/gates", "Gates", dashboard.gates?.counts?.total ?? 0],
    ["/sessions", "Sessions", dashboard.sessions?.counts?.total ?? 0],
    ["/handoffs", "Handoffs", dashboard.handoffs?.counts?.stale ?? 0],
    ["/maps", "Maps", dashboard.maps?.counts?.total ?? 0],
    ["/work", "Work", workTotal],
  ]
    .map(([href, label, count]) => '<a href="' + href + '"><span>' + label + '</span><strong>' + count + '</strong></a>')
    .join("");
}

loadDashboard().catch((error) => {
  document.documentElement.dataset.devflowDashboard = "error";
  console.error(error);
});
`;

export function createDashboardServedHtml(staticHtml) {
  return staticHtml
    .replace("<body>", '<body class="devflow-dashboard-shell">')
    .replace("</head>", '  <link rel="stylesheet" href="/assets/dashboard.css">\n</head>')
    .replace(
      "</main>",
      '    <section id="devflow-dashboard-live" class="devflow-dashboard-live" aria-label="Live dashboard summary"></section>\n  </main>',
    )
    .replace("</body>", '  <script type="module" src="/assets/dashboard.js"></script>\n</body>');
}

export function renderDashboardLiveSection(dashboard) {
  const work = dashboard.work?.counts ?? {};
  const gates = dashboard.gates?.counts ?? {};
  const sessions = dashboard.sessions?.counts ?? {};
  const handoffs = dashboard.handoffs?.counts ?? {};
  const metrics = [
    ["Active work", work.active ?? 0],
    ["Blocked", work.blocked ?? 0],
    ["Ready", work.readyToFinish ?? 0],
    ["Failing gates", gates.failing ?? 0],
    ["Sessions", sessions.total ?? 0],
    ["Stale handoffs", handoffs.stale ?? 0],
  ]
    .map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join("");
  const latestGate = dashboard.gates?.latest?.[0];
  const latestSession = dashboard.sessions?.latest;
  const latestHandoff = dashboard.handoffs?.latest;
  const details = [
    latestGate ? ["Latest gate", `${latestGate.id} ${latestGate.status}`] : null,
    latestSession ? ["Latest session", latestSession.summary || latestSession.sessionId] : null,
    latestHandoff ? ["Latest handoff", latestHandoff.prompt || latestHandoff.title || latestHandoff.workItemId] : null,
  ]
    .filter(Boolean)
    .map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join("");
  return metrics + details;
}

export function renderDashboardRouteLinks(dashboard) {
  const work = dashboard.work?.counts ?? {};
  const workTotal = (work.active ?? 0) + (work.blocked ?? 0) + (work.readyToFinish ?? 0);
  return [
    ["/gates", "Gates", dashboard.gates?.counts?.total ?? 0],
    ["/sessions", "Sessions", dashboard.sessions?.counts?.total ?? 0],
    ["/handoffs", "Handoffs", dashboard.handoffs?.counts?.stale ?? 0],
    ["/maps", "Maps", dashboard.maps?.counts?.total ?? 0],
    ["/work", "Work", workTotal],
  ]
    .map(
      ([href, label, count]) =>
        `<a href="${escapeHtml(href)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(count)}</strong></a>`,
    )
    .join("");
}

export function renderDashboardGatesPage(summary) {
  const gateRows = (summary.gates?.latest ?? [])
    .map(
      (gate) =>
        `<tr><td>${escapeHtml(gate.id)}</td><td>${escapeHtml(gate.status)}</td><td>${escapeHtml(gate.command)}</td><td>${escapeHtml(gate.workItemId ?? "none")}</td></tr>`,
    )
    .join("");
  const rows = gateRows || '<tr><td colspan="4">No gate evidence.</td></tr>';
  const counts = summary.gates?.counts ?? {};

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Gates</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #171a1f; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    p { margin: 0 0 20px; color: #5b6270; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d9dde5; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eceff3; vertical-align: top; }
    th { font-size: 13px; color: #5b6270; text-transform: uppercase; }
    td { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Devflow Gates</h1>
    <p>${escapeHtml(counts.passed ?? 0)} passed / ${escapeHtml(counts.failed ?? 0)} failed / ${escapeHtml(counts.total ?? 0)} total</p>
    <table>
      <thead><tr><th>Gate</th><th>Status</th><th>Command</th><th>Work</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

export function renderDashboardSessionsPage(summary) {
  const sessionRows = (summary.sessions?.recent ?? [])
    .map(
      (session) =>
        `<tr><td>${escapeHtml(session.agent)}</td><td>${escapeHtml(session.kind)}</td><td>${escapeHtml(session.workItemId ?? "none")}</td><td>${escapeHtml(session.summary ?? session.sessionId ?? "none")}</td></tr>`,
    )
    .join("");
  const rows = sessionRows || '<tr><td colspan="4">No session evidence.</td></tr>';
  const counts = summary.sessions?.counts ?? {};

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Sessions</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #171a1f; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    p { margin: 0 0 20px; color: #5b6270; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d9dde5; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eceff3; vertical-align: top; }
    th { font-size: 13px; color: #5b6270; text-transform: uppercase; }
    td { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Devflow Sessions</h1>
    <p>${escapeHtml(counts.total ?? 0)} total / ${escapeHtml(counts.manualNotes ?? 0)} manual / ${escapeHtml(counts.attached ?? 0)} attached</p>
    <table>
      <thead><tr><th>Agent</th><th>Kind</th><th>Work</th><th>Summary</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

export function renderDashboardHandoffsPage(summary) {
  const handoffs = summary.handoffs ?? {};
  const latest = handoffs.latest;
  const latestRows = latest
    ? `<tr><td>${escapeHtml(latest.workItemId)}</td><td>${escapeHtml(latest.title ?? "Untitled handoff")}</td><td>${escapeHtml(latest.prompt ?? "none")}</td></tr>`
    : '<tr><td colspan="3">No handoff evidence.</td></tr>';
  const staleRows = (handoffs.stale ?? [])
    .map(
      (handoff) =>
        `<tr><td>${escapeHtml(handoff.workItemId)}</td><td>${escapeHtml(handoff.title ?? "Untitled handoff")}</td><td>${escapeHtml(handoff.prompt ?? "none")}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Devflow Handoffs</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #171a1f; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    h2 { margin: 28px 0 12px; font-size: 18px; }
    p { margin: 0 0 20px; color: #5b6270; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d9dde5; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eceff3; vertical-align: top; }
    th { font-size: 13px; color: #5b6270; text-transform: uppercase; }
    td { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Devflow Handoffs</h1>
    <p>${escapeHtml(handoffs.counts?.stale ?? 0)} stale handoffs</p>
    <h2>Latest</h2>
    <table>
      <thead><tr><th>Work</th><th>Title</th><th>Prompt</th></tr></thead>
      <tbody>${latestRows}</tbody>
    </table>
    <h2>Stale</h2>
    <table>
      <thead><tr><th>Work</th><th>Title</th><th>Prompt</th></tr></thead>
      <tbody>${staleRows || '<tr><td colspan="3">No stale handoffs.</td></tr>'}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
