import { applyRead, windowFixture, type ReadSnapshot } from '../../chapters/consistent-reads/simulation';
import { applySubscriptions, createSubscription, data, progress, receive, type ResultRow, type StreamRecord } from '../../chapters/live-applications-subscribe/simulation';
import { incidentRules, type Answers } from './scenario';

export interface Order {
  readonly orderId: number;
  readonly customerId: number;
  readonly status: 'paid' | 'cancelled';
  readonly amount: number;
  readonly eventAt: number;
  readonly arrivedAt: number;
}
export interface QueryConfiguration { readonly paidOnly: boolean; readonly lower: boolean; readonly upper: 'exclusive' | 'inclusive' | 'arrival' }
export interface SourceConfiguration { readonly envelope: string; readonly key: string }
export interface ResultDiff { readonly row: ResultRow; readonly diff: number }
export interface OrderSnapshot { readonly time: number; readonly label: string; readonly orders: readonly Order[]; readonly eligible: readonly Order[]; readonly rows: readonly ResultRow[]; readonly diffs: readonly ResultDiff[] }

export const customers = [{ customerId: 1, region: 'EU' }, { customerId: 2, region: 'US' }] as const;
const order = (orderId: number, customerId: number, amount: number, eventAt: number, arrivedAt = 600000): Order => ({ orderId, customerId, amount, eventAt, arrivedAt, status: 'paid' });
export const producerHistory: readonly Order[] = [order(101, 1, 30, 540000), order(101, 1, 40, 540000), order(102, 1, 60, 570000), order(103, 2, 25, 310000)];
export const events: readonly { readonly time: number; readonly label: string; readonly record?: Order }[] = [
  { time: 600000, label: 'Initial orders' },
  { time: 601000, label: 'Order 101: amount 40 → 70', record: order(101, 1, 70, 540000, 601000) },
  { time: 602000, label: 'Order 102 cancelled', record: { ...order(102, 1, 60, 570000, 602000), status: 'cancelled' } },
  { time: 603000, label: 'Late order 104 · event time 320 s', record: order(104, 1, 20, 320000, 603000) },
  { time: 604000, label: 'Expired order 105 · event time 290 s', record: order(105, 2, 15, 290000, 604000) },
  { time: 605000, label: 'Future order 106 · event time 620 s', record: order(106, 2, 35, 620000, 605000) },
  { time: 610000, label: 'Clock only · order 103 expires' },
  { time: 620000, label: 'Clock only · order 104 expires; 106 enters' },
  { time: 630000, label: 'Diagnose progress and snapshot reads' },
  { time: 631000, label: 'Live-client baseline' },
  { time: 632000, label: 'Order 101: amount 70 → 90', record: order(101, 1, 90, 540000, 632000) },
];
export const correctQuery: QueryConfiguration = { paidOnly: true, lower: true, upper: 'exclusive' };
export const correctSource: SourceConfiguration = { envelope: 'UPSERT', key: 'order_id' };
export const formatTime = (milliseconds: number) => `${(milliseconds / 1000).toFixed(3)} s`;
const tupleKey = (row: ResultRow) => JSON.stringify([row.region, row.orders, row.total]);

export function ingest(rows: readonly Order[], record: Order, config: SourceConfiguration): readonly Order[] {
  if (config.envelope === 'DEBEZIUM') return rows; // This producer has no before/after records.
  if (config.envelope !== 'UPSERT') return [...rows, record];
  const key = (row: Order) => config.key === 'customer_id' ? row.customerId : config.key === 'status' ? row.status : row.orderId;
  return [...rows.filter(row => key(row) !== key(record)), record];
}

export function qualifies(row: Order, time: number, query: QueryConfiguration): boolean {
  const deadline = (query.upper === 'arrival' ? row.arrivedAt : row.eventAt) + incidentRules.windowMs;
  return (!query.paidOnly || row.status === 'paid') && (!query.lower || time >= row.eventAt)
    && (query.upper === 'inclusive' ? time <= deadline : time < deadline);
}

export function aggregate(rows: readonly Order[]): readonly ResultRow[] {
  const groups = new Map<string, ResultRow>();
  for (const row of rows) {
    const customer = customers.find(item => item.customerId === row.customerId);
    if (!customer) continue;
    const previous = groups.get(customer.region);
    groups.set(customer.region, { region: customer.region, orders: (previous?.orders ?? 0) + 1, total: (previous?.total ?? 0) + row.amount });
  }
  return [...groups.values()].sort((a, b) => a.region.localeCompare(b.region));
}

export function resultDiffs(before: readonly ResultRow[], after: readonly ResultRow[]): readonly ResultDiff[] {
  return [...before.filter(row => !after.some(next => tupleKey(row) === tupleKey(next))).map(row => ({ row, diff: -1 })),
    ...after.filter(row => !before.some(previous => tupleKey(row) === tupleKey(previous))).map(row => ({ row, diff: 1 }))];
}

/** Update only groups touched by a change in eligible input versions. */
function maintain(before: readonly Order[], after: readonly Order[], previous: readonly ResultRow[]): readonly ResultRow[] {
  const affected = new Set<string>();
  for (const row of [...before.filter(row => !after.includes(row)), ...after.filter(row => !before.includes(row))]) {
    const region = customers.find(customer => customer.customerId === row.customerId)?.region;
    if (region) affected.add(region);
  }
  return [...previous.filter(row => !affected.has(row.region)), ...aggregate(after.filter(row => {
    const customer = customers.find(customer => customer.customerId === row.customerId);
    return customer && affected.has(customer.region);
  }))]
    .sort((a, b) => a.region.localeCompare(b.region));
}

export function runOrders(source = correctSource, query = correctQuery): readonly OrderSnapshot[] {
  let rows = producerHistory.reduce<readonly Order[]>((current, record) => ingest(current, record, source), []);
  let eligible: readonly Order[] = [];
  let result: readonly ResultRow[] = [];
  return events.map(event => {
    if (event.record) rows = ingest(rows, event.record, source);
    const nextEligible = rows.filter(row => qualifies(row, event.time, query));
    const nextResult = maintain(eligible, nextEligible, result);
    const snapshot = { time: event.time, label: event.label, orders: rows, eligible: nextEligible, rows: nextResult, diffs: resultDiffs(result, nextResult) };
    eligible = nextEligible; result = nextResult;
    return snapshot;
  });
}

export function queryConfiguration(answers: Answers): QueryConfiguration {
  return { paidOnly: answers.status === 'paid', lower: answers.lower === 'event', upper: answers.upper === 'inclusive' ? 'inclusive' : answers.upper === 'arrival' ? 'arrival' : 'exclusive' };
}
export function querySql(answers: Answers): string {
  const status = answers.status === 'paid' ? "o.status = 'paid'" : answers.status === 'all' ? 'TRUE -- all statuses' : '/* choose status filter */';
  const lower = answers.lower === 'event' ? 'mz_now() >= o.event_at' : answers.lower === 'none' ? 'TRUE -- no entry bound' : '/* choose entry bound */';
  const upper = answers.upper === 'exclusive' ? "mz_now() < o.event_at + INTERVAL '5 minutes'"
    : answers.upper === 'inclusive' ? "mz_now() <= o.event_at + INTERVAL '5 minutes'"
      : answers.upper === 'arrival' ? "mz_now() < arrival_at + INTERVAL '5 minutes' -- fixture comparison only" : '/* choose expiration bound */';
  return `SELECT c.region, COUNT(*) AS orders, SUM(o.amount) AS total\nFROM orders AS o JOIN customers AS c\n  ON o.customer_id = c.customer_id\nWHERE ${status}\n  AND ${lower}\n  AND ${upper}\nGROUP BY c.region;`;
}
export function stateCost(answers: Answers): number {
  return (answers.helper === 'materialized' ? 4 : 0) + (answers.final === 'materialized' ? 4 : 0) + (answers.indexes === 'both' ? 4 : answers.indexes && answers.indexes !== 'none' ? 2 : 0);
}

export function progressState(resumed = false, caughtUp = false) {
  if (caughtUp && !resumed) throw new Error('Resume the limiting connection before finishing catch-up');
  const orders = incidentRules.caughtUpFrontier;
  const customers = resumed ? incidentRules.caughtUpFrontier : incidentRules.stalledFrontier;
  const permitted = Math.min(orders, customers, incidentRules.wallClock + 1);
  const aggregate = caughtUp ? permitted : incidentRules.stalledFrontier;
  return { clock: incidentRules.wallClock, orders, customers, permitted, aggregate, serving: aggregate, queryMs: 40 };
}

export function readFixture(caughtUp = false): ReadSnapshot {
  const state = progressState(true, caughtUp);
  return windowFixture(600000, state.serving, 610000, state.orders, {
    inputs: [{ id: 'totals', name: 'Operations aggregate index', retained: 600000, write: state.serving }, { id: 'orders', name: 'Orders read input', retained: 610000, write: state.orders }],
    clock: state.clock, axis: [600000, 640000], label: 'Incident read · supplied retained history',
  });
}
export function boundedRead(bound: number, caughtUp = false) { return applyRead(readFixture(caughtUp), { type: 'request', request: { policy: 'bounded', bound } }).attempt!; }
export function strictRead() { return applyRead(readFixture(), { type: 'request', request: { policy: 'strict', timestamp: 630000 } }).attempt!; }

const baseline = runOrders()[9]!.rows;
const lastChanges = runOrders()[10]!.diffs;
export const clientRecords: readonly StreamRecord[] = [
  progress(631000), ...baseline.map(row => data(631000, 1, row)), progress(631001),
  ...lastChanges.filter(change => change.diff < 0).map(change => data(632000, change.diff, change.row)),
  progress(632000), ...lastChanges.filter(change => change.diff > 0).map(change => data(632000, change.diff, change.row)), progress(632001),
];
export function clientAt(deliveries: number, snapshot = true) {
  const records = snapshot ? clientRecords : clientRecords.filter(record => record.kind !== 'data' || record.timestamp !== 631000);
  return applySubscriptions(createSubscription(snapshot, 'regional_order_totals', 631000), records.slice(0, deliveries).map(receive));
}

export function clientPreview(answers: Answers, deliveries: number): readonly ResultRow[] {
  if (answers.snapshot === 'off') return [];
  const state = clientAt(deliveries);
  if (answers.apply === 'signed' && answers.publish === 'later') return state.published.map(entry => entry.row);
  let rows: readonly ResultRow[] = [];
  const received = clientRecords.slice(0, deliveries);
  for (const record of received) {
    if (record.kind !== 'data') continue;
    const safe = record.timestamp < (state.publishedBefore ?? 631000);
    const equal = record.timestamp <= (state.progress ?? 0);
    const pair = received.some(item => item.kind === 'data' && item.timestamp === record.timestamp && item.diff > 0) && received.some(item => item.kind === 'data' && item.timestamp === record.timestamp && item.diff < 0);
    if (!safe && answers.publish !== 'each' && !(answers.publish === 'equal' && equal) && !(answers.publish === 'pair' && pair)) continue;
    if (answers.apply === 'region') rows = [...rows.filter(row => row.region !== record.row.region), ...(record.diff > 0 ? [record.row] : [])];
    else if (record.diff > 0) rows = [...rows, record.row];
    else if (answers.apply !== 'positive') rows = rows.filter(row => tupleKey(row) !== tupleKey(record.row));
  }
  return rows;
}
