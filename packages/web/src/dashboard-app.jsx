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
      <section aria-label="Work lists">
        {viewModel.workSections.map((section) => (
          <section key={section.label}>
            <h2>{section.label}</h2>
            <ItemList emptyText={`No ${section.label.toLowerCase()} work.`} items={section.items} />
          </section>
        ))}
      </section>
      <section aria-label="Timeline">
        <h2>Timeline</h2>
        <p>Total {viewModel.timeline.count}</p>
        <ItemList emptyText="No timeline events." items={viewModel.timeline.items} />
      </section>
      <section aria-label="Dashboard detail panels">
        {viewModel.detailSections.map((section) => (
          <section key={section.label}>
            <h2><a href={section.href}>{section.label}</a></h2>
            <p>Total {section.count}</p>
            <ItemList emptyText={`No ${section.label.toLowerCase()} items.`} items={section.items} />
          </section>
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

function ItemList({ emptyText, items }) {
  if (items.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={`${item.title}-${item.meta}`}>
          {item.href ? <a href={item.href}>{item.title}</a> : <strong>{item.title}</strong>}
          <span>{item.detail ?? item.meta}</span>
        </li>
      ))}
    </ul>
  );
}
