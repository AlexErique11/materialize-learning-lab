import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Clock3, CalendarClock, Table2 } from 'lucide-react';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { chapterPath, chapters, type ChapterDefinition } from '../chapterRegistry';
import { temporalExercises } from './exercise-scenarios';
import { gradeTemporalPrediction, temporalSolution, type TemporalPrediction } from './exercise-grading';
import { TemporalExerciseWorkspace } from './TemporalExerciseWorkspace';
import { TemporalExerciseAnswers } from './TemporalExerciseAnswers';
import type { TemporalStage } from './scenarios';
import '../../styles/lesson.css';
import '../incremental-maintenance/exercises.css';
import './temporal.css';
import './exercises.css';

export function TemporalExercisePage({ chapter, navigation, exerciseIndex }: {
  chapter: ChapterDefinition; navigation: ReactNode; exerciseIndex: number;
}) {
  const exercise = temporalExercises[exerciseIndex]!;
  const nextExercise = temporalExercises[exerciseIndex + 1];
  const nextChapter = chapters[chapters.findIndex((item) => item.slug === chapter.slug) + 1];
  const navigate = useNavigate();
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, TemporalPrediction>>({});
  const [activeStage, setActiveStage] = useState<TemporalStage>('timeline');
  const [completionOpen, setCompletionOpen] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const prediction = answers[flow.stage] ?? {};
  const focusQuestion = () => requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('.temporal-answer-content')?.focus());
  const check = (answer = prediction) => {
    const grade = gradeTemporalPrediction(question, answer);
    flow.dispatch({ type: 'check', grade });
    if (grade.correct) setActiveStage('result');
  };
  return <div ref={rootRef} className="temporal-exercise-root">
    <ExerciseFrame key={resetVersion} chapter={chapter} navigation={navigation} title={`Exercise ${exerciseIndex + 1}`}
      description={exercise.title + '. ' + exercise.description} reference={exercise.reference} flow={flow}
      pageClass="lesson-page changing-relations-page incremental-maintenance-page join-maintenance-page maintenance-lecture-page staged-exercise-page temporal-lecture-page temporal-exercise-page"
      progressLabel="Questions" preserveQuestion checkpointTitle={question.title}
      question={flow.accepted ? question.explanation : [question.actionLabel, ' ', ...question.question]} hint={question.hint}
      nextExerciseLabel={nextExercise ? `Exercise ${exerciseIndex + 2}` : 'Finish chapter'}
      visualization={<TemporalExerciseWorkspace exercise={exercise} question={question} accepted={flow.accepted}
        activeStage={activeStage} onSelectStage={setActiveStage} />}
      answers={<TemporalExerciseAnswers key={flow.stage} question={question} prediction={prediction} grade={flow.grade}
        accepted={flow.accepted} onEdit={(answer) => {
          setAnswers((previous) => ({ ...previous, [flow.stage]: answer }));
          flow.dispatch({ type: 'edit' });
        }} />}
      onCheck={() => { check(); focusQuestion(); }}
      onShowAnswer={() => {
        const solution = temporalSolution(question);
        setAnswers((previous) => ({ ...previous, [flow.stage]: solution }));
        check(solution);
        focusQuestion();
      }}
      onNext={() => {
        if (!flow.accepted) return;
        if (flow.complete) {
          if (nextExercise) navigate(`/labs/${chapter.slug}/exercises/${nextExercise.slug}`);
          else setCompletionOpen(true);
        } else {
          flow.dispatch({ type: 'next' });
          setActiveStage('timeline');
          focusQuestion();
        }
      }}
      onReset={() => {
        flow.dispatch({ type: 'reset' });
        setAnswers({}); setActiveStage('timeline'); setCompletionOpen(false); setResetVersion((version) => version + 1);
      }} />
    <Dialog open={completionOpen} onClose={() => setCompletionOpen(false)} title="You finished Chapter 5"
      eyebrow="Chapter complete" className="chapter-completion-dialog temporal-completion-dialog">
      <div className="chapter-completion-intro"><div className="chapter-completion-copy">
        <h3>Time is an input to maintained results</h3><p>You predicted how query time, event timestamps, and source changes affect a temporal result.</p>
      </div></div>
      <div className="chapter-completion-topics">
        <section><Clock3 aria-hidden="true" /><h3>Clocks and boundaries</h3><p>Use logical time and distinguish inclusive from exclusive limits.</p></section>
        <section><CalendarClock aria-hidden="true" /><h3>Changing lifetimes</h3><p>Replace deadlines and ignore obsolete future effects.</p></section>
        <section><Table2 aria-hidden="true" /><h3>Recent events</h3><p>Handle late and future events without restarting their event-time windows.</p></section>
      </div>
      <div className="chapter-completion-takeaway"><strong>The key idea</strong><p>A result can change as logical time advances, even when the source receives no new rows. Expiration changes membership, not the source table.</p></div>
      {nextChapter && <div className="chapter-completion-next"><div><span className="eyebrow">Up next · Chapter {nextChapter.number}</span><p>{nextChapter.shortTitle}</p></div>
        <Button variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button></div>}
    </Dialog>
  </div>;
}
