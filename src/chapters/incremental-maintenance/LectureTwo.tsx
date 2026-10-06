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
import { joinChanges, joinLessons, joinReference, joinRunDefinition, joinStages, type JoinedOrder, type JoinStage, type Product } from './join-scenario';
import { joinSnapshotAt } from './join-simulation';
import type { Order } from './scenario';
import { RowDiffs } from './RowDiffs';
import '../changing-relations/lecture-one.css';
import './lecture-one.css';
import './lecture-two.css';

type JoinRow = Order | Product | JoinedOrder;
function JoinTable({ rows, stage, affectedProductId, affectedOrderIds }: {
  rows: readonly JoinRow[]; stage: typeof joinStages[number]; affectedProductId?: number; affectedOrderIds: readonly number[];
}) {
  return <Table caption={stage.title}>
    <thead><tr>{stage.id !== 'products' && <th>order_id</th>}{stage.id !== 'result' && <th>product_id</th>}
      {stage.id !== 'orders' && <th>name</th>}{stage.id !== 'products' && <th>amount</th>}</tr></thead>
    <tbody>{rows.map((row) => <tr key={'orderId' in row ? row.orderId : row.productId}
      data-affected={'productId' in row ? row.productId === affectedProductId : affectedOrderIds.includes(row.orderId)}>
      {'orderId' in row && <td>{row.orderId}</td>}{'productId' in row && <td>{row.productId}</td>}
      {'name' in row && <td title={row.name}><span className="maintenance-note-cell">{row.name}</span></td>}{'amount' in row && <td>${row.amount}</td>}
    </tr>)}<EmptyTableRows count={4 - rows.length} columns={stage.id === 'products' ? 2 : 3} /></tbody>
  </Table>;
}

export function IncrementalLectureTwo({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  const { state, dispatch } = useLectureRun(joinRunDefinition);
  const { open: helpOpen } = useWalkthrough();
  const [selectedStage, setSelectedStage] = useState<JoinStage>('orders');
  const [mobileDiffs, setMobileDiffs] = useState(false);
  const ordersRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const refs = { orders: ordersRef, products: productsRef, result: resultRef };
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  useEffect(() => { if (state.guided) setMobileDiffs(false); }, [state.guided]);
  const lesson = joinLessons[Math.min(state.step, joinLessons.length - 1)]!;
  const activeStage = state.guided ? lesson.stage : selectedStage;
  const snapshot = joinSnapshotAt(state.selectedTime);
  const rows = { orders: snapshot.orders, products: snapshot.products, result: snapshot.output };
  const diffs = { orders: snapshot.orderDiffs, products: snapshot.productDiffs, result: snapshot.outputDiffs };
  const affectedOrderIds = snapshot.outputDiffs.map(({ row }) => row.orderId);
  const beforeChange = Boolean(lesson.before) && !state.revealed;

  return <>
    <GuidedLabScreen chapter={chapter} title="Lecture 2" regionLabel="Lecture content" navigation={navigation}
      className="changing-relations-page incremental-maintenance-page join-maintenance-page" reference={joinReference} showTip="when-space"
      description="Joins: how a change on either side finds its matching rows."
      simulation={{ completed: state.guided ? state.step : state.selectedTime, total: state.guided ? joinLessons.length : joinChanges.length,
        progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: () => { setSelectedStage('orders'); setMobileDiffs(false); dispatch({ type: 'reset' }); },
        onRun: () => dispatch({ type: 'play' }), onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      workspace={<div className="relation-workspace" data-guided={state.guided}>
        <div className="relation-metrics" aria-label="Relation metrics">
          <WorkspaceMetric icon={<Database size={25} aria-hidden="true" />} label="Input rows" value={snapshot.orders.length + snapshot.products.length} />
          <WorkspaceMetric icon={<Table2 size={25} aria-hidden="true" />} label="Result rows" value={snapshot.output.length} />
          <WorkspaceMetric icon={<Clock3 size={25} aria-hidden="true" />} label={<>{relationHelp.logicalTime.label} <RelationHelp {...relationHelp.logicalTime} /></>}
            value={<span className="relation-time" data-testid="join-time">t = {state.selectedTime}</span>} />
        </div>
        <nav className="maintenance-flow join-flow" aria-label="Join inputs and result">
          {joinStages.map((stage, index) => <div key={stage.id}>
            <Button aria-pressed={activeStage === stage.id} disabled={state.guided} title={stage.sql} onClick={() => setSelectedStage(stage.id)}>
              <span>{stage.title}</span><code>{stage.sql}</code>
            </Button>
            {index === 0 && <span className="maintenance-flow-arrow join-plus" aria-hidden="true">+</span>}
            {index === 1 && <ArrowRight className="maintenance-flow-arrow" aria-hidden="true" />}
          </div>)}
        </nav>
        <div className="maintenance-panels join-panels" data-join-stage={activeStage} data-mobile-diffs={mobileDiffs} data-walkthrough="lecture-workspace">
          {joinStages.map((stage, index) => <section key={stage.id} ref={refs[stage.id]} className="relation-panel" data-active={activeStage === stage.id} aria-labelledby={`join-${stage.id}-heading`}>
            <h2 id={`join-${stage.id}-heading`}>{stage.title}<RelationHelp label={stage.title} text={stage.description} />
              <Button className="maintenance-mobile-view" aria-pressed={mobileDiffs} onClick={() => setMobileDiffs((value) => !value)}>{mobileDiffs ? 'Show rows' : 'Show changes'}</Button>
            </h2>
            <code className="join-panel-sql">{stage.sql}</code>
            {index === 0 && <span className="join-panel-connector" aria-hidden="true">+</span>}
            {index === 1 && <ArrowRight className="join-panel-connector" aria-hidden="true" />}
            <JoinTable rows={rows[stage.id]} stage={stage} affectedProductId={snapshot.affectedProductId} affectedOrderIds={affectedOrderIds} />
            <RowDiffs className="join-diffs" entries={diffs[stage.id]} label={stage.id === 'result' ? 'Result diffs' : `${stage.title} diffs`} />
          </section>)}
        </div>
        <div className="relation-playback-controls" aria-label="Change playback">
          {state.step === joinLessons.length && <span className="relation-tutorial-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
          <div>
            {state.selectedTime !== state.applied && <Button disabled={state.guided || state.playing} onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
            <Button disabled={state.guided || state.playing || state.selectedTime === 0} onClick={() => dispatch({ type: 'previous-change' })}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
            <Button data-walkthrough="next-change" disabled={state.guided || state.playing || state.selectedTime === joinChanges.length} onClick={() => dispatch({ type: 'next-change' })}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
          </div>
        </div>
      </div>} />
    <Spotlight open={state.guided} targetRef={refs[lesson.stage]} step={Math.min(state.step + 1, joinLessons.length)} total={joinLessons.length}
      title={lesson.title} description={beforeChange ? lesson.before : lesson.explanation} phaseLabel={beforeChange ? 'Predict the effect' : 'Explanation'}
      visual={null} onClose={() => dispatch({ type: 'close-guided' })}>
      <Button disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}>Back</Button>
      {beforeChange ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}>Show effect</Button>
        : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === joinLessons.length - 1 ? 'Finish tutorial' : 'Next'}</Button>}
    </Spotlight>
  </>;
}
