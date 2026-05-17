export function createDashboardViewModel(dashboard) {
  const work = dashboard.work?.counts ?? {};
  const gates = dashboard.gates?.counts ?? {};
  const sessions = dashboard.sessions?.counts ?? {};
  const handoffs = dashboard.handoffs?.counts ?? {};
  const maps = dashboard.maps?.counts ?? {};
  const workTotal = (work.active ?? 0) + (work.blocked ?? 0) + (work.readyToFinish ?? 0);

  const latestGate = dashboard.gates?.latest?.[0];
  const latestSession = dashboard.sessions?.latest;
  const latestHandoff = dashboard.handoffs?.latest;

  return {
    metrics: [
      { label: "Active work", value: work.active ?? 0 },
      { label: "Blocked", value: work.blocked ?? 0 },
      { label: "Ready", value: work.readyToFinish ?? 0 },
      { label: "Failing gates", value: gates.failing ?? 0 },
      { label: "Sessions", value: sessions.total ?? 0 },
      { label: "Stale handoffs", value: handoffs.stale ?? 0 },
    ],
    routes: [
      { href: "/gates", label: "Gates", count: gates.total ?? 0 },
      { href: "/sessions", label: "Sessions", count: sessions.total ?? 0 },
      { href: "/handoffs", label: "Handoffs", count: handoffs.stale ?? 0 },
      { href: "/maps", label: "Maps", count: maps.total ?? 0 },
      { href: "/work", label: "Work", count: workTotal },
    ],
    evidence: [
      latestGate
        ? {
            label: "Latest gate",
            value: `${latestGate.id} ${latestGate.status}`,
            detail: latestGate.command ?? "none",
          }
        : null,
      latestSession
        ? {
            label: "Latest session",
            value: latestSession.summary ?? latestSession.sessionId ?? "none",
            detail: latestSession.sessionId ?? "none",
          }
        : null,
      latestHandoff
        ? {
            label: "Latest handoff",
            value: latestHandoff.prompt ?? latestHandoff.title ?? latestHandoff.workItemId ?? "none",
            detail: latestHandoff.workItemId ?? "none",
          }
        : null,
    ].filter(Boolean),
  };
}
