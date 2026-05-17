import { useEffect, useState } from "react";

import {
  createDashboardRouteViewModel,
  createDashboardViewModel,
  filterDashboardViewModel,
} from "./dashboard-view-model.js";

export function DashboardApp({ endpoint = "/dashboard.json" }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

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
    return <main className="dashboard-app"><h1>Devflow Dashboard</h1><p>{error.message}</p></main>;
  }

  if (!dashboard) {
    return <main className="dashboard-app"><h1>Devflow Dashboard</h1><p>Loading dashboard...</p></main>;
  }

  const viewModel = filterDashboardViewModel(createDashboardViewModel(dashboard), query);
  const routeViewModel = createDashboardRouteViewModel(viewModel, window.location.pathname);

  if (routeViewModel) {
    return (
      <main className="dashboard-app">
        <h1>Devflow Dashboard</h1>
        <RouteView route={routeViewModel} />
      </main>
    );
  }

  return (
    <main className="dashboard-app">
      <h1>Devflow Dashboard</h1>
      <label className="dashboard-search">
        Filter dashboard
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Gate, session, handoff, map, work"
        />
      </label>
      <section className="dashboard-grid" aria-label="Dashboard metrics">
        {viewModel.metrics.map((metric) => (
          <Metric key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>
      <nav className="dashboard-grid" aria-label="Dashboard sections">
        {viewModel.routes.map((route) => (
          <a key={route.href} href={route.href}>
            <span>{route.label}</span>
            <strong>{route.count}</strong>
          </a>
        ))}
      </nav>
      <section className="dashboard-grid" aria-label="Latest evidence">
        {viewModel.evidence.map((item) => (
          <article className="dashboard-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>
      <section className="dashboard-grid" aria-label="Work lists">
        {viewModel.workSections.map((section) => (
          <section className="dashboard-card" key={section.label}>
            <h2>{section.label}</h2>
            <ItemList emptyText={`No ${section.label.toLowerCase()} work.`} items={section.items} />
          </section>
        ))}
      </section>
      <section className="dashboard-card" aria-label="Timeline">
        <h2>Timeline</h2>
        <p>Total {viewModel.timeline.count}</p>
        <ItemList emptyText="No timeline events." items={viewModel.timeline.items} />
      </section>
      <section className="dashboard-grid" aria-label="Dashboard detail panels">
        {viewModel.detailSections.map((section) => (
          <section className="dashboard-card" key={section.label}>
            <h2><a href={section.href}>{section.label}</a></h2>
            <p>Total {section.count}</p>
            <ItemList emptyText={`No ${section.label.toLowerCase()} items.`} items={section.items} />
          </section>
        ))}
      </section>
    </main>
  );
}

function RouteView({ route }) {
  if (route.kind === "not_found") {
    return (
      <section className="dashboard-card" aria-label="Dashboard route not found">
        <header className="dashboard-route-header">
          <a className="dashboard-back-link" href={route.backHref}>{route.backLabel}</a>
          <h2>{route.title}</h2>
        </header>
      </section>
    );
  }

  if (route.kind === "detail") {
    return (
      <section className="dashboard-card" aria-label="Dashboard route detail">
        <header className="dashboard-route-header">
          <a className="dashboard-back-link" href={route.backHref}>{route.backLabel}</a>
          <h2>{route.title}</h2>
        </header>
        <p>{route.meta}</p>
        <p>{route.detail}</p>
        <FactList facts={route.facts} />
      </section>
    );
  }

  return (
    <section className="dashboard-card" aria-label="Dashboard route section">
      <h2>{route.title}</h2>
      <p>Total {route.count}</p>
      <ItemList emptyText={route.emptyText} items={route.items} />
    </section>
  );
}

function FactList({ facts }) {
  if (!facts || facts.length === 0) {
    return null;
  }

  return (
    <dl className="dashboard-facts">
      {facts.map((fact) => (
        <div key={`${fact.label}-${fact.value}`}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Metric({ label, value }) {
  return (
    <article className="dashboard-card">
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
    <ul className="dashboard-list">
      {items.map((item) => (
        <li key={`${item.title}-${item.meta}`}>
          {item.href ? <a href={item.href}>{item.title}</a> : <strong>{item.title}</strong>}
          <span>{item.detail ?? item.meta}</span>
        </li>
      ))}
    </ul>
  );
}
