import { useState, type ReactNode } from 'react';
import type { ChapterDefinition } from '../chapterRegistry';
import { ExerciseInput, ExerciseLayout, ExerciseLedger } from './ExerciseLayout';
import { inventoryBatches, inventoryCheckpoints, inventoryGridRows, inventoryInitial, inventoryUpdates } from './exercise-one-scenario';
import { getInventoryAnswer, gradeInventoryPrediction, type InventoryPrediction } from './inventory-exercise';
import { relationAt } from './simulation';
import { useExerciseStages } from './useExerciseStages';

export function ExerciseOne({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  const flow = useExerciseStages(inventoryCheckpoints.length);
  const [answer, setAnswer] = useState<InventoryPrediction>({});
  const checkpoint = inventoryCheckpoints[flow.stage]!;
  const batch = inventoryBatches[flow.stage]!;
  const time = flow.accepted ? batch.time : batch.time - 1;
  const edit = (field: string, value: string) => {
    setAnswer((previous) => ({ ...previous, [field]: value })); flow.dispatch({ type: 'edit' });
  };
  const records = batch.updates.map((update, index) => {
    const field = checkpoint.fields[index];
    return { ...update, pending: !flow.accepted,
      control: checkpoint.kind === 'build' && field && !flow.accepted
        ? <ExerciseInput inLedger signed label={field.label} value={answer[field.id] ?? ''} error={flow.grade?.errors[field.id]}
          disabled={flow.accepted} onChange={(value) => edit(field.id, value)} /> : undefined,
    };
  });
  return <ExerciseLayout chapter={chapter} title="Exercise 1" description="Reconstruct, build, and check one inventory timeline in three phases."
    navigation={navigation} flow={flow} relation={relationAt(inventoryUpdates, time, inventoryInitial)} time={time} rows={inventoryGridRows}
    ledger={<ExerciseLedger targetTime={batch.time} rows={inventoryGridRows} records={records} title={checkpoint.kind === 'build' ? 'Build the change' : 'Change ledger'} />}
    checkpointTitle={checkpoint.title} question={checkpoint.question} hint={checkpoint.hint}
    answers={checkpoint.kind === 'build' ? <p className="exercise-answer-note">{flow.accepted ? 'The completed batch is shown in the ledger.' : 'Write both signed diffs in the ledger.'}</p>
      : checkpoint.fields.map((field) => <ExerciseInput key={`${flow.stage}:${field.id}`} label={field.label} labelContent={field.labelContent}
        value={answer[field.id] ?? ''} error={flow.grade?.errors[field.id]} disabled={flow.accepted} onChange={(value) => edit(field.id, value)} />)}
    onCheck={() => flow.dispatch({ type: 'check', grade: gradeInventoryPrediction(flow.stage, answer) })}
    onShowAnswer={() => {
      const solution = getInventoryAnswer(flow.stage);
      setAnswer(solution); flow.dispatch({ type: 'check', grade: gradeInventoryPrediction(flow.stage, solution) });
    }}
    onNext={() => { if (!flow.accepted || flow.complete) return; flow.dispatch({ type: 'next' }); setAnswer({}); }}
    onReset={() => { flow.dispatch({ type: 'reset' }); setAnswer({}); }} />;
}
