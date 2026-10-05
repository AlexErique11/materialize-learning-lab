import type { RefObject } from 'react';
import { Table } from '../../components/ui/Table';
import { RelationHelp } from './RelationHelp';
import { CurrentRelation, DiffBadge } from './RelationWorkbench';
import { batchHelp, lectureTwoBatches, lectureTwoInitial } from './lecture-two-scenario';
import { relationHelp } from './scenario';
import { consolidateTimestamp, rowKey, type RowMultiplicity } from './simulation';

const LEDGER_VISIBLE_ROWS = 4;

export function BatchWorkbench({ relation, time, applied, previewTime, ledgerRef, relationRef, controlsDisabled, highlightCopies, onSelectTime }: {
  relation: readonly RowMultiplicity[];
  time: number;
  applied: number;
  previewTime: number | null;
  ledgerRef: RefObject<HTMLElement | null>;
  relationRef: RefObject<HTMLElement | null>;
  controlsDisabled: boolean;
  highlightCopies: boolean;
  onSelectTime: (time: number) => void;
}) {
  // The optional preview reveals the input batch while the relation stays at its prior time.
  const shownTime = previewTime ?? time;
  const batch = lectureTwoBatches.find((entry) => entry.time === shownTime);
  const updates = batch?.updates ?? lectureTwoInitial.map((entry) => ({ row: entry.row, diff: entry.copies, time: 0 }));
  const emptyRowCount = Math.max(0, LEDGER_VISIBLE_ROWS - updates.length);
  const current = lectureTwoBatches.find((entry) => entry.time === time);
  const affectedRows = current ? consolidateTimestamp(current.updates).filter((update) => update.diff !== 0).map((update) => update.row) : [];

  return <div data-walkthrough="lecture-workspace" className="relation-panels">
    <section ref={ledgerRef} className="relation-panel batch-ledger" aria-labelledby="ledger-heading">
      <div className="batch-panel-heading">
        <h2 id="ledger-heading">Change ledger <RelationHelp {...batchHelp.ledger} /></h2>
        <TimestampSelector shownTime={shownTime} applied={applied} disabled={controlsDisabled} onSelectTime={onSelectTime} />
      </div>
      <div className="batch-summary">
        <span>{batch ? `${updates.length} diffs at t = ${shownTime}` : 'Starting snapshot · t = 0'} <RelationHelp {...batchHelp.time} /></span>
        <span>{previewTime !== null ? 'Upcoming' : batch ? 'Applied together' : '4 copies'}</span>
      </div>
      <Table caption="Change ledger">
        <thead><tr>{[relationHelp.diff, relationHelp.row].map((help) => <th scope="col" key={help.label}><span className="relation-column-label">{help.label}<RelationHelp {...help} /></span></th>)}</tr></thead>
        <tbody>
          {updates.map((update, index) => <tr key={`${rowKey(update.row)}:${index}`} className={previewTime !== null ? 'relation-ledger-preview' : ''}>
            <td><DiffBadge diff={update.diff} /></td>
            <td><span className="relation-row-value">{update.row.product}<span>${update.row.price}</span></span></td>
          </tr>)}
          {/* Empty cells preserve the grid without representing additional diffs. */}
          {Array.from({ length: emptyRowCount }, (_, index) => <tr key={`empty:${index}`} aria-hidden="true"><td /><td /></tr>)}
        </tbody>
      </Table>
      <p className="relation-table-note">Authored diffs; matching full rows combine at one time.</p>
    </section>
    <CurrentRelation relation={relation} time={time} relationRef={relationRef} highlightCopies={highlightCopies} affectedRows={affectedRows} />
  </div>;
}

// This control is kept separate from the ledger's heading for accessible navigation.
function TimestampSelector({ shownTime, applied, disabled, onSelectTime }: { shownTime: number; applied: number; disabled: boolean; onSelectTime: (time: number) => void }) {
  return <nav className="batch-timestamps" aria-label="Inspect complete timestamps">
    {[0, ...lectureTwoBatches.map((batch) => batch.time)].map((time) => <button key={time} type="button" className="relation-timestamp-button"
      aria-label={`Inspect t = ${time}`} aria-pressed={time === shownTime} disabled={disabled || time > applied}
      onClick={() => onSelectTime(time)}>{time}</button>)}
  </nav>;
}
