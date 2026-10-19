import { describe, expect, it } from 'vitest';
import { lectureSteps, lectureUpdates } from '../chapters/changing-relations/scenario';
import { lectureTwoSteps, lectureTwoBatches } from '../chapters/changing-relations/lecture-two-scenario';
import { runDefinition } from '../chapters/incremental-maintenance/scenario';
import { joinRunDefinition } from '../chapters/incremental-maintenance/join-scenario';
import { initialRunState, lectureRunReducer } from './useLectureRun';

it('keeps the initial snapshot when the first guided action starts with a prediction', () => {
  const definition = { totalChanges: 1, steps: [{ time: 1, before: 'Predict what is maintained' }] };
  const prediction = lectureRunReducer(initialRunState, { type: 'start-guided' }, definition);
  expect(prediction).toMatchObject({ guided: true, revealed: false, selectedTime: 0 });
  expect(lectureRunReducer(prediction, { type: 'next' }, definition)).toEqual(prediction);
  const revealed = lectureRunReducer(prediction, { type: 'reveal' }, definition);
  expect(revealed).toMatchObject({ revealed: true, selectedTime: 1 });
  expect(lectureRunReducer(revealed, { type: 'back' }, definition)).toEqual(prediction);
});

describe.each([
  ['Chapter 1 Lecture 1', { steps: lectureSteps, totalChanges: lectureUpdates.length }],
  ['Chapter 1 Lecture 2', { steps: lectureTwoSteps, totalChanges: lectureTwoBatches.length }],
  ['Chapter 2 Lecture 1', runDefinition],
  ['Chapter 2 Lecture 2', joinRunDefinition],
] as const)('%s guided Back', (_name, definition) => {
  it('revisits every prediction and effect one phase at a time, including repeated timestamps', () => {
    const reduce = (state: typeof initialRunState, type: 'start-guided' | 'reveal' | 'back' | 'next') =>
      lectureRunReducer(state, { type }, definition);
    let state = reduce(initialRunState, 'start-guided');
    for (const lesson of definition.steps) {
      if (lesson.before) {
        const prediction = state;
        const effect = reduce(prediction, 'reveal');
        expect(reduce(effect, 'back')).toEqual(prediction);
        expect(reduce(reduce(effect, 'back'), 'reveal')).toEqual(effect);
        const previous = reduce(prediction, 'back');
        expect(previous.step).toBe(prediction.step - 1);
        expect(reduce(previous, 'next')).toEqual(prediction);
        state = effect;
      }
      const next = reduce(state, 'next');
      if (next.guided) expect(reduce(next, 'back')).toEqual(state);
      state = next;
    }
    expect(state.guided).toBe(false);
    expect(state.applied).toBe(definition.totalChanges);
  });
});
