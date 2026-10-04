import type { LessonTextContent } from './LessonText';
import { inventoryBatches, inventoryCheckpoints, inventoryInitial, inventoryUpdates } from './exercise-one-scenario';
import { copiesOf, getRelationMetrics, relationAt, rowKey, type RowMultiplicity } from './simulation';
import { parseExerciseInteger, type ExerciseGrade } from './useExerciseStages';

export type InventoryPrediction = Readonly<Record<string, string>>;

export function getInventoryAnswer(stage: number): InventoryPrediction {
  const batch = inventoryBatches[stage]!;
  const after = relationAt(inventoryUpdates, batch.time, inventoryInitial);
  if (stage === 0) return {
    kettle: String(copiesOf(after, inventoryInitial[0]!.row)),
    mug8: String(copiesOf(after, inventoryInitial[1]!.row)),
    mug10: String(copiesOf(after, inventoryInitial[2]!.row)),
  };
  if (stage === 1) return { oldDiff: String(inventoryBatches[1].updates[0].diff), newDiff: String(inventoryBatches[1].updates[1].diff) };
  const metrics = getRelationMetrics(after);
  return { total: String(metrics.totalCopies), distinct: String(metrics.distinctRows),
    mugPrice: String(after.find((entry) => entry.row.product === 'Mug')!.row.price) };
}

function inventoryExplanation(stage: number, before: readonly RowMultiplicity[], after: readonly RowMultiplicity[]): LessonTextContent {
  const batch = inventoryBatches[stage]!;
  if (stage === 0) return inventoryInitial.flatMap(({ row }) => [
    { kind: 'row', text: `(${row.product}, $${row.price})` }, ': ',
    { kind: 'count', text: String(copiesOf(before, row)) },
    ...batch.updates.filter((update) => rowKey(update.row) === rowKey(row)).flatMap((update) => [
      ' ', { kind: 'diff', text: `${update.diff < 0 ? '−' : '+'}${Math.abs(update.diff)}` },
    ] satisfies LessonTextContent),
    ' = ', { kind: 'count', text: String(copiesOf(after, row)) }, '. ',
  ] satisfies LessonTextContent);
  if (stage === 1) return [
    { kind: 'diff', text: String(batch.updates[0]!.diff).replace('-', '−') }, ' removes the old ', { kind: 'row', text: '(Kettle, $25)' }, ' row. ',
    { kind: 'diff', text: `+${batch.updates[1]!.diff}` }, ' adds the repriced copies plus one extra at ', { kind: 'row', text: '(Kettle, $30)' },
    '. Both changes apply together; total copies becomes ', { kind: 'count', text: String(getRelationMetrics(after).totalCopies) }, '.',
  ];
  const metrics = getRelationMetrics(after);
  return ['Exercise complete. ', ...after.flatMap(({ row, copies }) => [
    { kind: 'row', text: `(${row.product}, $${row.price})` }, ' × ', { kind: 'count', text: String(copies) }, '. ',
  ] satisfies LessonTextContent), 'The zero-copy rows disappear. ',
  { kind: 'count', text: `${metrics.totalCopies} total copies` }, ' across ', { kind: 'count', text: `${metrics.distinctRows} full rows` }, '.'];
}

export function gradeInventoryPrediction(stage: number, answer: InventoryPrediction): ExerciseGrade {
  const checkpoint = inventoryCheckpoints[stage]!;
  const batch = inventoryBatches[stage]!;
  const expected = getInventoryAnswer(stage);
  const errors: Record<string, string> = {};
  let explanation: LessonTextContent | undefined;
  for (const field of checkpoint.fields) {
    const value = parseExerciseInteger(answer[field.id] ?? '', checkpoint.kind === 'build');
    if (value === null) {
      errors[field.id] = checkpoint.kind === 'build' ? 'Enter a whole signed diff.' : 'Enter a whole number ≥ 0.';
      explanation ??= ['Fill every answer with a ', { kind: 'term', text: checkpoint.kind === 'build' ? 'whole signed diff' : 'whole number ≥ 0' }, '. Empty answers are not counted as zero.'];
    } else if (value !== Number(expected[field.id])) {
      errors[field.id] = 'Recheck this prediction.';
      explanation ??= checkpoint.hint;
    }
  }
  const correct = Object.keys(errors).length === 0;
  return { correct, errors,
    title: correct ? ['Correct: ', { kind: 'time', text: `t = ${batch.time}` }, ' applied'] : ['Recheck your prediction'],
    explanation: explanation ?? inventoryExplanation(stage,
      relationAt(inventoryUpdates, batch.time - 1, inventoryInitial), relationAt(inventoryUpdates, batch.time, inventoryInitial)),
  };
}
