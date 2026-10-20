import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { chapterPath, chapters } from '../chapterRegistry';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { FlowGraph } from './FlowGraph';
import { documentationLinks } from './scenario';
import { gradeObjectPrediction, objectExercises } from './exercise-scenarios';
import type { DiagramPanel } from './simulation';
import '../../styles/lesson.css';
import './chapter.css';

export function ObjectChapterExercise({ chapter, navigation, exerciseIndex }: { chapter: ChapterDefinition; navigation: ReactNode; exerciseIndex: number }) {
  const navigate = useNavigate();
  const exercise = objectExercises[exerciseIndex]!;
  const flow = useExerciseStages(exercise.checkpoints.length);
  const checkpoint = exercise.checkpoints[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, readonly string[]>>({});
  const selected = answers[flow.stage] ?? [];
  const [panel, setPanel] = useState<DiagramPanel>('input');
  const [completionOpen, setCompletionOpen] = useState(false);
  const lastExercise = exerciseIndex === objectExercises.length - 1;
  const nextChapter = chapters[chapters.findIndex(item => item.slug === chapter.slug) + 1];
  return <>
    <ExerciseFrame chapter={chapter} navigation={navigation} title={`Exercise ${exerciseIndex + 1}`} description={flow.accepted ? 'Prediction accepted · effect revealed' : 'Current fixture · predict the proposed effect.'}
      pageClass="lesson-page staged-exercise-page object-chapter-page object-exercise-page lecture-layout-page" flow={flow} progressLabel="Questions"
      reference={{ objective: 'Choose objects and explain their state locations before revealing the effect. Scenario fixtures change when the question says “New fixture”. The final challenge builds a complete shared-serving design.', sql: exercise.sql, documentationLinks }}
      checkpointTitle={checkpoint.title} question={[checkpoint.question]} hint={[checkpoint.hint]} nextExerciseLabel={lastExercise ? 'Finish chapter' : 'Exercise 2'}
      visualization={<FlowGraph snapshot={flow.accepted ? checkpoint.after : checkpoint.before} showClusterB compact selectedPanel={panel} onSelectPanel={setPanel} pending={!flow.accepted} />}
      renderWorkspace={({ visualization, question, navigation: questionNavigation }) => <div className="object-exercise-workspace">
        {visualization}
        {question}
        <div className="object-exercise-footer">{questionNavigation}</div>
      </div>}
      answers={<><fieldset className="object-answer-choices" disabled={flow.accepted}><legend>Select {checkpoint.solution.length === 1 ? 'one answer' : 'every correct statement'}</legend>
        {checkpoint.choices.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={event => { const checked = event.target.checked;
          setAnswers(previous => ({ ...previous, [flow.stage]: checked ? [...selected, item.id] : selected.filter(id => id !== item.id) })); flow.dispatch({ type: 'edit' }); }} />{item.label}</label>)}
      </fieldset></>}
      onCheck={() => flow.dispatch({ type: 'check', grade: gradeObjectPrediction(checkpoint, selected) })}
      onShowAnswer={() => { setAnswers(previous => ({ ...previous, [flow.stage]: checkpoint.solution })); flow.dispatch({ type: 'check', grade: gradeObjectPrediction(checkpoint, checkpoint.solution) }); }}
      onNext={() => { if (!flow.accepted) return; if (flow.complete) { if (lastExercise) setCompletionOpen(true); else navigate(`/labs/${chapter.slug}/exercises/exercise-2`); } else { flow.dispatch({ type: 'next' }); setPanel('input'); } }}
      onReset={() => { flow.dispatch({ type: 'reset' }); setAnswers({}); setPanel('input'); setCompletionOpen(false); }} />
    <Dialog open={completionOpen} onClose={() => setCompletionOpen(false)} title="You finished Chapter 3" eyebrow="Chapter complete">
      <div className="object-recap"><p>You designed one transformation with two serving clusters.</p>
        <ul><li><strong>Regular views</strong> save SQL definitions.</li><li><strong>Indexes</strong> maintain complete results in their own cluster’s memory.</li><li><strong>Materialized views</strong> maintain durable output readable across clusters.</li></ul>
        <p>Removing a serving index leaves the materialized view and its durable result available. Maintaining that output still uses transform memory; creation and restarts require hydration.</p>
        {nextChapter && <Button variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button>}
      </div>
    </Dialog>
  </>;
}
