import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { useChapterCompletion } from '../../components/lab/chapterCompletionContext';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import type { ChapterDefinition } from '../chapterRegistry';
import { ingestionExercises } from './exercise-scenarios';
import { gradeIngestionPrediction, solutionForQuestion, type ExercisePrediction } from './exercise-grading';
import { ExerciseAnswers } from './ExerciseAnswers';
import { ExerciseWorkspace } from './ExerciseWorkspace';
import '../../styles/lesson.css';
import '../incremental-maintenance/lecture-one.css';
import './lecture-one.css';
import './record-lectures.css';
import './exercises.css';

export function IngestionExercisePage({ chapter, navigation, exerciseIndex }: {
  chapter: ChapterDefinition; navigation: ReactNode; exerciseIndex: number;
}) {
  const exercise = ingestionExercises[exerciseIndex]!;
  const nextExercise = ingestionExercises[exerciseIndex + 1];
  const navigate = useNavigate();
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, ExercisePrediction>>({});
  const [activeStage, setActiveStage] = useState(question.kind === 'snapshot' ? 'source' : 'record');
  const { open: openChapterCompletion, close: closeChapterCompletion } = useChapterCompletion();
  const [resetVersion, setResetVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const prediction = answers[flow.stage] ?? {};
  const edit = (answer: ExercisePrediction) => {
    setAnswers((previous) => ({ ...previous, [flow.stage]: answer }));
    flow.dispatch({ type: 'edit' });
  };
  const check = (answer = prediction) => {
    const grade = gradeIngestionPrediction(question, answer);
    flow.dispatch({ type: 'check', grade });
    if (grade.correct) setActiveStage('relation');
  };
  const focusQuestion = () => requestAnimationFrame(() => {
    rootRef.current?.querySelector<HTMLElement>('.ingestion-exercise-answer-content')?.focus();
  });
  return <div ref={rootRef} className="ingestion-exercise-root">
    <ExerciseFrame key={resetVersion} chapter={chapter} navigation={navigation} title={`Exercise ${exerciseIndex + 1}`}
      description={`${exercise.title}. ${exercise.description}`} flow={flow} reference={exercise.reference}
      pageClass={`lesson-page changing-relations-page incremental-maintenance-page join-maintenance-page maintenance-lecture-page staged-exercise-page getting-data-in-page getting-data-in-exercise-page ${question.kind === 'record' ? 'record-lecture-page' : 'snapshot-exercise-page'}`}
      progressLabel="Questions" preserveQuestion mobilePanel="tables" checkpointTitle={question.title}
      question={question.question} hint={question.hint} nextExerciseLabel={nextExercise ? `Exercise ${exerciseIndex + 2}` : 'Finish chapter'}
      visualization={<ExerciseWorkspace question={question} accepted={flow.accepted}
        activeStage={activeStage} onSelectStage={setActiveStage} />}
      answers={<ExerciseAnswers key={flow.stage} question={question} prediction={prediction} grade={flow.grade}
        accepted={flow.accepted} onEdit={edit} />}
      onCheck={() => { check(); focusQuestion(); }}
      onShowAnswer={() => {
        const solution = solutionForQuestion(question);
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
          setActiveStage(exercise.questions[flow.stage + 1]!.kind === 'snapshot' ? 'source' : 'record');
          focusQuestion();
        }
      }}
      onReset={() => {
        flow.dispatch({ type: 'reset' });
        setAnswers({});
        closeChapterCompletion();
        setResetVersion((version) => version + 1);
        setActiveStage(exercise.questions[0]!.kind === 'snapshot' ? 'source' : 'record');
      }} />
  </div>;
}
