import type {
  CanceledTemporalDeadline, PredicateMode, TemporalAction, TemporalApplication,
  TemporalChangeBatch, TemporalDiff, TemporalEligibility, TemporalFixture,
  TemporalRow, TemporalSnapshot, TemporalTimelineRow, TemporalVisibilitySegment,
} from './types';

const DEFAULT_WINDOW_MS = 10_000;

function integerTime(timeMs: number, label: string): void {
  if (!Number.isSafeInteger(timeMs)) throw new RangeError(`${label} must be an integer millisecond offset.`);
}

function validateRow(row: TemporalRow, predicate: PredicateMode): void {
  if (!Number.isSafeInteger(row.eventId)) throw new RangeError('Event IDs must be integers.');
  integerTime(row.eventTimeMs, 'Event time');
  if (row.expiresAtMs !== undefined) integerTime(row.expiresAtMs, 'Expiration time');
  if (predicate === 'explicit-deadline' && row.expiresAtMs === undefined) {
    throw new Error('An explicit-deadline row needs expiresAtMs.');
  }
}

export function formatTemporalTime(timeMs: number): string {
  integerTime(timeMs, 'Displayed time');
  return `${(timeMs / 1000).toFixed(3)} s`;
}

export function eligibilityFor(
  row: TemporalRow, predicate: PredicateMode, windowMs = DEFAULT_WINDOW_MS,
): TemporalEligibility {
  const exitAtMs = predicate === 'explicit-deadline' ? row.expiresAtMs! : row.eventTimeMs + windowMs;
  const exitInclusive = predicate === 'inclusive-window';
  return {
    eventId: row.eventId,
    entryAtMs: predicate === 'bounded-window' || predicate === 'explicit-deadline' ? row.eventTimeMs : null,
    exitAtMs,
    exitInclusive,
    transitionAtMs: exitAtMs + (exitInclusive ? 1 : 0),
  };
}

export function matchesTemporalPredicate(
  row: TemporalRow, logicalTimeMs: number, predicate: PredicateMode, windowMs = DEFAULT_WINDOW_MS,
): boolean {
  const eligibility = eligibilityFor(row, predicate, windowMs);
  return (eligibility.entryAtMs === null || logicalTimeMs >= eligibility.entryAtMs)
    && logicalTimeMs < eligibility.transitionAtMs;
}

function projection(row: TemporalRow, predicate: PredicateMode): TemporalRow {
  return predicate === 'explicit-deadline'
    ? { eventId: row.eventId, eventTimeMs: row.eventTimeMs, expiresAtMs: row.expiresAtMs }
    : { eventId: row.eventId, eventTimeMs: row.eventTimeMs };
}

function rowKey(row: TemporalRow): string {
  return `${row.eventId}/${row.eventTimeMs}/${row.expiresAtMs ?? ''}`;
}

function sortedRows(rows: readonly TemporalRow[]): TemporalRow[] {
  return [...rows].sort((left, right) => left.eventId - right.eventId);
}

interface MutableTimelineRow {
  eventId: number;
  row: TemporalRow;
  appliedAtMs: number;
  deletedAtMs?: number;
  segments: TemporalVisibilitySegment[];
}

interface ReplayState {
  fixture: TemporalFixture;
  windowMs: number;
  logicalTimeMs: number;
  sourceRows: TemporalRow[];
  resultRows: TemporalRow[];
  resultDiffs: TemporalDiff[];
  sourceDiffs: TemporalDiff[];
  applications: TemporalApplication[];
  timeline: MutableTimelineRow[];
  canceledDeadlines: CanceledTemporalDeadline[];
  changes: TemporalChangeBatch[];
  fixtureReset: boolean;
}

function seed(fixture: TemporalFixture): ReplayState {
  integerTime(fixture.logicalTimeMs, 'Initial logical time');
  const windowMs = fixture.windowMs ?? DEFAULT_WINDOW_MS;
  integerTime(windowMs, 'Window length');
  if (windowMs <= 0) throw new RangeError('Window length must be positive.');
  const appliedAtMs = fixture.appliedAtMs ?? fixture.logicalTimeMs;
  integerTime(appliedAtMs, 'Initial application time');
  if (appliedAtMs > fixture.logicalTimeMs) throw new RangeError('Seed rows must already be applied.');
  const sourceRows = sortedRows(fixture.rows.map((row) => ({ ...row })));
  const ids = new Set(sourceRows.map((row) => row.eventId));
  if (ids.size !== sourceRows.length) throw new Error('A fixture cannot contain duplicate event IDs.');
  for (const row of sourceRows) validateRow(row, fixture.predicate);
  const resultRows = sourceRows.filter((row) => matchesTemporalPredicate(row, fixture.logicalTimeMs, fixture.predicate, windowMs))
    .map((row) => projection(row, fixture.predicate));
  return {
    fixture, windowMs, logicalTimeMs: fixture.logicalTimeMs, sourceRows, resultRows,
    resultDiffs: [], sourceDiffs: [], canceledDeadlines: [], changes: [], fixtureReset: false,
    applications: sourceRows.map((row) => ({ eventId: row.eventId, appliedAtMs, lastChangedAtMs: appliedAtMs })),
    // Earlier membership is unknown: the seeded checkpoint is the history baseline.
    timeline: sourceRows.map((row) => ({
      eventId: row.eventId, row, appliedAtMs,
      segments: resultRows.some((result) => result.eventId === row.eventId)
        ? [{ startMs: fixture.logicalTimeMs, endMs: null, row: projection(row, fixture.predicate) }] : [],
    })),
  };
}

function deriveResult(state: ReplayState, timeMs: number): void {
  const predicate = state.fixture.predicate;
  const next = state.sourceRows.filter((row) => matchesTemporalPredicate(row, timeMs, predicate, state.windowMs))
    .map((row) => projection(row, predicate));
  const oldKeys = new Set(state.resultRows.map(rowKey));
  const nextKeys = new Set(next.map(rowKey));
  const diffs: TemporalDiff[] = [
    ...state.resultRows.filter((row) => !nextKeys.has(rowKey(row))).map((row) => ({ row, diff: -1 as const, timeMs })),
    ...next.filter((row) => !oldKeys.has(rowKey(row))).map((row) => ({ row, diff: 1 as const, timeMs })),
  ];
  for (const diff of diffs) {
    const lane = state.timeline.find((candidate) => candidate.eventId === diff.row.eventId)!;
    if (diff.diff === -1) {
      const openIndex = lane.segments.findIndex((segment) => segment.endMs === null);
      if (openIndex !== -1) lane.segments[openIndex] = { ...lane.segments[openIndex]!, endMs: timeMs };
    } else {
      lane.segments.push({ startMs: timeMs, endMs: null, row: diff.row });
    }
  }
  if (diffs.length > 0) {
    state.resultDiffs = diffs;
    state.changes.push({ timeMs, diffs });
  }
  state.resultRows = next;
  state.logicalTimeMs = timeMs;
}

function advanceBefore(state: ReplayState, timeMs: number, includeTarget: boolean): void {
  const boundaries = new Set<number>();
  for (const row of state.sourceRows) {
    const eligibility = eligibilityFor(row, state.fixture.predicate, state.windowMs);
    for (const boundary of [eligibility.entryAtMs, eligibility.transitionAtMs]) {
      if (boundary !== null && boundary > state.logicalTimeMs
        && (includeTarget ? boundary <= timeMs : boundary < timeMs)) boundaries.add(boundary);
    }
  }
  for (const boundary of [...boundaries].sort((left, right) => left - right)) deriveResult(state, boundary);
}

function applySourceAction(state: ReplayState, action: Exclude<TemporalAction, { kind: 'switch-fixture' } | { kind: 'advance' }>): void {
  const eventId = action.kind === 'delete' ? action.eventId : action.row.eventId;
  const before = state.sourceRows.find((row) => row.eventId === eventId);
  if (action.kind === 'insert' && before) throw new Error(`Event ${eventId} already exists.`);
  if (action.kind !== 'insert' && !before) throw new Error(`Event ${eventId} does not exist.`);
  if (action.kind !== 'delete') validateRow(action.row, state.fixture.predicate);
  const after = action.kind === 'delete' ? undefined : { ...action.row };
  if (before) {
    const oldDeadline = eligibilityFor(before, state.fixture.predicate, state.windowMs);
    const nextDeadline = after ? eligibilityFor(after, state.fixture.predicate, state.windowMs) : undefined;
    if (oldDeadline.transitionAtMs > action.timeMs && oldDeadline.transitionAtMs !== nextDeadline?.transitionAtMs) {
      state.canceledDeadlines.push({ eventId, deadlineMs: oldDeadline.exitAtMs, canceledAtMs: action.timeMs,
        reason: action.kind === 'delete' ? 'deleted' : 'updated' });
    }
  }
  state.sourceRows = sortedRows([...state.sourceRows.filter((row) => row.eventId !== eventId), ...(after ? [after] : [])]);
  state.sourceDiffs = [
    ...(before ? [{ row: before, diff: -1 as const, timeMs: action.timeMs }] : []),
    ...(after ? [{ row: after, diff: 1 as const, timeMs: action.timeMs }] : []),
  ];
  const lane = state.timeline.find((candidate) => candidate.eventId === eventId);
  if (after) {
    if (lane) { lane.row = after; delete lane.deletedAtMs; }
    else state.timeline.push({ eventId, row: after, appliedAtMs: action.timeMs, segments: [] });
  } else if (lane) lane.deletedAtMs = action.timeMs;
  const application = state.applications.find((candidate) => candidate.eventId === eventId);
  state.applications = [...state.applications.filter((candidate) => candidate.eventId !== eventId), {
    eventId, appliedAtMs: application?.appliedAtMs ?? action.timeMs, lastChangedAtMs: action.timeMs,
  }].sort((left, right) => left.eventId - right.eventId);
}

/** Replay complete checkpoints; UI checkpoint indices are not logical timestamps. */
export function temporalSnapshotAt(
  checkpoint: number, fixture: TemporalFixture, actions: readonly TemporalAction[],
): TemporalSnapshot {
  if (!Number.isInteger(checkpoint) || checkpoint < 0 || checkpoint > actions.length) {
    throw new RangeError('Unknown temporal checkpoint.');
  }
  let state = seed(fixture);
  for (const action of actions.slice(0, checkpoint)) {
    if (action.kind === 'switch-fixture') {
      state = seed(action.fixture);
      state.fixtureReset = true;
      continue;
    }
    integerTime(action.timeMs, 'Action time');
    if (action.timeMs < state.logicalTimeMs) throw new RangeError('Logical time cannot move backwards within a fixture.');
    state.fixtureReset = false;
    state.resultDiffs = [];
    state.sourceDiffs = [];
    advanceBefore(state, action.timeMs, action.kind === 'advance');
    if (action.kind !== 'advance') applySourceAction(state, action);
    deriveResult(state, action.timeMs);
  }
  const timeline: TemporalTimelineRow[] = [...state.timeline].sort((left, right) => left.eventId - right.eventId);
  return {
    fixtureId: state.fixture.id, fixtureLabel: state.fixture.label, predicate: state.fixture.predicate,
    windowMs: state.windowMs, logicalTimeMs: state.logicalTimeMs,
    sourceRows: state.sourceRows, resultRows: state.resultRows, resultDiffs: state.resultDiffs,
    sourceDiffs: state.sourceDiffs, applications: state.applications, timeline,
    eligibility: state.sourceRows.map((row) => eligibilityFor(row, state.fixture.predicate, state.windowMs)),
    canceledDeadlines: state.canceledDeadlines, changes: state.changes, fixtureReset: state.fixtureReset,
  };
}
