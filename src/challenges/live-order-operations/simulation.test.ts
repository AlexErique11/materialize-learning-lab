import { describe, expect, it } from 'vitest';
import { applyRead, classifyTimestamp } from '../../chapters/consistent-reads/simulation';
import { aggregate, boundedRead, clientAt, clientPreview, correctQuery, correctSource, ingest, producerHistory, progressState, qualifies, readFixture, resultDiffs, runOrders, stateCost, strictRead } from './simulation';

describe('flash-sale order simulation', () => {
  it('matches the independently authored incident oracle at every event', () => {
    const expected = [
      [['EU', 2, 100], ['US', 1, 25]], [['EU', 2, 130], ['US', 1, 25]],
      [['EU', 1, 70], ['US', 1, 25]], [['EU', 2, 90], ['US', 1, 25]],
      [['EU', 2, 90], ['US', 1, 25]], [['EU', 2, 90], ['US', 1, 25]],
      [['EU', 2, 90]], [['EU', 1, 70], ['US', 1, 35]],
      [['EU', 1, 70], ['US', 1, 35]], [['EU', 1, 70], ['US', 1, 35]],
      [['EU', 1, 90], ['US', 1, 35]],
    ];
    const trace = runOrders();
    expect(trace.map(snapshot => snapshot.rows.map(row => [row.region, row.orders, row.total]))).toEqual(expected);
    for (const snapshot of trace) expect(snapshot.rows).toEqual(aggregate(snapshot.eligible));
  });
  it('replaces an aggregate full row and removes an empty group without inventing zero rows', () => {
    const trace = runOrders();
    expect(trace[1]!.diffs).toEqual([{ row: { region: 'EU', orders: 2, total: 100 }, diff: -1 }, { row: { region: 'EU', orders: 2, total: 130 }, diff: 1 }]);
    expect(trace[6]!.diffs).toEqual([{ row: { region: 'US', orders: 1, total: 25 }, diff: -1 }]);
    expect(trace[7]!.orders.map(row => row.orderId)).toContain(103);
    expect(trace[7]!.diffs).toEqual([{ row: { region: 'EU', orders: 2, total: 90 }, diff: -1 }, { row: { region: 'EU', orders: 1, total: 70 }, diff: 1 }, { row: { region: 'US', orders: 1, total: 35 }, diff: 1 }]);
  });
  it('shows distinct wrong-envelope and wrong-key consequences', () => {
    expect(runOrders({ envelope: 'NONE', key: 'order_id' })[0]!.rows[0]).toEqual({ region: 'EU', orders: 3, total: 130 });
    expect(runOrders({ envelope: 'UPSERT', key: 'customer_id' })[0]!.rows[0]).toEqual({ region: 'EU', orders: 1, total: 60 });
    expect(runOrders({ envelope: 'DEBEZIUM', key: 'order_id' })[0]!.orders).toEqual([]);
    expect(producerHistory).toHaveLength(4);
  });
  it('handles lower and exact expiration boundaries at millisecond precision', () => {
    const future = runOrders()[5]!.orders.find(row => row.orderId === 106)!;
    expect(qualifies(future, 619999, correctQuery)).toBe(false);
    expect(qualifies(future, 620000, correctQuery)).toBe(true);
    expect(qualifies(future, 919999, correctQuery)).toBe(true);
    expect(qualifies(future, 920000, correctQuery)).toBe(false);
    expect(qualifies(future, 920000, { ...correctQuery, upper: 'inclusive' })).toBe(true);
    expect(runOrders(correctSource, { ...correctQuery, lower: false })[5]!.rows[1]?.total).toBe(60);
    expect(runOrders(correctSource, { ...correctQuery, upper: 'arrival' })[4]!.eligible.some(row => row.orderId === 105)).toBe(true);
  });
  it('keeps replays immutable, deterministic, and limited to changed groups', () => {
    const first = runOrders();
    const snapshot = JSON.stringify(first);
    expect(runOrders()).toEqual(first);
    expect(JSON.stringify(first)).toBe(snapshot);
    expect(first[0]!.rows[1]).toBe(first[1]!.rows[1]);
    const existing = [...producerHistory];
    ingest(existing, { ...producerHistory[0]!, amount: 99 }, correctSource);
    expect(existing[0]?.amount).toBe(30);
    expect(resultDiffs(first[0]!.rows, first[0]!.rows)).toEqual([]);
  });
  it('computes the illustrative object budget from choices', () => {
    expect(stateCost({ helper: 'view', final: 'materialized', indexes: 'both' })).toBe(8);
    expect(stateCost({ helper: 'materialized', final: 'materialized', indexes: 'both' })).toBe(12);
  });
});

describe('incident read and live-client evidence', () => {
  it('separates the limiting input, permitted progress, and actual catch-up', () => {
    expect(progressState()).toMatchObject({ orders: 630001, customers: 623000, permitted: 623000, aggregate: 623000, serving: 623000 });
    expect(progressState(true)).toMatchObject({ customers: 630001, permitted: 630001, aggregate: 623000, serving: 623000 });
    expect(progressState(true, true)).toMatchObject({ aggregate: 630001, serving: 630001 });
    expect(() => progressState(false, true)).toThrow();
  });
  it('intersects retained windows and uses an exclusive write boundary', () => {
    const fixture = readFixture();
    expect(classifyTimestamp(fixture, 609999)).toBe('too-old');
    expect(classifyTimestamp(fixture, 610000)).toBe('available');
    expect(classifyTimestamp(fixture, 622999)).toBe('available');
    expect(classifyTimestamp(fixture, 623000)).toBe('waiting');
    expect(boundedRead(3000)).toMatchObject({ status: 'stale', timestamp: 622999, age: 7001 });
    expect(boundedRead(10000)).toMatchObject({ status: 'available', timestamp: 622999, age: 7001 });
    expect(strictRead()).toMatchObject({ status: 'waiting', timestamp: 630000 });
    expect(boundedRead(3000, true)).toMatchObject({ status: 'available', timestamp: 630000, age: 0 });
    const failed = applyRead(fixture, { type: 'request', request: { policy: 'bounded', bound: 3000 } });
    expect(applyRead(failed, { type: 'frontier', input: 0, write: 630001 }).attempt?.status).toBe('stale');
  });
  it('holds the baseline and partial replacement until strictly later progress', () => {
    for (const count of [0, 1, 2, 3]) expect(clientAt(count).ready).toBe(false);
    expect(clientAt(4).published.map(item => item.row.total)).toEqual([70, 35]);
    for (const count of [5, 6, 7]) expect(clientAt(count).published.map(item => item.row.total)).toEqual([70, 35]);
    expect(clientAt(8)).toMatchObject({ publishedBefore: 632001, pending: [] });
    expect(clientAt(8).published.map(item => item.row.total)).toEqual([90, 35]);
  });
  it('illustrates incomplete-client consequences without mutating reference delivery', () => {
    expect(clientPreview({ snapshot: 'on', apply: 'signed', publish: 'each' }, 5).map(row => row.region)).toEqual(['US']);
    expect(clientPreview({ snapshot: 'on', apply: 'signed', publish: 'equal' }, 6).map(row => row.region)).toEqual(['US']);
    expect(clientPreview({ snapshot: 'on', apply: 'positive', publish: 'later' }, 8).filter(row => row.region === 'EU')).toHaveLength(2);
    expect(clientPreview({ snapshot: 'off', apply: 'signed', publish: 'later' }, 8)).toEqual([]);
    expect(clientAt(8).published).toHaveLength(2);
  });
});
