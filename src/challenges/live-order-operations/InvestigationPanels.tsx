import { Activity, ArrowRight, Clock3, Pin, Radio } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { ReadableWindow } from '../../chapters/consistent-reads/ReadableWindow';
import { TimestampTrays } from '../../chapters/live-applications-subscribe/TimestampTrays';
import { EvidenceCard, OrdersTable, TotalsTable } from './ChallengeEvidence';
import { clientState, frontiers, objectCost, ordersAt, readWindow, requestRead, rowsAt, streamFor, type TraceFrame } from './incident';
import { displayedRows } from './grading';
import { events, formatTime, producerHistory } from './simulation';
import type { ChallengeRun, RunAction } from './run';
import '../../chapters/consistent-reads/chapter.css';
import '../../chapters/live-applications-subscribe/chapter.css';

interface Props { run: ChallengeRun; trace: readonly TraceFrame[] | null; dispatch: (action: RunAction) => void; pin: (label: string, detail: string, time: number) => void }
export function DashboardPanel({ run, trace, dispatch, pin }: Props) {
  const f = frontiers(run.config, run.time, run.processed);
  const time = f.output - 1;
  const rows = trace ? displayedRows(trace, run.time, run.processed, run.config.connected) : [];
  const app = trace ? clientState(trace, run.config, run.deliveries) : null;
  return <>
    <div className="incident-metrics">
      <div><Clock3 size={22} aria-hidden="true" /><div><span>Incident time</span><strong data-motion-value>{formatTime(run.time)}</strong></div></div>
      <div><Activity size={22} aria-hidden="true" /><div><span>Last complete snapshot age</span><strong data-motion-value>{formatTime(run.time - time)}</strong></div></div>
      <div><Radio size={22} aria-hidden="true" /><div><span>Serving duration · illustrative</span><strong>40 ms</strong></div></div>
    </div>
    <div className="incident-grid">
      <EvidenceCard title="Operations dashboard" trailing={<span className="incident-tag">{run.time - time > 3000 ? 'Last complete result · outside normal age bound' : 'Complete snapshot'}</span>}>
        {trace ? <TotalsTable rows={rows} /> : <p>Preparing the query results…</p>}
        <p>Snapshot: {formatTime(time)} · wall clock: {formatTime(run.time)}. Snapshot age concerns logical time; it cannot establish that unsent external changes have arrived.</p>
        <Button disabled={!trace} onClick={() => pin('Operations dashboard', `Complete snapshot ${formatTime(time)}; wall ${formatTime(run.time)}; rows ${JSON.stringify(rows)}; connection ${run.config.connected ? 'running' : 'paused'}.`, time)}><Pin size={14} aria-hidden="true" />Pin observation</Button>
      </EvidenceCard>
      <EvidenceCard title="User-visible application">
        {app ? <TotalsTable rows={app.published.map(item => item.row)} caption="Visible application totals" /> : <p>Preparing the application replay…</p>}
        <p>{app?.ready ? `Published through the current client policy. ${run.deliveries} deliveries observed.` : 'Waiting for a coordinated baseline. An empty client is not an empty business result.'}</p>
        <Button onClick={() => dispatch({ type: 'workspace', workspace: 'Client' })}>Inspect application deliveries<ArrowRight size={14} aria-hidden="true" /></Button>
      </EvidenceCard>
    </div>
    <EvidenceCard title="Incident replay" icon={<Clock3 size={17} aria-hidden="true" />}>
      <p>The live incident opens at 630 seconds. Advancing processes the next system event; it does not choose or apply a repair. Historical SQL snapshots are independent of this live clock.</p>
      <div className="incident-actions"><Button data-incident-action="advance" onClick={() => dispatch({ type: 'advance' })} disabled={run.time >= 632000 && (!run.config.connected || run.processed)}>Next event<ArrowRight size={14} aria-hidden="true" /></Button><span className="incident-caption">{run.config.connected && !run.processed ? 'Input progress is permitted; computation has work pending.' : run.time >= 632000 ? 'Price correction is available in the client replay.' : 'Inspect another workspace at any time.'}</span></div>
    </EvidenceCard>
  </>;
}

export function DataPanel({ run, pin }: Props) {
  const rows = ordersAt(run.time, run.config.source);
  const messages = [...producerHistory, ...events.filter(event => event.time <= run.time && event.record).map(event => event.record!)];
  return <>
    <EvidenceCard title="Current orders relation"><OrdersTable rows={rows} /><div className="incident-actions"><Button onClick={() => pin('Current order relation', JSON.stringify(rows), run.time)}><Pin size={14} aria-hidden="true" />Pin source rows</Button><span className="incident-caption">Latest ingested values at {formatTime(run.time)}; this inspection does not establish a complete serving snapshot.</span></div></EvidenceCard>
    <details className="incident-details" open><summary>Retained producer messages</summary><p>The Kafka producer sends full replacement values under a stable order-ID key. Arrival is ingestion metadata; event time is the business timestamp.</p><OrdersTable rows={messages} caption="Retained keyed message history" /></details>
    <EvidenceCard title="Customers relation"><Table caption="Customer regions"><thead><tr><th scope="col">Customer</th><th scope="col">Region</th></tr></thead><tbody><tr><td>1</td><td>EU</td></tr><tr><td>2</td><td>US</td></tr></tbody></Table><p>Native PostgreSQL source. Initial snapshot completed; current connection activity is available in System.</p></EvidenceCard>
  </>;
}

export function SystemPanel({ run, trace, dispatch, pin }: Props) {
  const f = frontiers(run.config, run.time, run.processed);
  const read = run.read;
  const cfg = <K extends Exclude<keyof ChallengeRun['config'], 'predicate' | 'source'>>(key: K, value: ChallengeRun['config'][K]) => dispatch({ type: 'configure', key, value });
  return <>
    <div className="incident-grid">
      <EvidenceCard title="Dependencies and progress" icon={<Activity size={17} aria-hidden="true" />}>
        <div className="incident-flow"><span>Orders + Customers</span><ArrowRight size={16} aria-hidden="true" /><span>Recent orders</span><ArrowRight size={16} aria-hidden="true" /><span>Regional totals</span></div>
        <Table caption="System write frontiers"><thead><tr><th scope="col">Object</th><th scope="col">Complete strictly below</th></tr></thead><tbody>{[['Orders input', f.orders], ['Customers input', f.customers], ['Regional aggregate', f.output], ['Serving index', f.output]].map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{formatTime(Number(value))}</td></tr>)}</tbody></Table>
        <p>Frontiers describe completeness, independently of query duration. Quiet business data can still make progress.</p>
        <Button onClick={() => pin('Dependency frontiers', JSON.stringify({ ...f, queryMs: 40 }), run.time)}><Pin size={14} aria-hidden="true" />Pin progress evidence</Button>
      </EvidenceCard>
      <EvidenceCard title="Customer connection">
        <p className="incident-log-entry">623.000 s · Operator paused the customer connection. Progress reports stopped.</p>
        {run.config.connected && <p className="incident-log-entry">{formatTime(run.time)} · Connection resumed. {run.processed ? 'Aggregate and serving computation processed available work.' : 'Output computation remains pending.'}</p>}
        <p>Current connection: <strong>{run.config.connected ? 'Running' : 'Paused'}</strong></p>
        <div className="incident-actions"><Button onClick={() => cfg('connected', !run.config.connected)}>{run.config.connected ? 'Pause customer connection' : 'Resume customer connection'}</Button><Button data-incident-action="advance" disabled={!run.config.connected || run.processed} onClick={() => dispatch({ type: 'advance' })}>Next event</Button></div>
      </EvidenceCard>
    </div>
    <EvidenceCard title="Snapshot requests" icon={<Clock3 size={17} aria-hidden="true" />}>
      {(run.config.final !== 'materialized' || run.config.indexes === 'none') && <p className="incident-notice">The configured operations serving path is missing. A request waits until the shared maintained result and local serving index are available.</p>}
      <div className="read-workspace"><ReadableWindow snapshot={readWindow(run.config, run.time, run.processed, read)} assessment caption="One retained, complete timestamp across all queried inputs." /></div>
      <div className="incident-actions"><Button onClick={() => dispatch({ type: 'read', attempt: requestRead(run.config, run.time, run.processed) })}>Request normal read</Button><label className="incident-check"><input type="checkbox" checked={run.config.fallback} onChange={e => cfg('fallback', e.target.checked)} />Authorize labeled ten-second fallback</label><Button disabled={!run.config.fallback} onClick={() => dispatch({ type: 'read', attempt: requestRead(run.config, run.time, run.processed, true) })}>Request incident fallback</Button></div>
      {read && <div role="status" className="incident-notice" data-tone={read.status === 'available' ? 'success' : 'warning'}><strong>{read.status === 'available' ? read.bound === 10000 ? 'Authorized incident fallback available' : 'Normal read available' : read.status === 'waiting' ? 'Read is waiting for serving output' : 'Snapshot-age bound cannot be met'}</strong><p>Requested bound: {read.bound! / 1000} s · snapshot {formatTime(read.timestamp)}{read.age !== undefined ? ` · age at request ${formatTime(read.age)} · request clock ${formatTime(read.timestamp + read.age)}` : ''}. A later successful request does not rewrite this request's outcome.</p>{read.status === 'available' && trace && <TotalsTable rows={rowsAt(trace, read.timestamp)} caption="Requested snapshot rows" />}</div>}
      <Button disabled={!read} onClick={() => pin('Snapshot request', JSON.stringify(read), read?.timestamp ?? run.time)}><Pin size={14} aria-hidden="true" />Pin read outcome</Button>
    </EvidenceCard>
    <details className="incident-details"><summary>Source and serving configuration · {objectCost(run.config)} / 8 state units</summary>
      <p>Changes rebuild the simulated source or serving configuration. They are reversible sandbox actions.</p>
      <div className="incident-fields">
        <label>Order envelope<select value={run.config.source.envelope} onChange={e => dispatch({ type: 'source', key: 'envelope', value: e.target.value })}><option value="UPSERT">UPSERT · latest full keyed value</option><option value="NONE">Append independent events</option></select></label>
        <label>Order identity<select value={run.config.source.key} onChange={e => dispatch({ type: 'source', key: 'key', value: e.target.value })}><option value="order_id">order_id</option><option value="customer_id">customer_id</option></select></label>
        <label>Recent-orders helper<select value={run.config.helper} onChange={e => cfg('helper', e.target.value as 'view' | 'materialized')}><option value="view">Regular view · 0 units</option><option value="materialized">Materialized view · 4 units</option></select></label>
        <label>Regional totals<select value={run.config.final} onChange={e => cfg('final', e.target.value as 'view' | 'materialized')}><option value="view">Regular view · 0 units</option><option value="materialized">Materialized result on transform · 4 units</option></select></label>
        <label>Serving indexes<select value={run.config.indexes} onChange={e => cfg('indexes', e.target.value as 'both' | 'operations' | 'none')}><option value="both">Operations and support · 4 units</option><option value="operations">Operations only · 2 units</option><option value="none">None · 0 units</option></select></label>
      </div>
      <p className="incident-caption">Teaching units are illustrative, not memory measurements. Both serving clusters require local indexes on one shared durable result.</p>
    </details>
  </>;
}

export function ClientPanel({ run, trace, dispatch, pin }: Props) {
  const connected = run.config.connected && run.processed;
  const state = trace ? clientState(trace, run.config, run.deliveries) : null;
  const length = trace ? streamFor(trace, run.config.snapshot).length : 0;
  return <>
    <EvidenceCard title="Application subscription" icon={<Radio size={17} aria-hidden="true" />}>
      <div className="incident-fields">
        <label>Publish application updates<select value={run.config.publication} onChange={e => dispatch({ type: 'configure', key: 'publication', value: e.target.value })}><option value="each">After every received record</option><option value="equal">When progress reaches the timestamp</option><option value="complete">When progress is strictly beyond the timestamp</option></select></label>
        <label className="incident-check"><input type="checkbox" checked={run.config.snapshot} onChange={e => dispatch({ type: 'configure', key: 'snapshot', value: e.target.checked })} />Initialize with a coordinated snapshot</label>
      </div>
      <p>The supplied client consolidates signed changes to full result rows. Delivery batches may split one timestamp. Changing its configuration starts a fresh replay.</p>
      {!connected && <p className="incident-notice">The replay is waiting for current complete upstream output. Inspect live system progress; client settings can still be changed now.</p>}
      <div className="incident-actions"><Button onClick={() => { const record = trace && streamFor(trace, run.config.snapshot)[run.deliveries]; if (record) dispatch({ type: 'delivery', timestamp: record.timestamp }); }} disabled={!connected || !trace || run.deliveries >= length}>Next delivery</Button><Button disabled={!run.deliveries} onClick={() => dispatch({ type: 'replay-client' })}>Replay deliveries</Button><span>{Math.min(run.deliveries, length)} / {length} deliveries</span></div>
      {state ? <TimestampTrays state={state} publicationPolicy={run.config.publication} executionNote="Delivery is simulated from the deployed query's actual SQL results." /> : <p>Preparing the query-dependent subscription…</p>}
      <Button disabled={!state} onClick={() => pin('Application publication', `Delivery ${run.deliveries}; policy ${run.config.publication}; progress ${state?.progress}; published ${JSON.stringify(state?.published)}; pending ${JSON.stringify(state?.pending)}.`, state?.progress ?? run.time)}><Pin size={14} aria-hidden="true" />Pin application state</Button>
      <p className="incident-caption">This session starts with a baseline at 631 s. Each new delivery advances the incident clock to at least its timestamp; replaying cannot rewind the incident. Trays show integer milliseconds; P(632001) means progress at 632.001 s. Results derive from the deployed query.</p>
    </EvidenceCard>
  </>;
}
