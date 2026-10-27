import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { ChapterDefinition } from '../chapterRegistry';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { LectureWorkspace } from '../../labs/components/LectureWorkspace';
import { useChapterCompletion } from '../../components/lab/chapterCompletionContext';
import { useExerciseStages } from '../../hooks/useExerciseStages';
import { TimestampTrays } from './TimestampTrays';
import { gradeSubscription, solutionFor, subscriptionExercises, type SubscriptionPrediction } from './exercise-scenarios';
import { objective, referenceLinks, subscriptionSqlFor } from './resources';
import { subscriptionText } from './lessonText';
import '../../styles/lesson.css';
import './chapter.css';

export function SubscribeExercisePage({ chapter, exerciseIndex, navigation }: { chapter: ChapterDefinition; exerciseIndex: number; navigation: ReactNode }) {
  const exercise = subscriptionExercises[exerciseIndex]!;
  const flow = useExerciseStages(exercise.questions.length);
  const question = exercise.questions[flow.stage]!;
  const [answers, setAnswers] = useState<Record<number, SubscriptionPrediction>>({});
  const prediction = answers[flow.stage] ?? {};
  const completion = useChapterCompletion();
  const navigate = useNavigate();
  const nextExercise = subscriptionExercises[exerciseIndex + 1];
  const current = flow.accepted ? question.after : question.before;
  const edit = (id: string, value: string) => { setAnswers(previous => ({ ...previous, [flow.stage]: { ...prediction, [id]: value } })); flow.dispatch({ type: 'edit' }); };
  return <ExerciseFrame chapter={chapter} title={`Exercise ${exerciseIndex + 1}`} description={exercise.description} navigation={navigation} flow={flow} progressLabel="Questions"
    pageClass="lesson-page staged-exercise-page lecture-layout-page lecture-subtitle-layout subscribe-chapter-page subscribe-exercise-page"
    reference={{ objective, sql: subscriptionSqlFor(current), documentationLinks: referenceLinks }} checkpointTitle={question.title} question={subscriptionText(question.prompt)} hint={subscriptionText(question.hint)}
    nextExerciseLabel={nextExercise ? `Exercise ${exerciseIndex + 2}` : 'Finish chapter'}
    visualization={<TimestampTrays state={current} assessment />}
    renderWorkspace={({ visualization, question: prompt, navigation: footer }) => <LectureWorkspace layout="without-tip" guided={false}
      visualization={<div className="subscribe-exercise-layout">{visualization}<div className="subscribe-question-slot">{prompt}</div></div>}
      playback={<div className="relation-playback-controls">{footer}</div>} />}
    answers={<div className="subscribe-answer-groups">{question.groups.map(group => <label key={group.id} className="subscribe-answer-group" data-wide={group.wide || undefined}>
      <span className="subscribe-answer-label">{group.label}</span>
      {group.kind === 'integer' ? <input aria-label={group.label} disabled={flow.accepted} inputMode="numeric" autoComplete="off" value={prediction[group.id] ?? ''} aria-invalid={Boolean(flow.grade?.errors[group.id])} onChange={event => edit(group.id, event.target.value)} />
        : <select aria-label={group.label} disabled={flow.accepted} value={prediction[group.id] ?? ''} aria-invalid={Boolean(flow.grade?.errors[group.id])} onChange={event => edit(group.id, event.target.value)}><option value="">Choose an answer</option>{group.choices!.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>}
    </label>)}</div>}
    onCheck={() => flow.dispatch({ type: 'check', grade: gradeSubscription(question, prediction) })}
    onShowAnswer={() => { const answer = solutionFor(question); setAnswers(previous => ({ ...previous, [flow.stage]: answer })); flow.dispatch({ type: 'check', grade: gradeSubscription(question, answer) }); }}
    onNext={() => { if (!flow.accepted) return; if (!flow.complete) flow.dispatch({ type: 'next' }); else if (nextExercise) navigate(`/labs/${chapter.slug}/exercises/${nextExercise.slug}`); else completion.open(); }}
    onReset={() => { flow.dispatch({ type: 'reset' }); setAnswers({}); completion.close(); }} />;
}
