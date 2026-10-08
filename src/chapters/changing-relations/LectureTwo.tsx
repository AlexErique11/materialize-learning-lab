import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LectureScreen } from '../../labs/components/LectureScreen';
import type { ChapterDefinition } from '../chapterRegistry';
import { BatchWorkbench } from './BatchWorkbench';
import { GuidedSpotlight } from './GuidedSpotlight';
import { LessonText } from './LessonText';
import { RelationMetrics } from './RelationWorkbench';
import { lectureTwoBatches, lectureTwoInitial, lectureTwoReference, lectureTwoRun, lectureTwoSteps, lectureTwoUpdates } from './lecture-two-scenario';
import { relationAt } from './simulation';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { useLectureRun } from './useLectureRun';
import './lecture-one.css';

export function LectureTwo({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  const { state, dispatch } = useLectureRun(lectureTwoRun);
  const { open: helpOpen } = useWalkthrough();
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  const ledgerRef = useRef<HTMLElement>(null);
  const relationRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const lesson = lectureTwoSteps[Math.min(state.step, lectureTwoSteps.length - 1)]!;
  const relation = relationAt(lectureTwoUpdates, state.selectedTime, lectureTwoInitial);
  const tutorialComplete = state.step === lectureTwoSteps.length;
  const inspectingHistory = state.selectedTime !== state.applied;
  const beforeChange = Boolean(lesson.before) && !state.revealed;
  const spotlight = beforeChange ? 'ledger' : lesson.spotlight;
  const targetRef = spotlight === 'ledger' ? ledgerRef : relationRef;
  const phaseLabel = beforeChange ? 'Predict the effect' : 'Explanation';

  return <>
    <LectureScreen layout="with-tip" chapter={chapter} title="Lecture 2" regionLabel="Lecture content" navigation={navigation}
      className="changing-relations-page changing-relations-lecture-page" reference={lectureTwoReference}
      simulation={{ completed: state.selectedTime, total: lectureTwoBatches.length,
        progressLabel: 'Changes', playing: state.playing,
        onReset: () => dispatch({ type: 'reset' }), onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      guided={state.guided} metrics={
        <RelationMetrics relation={relation} time={state.selectedTime} metricsRef={metricsRef} />
      } visualization={<BatchWorkbench relation={relation} time={state.selectedTime} applied={state.applied} previewTime={state.guided && beforeChange ? lesson.time : null}
          guidedPanel={state.guided ? (spotlight === 'ledger' ? 'ledger' : 'relation') : undefined}
          ledgerRef={ledgerRef} relationRef={relationRef} controlsDisabled={state.playing || state.guided}
          highlightCopies={state.guided && state.revealed && lesson.spotlight === 'relation'} onSelectTime={(time) => dispatch({ type: 'select', time })} />}
      playback={
        <div className="relation-playback-controls" aria-label="Timestamp playback">
          {tutorialComplete && <span className="relation-tutorial-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
          <div>
            {inspectingHistory && <Button onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
            <Button aria-label="Previous timestamp" disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" /><span>Previous<span className="relation-playback-kind"> timestamp</span></span></Button>
            <Button aria-label="Next timestamp" data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === lectureTwoBatches.length} onClick={() => dispatch({ type: 'next-change' })}><span>Next<span className="relation-playback-kind"> timestamp</span></span><ArrowRight size={14} aria-hidden="true" /></Button>
          </div>
        </div>
      } />
    <GuidedSpotlight open={state.guided} targetRef={targetRef} step={Math.min(state.step + 1, lectureTwoSteps.length)} total={lectureTwoSteps.length}
      title={lesson.title} description={<LessonText content={beforeChange ? lesson.before! : lesson.explanation} />} phaseLabel={phaseLabel}
      onClose={() => dispatch({ type: 'close-guided' })}>
      <Button disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}>Back</Button>
      {beforeChange
        ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}>Show effect</Button>
        : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === lectureTwoSteps.length - 1 ? 'Finish tutorial' : 'Next'}</Button>}
    </GuidedSpotlight>
  </>;
}
