import { DiffBadge } from './RelationWorkbench';
import { lectureTwoBatches, lectureTwoInitial, lectureTwoUpdates, type UpdateDiagramKind } from './lecture-two-scenario';
import { applyTimestamp, consolidateTimestamp, copiesOf, getRelationMetrics, relationAt, rowKey, type ProductRow, type RowMultiplicity } from './simulation';

function RowLabel({ row }: { row: ProductRow }) {
  return <span className="relation-inline relation-inline-row">({row.product}, ${row.price})</span>;
}

function RelationSummary({ relation }: { relation: readonly RowMultiplicity[] }) {
  return <div className="relation-diagram-final">{relation.map((entry) => <span key={rowKey(entry.row)}><RowLabel row={entry.row} /> × <b>{entry.copies}</b></span>)}</div>;
}

export function UpdateDiagram({ kind, time, revealed }: { kind: UpdateDiagramKind; time: number; revealed: boolean }) {
  const after = relationAt(lectureTwoUpdates, time, lectureTwoInitial);
  if (kind === 'start' || kind === 'recap') {
    const metrics = getRelationMetrics(after);
    return <div className="relation-diagram batch-diagram" role="group" aria-label={kind === 'start' ? 'Starting snapshot' : 'Final relation recap'}>
      <RelationSummary relation={after} />
      <div className="batch-diagram-footer"><span className="relation-inline relation-inline-time">t = {time}</span><strong>{metrics.totalCopies} copies · {metrics.distinctRows} full rows</strong></div>
    </div>;
  }
  if (kind === 'insert-only') {
    const insert = lectureTwoBatches[0].updates[1];
    const hypothetical = applyTimestamp(lectureTwoInitial, [insert]);
    const actualMetrics = getRelationMetrics(after);
    const hypotheticalMetrics = getRelationMetrics(hypothetical);
    return <div className="relation-diagram batch-diagram batch-comparison" role="group" aria-label="Correct update versus hypothetical insertion">
      <div><strong>Correct update</strong><span><RowLabel row={insert.row} /> × {copiesOf(after, insert.row)}</span><small>{actualMetrics.totalCopies} copies / {actualMetrics.distinctRows} full rows</small></div>
      <div><strong>Insert only · hypothetical</strong><span><RowLabel row={lectureTwoBatches[0].updates[0].row} /> + <RowLabel row={insert.row} /></span><small>{hypotheticalMetrics.totalCopies} copies / {hypotheticalMetrics.distinctRows} full rows · old value remains</small></div>
    </div>;
  }
  const batch = lectureTwoBatches.find((entry) => entry.time === time)!;
  const before = relationAt(lectureTwoUpdates, time - 1, lectureTwoInitial);
  if (kind === 'replace') {
    const previousMetrics = getRelationMetrics(before);
    const currentMetrics = getRelationMetrics(after);
    return <div className="relation-diagram batch-diagram" role="group" aria-label="Old and new full rows at one timestamp">
      <div className="batch-diagram-caption"><span className="relation-inline relation-inline-time">t = {time}</span><span>One complete update</span></div>
      <div className="batch-pair-head" aria-hidden="true"><span>Full row</span><span>Diff</span><span>Copies before → after</span></div>
      {batch.updates.map((update) => <div className="batch-pair-row" key={rowKey(update.row)}>
        <RowLabel row={update.row} /><DiffBadge diff={update.diff} /><strong>{copiesOf(before, update.row)} → {revealed ? copiesOf(after, update.row) : '—'}</strong>
      </div>)}
      <div className="batch-diagram-footer"><span>Total copies: {previousMetrics.totalCopies} → {revealed ? currentMetrics.totalCopies : '—'}</span><span>Full rows: {previousMetrics.distinctRows} → {revealed ? currentMetrics.distinctRows : '—'}</span></div>
    </div>;
  }
  const combined = consolidateTimestamp(batch.updates);
  if (kind === 'batch') {
    return <div className="relation-diagram batch-diagram" role="group" aria-label="Combined diffs by full row">
      {combined.map((update) => <div className="batch-equation" key={rowKey(update.row)}>
        <div><RowLabel row={update.row} /><span>{batch.updates.filter((record) => rowKey(record.row) === rowKey(update.row)).map((record, index) => <DiffBadge key={index} diff={record.diff} />)}<b>=</b><DiffBadge diff={update.diff} /></span></div>
        <small>Copies: {copiesOf(before, update.row)} → {revealed ? copiesOf(after, update.row) : '—'}{revealed && update.diff === 0 ? ' · unchanged' : ''}</small>
      </div>)}
    </div>;
  }
  if (kind === 'cancel') {
    const cancelled = combined.find((update) => update.diff === 0)!;
    const replacement = lectureTwoBatches[0].updates;
    return <div className="relation-diagram batch-diagram" role="group" aria-label="Cancellation versus replacement">
      <div className="batch-rule"><strong>Same full row · t = {time}</strong><span><RowLabel row={cancelled.row} /><DiffBadge diff={1} /><DiffBadge diff={-1} /><b>=</b><DiffBadge diff={cancelled.diff} /></span><small>{copiesOf(after, cancelled.row)} copy remains</small></div>
      <div className="batch-rule"><strong>Different full rows · t = 1</strong><span>{replacement.map((update) => <span key={rowKey(update.row)}><DiffBadge diff={update.diff} /><RowLabel row={update.row} /></span>)}</span><small>Same product, different price → replacement</small></div>
    </div>;
  }
  // Recompute the reversed complete batch with the same domain rule as playback.
  const reversed = [...batch.updates].reverse();
  const reorderedResult = applyTimestamp(before, reversed);
  return <div className="relation-diagram batch-diagram" role="group" aria-label="Reversed records give the same complete result">
    {[batch.updates, reversed].map((records, index) => <div className="batch-order" key={index}>
      <strong>{index === 0 ? 'Original order' : 'Reversed order'}</strong>
      <span>{records.map((record, position) => <span key={position}>{record.row.product}<DiffBadge diff={record.diff} /></span>)}</span>
    </div>)}
    <div className="batch-diagram-caption"><strong>Same completed relation</strong></div>
    <RelationSummary relation={reorderedResult} />
  </div>;
}
