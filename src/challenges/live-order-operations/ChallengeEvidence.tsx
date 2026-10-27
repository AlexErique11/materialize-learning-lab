import { useId, type ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Database, Radio, Workflow } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { PanelHeader } from '../../components/ui/PanelHeader';
import { Table } from '../../components/ui/Table';
import { TimestampTrays } from '../../chapters/live-applications-subscribe/TimestampTrays';
import { applySubscription, type ResultRow } from '../../chapters/live-applications-subscribe/simulation';
import { ReadableWindow } from '../../chapters/consistent-reads/ReadableWindow';
import { applyRead } from '../../chapters/consistent-reads/simulation';
import { incidentRules, STAGE_IDS, type Answers, type StageId } from './scenario';
import type { ChallengeRun, RunAction } from './run';
import { boundedRead, clientAt, clientPreview, correctQuery, correctSource, events, formatTime, producerHistory, progressState, queryConfiguration, querySql, readFixture, runOrders, stateCost, type Order, type ResultDiff } from './simulation';
import '../../chapters/live-applications-subscribe/chapter.css';
import '../../chapters/consistent-reads/chapter.css';

export function EvidenceCard({ title, children, icon = <Database size={17} />, trailing }: { title: string; children: ReactNode; icon?: ReactNode; trailing?: ReactNode }) {
  const id = useId();
  return <Panel className="relation-panel capstone-card" aria-labelledby={id}><PanelHeader title={title} titleId={id} icon={icon} trailing={trailing} /><div className="capstone-card-body">{children}</div></Panel>;
}
export function TotalsTable({ rows, caption = 'Regional order totals' }: { rows: readonly ResultRow[]; caption?: string }) {
  return <Table caption={caption}><thead><tr><th scope="col">Region</th><th scope="col">Orders</th><th scope="col">Total</th></tr></thead><tbody>
    {rows.map((row, index) => <tr key={`${row.region}-${row.orders}-${row.total}-${index}`}><th scope="row">{row.region}</th><td>{row.orders}</td><td>{row.total}</td></tr>)}
    {!rows.length && <tr><td colSpan={3}>No result rows</td></tr>}
  </tbody></Table>;
}
function OrdersTable({ rows }: { rows: readonly Order[] }) {
  return <Table caption="Source order versions"><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col">Amount</th><th scope="col">Event time</th></tr></thead><tbody>
    {rows.map((row, index) => <tr key={`${row.orderId}-${index}`}><th scope="row">{row.orderId}</th><td>{row.customerId}</td><td>{row.status}</td><td>{row.amount}</td><td>{row.eventAt / 1000} s</td></tr>)}
    {!rows.length && <tr><td colSpan={5}>No decoded rows</td></tr>}
  </tbody></Table>;
}
function DiffsTable({ changes }: { changes: readonly ResultDiff[] }) {
  return <Table caption="Signed full-result changes"><thead><tr><th scope="col">Diff</th><th scope="col">Region</th><th scope="col">Orders</th><th scope="col">Total</th></tr></thead><tbody>{changes.map((change, index) => <tr key={index}><th scope="row"><span className="capstone-diff" data-negative={change.diff < 0}>{change.diff > 0 ? '+' : '−'}{Math.abs(change.diff)}</span></th><td>{change.row.region}</td><td>{change.row.orders}</td><td>{change.row.total}</td></tr>)}{!changes.length && <tr><td colSpan={4}>No output change at this timestamp</td></tr>}</tbody></Table>;
}

function FeedEvidence({ answers, preview }: { answers: Answers; preview: boolean }) {
  const source = preview ? { envelope: answers.envelope || 'NONE', key: answers.key || 'order_id' } : { envelope: 'NONE', key: 'order_id' };
  const snapshot = runOrders(source, correctQuery)[0]!;
  return <>
    <EvidenceCard title="Producer contract"><p>Kafka sends the latest full order value. The key is a stable <code>order_id</code>. These are successive versions, not before/after messages.</p><Table caption="Retained Kafka message log"><thead><tr><th scope="col">Key</th><th scope="col">Customer</th><th scope="col">Amount</th></tr></thead><tbody>{producerHistory.map((row, index) => <tr key={index}><th scope="row">{row.orderId}</th><td>{row.customerId}</td><td>{row.amount}</td></tr>)}</tbody></Table></EvidenceCard>
    <EvidenceCard title={preview ? 'Consequence preview' : 'Current source and dashboard'} trailing={<span className="capstone-tag" data-tone={source.envelope === 'UPSERT' && source.key === 'order_id' ? 'success' : 'warning'}>{preview ? 'Sandbox replay' : 'Overcounted'}</span>}>
      {source.envelope === 'DEBEZIUM' && <p className="capstone-notice" data-tone="danger">This log has no before/after envelope. No rows can be decoded under that contract.</p>}
      <OrdersTable rows={snapshot.orders} /><TotalsTable rows={snapshot.rows} />
      <p className="capstone-caption">Testing replays retained messages into a fresh simulated source. It does not change a live table’s envelope.</p>
    </EvidenceCard>
    <details className="capstone-inspector"><summary>Inspect the customer source</summary><p>Native PostgreSQL source; initial snapshot complete. Customer 1 → EU; customer 2 → US. One current row per customer. Kafka envelope choices do not configure this connector.</p></details>
  </>;
}

function ObjectsEvidence({ answers, preview }: { answers: Answers; preview: boolean }) {
  const cost = stateCost(answers);
  const final = answers.final === 'materialized';
  return <>
    <EvidenceCard title="Object and cluster map" icon={<Workflow size={17} />}>
      <div className="capstone-object-flow"><div><Database size={20} /><strong>Orders + Customers</strong><span>Source-backed tables</span></div><ArrowRight aria-hidden="true" /><div><strong>Recent orders</strong><span>{answers.helper === 'materialized' ? 'Materialized helper · 4 units' : answers.helper === 'view' ? 'Regular helper view · 0 units' : 'Choose the helper object'}</span></div><ArrowRight aria-hidden="true" /><div><strong>Regional totals</strong><span>{answers.final ? final ? 'Durable result · transform cluster' : 'Saved SQL only' : 'Choose the final object'}</span></div></div>
      <div className="capstone-serving-grid">{['operations', 'support'].map(cluster => <div key={cluster}><strong>{cluster}</strong><span>{answers.indexes === 'both' || answers.indexes === cluster ? 'Local index on regional totals' : 'No local index'}</span><span>{final ? 'Can read shared durable output' : 'No shared durable final output'}</span></div>)}</div>
    </EvidenceCard>
    <EvidenceCard title="State budget" icon={<Database size={17} />} trailing={<strong className="capstone-budget" data-over={cost > 8}>{cost} / 8 units</strong>}>
      <p>Regular view: 0 · materialized result: 4 · each index: 2.</p><p className="capstone-caption">Illustrative teaching units, not measured memory or pricing. Source storage and cluster base costs are outside this model.</p>
      {preview && <p className="capstone-notice" data-tone={cost <= 8 && final && answers.indexes === 'both' ? 'success' : 'warning'}>{cost > 8 ? 'The design exceeds the budget.' : !final ? 'The final result is not durably maintained for sharing.' : answers.indexes !== 'both' ? 'At least one serving cluster lacks its required local index.' : 'One maintained transformation serves both independently scaled clusters.'}</p>}
    </EvidenceCard>
  </>;
}

function QueryEvidence({ answers, preview, index, dispatch }: { answers: Answers; preview: boolean; index: number; dispatch: (action: RunAction) => void }) {
  const trace = runOrders(correctSource, preview ? queryConfiguration(answers) : correctQuery);
  const snapshot = trace[index]!;
  const event = events[index]!;
  return <>
    <EvidenceCard title="Your query draft"><pre className="capstone-sql"><code>{querySql(answers)}</code></pre><p className="capstone-caption">Your clause choices update this preview. SQL is not executed. The arrival-time alternative uses fixture metadata, not an order business column.</p></EvidenceCard>
    <EvidenceCard title="Event timeline" icon={<Clock3 size={17} />} trailing={<strong>{formatTime(snapshot.time)}</strong>}>
      <div className="capstone-event-picker" role="group" aria-label="Inspect scenario events">{events.slice(0, 8).map((event, eventIndex) => <button key={event.time} type="button" aria-pressed={index === eventIndex} onClick={() => dispatch({ type: 'event', index: eventIndex })}>{event.time / 1000} s</button>)}</div>
      <p><strong>{event.label}</strong></p><OrdersTable rows={snapshot.orders} />
      <p className="capstone-caption">Event timestamps and logical application time use seconds from one fixed fixture origin. A clock-only event sends no source record.</p>
    </EvidenceCard>
    <EvidenceCard title={preview ? 'Query consequence preview' : 'What must the query do?'}>
      {preview ? <><TotalsTable rows={snapshot.rows} /><DiffsTable changes={snapshot.diffs} /></> : <p>Inspect the events before predicting the result. Test your repair to reveal how your chosen predicate handles each event. Orders expire at event time + 300 seconds; their source rows remain.</p>}
      <p className="capstone-caption">The 601 s amount correction updates one contribution. The 610 s clock event removes the last US order; the 620 s clock event expires 104 and admits 106.</p>
    </EvidenceCard>
  </>;
}

function ProgressEvidence({ preview, accepted }: { preview: boolean; accepted: boolean }) {
  const state = progressState(preview && accepted);
  const customerTime = state.customers;
  const lanes = [{ name: 'Orders input', time: state.orders }, { name: 'Customers input', time: customerTime }, { name: 'Regional aggregate', time: state.aggregate }, { name: 'Serving index', time: state.serving }];
  return <>
    <div className="capstone-metrics"><div><Clock3 size={18} /><span>Frontier lag</span><strong>{formatTime(state.clock - state.serving)}</strong></div><div><Radio size={18} /><span>Serving duration</span><strong>{state.queryMs} ms</strong></div></div>
    <EvidenceCard title="Where progress stops" icon={<Workflow size={17} />}>
      <div className="capstone-lanes" role="img" aria-label={`At wall time 630.000 seconds: orders frontier 630.001, customers ${customerTime / 1000}, aggregate 623, serving index 623 seconds. Completeness is strictly below each frontier.`}>
        <div className="capstone-lane-axis"><span>620 s</span><span>631 s</span></div>
        {lanes.map((lane, index) => <div className="capstone-lane" key={lane.name} data-warning={index === 1 && !accepted}><span>{lane.name}</span><div><i style={{ width: `${(lane.time - 620000) / 110}%` }} /></div><strong>{formatTime(lane.time)}</strong></div>)}
      </div>
      <p className="capstone-notice" data-tone={preview && accepted ? 'success' : 'warning'}>{preview && accepted ? 'Customer connection resumed. Input progress permits catch-up; aggregate and serving output still await processing.' : 'Connection log: customer connection paused at 623.000 s. Its progress reports stopped.'}</p>
      <p className="capstone-caption">Wall clock: 630.000 s. Output changes are complete strictly below its frontier. A fast query response does not establish recent data.</p>
    </EvidenceCard>
  </>;
}

function ReadsEvidence({ run, dispatch }: { run: ChallengeRun; dispatch: (action: RunAction) => void }) {
  const step = run.exploration.readStep;
  const caughtUp = step >= 2;
  const fixture = step === 1 ? applyRead(readFixture(), { type: 'request', request: { policy: 'bounded', bound: incidentRules.normalAgeMs } })
    : step >= 3 ? applyRead(readFixture(true), { type: 'request', request: { policy: 'bounded', bound: incidentRules.normalAgeMs } }) : readFixture(caughtUp);
  const fallback = boundedRead(incidentRules.fallbackAgeMs);
  return <>
    <EvidenceCard title="Readable-time intersection" icon={<Clock3 size={17} />}>
      <ReadableWindow snapshot={fixture} assessment caption="A shared read uses one retained, complete logical moment across the aggregate index and orders input." />
      <p className="capstone-caption">Retained bounds are supplied fixture assumptions, not default retention settings. Logical times are milliseconds displayed as seconds.</p>
    </EvidenceCard>
    <EvidenceCard title="Test, catch up, then read again">
      <ol className="capstone-read-steps"><li data-done={step >= 1}>Test normal three-second policy</li><li data-done={step >= 2}>Finish aggregate and serving catch-up</li><li data-done={step >= 3}>Issue a new three-second read</li></ol>
      {step >= 1 && <p className="capstone-notice" data-tone="warning">The initial normal request failed its age bound. The authorized fallback can read {formatTime(fallback.timestamp)}, aged {formatTime(fallback.age!)}. The original failed request remains failed.</p>}
      {step >= 3 && <p className="capstone-notice" data-tone="success">New request available at 630.000 s. Aggregate and serving frontier: 630.001 s. Normal bound restored.</p>}
      <Button onClick={() => dispatch({ type: 'read-next' })} disabled={step === 3}>{['Test normal policy', 'Finish catch-up', 'Issue new normal read', 'Catch-up verified'][step]}</Button>
    </EvidenceCard>
    <details className="capstone-inspector"><summary>Compare strict reads and external writes</summary><p>A fixture-assigned strict target of 630.000 s waits while the aggregate frontier is 623.000 s. Serializable alone does not impose a maximum age.</p><p>What if an upstream cancellation has not yet been sent to Kafka? No read of the ingested relation can guarantee seeing it. This separate thought experiment does not change the incident’s orders.</p></details>
  </>;
}

function ClientEvidence({ run, answers, preview, dispatch }: { run: ChallengeRun; answers: Answers; preview: boolean; dispatch: (action: RunAction) => void }) {
  const deliveries = run.exploration.deliveries;
  const initial = clientAt(deliveries);
  const state = run.exploration.disconnected ? applySubscription(initial, { type: 'disconnect' }) : initial;
  return <>
    <EvidenceCard title="Delivery inspector" icon={<Radio size={17} />} trailing={<span>{deliveries} / 8 deliveries</span>}>
      <p>Inspect the reference client’s timestamp trays. At 632.000 s, the EU retraction and replacement arrive separately. Choose the rule your repaired client should follow.</p>
      <div className="capstone-delivery-controls"><Button onClick={() => dispatch({ type: 'delivery-next' })} disabled={deliveries === 8 || state.connected === false}>Next delivery</Button><Button onClick={() => dispatch({ type: 'delivery-reset' })}>Replay deliveries</Button><Button variant="ghost" onClick={() => dispatch({ type: 'disconnect' })} disabled={!state.connected}>Disconnect probe</Button></div>
      <TimestampTrays state={state} />
      <p className="capstone-caption">Tray labels use integer milliseconds. P(632001) means progress at 632.001 s. Replay starts a named fresh connection; disconnect preserves the last published display as stale.</p>
    </EvidenceCard>
    {preview && <EvidenceCard title="Your client’s consequence preview"><TotalsTable rows={clientPreview(answers, deliveries)} caption="Proposed client output" /><p className="capstone-caption">This preview applies your baseline, signed-change, and publication choices to the same deliveries. A missing baseline is not a valid empty dashboard.</p>{answers.snapshot === 'off' && <p className="capstone-notice" data-tone="warning">No coordinated initial baseline. A correct current table cannot be reconstructed.</p>}</EvidenceCard>}
  </>;
}

export function ChallengeEvidence({ run, preview, accepted, dispatch }: { run: ChallengeRun; preview: boolean; accepted: boolean; dispatch: (action: RunAction) => void }) {
  const id: StageId = STAGE_IDS[run.stage]!;
  const answers = run.drafts[id] ?? {};
  return <div className="capstone-evidence-content">{id === 'feed' ? <FeedEvidence answers={answers} preview={preview} />
    : id === 'objects' ? <ObjectsEvidence answers={answers} preview={preview} />
      : id === 'query' ? <QueryEvidence answers={answers} preview={preview} index={run.exploration.event} dispatch={dispatch} />
        : id === 'progress' ? <ProgressEvidence preview={preview} accepted={accepted} />
          : id === 'reads' ? <ReadsEvidence run={run} dispatch={dispatch} /> : <ClientEvidence run={run} answers={answers} preview={preview} dispatch={dispatch} />}</div>;
}

export function PipelineStrip({ verified = 0 }: { verified?: number }) {
  const groups = [{ title: 'Sources', icon: Database, needed: 1 }, { title: 'Maintained result', icon: Workflow, needed: 3 }, { title: 'Serving', icon: Clock3, needed: 5 }, { title: 'Live client', icon: Radio, needed: 6 }];
  return <ol className="capstone-pipeline" aria-label="System verification">{groups.map(({ title, icon: Icon, needed }) => <li key={title} data-verified={verified >= needed}><Icon size={20} aria-hidden="true" /><div><strong>{title}</strong><span>{verified >= needed ? 'Verified' : 'Not yet verified'}</span></div>{verified >= needed ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={15} aria-hidden="true" />}</li>)}</ol>;
}
