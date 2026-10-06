import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { comparisonOrders, comparisonReference, comparisonRunDefinition } from './comparison-scenario';
import { comparisonSnapshotAt } from './comparison-simulation';

it('both algorithms agree with the displayed SQL at every complete batch', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE orders (order_id INTEGER, product_id INTEGER, amount INTEGER, note TEXT)');
    const insert = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?)');
    const query = comparisonReference.sql.split(' AS\n')[1]!.split(';')[0]!;
    for (let time = 0; time <= comparisonRunDefinition.totalChanges; time++) {
      const state = comparisonSnapshotAt(time);
      db.exec('DELETE FROM orders');
      for (const row of state.orders) insert.run(row.orderId, row.productId, row.amount, row.note);
      const result = db.prepare(query).all().map((row) => ({ productId: row.product_id, count: row.order_count, total: row.revenue })).sort((a, b) => Number(a.productId) - Number(b.productId));
      expect(state.output).toEqual(result);
      expect(state.recomputed).toEqual(result);
    }
    expect(comparisonSnapshotAt(0).orders).toEqual(comparisonOrders);
  } finally { db.close(); }
});

it('models local changes, two-key changes, cancellation, and a broad batch', () => {
  expect([0, 1, 2, 3, 4].map((time) => comparisonSnapshotAt(time).contributionCount)).toEqual([6, 2, 2, 0, 12]);
  expect([0, 1, 2, 3, 4].map((time) => comparisonSnapshotAt(time).affectedKeys.length)).toEqual([3, 1, 2, 0, 3]);
  expect([0, 1, 2, 3, 4].map((time) => comparisonSnapshotAt(time).affectedKeys)).toEqual([[7, 8, 9], [7], [8, 7], [], [7, 8, 9]]);
  expect([0, 1, 2, 3, 4].map((time) => comparisonSnapshotAt(time).recomputed.length)).toEqual([3, 3, 3, 3, 3]);
  expect([0, 1, 2, 3, 4].map((time) => comparisonSnapshotAt(time).outputChanged)).toEqual([false, true, true, false, true]);
  const correction = comparisonSnapshotAt(1);
  expect(correction.output.find((row) => row.productId === 9)).toBe(correction.previous.find((row) => row.productId === 9));
  expect(comparisonSnapshotAt(2).output).toEqual([
    { productId: 7, count: 3, total: 190 }, { productId: 8, count: 1, total: 20 }, { productId: 9, count: 2, total: 100 },
  ]);
  expect(comparisonSnapshotAt(3).output).toEqual(comparisonSnapshotAt(2).output);
  expect(comparisonSnapshotAt(4).output.map(({ total }) => total)).toEqual([490, 120, 300]);
});
