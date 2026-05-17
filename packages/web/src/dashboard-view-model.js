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
    workSections: [
      { label: "Active", items: createWorkItems(dashboard.work?.active ?? []) },
      { label: "Blocked", items: createWorkItems(dashboard.work?.blocked ?? []) },
      { label: "Ready", items: createWorkItems(dashboard.work?.readyToFinish ?? []) },
    ],
    timeline: {
      count: dashboard.timeline?.counts?.total ?? 0,
      items: (dashboard.timeline?.recent ?? []).map((event) => ({
        title: event.title ?? event.type ?? "event",
        detail: event.detail ?? event.type ?? "none",
        meta: event.observedAt ?? "unknown time",
        href: event.workItemId ? `/work/${encodeURIComponent(event.workItemId)}` : null,
      })),
    },
    detailSections: [
      {
        label: "Gate evidence",
        count: gates.total ?? 0,
        href: "/gates",
        items: createGateItems(dashboard.gates?.latest ?? []),
      },
      {
        label: "Sessions",
        count: sessions.total ?? 0,
        href: "/sessions",
        items: createSessionItems(dashboard.sessions?.recent ?? []),
      },
      {
        label: "Handoffs",
        count: handoffs.stale ?? 0,
        href: "/handoffs",
        items: createHandoffItems(dashboard.handoffs?.stale ?? []),
      },
      {
        label: "Maps",
        count: maps.total ?? 0,
        href: "/maps",
        items: createMapItems(dashboard.maps?.items ?? []),
      },
    ],
  };
}

export function filterDashboardViewModel(viewModel, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return viewModel;
  }

  return {
    ...viewModel,
    workSections: filterSections(viewModel.workSections, normalizedQuery),
    timeline: {
      ...viewModel.timeline,
      items: viewModel.timeline.items.filter((item) => itemMatches(item, normalizedQuery)),
    },
    detailSections: filterSections(viewModel.detailSections, normalizedQuery),
  };
}

function createWorkItems(items) {
  return items.map((item) => ({
    href: `/work/${encodeURIComponent(item.id)}`,
    title: item.title ?? item.id,
    meta: item.blockedReason ?? item.id,
  }));
}

function createGateItems(items) {
  return items.map((item) => ({
    href: `/gates/${encodeURIComponent(item.id)}`,
    title: `${item.id} ${item.status ?? "unknown"}`,
    meta: item.command ?? "none",
    detail: item.workItemId ?? "no work item",
  }));
}

function createSessionItems(items) {
  return items.map((item) => ({
    href: `/sessions/${encodeURIComponent(item.sessionId)}`,
    title: item.summary ?? item.sessionId,
    meta: item.agent ?? item.kind ?? "unknown agent",
    detail: item.workItemId ?? "no work item",
  }));
}

function createHandoffItems(items) {
  return items.map((item) => ({
    href: `/handoffs/${encodeURIComponent(item.workItemId)}`,
    title: item.title ?? item.workItemId,
    meta: item.prompt ?? "no prompt",
    detail: item.workItemId,
  }));
}

function createMapItems(items) {
  return items.map((item) => ({
    href: `/maps/${encodeURIComponent(item.id)}`,
    title: item.title ?? item.id,
    meta: item.path ?? "no path",
    detail: item.id,
  }));
}

function filterSections(sections, query) {
  return sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => itemMatches(item, query)),
  }));
}

function itemMatches(item, query) {
  return [item.title, item.meta, item.detail, item.href]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}
