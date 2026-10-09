import { DiffBadge } from '../../components/lesson/DiffBadge';
import { Clock3, Database, Table2, Trash2 } from 'lucide-react';
import { useState, type ReactNode, type RefObject } from 'react';
import { Table } from '../../components/ui/Table';
import { PanelTabs } from '../../components/lab/PanelTabs';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { relationHelp } from './scenario';
import { copiesOf, getRelationMetrics, rowKey, type ProductRow, type RelationUpdate, type RowMultiplicity } from './simulation';

export function RelationMetrics({ relation, time, metricsRef, countsRef }: {
  relation: readonly RowMultiplicity[];
  time: number;
  metricsRef: RefObject<HTMLDivElement | null>;
  countsRef?: RefObject<HTMLDivElement | null>;
}) {
  const metrics = getRelationMetrics(relation);
  const counts = <>
    <WorkspaceMetric testId="total-copies" icon={<Database size={25} aria-hidden="true" />}
      label={<>Total row copies <RelationHelp {...relationHelp.totalCopies} /></>} value={metrics.totalCopies} />
    <WorkspaceMetric testId="distinct-rows" icon={<Table2 size={25} aria-hidden="true" />}
      label={<>Distinct full rows <RelationHelp {...relationHelp.distinctRows} /></>} value={metrics.distinctRows} />
  </>;
  return (
    <div ref={metricsRef} className="relation-metrics" aria-label="Relation metrics">
      {countsRef ? <div ref={countsRef} className="relation-count-metrics">{counts}</div> : counts}
      <WorkspaceMetric testId="logical-time" icon={<Clock3 size={25} aria-hidden="true" />}
        label={<>Current logical timestamp <RelationHelp {...relationHelp.logicalTime} /></>} value={<span className="relation-time">t = {time}</span>} />
    </div>
  );
}

export function CurrentRelation({ relation, time, relationRef, highlightCopies, affectedRows = [], minRows = 0, children }: {
  relation: readonly RowMultiplicity[];
  time: number;
  relationRef: RefObject<HTMLElement | null>;
  highlightCopies: boolean;
  affectedRows?: readonly ProductRow[];
  minRows?: number;
  children?: ReactNode;
}) {
  return <section ref={relationRef} className="relation-panel relation-current" data-highlight-copies={highlightCopies} aria-labelledby="current-relation-heading">
    <h2 id="current-relation-heading">Current relation <RelationHelp {...relationHelp.relation} /><span className="relation-panel-time">at t = {time}</span></h2>
    <Table caption="Current relation">
      <thead><tr>
        {[relationHelp.product, relationHelp.price, relationHelp.copies].map((help) => <th key={help.label} scope="col"><span className="relation-column-label">{help.label}<RelationHelp {...help} /></span></th>)}
      </tr></thead>
      <tbody>
        {relation.length ? relation.map((entry) => (
          <tr key={rowKey(entry.row)} className={affectedRows.some((row) => rowKey(row) === rowKey(entry.row)) ? 'relation-row-affected' : ''}>
            <td>{entry.row.product}</td><td>${entry.row.price}</td><td><span className="relation-count">{entry.copies}</span></td>
          </tr>
        )) : <tr><td colSpan={3} className="relation-empty">The relation is empty.<br /><span>Apply the first change to add row copies.</span></td></tr>}
        {Array.from({ length: Math.max(0, minRows - Math.max(1, relation.length)) }, (_, index) => <tr key={`empty:${index}`} aria-hidden="true"><td /><td /><td /></tr>)}
      </tbody>
    </Table>
    {children}
    <p className="relation-table-note">Full row identity includes both product and price.</p>
  </section>;
}

interface RelationWorkbenchProps {
  guidedPanel?: 'ledger' | 'relation';
  relation: readonly RowMultiplicity[];
  updates: readonly RelationUpdate[];
  time: number;
  applied: number;
  onSelectTime: (time: number) => void;
  ledgerRef: RefObject<HTMLElement | null>;
  relationRef: RefObject<HTMLElement | null>;
  controlsDisabled: boolean;
  highlightCopies: boolean;
  previewTime: number | null;
}

export function ChangeLedger({ updates, time, applied, previewTime, ledgerRef, controlsDisabled, onSelectTime, help = relationHelp, timestampView = false, highlightSelected = true }:
  Pick<RelationWorkbenchProps, 'updates' | 'time' | 'applied' | 'previewTime' | 'ledgerRef' | 'controlsDisabled' | 'onSelectTime'> & {
    help?: Pick<typeof relationHelp, 'ledger' | 'time'>;
    timestampView?: boolean;
    highlightSelected?: boolean;
  }) {
  const timestamps = [...new Set(updates.map((update) => update.time))];
  const shownTime = previewTime ?? (timestampView ? time : Math.max(1, time));
  const recordsAtTime = (timestamp: number) => updates.filter((update) => update.time === timestamp).length;
  const emptyRows = Math.max(4, ...timestamps.map(recordsAtTime)) - recordsAtTime(shownTime);
  const displayedUpdates = timestampView ? updates.filter((update) => update.time === shownTime) : updates;
  return <section ref={ledgerRef} className="relation-panel relation-ledger" data-timestamp-view={timestampView} aria-labelledby="ledger-heading">
    <div className="relation-ledger-header">
      <h2 id="ledger-heading">Change ledger <RelationHelp {...help.ledger} />{timestampView && <span className="relation-panel-time">{previewTime !== null ? 'Upcoming' : 'Applied'} · t = {shownTime}</span>}</h2>
      {!timestampView && <nav className="relation-mobile-timestamps" aria-label="Inspect change history">
        {timestamps.map((timestamp) => <button key={timestamp} className="relation-timestamp-button" type="button"
          aria-label={`Inspect t = ${timestamp}`} aria-pressed={time === timestamp} disabled={timestamp > applied || controlsDisabled}
          onClick={() => onSelectTime(timestamp)}>{timestamp}</button>)}
      </nav>}
    </div>
    <Table caption="Change ledger">
      <thead><tr>
        {(timestampView ? [relationHelp.diff, relationHelp.row] : [help.time, relationHelp.diff, relationHelp.row]).map((column) => <th key={column.label} scope="col"><span className="relation-column-label">{column.label}<RelationHelp {...column} /></span></th>)}
      </tr></thead>
      <tbody>
        {displayedUpdates.map((update, index) => {
          const pending = update.time > applied;
          const firstAtTime = index === 0 || displayedUpdates[index - 1]!.time !== update.time;
          return <tr key={`${update.time}:${index}`} data-ledger-time={update.time} data-mobile-current={update.time === shownTime}
            className={`${highlightSelected && time === update.time ? 'relation-ledger-selected' : ''} ${pending ? 'relation-ledger-pending' : ''} ${previewTime === update.time ? 'relation-ledger-preview' : ''}`}>
            {!timestampView && <td>{firstAtTime ? <><button className="relation-timestamp-button" aria-label={`Inspect t = ${update.time}`} aria-pressed={time === update.time}
              disabled={pending || controlsDisabled} onClick={() => onSelectTime(update.time)}>{update.time}</button><span className="relation-ledger-mobile-time">{update.time}</span></> : update.time}</td>}
            <td>{timestampView ? <span className="relation-ledger-cell"><DiffBadge diff={update.diff} /></span> : <DiffBadge diff={update.diff} />}</td>
            <td><span className="relation-row-value">{update.row.product}<span>${update.row.price}</span></span>{pending && <span className="relation-pending-label">{previewTime === update.time ? 'Next' : 'Upcoming'}</span>}</td>
          </tr>;
        })}
        {Array.from({ length: emptyRows }, (_, index) => <tr key={`empty:${index}`} className="relation-ledger-placeholder" aria-hidden="true"><td>{timestampView && <span className="relation-ledger-cell" />}</td><td />{!timestampView && <td />}</tr>)}
      </tbody>
    </Table>
    <p className="relation-table-note">{timestampView ? 'Use Previous / Next timestamp to inspect each batch.' : 'Select an applied timestamp to replay its state.'}</p>
  </section>;
}

export function RelationWorkbench({ relation, updates, time, applied, onSelectTime, ledgerRef, relationRef, controlsDisabled, highlightCopies, previewTime, guidedPanel }: RelationWorkbenchProps) {
  const [selectedPanel, setSelectedPanel] = useState<'ledger' | 'relation'>('ledger');
  const activePanel = guidedPanel ?? selectedPanel;
  const current = updates.find((update) => update.time === time);
  const removed = current && current.diff < 0 && copiesOf(relation, current.row) === 0;
  return (
    <div data-walkthrough="lecture-workspace" className="relation-panels" data-selected-panel={activePanel}>
      <PanelTabs value={activePanel} onChange={setSelectedPanel} disabled={Boolean(guidedPanel)} />
      <ChangeLedger updates={updates} time={time} applied={applied} previewTime={previewTime} ledgerRef={ledgerRef}
        controlsDisabled={controlsDisabled} onSelectTime={onSelectTime} />
      <CurrentRelation relation={relation} time={time} relationRef={relationRef} highlightCopies={highlightCopies} affectedRows={current ? [current.row] : []}>
        {removed && <div className="relation-removed" role="status"><Trash2 size={17} aria-hidden="true" /><span>Removed at t = {time}: <strong>{current.row.product}, ${current.row.price}</strong><span className="relation-removed-count">1 → 0 copies</span></span></div>}
      </CurrentRelation>
    </div>
  );
}
