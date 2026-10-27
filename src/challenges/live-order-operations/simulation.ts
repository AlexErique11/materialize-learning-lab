import type { ResultRow } from '../../chapters/live-applications-subscribe/simulation';
import { incidentRules } from './scenario';

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
