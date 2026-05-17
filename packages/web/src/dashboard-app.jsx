import { useEffect, useState } from "react";

import { createDashboardViewModel } from "./dashboard-view-model.js";

export function DashboardApp({ endpoint = "/dashboard.json" }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    fetch(endpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load dashboard JSON: ${response.status}`);
        }
        return response.json();
      })
      .then((nextDashboard) => {
        if (active) {
          setDashboard(nextDashboard);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError);
        }
      });

    return () => {
      active = false;
    };
  }, [endpoint]);

  if (error) {
    return <main><h1>Devflow Dashboard</h1><p>{error.message}</p></main>;
  }

  if (!dashboard) {
    return <main><h1>Devflow Dashboard</h1><p>Loading dashboard...</p></main>;
  }

  const viewModel = createDashboardViewModel(dashboard);

  return (
    <main>
      <h1>Devflow Dashboard</h1>
      <section aria-label="Dashboard metrics">
        {viewModel.metrics.map((metric) => (
          <Metric key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>
      <nav aria-label="Dashboard sections">
        {viewModel.routes.map((route) => (
          <a key={route.href} href={route.href}>
            <span>{route.label}</span>
            <strong>{route.count}</strong>
          </a>
        ))}
      </nav>
      <section aria-label="Latest evidence">
        {viewModel.evidence.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
