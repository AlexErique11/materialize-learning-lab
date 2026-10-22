export type ReadPolicy = 'timestamp' | 'serializable' | 'strict' | 'bounded';
export type ReadStatus = 'available' | 'waiting' | 'too-old' | 'stale';
export interface InputWindow { readonly id: string; readonly name: string; readonly retained: number; readonly write: number }
export interface ReadRequest { readonly policy: ReadPolicy; readonly timestamp?: number; readonly bound?: number }
export interface ReadAttempt {
  readonly policy: ReadPolicy; readonly timestamp: number; readonly status: ReadStatus;
  readonly bound?: number; readonly age?: number; readonly rowVisible: boolean;
}
export interface ReadSnapshot {
  readonly inputs: readonly [InputWindow, InputWindow];
  readonly axis: readonly [number, number];
  readonly clock?: number;
  readonly attempt: ReadAttempt | null;
  readonly observed?: { readonly timestamp: number; readonly rowVisible: boolean };
  readonly row?: { readonly id: number; readonly logicalTime?: number; readonly ingested: boolean; readonly processed: boolean };
  readonly ingestionPaused: boolean;
  readonly queryMs?: number;
  readonly label: string;
}
export type ReadAction =
  | { readonly type: 'explain' | 'release' | 'pause-ingestion' | 'resume-ingestion' | 'process' }
  | { readonly type: 'fixture'; readonly snapshot: ReadSnapshot }
  | { readonly type: 'request'; readonly request: ReadRequest }
  | { readonly type: 'frontier'; readonly input: 0 | 1; readonly write?: number; readonly retained?: number }
  | { readonly type: 'clock'; readonly to: number }
  | { readonly type: 'upstream'; readonly id: number }
  | { readonly type: 'ingest'; readonly timestamp: number }
  | { readonly type: 'duration'; readonly milliseconds: number };

export const policyNames: Record<ReadPolicy, string> = { timestamp: 'Selected timestamp', serializable: 'Serializable', strict: 'Strict serializable', bounded: 'Bounded staleness' };
export const statusNames: Record<ReadStatus, string> = { available: 'Available', waiting: 'Waiting', 'too-old': 'Too old', stale: 'Staleness bound exceeded' };

export function windowFixture(retainedA = 3, writeA = 10, retainedB = 5, writeB = 8, extra: Partial<ReadSnapshot> = {}): ReadSnapshot {
  const snapshot: ReadSnapshot = {
    inputs: [{ id: 'orders', name: 'Orders', retained: retainedA, write: writeA }, { id: 'payments', name: 'Payments', retained: retainedB, write: writeB }],
    axis: [0, 20], attempt: null, ingestionPaused: false, label: 'Logical-time fixture', ...extra,
  };
  if (snapshot.inputs.some(input => !Number.isSafeInteger(input.retained) || !Number.isSafeInteger(input.write) || input.retained > input.write)) throw new Error('Invalid retained/write boundaries');
  return snapshot;
}
export function sharedWindow(snapshot: ReadSnapshot) {
  return { retained: Math.max(...snapshot.inputs.map(input => input.retained)), write: Math.min(...snapshot.inputs.map(input => input.write)) };
}
export function classifyTimestamp(snapshot: ReadSnapshot, timestamp: number): ReadStatus {
  const window = sharedWindow(snapshot);
  return timestamp < window.retained ? 'too-old' : timestamp >= window.write ? 'waiting' : 'available';
}

function requestRead(snapshot: ReadSnapshot, request: ReadRequest, selectedTimestamp?: number): ReadSnapshot {
  const window = sharedWindow(snapshot);
  if (request.policy === 'bounded' && (snapshot.clock === undefined || !Number.isSafeInteger(request.bound) || request.bound! <= 0)) throw new Error('Bounded reads require a clock and positive bound');
  if (['timestamp', 'strict'].includes(request.policy) && !Number.isSafeInteger(request.timestamp)) throw new Error('This request requires an explicit illustrative target');
  const timestamp = selectedTimestamp ?? (request.policy === 'timestamp' ? request.timestamp!
    : request.policy === 'strict' ? Math.max(request.timestamp!, snapshot.observed?.timestamp ?? request.timestamp!)
      : Math.max(window.retained, window.write - 1));
  let status = classifyTimestamp(snapshot, timestamp);
  const age = snapshot.clock === undefined ? undefined : Math.max(0, snapshot.clock - timestamp);
  if (request.policy === 'bounded' && (status !== 'available' || age! > request.bound!)) status = 'stale';
  const rowVisible = status === 'available' && Boolean(snapshot.row?.ingested && snapshot.row.processed && snapshot.row.logicalTime !== undefined && snapshot.row.logicalTime <= timestamp);
  const attempt: ReadAttempt = { policy: request.policy, timestamp, status, bound: request.bound, age, rowVisible };
  return { ...snapshot, attempt, observed: status === 'available' ? { timestamp, rowVisible } : snapshot.observed };
}

/** Completed and failed requests are sealed; only a pending read can finish on progress. */
export function applyRead(snapshot: ReadSnapshot, action: ReadAction): ReadSnapshot {
  switch (action.type) {
    case 'explain': return snapshot;
    case 'fixture': return action.snapshot;
    case 'release': return { ...snapshot, attempt: null };
    case 'request': return requestRead(snapshot, action.request);
    case 'frontier': {
      const previous = snapshot.inputs[action.input];
      const input = { ...previous, retained: action.retained ?? previous.retained, write: action.write ?? previous.write };
      if (!Number.isSafeInteger(input.retained) || !Number.isSafeInteger(input.write) || input.retained < previous.retained || input.write < previous.write || input.retained > input.write) throw new Error('Frontiers must advance monotonically with retained <= write');
      if (snapshot.attempt?.status === 'waiting' && input.retained > snapshot.attempt.timestamp) throw new Error('A pending read holds its requested history');
      const inputs: [InputWindow, InputWindow] = [snapshot.inputs[0], snapshot.inputs[1]];
      inputs[action.input] = input;
      const next = { ...snapshot, inputs };
      return snapshot.attempt?.status === 'waiting' ? requestRead(next, snapshot.attempt, snapshot.attempt.timestamp) : next;
    }
    case 'clock':
      if (snapshot.clock === undefined || action.to < snapshot.clock || !Number.isSafeInteger(action.to)) throw new Error('The clock must advance within its fixture');
      return { ...snapshot, clock: action.to };
    case 'pause-ingestion': return { ...snapshot, ingestionPaused: true };
    case 'resume-ingestion': return { ...snapshot, ingestionPaused: false };
    case 'upstream': return { ...snapshot, row: { id: action.id, ingested: false, processed: false } };
    case 'ingest':
      if (!snapshot.row || snapshot.ingestionPaused || snapshot.row.ingested || !Number.isSafeInteger(action.timestamp) || action.timestamp < snapshot.inputs[0].write) throw new Error('Ingest a pending upstream row at an open logical time');
      return { ...snapshot, row: { ...snapshot.row, ingested: true, logicalTime: action.timestamp } };
    case 'process':
      if (!snapshot.row?.ingested) throw new Error('Ingest the row before processing it');
      return { ...snapshot, row: { ...snapshot.row, processed: true } };
    case 'duration':
      if (!Number.isFinite(action.milliseconds) || action.milliseconds < 0) throw new Error('Query duration must be nonnegative');
      return { ...snapshot, queryMs: action.milliseconds };
  }
}
export function applyReads(snapshot: ReadSnapshot, actions: readonly ReadAction[]): ReadSnapshot { return actions.reduce(applyRead, snapshot); }
export function formatReadTime(snapshot: ReadSnapshot, value: number): string { return snapshot.clock === undefined ? String(value) : `${Number((value / 1000).toFixed(3))} s`; }

export function orderingFixture(time = 10, latest = 7): ReadSnapshot {
  return windowFixture(2, time + 2, 2, latest + 1, {
    inputs: [{ id: 'orders', name: 'Orders', retained: 2, write: time + 2 }, { id: 'join', name: 'Paid orders', retained: 2, write: latest + 1 }],
    row: { id: 42, logicalTime: time, ingested: true, processed: true }, observed: { timestamp: time, rowVisible: true }, label: 'T1 completed · order 42 present',
  });
}
export function clockFixture(now = 100000, latest = 98000): ReadSnapshot {
  return windowFixture(90000, latest + 1, 90000, latest + 1, { clock: now, axis: [90000, 112000], label: 'Clock-aligned fixture · milliseconds displayed as seconds' });
}
