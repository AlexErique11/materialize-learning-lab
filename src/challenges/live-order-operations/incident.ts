import { applyRead, windowFixture, type ReadAttempt } from '../../chapters/consistent-reads/simulation';
import { applySubscriptions, consolidate, createSubscription, data, progress, receive, type ResultRow, type StreamRecord } from '../../chapters/live-applications-subscribe/simulation';
import { aggregate, correctQuery, events, ingest, producerHistory, qualifies, resultDiffs, type Order, type SourceConfiguration } from './simulation';

export const initialPredicate = "o.status = 'paid'\nAND mz_now() >= o.event_at\nAND mz_now() < o.arrived_at + INTERVAL '5 minutes'";
export const repairedPredicate = "o.status = 'paid'\nAND mz_now() >= o.event_at\nAND mz_now() < o.event_at + INTERVAL '5 minutes'";
export const workspaces = ['Dashboard', 'Data', 'SQL', 'System', 'Client'] as const;
export type Workspace = typeof workspaces[number];
export interface Configuration {
  predicate: string;
  source: { envelope: 'UPSERT' | 'NONE'; key: 'order_id' | 'customer_id' };
  connected: boolean;
  helper: 'view' | 'materialized';
  final: 'view' | 'materialized';
  indexes: 'both' | 'operations' | 'none';
  publication: 'each' | 'equal' | 'complete';
  snapshot: boolean;
  fallback: boolean;
}
export const initialConfiguration = (): Configuration => ({ predicate: initialPredicate, source: { envelope: 'NONE', key: 'order_id' }, connected: false, helper: 'materialized', final: 'materialized', indexes: 'operations', publication: 'each', snapshot: true, fallback: false });
export interface TraceFrame { time: number; rows: ResultRow[] }
export const traceTimes = [600000, 601000, 602000, 603000, 604000, 605000, 609999, 610000, 619999, 620000, 622999, 630000, 631000, 631001, 632000, 632001, 840000, 840001] as const;

export function ordersAt(time: number, source: SourceConfiguration, variant = 0): readonly Order[] {
  const transform = (row: Order): Order => ({ ...row, orderId: row.orderId + variant * 1000, amount: row.amount + variant * 11, eventAt: row.eventAt + variant * 7000, arrivedAt: row.arrivedAt });
  let rows = producerHistory.reduce<readonly Order[]>((rows, row) => ingest(rows, transform(row), source), []);
  for (const event of events) if (event.time <= time && event.record) rows = ingest(rows, transform(event.record), source);
  return rows;
}
export function expectedAt(time: number, variant = 0) {
  return aggregate(ordersAt(time, { envelope: 'UPSERT', key: 'order_id' }, variant).filter(row => qualifies(row, time, correctQuery)));
}
export function rowsAt(trace: readonly TraceFrame[], time: number): readonly ResultRow[] { return trace.find(frame => frame.time === time)?.rows ?? []; }
export const objectCost = (config: Configuration) => (config.helper === 'materialized' ? 4 : 0) + (config.final === 'materialized' ? 4 : 0) + (config.indexes === 'both' ? 4 : config.indexes === 'operations' ? 2 : 0);
export const hasServingPath = (config: Configuration) => config.final === 'materialized' && config.indexes !== 'none';
export function frontiers(config: Configuration, time: number, processed: boolean | number) {
  const orders = time + 1;
  const completeTime = typeof processed === 'number' ? processed : processed ? time : 622999;
  const customers = config.connected ? time + 1 : completeTime + 1;
  const output = Math.min(orders, customers, completeTime + 1);
  return { orders, customers, output, clock: time };
}
export function readWindow(config: Configuration, time: number, processed: boolean | number, attempt: ReadAttempt | null = null) {
  const f = frontiers(config, time, processed);
  return { ...windowFixture(600000, f.output, 610000, f.orders, { clock: time, axis: [600000, 640000], inputs: [{ id: 'totals', name: 'Regional totals', retained: 600000, write: f.output }, { id: 'orders', name: 'Orders input', retained: 610000, write: f.orders }] }), attempt };
}
export function requestRead(config: Configuration, time: number, processed: boolean | number, fallback = false) {
  const attempt = applyRead(readWindow(config, time, processed), { type: 'request', request: { policy: 'bounded', bound: fallback ? 10000 : 3000 } }).attempt!;
  return hasServingPath(config) ? attempt : { ...attempt, status: 'waiting' as const, rowVisible: false };
}
export function streamFor(trace: readonly TraceFrame[], snapshot: boolean): StreamRecord[] {
  const baseline = rowsAt(trace, 631000);
  const diffs = resultDiffs(baseline, rowsAt(trace, 632000));
  return [progress(631000), ...(snapshot ? baseline.map(row => data(631000, 1, row)) : []), progress(631001),
    ...diffs.filter(change => change.diff < 0).map(change => data(632000, change.diff, change.row)), progress(632000),
    ...diffs.filter(change => change.diff > 0).map(change => data(632000, change.diff, change.row)), progress(632001)];
}
export function clientState(trace: readonly TraceFrame[], config: Configuration, deliveries: number) {
  const records = streamFor(trace, config.snapshot).slice(0, deliveries);
  const state = applySubscriptions(createSubscription(config.snapshot, 'regional_order_totals', 631000), records.map(receive));
  if (config.publication === 'complete') return state;
  const updates = records.filter((record): record is Extract<StreamRecord, { kind: 'data' }> => record.kind === 'data'
    && (config.publication === 'each' || record.timestamp <= (state.progress ?? 0)));
  return { ...state, published: consolidate([], updates), ready: updates.length > 0, publishedBefore: config.publication === 'each' ? records.at(-1)?.timestamp ?? null : state.progress };
}
export const businessRequirements = [
  'Paid-order counts and totals by customer region, during [event time, event time + five minutes).',
  'A correction replaces the previous version of the same order.',
  'Normal snapshots are at most three seconds old. During the incident, a labeled ten-second fallback or unavailable response is authorized.',
  'The application publishes complete results and never exposes a partial timestamp.',
  'Operations and support share one durable result, with local serving indexes, within eight illustrative state units.',
];
export const incidentMessage = 'Regional totals disagree with the latest paid orders during the flash sale. Can we trust this dashboard before the next sale wave?';
export const workspaceHints: Record<Workspace, readonly string[]> = {
  Dashboard: ['Compare the logical timestamp of a result with the time of the order you are checking.', 'A correct query, a recent snapshot, and a complete application update are separate properties.', 'Explore SQL, System, and Client independently; a healthy layer does not establish that the others are healthy.'],
  Data: ['Compare successive messages for an order with the current source relation. Are old versions still present?', 'The producer sends full replacement values, rather than independent events. Which envelope keeps only the latest version?', 'Use UPSERT with order_id, apply the source settings, and compare the rebuilt relation with the retained messages.'],
  SQL: ['Find an order that arrived late. Compare its event timestamp with its arrival timestamp.', 'Inspect what determines expiration, including when only the clock advances.', 'Use the event timestamp for both the entry bound and the exclusive five-minute expiration bound.'],
  System: ['Check freshness, access for both teams, and the eight-unit budget separately.', 'Compare input frontiers and connection history. Does the helper need stored state, and can both teams serve the shared result?', 'Use a regular helper view, shared materialized regional totals, and operations and support indexes. Apply, resume the customer connection, process updates, and request a normal read.'],
  Client: ['Compare the database result with the application after each individual delivery.', 'A retraction and replacement can arrive separately at the same timestamp.', 'Buffer signed full-row changes until progress is strictly greater than their timestamp.'],
};
