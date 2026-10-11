import { Clock3 } from 'lucide-react';
import { DiffBadge } from '../../components/lesson/DiffBadge';
import { EmptyTableRows } from '../../components/ui/EmptyTableRows';
import { Table } from '../../components/ui/Table';
import { type ProductDiff, type SnapshotStage } from './scenario';
import type { SnapshotState } from './simulation';
import { ProductTable, ProductTuple } from './ProductTable';

function ProductDiffs({ entries, label, unavailable = false, snapshotCommitted = false }: {
  entries: readonly ProductDiff[]; label: string; unavailable?: boolean; snapshotCommitted?: boolean;
}) {
  return <section className="maintenance-diffs" aria-label={label}>
    <h3>{label}</h3>
    {snapshotCommitted ? <p>Snapshot committed: <strong>{entries.length} rows</strong> added together.</p> : entries.length ? <ul>{entries.map(({ row, diff }) => {
      const opposite = entries.find((entry) => entry.diff !== diff && entry.row.productId === row.productId);
      return <li key={row.productId + ':' + diff}>
        <DiffBadge diff={diff} />
        <ProductTuple row={row} opposite={opposite?.row} />
      </li>;
    })}</ul> : <p>{unavailable ? 'Waiting for snapshot commitment' : 'No net changes'}</p>}
  </section>;
}

function IngestionPanel({ state, highlight }: { state: SnapshotState; highlight: boolean }) {
  const changes = [...state.upstreamDiffs, ...state.relationDiffs];
  return <>
    <div className="snapshot-table-frame">
      <Table caption="CDC operations" className="snapshot-cdc-table">
        <thead><tr><th aria-label="product_id"><span className="snapshot-id-full">product_id</span><span className="snapshot-id-short">ID</span></th>
          <th>Action</th><th>Change</th><th>Status</th></tr></thead>
        <tbody>
          {state.records.map(({ change, applied }, index) => {
            const row = (change.after ?? change.before)!;
            const action = change.before ? change.after ? 'Update' : 'Delete' : 'Insert';
            const detail = change.before && change.after ? '$' + change.before.price + ' → $' + change.after.price : row.name;
            return <tr key={index} data-affected={highlight && changes.some((entry) => entry.row.productId === row.productId)}>
              <td>{row.productId}</td><td aria-label={action + ': ' + detail} title={detail}>{action}</td><td>{detail}</td>
              <td><span className="snapshot-record-status" data-applied={applied}>{applied ? 'Applied' : 'Queued'}</span></td>
            </tr>;
          })}
          <EmptyTableRows count={4 - state.records.length} columns={4} />
        </tbody>
      </Table>
      {state.records.length === 0 && <div className="snapshot-table-message"><p>No CDC changes yet</p></div>}
    </div>
  </>;
}

export function SnapshotPanelContent({ stage, state, highlight }: {
  stage: SnapshotStage; state: SnapshotState; highlight: boolean;
}) {
  if (stage === 'ingestion') return <IngestionPanel state={state} highlight={highlight} />;
  if (stage === 'source') return <>
    <ProductTable rows={state.upstream} caption="Upstream products" diffs={state.upstreamDiffs} highlight={highlight} />
    <ProductDiffs entries={state.upstreamDiffs} label="Upstream changes" />
  </>;
  return <>
    <div className="snapshot-table-frame">
      <ProductTable rows={state.relation ?? []} caption="Materialize products" diffs={state.relationDiffs} highlight={highlight} />
      {state.relation === null && <div className="snapshot-table-message" role="status" aria-label="Table availability">
        <Clock3 size={22} aria-hidden="true" />
        <strong>Snapshot in progress</strong><p>Queries waiting</p>
      </div>}
    </div>
    <ProductDiffs entries={state.relationDiffs} label="Applied changes" unavailable={state.relation === null}
      snapshotCommitted={state.relation !== null && state.records.every((record) => !record.applied)} />
  </>;
}
