import { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import { ChallengeHelp } from './ChallengeHelp';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { ReadableWindow } from '../../chapters/consistent-reads/ReadableWindow';
import { TimestampTrays } from '../../chapters/live-applications-subscribe/TimestampTrays';
import { EvidenceCard, OrdersTable, TotalsTable } from './ChallengeEvidence';
import { Scope, SettingsActions, WorkspacePair } from './InvestigationWorkspace';
import { clientState, frontiers, objectCost, ordersAt, readWindow, requestRead, rowsAt, streamFor, type TraceFrame } from './incident';
import { displayedRows } from './grading';
import { events, formatTime, producerHistory } from './simulation';
import type { ChallengeRun, RunAction } from './run';
import '../../chapters/consistent-reads/chapter.css';
import '../../chapters/live-applications-subscribe/chapter.css';

interface Props { run: ChallengeRun; trace: readonly TraceFrame[] | null; dispatch: (action: RunAction) => void }
const processedAt = (run: ChallengeRun) => run.processed ? run.time : run.processedTime;

export function DashboardPanel({ run, trace, dispatch }: Props) {
  const id = useId();
  const f = frontiers(run.config, run.time, processedAt(run));
  const time = f.output - 1;
  const rows = trace ? displayedRows(trace, run.time, processedAt(run), run.config.connected) : [];
  const app = trace ? clientState(trace, run.config, run.deliveries) : null;
  return <WorkspacePair controls={<>
    <EvidenceCard title="Compare results" help="dashboard"><Scope>View only</Scope>
      <label className="incident-label" htmlFor={id}>Show results</label>
      <select id={id} value={run.inspection.comparison} onChange={e => dispatch({ type: 'inspect', key: 'comparison', value: e.target.value })}><option value="both">Database and application</option><option value="database">Database only</option><option value="application">Application only</option></select>
      <p>This changes this view only. The database and application can show different results because they have different completeness and delivery positions.</p>
    </EvidenceCard>
    <EvidenceCard title="Explore the incident" help="brief"><Scope>Navigation only</Scope><p>Choose where to investigate. Settings live beside the observations they affect.</p><div className="incident-navigation-links">{(['Data', 'SQL', 'System', 'Client'] as const).map(workspace => <Button key={workspace} onClick={() => dispatch({ type: 'workspace', workspace })}>{workspace}<ArrowRight size={14} aria-hidden="true" /></Button>)}</div></EvidenceCard>
  </>}>
    <div className="incident-result-summary"><span>Read-only results</span><strong>Compare timestamps as well as totals</strong></div>
    {run.inspection.comparison !== 'application' && <EvidenceCard title="Operations dashboard" help="dashboard" trailing={<Scope>{run.time - time > 3000 ? 'Last complete · stale' : 'Current complete snapshot'}</Scope>}>
      <div className="incident-snapshot-metrics"><span className="incident-info-heading">Snapshot <strong data-motion-value>{formatTime(time)}</strong><ChallengeHelp topic="snapshotTime" /></span><span className="incident-info-heading">Age <strong data-motion-value>{formatTime(run.time - time)}</strong><ChallengeHelp topic="snapshotAge" /></span><span className="incident-info-heading">Serving <strong>40 ms · illustrative</strong><ChallengeHelp topic="servingDuration" /></span></div>
      {trace ? <TotalsTable rows={rows} /> : <p>Preparing the query results…</p>}
      <p>{!run.config.connected ? 'The customer connection is paused; this is the last complete database result.' : !run.processed ? 'New input is available, but processing is pending. The last complete result stays visible.' : 'The connected inputs have been processed through the current incident time.'} Logical freshness cannot prove that unsent external changes have arrived.</p>
    </EvidenceCard>}
    {run.inspection.comparison !== 'database' && <EvidenceCard title="User-visible application" help="application" trailing={<Scope>Client position · {run.deliveries} deliveries</Scope>}>
      {app ? <TotalsTable rows={app.published.map(item => item.row)} caption="Visible application totals" /> : <p>Preparing the application replay…</p>}
      <p>{app?.ready ? `Published through the applied client policy. Latest received progress: ${app.progress === null ? 'none' : formatTime(app.progress)}.` : 'Waiting for a coordinated baseline. An empty client is not an empty business result.'} Receive deliveries in Client to inspect publication.</p>
    </EvidenceCard>}
  </WorkspacePair>;
}

export function DataPanel({ run, dispatch }: Props) {
  const id = useId();
  const rows = ordersAt(run.time, run.config.source);
  const messages = [...producerHistory, ...events.filter(event => event.time <= run.time && event.record).map(event => event.record!)];
  const selected = run.inspection.data;
  const filtered = (selected === 'messages' ? messages : rows).filter(row => !run.inspection.order.trim() || String(row.orderId).includes(run.inspection.order.trim()));
  return <WorkspacePair controls={<>
    <EvidenceCard title="Inspect input data" help="orders"><Scope>View only</Scope>
      <label className="incident-label" htmlFor={id + '-relation'}>Relation or history</label><select id={id + '-relation'} value={selected} onChange={e => dispatch({ type: 'inspect', key: 'data', value: e.target.value })}><option value="orders">Current orders</option><option value="messages">Retained producer messages</option><option value="customers">Customers</option></select>
      <label className="incident-label" htmlFor={id + '-filter'}>Filter by order ID</label><input id={id + '-filter'} type="text" inputMode="numeric" disabled={selected === 'customers'} value={run.inspection.order} maxLength={100} onChange={e => dispatch({ type: 'inspect', key: 'order', value: e.target.value })} placeholder="All orders" />
      <p>Selection and filtering do not change input records, SQL, or the shared clock.</p>
    </EvidenceCard>
    <EvidenceCard title="Source settings" help="configuration"><Scope>Changes shared system</Scope><p>Apply to rebuild orders from retained messages. Affects Data, SQL, Dashboard, and Client; clears the last read and resets client deliveries.</p>
      <div className="incident-label"><div className="incident-info-heading"><label htmlFor={id + '-envelope'}>Order envelope</label><ChallengeHelp topic="envelope" /></div><select id={id + '-envelope'} value={run.settings.source.envelope} onChange={e => dispatch({ type: 'stage', key: 'source', value: { ...run.settings.source, envelope: e.target.value as 'UPSERT' | 'NONE' } })}><option value="UPSERT">UPSERT · latest full keyed value</option><option value="NONE">Append independent events</option></select></div>
      <div className="incident-label"><div className="incident-info-heading"><label htmlFor={id + '-identity'}>Order identity</label><ChallengeHelp topic="identity" /></div><select id={id + '-identity'} value={run.settings.source.key} onChange={e => dispatch({ type: 'stage', key: 'source', value: { ...run.settings.source, key: e.target.value as 'order_id' | 'customer_id' } })}><option value="order_id">order_id</option><option value="customer_id">customer_id</option></select></div>
      <SettingsActions run={run} dispatch={dispatch} group="source" />
    </EvidenceCard>
  </>}>
    <div className="incident-result-summary"><span>Read-only result · live input at {formatTime(run.time)}</span><strong>Applied source: {run.config.source.envelope} · {run.config.source.key}</strong></div>
    {selected === 'customers' ? <EvidenceCard title="Customers relation" help="customers"><Table caption="Customer regions"><thead><tr><th scope="col">Customer</th><th scope="col">Region</th></tr></thead><tbody><tr><td>1</td><td>EU</td></tr><tr><td>2</td><td>US</td></tr></tbody></Table><p>Native PostgreSQL source. Initial snapshot completed; connection activity and progress are in System.</p></EvidenceCard>
      : <EvidenceCard title={selected === 'messages' ? 'Retained producer messages' : 'Current orders relation'} help={selected === 'messages' ? 'producerMessages' : 'orders'}><OrdersTable rows={filtered} caption={selected === 'messages' ? 'Retained keyed message history' : 'Current source rows'} />{!filtered.length && <p>No orders match this filter.</p>}<p>{selected === 'messages' ? 'The producer sends full replacement values under a stable order-ID key. Multiple messages can refer to one order. Source settings change the current relation, not this producer history.' : 'Latest ingested values under the applied source settings. These are inputs, not the regional query result or proof of a complete serving snapshot.'} Arrival is ingestion metadata; event time is the business timestamp.</p></EvidenceCard>}
  </WorkspacePair>;
}

export function SystemPanel({ run, trace, dispatch }: Props) {
  const id = useId();
  const f = frontiers(run.config, run.time, processedAt(run));
  const read = run.read;
  return <>
    <WorkspacePair controls={<EvidenceCard title="Connection and processing" help="connection"><Scope>Changes shared system</Scope><p>Affects database completeness, Dashboard, reads, and availability of Client deliveries. Resuming permits progress; processing is a separate action.</p><div className="incident-actions"><Button onClick={() => dispatch({ type: 'configure', key: 'connected', value: !run.config.connected })}>{run.config.connected ? 'Pause customer connection' : 'Resume customer connection'}</Button><Button disabled={!run.config.connected || run.processed} onClick={() => dispatch({ type: 'process' })}>Process pending updates</Button></div><p>{!run.config.connected ? 'Processing waits for the connection.' : run.processed ? 'No pending work at the current incident time.' : 'Available input has not yet reached the complete serving result.'}</p></EvidenceCard>}>
      <EvidenceCard title="Dependencies and progress" help="dependencies" trailing={<Scope>Read-only result · current</Scope>}>
        <div className="incident-flow"><span>Orders + Customers</span><ArrowRight size={16} aria-hidden="true" /><span>Recent orders</span><ArrowRight size={16} aria-hidden="true" /><span>Regional totals</span></div>
        <Table caption="System write frontiers"><thead><tr><th scope="col">Object</th><th scope="col"><span className="relation-column-label">Complete strictly below<ChallengeHelp topic="frontier" /></span></th></tr></thead><tbody>{[['Orders input', f.orders], ['Customers input', f.customers], ['Regional aggregate', f.output], ['Serving index', f.output]].map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{formatTime(Number(value))}</td></tr>)}</tbody></Table>
        <p className="incident-log-entry">623.000 s · Operator paused the customer connection. Progress reports stopped.</p><p>Current connection: <strong>{run.config.connected ? 'Running' : 'Paused'}</strong> · computation: <strong>{run.processed ? 'Caught up' : 'Pending'}</strong>. Progress describes completeness independently of query duration; quiet data can still make progress.</p>
      </EvidenceCard>
    </WorkspacePair>
    <WorkspacePair controls={<EvidenceCard title="Request a snapshot" help="reads"><Scope>Request only · uses shared system</Scope><p>A normal read allows at most three seconds of age. A labeled incident fallback allows ten seconds. Choosing fallback does not change the system or reset deliveries.</p><div className="incident-actions"><Button onClick={() => dispatch({ type: 'read', attempt: requestRead(run.config, run.time, processedAt(run)) })}>Request normal read</Button></div><span className="incident-check-help"><label className="incident-check"><input type="checkbox" checked={run.inspection.fallback} onChange={e => dispatch({ type: 'inspect', key: 'fallback', value: e.target.checked })} />Authorize labeled ten-second fallback</label><ChallengeHelp topic="fallback" /></span><Button disabled={!run.inspection.fallback} onClick={() => dispatch({ type: 'read', attempt: requestRead(run.config, run.time, processedAt(run), true) })}>Request incident fallback</Button></EvidenceCard>}>
      <EvidenceCard title="Snapshot requests" help="reads" trailing={<Scope>{read ? 'Read-only · last request' : 'Read-only · current availability'}</Scope>}>
        {(run.config.final !== 'materialized' || run.config.indexes === 'none') && <p className="incident-notice">The operations serving path is missing. A request waits for the maintained result and local index.</p>}
        <div className="read-workspace"><ReadableWindow snapshot={readWindow(run.config, run.time, processedAt(run), read)} assessment caption="One retained, complete timestamp across all queried inputs." /></div>
        {read ? <div className="incident-notice" data-tone={read.status === 'available' ? 'success' : 'warning'}><strong>{read.status === 'available' ? read.bound === 10000 ? 'Authorized incident fallback available' : 'Normal read available' : read.status === 'waiting' ? 'Read is waiting for serving output' : 'Snapshot-age bound cannot be met'}</strong><p>Last request: bound {read.bound! / 1000} s · snapshot {formatTime(read.timestamp)}{read.age !== undefined ? ` · age at request ${formatTime(read.age)} · request clock ${formatTime(read.timestamp + read.age)}` : ''}. This saved outcome does not update automatically; request again to test the current system.</p>{read.status === 'available' && trace && <TotalsTable rows={rowsAt(trace, read.timestamp)} caption="Requested snapshot rows" />}</div> : <p>No request recorded. The diagram shows current availability; use a request button to test it.</p>}
      </EvidenceCard>
    </WorkspacePair>
    <WorkspacePair controls={<EvidenceCard title="Serving settings" help="configuration"><Scope>Changes shared system</Scope><p>Affects serving availability in System and acceptance checks. Applying clears the last read; input records, SQL previews, and client deliveries stay preserved.</p>
      <div className="incident-label"><div className="incident-info-heading"><label htmlFor={id + '-helper'}>Recent-orders helper</label><ChallengeHelp topic="helper" /></div><select id={id + '-helper'} value={run.settings.helper} onChange={e => dispatch({ type: 'stage', key: 'helper', value: e.target.value })}><option value="view">Regular view · 0 units</option><option value="materialized">Materialized view · 4 units</option></select></div>
      <div className="incident-label"><div className="incident-info-heading"><label htmlFor={id + '-final'}>Regional totals</label><ChallengeHelp topic="regionalTotals" /></div><select id={id + '-final'} value={run.settings.final} onChange={e => dispatch({ type: 'stage', key: 'final', value: e.target.value })}><option value="view">Regular view · 0 units</option><option value="materialized">Materialized result · 4 units</option></select></div>
      <div className="incident-label"><div className="incident-info-heading"><label htmlFor={id + '-indexes'}>Serving indexes</label><ChallengeHelp topic="indexes" /></div><select id={id + '-indexes'} value={run.settings.indexes} onChange={e => dispatch({ type: 'stage', key: 'indexes', value: e.target.value })}><option value="both">Operations and support · 4 units</option><option value="operations">Operations only · 2 units</option><option value="none">None · 0 units</option></select></div><p>Draft budget: {objectCost(run.settings)} / 8 illustrative state units.</p><SettingsActions run={run} dispatch={dispatch} group="serving" />
    </EvidenceCard>}>
      <EvidenceCard title="Applied serving design" help="configuration" trailing={<Scope>Read-only result</Scope>}><Table caption="Applied serving objects"><thead><tr><th scope="col">Object</th><th scope="col">Applied setting</th></tr></thead><tbody><tr><th scope="row">Recent-orders helper</th><td>{run.config.helper === 'view' ? 'Regular view' : 'Materialized view'}</td></tr><tr><th scope="row">Regional totals</th><td>{run.config.final === 'view' ? 'Regular view' : 'One shared materialized result'}</td></tr><tr><th scope="row">Local serving indexes</th><td>{run.config.indexes === 'both' ? 'Operations and support' : run.config.indexes === 'operations' ? 'Operations only' : 'None'}</td></tr></tbody></Table><p><strong>{objectCost(run.config)} / 8 illustrative state units</strong>. Units are a teaching budget, not memory measurements. Operations and support need local indexes on one durable shared result.</p></EvidenceCard>
    </WorkspacePair>
  </>;
}

export function ClientPanel({ run, trace, dispatch }: Props) {
  const id = useId();
  const connected = run.config.connected && run.processed;
  const state = trace ? clientState(trace, run.config, run.deliveries) : null;
  const records = trace ? streamFor(trace, run.config.snapshot) : [];
  const next = records[run.deliveries];
  const last = records[run.deliveries - 1];
  return <WorkspacePair controls={<>
    <EvidenceCard title="Client settings" help="subscription"><Scope>Changes shared system</Scope><p>Affects the application in Client and Dashboard. Applying restarts client deliveries; database reads and SQL previews stay preserved.</p>
      <div className="incident-label"><div className="incident-info-heading"><label htmlFor={id + '-publication'}>Publish application updates</label><ChallengeHelp topic="publication" /></div><select id={id + '-publication'} value={run.settings.publication} onChange={e => dispatch({ type: 'stage', key: 'publication', value: e.target.value })}><option value="each">After every received record</option><option value="equal">When progress reaches the timestamp</option><option value="complete">When progress is strictly beyond the timestamp</option></select></div>
      <span className="incident-check-help"><label className="incident-check"><input type="checkbox" checked={run.settings.snapshot} onChange={e => dispatch({ type: 'stage', key: 'snapshot', value: e.target.checked })} />Initialize with a coordinated snapshot</label><ChallengeHelp topic="baseline" /></span><SettingsActions run={run} dispatch={dispatch} group="client" />
    </EvidenceCard>
    <EvidenceCard title="Receive deliveries" help="subscription"><Scope>Advances client · may advance shared time</Scope><p>{next ? `Next: ${next.kind === 'progress' ? 'progress record' : 'signed row change'} at ${formatTime(next.timestamp)}. ${next.timestamp > run.time ? 'Receiving it advances the incident clock on every workspace.' : 'The incident clock stays unchanged.'}` : trace ? 'All deliveries received.' : 'Preparing the query-dependent stream…'}</p>
      {!connected && <p className="incident-notice">Waiting for complete upstream output. Resume the connection and process pending updates in System.</p>}
      <div className="incident-actions"><Button disabled={!connected || !next} onClick={() => { if (next) dispatch({ type: 'delivery', timestamp: next.timestamp }); }}>Receive next delivery</Button><Button disabled={!run.deliveries} onClick={() => dispatch({ type: 'replay-client' })}>Replay deliveries</Button></div><p>{Math.min(run.deliveries, records.length)} / {records.length} deliveries received. Replay clears the client only; time never rewinds.</p>
    </EvidenceCard>
  </>}>
    <EvidenceCard title="Application subscription" help="subscription" trailing={<Scope>Read-only result · received deliveries</Scope>}>
      <p>Applied publication: <strong>{run.config.publication === 'each' ? 'Every received record' : run.config.publication === 'equal' ? 'Progress reaches timestamp' : 'Progress strictly beyond timestamp'}</strong> · coordinated snapshot: <strong>{run.config.snapshot ? 'On' : 'Off'}</strong>.</p>
      {state ? <TimestampTrays state={state} publicationPolicy={run.config.publication} executionNote="Delivery is simulated from the applied query's actual SQL results." /> : <p>Preparing the query-dependent subscription…</p>}
      {last && <p className="incident-notice"><strong>Last received:</strong> {last.kind === 'progress' ? `Progress at ${formatTime(last.timestamp)}. Progress reports completeness; it does not change order amounts.` : `Signed change at ${formatTime(last.timestamp)}: ${last.diff > 0 ? 'add' : 'remove'} ${last.row.region}, ${last.row.orders} orders, total ${last.row.total}. The applied publication policy decides when it becomes visible.`}</p>}
      <p>Signed changes can split a timestamp across deliveries. Progress records change completeness, not order amounts. The application may keep its last complete result while a timestamp is still open. No visible change can therefore be expected for some deliveries.</p><p className="incident-caption">Baseline: 631 s. Trays use integer milliseconds: P(632001) means 632.001 s. History selectors in the diagram are view only.</p>
    </EvidenceCard>
  </WorkspacePair>;
}
