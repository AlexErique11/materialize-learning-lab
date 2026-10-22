import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { LectureWorkspace } from '../../labs/components/LectureWorkspace';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ReadableWindow } from './ReadableWindow';
import { gradeRead, readExercises, solutionFor, type ReadPrediction } from './exercise-scenarios';
import { referenceLinks, objective, readSql } from './resources';
import { applyRead } from './simulation';
import { readText } from './lessonText';
import '../../styles/lesson.css';
import './chapter.css';

export function ConsistentReadsExercisePage({ chapter, exerciseIndex, navigation }: { chapter: ChapterDefinition; exerciseIndex: number; navigation: ReactNode }) {
  const exercise = readExercises[exerciseIndex]!;
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, ReadPrediction>>({});
  const [choicesOpen, setChoicesOpen] = useState<string | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const navigate = useNavigate();
  const prediction = answers[flow.stage] ?? {};
  const nextExercise = readExercises[exerciseIndex + 1];
  const rangeGroup = question.groups.find(group => group.range);
  const snapshot = flow.accepted && rangeGroup ? applyRead(question.after, { type: 'request', request: { policy: 'timestamp', timestamp: Number(prediction[rangeGroup.id]?.[0]) } }) : flow.accepted ? question.after : question.before;
  const edit = (id: string, values: readonly string[]) => { setAnswers(previous => ({ ...previous, [flow.stage]: { ...prediction, [id]: values } })); flow.dispatch({ type: 'edit' }); };
  return <>
    <ExerciseFrame chapter={chapter} title={`Exercise ${exerciseIndex + 1}`} description={exercise.description} navigation={navigation} flow={flow} progressLabel="Questions"
      pageClass="lesson-page staged-exercise-page lecture-layout-page lecture-subtitle-layout read-chapter-page read-exercise-page"
      reference={{ objective, sql: readSql, documentationLinks: referenceLinks }} checkpointTitle={question.title} question={readText(question.prompt)} hint={readText(question.hint)}
      nextExerciseLabel={nextExercise ? `Exercise ${exerciseIndex + 2}` : 'Finish chapter'}
      visualization={<ReadableWindow snapshot={snapshot} caption={question.actionLabel} revealOutcome={flow.accepted} assessment />}
      renderWorkspace={({ visualization, question: prompt, navigation: footer }) => <LectureWorkspace layout="without-tip" guided={false} visualization={visualization} afterVisualization={<div className="read-question-slot">{prompt}</div>}
        playback={<div className="relation-playback-controls">{footer}</div>} />}
      answers={<div className="read-answer-groups">{question.groups.map(group => {
        const values = prediction[group.id] ?? [];
        return <fieldset key={group.id} className="read-answer-group" disabled={flow.accepted} data-error={Boolean(flow.grade?.errors[group.id])}>
          <legend>{group.label}</legend>
          {group.kind === 'integer' ? <input aria-label={group.label} inputMode="numeric" autoComplete="off" value={values[0] ?? ''} aria-invalid={Boolean(flow.grade?.errors[group.id])} onChange={event => edit(group.id, [event.target.value])} />
            : group.kind === 'single' ? <select aria-label={group.label} value={values[0] ?? ''} aria-invalid={Boolean(flow.grade?.errors[group.id])} onChange={event => edit(group.id, event.target.value ? [event.target.value] : [])}><option value="">Choose an answer</option>{group.choices!.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>
              : <Button aria-label={`Choose ${group.label}`} aria-haspopup="dialog" onClick={() => setChoicesOpen(group.id)}>{values.length ? `${values.length} selected` : 'Choose statements'}<ChevronDown size={12} aria-hidden="true" /></Button>}
        </fieldset>;
      })}</div>}
      onCheck={() => flow.dispatch({ type: 'check', grade: gradeRead(question, prediction) })}
      onShowAnswer={() => { const solution = solutionFor(question); setAnswers(previous => ({ ...previous, [flow.stage]: solution })); flow.dispatch({ type: 'check', grade: gradeRead(question, solution) }); }}
      onNext={() => { if (!flow.accepted) return; if (!flow.complete) flow.dispatch({ type: 'next' }); else if (nextExercise) navigate(`/labs/${chapter.slug}/exercises/${nextExercise.slug}`); else setCompletionOpen(true); }}
      onReset={() => { flow.dispatch({ type: 'reset' }); setAnswers({}); setChoicesOpen(null); setCompletionOpen(false); }} />
    <Dialog open={choicesOpen !== null} onClose={() => setChoicesOpen(null)} title={question.groups.find(group => group.id === choicesOpen)?.label ?? 'Choose statements'}>
      {question.groups.filter(group => group.id === choicesOpen).map(group => <fieldset key={group.id} className="read-multiple-choices"><legend className="sr-only">{group.label}</legend>{group.choices!.map(choice => <label key={choice.id}><input type="checkbox" checked={(prediction[group.id] ?? []).includes(choice.id)} onChange={event => { const values = prediction[group.id] ?? []; edit(group.id, event.target.checked ? [...values, choice.id] : values.filter(value => value !== choice.id)); }} />{choice.label}</label>)}</fieldset>)}
      <Button onClick={() => setChoicesOpen(null)}>Done</Button>
    </Dialog>
    <Dialog open={completionOpen} onClose={() => setCompletionOpen(false)} title="You finished Chapter 7" eyebrow="Chapter complete">
      <div className="read-recap"><p>You chose coherent snapshots, explained transaction ordering, and predicted bounded reads during an ingestion stall.</p><ul><li>Read within every input's retained, complete window.</li><li>Separate transaction order from external ingestion.</li><li>A freshness bound can require an error instead of waiting.</li></ul><Button data-dialog-primary variant="primary" onClick={() => navigate('/')}>Return to learning path<ArrowRight size={16} aria-hidden="true" /></Button></div>
    </Dialog>
  </>;
}
