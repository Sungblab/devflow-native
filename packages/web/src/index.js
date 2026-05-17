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
  document.documentElement.dataset.devflowDashboard = "ready";
  document.documentElement.dataset.devflowActiveWork = String(dashboard.work?.counts?.active ?? 0);
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
    .replace("</body>", '  <script type="module" src="/assets/dashboard.js"></script>\n</body>');
}
