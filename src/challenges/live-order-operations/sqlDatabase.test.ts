import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { IncidentDatabase } from './sqlDatabase';
import { aggregateSql } from './predicate';
import { expectedAt, initialPredicate, ordersAt, repairedPredicate, traceTimes } from './incident';
let db: IncidentDatabase;
beforeAll(async () => { db = await IncidentDatabase.create(); }, 30000);
afterAll(async () => { await db?.close(); });
describe('actual PostgreSQL execution', () => {
  it('preserves separate values for duplicate diagnostic column names', async () => {
    const result = await db.execute('SELECT 1 AS x, 2 AS x', [], 630000);
    expect(result.fields.map(field => field.name)).toEqual(['x', 'x']);
    expect(result.values).toEqual([[1, 2]]);
  });
  it('executes equivalent SQL over every canonical and additional snapshot', async () => {
    for (const variant of [0, 1]) for (const time of traceTimes) {
      const result = await db.execute(aggregateSql(repairedPredicate), ordersAt(time, { envelope: 'UPSERT', key: 'order_id' }, variant), time);
      expect(result.rows.map(row => ({ region: row.region, orders: Number(row.orders), total: Number(row.total) }))).toEqual(expectedAt(time, variant));
    }
  }, 20000);
  it('returns genuinely different rows for the inherited query and user diagnostics', async () => {
    const rows = ordersAt(620000, { envelope: 'UPSERT', key: 'order_id' });
    const bad = await db.execute(aggregateSql(initialPredicate), rows, 620000);
    const fixed = await db.execute(aggregateSql(repairedPredicate), rows, 620000);
    expect(bad.rows).not.toEqual(fixed.rows);
    const diagnostic = await db.execute('SELECT order_id, status FROM orders WHERE order_id = 104', rows, 620000);
    expect(diagnostic.rows).toEqual([{ order_id: 104, status: 'paid' }]);
  });
  it.each(['DELETE FROM orders', 'SELECT 1; DELETE FROM orders', 'WITH removed AS (DELETE FROM orders RETURNING *) SELECT * FROM removed', 'UPDATE lab_clock SET at = now()', 'CREATE TABLE evil (n integer)'])('rejects writes and multiple statements and restores its snapshot: %s', async sql => {
    await expect(db.execute(sql, ordersAt(630000, { envelope: 'UPSERT', key: 'order_id' }), 630000)).rejects.toThrow();
    const result = await db.execute('SELECT COUNT(*) AS n FROM orders', ordersAt(630000, { envelope: 'UPSERT', key: 'order_id' }), 630000);
    expect(Number(result.rows[0]!.n)).toBe(6);
  });
  it('surfaces real syntax errors and freezes the UTC clock', async () => {
    await expect(db.execute('SELECT does_not_exist FROM orders', [], 630000)).rejects.toThrow();
    const result = await db.execute('SELECT mz_now() AS time', [], 630000);
    expect((result.rows[0]!.time as Date).toISOString()).toBe('2026-01-01T00:10:30.000Z');
  });
  it('bounds diagnostic rows in PostgreSQL and discards the cursor after each request', async () => {
    const result = await db.execute('SELECT generate_series(1, 1000000) AS n;', [], 630000);
    expect(result.rows).toHaveLength(200);
    expect(result.truncated).toBe(true);
    expect(result.rows.at(-1)).toEqual({ n: 200 });
    expect(result.fields).toEqual([{ name: 'n', dataTypeID: 23 }]);
    expect((await db.execute('SELECT 42 AS answer', [], 630000)).rows).toEqual([{ answer: 42 }]);
  });
});
