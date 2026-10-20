import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Database, Table2 } from 'lucide-react';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { LessonText } from '../../components/lesson/LessonText';
import { useGuidedFocus } from '../../components/lesson/useGuidedFocus';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import type { ChapterDefinition } from '../chapterRegistry';
import type { TemporalLectureDefinition } from './scenarios';
import { formatTemporalTime, temporalSnapshotAt } from './simulation';
import { TemporalWorkspace, type TemporalStage } from './TemporalWorkspace';
import '../../styles/lesson.css';
import './temporal.css';

export function TemporalLecture({ chapter, definition, navigation }: { chapter: ChapterDefinition; definition: TemporalLectureDefinition; navigation: ReactNode }) {
  const { state, dispatch } = useLectureRun({ totalChanges: definition.actions.length, steps: definition.lessons });
  const { open: helpOpen } = useWalkthrough();
  const [selectedStage, setSelectedStage] = useState<TemporalStage>('timeline');
  const timelineRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const logicalClockRef = useRef<HTMLSpanElement>(null);
  const diffRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const refs = { timeline: timelineRef, source: sourceRef, result: resultRef, clock: logicalClockRef, clocks: clockRef, metrics: metricsRef };
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  const lesson = definition.lessons[Math.min(state.step, definition.lessons.length - 1)]!;
  const pending = state.guided && Boolean(lesson.before) && !state.revealed;
  const current = temporalSnapshotAt(state.selectedTime, definition.fixture, definition.actions);
  const primary = pending ? lesson.predictionStage ?? lesson.stage : lesson.focus === 'clock' ? lesson.view === 'clocks' ? 'clocks' : 'clock' : lesson.stage;
  const focus = useGuidedFocus(`${state.guided}:${state.step}:${state.revealed}`, [primary, ...(!pending ? lesson.related ?? [] : [])], refs,
    { timeline: 'Row lifetimes', source: 'Source events', result: 'Current result', clock: 'Logical time', clocks: 'Clock samples', metrics: 'Source and result counts' });
  const activeStage = state.guided ? focus.id === 'source' || focus.id === 'result' || focus.id === 'timeline' ? focus.id : lesson.stage : selectedStage;
  const upcoming = pending ? definition.actions[lesson.time - 1] : undefined;
  const complete = state.step === definition.lessons.length;

  return <>
    <LectureScreen layout="without-tip" chapter={chapter} title={'Lecture ' + definition.number} description={definition.description}
      regionLabel="Lecture content" navigation={navigation}
      className="lesson-page changing-relations-page incremental-maintenance-page join-maintenance-page maintenance-lecture-page temporal-lecture-page" reference={definition.reference}
      simulation={{ completed: state.guided ? state.step : state.selectedTime, total: state.guided ? definition.lessons.length : definition.actions.length,
        progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: () => { setSelectedStage('timeline'); dispatch({ type: 'reset' }); },
        onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }} guided={state.guided}
      metrics={<div ref={metricsRef} className="relation-metrics temporal-status-bar" aria-label="Temporal metrics">
        <WorkspaceMetric icon={<Database size={17} aria-hidden="true" />} label={<>Source rows<RelationHelp label="Source rows" text="Row copies currently present in this fixture's input. Time-driven expiration does not delete them." /></>} value={<span data-testid="temporal-source-count">{current.sourceRows.length}</span>} />
        <WorkspaceMetric icon={<Table2 size={17} aria-hidden="true" />} label={<>Result rows<RelationHelp label="Result rows" text="Row copies passing the current temporal predicate at the displayed logical time." /></>} value={<span data-testid="temporal-result-count">{current.resultRows.length}</span>} />
        <WorkspaceMetric icon={<Clock3 size={17} aria-hidden="true" />} label={<>Current logical time<RelationHelp label="Current logical time" text="Milliseconds expressed as seconds after 2026-01-01 12:00:00 UTC. This is the logical time of the displayed state, not the numbered playback step. Changes includes input changes, clock advances, and explicit comparison-fixture resets." /></>} value={<span ref={logicalClockRef} className="relation-time" data-testid="temporal-logical-time">{formatTemporalTime(current.logicalTimeMs)}</span>} />
      </div>}
      visualization={<TemporalWorkspace state={current} activeStage={activeStage} onSelectStage={setSelectedStage} guided={state.guided}
        highlight={state.guided && state.revealed} highlightStages={lesson.related?.filter((id): id is TemporalStage => id === 'source' || id === 'result' || id === 'timeline')}
        refs={refs} clockRef={clockRef} diffRef={diffRef}
        hasClocks={definition.number === 1} upcoming={upcoming} initial={state.selectedTime === 0} />}
      playback={<div className="relation-playback-controls" aria-label="Change playback">
        {complete && <span className="relation-tutorial-complete maintenance-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
        <div>{state.selectedTime !== state.applied && <Button disabled={state.guided || state.playing} onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
          <Button disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
          <Button data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === definition.actions.length} onClick={() => dispatch({ type: 'next-change' })}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
        </div>
      </div>} />
    <Spotlight open={state.guided} {...focus.props} placement="above-first" step={Math.min(state.step + 1, definition.lessons.length)} total={definition.lessons.length}
      title={lesson.title} description={<span className="temporal-lesson-text"><LessonText content={pending ? lesson.before! : lesson.explanation} /></span>}
      phaseLabel={pending ? 'Predict the effect' : 'Explanation'} visual={null} onClose={() => dispatch({ type: 'close-guided' })}
      navigation={{ backDisabled: state.step === 0, onBack: () => dispatch({ type: 'back' }),
        onNext: () => dispatch({ type: pending ? 'reveal' : 'next' }),
        nextLabel: pending ? 'Show effect' : state.step === definition.lessons.length - 1 ? 'Finish tutorial' : 'Next' }} />
  </>;
}
