import { describe, expect, it } from 'vitest';
import { lectureTwoBatches, lectureTwoInitial, lectureTwoRun, lectureTwoSteps, lectureTwoUpdates } from './lecture-two-scenario';
import { applyTimestamp, consolidateTimestamp, copiesOf, getRelationMetrics, relationAt } from './simulation';
import { initialRunState, lectureRunReducer, type LectureRunAction, type LectureRunState } from './useLectureRun';

const at = (time: number) => relationAt(lectureTwoUpdates, time, lectureTwoInitial);
const reduce = (state: LectureRunState, action: LectureRunAction) => lectureRunReducer(state, action, lectureTwoRun);

describe('Lecture 2 complete timestamp batches', () => {
  it('starts from a separate snapshot and replaces all matching copies without changing the totals', () => {
    expect(at(0)).toEqual(lectureTwoInitial);
    expect([0, 1, 2, 3].map((time) => getRelationMetrics(at(time)))).toEqual([
      { totalCopies: 4, distinctRows: 3 }, { totalCopies: 4, distinctRows: 3 },
      { totalCopies: 4, distinctRows: 3 }, { totalCopies: 5, distinctRows: 3 },
    ]);
    expect(copiesOf(at(1), { product: 'B', price: 14 })).toBe(0);
    expect(copiesOf(at(1), { product: 'B', price: 18 })).toBe(1);
    expect(copiesOf(at(2), { product: 'C', price: 20 })).toBe(0);
    expect(copiesOf(at(2), { product: 'C', price: 25 })).toBe(2);
    expect(at(0)).toEqual([
      { row: { product: 'A', price: 10 }, copies: 1 },
      { row: { product: 'B', price: 14 }, copies: 1 },
      { row: { product: 'C', price: 20 }, copies: 2 },
    ]);
  });

  it('combines only matching full rows, retaining zero net diff for the cancellation illustration', () => {
    const updates = lectureTwoBatches[2].updates;
    expect(consolidateTimestamp(updates)).toEqual([
      { row: { product: 'A', price: 10 }, time: 3, diff: 1 },
      { row: { product: 'B', price: 18 }, time: 3, diff: 0 },
    ]);
    expect(consolidateTimestamp([...updates].reverse())).toEqual(consolidateTimestamp(updates));
    expect(applyTimestamp(at(2), [...updates].reverse())).toEqual(at(3));
    expect(copiesOf(at(3), { product: 'A', price: 10 })).toBe(2);
    expect(copiesOf(at(3), { product: 'B', price: 18 })).toBe(1);
    expect(consolidateTimestamp(lectureTwoBatches[0].updates)).toHaveLength(2);
    expect(() => consolidateTimestamp(lectureTwoUpdates)).toThrow('one logical time');
  });

  it('the hypothetical insert leaves both values and never mutates the real scenario', () => {
    const hypothetical = applyTimestamp(lectureTwoInitial, [lectureTwoBatches[0].updates[1]]);
    expect(getRelationMetrics(hypothetical)).toEqual({ totalCopies: 5, distinctRows: 4 });
    expect(copiesOf(hypothetical, { product: 'B', price: 14 })).toBe(1);
    expect(copiesOf(hypothetical, { product: 'B', price: 18 })).toBe(1);
    expect(getRelationMetrics(at(1))).toEqual({ totalCopies: 4, distinctRows: 3 });
    expect(copiesOf(at(0), { product: 'B', price: 18 })).toBe(0);
  });
});

describe('Lecture 2 playback and guide', () => {
  it('plays exactly three complete batches, preserves history, and resets to the seed', () => {
    let state = reduce(initialRunState, { type: 'play' });
    for (const time of [1, 2, 3]) {
      state = reduce(state, { type: 'tick' });
      expect(state).toMatchObject({ applied: time, selectedTime: time, step: 0, playing: time < 3 });
      expect(at(state.selectedTime)).toEqual(applyTimestamp(at(time - 1), lectureTwoBatches[time - 1]!.updates));
    }
    state = reduce(state, { type: 'previous-change' });
    expect(state).toMatchObject({ applied: 3, selectedTime: 2 });
    state = reduce(state, { type: 'select', time: 0 });
    expect(getRelationMetrics(at(state.selectedTime)).totalCopies).toBe(4);
    state = reduce(state, { type: 'next-change' });
    expect(state).toMatchObject({ applied: 3, selectedTime: 1 });
    expect(reduce(state, { type: 'select', time: 4 })).toEqual(state);
    expect(reduce(state, { type: 'reset' })).toEqual(initialRunState);
  });

  it('pauses before the three complete batches, finishes after the five-step recap', () => {
    let state = reduce(initialRunState, { type: 'start-guided' });
    expect(lectureTwoSteps).toHaveLength(5);
    for (const [step, lesson] of lectureTwoSteps.entries()) {
      expect(state.step).toBe(step);
      if (lesson.before) {
        expect(state).toMatchObject({ applied: lesson.time - 1, selectedTime: lesson.time - 1, revealed: false });
        expect(reduce(state, { type: 'next' })).toEqual(state);
        state = reduce(state, { type: 'reveal' });
        expect(reduce(state, { type: 'reveal' })).toEqual(state);
      }
      expect(state).toMatchObject({ applied: lesson.time, selectedTime: lesson.time, guided: true });
      state = reduce(state, { type: 'next' });
    }
    expect(state).toMatchObject({ applied: 3, step: 5, guided: false });
    expect(reduce(state, { type: 'play' })).toMatchObject({ applied: 0, selectedTime: 0, step: 5, playing: true });
  });

  it('Back rewinds whole results and closing before a reveal preserves the prior timestamp', () => {
    let state = reduce(initialRunState, { type: 'start-guided' });
    state = reduce(state, { type: 'next' });
    expect(reduce(state, { type: 'close-guided' })).toMatchObject({ applied: 0, selectedTime: 0, guided: false });
    state = reduce(state, { type: 'reveal' });
    state = reduce(state, { type: 'next' });
    state = reduce(state, { type: 'reveal' });
    expect(state.selectedTime).toBe(2);
    state = reduce(state, { type: 'back' });
    expect(state).toMatchObject({ step: 2, selectedTime: 1, applied: 1, revealed: false });
    state = reduce(state, { type: 'back' });
    expect(state).toMatchObject({ step: 1, selectedTime: 1, applied: 1, revealed: true });
    expect(reduce(state, { type: 'previous-change' })).toEqual(state);
    expect(reduce(state, { type: 'play' })).toEqual(state);
  });
});
