import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Database, Table2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { Table } from '../../components/ui/Table';
import { EmptyTableRows } from '../../components/ui/EmptyTableRows';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { GuidedLabScreen } from '../../labs/components/GuidedLabScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import type { ChapterDefinition } from '../chapterRegistry';
import { RelationHelp } from '../changing-relations/RelationHelp';
import { relationHelp } from '../changing-relations/scenario';
import { changes, lessons, lectureReference, runDefinition, stages, type Order, type OutputRow, type StageId } from './scenario';
import { RowDiffs } from './RowDiffs';
import { snapshotAt } from './simulation';
import '../changing-relations/lecture-one.css';
import './lecture-one.css';

function OrderTable({ rows, caption }: { rows: readonly Order[] | readonly OutputRow[]; caption: string }) {
  const fullRows = caption !== 'Maintained output';
  return <Table caption={caption}>
    {fullRows && <colgroup><col style={{ width: '25%' }} /><col style={{ width: '29%' }} /><col style={{ width: '22%' }} /><col style={{ width: '24%' }} /></colgroup>}
    <thead><tr><th>order_id</th>{fullRows && <th>product_id</th>}<th>amount</th>{fullRows && <th>note</th>}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.orderId}>
      <td>{row.orderId}</td>{'productId' in row && <td>{String(row.productId)}</td>}<td>${row.amount}</td>
      {'note' in row && <td title={String(row.note)}><span className="maintenance-note-cell">{String(row.note).replace(' delivery', '')}</span></td>}
    </tr>)}<EmptyTableRows count={3 - rows.length} columns={fullRows ? 4 : 2} /></tbody>
  </Table>;
}

export function IncrementalLectureOne({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  const { state, dispatch } = useLectureRun(runDefinition);
  const { open: helpOpen } = useWalkthrough();
  const [selectedStage, setSelectedStage] = useState<StageId>('source');
  const [mobileDiffs, setMobileDiffs] = useState(false);
  const sourceRef = useRef<HTMLElement>(null);
  const filterRef = useRef<HTMLElement>(null);
  const projectionRef = useRef<HTMLElement>(null);
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  useEffect(() => { if (state.guided) setMobileDiffs(false); }, [state.guided]);
  const lesson = lessons[Math.min(state.step, lessons.length - 1)]!;
  const activeStage = state.guided ? lesson.stage : selectedStage;
  const targetRef = lesson.stage === 'source' ? sourceRef : lesson.stage === 'filter' ? filterRef : projectionRef;
  const snapshot = snapshotAt(state.selectedTime);
  const beforeChange = Boolean(lesson.before) && !state.revealed;
  const complete = state.step === lessons.length;
  const reset = () => { setSelectedStage('source'); setMobileDiffs(false); dispatch({ type: 'reset' }); };
  const mobileViewControl = <Button className="maintenance-mobile-view" aria-pressed={mobileDiffs}
    onClick={() => setMobileDiffs((value) => !value)}>{mobileDiffs ? 'Show rows' : 'Show changes'}</Button>;

  return <>
    <GuidedLabScreen chapter={chapter} title="Lecture 1" regionLabel="Lecture content" navigation={navigation}
      className="changing-relations-page incremental-maintenance-page" reference={lectureReference} showTip="when-space"
      description="Filters and projections: trace an order change through WHERE and SELECT."
      simulation={{ completed: state.guided ? state.step : state.selectedTime, total: state.guided ? lessons.length : changes.length,
        progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: reset, onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      workspace={<div className="relation-workspace" data-guided={state.guided}>
        <div className="relation-metrics" aria-label="Relation metrics">
          <WorkspaceMetric icon={<Database size={25} aria-hidden="true" />} label="Input rows" value={snapshot.source.length} />
          <WorkspaceMetric icon={<Table2 size={25} aria-hidden="true" />} label="Result rows" value={snapshot.output.length} />
          <WorkspaceMetric icon={<Clock3 size={25} aria-hidden="true" />} label={<>{relationHelp.logicalTime.label} <RelationHelp {...relationHelp.logicalTime} /></>}
            value={<span className="relation-time" data-testid="maintenance-time">t = {state.selectedTime}</span>} />
        </div>
        <nav className="maintenance-flow" aria-label="Query stages">
          {stages.map((stage, index) => <div key={stage.id}>
            <Button aria-pressed={activeStage === stage.id} disabled={state.guided} onClick={() => setSelectedStage(stage.id)}>
              <span>{index + 1}. {stage.title}</span><code>{stage.sql}</code>
            </Button>
            {index < stages.length - 1 && <ArrowRight className="maintenance-flow-arrow" aria-hidden="true" />}
          </div>)}
        </nav>
        <div className="maintenance-panels" data-selected-stage={activeStage} data-mobile-diffs={mobileDiffs} data-walkthrough="lecture-workspace">
          <section ref={sourceRef} className="relation-panel" data-active={activeStage === 'source'} aria-labelledby="maintenance-source-heading">
            <h2 id="maintenance-source-heading">Orders <RelationHelp label="Orders" text={stages[0].description} />{mobileViewControl}</h2>
            <OrderTable rows={snapshot.source} caption="Input orders" />
            <RowDiffs entries={snapshot.sourceDiffs} label="Input diffs" />
          </section>
          <section ref={filterRef} className="relation-panel" data-active={activeStage === 'filter'} aria-labelledby="maintenance-filter-heading">
            <h2 id="maintenance-filter-heading">Filter <RelationHelp label="Filter" text={stages[1].description} />{mobileViewControl}</h2>
            <OrderTable rows={snapshot.filtered} caption="Filtered orders" />
            <RowDiffs entries={snapshot.filterDiffs} label="Diffs passing the filter" />
          </section>
          <section ref={projectionRef} className="relation-panel" data-active={activeStage === 'projection'} aria-labelledby="maintenance-output-heading">
            <h2 id="maintenance-output-heading">Projection <RelationHelp label="Projection" text={stages[2].description} />{mobileViewControl}</h2>
            <OrderTable rows={snapshot.output} caption="Maintained output" />
            <div className="maintenance-output-diffs">
              <RowDiffs entries={snapshot.projectedDiffs} label="Before consolidation" />
              <RowDiffs entries={snapshot.outputDiffs} label="Net output diffs"
                emptyReason={snapshot.projectedDiffs.length > 0 && snapshot.outputDiffs.length === 0 ? 'note excluded' : undefined} />
            </div>
          </section>
        </div>
        <div className="relation-playback-controls" aria-label="Change playback">
          {complete && <span className="relation-tutorial-complete maintenance-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
          <div>
            {state.selectedTime !== state.applied && <Button disabled={state.guided || state.playing} onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
            <Button disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
            <Button data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === changes.length} onClick={() => dispatch({ type: 'next-change' })}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
          </div>
        </div>
      </div>} />
    <Spotlight open={state.guided} targetRef={targetRef} step={Math.min(state.step + 1, lessons.length)} total={lessons.length}
      title={lesson.title} description={beforeChange ? lesson.before : lesson.explanation} phaseLabel={beforeChange ? 'Predict the effect' : 'Explanation'}
      visual={null} onClose={() => dispatch({ type: 'close-guided' })}>
      <Button disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}>Back</Button>
      {beforeChange ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}>Show effect</Button>
        : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === lessons.length - 1 ? 'Finish tutorial' : 'Next'}</Button>}
    </Spotlight>
  </>;
}
