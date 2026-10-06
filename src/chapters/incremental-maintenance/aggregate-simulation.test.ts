import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { aggregateChanges, aggregateReference, initialOrders } from './aggregate-scenario';
import { aggregateSnapshotAt } from './aggregate-simulation';

it('maintains every displayed SQL result and complete signed batch', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE orders (order_id INTEGER, product_id INTEGER, amount INTEGER, note TEXT)');
    for (const row of initialOrders) db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?)').run(row.orderId, row.productId, row.amount, row.note);
    const query = aggregateReference.sql.split(' AS\n')[1]!.split(';')[0]!;
    const read = () => db.prepare(query).all().map((row) => ({ productId: row.product_id, count: row.order_count, total: row.revenue }));
    let previous = read();
    expect(aggregateSnapshotAt(0).output).toEqual(previous);
    for (const [index, change] of aggregateChanges.entries()) {
      if (!change.patch) db.prepare('DELETE FROM orders WHERE order_id = ?').run(change.orderId);
      else {
        for (const [field, value] of Object.entries(change.patch)) {
          const column = field === 'productId' ? 'product_id' : field;
          db.prepare('UPDATE orders SET ' + column + ' = ? WHERE order_id = ?').run(value, change.orderId);
        }
      }
      const current = read();
      const snapshot = aggregateSnapshotAt(index + 1);
      expect(snapshot.output).toEqual(current);
      const expected = [...previous.filter((row) => !current.some((other) => JSON.stringify(other) === JSON.stringify(row))).map((row) => ({ row, diff: -1 })),
        ...current.filter((row) => !previous.some((other) => JSON.stringify(other) === JSON.stringify(row))).map((row) => ({ row, diff: 1 }))];
      const sorted = (rows: readonly unknown[]) => rows.map((row) => JSON.stringify(row)).sort();
      expect(sorted(snapshot.outputDiffs)).toEqual(sorted(expected));
      previous = current;
    }
  } finally { db.close(); }
});

it('distinguishes zero revenue from absent groups and keeps unrelated groups unchanged', () => {
  expect(aggregateSnapshotAt(2).output).toEqual([{ productId: 7, count: 2, total: 110 }]);
  expect(aggregateSnapshotAt(3).outputDiffs).toHaveLength(3);
  expect(aggregateSnapshotAt(4).output).toContainEqual({ productId: 7, count: 1, total: 0 });
  expect(aggregateSnapshotAt(5).outputDiffs).toEqual([{ row: { productId: 7, count: 1, total: 0 }, diff: -1 }]);
});
