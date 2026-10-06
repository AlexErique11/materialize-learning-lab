import { ArrowRight, Database, List } from 'lucide-react';
import { DiffBadge } from './RelationWorkbench';
import { lectureUpdates, type LectureDiagramKind } from './scenario';
import { applyTimestamp, copiesOf, getRelationMetrics, relationAt, rowKey, type ProductRow } from './simulation';

function RowLabel({ row }: { row: ProductRow }) {
  return <span className="relation-inline relation-inline-row">({row.product}, ${row.price})</span>;
}

function CountTransition({ before, diff, after }: { before: number; diff: number; after: number | null }) {
  return <div className="relation-count-transition" role="group" aria-label="Copy-count transition">
    <div><span>Previous copies</span><strong>{before}</strong></div>
    <div><span>Signed diff</span><DiffBadge diff={diff} /></div>
    <ArrowRight size={17} aria-hidden="true" />
    <div><span>Current copies</span><strong className={after === 0 ? 'relation-result-zero' : ''}>{after ?? '—'}</strong></div>
  </div>;
}

function MetricComparison({ label, before, after, revealed, maximum, unit }: {
  label: string; before: number; after: number; revealed: boolean; maximum: number; unit: string;
}) {
  const count = revealed ? after : before;
  return <div className="relation-metric-comparison" role="group" aria-label={label}>
    <div><span>{label}</span><strong>{before} → {revealed ? after : '—'}</strong></div>
    <div className="relation-diagram-bar" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${maximum}, 1fr)` }}>
      {Array.from({ length: maximum }, (_, index) => <span key={index} className={index < before ? 'relation-bar-existing' : index < count ? 'relation-bar-added' : ''} />)}
    </div>
    <small>Each block = one {unit}{revealed && <b>+{after - before}</b>}</small>
  </div>;
}

export function GuidedDiagram({ kind, time, revealed }: { kind: LectureDiagramKind; time: number; revealed: boolean }) {
  if (kind === 'overview') {
    return <div className="relation-diagram relation-diagram-flow" role="group" aria-label="Changes become current state">
      <div><List size={20} aria-hidden="true" /><strong>Change ledger</strong><span>What changed over time</span></div>
      <ArrowRight size={20} aria-hidden="true" />
      <div><Database size={20} aria-hidden="true" /><strong>Current relation</strong><span>Which copies remain</span></div>
    </div>;
  }
  if (kind === 'record') {
    const update = lectureUpdates[0]!;
    return <div className="relation-diagram relation-diagram-record" role="group" aria-label="Anatomy of a change record">
      <div><span>Full row</span><RowLabel row={update.row} /><small>Which values</small></div>
      <div><span>Logical time</span><b className="relation-inline relation-inline-time">t = {update.time}</b><small>When it applies</small></div>
      <div><span>Signed diff</span><DiffBadge diff={update.diff} /><small>How many copies</small></div>
    </div>;
  }
  if (kind === 'recap') {
    const relation = relationAt(lectureUpdates, time);
    return <div className="relation-diagram" role="group" aria-label="Signed-diff rule and final relation">
      <div className="relation-diagram-rule"><span>Previous copies</span><b>+</b><span>Signed diff</span><b>=</b><span>Current copies</span></div>
      <div className="relation-diagram-final">{relation.map((entry) => <span key={rowKey(entry.row)}><RowLabel row={entry.row} /> × <b>{entry.copies}</b></span>)}</div>
    </div>;
  }

  const update = lectureUpdates.find((change) => change.time === time)!;
  const before = relationAt(lectureUpdates, time - 1);
  const after = relationAt(lectureUpdates, time);
  const beforeCopies = copiesOf(before, update.row);
  const afterCopies = copiesOf(after, update.row);

  if (kind === 'metrics') {
    const previousMetrics = getRelationMetrics(before);
    const currentMetrics = getRelationMetrics(after);
    const maximum = Math.max(...lectureUpdates.map((change) => getRelationMetrics(relationAt(lectureUpdates, change.time)).totalCopies));
    return <div className="relation-diagram relation-diagram-metrics" role="group" aria-label="Copies and distinct rows compared">
      <MetricComparison label="Total row copies" before={previousMetrics.totalCopies} after={currentMetrics.totalCopies} revealed={revealed} maximum={maximum} unit="copy" />
      <MetricComparison label="Distinct full rows" before={previousMetrics.distinctRows} after={currentMetrics.distinctRows} revealed={revealed} maximum={maximum} unit="full row" />
    </div>;
  }

  const comparisonRow = lectureUpdates[0]!.row;
  return <div className="relation-diagram" role="group" aria-label="Effect on the full row">
    <div className="relation-diagram-row"><RowLabel row={update.row} /><span>{revealed ? 'Effect on this row' : 'Upcoming change'}</span></div>
    <CountTransition before={beforeCopies} diff={update.diff} after={revealed ? afterCopies : null} />
    {kind === 'copies' && <div className="relation-copy-group">
      <div aria-hidden="true">{Array.from({ length: update.diff }, (_, index) => <span key={index} />)}</div>
      <span>{update.diff} identical copies{revealed ? ' → one grouped table line' : ' in this change'}</span>
    </div>}
    {kind === 'new-row' && <div className="relation-steady-row"><RowLabel row={comparisonRow} /><span>{copiesOf(after, comparisonRow)} copies · unchanged</span></div>}
    {kind === 'removal' && revealed && <>
      <div className="relation-diagram-comparison" role="group" aria-label="Hypothetical partial retraction">
        <span>If the same diff targeted A instead</span>
        <div><RowLabel row={comparisonRow} /><b>{copiesOf(before, comparisonRow)} − {Math.abs(update.diff)} = {copiesOf(applyTimestamp(before, [{ ...update, row: comparisonRow }]), comparisonRow)}</b><span>Still present</span></div>
      </div>
    </>}
  </div>;
}
