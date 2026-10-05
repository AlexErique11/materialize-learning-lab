import { describe, expect, it } from 'vitest';
import { lectureSteps, lectureUpdates } from './scenario';
import { applyTimestamp, copiesOf, getRelationMetrics, relationAt } from './simulation';
import { initialRunState, lectureRunReducer } from './useLectureRun';

const a = { product: 'A', price: 10 };

describe('changing relations', () => {
  it('reconstructs every complete timestamp and removes B when its count reaches zero', () => {
    expect([0, 1, 2, 3, 4].map((time) => getRelationMetrics(relationAt(lectureUpdates, time)))).toEqual([
      { totalCopies: 0, distinctRows: 0 },
      { totalCopies: 3, distinctRows: 1 },
      { totalCopies: 4, distinctRows: 2 },
      { totalCopies: 6, distinctRows: 3 },
      { totalCopies: 5, distinctRows: 2 },
    ]);
    expect(relationAt(lectureUpdates, 4)).toEqual([
      { row: a, copies: 3 }, { row: { product: 'C', price: 20 }, copies: 2 },
    ]);
  });

  it('counts copies rather than change records', () => {
    const grouped = applyTimestamp([], [{ row: a, time: 1, diff: 3 }]);
    const separate = applyTimestamp([], Array.from({ length: 3 }, () => ({ row: a, time: 1, diff: 1 })));
    expect(separate).toEqual(grouped);
    expect(copiesOf(applyTimestamp(grouped, [{ row: a, time: 2, diff: -1 }]), a)).toBe(2);
  });

  it('uses the full row as identity and expresses a replacement with two diffs', () => {
    const start = [{ row: a, copies: 1 }];
    const newRow = { ...a, price: 25 };
    const insertedOnly = applyTimestamp(start, [{ row: newRow, time: 2, diff: 1 }]);
    expect(getRelationMetrics(insertedOnly)).toEqual({ totalCopies: 2, distinctRows: 2 });
    const replaced = applyTimestamp(start, [{ row: a, time: 2, diff: -1 }, { row: newRow, time: 2, diff: 1 }]);
    expect(replaced).toEqual([{ row: newRow, copies: 1 }]);
    expect(start).toEqual([{ row: a, copies: 1 }]);
  });

  it('consolidates a timestamp regardless of delivery order, including cancellation', () => {
    const changes = [{ row: a, time: 1, diff: -2 }, { row: a, time: 1, diff: 3 }];
    expect(applyTimestamp([], changes)).toEqual(applyTimestamp([], [...changes].reverse()));
    expect(applyTimestamp([], [...changes, { row: a, time: 1, diff: -1 }])).toEqual([]);
    expect(() => applyTimestamp([], [{ row: a, time: 1, diff: -1 }])).toThrow('retracts more copies');
    expect(() => applyTimestamp([], [...changes, { row: a, time: 2, diff: 1 }])).toThrow('one logical time');
  });
});

describe('lecture run controls', () => {
  it('pauses before each timestamp, reveals once, and completes only after the seven-step recap', () => {
    let state = lectureRunReducer(initialRunState, { type: 'start-guided' });
    expect(lectureSteps).toHaveLength(7);
    expect(state).toMatchObject({ step: 0, applied: 0, guided: true });
    state = lectureRunReducer(state, { type: 'next' });
    expect(state).toMatchObject({ step: 1, applied: 0 });
    for (const time of [1, 2, 3, 4]) {
      state = lectureRunReducer(state, { type: 'next' });
      expect(state).toMatchObject({ step: time + 1, applied: time - 1, selectedTime: time - 1, revealed: false });
      expect(lectureRunReducer(state, { type: 'next' })).toEqual(state);
      state = lectureRunReducer(state, { type: 'reveal' });
      expect(state).toMatchObject({ applied: time, selectedTime: time, revealed: true });
      expect(lectureRunReducer(state, { type: 'reveal' })).toEqual(state);
    }
    state = lectureRunReducer(state, { type: 'next' });
    expect(state).toMatchObject({ step: 6, applied: 4, guided: true });
    state = lectureRunReducer(state, { type: 'next' });
    expect(state).toMatchObject({ step: 7, applied: 4, guided: false });
    expect(lectureRunReducer(state, { type: 'next' })).toEqual(state);
    expect(lectureRunReducer(state, { type: 'reset' })).toEqual(initialRunState);
  });

  it('plays only four data changes, supports pause, and leaves tutorial progress untouched', () => {
    let state = lectureRunReducer(initialRunState, { type: 'play' });
    state = lectureRunReducer(state, { type: 'tick' });
    state = lectureRunReducer(state, { type: 'play' });
    expect(state).toMatchObject({ applied: 1, playing: false });
    expect(lectureRunReducer(state, { type: 'tick' })).toEqual(state);
    state = lectureRunReducer(state, { type: 'play' });
    expect(lectureRunReducer(state, { type: 'next-change' })).toEqual(state);
    expect(lectureRunReducer(state, { type: 'previous-change' })).toEqual(state);
    for (let i = 0; i < 3; i++) state = lectureRunReducer(state, { type: 'tick' });
    expect(state).toMatchObject({ step: 0, applied: 4, playing: false });
    expect(lectureRunReducer(state, { type: 'tick' })).toEqual(state);
    expect(lectureRunReducer(state, { type: 'reveal' })).toEqual(state);
    expect(lectureRunReducer(state, { type: 'play' })).toMatchObject({ step: 0, applied: 0, playing: true });
  });

  it('does not expose future states when replaying history or changing guided controls', () => {
    expect(lectureRunReducer(initialRunState, { type: 'select', time: 4 })).toEqual(initialRunState);
    const guided = lectureRunReducer(initialRunState, { type: 'start-guided' });
    expect(lectureRunReducer(guided, { type: 'play' })).toEqual(guided);
    expect(lectureRunReducer(guided, { type: 'select', time: 0 })).toEqual(guided);
    expect(lectureRunReducer(guided, { type: 'next-change' })).toEqual(guided);
    expect(lectureRunReducer(guided, { type: 'previous-change' })).toEqual(guided);
    const record = lectureRunReducer(guided, { type: 'next' });
    const before = lectureRunReducer(record, { type: 'next' });
    const advanced = lectureRunReducer(before, { type: 'reveal' });
    const closed = lectureRunReducer(advanced, { type: 'close-guided' });
    expect(closed).toMatchObject({ step: 2, applied: 1, guided: false });
    const inspecting = lectureRunReducer(closed, { type: 'select', time: 0 });
    expect(lectureRunReducer(inspecting, { type: 'next-change' })).toMatchObject({ applied: 1, selectedTime: 1 });
    expect(lectureRunReducer(inspecting, { type: 'play' })).toMatchObject({ selectedTime: 1, step: 2, playing: true });
  });

  it('revisits changes in both directions, preserving applied progress and the empty starting state', () => {
    expect(lectureRunReducer(initialRunState, { type: 'previous-change' })).toEqual(initialRunState);
    let state = initialRunState;
    for (let change = 0; change < 4; change++) state = lectureRunReducer(state, { type: 'next-change' });
    for (const time of [3, 2, 1, 0]) {
      state = lectureRunReducer(state, { type: 'previous-change' });
      expect(state).toMatchObject({ applied: 4, selectedTime: time, step: 0 });
    }
    expect(lectureRunReducer(state, { type: 'previous-change' })).toEqual(state);
    for (const time of [1, 2, 3, 4]) {
      state = lectureRunReducer(state, { type: 'next-change' });
      expect(state).toMatchObject({ applied: 4, selectedTime: time, step: 0 });
    }
    expect(lectureRunReducer(state, { type: 'next-change' })).toEqual(state);
    state = lectureRunReducer(initialRunState, { type: 'next-change' });
    state = lectureRunReducer(state, { type: 'previous-change' });
    state = lectureRunReducer(state, { type: 'next-change' });
    expect(state).toMatchObject({ applied: 1, selectedTime: 1 });
    expect(lectureRunReducer(state, { type: 'next-change' })).toMatchObject({ applied: 2, selectedTime: 2 });
  });

  it('rewinds the guide, preserves its completion during data replay, and resets deliberately', () => {
    let state = lectureRunReducer(initialRunState, { type: 'start-guided' });
    for (let step = 0; step < 4; step++) {
      state = lectureRunReducer(state, { type: 'next' });
      state = lectureRunReducer(state, { type: 'reveal' });
    }
    expect(state).toMatchObject({ step: 4, applied: 3 });
    state = lectureRunReducer(state, { type: 'back' });
    expect(state).toMatchObject({ step: 3, applied: 2, selectedTime: 2, revealed: true });
    while (state.guided) {
      state = lectureRunReducer(state, { type: 'reveal' });
      state = lectureRunReducer(state, { type: 'next' });
    }
    expect(state).toMatchObject({ step: 7, applied: 4 });
    const replay = lectureRunReducer(state, { type: 'play' });
    expect(replay).toMatchObject({ step: 7, applied: 0, selectedTime: 0, playing: true });
    expect(lectureRunReducer(replay, { type: 'reset' })).toEqual(initialRunState);
  });
});

it('pause preserves applied changes, timestamp selection, and lesson progress', () => {
  const state = { ...initialRunState, step: 3, applied: 2, selectedTime: 1, playing: true, revealed: false };
  const paused = lectureRunReducer(state, { type: 'pause' });
  expect(paused).toEqual({ ...state, playing: false });
  expect(lectureRunReducer(paused, { type: 'tick' })).toEqual(paused);
});
