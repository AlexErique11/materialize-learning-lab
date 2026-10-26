import type { DocumentationLink } from '../../app/resources';
import type { SubscriptionState } from './simulation';

export const documentationLinks: readonly DocumentationLink[] = [
  { title: 'SUBSCRIBE: timestamps and signed result changes', href: 'https://materialize.com/docs/sql/subscribe/#output' },
  { title: 'SUBSCRIBE: initial snapshot', href: 'https://materialize.com/docs/sql/subscribe/#snapshot' },
  { title: 'SUBSCRIBE: progress and complete timestamps', href: 'https://materialize.com/docs/sql/subscribe/#progress' },
  { title: 'SUBSCRIBE: consume with a cursor and FETCH', href: 'https://materialize.com/docs/sql/subscribe/#subscribing-with-fetch' },
  { title: 'SELECT and SUBSCRIBE: serving results', href: 'https://materialize.com/docs/serve-results/query-results/' },
];
export const referenceLinks = documentationLinks.map(link => ({ label: link.title, href: link.href }));
export const objective = 'Initialize a live client, apply signed full-row changes, and publish only complete timestamp groups. Distinguish received records, completeness evidence, and the application’s publication boundary.';
const orderTotalsSql = `CREATE MATERIALIZED VIEW open_order_totals AS
SELECT region, COUNT(*) AS orders, SUM(amount) AS total
FROM orders
WHERE status = 'open'
GROUP BY region;`;

const rowCopiesSql = `-- A separate relation for the duplicate-row example.
-- It has two identical rows, unlike the grouped order totals.
CREATE TABLE row_copies (region text, orders bigint, total numeric);
INSERT INTO row_copies VALUES ('EU', 2, 100), ('EU', 2, 100);`;

export function subscriptionSqlFor(state: Pick<SubscriptionState, 'name' | 'snapshot'>): string {
  return `${state.name === 'row_copies' ? rowCopiesSql : orderTotalsSql}

BEGIN;
DECLARE live_orders CURSOR FOR
  SUBSCRIBE ${state.name}
  WITH (SNAPSHOT = ${state.snapshot}, PROGRESS = true);
FETCH 20 live_orders WITH (timeout = '1s');
-- Repeat FETCH while consuming the stream. To stop, end the transaction:
COMMIT;

-- SNAPSHOT = false omits the initial snapshot; an empty client has no baseline.
-- P(T) abbreviates a progress record: mz_timestamp = T, mz_progressed = true.
-- Its other columns are not data and must be ignored.
-- This lab simulates delivery; it does not execute SQL.
-- A FETCH batch or timeout is not a complete logical timestamp.
-- This client publishes buffered changes at times strictly below progress T.
-- This publication policy is a client choice, not a SUBSCRIBE requirement.`;
}
