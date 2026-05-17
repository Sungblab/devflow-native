import { useEffect, useState } from "react";

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

  const work = dashboard.work?.counts ?? {};
  const gates = dashboard.gates?.counts ?? {};
  const sessions = dashboard.sessions?.counts ?? {};
  const handoffs = dashboard.handoffs?.counts ?? {};

  return (
    <main>
      <h1>Devflow Dashboard</h1>
      <section aria-label="Dashboard metrics">
        <Metric label="Active work" value={work.active ?? 0} />
        <Metric label="Blocked" value={work.blocked ?? 0} />
        <Metric label="Ready" value={work.readyToFinish ?? 0} />
        <Metric label="Failing gates" value={gates.failing ?? 0} />
        <Metric label="Sessions" value={sessions.total ?? 0} />
        <Metric label="Stale handoffs" value={handoffs.stale ?? 0} />
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
