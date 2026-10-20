export type LaneId = 'orders' | 'payments' | 'join' | 'revenue';
export const laneNames: Record<LaneId, string> = { orders: 'Orders', payments: 'Payments', join: 'Paid orders', revenue: 'Revenue' };
export interface Observation { logicalTime: number; eventTime?: number; orderId: number }
export interface ProgressSnapshot {
  readonly frontiers: Readonly<Record<LaneId, number>>;
  readonly showRevenue: boolean;
  readonly observed: Partial<Record<LaneId, readonly Observation[]>>;
  readonly reports: Readonly<Record<LaneId, readonly number[]>>;
  readonly clock?: number;
  readonly queryMs?: number;
  readonly queryTarget?: number;
  readonly backlog?: readonly [number, number];
  readonly sourceStatus?: 'stalled' | 'running';
  readonly journey?: { changed: number; ready: number; requested: number; returned: number };
  readonly evidence?: string;
}
export type ProgressAction =
  | { type: 'frontier'; lane: LaneId; to: number }
  | { type: 'observe'; lane: 'orders' | 'payments'; change: Observation }
  | { type: 'clock'; to: number }
  | { type: 'fixture'; snapshot: ProgressSnapshot }
  | { type: 'explain' };

export function fixture(orders: number, payments: number, join: number, options: Partial<Omit<ProgressSnapshot, 'frontiers' | 'reports'>> & { revenue?: number } = {}): ProgressSnapshot {
  const { revenue = join, ...rest } = options;
  if (join > Math.min(orders, payments) || revenue > join || [orders, payments, join, revenue].some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('Invalid progress fixture');
  return { showRevenue: false, observed: {}, ...rest, frontiers: { orders, payments, join, revenue }, reports: { orders: [orders], payments: [payments], join: [join], revenue: [revenue] } };
}
export const inputLimit = (s: ProgressSnapshot, lane: 'join' | 'revenue' = 'join') => lane === 'join' ? Math.min(s.frontiers.orders, s.frontiers.payments) : s.frontiers.join;
export const limitingInputs = (s: ProgressSnapshot) => (['orders', 'payments'] as const).filter(id => s.frontiers[id] === inputLimit(s));
export const isComplete = (frontier: number, timestamp: number) => timestamp < frontier;

export function applyProgress(s: ProgressSnapshot, action: ProgressAction): ProgressSnapshot {
  if (action.type === 'fixture') return action.snapshot;
  if (action.type === 'explain') return s;
  if (action.type === 'clock') {
    if (s.clock === undefined || action.to < s.clock || !Number.isSafeInteger(action.to)) throw new Error('Clock must advance within an aligned fixture');
    return { ...s, clock: action.to };
  }
  if (action.type === 'observe') {
    if (!Number.isSafeInteger(action.change.logicalTime) || action.change.logicalTime < s.frontiers[action.lane]) throw new Error('Change is below a completed frontier');
    return { ...s, observed: { ...s.observed, [action.lane]: [...(s.observed[action.lane] ?? []), action.change] } };
  }
  const { lane, to } = action;
  if (!Number.isSafeInteger(to) || to < s.frontiers[lane]) throw new Error('Frontiers must be monotone');
  if ((lane === 'join' || lane === 'revenue') && to > inputLimit(s, lane)) throw new Error('Downstream completion exceeds its inputs');
  if (s.clock !== undefined && to > s.clock) throw new Error('Aligned fixture cannot complete future wall-clock time');
  return { ...s, frontiers: { ...s.frontiers, [lane]: to }, reports: { ...s.reports, [lane]: [...s.reports[lane], to] } };
}

export function lagFor(s: ProgressSnapshot, lane: 'join' | 'revenue') {
  const frontier = s.frontiers[lane];
  const root = inputLimit(s);
  const local = inputLimit(s, lane) - frontier;
  const global = root - frontier;
  return { local, inherited: global - local, global, source: s.clock === undefined ? undefined : s.clock - root,
    wallclock: s.clock === undefined ? undefined : s.clock - frontier };
}
export function reactionTime(j: NonNullable<ProgressSnapshot['journey']>) {
  if (j.changed > j.ready || j.ready !== j.requested || j.requested > j.returned) throw new Error('This journey requires a query at result readiness');
  return { freshness: j.ready - j.changed, query: j.returned - j.requested, total: j.returned - j.changed };
}
