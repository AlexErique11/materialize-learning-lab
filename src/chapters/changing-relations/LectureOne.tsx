import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GuidedLabScreen } from '../../labs/components/GuidedLabScreen';
import type { ChapterDefinition } from '../chapterRegistry';
import { GuidedDiagram } from './GuidedDiagram';
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
  const lesson = lectureSteps[Math.min(state.step, lectureSteps.length - 1)]!;
  const relation = relationAt(lectureUpdates, state.selectedTime);
  const tutorialComplete = state.step === lectureSteps.length;
  const inspectingHistory = state.selectedTime !== state.applied;
  const beforeChange = Boolean(lesson.before) && !state.revealed;
  const explanation = beforeChange ? lesson.before! : lesson.explanation;
  const spotlight = beforeChange ? 'ledger' : lesson.spotlight;
  const targetRef = spotlight === 'ledger' ? ledgerRef : spotlight === 'metrics' ? metricsRef : relationRef;
  let phaseLabel = 'Introduction';
  if (lesson.diagram === 'record') phaseLabel = 'Read the record';
  else if (lesson.diagram === 'recap') phaseLabel = 'Recap';
  else if (lesson.before) phaseLabel = beforeChange ? 'Before the change' : 'Effect shown';
  let playbackStatus = `${state.applied} of ${lectureUpdates.length} changes applied`;
  if (state.playing) playbackStatus = 'Playing changes';
  else if (inspectingHistory) playbackStatus = `Inspecting t = ${state.selectedTime}`;

  return (
    <>
      <GuidedLabScreen chapter={chapter} title="Lecture 1" regionLabel="Lecture content" navigation={navigation}
        className="changing-relations-page" reference={lectureReference}
        simulation={{ completed: state.guided ? state.step : state.applied, total: state.guided ? lectureSteps.length : lectureUpdates.length,
          progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
          onReset: () => dispatch({ type: 'reset' }), onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
        workspace={<div className="relation-workspace" data-guided={state.guided}>
          <RelationMetrics relation={relation} time={state.selectedTime} metricsRef={metricsRef} />
          <RelationWorkbench relation={relation} updates={lectureUpdates} time={state.selectedTime} applied={state.applied} onSelectTime={(time) => dispatch({ type: 'select', time })}
            ledgerRef={ledgerRef} relationRef={relationRef} controlsDisabled={state.playing || state.guided}
            highlightCopies={state.guided && state.revealed && lesson.spotlight === 'relation'} showArrow={state.guided && state.revealed}
            previewTime={state.guided && (beforeChange || lesson.diagram === 'record') ? lesson.time || lectureUpdates[0]!.time : null} />
          <div className="relation-playback-controls" aria-label="Change playback">
            <span className="relation-playback-status" role="status">{playbackStatus}</span>
            {tutorialComplete && <span className="relation-tutorial-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
            {inspectingHistory && <Button onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
            <div>
              <Button disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}>
                <ArrowLeft size={14} aria-hidden="true" />Previous change
              </Button>
              <Button data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === lectureUpdates.length} onClick={() => dispatch({ type: 'next-change' })}>
                Next change<ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>} />
      <GuidedSpotlight open={state.guided} targetRef={targetRef}
        step={Math.min(state.step + 1, lectureSteps.length)} total={lectureSteps.length}
        title={lesson.title} description={<LessonText content={explanation} />} phaseLabel={phaseLabel}
        visual={<GuidedDiagram kind={lesson.diagram} time={lesson.time} revealed={state.revealed} />}
        onClose={() => dispatch({ type: 'close-guided' })}>
        <Button disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}><ArrowLeft size={14} aria-hidden="true" />Back</Button>
        {beforeChange
          ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}><Play size={13} fill="currentColor" aria-hidden="true" />Show effect</Button>
          : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === lectureSteps.length - 1 ? 'Finish tutorial' : 'Next'}<ArrowRight size={14} aria-hidden="true" /></Button>}
      </GuidedSpotlight>
    </>
  );
}
