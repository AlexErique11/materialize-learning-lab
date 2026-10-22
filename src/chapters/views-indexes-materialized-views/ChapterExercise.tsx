import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { useChapterCompletion } from '../../components/lab/chapterCompletionContext';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { FlowGraph } from './FlowGraph';
import { ObjectExerciseWorkspace } from './ObjectExerciseWorkspace';
import { documentationLinks } from './scenario';
import { gradeObjectPrediction, objectExercises } from './exercise-scenarios';
import type { DiagramPanel } from './simulation';
import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
import '../../styles/lesson.css';
import './chapter.css';

const plainText = (content: LessonTextContent) => content.map(part => typeof part === 'string' ? part : part.text).join('');

export function ObjectChapterExercise({ chapter, navigation, exerciseIndex }: { chapter: ChapterDefinition; navigation: ReactNode; exerciseIndex: number }) {
  const navigate = useNavigate();
  const exercise = objectExercises[exerciseIndex]!;
  const flow = useExerciseStages(exercise.checkpoints.length);
  const checkpoint = exercise.checkpoints[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, readonly string[]>>({});
  const selected = answers[flow.stage] ?? [];
  const [panel, setPanel] = useState<DiagramPanel>('input');
  const { open: openChapterCompletion, close: closeChapterCompletion } = useChapterCompletion();
  const [answersOpen, setAnswersOpen] = useState(false);
  const lastExercise = exerciseIndex === objectExercises.length - 1;
  const questionTitle = `Question ${flow.stage + 1} of ${flow.total}: ${checkpoint.title}`;
  const copyVariants = [
    { title: questionTitle, text: checkpoint.question, result: 'ready' },
    { title: questionTitle, text: checkpoint.hint, result: 'ready' },
    ...[[], checkpoint.solution, ...checkpoint.choices.map(choice => [choice.id])].map(selection => {
      const grade = gradeObjectPrediction(checkpoint, selection);
      return { title: plainText(grade.title), text: plainText(grade.explanation), result: grade.correct ? 'correct' : 'incorrect' };
    }),
  ];
  return <>
    <ExerciseFrame chapter={chapter} navigation={navigation} title={`Exercise ${exerciseIndex + 1}`} description={flow.accepted ? 'Prediction accepted · effect revealed' : 'Current fixture · predict the proposed effect.'}
      pageClass="lesson-page staged-exercise-page object-chapter-page object-exercise-page lecture-layout-page" flow={flow} progressLabel="Questions"
      reference={{ objective: 'Choose objects and explain their state locations before revealing the effect. Scenario fixtures change when the question says “New fixture”. The final challenge builds a complete shared-serving design.', sql: exercise.sql, documentationLinks }}
      checkpointTitle={checkpoint.title} question={[checkpoint.question]} hint={[checkpoint.hint]} nextExerciseLabel={lastExercise ? 'Finish chapter' : 'Exercise 2'}
      visualization={<FlowGraph snapshot={flow.accepted ? checkpoint.after : checkpoint.before} showClusterB compact selectedPanel={panel} onSelectPanel={setPanel} pending={!flow.accepted} />}
      renderWorkspace={({ visualization, question, navigation: questionNavigation }) => <ObjectExerciseWorkspace chapter={chapter} navigation={navigation} visualization={visualization} question={question} footer={questionNavigation} copyVariants={copyVariants} />}
      answers={<><div className="object-answer-picker"><span>{checkpoint.solution.length === 1 ? 'Choose one' : 'Choose all'}</span><Button aria-label="Select answers" aria-haspopup="dialog" onClick={() => setAnswersOpen(true)}>{selected.length ? `${selected.length} selected` : 'Answers'}<ChevronDown size={12} aria-hidden="true" /></Button></div><fieldset className="object-answer-choices" disabled={flow.accepted}><legend>Select {checkpoint.solution.length === 1 ? 'one answer' : 'every correct statement'}</legend>
        {checkpoint.choices.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={event => { const checked = event.target.checked;
          setAnswers(previous => ({ ...previous, [flow.stage]: checked ? [...selected, item.id] : selected.filter(id => id !== item.id) })); flow.dispatch({ type: 'edit' }); }} />{item.label}</label>)}
      </fieldset></>}
      onCheck={() => flow.dispatch({ type: 'check', grade: gradeObjectPrediction(checkpoint, selected) })}
      onShowAnswer={() => { setAnswers(previous => ({ ...previous, [flow.stage]: checkpoint.solution })); flow.dispatch({ type: 'check', grade: gradeObjectPrediction(checkpoint, checkpoint.solution) }); }}
      onNext={() => { if (!flow.accepted) return; if (flow.complete) { if (lastExercise) openChapterCompletion(); else navigate(`/labs/${chapter.slug}/exercises/exercise-2`); } else { flow.dispatch({ type: 'next' }); setPanel('input'); } }}
      onReset={() => { flow.dispatch({ type: 'reset' }); setAnswers({}); setPanel('input'); closeChapterCompletion(); }} />
    <Dialog open={answersOpen} onClose={() => setAnswersOpen(false)} title="Select answers">
      <fieldset className="object-answer-choices object-answer-dialog" disabled={flow.accepted}><legend>Select {checkpoint.solution.length === 1 ? 'one answer' : 'every correct statement'}</legend>
        {checkpoint.choices.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={event => {
          setAnswers(previous => ({ ...previous, [flow.stage]: event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id) })); flow.dispatch({ type: 'edit' });
        }} />{item.label}</label>)}
      </fieldset>
      <Button onClick={() => setAnswersOpen(false)}>Done</Button>
    </Dialog>
  </>;
}
