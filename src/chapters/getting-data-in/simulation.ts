import {
  initialProducts, snapshotActions,
  type IngestionPhase, type Product, type ProductChange, type ProductDiff, type SnapshotAction,
} from './scenario';

export interface CDCRecord {
  readonly change: ProductChange;
  readonly applied: boolean;
}

export interface SnapshotState {
  readonly upstream: readonly Product[];
  readonly relation: readonly Product[] | null;
  readonly snapshotRowsRead: number;
  readonly phase: IngestionPhase;
  readonly records: readonly CDCRecord[];
  readonly pendingCount: number;
  readonly upstreamDiffs: readonly ProductDiff[];
  readonly relationDiffs: readonly ProductDiff[];
}

function applyChange(rows: readonly Product[], change: ProductChange): Product[] {
  const productId = change.before?.productId ?? change.after!.productId;
  const remaining = rows.filter((row) => row.productId !== productId);
  return [...remaining, ...(change.after ? [change.after] : [])].sort((a, b) => a.productId - b.productId);
}

function diffsFor(change: ProductChange): ProductDiff[] {
  return [
    ...(change.before ? [{ row: change.before, diff: -1 as const }] : []),
    ...(change.after ? [{ row: change.after, diff: 1 as const }] : []),
  ];
}

// Read the fixed snapshot boundary, not the upstream catalog after later writes.
export interface SnapshotFixture {
  readonly initial: readonly Product[];
  readonly actions: readonly SnapshotAction[];
}

export function snapshotAt(checkpoint: number, fixture: SnapshotFixture = { initial: initialProducts, actions: snapshotActions }): SnapshotState {
  if (!Number.isInteger(checkpoint) || checkpoint < 0 || checkpoint > fixture.actions.length) {
    throw new RangeError('Unknown snapshot checkpoint.');
  }
  let upstream = [...fixture.initial];
  let relation: Product[] | null = null;
  let snapshotRowsRead = 0;
  let phase: IngestionPhase = 'Snapshotting';
  let records: CDCRecord[] = [];
  let upstreamDiffs: ProductDiff[] = [];
  let relationDiffs: ProductDiff[] = [];

  for (const action of fixture.actions.slice(0, checkpoint)) {
    upstreamDiffs = [];
    relationDiffs = [];
    switch (action.kind) {
      case 'read-snapshot':
        snapshotRowsRead = action.rowsRead;
        break;
      case 'upstream-change': {
        upstream = applyChange(upstream, action.change);
        upstreamDiffs = diffsFor(action.change);
        const applied = phase === 'Live';
        records = [...records, { change: action.change, applied }];
        if (applied) {
          relation = applyChange(relation!, action.change);
          relationDiffs = diffsFor(action.change);
        }
        break;
      }
      case 'commit-snapshot':
        relation = [...fixture.initial];
        relationDiffs = fixture.initial.map((row) => ({ row, diff: 1 }));
        phase = records.some((record) => !record.applied) ? 'Catch-up' : 'Live';
        break;
      case 'apply-cdc': {
        const pendingIndex = records.findIndex((record) => !record.applied);
        const next = records[pendingIndex]!;
        relation = applyChange(relation!, next.change);
        relationDiffs = diffsFor(next.change);
        records = records.map((record, index) => index === pendingIndex ? { ...record, applied: true } : record);
        phase = records.some((record) => !record.applied) ? 'Catch-up' : 'Live';
        break;
      }
    }
  }
  return {
    upstream, relation, snapshotRowsRead, phase, records,
    pendingCount: records.filter((record) => !record.applied).length,
    upstreamDiffs, relationDiffs,
  };
}
