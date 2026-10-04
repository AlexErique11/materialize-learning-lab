import { describe, expect, it } from 'vitest';
import { inventoryBatches, inventoryInitial, inventoryUpdates } from './exercise-one-scenario';
import { getInventoryAnswer, gradeInventoryPrediction } from './inventory-exercise';
import { applyTimestamp, copiesOf, getRelationMetrics, relationAt } from './simulation';
import { exerciseStageReducer, initialExerciseStage, type ExerciseGrade } from './useExerciseStages';

describe('the merged inventory exercise', () => {
  it('combines five mixed changes by full-row identity, retaining separate Mug prices', () => {
    expect(inventoryBatches[0].updates).toHaveLength(5);
    const after = relationAt(inventoryUpdates, 1, inventoryInitial);
    expect(after).toEqual([
      { row: { product: 'Kettle', price: 25 }, copies: 3 },
      { row: { product: 'Mug', price: 8 }, copies: 1 },
      { row: { product: 'Mug', price: 10 }, copies: 3 },
    ]);
    expect(applyTimestamp(inventoryInitial, [...inventoryBatches[0].updates].reverse())).toEqual(after);
    expect(gradeInventoryPrediction(0, { kettle: '3', mug8: '1', mug10: '3' }).correct).toBe(true);
    expect(gradeInventoryPrediction(0, { kettle: '-1', mug8: '-1', mug10: '2' }).correct).toBe(false);
    expect(gradeInventoryPrediction(0, { kettle: '3', mug8: '4', mug10: '4' }).errors).toHaveProperty('mug8');
  });

  it('requires removing every old Kettle copy and adding the repriced copies plus one extra', () => {
    expect(gradeInventoryPrediction(1, { oldDiff: '-3', newDiff: '+4' }).correct).toBe(true);
    expect(gradeInventoryPrediction(1, { oldDiff: '−3', newDiff: '4' }).correct).toBe(true);
    for (const answer of [
      { oldDiff: '0', newDiff: '4' }, { oldDiff: '-1', newDiff: '1' },
      { oldDiff: '-5', newDiff: '5' }, { oldDiff: '-3', newDiff: '3' },
    ]) expect(gradeInventoryPrediction(1, answer).correct).toBe(false);
    const before = relationAt(inventoryUpdates, 1, inventoryInitial);
    const after = relationAt(inventoryUpdates, 2, inventoryInitial);
    expect(copiesOf(after, { product: 'Kettle', price: 25 })).toBe(0);
    expect(copiesOf(after, { product: 'Kettle', price: 30 })).toBe(copiesOf(before, inventoryInitial[0]!.row) + 1);
    expect(getRelationMetrics(after).totalCopies).toBe(getRelationMetrics(before).totalCopies + 1);
  });

  it('distinguishes total copies, surviving full rows, and the new Mug price after another five-change batch', () => {
    expect(inventoryBatches[2].updates).toHaveLength(5);
    const after = relationAt(inventoryUpdates, 3, inventoryInitial);
    expect(after).toEqual([
      { row: { product: 'Kettle', price: 30 }, copies: 5 },
      { row: { product: 'Mug', price: 12 }, copies: 3 },
    ]);
    expect([0, 1, 2, 3].map((time) => getRelationMetrics(relationAt(inventoryUpdates, time, inventoryInitial)))).toEqual([
      { totalCopies: 7, distinctRows: 3 }, { totalCopies: 7, distinctRows: 3 },
      { totalCopies: 8, distinctRows: 3 }, { totalCopies: 8, distinctRows: 2 },
    ]);
    expect(gradeInventoryPrediction(2, { total: '8', distinct: '2', mugPrice: '12' }).correct).toBe(true);
    expect(gradeInventoryPrediction(2, { total: '2', distinct: '3', mugPrice: '10' }).errors).toEqual({
      total: 'Recheck this prediction.', distinct: 'Recheck this prediction.', mugPrice: 'Recheck this prediction.',
    });
  });

  it.each(['', ' ', '-1', '1.5', '1e2', 'Infinity', '9007199254740992'])('rejects invalid count %j without counting empty input as zero', (value) => {
    expect(gradeInventoryPrediction(0, { kettle: value, mug8: '1', mug10: '3' }).errors).toHaveProperty('kettle');
    expect(gradeInventoryPrediction(2, { total: value, distinct: value, mugPrice: value }).correct).toBe(false);
  });

  it('rejects blank or fractional signed diffs and reveals a valid solution for every phase', () => {
    for (const value of ['', ' ', '1.5', '1e2', 'Infinity', '9007199254740992'])
      expect(gradeInventoryPrediction(1, { oldDiff: value, newDiff: value }).correct).toBe(false);
    for (let stage = 0; stage < 3; stage++) expect(gradeInventoryPrediction(stage, getInventoryAnswer(stage)).correct).toBe(true);
  });
});

describe('phase progression', () => {
  const correct: ExerciseGrade = { correct: true, errors: {}, title: ['Correct'], explanation: ['Applied.'] };
  const wrong: ExerciseGrade = { correct: false, errors: { kettle: 'Recheck.' }, title: ['Recheck'], explanation: ['Try again.'] };
  const reduce = (state: typeof initialExerciseStage, action: Parameters<typeof exerciseStageReducer>[1]) => exerciseStageReducer(state, action, 3);

  it('keeps hints and wrong checks at the current phase and prevents editing accepted answers', () => {
    let state = reduce(initialExerciseStage, { type: 'hint' });
    expect(state.stage).toBe(0);
    expect(reduce(state, { type: 'next' })).toEqual(state);
    state = reduce(state, { type: 'check', grade: wrong });
    expect(state.hintOpen).toBe(false);
    expect(reduce(state, { type: 'next' })).toEqual(state);
    state = reduce(state, { type: 'check', grade: correct });
    expect(reduce(state, { type: 'edit' })).toEqual(state);
    expect(reduce(state, { type: 'check', grade: wrong })).toEqual(state);
    state = reduce(state, { type: 'next' });
    expect(state).toEqual({ ...initialExerciseStage, stage: 1 });
    expect(reduce(state, { type: 'next' })).toEqual(state);
  });

  it('accepts canonical shown answers through the same check action and resets after all three phases', () => {
    let state = initialExerciseStage;
    for (let stage = 0; stage < 3; stage++) {
      expect(state.stage).toBe(stage);
      const grade = gradeInventoryPrediction(stage, getInventoryAnswer(stage));
      state = reduce(state, { type: 'check', grade });
      expect(state.grade?.correct).toBe(true);
      if (stage < 2) state = reduce(state, { type: 'next' });
    }
    expect(reduce(state, { type: 'next' })).toEqual(state);
    expect(reduce(state, { type: 'reset' })).toEqual(initialExerciseStage);
  });
});
