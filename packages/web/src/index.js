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
    live.innerHTML = renderDashboardLiveSection(dashboard);
  }
  document.documentElement.dataset.devflowDashboard = "ready";
  document.documentElement.dataset.devflowActiveWork = String(dashboard.work?.counts?.active ?? 0);
}

function renderDashboardLiveSection(dashboard) {
  const work = dashboard.work?.counts ?? {};
  const gates = dashboard.gates?.counts ?? {};
  const sessions = dashboard.sessions?.counts ?? {};
  const handoffs = dashboard.handoffs?.counts ?? {};
  return [
    ["Active work", work.active ?? 0],
    ["Blocked", work.blocked ?? 0],
    ["Ready", work.readyToFinish ?? 0],
    ["Failing gates", gates.failing ?? 0],
    ["Sessions", sessions.total ?? 0],
    ["Stale handoffs", handoffs.stale ?? 0],
  ]
    .map(([label, value]) => '<article><span>' + label + '</span><strong>' + value + '</strong></article>')
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
  return [
    ["Active work", work.active ?? 0],
    ["Blocked", work.blocked ?? 0],
    ["Ready", work.readyToFinish ?? 0],
    ["Failing gates", gates.failing ?? 0],
    ["Sessions", sessions.total ?? 0],
    ["Stale handoffs", handoffs.stale ?? 0],
  ]
    .map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
