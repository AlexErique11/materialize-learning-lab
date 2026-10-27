export const incidentRules = { stateBudget: 8, windowMs: 300000, normalAgeMs: 3000, fallbackAgeMs: 10000, wallClock: 630000, stalledFrontier: 623000, caughtUpFrontier: 630001 } as const;
export const documentationLinks = [
  { label: 'Order source envelopes', href: 'https://materialize.com/docs/sql/create-table/kafka/' },
  { label: 'Views and shared maintained results', href: 'https://materialize.com/docs/fundamentals/concepts/views/' },
  { label: 'Temporal filters', href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/' },
  { label: 'Freshness troubleshooting', href: 'https://materialize.com/docs/transform-data/freshness-troubleshooting/' },
  { label: 'Isolation levels', href: 'https://materialize.com/docs/serve-results/isolation-level/' },
  { label: 'SUBSCRIBE: snapshots and progress', href: 'https://materialize.com/docs/sql/subscribe/' },
];
