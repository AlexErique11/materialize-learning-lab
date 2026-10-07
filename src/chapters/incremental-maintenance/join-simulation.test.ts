import { describe, expect, it } from 'vitest';
import { joinSnapshotAt } from './join-simulation';
import { joinChanges } from './join-scenario';

describe('incrementally maintained inner join', () => {
  it('retains an unmatched order, joins a late product, and retracts output without deleting the order', () => {
    expect(joinSnapshotAt(1).orders).toHaveLength(4);
    expect(joinSnapshotAt(1).outputDiffs).toEqual([]);
    expect(joinSnapshotAt(2).outputDiffs).toEqual([{ row: { orderId: 104, name: 'Mug', amount: 70 }, diff: 1 }]);
    expect(joinSnapshotAt(4).outputDiffs).toEqual([{ row: { orderId: 104, name: 'Mug', amount: 70 }, diff: -1 }]);
    expect(joinSnapshotAt(4).orders.some((order) => order.orderId === 104)).toBe(true);
  });
  it('replaces all matching rows while leaving unrelated output unchanged', () => {
    const before = joinSnapshotAt(2);
    const after = joinSnapshotAt(3);
    expect(after.outputDiffs.map(({ row, diff }) => [row.orderId, diff])).toEqual([[101, -1], [103, -1], [101, 1], [103, 1]]);
    expect(after.output.filter((row) => [102, 104].includes(row.orderId))).toEqual(before.output.filter((row) => [102, 104].includes(row.orderId)));
  });
  it('applying signed deltas agrees with independently recomputing SQL after every batch', () => {
    const maintained = new Map(joinSnapshotAt(0).output.map((row) => [JSON.stringify(row), 1]));
    for (let time = 1; time <= joinChanges.length; time++) {
      const snapshot = joinSnapshotAt(time);
      for (const { row, diff } of snapshot.outputDiffs) {
        const key = JSON.stringify(row);
        maintained.set(key, (maintained.get(key) ?? 0) + diff);
      }
      const recomputed = snapshot.orders.flatMap((order) => snapshot.products
        .filter((product) => product.productId === order.productId)
        .map((product) => JSON.stringify({ orderId: order.orderId, name: product.name, amount: order.amount })));
      expect([...maintained].filter(([, count]) => count !== 0).map(([key]) => key).sort()).toEqual(recomputed.sort());
      expect([...maintained.values()].every((count) => count === 0 || count === 1)).toBe(true);
    }
  });
});
