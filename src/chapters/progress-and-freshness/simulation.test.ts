import { describe, expect, it } from 'vitest';
import { applyProgress, fixture, inputLimit, isComplete, lagFor, limitingInputs, reactionTime } from './simulation';
import { progressLectures } from './lecture-scenarios';
import { gradePrediction, progressExercises, solutionFor } from './exercise-scenarios';

describe('progress semantics', () => {
  it('completes times strictly below the frontier', () => {
    expect(isComplete(12, 11)).toBe(true);
    expect(isComplete(12, 12)).toBe(false);
    expect(isComplete(12, 13)).toBe(false);
  });
  it('observing high or old business timestamps does not move a frontier', () => {
    const start = fixture(12, 8, 6);
    const high = applyProgress(start, { type: 'observe', lane: 'orders', change: { logicalTime: 18, orderId: 1 } });
    const later = applyProgress(high, { type: 'observe', lane: 'orders', change: { logicalTime: 12, eventTime: 2, orderId: 2 } });
    expect(later.frontiers).toEqual(start.frontiers);
    expect(later.observed.orders?.at(-1)?.eventTime).toBe(2);
    expect(later.observed.orders?.map(change => change.logicalTime)).toEqual([18, 12]);
    expect(high.observed.orders).toHaveLength(1);
    expect(applyProgress(later, { type: 'frontier', lane: 'orders', to: 16 }).observed.orders).toHaveLength(2);
    expect(() => applyProgress(start, { type: 'observe', lane: 'orders', change: { logicalTime: 11, orderId: 3 } })).toThrow();
  });
  it('progress reports need no new rows and do not automatically process output', () => {
    const s = fixture(12, 8, 6);
    const advanced = applyProgress(s, { type: 'frontier', lane: 'payments', to: 14 });
    expect(advanced.observed).toEqual({});
    expect(inputLimit(advanced)).toBe(12);
    expect(advanced.frontiers.join).toBe(6);
    expect(advanced.reports.payments).toEqual([8, 14]);
    expect(s.reports.payments).toEqual([8]);
    expect(limitingInputs(advanced)).toEqual(['orders']);
  });
  it('processing can catch up without input changes but cannot exceed them', () => {
    const s = fixture(12, 8, 6);
    expect(applyProgress(s, { type: 'frontier', lane: 'join', to: 8 }).frontiers.join).toBe(8);
    expect(() => applyProgress(s, { type: 'frontier', lane: 'join', to: 9 })).toThrow();
    expect(() => applyProgress(s, { type: 'frontier', lane: 'orders', to: 11 })).toThrow();
    expect(limitingInputs(fixture(18, 18, 14))).toEqual(['orders', 'payments']);
    expect(() => applyProgress(s, { type: 'frontier', lane: 'revenue', to: 7 })).toThrow();
  });
  it('separates local, inherited and source delay in an aligned fixture', () => {
    const s = fixture(18, 18, 14, { revenue: 12, clock: 20, showRevenue: true });
    expect(lagFor(s, 'revenue')).toEqual({ local: 2, inherited: 4, global: 6, source: 2, wallclock: 8 });
    expect(lagFor(fixture(18, 18, 12), 'join').wallclock).toBeUndefined();
    expect(() => applyProgress(s, { type: 'frontier', lane: 'orders', to: 21 })).toThrow();
    expect(() => applyProgress(s, { type: 'clock', to: 19 })).toThrow();
    expect(applyProgress(s, { type: 'clock', to: 22 }).frontiers).toEqual(s.frontiers);
  });
  it('keeps request duration separate from maintained completion', () => {
    expect(reactionTime({ changed: 0, ready: 4, requested: 4, returned: 7 })).toEqual({ freshness: 4, query: 3, total: 7 });
    expect(() => reactionTime({ changed: 0, ready: 4, requested: 5, returned: 7 })).toThrow();
  });
});

describe('curriculum fixtures and assessments', () => {
  it.each(progressLectures.map((lecture, i) => [i + 1, lecture] as const))('lecture %i replays deterministically with valid boundaries', (_, lecture) => {
    let current = lecture.initial;
    for (const lesson of lecture.lessons) {
      current = applyProgress(current, lesson.action);
      expect(current).toEqual(lesson.snapshot);
      expect(current.frontiers.join).toBeLessThanOrEqual(inputLimit(current));
      expect(current.frontiers.revenue).toBeLessThanOrEqual(current.frontiers.join);
      expect(lesson.explanation.length).toBeGreaterThan(70);
    }
  });
  for (const exercise of progressExercises) {
    it(`${exercise.title} accepts complete solutions, rejects missing and unsupported answers`, () => {
      for (const question of exercise.questions) {
        expect(gradePrediction(question, solutionFor(question)).correct).toBe(true);
        expect(gradePrediction(question, {}).correct).toBe(false);
        const first = question.groups[0]!;
        const wrong = { ...solutionFor(question), [first.id]: ['not-supported'] };
        expect(gradePrediction(question, wrong).correct).toBe(false);
        for (const group of question.groups.filter(g => g.kind === 'integer')) {
          for (const value of ['1.5', '1e1', 'Infinity', '', '12abc']) {
            expect(gradePrediction(question, { ...solutionFor(question), [group.id]: [value] }).correct).toBe(false);
          }
        }
        for (const group of question.groups.filter(g => g.kind === 'multiple')) {
          expect(gradePrediction(question, { ...solutionFor(question), [group.id]: group.solution.slice(1) }).correct).toBe(false);
          expect(gradePrediction(question, { ...solutionFor(question), [group.id]: [...group.solution, group.solution[0]!] }).correct).toBe(false);
        }
      }
    });
  }
  it('keeps the join exercise continuous and separates independent diagnoses', () => {
    const questions = progressExercises[1]!.questions;
    for (let i = 1; i < questions.length; i++) expect(questions[i]!.before).toEqual(questions[i - 1]!.after);
    const diagnoses = progressExercises[2]!.questions;
    expect(diagnoses.slice(0, 3).map(q => q.groups[0]!.solution)).toEqual([['source'], ['join'], ['serving']]);
  });
});
