import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Database, Table2 } from 'lucide-react';
import { ActivityCompletion } from '../../components/lab/ActivityCompletion';
import { MaintenancePanels } from './MaintenancePanels';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { GuidedLabScreen } from '../../labs/components/GuidedLabScreen';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import type { ChapterDefinition } from '../chapterRegistry';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { logicalTimestampHelp } from '../../components/lesson/logicalTimestampHelp';
import { LessonText, type LessonTextContent } from '../../components/lesson/LessonText';
import { useGuidedFocus } from '../../components/lesson/useGuidedFocus';
import '../../styles/lesson.css';
import './lecture-one.css';
import './lecture-two.css';


interface MaintenanceSnapshot { inputCount: number; output: readonly unknown[]; outputChanged?: boolean }

interface MaintenanceLectureProps<Snapshot extends MaintenanceSnapshot> {
  chapter: ChapterDefinition; navigation: ReactNode; title: string; description: string; timeTestId: string;
  definition: Parameters<typeof useLectureRun>[0];
  layout?: 'comparison';
  lessons: readonly { time: number; title: string; stage: string; related?: readonly string[]; explanation: LessonTextContent; before?: LessonTextContent }[];
  stages: readonly { id: string; title: string; shortTitle?: string; sql: string; description: string; showChanges?: boolean }[];
  reference: NonNullable<ComponentProps<typeof GuidedLabScreen>['reference']>;
  snapshot: (time: number) => Snapshot;
  renderRows: (stage: string, snapshot: Snapshot) => ReactNode;
}
export function MaintenanceLecture<Snapshot extends MaintenanceSnapshot>({ chapter, navigation, definition, lessons, stages, reference, title, description, snapshot, renderRows, timeTestId, layout }: MaintenanceLectureProps<Snapshot>) {
  const { state, dispatch, completed, finished } = useLectureRun(definition);
  const { open: helpOpen } = useWalkthrough();
  const [selectedStage, setSelectedStage] = useState<string>(stages[0]!.id);
  const [mobileDiffs, setMobileDiffs] = useState(false);
  const ordersRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const refs = { [stages[0]!.id]: ordersRef, [stages[1]!.id]: productsRef, [stages[2]!.id]: resultRef, metrics: metricsRef };
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  useEffect(() => { if (state.guided) setMobileDiffs(false); }, [state.guided]);
  const lesson = lessons[Math.min(state.step, lessons.length - 1)]!;
  const current = snapshot(state.selectedTime);
  const beforeChange = Boolean(lesson.before) && !state.revealed;
  const focus = useGuidedFocus(`${state.guided}:${state.step}:${state.revealed}`,
    [lesson.stage, ...(!beforeChange ? lesson.related ?? [] : [])], refs,
    Object.fromEntries([...stages.map(stage => [stage.id, stage.title]), ['metrics', 'Row counts']]), ['metrics']);
  const activeStage = state.guided ? focus.id === 'metrics' ? lesson.stage : focus.id : selectedStage;

  return <>
    <LectureScreen activityCompleted={completed} layout="without-tip" chapter={chapter} title={title} regionLabel="Lecture content" navigation={navigation}
      className={`lesson-page changing-relations-page incremental-maintenance-page join-maintenance-page maintenance-lecture-page${layout === 'comparison' ? ' maintenance-comparison-lecture' : ''}`} reference={reference}
      description={description}
      simulation={{ completed: state.guided ? state.step : state.selectedTime, total: state.guided ? lessons.length : definition.totalChanges,
        progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: () => { setSelectedStage(stages[0]!.id); setMobileDiffs(false); dispatch({ type: 'reset' }); },
        onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      guided={state.guided} metrics={layout !== 'comparison' && <div ref={metricsRef} className="relation-metrics" aria-label="Relation metrics">
          <WorkspaceMetric icon={<Database size={25} aria-hidden="true" />} label={<>Input rows <RelationHelp label="Input rows" text="The number of rows currently present in the input table or tables. Each row counts once; identical rows in the input are still separate copies." /></>} value={current.inputCount} />
          <WorkspaceMetric icon={<Table2 size={25} aria-hidden="true" />} label={<>Result rows <RelationHelp label="Result rows" text="The number of rows currently shown in the query result. Joins produce a row for each matching input-row combination; aggregations produce one row per group." /></>} value={current.output.length} />
          <WorkspaceMetric icon={<Clock3 size={25} aria-hidden="true" />} label={<>{logicalTimestampHelp.label} <RelationHelp {...logicalTimestampHelp} /></>}
            value={<span className="relation-time" data-testid={timeTestId}>t = {state.selectedTime}</span>} />
        </div>}
      visualization={<MaintenancePanels stages={stages} layout={layout} activeStage={activeStage} setSelectedStage={setSelectedStage}
          mobileDiffs={mobileDiffs} setMobileDiffs={setMobileDiffs} guided={state.guided} time={state.selectedTime}
          timeTestId={timeTestId} beforeChange={beforeChange} outputChanged={current.outputChanged}
          panelRefs={refs} renderRows={(stage) => renderRows(stage, current)} />}
      playback={
        <div className="relation-playback-controls" aria-label="Change playback">
          <ActivityCompletion complete={finished} kind="tutorial" className="maintenance-complete" />
          <div>
            {state.selectedTime !== state.applied && <Button disabled={state.guided || state.playing} onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
            <Button aria-keyshortcuts="ArrowLeft" disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
            <Button data-walkthrough="next-change" aria-keyshortcuts="ArrowRight" disabled={state.guided || state.playing || state.selectedTime === definition.totalChanges} onClick={() => dispatch({ type: 'next-change' })}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
          </div>
        </div>
      } />
    <Spotlight open={state.guided} {...focus.props} step={Math.min(state.step + 1, lessons.length)} total={lessons.length}
      title={lesson.title} description={<span className="maintenance-lesson-text"><LessonText content={beforeChange ? lesson.before! : lesson.explanation} /></span>} phaseLabel={beforeChange ? 'Predict the effect' : 'Explanation'}
      visual={null} onClose={() => dispatch({ type: 'close-guided' })}
      navigation={{ backDisabled: state.step === 0, onBack: () => dispatch({ type: 'back' }),
        onNext: () => dispatch({ type: beforeChange ? 'reveal' : 'next' }),
        nextLabel: beforeChange ? 'Show effect' : state.step === lessons.length - 1 ? 'Finish tutorial' : 'Next' }} />
  </>;
}
