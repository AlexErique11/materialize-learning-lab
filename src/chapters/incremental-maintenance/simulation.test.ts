import { describe, expect, it } from 'vitest';
import { changes, type OutputRow, type Diff } from './scenario';
import { consolidate, snapshotAt } from './simulation';

describe('filter and projection maintenance', () => {
  it('preserves positive copy counts instead of treating consolidation as DISTINCT', () => {
    const row = { orderId: 103, amount: 50 };
    expect(consolidate([{ row, diff: 1 }, { row, diff: 1 }])).toEqual([{ row, diff: 2 }]);
    expect(consolidate([{ row, diff: 2 }, { row, diff: -1 }])).toEqual([{ row, diff: 1 }]);
  });
  it('computes initial membership including the exact threshold', () => {
    const start = snapshotAt(0);
    expect(start.source).toHaveLength(3);
    expect(start.output).toEqual([{ orderId: 102, amount: 80 }, { orderId: 103, amount: 50 }]);
    expect(start.outputDiffs).toEqual([]);
  });
  it('adds and retracts rows crossing the boundary', () => {
    expect(snapshotAt(1).outputDiffs).toEqual([{ row: { orderId: 101, amount: 60 }, diff: 1 }]);
    expect(snapshotAt(3).outputDiffs).toEqual([{ row: { orderId: 101, amount: 60 }, diff: -1 }]);
  });
  it('cancels a qualifying unused-column update only after projection', () => {
    const edit = snapshotAt(2);
    expect(edit.source.find((row) => row.orderId === 103)?.note).toBe('Express delivery');
    expect(edit.filterDiffs).toHaveLength(2);
    expect(edit.projectedDiffs).toEqual([
      { row: { orderId: 103, amount: 50 }, diff: -1 },
      { row: { orderId: 103, amount: 50 }, diff: 1 },
    ]);
    expect(edit.outputDiffs).toEqual([]);
    expect(edit.output).toEqual(snapshotAt(1).output);
  });
  it('replaces a selected amount and removes a deleted qualifying row', () => {
    expect(snapshotAt(4).outputDiffs).toEqual([
      { row: { orderId: 102, amount: 80 }, diff: -1 },
      { row: { orderId: 102, amount: 90 }, diff: 1 },
    ]);
    expect(snapshotAt(5).outputDiffs).toEqual([{ row: { orderId: 103, amount: 50 }, diff: -1 }]);
    expect(snapshotAt(5).output).toEqual([{ orderId: 102, amount: 90 }]);
  });
  it('reconstructs the same result by applying emitted changes as by rerunning SQL', () => {
    let maintained: Diff<OutputRow>[] = snapshotAt(0).output.map((row) => ({ row, diff: 1 }));
    for (let time = 1; time <= changes.length; time++) {
      const snapshot = snapshotAt(time);
      maintained = consolidate([...maintained, ...snapshot.outputDiffs]);
      expect(maintained.every((entry) => entry.diff === 1)).toBe(true);
      expect(maintained.map((entry) => entry.row).sort((a, b) => a.orderId - b.orderId)).toEqual(snapshot.output);
    }
  });
});
