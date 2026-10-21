import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileInput, FileText, Table2 } from 'lucide-react';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { LessonText } from '../../components/lesson/LessonText';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import type { ChapterDefinition } from '../chapterRegistry';
import { RecordWorkspace } from './IngestionLayouts';
import { RecordPanelContent } from './RecordPanels';
import type { RecordLectureDefinition } from './record-scenarios';
import { recordsAt } from './record-simulation';
import '../../styles/lesson.css';
import '../incremental-maintenance/lecture-one.css';
import '../incremental-maintenance/lecture-two.css';
import { useGuidedFocus } from '../../components/lesson/useGuidedFocus';
import './lecture-one.css';
import './record-lectures.css';

export function RecordLecture({ chapter, navigation, definition }: {
  chapter: ChapterDefinition; navigation: ReactNode; definition: RecordLectureDefinition;
}) {
  const { state, dispatch, completed: complete } = useLectureRun({ totalChanges: definition.actions.length, steps: definition.lessons });
  const { open: helpOpen } = useWalkthrough();
  const [selectedStage, setSelectedStage] = useState('record');
  const recordRef = useRef<HTMLElement>(null);
  const changesRef = useRef<HTMLElement>(null);
  const relationRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const refs = { record: recordRef, changes: changesRef, relation: relationRef, metrics: metricsRef };
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  const lesson = definition.lessons[Math.min(state.step, definition.lessons.length - 1)]!;
  const current = recordsAt(definition, state.selectedTime);
  const pending = Boolean(lesson.before) && !state.revealed && state.guided;
  const preview = pending ? definition.actions[lesson.time - 1] : null;
  const record = preview?.kind === 'record' ? preview.record : current.record ?? current.fixture.records[0]!;
  const upcoming = pending || current.record === null;
  const focus = useGuidedFocus(`${state.guided}:${state.step}:${state.revealed}`, [lesson.stage, ...(!pending ? lesson.related ?? [] : [])], refs,
    { record: 'Incoming record', changes: 'Interpreted changes', relation: 'Current relation', metrics: 'Records and rows' });
  const activeStage = state.guided ? focus.id === 'metrics' ? lesson.stage : focus.id : selectedStage;

  return <>
    <LectureScreen layout="without-tip" chapter={chapter} title={'Lecture ' + definition.number} regionLabel="Lecture content" navigation={navigation}
      className="lesson-page changing-relations-page incremental-maintenance-page join-maintenance-page maintenance-lecture-page getting-data-in-page record-lecture-page"
      description={definition.description} reference={definition.reference}
      simulation={{ completed: state.guided ? state.step : state.selectedTime,
        total: state.guided ? definition.lessons.length : definition.actions.length,
        progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: () => { setSelectedStage('record'); dispatch({ type: 'reset' }); },
        onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      guided={state.guided}
      metrics={<div className="relation-metrics ingestion-status-bar"><div ref={metricsRef} className="ingestion-status-metrics" aria-label="Record metrics">
        <WorkspaceMetric icon={<FileInput size={25} aria-hidden="true" />}
          label={<>Records read <RelationHelp label="Records read" text="Incoming messages read within this fixture. Switching to a separate fixture resets this count and its starting catalog. Playback Changes also includes those fixture transitions." /></>}
          value={<span data-testid="records-read">{current.recordsRead}</span>} />
        <WorkspaceMetric icon={<Table2 size={25} aria-hidden="true" />}
          label={<>Table rows <RelationHelp label="Table rows" text="Row copies in the queryable product projection. Repeated events or different keys may retain separate rows for one product. An input error makes the relation unavailable, shown as — rather than zero." /></>}
          value={<span data-testid="record-table-rows">{current.relation?.length ?? '—'}</span>} />
        <WorkspaceMetric icon={<FileText size={25} aria-hidden="true" />}
          label={<>Envelope <RelationHelp label="Envelope" text="The producer contract used to interpret this fixture: NONE appends events, UPSERT retains current keyed values, and DEBEZIUM interprets explicit before/after changes. This is a status, not a live configuration selector." /></>}
          value={<span className="relation-time" data-testid="record-envelope">{current.fixture.envelope}</span>} />
      </div><span className="ingestion-checkpoint"><Clock3 size={14} aria-hidden="true" /><span data-testid="record-checkpoint">t = {state.selectedTime}</span></span></div>}
      visualization={<RecordWorkspace activeStage={activeStage} setSelectedStage={setSelectedStage}
        guided={state.guided} envelope={current.fixture.envelope} panelRefs={refs}
        renderContent={(stage) => <RecordPanelContent stage={stage} state={current} record={record}
          upcoming={upcoming} pending={pending} highlight={state.guided && state.revealed && (activeStage === stage || Boolean(lesson.related?.includes(stage)))} />} />}
      playback={<div className="relation-playback-controls" aria-label="Change playback">
        {complete && <span className="relation-tutorial-complete maintenance-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
        <div>
          {state.selectedTime !== state.applied && <Button disabled={state.guided || state.playing}
            onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
          <Button aria-keyshortcuts="ArrowLeft" disabled={state.guided || state.playing || state.selectedTime === 0}
            onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
          <Button data-walkthrough="next-change" aria-keyshortcuts="ArrowRight" disabled={state.guided || state.playing || state.selectedTime === definition.actions.length}
            onClick={() => dispatch({ type: 'next-change' })}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
        </div>
      </div>} />
    <Spotlight open={state.guided} {...focus.props} placement="above-first"
      step={Math.min(state.step + 1, definition.lessons.length)} total={definition.lessons.length}
      title={lesson.title} description={<span className="maintenance-lesson-text snapshot-lesson-text"><LessonText content={pending ? lesson.before! : lesson.explanation} /></span>}
      phaseLabel={pending ? 'Predict the effect' : 'Explanation'} visual={null}
      onClose={() => dispatch({ type: 'close-guided' })}
      navigation={{ backDisabled: state.step === 0, onBack: () => dispatch({ type: 'back' }),
        onNext: () => dispatch({ type: pending ? 'reveal' : 'next' }),
        nextLabel: pending ? 'Show effect' : state.step === definition.lessons.length - 1 ? 'Finish tutorial' : 'Next' }} />
  </>;
}
