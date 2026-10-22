export const objective = 'Choose one retained, complete snapshot for every queried input. Explain transaction ordering, waiting, bounded-staleness errors, and the separate ingestion of upstream writes.';
export const documentationLinks = [
  { title: 'EXPLAIN TIMESTAMP: query timestamps and read/write frontiers', href: 'https://materialize.com/docs/sql/explain-timestamp/' },
  { title: 'Isolation levels: serializable, strict serializable, and bounded staleness', href: 'https://materialize.com/docs/serve-results/isolation-level/' },
  { title: 'External ingestion and real-time recency (private preview)', href: 'https://materialize.com/docs/serve-results/isolation-level/#real-time-recency' },
];
export const referenceLinks = documentationLinks.map(({ title, href }) => ({ label: title, href }));
export const readSql = `-- Illustrative schema; the lab simulates reads rather than executing SQL.
CREATE VIEW paid_orders AS
SELECT o.order_id, o.amount
FROM orders AS o JOIN payments AS p USING (order_id);

SET transaction_isolation TO 'strict serializable';
SELECT order_id, amount FROM orders;
SELECT order_id, amount FROM paid_orders;

SET transaction_isolation TO 'serializable';
SELECT order_id, amount FROM paid_orders;

-- Read-only, wall-clock timeline. No waiting for inputs to meet the bound.
SET transaction_isolation TO 'bounded staleness 5s';
SELECT order_id, amount FROM paid_orders;

-- Optional diagnostic; syntax/output are not a stable interface.
EXPLAIN TIMESTAMP FOR
SELECT o.order_id FROM orders AS o JOIN payments AS p USING (order_id);

-- The diagram's selected cursor is a timestamp-selection model,
-- not arbitrary time-travel SQL. A regular view does not itself
-- persist results; the fixture represents a maintained access path.
-- Strict transaction ordering does not guarantee immediate visibility
-- of a newly committed upstream write. Real-time recency is optional,
-- private preview functionality, not required for these exercises.`;
