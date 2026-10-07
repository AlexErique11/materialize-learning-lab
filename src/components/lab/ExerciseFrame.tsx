import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Eye, Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { GuidedLabScreen } from '../../labs/components/GuidedLabScreen';
import type { ChapterDefinition } from '../../chapters/chapterRegistry';
import { LessonText, type LessonTextContent } from '../../chapters/changing-relations/LessonText';
import type { useExerciseStages } from '../../chapters/changing-relations/useExerciseStages';
import '../../chapters/changing-relations/exercises.css';
export function ExerciseFrame({ chapter, title, description, navigation, flow, visualization, pageClass, reference, mobilePanel, progressLabel = 'Phases',
  checkpointTitle, question, hint, answers, preserveQuestion = false, nextExerciseLabel, onCheck, onShowAnswer, onNext, onReset }: {
  chapter: ChapterDefinition; title: string; description: string; navigation: ReactNode;
  flow: ReturnType<typeof useExerciseStages>;
  visualization: ReactNode | ((questionOpen: boolean, setQuestionOpen: (open: boolean) => void) => ReactNode); mobilePanel?: string; progressLabel?: string; pageClass?: string; reference?: ComponentProps<typeof GuidedLabScreen>['reference'];
  nextExerciseLabel?: string;
  preserveQuestion?: boolean; checkpointTitle: string; question: LessonTextContent; hint: LessonTextContent; answers: ReactNode;
  onCheck: () => void; onShowAnswer: () => void; onNext: () => void; onReset: () => void;
}) {
  const showNext = flow.accepted && (!flow.complete || Boolean(nextExerciseLabel));
  const questionContent = preserveQuestion && (!flow.grade || flow.accepted)
    ? (flow.hintOpen && !flow.grade ? hint : question)
    : flow.grade?.explanation ?? (flow.hintOpen ? hint : question);
  const formId = useId();
  const stageLabel = progressLabel === 'Phases' ? 'Phase' : progressLabel === 'Questions' ? 'Question' : 'Checkpoint';
  const [questionOpen, setQuestionOpen] = useState(true);
  return <GuidedLabScreen chapter={chapter} title={title} regionLabel="Exercise content" navigation={navigation}
    description={description} showTip={false} showReference={Boolean(reference)} reference={reference} className={pageClass ?? "changing-relations-page staged-exercise-page"}
    controls={{
      progress: <div className="guided-lab-progress"><div><span>{progressLabel}</span><strong>{flow.completed} / {flow.total}</strong></div>
        <ProgressBar value={flow.completed} total={flow.total} label={`Exercise ${progressLabel.toLowerCase()} completed`} /></div>,
      actions: <>
        <Button onClick={onReset}>Reset</Button>
        <Button data-walkthrough="hint" disabled={flow.accepted} aria-expanded={flow.hintOpen} aria-controls={`${formId}-question`} onClick={() => { setQuestionOpen(true); flow.dispatch({ type: 'hint' }); }}><Lightbulb size={14} aria-hidden="true" />Hint</Button>
        <Button data-walkthrough="answer" disabled={flow.accepted} onClick={() => { setQuestionOpen(true); onShowAnswer(); }}><Eye size={14} aria-hidden="true" />Show Answer</Button>
        <Button data-walkthrough="check" variant="primary" type="submit" form={formId} disabled={flow.accepted}><CheckCircle2 size={14} aria-hidden="true" />Check Answer</Button>
      </>,
    }}
    workspace={<form id={formId} className="relation-workspace" data-question-open={questionOpen} data-mobile-view={mobilePanel ? questionOpen ? 'question' : mobilePanel : undefined} noValidate onSubmit={(event) => { event.preventDefault(); if (!flow.accepted) { setQuestionOpen(true); onCheck(); } }}>
      {typeof visualization === 'function' ? visualization(questionOpen, setQuestionOpen) : visualization}
      {!mobilePanel && <Button className="exercise-question-toggle" aria-expanded={questionOpen} onClick={() => setQuestionOpen((value) => !value)}>{questionOpen ? 'View tables' : 'Question'}</Button>}
      <section id={`${formId}-question`} data-walkthrough="question" className="exercise-question" data-result={flow.grade ? (flow.accepted ? 'correct' : 'incorrect') : 'ready'} aria-labelledby={`${formId}-heading`}>
        <div className="exercise-question-copy" aria-live="polite" aria-atomic="true">
          <h2 id={`${formId}-heading`}>{flow.accepted ? <CheckCircle2 size={18} aria-hidden="true" /> : <Lightbulb size={18} aria-hidden="true" />}<span><LessonText content={(preserveQuestion ? undefined : flow.grade?.title) ?? [`${stageLabel} ${flow.stage + 1} of ${flow.total}: ${checkpointTitle}`]} /></span></h2>
          <p><LessonText content={questionContent} /></p>
        </div>
        <div className="exercise-answers" aria-label="Your prediction">{answers}</div>
      </section>
      <div className="exercise-question-navigation" data-reserve-navigation={Boolean(nextExerciseLabel) || undefined}>
        {showNext && <Button className="exercise-next-question" variant="primary" onClick={() => { setQuestionOpen(true); onNext(); }}>{flow.stage === flow.total - 1 && nextExerciseLabel ? nextExerciseLabel : 'Next question'}<ArrowRight size={14} aria-hidden="true" /></Button>}
      </div>
    </form>} />;
}
