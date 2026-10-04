import { Clock3, Database, Table2, Trash2 } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Table } from '../../components/ui/Table';
import { RelationHelp } from './RelationHelp';
import { relationHelp } from './scenario';
import { copiesOf, getRelationMetrics, rowKey, type ProductRow, type RelationUpdate, type RowMultiplicity } from './simulation';

export function RelationMetrics({ relation, time, metricsRef }: {
  relation: readonly RowMultiplicity[];
  time: number;
  metricsRef: RefObject<HTMLDivElement | null>;
}) {
  const metrics = getRelationMetrics(relation);
  return (
    <div ref={metricsRef} className="relation-metrics" aria-label="Relation metrics">
      <div className="relation-metric" data-testid="total-copies">
        <Database size={25} aria-hidden="true" />
        <div><span>Total row copies <RelationHelp {...relationHelp.totalCopies} /></span><strong>{metrics.totalCopies}</strong></div>
      </div>
      <div className="relation-metric" data-testid="distinct-rows">
        <Table2 size={25} aria-hidden="true" />
        <div><span>Distinct full rows <RelationHelp {...relationHelp.distinctRows} /></span><strong>{metrics.distinctRows}</strong></div>
      </div>
      <div className="relation-metric" data-testid="logical-time">
        <Clock3 size={25} aria-hidden="true" />
        <div><span>Current logical timestamp <RelationHelp {...relationHelp.logicalTime} /></span><strong className="relation-time">t = {time}</strong></div>
      </div>
    </div>
  );
}

export function DiffBadge({ diff }: { diff: number }) {
  return <span className={`relation-count ${diff < 0 ? 'relation-count-negative' : diff === 0 ? 'relation-count-neutral' : ''}`} aria-label={diff === 0 ? 'No net change' : `${diff < 0 ? 'Retract' : 'Add'} ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'copy' : 'copies'}`}>{diff > 0 ? '+' : diff < 0 ? '−' : ''}{Math.abs(diff)}</span>;
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
  showArrow: boolean;
}

export function RelationWorkbench({ relation, updates, time, applied, onSelectTime, ledgerRef, relationRef, controlsDisabled, highlightCopies, previewTime, showArrow }: RelationWorkbenchProps) {
  const panelsRef = useRef<HTMLDivElement>(null);
  const markerId = useId();
  const [arrow, setArrow] = useState<{ width: number; height: number; path: string } | null>(null);
  const current = updates.find((update) => update.time === time);
  const removed = current && current.diff < 0 && copiesOf(relation, current.row) === 0;
  useLayoutEffect(() => {
    const panels = panelsRef.current;
    if (!panels) return;
    if (!showArrow) { setArrow(null); return; }
    const measure = () => {
      const source = panels.querySelector(`[data-ledger-time="${time}"]`);
      const target = panels.querySelector(removed ? '.relation-removed' : '.relation-row-affected');
      if (!source || !target) { setArrow(null); return; }
      const bounds = panels.getBoundingClientRect();
      const from = source.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const startX = from.right - bounds.left - 8;
      const startY = from.top + from.height / 2 - bounds.top;
      const endX = to.left - bounds.left - 6;
      const endY = to.top + to.height / 2 - bounds.top;
      setArrow({ width: bounds.width, height: bounds.height,
        path: `M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 25} ${endY}, ${endX} ${endY}` });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panels);
    return () => observer.disconnect();
  }, [time, removed, showArrow]);
  return (
    <div ref={panelsRef} className="relation-panels">
      <section ref={ledgerRef} className="relation-panel" aria-labelledby="ledger-heading">
        <h2 id="ledger-heading">Change ledger <RelationHelp {...relationHelp.ledger} /></h2>
        <Table caption="Change ledger">
          <thead><tr>
            {[relationHelp.time, relationHelp.diff, relationHelp.row].map((help) => <th key={help.label} scope="col"><span className="relation-column-label">{help.label}<RelationHelp {...help} /></span></th>)}
          </tr></thead>
          <tbody>
            {updates.map((update) => {
              const pending = update.time > applied;
              return <tr key={update.time} data-ledger-time={update.time} className={`${time === update.time ? 'relation-ledger-selected' : ''} ${pending ? 'relation-ledger-pending' : ''} ${previewTime === update.time ? 'relation-ledger-preview' : ''}`}>
                <td><button className="relation-timestamp-button" aria-label={`Inspect t = ${update.time}`} aria-pressed={time === update.time} disabled={pending || controlsDisabled} onClick={() => onSelectTime(update.time)}>{update.time}</button></td>
                <td><DiffBadge diff={update.diff} /></td>
                <td><span className="relation-row-value">{update.row.product}<span>${update.row.price}</span></span>{pending && <span className="relation-pending-label">{previewTime === update.time ? 'Next' : 'Upcoming'}</span>}</td>
              </tr>;
            })}
          </tbody>
        </Table>
        <p className="relation-table-note">Select an applied timestamp to replay its state.</p>
      </section>
      <CurrentRelation relation={relation} time={time} relationRef={relationRef} highlightCopies={highlightCopies} affectedRows={current ? [current.row] : []}>
        {removed && <div className="relation-removed" role="status"><Trash2 size={17} aria-hidden="true" /><span>Removed at t = {time}: <strong>{current.row.product}, ${current.row.price}</strong><span className="relation-removed-count">1 → 0 copies</span></span></div>}
      </CurrentRelation>
      {arrow && <svg className="relation-causal-arrow" aria-hidden="true" viewBox={`0 0 ${arrow.width} ${arrow.height}`} style={{ color: current && current.diff < 0 ? 'var(--danger)' : 'var(--lab-purple)' }}>
        <defs><marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M 0 0 L 5 3 L 0 6" fill="none" stroke="currentColor" strokeWidth="1.2" /></marker></defs>
        <path d={arrow.path} fill="none" stroke="currentColor" strokeWidth="1.6" markerEnd={`url(#${markerId})`} />
      </svg>}
    </div>
  );
}
