import { describe, expect, it } from 'vitest';
import { eligibilityFor, formatTemporalTime, matchesTemporalPredicate, temporalSnapshotAt } from './simulation';
import { temporalLectures } from './scenarios';
import type { PredicateMode, TemporalAction, TemporalFixture, TemporalRow } from './types';

const event = (eventId: number, eventTimeMs = 10_000, expiresAtMs?: number): TemporalRow =>
  ({ eventId, eventTimeMs, ...(expiresAtMs === undefined ? {} : { expiresAtMs }) });
const fixture = (predicate: PredicateMode = 'exclusive-window', rows: readonly TemporalRow[] = [event(101)]): TemporalFixture => ({
  id: 'test', label: 'Test fixture', logicalTimeMs: 12_000, appliedAtMs: 12_000, rows, predicate, windowMs: 10_000,
});
const at = (timeMs: number): TemporalAction => ({ kind: 'advance', timeMs });
const ids = (rows: readonly TemporalRow[]) => rows.map((row) => row.eventId);
const diffSigns = (snapshot: ReturnType<typeof temporalSnapshotAt>) => snapshot.resultDiffs.map(({ row, diff, timeMs }) => [row.eventId, diff, timeMs]);

describe('temporal predicate semantics', () => {
  it('distinguishes the exact exclusive and inclusive millisecond boundaries', () => {
    expect([19_999, 20_000, 20_001].map((time) => matchesTemporalPredicate(event(101), time, 'exclusive-window')))
      .toEqual([true, false, false]);
    expect([19_999, 20_000, 20_001].map((time) => matchesTemporalPredicate(event(101), time, 'inclusive-window')))
      .toEqual([true, true, false]);
    expect(eligibilityFor(event(101), 'inclusive-window')).toEqual({
      eventId: 101, entryAtMs: null, exitAtMs: 20_000, exitInclusive: true, transitionAtMs: 20_001,
    });
  });

  it('admits a future event under expiration-only and bounds its entry with both conditions', () => {
    const future = event(102, 20_000);
    expect(matchesTemporalPredicate(future, 12_000, 'exclusive-window')).toBe(true);
    expect([12_000, 19_999, 20_000, 29_999, 30_000].map((time) => matchesTemporalPredicate(future, time, 'bounded-window')))
      .toEqual([false, false, true, true, false]);
  });

  it('uses a per-row deadline and refuses a lifetime that has already ended', () => {
    expect(matchesTemporalPredicate(event(101, 10_000, 16_000), 17_000, 'explicit-deadline')).toBe(false);
    expect(matchesTemporalPredicate(event(101, 20_000, 16_000), 17_000, 'explicit-deadline')).toBe(false);
  });
});

describe('deterministic temporal checkpoints', () => {
  it('keeps every authored lecture checkpoint within its three-row and two-diff display budget', () => {
    const expectedResultCounts = [
      [1, 1, 0, 0, 1, 1, 1, 0],
      [1, 0, 1, 0, 0, 2, 1, 0],
      [0, 1, 2, 2, 0, 0],
      [3, 3, 2, 1, 1, 1, 1, 0],
    ];
    for (const [lectureIndex, lecture] of temporalLectures.entries()) {
      const counts = [];
      for (let checkpoint = 0; checkpoint <= lecture.actions.length; checkpoint += 1) {
        const state = temporalSnapshotAt(checkpoint, lecture.fixture, lecture.actions);
        counts.push(state.resultRows.length);
        expect(state.sourceRows.length).toBeLessThanOrEqual(3);
        expect(state.resultRows.length).toBeLessThanOrEqual(3);
        expect(state.resultDiffs.length).toBeLessThanOrEqual(2);
      }
      expect(counts).toEqual(expectedResultCounts[lectureIndex]);
      for (const lesson of lecture.lessons) {
        expect(lesson.time).toBeGreaterThanOrEqual(0);
        expect(lesson.time).toBeLessThanOrEqual(lecture.actions.length);
        if (lesson.before) expect(lesson.time).toBeGreaterThan(0);
      }
    }
  });

  it('expires without source input and preserves the source row', () => {
    const actions = [at(19_999), at(20_000), at(20_001)];
    expect(temporalSnapshotAt(0, fixture(), actions).resultDiffs).toEqual([]);
    expect(temporalSnapshotAt(1, fixture(), actions).resultDiffs).toEqual([]);
    const expired = temporalSnapshotAt(2, fixture(), actions);
    expect(expired.sourceRows).toEqual([event(101)]);
    expect(expired.sourceDiffs).toEqual([]);
    expect(expired.resultRows).toEqual([]);
    expect(diffSigns(expired)).toEqual([[101, -1, 20_000]]);
    expect(expired.timeline[0]?.segments).toEqual([{ startMs: 12_000, endMs: 20_000, row: event(101) }]);
    expect(temporalSnapshotAt(3, fixture(), actions).resultDiffs).toEqual([]);
  });

  it('emits inclusive expiration at the next millisecond instead of the endpoint', () => {
    const actions = [at(20_000), at(20_001)];
    expect(ids(temporalSnapshotAt(1, fixture('inclusive-window'), actions).resultRows)).toEqual([101]);
    expect(diffSigns(temporalSnapshotAt(2, fixture('inclusive-window'), actions))).toEqual([[101, -1, 20_001]]);
  });

  it('records both actual transitions even when a clock step skips a whole future lifetime', () => {
    const state = temporalSnapshotAt(1, fixture('bounded-window', [event(102, 20_000)]), [at(31_000)]);
    expect(state.resultRows).toEqual([]);
    expect(state.changes.map(({ timeMs, diffs }) => [timeMs, diffs.map((diff) => diff.diff)]))
      .toEqual([[20_000, [1]], [30_000, [-1]]]);
    expect(state.timeline[0]?.segments).toEqual([{ startMs: 20_000, endMs: 30_000, row: event(102, 20_000) }]);
  });

  it('gives late rows only their remaining event-time lifetime', () => {
    const initial = { ...fixture('bounded-window', []), logicalTimeMs: 10_000, appliedAtMs: 10_000 };
    const actions: TemporalAction[] = [
      { kind: 'insert', timeMs: 12_000, row: event(101) },
      { kind: 'insert', timeMs: 18_000, row: event(102) },
      at(20_000),
      { kind: 'insert', timeMs: 21_000, row: event(103) },
    ];
    const state = temporalSnapshotAt(4, initial, actions);
    expect(ids(state.sourceRows)).toEqual([101, 102, 103]);
    expect(state.resultRows).toEqual([]);
    expect(state.resultDiffs).toEqual([]);
    expect(state.timeline.map(({ eventId, appliedAtMs, segments }) => [eventId, appliedAtMs, segments.map(({ startMs, endMs }) => [startMs, endMs])]))
      .toEqual([[101, 12_000, [[12_000, 20_000]]], [102, 18_000, [[18_000, 20_000]]], [103, 21_000, []]]);
    expect(diffSigns(temporalSnapshotAt(3, initial, actions))).toEqual([[101, -1, 20_000], [102, -1, 20_000]]);
  });

  it('replaces projected deadlines, cancels obsolete effects, and never rewrites old visibility', () => {
    const initial = fixture('explicit-deadline', [event(101, 10_000, 20_000), event(102, 10_000, 25_000), event(103, 10_000, 28_000)]);
    const actions: TemporalAction[] = [
      { kind: 'update', timeMs: 15_000, row: event(101, 10_000, 30_000) },
      { kind: 'delete', timeMs: 16_000, eventId: 102 },
      { kind: 'update', timeMs: 17_000, row: event(103, 10_000, 16_000) },
      at(20_000), at(25_000), at(28_000), at(30_000),
    ];
    const extended = temporalSnapshotAt(1, initial, actions);
    expect(extended.resultDiffs).toEqual([
      { row: event(101, 10_000, 20_000), diff: -1, timeMs: 15_000 },
      { row: event(101, 10_000, 30_000), diff: 1, timeMs: 15_000 },
    ]);
    expect(extended.timeline[0]?.segments).toEqual([
      { startMs: 12_000, endMs: 15_000, row: event(101, 10_000, 20_000) },
      { startMs: 15_000, endMs: null, row: event(101, 10_000, 30_000) },
    ]);
    const shortened = temporalSnapshotAt(3, initial, actions);
    expect(ids(shortened.sourceRows)).toEqual([101, 103]);
    expect(ids(shortened.resultRows)).toEqual([101]);
    expect(diffSigns(shortened)).toEqual([[103, -1, 17_000]]);
    expect(shortened.timeline.find((lane) => lane.eventId === 103)?.segments[0]?.endMs).toBe(17_000);
    expect(shortened.timeline.find((lane) => lane.eventId === 102)?.deletedAtMs).toBe(16_000);
    for (const checkpoint of [4, 5, 6]) {
      const state = temporalSnapshotAt(checkpoint, initial, actions);
      expect(ids(state.resultRows)).toEqual([101]);
      expect(state.resultDiffs).toEqual([]);
    }
    expect(diffSigns(temporalSnapshotAt(7, initial, actions))).toEqual([[101, -1, 30_000]]);
    expect(shortened.canceledDeadlines).toEqual([
      { eventId: 101, deadlineMs: 20_000, canceledAtMs: 15_000, reason: 'updated' },
      { eventId: 102, deadlineMs: 25_000, canceledAtMs: 16_000, reason: 'deleted' },
      { eventId: 103, deadlineMs: 28_000, canceledAtMs: 17_000, reason: 'updated' },
    ]);
  });

  it('applies a source update atomically with the old expiration at the same timestamp', () => {
    const actions: TemporalAction[] = [{ kind: 'update', timeMs: 20_000, row: event(101, 10_000, 30_000) }];
    const state = temporalSnapshotAt(1, fixture('explicit-deadline', [event(101, 10_000, 20_000)]), actions);
    expect(state.changes).toHaveLength(1);
    expect(state.resultDiffs.map(({ row, diff }) => [row.expiresAtMs, diff])).toEqual([[20_000, -1], [30_000, 1]]);
  });

  it('does not invent a projected update when only an unused expiration field changes', () => {
    const initial = fixture('exclusive-window', [event(101, 10_000, 20_000)]);
    const state = temporalSnapshotAt(1, initial, [{ kind: 'update', timeMs: 15_000, row: event(101, 10_000, 30_000) }]);
    expect(state.sourceDiffs).toHaveLength(2);
    expect(state.resultDiffs).toEqual([]);
    expect(state.resultRows).toEqual([event(101)]);
  });

  it('resets query comparisons as fresh baselines without fake result retractions', () => {
    const replacement = { ...fixture('bounded-window', [event(102, 20_000)]), id: 'bounded', label: 'Both bounds' };
    const actions: TemporalAction[] = [at(25_000), { kind: 'switch-fixture', fixture: replacement }, at(20_000)];
    const reset = temporalSnapshotAt(2, fixture(), actions);
    expect(reset.fixtureReset).toBe(true);
    expect(reset.fixtureId).toBe('bounded');
    expect(reset.logicalTimeMs).toBe(12_000);
    expect(reset.resultRows).toEqual([]);
    expect(reset.resultDiffs).toEqual([]);
    expect(reset.changes).toEqual([]);
    expect(reset.canceledDeadlines).toEqual([]);
    expect(diffSigns(temporalSnapshotAt(3, fixture(), actions))).toEqual([[102, 1, 20_000]]);
  });

  it('reconstructs every checkpoint from the baseline plus timestamp-complete diffs', () => {
    const initial = fixture('explicit-deadline', [event(101, 10_000, 20_000)]);
    const actions: TemporalAction[] = [
      { kind: 'insert', timeMs: 14_000, row: event(102, 18_000, 25_000) },
      { kind: 'update', timeMs: 15_000, row: event(101, 10_000, 30_000) },
      at(18_000), { kind: 'delete', timeMs: 19_000, eventId: 102 }, at(30_000),
    ];
    const rowText = (row: TemporalRow) => JSON.stringify(row);
    const initialRows = temporalSnapshotAt(0, initial, actions).resultRows;
    for (let checkpoint = 0; checkpoint <= actions.length; checkpoint += 1) {
      const state = temporalSnapshotAt(checkpoint, initial, actions);
      const reconstructed = new Map(initialRows.map((row) => [rowText(row), row]));
      for (const batch of state.changes) for (const diff of batch.diffs) {
        if (diff.diff === -1) expect(reconstructed.delete(rowText(diff.row))).toBe(true);
        else {
          expect(reconstructed.has(rowText(diff.row))).toBe(false);
          reconstructed.set(rowText(diff.row), diff.row);
        }
      }
      expect([...reconstructed.keys()].sort()).toEqual(state.resultRows.map(rowText).sort());
      expect(state.resultRows.every((row) => state.sourceRows.some((source) => source.eventId === row.eventId))).toBe(true);
    }
  });

  it('does not mutate fixture inputs or earlier snapshots', () => {
    const initial = fixture('explicit-deadline', [event(101, 10_000, 20_000)]);
    const actions: TemporalAction[] = [{ kind: 'update', timeMs: 15_000, row: event(101, 10_000, 30_000) }, at(30_000)];
    const beforeText = JSON.stringify({ initial, actions });
    const before = temporalSnapshotAt(1, initial, actions);
    const beforeSnapshot = JSON.stringify(before);
    temporalSnapshotAt(2, initial, actions);
    expect(JSON.stringify({ initial, actions })).toBe(beforeText);
    expect(JSON.stringify(before)).toBe(beforeSnapshot);
  });

  it('rejects invalid checkpoints, backwards time, malformed actions, and ambiguous seeds', () => {
    expect(() => temporalSnapshotAt(-1, fixture(), [])).toThrow(RangeError);
    expect(() => temporalSnapshotAt(1, fixture(), [])).toThrow(RangeError);
    expect(() => temporalSnapshotAt(1, fixture(), [at(11_000)])).toThrow(/backwards/);
    expect(() => temporalSnapshotAt(1, fixture(), [at(12_000.5)])).toThrow(/integer/);
    expect(() => temporalSnapshotAt(1, fixture(), [{ kind: 'insert', timeMs: 13_000, row: event(101) }])).toThrow(/already exists/);
    expect(() => temporalSnapshotAt(1, fixture(), [{ kind: 'delete', timeMs: 13_000, eventId: 999 }])).toThrow(/does not exist/);
    expect(() => temporalSnapshotAt(0, fixture('explicit-deadline'), [])).toThrow(/expiresAtMs/);
    expect(() => temporalSnapshotAt(0, fixture('exclusive-window', [event(101), event(101)]), [])).toThrow(/duplicate/);
  });

  it('formats relative seconds without confusing offsets with Unix seconds', () => {
    expect(formatTemporalTime(12_000)).toBe('12.000 s');
    expect(formatTemporalTime(20_001)).toBe('20.001 s');
  });
});
