import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GuidedLabScreen } from '../../labs/components/GuidedLabScreen';
import type { ChapterDefinition } from '../chapterRegistry';
import { BatchWorkbench } from './BatchWorkbench';
import { GuidedSpotlight } from './GuidedSpotlight';
import { LessonText } from './LessonText';
import { RelationMetrics } from './RelationWorkbench';
import { UpdateDiagram } from './UpdateDiagram';
import { lectureTwoBatches, lectureTwoInitial, lectureTwoReference, lectureTwoRun, lectureTwoSteps, lectureTwoUpdates } from './lecture-two-scenario';
import { relationAt } from './simulation';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { useLectureRun } from './useLectureRun';
import './lecture-one.css';
import './lecture-two.css';

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
  const targetRef = spotlight === 'ledger' ? ledgerRef : spotlight === 'metrics' ? metricsRef : relationRef;
  const phaseLabel = lesson.phase ?? (beforeChange ? 'Before the change' : 'Effect shown');
  let playbackStatus = `${state.applied} of ${lectureTwoBatches.length} timestamps applied`;
  if (state.playing) playbackStatus = 'Playing complete timestamps';
  else if (inspectingHistory) playbackStatus = `Inspecting t = ${state.selectedTime}`;

  return <>
    <GuidedLabScreen chapter={chapter} title="Lecture 2" regionLabel="Lecture content" navigation={navigation}
      className="changing-relations-page lecture-two-page" reference={lectureTwoReference}
      simulation={{ completed: state.guided ? state.step : state.applied, total: state.guided ? lectureTwoSteps.length : lectureTwoBatches.length,
        progressLabel: state.guided ? 'Tutorial' : 'Timestamps', playing: state.playing,
        onReset: () => dispatch({ type: 'reset' }), onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      workspace={<div className="relation-workspace" data-guided={state.guided}>
        <RelationMetrics relation={relation} time={state.selectedTime} metricsRef={metricsRef} />
        <BatchWorkbench relation={relation} time={state.selectedTime} applied={state.applied} previewTime={state.guided && beforeChange ? lesson.time : null}
          ledgerRef={ledgerRef} relationRef={relationRef} controlsDisabled={state.playing || state.guided}
          highlightCopies={state.guided && state.revealed && lesson.spotlight === 'relation'} onSelectTime={(time) => dispatch({ type: 'select', time })} />
        <div className="relation-playback-controls" aria-label="Timestamp playback">
          <span className="relation-playback-status" role="status">{playbackStatus}</span>
          {tutorialComplete && <span className="relation-tutorial-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
          {inspectingHistory && <Button onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
          <div>
            <Button disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" />Previous timestamp</Button>
            <Button data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === lectureTwoBatches.length} onClick={() => dispatch({ type: 'next-change' })}>Next timestamp<ArrowRight size={14} aria-hidden="true" /></Button>
          </div>
        </div>
      </div>} />
    <GuidedSpotlight open={state.guided} targetRef={targetRef} step={Math.min(state.step + 1, lectureTwoSteps.length)} total={lectureTwoSteps.length}
      title={lesson.title} description={<LessonText content={beforeChange ? lesson.before! : lesson.explanation} />} phaseLabel={phaseLabel}
      visual={<UpdateDiagram kind={lesson.diagram} time={lesson.time} revealed={state.revealed} />} onClose={() => dispatch({ type: 'close-guided' })}>
      <Button disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}><ArrowLeft size={14} aria-hidden="true" />Back</Button>
      {beforeChange
        ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}><Play size={13} fill="currentColor" aria-hidden="true" />Show effect</Button>
        : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === lectureTwoSteps.length - 1 ? 'Finish tutorial' : 'Next'}<ArrowRight size={14} aria-hidden="true" /></Button>}
    </GuidedSpotlight>
  </>;
}
