import { describe, expect, it } from 'vitest';
import { temporalExercises, temporalQuestionState } from './exercise-scenarios';
import { gradeTemporalPrediction, temporalSolution } from './exercise-grading';

const questions = temporalExercises.flatMap((exercise) => exercise.questions);
const question = (id: string) => questions.find((item) => item.id === id)!;
const state = (id: string) => temporalQuestionState(question(id), true);
const changes = (id: string) => state(id).resultDiffs.map(({ diff, row, timeMs }) => [timeMs, diff, row.eventId, row.expiresAtMs]);

describe('temporal exercise answer keys and fixtures', () => {
  it('covers the approved 4/4/5 progression with unique questions and bounded panels', () => {
    expect(temporalExercises.map((exercise) => exercise.questions.length)).toEqual([4, 4, 5]);
    expect(new Set(questions.map((item) => item.id)).size).toBe(13);
    for (const item of questions) {
      expect(item.groups.length).toBeLessThanOrEqual(2);
      for (const accepted of [false, true]) {
        const snapshot = temporalQuestionState(item, accepted);
        expect(snapshot.sourceRows.length).toBeLessThanOrEqual(3);
        expect(snapshot.resultRows.length).toBeLessThanOrEqual(3);
        expect(snapshot.resultDiffs.length).toBeLessThanOrEqual(2);
      }
      expect(gradeTemporalPrediction(item, temporalSolution(item)).correct).toBe(true);
      expect(gradeTemporalPrediction(item, {}).correct).toBe(false);
      for (const group of item.groups) if (group.kind !== 'count') {
        const expected = group.kind === 'radio' ? [group.expected] : group.expected;
        expect(new Set(group.options.map((option) => option.id)).size).toBe(group.options.length);
        expect(expected.every((id) => group.options.some((option) => option.id === id))).toBe(true);
      }
    }
  });
  it('retracts at the exclusive and inclusive millisecond boundaries without deleting inputs', () => {
    expect(changes('exclusive-boundary')).toEqual([[20_000, -1, 101, undefined]]);
    expect(changes('inclusive-boundary')).toEqual([[20_001, -1, 101, undefined]]);
    for (const id of ['exclusive-boundary', 'inclusive-boundary']) {
      expect(temporalQuestionState(question(id), false).resultRows).toHaveLength(1);
      expect(state(id).sourceRows).toHaveLength(1);
      expect(state(id).resultRows).toEqual([]);
    }
    expect(state('exclude-future').eligibility[0]).toMatchObject({ entryAtMs: 24_000, exitAtMs: 34_000 });
    expect(state('exclude-future').fixtureReset).toBe(true);
    expect(state('exclude-future').resultDiffs).toEqual([]);
  });
  it('grades the projected deadline replacement, deletion, and past-deadline update correctly', () => {
    expect(changes('extend')).toEqual([[15_000, -1, 201, 20_000], [15_000, 1, 201, 30_000]]);
    expect(changes('delete')).toEqual([[16_000, -1, 202, 25_000]]);
    expect(changes('shorten')).toEqual([[17_000, -1, 203, 28_000]]);
    expect(state('shorten').sourceRows).toEqual([
      { eventId: 201, eventTimeMs: 10_000, expiresAtMs: 30_000 },
      { eventId: 203, eventTimeMs: 10_000, expiresAtMs: 16_000 },
    ]);
    expect(state('shorten').resultRows.map((row) => row.eventId)).toEqual([201]);
    expect(state('obsolete-deadlines').changes.filter((batch) => batch.timeMs >= 20_000).map((batch) => batch.timeMs)).toEqual([30_000]);
    expect(changes('obsolete-deadlines')).toEqual([[30_000, -1, 201, 30_000]]);
    expect(state('obsolete-deadlines').sourceRows).toHaveLength(2);
  });
  it('does not restart late windows, and distinguishes source insertion from result insertion', () => {
    expect(changes('arrive-late')).toEqual([[18_000, 1, 301, undefined]]);
    expect(state('arrive-late').eligibility[0]!.exitAtMs - state('arrive-late').logicalTimeMs).toBe(2000);
    expect(state('arrive-expired').sourceRows.map((row) => row.eventId)).toEqual([302]);
    expect(state('arrive-expired').resultRows).toEqual([]);
    expect(changes('arrive-expired')).toEqual([]);
  });
  it('preserves actual application times and emits the two mixed time-only changes', () => {
    const before = temporalQuestionState(question('mixed-expiration'), false);
    expect(before.logicalTimeMs).toBe(24_000);
    expect(before.applications.map(({ eventId, appliedAtMs }) => [eventId, appliedAtMs])).toEqual([[401, 22_000], [402, 24_000], [403, 24_000]]);
    expect(before.resultRows.map((row) => row.eventId)).toEqual([401, 402]);
    expect(changes('mixed-expiration')).toEqual([[28_000, -1, 402, undefined]]);
    expect(state('mixed-expiration').resultRows.map((row) => row.eventId)).toEqual([401]);
    expect(changes('mixed-entry')).toEqual([[30_000, 1, 403, undefined]]);
    expect(state('mixed-entry').resultRows.map((row) => row.eventId)).toEqual([401, 403]);
    expect(state('mixed-entry').sourceRows).toEqual(before.sourceRows);
  });
  it('rejects incomplete and extra checkbox choices, duplicates, and malformed numeric answers', () => {
    const extension = question('extend');
    for (const changes of [['new'], ['old'], ['old', 'new', 'wrong-old'], ['old', 'new', 'new']])
      expect(gradeTemporalPrediction(extension, { changes }).correct).toBe(false);
    const late = question('arrive-late');
    for (const remaining of ['', '2x', '-2', '2.0', 'Infinity'])
      expect(gradeTemporalPrediction(late, { visible: 'enters', remaining }).correct).toBe(false);
    expect(gradeTemporalPrediction(late, { visible: 'enters', remaining: ' 2 ' }).correct).toBe(true);
    expect(temporalQuestionState(question('extend'), false).logicalTimeMs).toBe(12_000);
    expect(gradeTemporalPrediction(question('build-filter'), { filter: 'transaction' }).errors.filter).toContain('transaction start');
    expect(gradeTemporalPrediction(question('build-filter'), { filter: 'arithmetic' }).errors.filter).toContain('Move interval arithmetic');
    expect(gradeTemporalPrediction(question('build-filter'), { filter: 'or' }).errors.filter).toContain('AND');
  });
});
