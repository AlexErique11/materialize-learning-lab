import { describe, expect, it } from 'vitest';
import { aggregate, ingest, producerHistory, qualifies, runOrders, correctQuery } from './simulation';
import { clientState, expectedAt, frontiers, initialConfiguration, objectCost, ordersAt, requestRead, traceTimes } from './incident';
const trace = traceTimes.map(time => ({ time, rows: [...expectedAt(time)] }));
describe('incident world', () => {
  it('matches the hand-authored order oracle at complete times', () => {
    expect(runOrders().map(frame => frame.rows.map(r => [r.region, r.orders, r.total]))).toEqual([
      [['EU', 2, 100], ['US', 1, 25]], [['EU', 2, 130], ['US', 1, 25]], [['EU', 1, 70], ['US', 1, 25]],
      [['EU', 2, 90], ['US', 1, 25]], [['EU', 2, 90], ['US', 1, 25]], [['EU', 2, 90], ['US', 1, 25]],
      [['EU', 2, 90]], [['EU', 1, 70], ['US', 1, 35]], [['EU', 1, 70], ['US', 1, 35]], [['EU', 1, 70], ['US', 1, 35]], [['EU', 1, 90], ['US', 1, 35]],
    ]);
  });
  it('ingests current keyed values without mutating the retained log', () => {
    const copy = JSON.stringify(producerHistory);
    const source = { envelope: 'UPSERT', key: 'order_id' };
    const rows = producerHistory.reduce<readonly typeof producerHistory[number][]>((rows, record) => ingest(rows, record, source), []);
    expect(rows).toHaveLength(3); expect(JSON.stringify(producerHistory)).toBe(copy);
    expect(aggregate(rows)).toEqual([{ region: 'EU', orders: 2, total: 100 }, { region: 'US', orders: 1, total: 25 }]);
  });
  it('distinguishes source rows from query membership at exact boundaries', () => {
    const late = ordersAt(603000, { envelope: 'UPSERT', key: 'order_id' }).find(r => r.orderId === 104)!;
    expect(qualifies(late, 619999, correctQuery)).toBe(true); expect(qualifies(late, 620000, correctQuery)).toBe(false);
    expect(ordersAt(620000, { envelope: 'UPSERT', key: 'order_id' }).some(r => r.orderId === 104)).toBe(true);
  });
  it('makes every configuration affect the same order world', () => {
    expect(ordersAt(630000, { envelope: 'NONE', key: 'order_id' }).length).toBeGreaterThan(ordersAt(630000, { envelope: 'UPSERT', key: 'order_id' }).length);
    expect(ordersAt(630000, { envelope: 'UPSERT', key: 'customer_id' })).toHaveLength(2);
    expect(expectedAt(620000, 1)).not.toEqual(expectedAt(620000));
  });
  it('separates permitted progress, computation, and a new read', () => {
    const config = initialConfiguration();
    expect(requestRead(config, 630000, false)).toMatchObject({ status: 'stale', timestamp: 622999, age: 7001 });
    expect(requestRead(config, 630000, false, true)).toMatchObject({ status: 'available', timestamp: 622999 });
    config.connected = true;
    expect(frontiers(config, 630000, false).customers).toBe(630001);
    expect(frontiers(config, 630000, false).output).toBe(623000);
    expect(requestRead(config, 630000, true)).toMatchObject({ status: 'available', timestamp: 630000 });
    expect(frontiers(config, 632000, true).output).toBe(632001);
    expect(requestRead({ ...config, indexes: 'none' }, 630000, true).status).toBe('waiting');
  });
  it('publishes only complete signed replacements at strictly later progress', () => {
    const config = { ...initialConfiguration(), publication: 'complete' as const };
    expect(clientState(trace, config, 4).published[0]?.row.total).toBe(70);
    for (const n of [5, 6, 7]) expect(clientState(trace, config, n).published[0]?.row.total).toBe(70);
    expect(clientState(trace, config, 8).published[0]?.row.total).toBe(90);
    expect(clientState(trace, { ...config, publication: 'each' }, 5).published.some(r => r.row.region === 'EU')).toBe(false);
    expect(clientState(trace, { ...config, publication: 'equal' }, 6).published.some(r => r.row.region === 'EU')).toBe(false);
  });
  it('uses eight illustrative units for the shared serving contract', () => {
    expect(objectCost(initialConfiguration())).toBe(8);
    expect(objectCost({ ...initialConfiguration(), helper: 'materialized' })).toBe(12);
  });
});
