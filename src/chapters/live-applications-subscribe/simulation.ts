export interface ResultRow { readonly region: string; readonly orders: number; readonly total: number }
export interface RowCount { readonly row: ResultRow; readonly count: number }
export type StreamRecord =
  | { readonly kind: 'data'; readonly timestamp: number; readonly diff: number; readonly row: ResultRow }
  | { readonly kind: 'progress'; readonly timestamp: number };
export interface SubscriptionState {
  readonly name: string;
  readonly start: number;
  readonly snapshot: boolean;
  readonly connected: boolean;
  readonly records: readonly StreamRecord[];
  readonly knownCompleteBefore: number | null;
  readonly publishedBefore: number | null;
  readonly progress: number | null;
  readonly published: readonly RowCount[];
  readonly pending: readonly Extract<StreamRecord, { kind: 'data' }>[];
  readonly ready: boolean;
}
export type SubscriptionAction =
  | { readonly type: 'receive'; readonly record: StreamRecord }
  | { readonly type: 'disconnect' }
  | { readonly type: 'observe' }
  | { readonly type: 'fixture'; readonly state: SubscriptionState };

export const eu100: ResultRow = { region: 'EU', orders: 2, total: 100 };
export const eu130: ResultRow = { region: 'EU', orders: 2, total: 130 };
export const us50: ResultRow = { region: 'US', orders: 1, total: 50 };
export const progress = (timestamp: number): StreamRecord => ({ kind: 'progress', timestamp });
export const data = (timestamp: number, diff: number, row: ResultRow): StreamRecord => ({ kind: 'data', timestamp, diff, row });
export const receive = (record: StreamRecord): SubscriptionAction => ({ type: 'receive', record });

export function createSubscription(snapshot = true, name = 'open_order_totals', start = 10): SubscriptionState {
  return { name, start, snapshot, connected: true, records: [], knownCompleteBefore: null,
    publishedBefore: null, progress: null, published: [], pending: [], ready: false };
}

const rowKey = (row: ResultRow) => JSON.stringify([row.region, row.orders, row.total]);
export function consolidate(base: readonly RowCount[], changes: readonly { readonly row: ResultRow; readonly diff: number }[]): readonly RowCount[] {
  const counts = new Map(base.map(item => [rowKey(item.row), item]));
  for (const { row, diff } of changes) {
    if (!Number.isSafeInteger(diff)) throw new Error('Diffs must be safe integers');
    const key = rowKey(row);
    const count = (counts.get(key)?.count ?? 0) + diff;
    if (!Number.isSafeInteger(count)) throw new Error('Multiplicity exceeds safe integer range');
    if (count === 0) counts.delete(key);
    else counts.set(key, { row, count });
  }
  return [...counts.values()].sort((a, b) => a.row.region.localeCompare(b.row.region) || a.row.orders - b.row.orders || a.row.total - b.row.total);
}

/** Knowledge advances on every later timestamp; this client's publication policy uses progress. */
export function applySubscription(state: SubscriptionState, action: SubscriptionAction): SubscriptionState {
  if (action.type === 'fixture') return action.state;
  if (action.type === 'observe') return state;
  if (action.type === 'disconnect') return { ...state, connected: false };
  if (!state.connected) throw new Error('A disconnected subscription cannot receive records');
  const record = action.record;
  if (!Number.isSafeInteger(record.timestamp) || record.timestamp < state.start || record.timestamp < (state.knownCompleteBefore ?? state.start)) {
    throw new Error('Subscription timestamps must be nondecreasing and at least the start time');
  }
  if (!state.records.length && (record.kind !== 'progress' || record.timestamp !== state.start)) {
    throw new Error('The first record must communicate the subscription start');
  }
  const next = { ...state, records: [...state.records, record], knownCompleteBefore: record.timestamp };
  if (record.kind === 'data') {
    if (!Number.isSafeInteger(record.diff)) throw new Error('Diffs must be safe integers');
    return { ...next, pending: [...state.pending, record] };
  }
  const complete = state.pending.filter(item => item.timestamp < record.timestamp);
  const published = consolidate(state.published, complete);
  if (state.snapshot && published.some(item => item.count < 0)) throw new Error('A complete result cannot have negative multiplicity');
  return { ...next, progress: record.timestamp, publishedBefore: record.timestamp, published,
    pending: state.pending.filter(item => item.timestamp >= record.timestamp),
    ready: state.snapshot && record.timestamp > state.start };
}

export const applySubscriptions = (state: SubscriptionState, actions: readonly SubscriptionAction[]) => actions.reduce(applySubscription, state);
export const canonicalRecords: readonly StreamRecord[] = [
  progress(10), data(10, 1, eu100), data(10, 1, us50), progress(11),
  data(12, -1, eu100), progress(12), data(12, 1, eu130), progress(13), progress(14),
  data(15, -1, us50), progress(16), data(18, -1, eu130), progress(19),
];
export const deliveryAt = (count: number) => applySubscriptions(createSubscription(), canonicalRecords.slice(0, count).map(receive));
export const snapshotOff = () => applySubscriptions(createSubscription(false), [progress(10), data(12, -1, eu100), data(12, 1, eu130), progress(13)].map(receive));
export const duplicateStart = () => applySubscriptions(createSubscription(true, 'row_copies'), [progress(10), data(10, 2, eu100), progress(11)].map(receive));
export function timestampGroups(state: SubscriptionState) {
  const times = [...new Set(state.records.filter(record => record.kind === 'data').map(record => record.timestamp))];
  return times.map(timestamp => ({ timestamp,
    records: state.records.filter((record): record is Extract<StreamRecord, { kind: 'data' }> => record.kind === 'data' && record.timestamp === timestamp),
    complete: timestamp < (state.knownCompleteBefore ?? state.start),
    published: timestamp < (state.publishedBefore ?? state.start),
  }));
}
