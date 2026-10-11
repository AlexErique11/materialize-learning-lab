import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Database, ListTodo } from 'lucide-react';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { LessonText } from '../../components/lesson/LessonText';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import type { ChapterDefinition } from '../chapterRegistry';
import { SnapshotWorkspace } from './IngestionLayouts';
import { SnapshotPanelContent } from './SnapshotPanels';
import { initialProducts, snapshotLessons, snapshotReference, snapshotRunDefinition } from './scenario';
import { snapshotAt } from './simulation';
import '../../styles/lesson.css';
import '../incremental-maintenance/lecture-one.css';
import '../incremental-maintenance/lecture-two.css';
import './lecture-one.css';

export function SnapshotLectureOne({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  const { state, dispatch } = useLectureRun(snapshotRunDefinition);
  const { open: helpOpen } = useWalkthrough();
  const [selectedStage, setSelectedStage] = useState('source');
  const sourceRef = useRef<HTMLElement>(null);
  const ingestionRef = useRef<HTMLElement>(null);
  const relationRef = useRef<HTMLElement>(null);
  const snapshotProgressRef = useRef<HTMLElement>(null);
  const refs = { source: sourceRef, ingestion: ingestionRef, relation: relationRef };
  const connectMetricRef = useCallback((element: HTMLDivElement | null) => {
    snapshotProgressRef.current = (element?.firstElementChild as HTMLElement | null) ?? null;
  }, []);
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  const lesson = snapshotLessons[Math.min(state.step, snapshotLessons.length - 1)]!;
  const activeStage = state.guided ? lesson.stage : selectedStage;
  const current = snapshotAt(state.selectedTime);
  const beforeChange = Boolean(lesson.before) && !state.revealed;
  const tutorialComplete = state.step === snapshotLessons.length;
  const targetRef = lesson.focus === 'snapshot-progress' ? snapshotProgressRef : refs[lesson.stage];

  return <>
    <LectureScreen layout="without-tip" chapter={chapter} title="Lecture 1" regionLabel="Lecture content" navigation={navigation}
      className="lesson-page changing-relations-page incremental-maintenance-page join-maintenance-page maintenance-lecture-page getting-data-in-page snapshot-lecture-page"
      description="Follow a snapshot into a live product table." reference={snapshotReference}
      simulation={{ completed: state.guided ? state.step : state.selectedTime,
        total: state.guided ? snapshotLessons.length : snapshotRunDefinition.totalChanges,
        progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: () => { setSelectedStage('source'); dispatch({ type: 'reset' }); },
        onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      guided={state.guided}
      metrics={<div className="relation-metrics ingestion-status-bar"><div ref={connectMetricRef} className="ingestion-status-metrics" aria-label="Ingestion metrics">
        <WorkspaceMetric icon={<Database size={25} aria-hidden="true" />} testId="snapshot-read-metric"
          label={<><span className="snapshot-metric-full">Snapshot rows read</span><span className="snapshot-metric-short">Snapshot read</span>
            <RelationHelp label="Snapshot rows read" text="The number of starting rows read from the consistent initial snapshot. Read rows become queryable only when the complete snapshot commits." /></>}
          value={<span data-testid="snapshot-rows-read">{current.snapshotRowsRead} / {initialProducts.length}</span>} />
        <WorkspaceMetric icon={<ListTodo size={25} aria-hidden="true" />} testId="snapshot-pending-metric"
          label={<><span className="snapshot-metric-full">Pending CDC changes</span><span className="snapshot-metric-short">Pending CDC</span>
            <RelationHelp label="Pending CDC changes" text="The number of captured database changes still waiting to be applied to the Materialize table. This counts operations, not products." /></>}
          value={<span data-testid="snapshot-pending-count">{current.pendingCount}</span>} />
        <WorkspaceMetric icon={<Clock3 size={25} aria-hidden="true" />}
          label={<>Ingestion phase <RelationHelp label="Ingestion phase" text="Snapshotting reads the starting catalog. Catch-up applies changes queued during that snapshot. Live applies newly arriving changes after the table has caught up." /></>}
          value={<span className="relation-time" data-testid="snapshot-phase" data-phase={current.phase}>
            <span className="snapshot-metric-full">{current.phase}</span>
            <span className="snapshot-metric-short">{current.phase === 'Snapshotting' ? 'Snapshot' : current.phase}</span>
          </span>} />
      </div><span className="ingestion-checkpoint"><Clock3 size={14} aria-hidden="true" /><span data-testid="snapshot-checkpoint">t = {state.selectedTime}</span></span></div>}
      visualization={<SnapshotWorkspace activeStage={activeStage} setSelectedStage={setSelectedStage}
        guided={state.guided} state={current} panelRefs={refs}
        renderContent={(stage) => <SnapshotPanelContent stage={stage} state={current}
          highlight={state.guided && state.revealed && activeStage === stage} />} />}
      playback={<div className="relation-playback-controls" aria-label="Change playback">
        {tutorialComplete && <span className="relation-tutorial-complete maintenance-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
        <div>
          {state.selectedTime !== state.applied && <Button disabled={state.guided || state.playing}
            onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
          <Button disabled={state.guided || state.playing || state.selectedTime === 0}
            onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
          <Button data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === snapshotRunDefinition.totalChanges}
            onClick={() => dispatch({ type: 'next-change' })}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
        </div>
      </div>} />
    <Spotlight open={state.guided} targetRef={targetRef} placement="above-first"
      step={Math.min(state.step + 1, snapshotLessons.length)} total={snapshotLessons.length}
      title={lesson.title} description={<span className="maintenance-lesson-text snapshot-lesson-text"><LessonText content={beforeChange ? lesson.before! : lesson.explanation} /></span>}
      phaseLabel={beforeChange ? 'Predict the effect' : 'Explanation'} visual={null}
      onClose={() => dispatch({ type: 'close-guided' })}>
      <Button disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}>Back</Button>
      {beforeChange ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}>Show effect</Button>
        : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === snapshotLessons.length - 1 ? 'Finish tutorial' : 'Next'}</Button>}
    </Spotlight>
  </>;
}
