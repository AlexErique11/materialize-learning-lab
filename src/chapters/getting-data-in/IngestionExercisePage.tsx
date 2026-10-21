import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Database, FileInput, KeyRound } from 'lucide-react';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { Button } from '../../components/ui/Button';
import { ChapterCompletionDialog } from '../../components/lab/ChapterCompletionDialog';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { chapterPath, chapters, type ChapterDefinition } from '../chapterRegistry';
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
  const nextChapter = chapters[chapters.findIndex((item) => item.slug === chapter.slug) + 1];
  const navigate = useNavigate();
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, ExercisePrediction>>({});
  const [activeStage, setActiveStage] = useState(question.kind === 'snapshot' ? 'source' : 'record');
  const [completionOpen, setCompletionOpen] = useState(false);
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
          else setCompletionOpen(true);
        } else {
          flow.dispatch({ type: 'next' });
          setActiveStage(exercise.questions[flow.stage + 1]!.kind === 'snapshot' ? 'source' : 'record');
          focusQuestion();
        }
      }}
      onReset={() => {
        flow.dispatch({ type: 'reset' });
        setAnswers({});
        setCompletionOpen(false);
        setResetVersion((version) => version + 1);
        setActiveStage(exercise.questions[0]!.kind === 'snapshot' ? 'source' : 'record');
      }} />
    <ChapterCompletionDialog chapter={chapter} open={completionOpen} onClose={() => setCompletionOpen(false)}
      className="chapter-completion-dialog ingestion-completion-dialog">
      <div className="chapter-completion-intro">
        <div className="chapter-completion-copy"><h3>From incoming data to current rows</h3>
          <p>You followed data from an initial snapshot into a maintained table, and chose how incoming records become changes.</p></div>
        <img src={chapter.overviewImage} alt="" aria-hidden="true" className="chapter-completion-art" />
      </div>
      <div className="chapter-completion-topics">
        <section><Database aria-hidden="true" /><h3>Snapshot and live CDC</h3><p>Commit the starting rows together, catch up, then maintain the live table.</p></section>
        <section><FileInput aria-hidden="true" /><h3>Producer contracts</h3><p>Interpret events, current keyed values, and explicit before/after changes.</p></section>
        <section><KeyRound aria-hidden="true" /><h3>Stable keys and deletions</h3><p>Preserve identity through updates and distinguish nullable fields, tombstones, and errors.</p></section>
      </div>
      <div className="chapter-completion-takeaway"><strong>The key idea</strong>
        <p>The producer’s contract determines how records become rows. Correct identity keeps updates from becoming additional products.</p></div>
      {nextChapter && <div className="chapter-completion-next"><div><span className="eyebrow">Up next · Chapter {nextChapter.number}</span><p>{nextChapter.shortTitle}</p></div>
        <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button></div>}
    </ChapterCompletionDialog>
  </div>;
}
