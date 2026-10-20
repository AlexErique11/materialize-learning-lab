import type { DocumentationLink } from '../../app/resources';

export const documentationLinks: readonly DocumentationLink[] = [
  { title: 'Write frontiers and freshness troubleshooting', href: 'https://materialize.com/docs/transform-data/freshness-troubleshooting/' },
  { title: 'Reaction time, freshness, and query latency', href: 'https://materialize.com/docs/fundamentals/concepts/reaction-time/' },
];
export const referenceLinks = documentationLinks.map(link => ({ label: link.title, href: link.href }));
export const progressSql = `-- Illustrative SQL: the lab simulates progress; it does not run SQL.
CREATE MATERIALIZED VIEW paid_orders AS
SELECT o.order_id, o.amount
FROM orders AS o JOIN payments AS p ON o.order_id = p.order_id;

CREATE MATERIALIZED VIEW revenue AS
SELECT SUM(amount) AS total FROM paid_orders;

-- In a real deployment, inspect user-object frontiers:
SELECT o.name, f.write_frontier
FROM mz_internal.mz_frontiers AS f
JOIN mz_catalog.mz_objects AS o ON o.id = f.object_id
WHERE o.id LIKE 'u%';

-- Replace <object_id> with the ID of a maintained object.
SELECT local_lag,
       global_lag - local_lag AS inherited_lag,
       global_lag, slowest_local_input_id
FROM mz_internal.mz_materialization_lag
WHERE object_id = '<object_id>';`;
export const objective = 'Read actual write frontiers, distinguish observed changes from completeness, follow limiting inputs, and locate source, computation, or serving delay. The join fixture uses one payment per order. All clocks, rates and backlog counts are illustrative. Diagnostic SQL requires a real Materialize deployment and an existing maintained object; no connection is needed for this lab.';
