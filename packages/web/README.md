# `@devflow/web`

`packages/web` owns browser-facing dashboard shell assets. The first slice is
deliberately no-build: it exports the served dashboard CSS, JavaScript, and HTML
injection helper that `devflow dashboard serve` uses over the existing
`/dashboard.json` contract. It also exports a small live-summary renderer so
the served JavaScript can turn dashboard JSON into browser-visible metric,
latest-evidence, and route-link sections without coupling the CLI to
DOM-specific rendering.

The first route-specific page renderers also live here:
`renderDashboardGatesPage`, `renderDashboardSessionsPage`, and
`renderDashboardHandoffsPage`, `renderDashboardMapsPage`, and
`renderDashboardWorkPage` render the `/gates`, `/sessions`, `/handoffs`,
`/maps`, and `/work/<id>` HTML slices from the dashboard summary contract while
the CLI remains responsible for routing and process I/O.

The package also declares the first Vite/React build boundary:

- `package.json` owns the package-local `vite build` and `vite --host
  127.0.0.1` scripts.
- `vite.config.js` keeps Vite output under `packages/web/dist`.
- `index.html`, `src/dashboard-entry.jsx`, and `src/dashboard-app.jsx` define a
  React app shell that reads `/dashboard.json`.
- `src/dashboard-view-model.js` derives the first React dashboard view model for
  metrics, route links, latest evidence, active/blocked/ready work lists, and
  recent timeline events.

By default, `devflow dashboard serve` still serves the no-build shell so
Windows PowerShell dogfooding remains dependency light. After running
`npm --prefix packages/web run build`, `devflow dashboard serve --web-build`
can serve the built React app from `packages/web/dist` while keeping
`/dashboard.json` and the existing slice/detail routes stable.
