import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { useChapterCompletion } from '../../components/lab/chapterCompletionContext';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import type { ChapterDefinition } from '../chapterRegistry';
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
  const navigate = useNavigate();
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, TemporalPrediction>>({});
  const [activeStage, setActiveStage] = useState<TemporalStage>('timeline');
  const { open: openChapterCompletion, close: closeChapterCompletion } = useChapterCompletion();
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
          else openChapterCompletion();
        } else {
          flow.dispatch({ type: 'next' });
          setActiveStage('timeline');
          focusQuestion();
        }
      }}
      onReset={() => {
        flow.dispatch({ type: 'reset' });
        setAnswers({}); setActiveStage('timeline'); closeChapterCompletion(); setResetVersion((version) => version + 1);
      }} />
  </div>;
}
