import { useEffect, useState, type RefObject } from 'react';
import { ArrowRight, Database, Info, Radio, Table2, Unplug } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { LessonText } from '../../components/lesson/LessonText';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { timestampGroups, type RowCount, type StreamRecord, type SubscriptionState } from './simulation';
import type { SubscriptionTarget } from './lecture-scenarios';
import { subscriptionText } from './lessonText';

export type SubscriptionRefs = Record<SubscriptionTarget, RefObject<HTMLElement | null>>;
type Group = ReturnType<typeof timestampGroups>[number];

const help = {
  diff: 'A signed change to the number of copies of the entire result row. Negative retracts copies; positive adds them. It does not change a currency cell by that amount.',
  copies: 'The number of identical full result rows in the application. Orders is a value inside the row; Copies is its multiplicity.',
  complete: 'All timestamps strictly below this boundary are known complete. The boundary timestamp stays open. Later data, as well as progress records, can advance this evidence.',
  published: 'The application has applied complete changes strictly below this timestamp. This client publishes on progress records, so knowledge can advance before publication. Disconnect retains this last boundary.',
  key: 'The trays show received signed rows, their completeness, and what the application has published. Open Diagram key for the full explanation of the symbols and client policy.',
};

function RecordsTable({ records }: { records: readonly Extract<StreamRecord, { kind: 'data' }>[] }) {
  return <table className="subscribe-table" aria-label="Signed full-row changes"><thead><tr><th><span className="subscribe-column-label">Diff<RelationHelp label="Diff" text={help.diff} /></span></th><th>Region</th><th>Orders</th><th>Total</th></tr></thead>
    <tbody>{Array.from({ length: 2 }, (_, index) => {
      const record = records[index];
      return record ? <tr key={index}><td data-sign={record.diff < 0 ? 'negative' : 'positive'}>{record.diff === 0 ? '0' : `${record.diff > 0 ? '+' : '−'}${Math.abs(record.diff)}`}</td><td>{record.row.region}</td><td>{record.row.orders}</td><td>{record.row.total}</td></tr>
        : <tr key={index} aria-hidden="true" className="subscribe-empty-row"><td> </td><td /><td /><td /></tr>;
    })}</tbody>
  </table>;
}
function ApplicationTable({ rows }: { rows: readonly RowCount[] }) {
  return <table className="subscribe-table" aria-label="Published application rows"><thead><tr><th>Region</th><th>Orders</th><th>Total</th><th><span className="subscribe-column-label">Copies<RelationHelp label="Copies" text={help.copies} /></span></th></tr></thead>
    <tbody>{Array.from({ length: 2 }, (_, index) => {
      const entry = rows[index];
      return entry ? <tr key={index}><td>{entry.row.region}</td><td>{entry.row.orders}</td><td>{entry.row.total}</td><td>{entry.count}</td></tr>
        : <tr key={index} aria-hidden="true" className="subscribe-empty-row"><td> </td><td /><td /><td /></tr>;
    })}</tbody>
  </table>;
}
function Tray({ group, side, state, selected, onSelect, disabled, sectionRef }: {
  group: Group | undefined; side: 'complete' | 'pending'; state: SubscriptionState;
  selected: string; onSelect: (value: string) => void; disabled: boolean;
  sectionRef?: RefObject<HTMLElement | null>;
}) {
  const groups = timestampGroups(state).filter(item => side === 'complete' ? item.complete : !item.complete);
  const status = !group ? side === 'complete' ? state.knownCompleteBefore === null ? 'Waiting for progress' : 'No completed changes' : !state.snapshot ? 'Changes only · no baseline' : state.ready ? 'Nothing waiting' : `Snapshot starts at ${state.start}`
    : !state.snapshot ? 'Changes only · no baseline' : group.published ? 'Published' : group.complete ? 'Complete · not published' : 'Open · pending';
  return <section ref={sectionRef} className="subscribe-tray" data-side={side} data-state={!group ? 'empty' : !state.snapshot ? 'uninitialized' : group.published ? 'published' : group.complete ? 'complete' : 'pending'} aria-label={`${side === 'complete' ? 'Complete' : 'Pending'} timestamp tray`}>
    <div className="subscribe-tray-heading"><strong>{group ? `t = ${group.timestamp}` : side === 'complete' ? 'Completed changes' : 'Incoming changes'}</strong>{groups.length > 1 && <span className="subscribe-tray-picker"><select value={group?.timestamp ?? ''} onChange={event => onSelect(event.target.value)} disabled={disabled} aria-label={`${side === 'complete' ? 'Completed' : 'Pending'} timestamp group`} title={selected ? 'Inspecting received history' : 'Latest received group'}>
      {groups.map(item => <option key={item.timestamp} value={item.timestamp}>{item.timestamp}</option>)}
    </select></span>}<span className="subscribe-tray-status">{status}</span></div>
    <RecordsTable records={group?.records ?? []} />
  </section>;
}

export function SubscriptionCaption({ caption }: { caption: string }) {
  return <section className="subscribe-caption" aria-label="Scenario evidence"><Info size={14} aria-hidden="true" /><p><LessonText content={subscriptionText(caption)} /></p></section>;
}

export function TimestampTrays({ state, refs, completedTime, assessment = false, disabled = false, onInspect }: {
  state: SubscriptionState; refs?: SubscriptionRefs; completedTime?: number; assessment?: boolean; disabled?: boolean; onInspect?: () => void;
}) {
  const [keyOpen, setKeyOpen] = useState(false);
  const [selection, setSelection] = useState({ complete: '', pending: '' });
  useEffect(() => { setSelection({ complete: '', pending: '' }); }, [state]);
  const groups = timestampGroups(state);
  const completed = groups.filter(group => group.complete);
  const pending = groups.filter(group => !group.complete);
  const left = completed.find(group => group.timestamp === completedTime) ?? completed.find(group => String(group.timestamp) === selection.complete) ?? completed.at(-1);
  const right = pending.find(group => String(group.timestamp) === selection.pending) ?? pending.at(-1);
  const appStatus = !state.connected ? state.ready ? `Stale · published before ${state.publishedBefore}` : 'Disconnected · no complete baseline' : !state.snapshot ? 'No initial baseline' : state.ready ? `${state.published.length ? '' : 'Ready · no rows · '}Published before ${state.publishedBefore}` : 'Waiting for full snapshot';
  const boundaryText = state.knownCompleteBefore === null ? 'Waiting for progress' : `Complete before ${state.knownCompleteBefore}`;
  const boundaryDetail = state.knownCompleteBefore === null ? state.snapshot ? 'The snapshot is still loading' : 'The initial snapshot is disabled' : `Time ${state.knownCompleteBefore} is still open`;
  const streamStatus = !state.connected ? 'Connection stopped' : state.progress === null ? state.snapshot ? 'Snapshot, then updates' : 'Updates only · no snapshot' : `P(${state.progress}) received${state.snapshot ? '' : ' · no snapshot'}`;
  return <div className="subscribe-workspace" data-assessment={assessment || undefined} data-testid="subscribe-workspace"
    onPointerOver={event => { if (event.target instanceof Element && event.target.closest('.relation-help')) onInspect?.(); }}
    onFocusCapture={event => { if (event.target.closest('.relation-help')) onInspect?.(); }}>
    <section ref={refs?.subscription} className="subscribe-strip" aria-label="Subscription settings">
      <div className="subscribe-flow-node"><Database size={19} aria-hidden="true" /><div className="subscribe-node-copy"><span>Materialize result</span><strong title={state.name}>{state.name}</strong></div></div>
      <ArrowRight className="subscribe-flow-arrow" size={18} aria-hidden="true" />
      <section ref={refs?.connection} className="subscribe-flow-node" data-connected={state.connected}><Radio size={19} aria-hidden="true" /><div className="subscribe-node-copy"><span>Live subscription <i className="subscribe-connection-dot" aria-label={state.connected ? 'Connected' : 'Disconnected'} /></span><strong title={streamStatus}>{streamStatus}</strong></div></section>
      <ArrowRight className="subscribe-flow-arrow" size={18} aria-hidden="true" />
      <div className="subscribe-flow-node"><Table2 size={19} aria-hidden="true" /><div className="subscribe-node-copy"><span>Your application</span><strong title={appStatus}>{appStatus}</strong></div></div>
    </section>
    <section className="subscribe-diagram" aria-label="Timestamp trays and published application" data-testid="subscribe-diagram">
      <section className="subscribe-boundary-label" aria-label="Completeness boundary">
        {assessment && <span className="subscribe-assessment-source"><Database size={15} aria-hidden="true" />{state.name}</span>}
        <strong ref={refs?.boundary} className="subscribe-boundary-value">{boundaryText}<RelationHelp label="Complete before" text={help.complete} /></strong><span>{boundaryDetail}</span>
        {!assessment && <span className="subscribe-key-control"><RelationHelp label="Diagram key" text={help.key} /><Button className="subscribe-key-button" variant="ghost" aria-haspopup="dialog" onClick={event => { event.currentTarget.focus(); onInspect?.(); setKeyOpen(true); }}>Diagram key</Button></span>}
      </section>
      <section className="subscribe-trays" aria-label="Received changes grouped by timestamp">
        <Tray sectionRef={refs?.complete} group={left} side="complete" state={state} selected={completedTime === undefined ? selection.complete : String(completedTime)} onSelect={value => setSelection(previous => ({ ...previous, complete: value }))} disabled={disabled} />
        <div className="subscribe-divider" aria-hidden="true" />
        <Tray sectionRef={refs?.pending} group={right} side="pending" state={state} selected={selection.pending} onSelect={value => setSelection(previous => ({ ...previous, pending: value }))} disabled={disabled} />
      </section>
      <div className="subscribe-publication-arrow" role="img" aria-label="Completed changes flow into the application on progress"><span aria-hidden="true" /></div>
      <section ref={refs?.application} className="subscribe-application" aria-label="Published application" aria-live="polite" data-testid="subscribe-application">
        <div className="subscribe-application-heading"><div><strong>Your live result</strong><span className="subscribe-publication-status">{appStatus}<RelationHelp label="Published before" text={help.published} /></span></div>{!state.connected && <Unplug size={16} aria-hidden="true" />}</div>
        <ApplicationTable rows={state.ready ? state.published : []} />
      </section>
      <div className="subscribe-diagram-footer"><span>Illustrative delivery · not packet or FETCH boundaries</span></div>
    </section>
    <Dialog open={keyOpen} onClose={() => setKeyOpen(false)} title="Timestamp-tray diagram key">
      <dl className="subscribe-key"><div><dt>Signed full rows</dt><dd>A diff changes the number of copies of the entire row. Orders counts open orders in a region; Copies counts identical result rows. A retraction removes row copies, not currency from a total cell.</dd></div>
        <div><dt>Complete before T</dt><dd>The dotted divider separates completed older timestamps from open ones. Timestamp T itself stays open. A later data timestamp also supplies this evidence.</dd></div>
        <div><dt>Complete versus published</dt><dd>Publishing means updating the application’s visible result. A complete group can still wait for publication. This client applies buffered changes only when a progress record P(T) arrives, and only for timestamps less than T.</dd></div>
        <div><dt>Tray history</dt><dd>The selectors inspect already received groups without rewinding the connection. The same two tray slots are reused; empty slots are not business rows.</dd></div>
        <div><dt>Progress is not a data row</dt><dd>P(T) abbreviates a progress record with mz_timestamp = T and mz_progressed = true. Ignore its other fields: it is not an order or a diff. Quiet progress advances the boundary without changing totals. A FETCH timeout supplies no timestamp guarantee.</dd></div>
        <div><dt>Connection and freshness</dt><dd>Connected does not mean current with an external source. Disconnected retains the last known display as stale. Durable recovery needs additional history and checkpoint coordination.</dd></div></dl>
      <p>This deterministic simulation executes no SQL. Playback steps are delivery checkpoints, not logical timestamps or wall-clock seconds.</p>
    </Dialog>
  </div>;
}
