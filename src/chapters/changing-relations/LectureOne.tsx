import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LectureScreen } from '../../labs/components/LectureScreen';
import type { ChapterDefinition } from '../chapterRegistry';
import { GuidedSpotlight } from './GuidedSpotlight';
import { LessonText } from './LessonText';
import { RelationMetrics, RelationWorkbench } from './RelationWorkbench';
import { lectureReference, lectureSteps, lectureUpdates } from './scenario';
import { relationAt } from './simulation';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { useLectureRun } from './useLectureRun';
import './lecture-one.css';

interface LectureOneProps {
  chapter: ChapterDefinition;
  navigation: ReactNode;
}

export function LectureOne({ chapter, navigation }: LectureOneProps) {
  const { state, dispatch } = useLectureRun();
  const { open: helpOpen } = useWalkthrough();
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  const ledgerRef = useRef<HTMLElement>(null);
  const relationRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const countsRef = useRef<HTMLDivElement>(null);
  const lesson = lectureSteps[Math.min(state.step, lectureSteps.length - 1)]!;
  const relation = relationAt(lectureUpdates, state.selectedTime);
  const tutorialComplete = state.step === lectureSteps.length;
  const inspectingHistory = state.selectedTime !== state.applied;
  const beforeChange = Boolean(lesson.before) && !state.revealed;
  const explanation = beforeChange ? lesson.before! : lesson.explanation;
  const spotlight = beforeChange ? 'ledger' : lesson.spotlight;
  const targetRef = spotlight === 'ledger' ? ledgerRef : spotlight === 'metrics' ? countsRef : relationRef;
  const phaseLabel = beforeChange ? 'Predict the effect' : 'Explanation';

  return (
    <>
      <LectureScreen layout="with-tip" chapter={chapter} title="Lecture 1" regionLabel="Lecture content" navigation={navigation}
        className="changing-relations-page changing-relations-lecture-page" reference={lectureReference}
        simulation={{ completed: state.selectedTime, total: lectureUpdates.length,
          progressLabel: 'Changes', playing: state.playing,
          onReset: () => dispatch({ type: 'reset' }), onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
        guided={state.guided} metrics={
          <RelationMetrics relation={relation} time={state.selectedTime} metricsRef={metricsRef} countsRef={countsRef} />
        } visualization={<RelationWorkbench relation={relation} updates={lectureUpdates} time={state.selectedTime} applied={state.applied} onSelectTime={(time) => dispatch({ type: 'select', time })}
            guidedPanel={state.guided ? (spotlight === 'ledger' ? 'ledger' : 'relation') : undefined}
            ledgerRef={ledgerRef} relationRef={relationRef} controlsDisabled={state.playing || state.guided}
            highlightCopies={state.guided && state.revealed && lesson.spotlight === 'relation'}
            previewTime={state.guided && spotlight === 'ledger' ? lesson.time || lectureUpdates[0]!.time : null} />}
        playback={
          <div className="relation-playback-controls" aria-label="Change playback">
            {tutorialComplete && <span className="relation-tutorial-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
            <div>
              {inspectingHistory && <Button onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
              <Button aria-label="Previous change" disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}>
                <ArrowLeft size={14} aria-hidden="true" /><span>Previous<span className="relation-playback-kind"> change</span></span>
              </Button>
              <Button aria-label="Next change" data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === lectureUpdates.length} onClick={() => dispatch({ type: 'next-change' })}>
                <span>Next<span className="relation-playback-kind"> change</span></span><ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        } />
      <GuidedSpotlight open={state.guided} targetRef={targetRef}
        step={Math.min(state.step + 1, lectureSteps.length)} total={lectureSteps.length}
        title={lesson.title} description={<LessonText content={explanation} />} phaseLabel={phaseLabel}
        onClose={() => dispatch({ type: 'close-guided' })}>
        <Button disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}>Back</Button>
        {beforeChange
          ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}>Show effect</Button>
          : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === lectureSteps.length - 1 ? 'Finish tutorial' : 'Next'}</Button>}
      </GuidedSpotlight>
    </>
  );
}
