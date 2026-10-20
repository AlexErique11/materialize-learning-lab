import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { chapterPath, chapters, type ChapterDefinition } from '../chapterRegistry';
import { ProgressLanes } from './ProgressLanes';
import { ProgressExerciseWorkspace } from './ProgressExerciseWorkspace';
import { gradePrediction, progressExercises, solutionFor, type Prediction } from './exercise-scenarios';
import { referenceLinks, objective, progressSql } from './resources';
import type { LaneId } from './simulation';
import { LessonText } from '../../components/lesson/LessonText';
import { progressText } from './lessonText';
import '../../styles/lesson.css';
import './chapter.css';

const shortLabel: Record<string, string> = { limit: 'Limit', actual: 'Actual', limiter: 'Input', evidence: 'Evidence', cause: 'Investigate', freshness: 'Freshness', query: 'Query', reaction: 'Reaction' };

export function ProgressExercisePage({ chapter, navigation, exerciseIndex }: { chapter: ChapterDefinition; navigation: ReactNode; exerciseIndex: number }) {
  const exercise = progressExercises[exerciseIndex]!;
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, Prediction>>({});
  const [selected, setSelected] = useState<LaneId>(exerciseIndex === 0 ? 'orders' : 'join');
  const [completionOpen, setCompletionOpen] = useState(false);
  const [choiceGroup, setChoiceGroup] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const navigate = useNavigate();
  const prediction = answers[flow.stage] ?? {};
  const current = flow.accepted ? question.after : question.before;
  const nextExercise = progressExercises[exerciseIndex + 1];
  const nextChapter = chapters[chapters.findIndex(c => c.slug === chapter.slug) + 1]!;
  const edit = (id: string, values: readonly string[]) => { setAnswers(previous => ({ ...previous, [flow.stage]: { ...prediction, [id]: values } })); flow.dispatch({ type: 'edit' }); };
  return <>
    <ExerciseFrame key={resetVersion} chapter={chapter} navigation={navigation} title={`Exercise ${exerciseIndex + 1}`} description={exercise.description}
      pageClass="lesson-page staged-exercise-page lecture-layout-page lecture-subtitle-layout progress-chapter-page progress-exercise-page" flow={flow} progressLabel="Questions"
      reference={{ objective, sql: progressSql, documentationLinks: referenceLinks }} checkpointTitle={question.title} question={progressText(question.prompt)} hint={progressText(question.hint)}
      nextExerciseLabel={nextExercise ? `Exercise ${exerciseIndex + 2}` : 'Finish chapter'}
      visualization={<div className="progress-exercise-visualization"><ProgressLanes snapshot={current} selected={selected} onSelect={setSelected}
        compact showLimit={question.showLimit} revealTiming={flow.accepted} caption={question.actionLabel} upcoming={!flow.accepted} /></div>}
      renderWorkspace={({ visualization, question: questionContent, navigation: questionNavigation }) => <>
        <ProgressExerciseWorkspace chapter={chapter} lectureIndex={exerciseIndex} navigation={navigation} visualization={visualization} question={questionContent} />
        <div className="relation-playback-controls progress-exercise-playback">{questionNavigation}</div>
      </>}
      answers={<div className="progress-answer-groups">{question.groups.map(group => {
        const values = prediction[group.id] ?? [];
        const error = flow.grade?.errors[group.id];
        return <fieldset key={group.id} aria-label={group.label} disabled={flow.accepted} className="progress-answer-group" data-error={Boolean(error)}>
          <legend><span className="progress-answer-label-full"><LessonText content={progressText(group.label)} /></span><span className="progress-answer-label-short">{shortLabel[group.id] ?? group.label}</span></legend>
          {group.kind === 'multiple' && <Button className="progress-answer-multiple" aria-label={`Choose ${group.label}`} aria-haspopup="dialog" onClick={() => setChoiceGroup(group.id)}>{values.length ? `${values.length} selected` : 'Choose'}<ChevronDown size={12} aria-hidden="true" /></Button>}
          {group.kind === 'single' && <select className="progress-answer-select" aria-label={group.label} value={values[0] ?? ''} onChange={event => edit(group.id, event.target.value ? [event.target.value] : [])}>
            <option value="">Choose an answer</option>{group.choices!.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
          </select>}
          {group.kind === 'integer' ? <label className="progress-number"><span className="sr-only">{group.label}</span><input aria-label={group.label} inputMode="numeric" autoComplete="off" value={values[0] ?? ''} aria-invalid={Boolean(error)}
            onChange={event => edit(group.id, [event.target.value])} /></label>
            : group.choices!.map(choice => <label key={choice.id} className={group.kind === 'single' ? 'progress-radio-choice' : 'progress-checkbox-choice'} data-accepted={flow.accepted && values.includes(choice.id)}><input type={group.kind === 'single' ? 'radio' : 'checkbox'} name={`q${flow.stage}-${group.id}`} checked={values.includes(choice.id)}
              onChange={event => edit(group.id, group.kind === 'single' ? [choice.id] : event.target.checked ? [...values, choice.id] : values.filter(value => value !== choice.id))} /><span><LessonText content={progressText(choice.label)} /></span></label>)}
        </fieldset>;
      })}</div>}
      onCheck={() => flow.dispatch({ type: 'check', grade: gradePrediction(question, prediction) })}
      onShowAnswer={() => { const answer = solutionFor(question); setAnswers(previous => ({ ...previous, [flow.stage]: answer })); flow.dispatch({ type: 'check', grade: gradePrediction(question, answer) }); }}
      onNext={() => {
        if (!flow.accepted) return;
        if (flow.complete) { if (nextExercise) navigate(`/labs/${chapter.slug}/exercises/${nextExercise.slug}`); else setCompletionOpen(true); }
        else { flow.dispatch({ type: 'next' }); setSelected(exerciseIndex === 0 ? 'orders' : exerciseIndex === 2 && flow.stage >= 1 ? 'revenue' : 'join'); }
      }}
      onReset={() => { flow.dispatch({ type: 'reset' }); setAnswers({}); setSelected(exerciseIndex === 0 ? 'orders' : 'join'); setCompletionOpen(false); setResetVersion(v => v + 1); }} />
    <Dialog open={choiceGroup !== null} onClose={() => setChoiceGroup(null)} title={question.groups.find(group => group.id === choiceGroup)?.label ?? 'Choose answers'}>
      {question.groups.filter(group => group.id === choiceGroup).map(group => <fieldset key={group.id} className="progress-answer-group progress-lesson-text" aria-label={group.label}>
        <legend className="sr-only">{group.label}</legend>
        {group.choices!.map(choice => <label key={choice.id}><input type="checkbox" checked={(prediction[group.id] ?? []).includes(choice.id)} onChange={event => {
          const values = prediction[group.id] ?? [];
          edit(group.id, event.target.checked ? [...values, choice.id] : values.filter(value => value !== choice.id));
        }} /><span><LessonText content={progressText(choice.label)} /></span></label>)}
      </fieldset>)}
      <Button onClick={() => setChoiceGroup(null)}>Done</Button>
    </Dialog>
    <Dialog open={completionOpen} onClose={() => setCompletionOpen(false)} title="You finished Chapter 6" eyebrow="Chapter complete">
      <div className="progress-recap"><p>You distinguished progress guarantees from observations and located the first delayed stage.</p>
        <ul><li>A frontier F completes times strictly below F.</li><li>Inputs permit progress; maintained computation must still catch up.</li><li>Source delay, computation delay, and slow serving need different evidence.</li></ul>
        <p>Next, explore which complete moment a query can read.</p>
        <Button variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button>
      </div>
    </Dialog>
  </>;
}
