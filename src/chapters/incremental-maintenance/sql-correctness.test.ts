import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { changes, initialOrders, lectureReference } from './scenario';
import { initialProducts, joinChanges, joinReference } from './join-scenario';
import { snapshotAt } from './simulation';
import { joinSnapshotAt } from './join-simulation';

// These scenarios use ordinary SQL supported by SQLite. Execute the displayed
// query independently of the simulation; Materialize-specific behavior is
// checked against the official documentation, not inferred from SQLite.
function createInputs() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE orders (order_id INTEGER, product_id INTEGER, amount INTEGER, note TEXT); CREATE TABLE products (product_id INTEGER, name TEXT);');
  for (const row of initialOrders) db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?)').run(row.orderId, row.productId, row.amount, row.note);
  for (const row of initialProducts) db.prepare('INSERT INTO products VALUES (?, ?)').run(row.productId, row.name);
  return db;
}

function queryFromReference(sql: string) {
  return sql.split(' AS\n')[1]!.split(';')[0]!;
}

function rowKeys(rows: readonly unknown[]) { return rows.map((row) => JSON.stringify(row)).sort(); }
function sqlDiffs(before: readonly unknown[], after: readonly unknown[]) {
  const counts = new Map<string, number>();
  for (const [rows, sign] of [[before, -1], [after, 1]] as const) {
    for (const key of rowKeys(rows)) counts.set(key, (counts.get(key) ?? 0) + sign);
  }
  return [...counts].filter(([, diff]) => diff !== 0).sort(([a], [b]) => a.localeCompare(b));
}

describe('Chapter 2 simulations match the displayed SQL', () => {
  it('matches every filter/projection snapshot and complete output batch', () => {
    const db = createInputs();
    try {
      const read = () => db.prepare(queryFromReference(lectureReference.sql)).all().map((row) => ({ orderId: row.order_id, amount: row.amount }));
      let previous = read();
      expect(rowKeys(snapshotAt(0).output)).toEqual(rowKeys(previous));
      for (const [index, change] of changes.entries()) {
        if (change.patch === null) db.prepare('DELETE FROM orders WHERE order_id = ?').run(change.orderId);
        else {
          if ('amount' in change.patch) db.prepare('UPDATE orders SET amount = ? WHERE order_id = ?').run(change.patch.amount, change.orderId);
          if ('note' in change.patch) db.prepare('UPDATE orders SET note = ? WHERE order_id = ?').run(change.patch.note, change.orderId);
        }
        const current = read();
        const snapshot = snapshotAt(index + 1);
        expect(rowKeys(snapshot.output)).toEqual(rowKeys(current));
        expect(snapshot.outputDiffs.map(({ row, diff }) => [JSON.stringify(row), diff]).sort(([a], [b]) => String(a).localeCompare(String(b))))
          .toEqual(sqlDiffs(previous, current));
        previous = current;
      }
    } finally { db.close(); }
  });

  it('matches every inner join snapshot and complete output batch', () => {
    const db = createInputs();
    try {
      const read = () => db.prepare(queryFromReference(joinReference.sql)).all().map((row) => ({ orderId: row.order_id, name: row.name, amount: row.amount }));
      let previous = read();
      expect(rowKeys(joinSnapshotAt(0).output)).toEqual(rowKeys(previous));
      for (const [index, change] of joinChanges.entries()) {
        if (change.input === 'orders') db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?)').run(change.row.orderId, change.row.productId, change.row.amount, change.row.note);
        else {
          if (change.oldRow) db.prepare('DELETE FROM products WHERE product_id = ?').run(change.oldRow.productId);
          if (change.newRow) db.prepare('INSERT INTO products VALUES (?, ?)').run(change.newRow.productId, change.newRow.name);
        }
        const current = read();
        const snapshot = joinSnapshotAt(index + 1);
        expect(rowKeys(snapshot.output)).toEqual(rowKeys(current));
        expect(snapshot.outputDiffs.map(({ row, diff }) => [JSON.stringify(row), diff]).sort(([a], [b]) => String(a).localeCompare(String(b))))
          .toEqual(sqlDiffs(previous, current));
        previous = current;
      }
    } finally { db.close(); }
  });
});
