import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { LectureWorkspace } from '../../labs/components/LectureWorkspace';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { chapterPath, chapters, type ChapterDefinition } from '../chapterRegistry';
import { ProgressLanes, ProgressMetrics } from './ProgressLanes';
import { gradePrediction, progressExercises, solutionFor, type Prediction } from './exercise-scenarios';
import { referenceLinks, objective, progressSql } from './resources';
import type { LaneId } from './simulation';
import { LessonText } from '../../components/lesson/LessonText';
import { progressText } from './lessonText';
import '../../styles/lesson.css';
import './chapter.css';

export function ProgressExercisePage({ chapter, navigation, exerciseIndex }: { chapter: ChapterDefinition; navigation: ReactNode; exerciseIndex: number }) {
  const exercise = progressExercises[exerciseIndex]!;
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, Prediction>>({});
  const [selected, setSelected] = useState<LaneId>(exerciseIndex === 0 ? 'orders' : 'join');
  const [completionOpen, setCompletionOpen] = useState(false);
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
      nextExerciseLabel={nextExercise ? `Exercise ${exerciseIndex + 2}` : 'Finish chapter'} mobilePanel="lanes" initialQuestionOpen={false}
      visualization={<div className="progress-exercise-visualization"><ProgressLanes snapshot={current} selected={selected} onSelect={setSelected}
        showLimit={question.showLimit} revealTiming={flow.accepted} caption={flow.accepted ? 'Prediction accepted · effect revealed' : 'View question to predict the next effect.'} upcoming={!flow.accepted} /></div>}
      renderWorkspace={({ visualization, question: questionContent, navigation: questionNavigation, questionOpen, setQuestionOpen }) => <LectureWorkspace layout="without-tip" guided={false}
        metrics={<ProgressMetrics snapshot={current} />} visualization={<div className="progress-exercise-layout" data-question-open={questionOpen}>{visualization}
          <div className="progress-exercise-question-view">
            <section className="progress-compact-evidence" aria-label="Current diagram evidence"><strong>Current evidence</strong><p><LessonText content={progressText(current.evidence ?? `Orders frontier ${current.frontiers.orders}; Payments frontier ${current.frontiers.payments}; Paid orders frontier ${current.frontiers.join}.`)} /></p></section>
            {questionContent}
          </div></div>}
        playback={<div className="relation-playback-controls progress-exercise-playback">
          <Button className="progress-exercise-view-toggle" aria-expanded={questionOpen} onClick={() => setQuestionOpen(!questionOpen)}>{questionOpen ? 'View diagram' : 'View question'}</Button>
          <div>{questionNavigation}</div></div>} />}
      answers={<div className="progress-answer-groups">{question.groups.map(group => {
        const values = prediction[group.id] ?? [];
        const error = flow.grade?.errors[group.id];
        return <fieldset key={group.id} disabled={flow.accepted} className="progress-answer-group" data-error={Boolean(error)}>
          <legend><LessonText content={progressText(group.label)} /></legend>
          {group.kind === 'integer' ? <label className="progress-number"><span className="sr-only">{group.label}</span><input aria-label={group.label} inputMode="numeric" autoComplete="off" value={values[0] ?? ''} aria-invalid={Boolean(error)}
            onChange={event => edit(group.id, [event.target.value])} /></label>
            : group.choices!.map(choice => <label key={choice.id} data-accepted={flow.accepted && values.includes(choice.id)}><input type={group.kind === 'single' ? 'radio' : 'checkbox'} name={`q${flow.stage}-${group.id}`} checked={values.includes(choice.id)}
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
    <Dialog open={completionOpen} onClose={() => setCompletionOpen(false)} title="You finished Chapter 6" eyebrow="Chapter complete">
      <div className="progress-recap"><p>You distinguished progress guarantees from observations and located the first delayed stage.</p>
        <ul><li>A frontier F completes times strictly below F.</li><li>Inputs permit progress; maintained computation must still catch up.</li><li>Source delay, computation delay, and slow serving need different evidence.</li></ul>
        <p>Next, explore which complete moment a query can read.</p>
        <Button variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button>
      </div>
    </Dialog>
  </>;
}
