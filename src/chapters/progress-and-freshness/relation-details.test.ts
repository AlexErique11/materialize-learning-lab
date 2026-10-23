import { describe, expect, it } from 'vitest';
import { diagnosisFixtures } from './lecture-scenarios';
import { relationDetails } from './relation-details';
import { applyProgress, fixture } from './simulation';

const facts = (details: ReturnType<typeof relationDetails>) => Object.fromEntries(details.facts.map(fact => [fact.label, fact.value]));

describe('selected relation evidence', () => {
  it('attributes the stalled status to Payments and computes each source lag separately', () => {
    const orders = relationDetails(diagnosisFixtures.source, 'orders');
    const payments = relationDetails(diagnosisFixtures.source, 'payments');
    expect(facts(orders)['Wall-clock lag']).toBe('2 s');
    expect(facts(payments)['Wall-clock lag']).toBe('12 s');
    expect(orders.explanation).not.toContain('stalled');
    expect(orders.explanation).toContain('ahead of Payments');
    expect(payments.explanation).toContain('Payments status: stalled');
    expect(payments.explanation).toContain('limits Paid orders');
  });

  it('keeps observations, reports and business event time separate', () => {
    const snapshot = applyProgress(applyProgress(fixture(15, 15, 15), { type: 'frontier', lane: 'orders', to: 17 }),
      { type: 'observe', lane: 'orders', change: { orderId: 202, logicalTime: 18, eventTime: 5 } });
    const details = relationDetails(snapshot, 'orders');
    expect(facts(details)).toEqual({ 'Progress reports': '15 → 17', 'Latest observed change': '18', 'Observed changes': '1' });
    expect(details.explanation).toContain('Seeing 18 does not complete earlier times');
    expect(details.explanation).toContain('Business event time 5 is separate from logical time 18');
  });

  it('shows the join adding computation delay while Revenue inherits it', () => {
    const join = relationDetails(diagnosisFixtures.compute, 'join');
    const revenue = relationDetails(diagnosisFixtures.compute, 'revenue');
    expect(facts(join)).toEqual({ 'Input limit': '18 s', 'Limiting input': 'Orders and Payments', 'Processing gap': '6 s' });
    expect(join.explanation).toContain('adds 6 s of computation delay');
    expect(join.explanation).toContain('40 → 90 changes');
    expect(facts(revenue)).toEqual({ 'Paid orders input limit': '12 s', 'Local lag': '0 s', 'Inherited computation lag': '6 s' });
    expect(revenue.explanation).toContain('adds no local delay');
    expect(revenue.explanation).toContain('Source lag: 2 s; total computation lag: 6 s; wall-clock lag: 8 s');
    expect(revenue.explanation).not.toContain('backlog');
  });

  it('separates Revenue local and inherited delay from source delay', () => {
    const details = relationDetails(fixture(20, 18, 16, { revenue: 13, showRevenue: true, clock: 22 }), 'revenue');
    expect(facts(details)['Local lag']).toBe('3 s');
    expect(facts(details)['Inherited computation lag']).toBe('2 s');
    expect(details.explanation).toContain('Source lag: 4 s; total computation lag: 5 s; wall-clock lag: 9 s');
  });

  it('does not turn arbitrary logical timestamps into seconds or sampled row counts', () => {
    const details = relationDetails(fixture(17, 11, 9), 'join');
    expect(facts(details)['Processing gap']).toBe('2');
    expect(details.explanation).toContain('logical-time gap is not a row count');
    expect(details.explanation).not.toContain('seconds');
    expect(details.explanation).not.toContain('backlog');
    expect(facts(relationDetails(fixture(17, 11, 9), 'orders'))['Latest observed change']).toBe('None observed');
  });

  it('treats frontier equality as an open query target', () => {
    const snapshot = fixture(20, 20, 20, { queryTarget: 20 });
    expect(relationDetails(snapshot, 'join').explanation).toContain('still open');
    expect(relationDetails({ ...snapshot, queryTarget: 19 }, 'join').explanation).toContain('complete at Paid orders');
  });

  it('keeps full-journey timings distinct from unmeasured per-stage durations', () => {
    const snapshot = fixture(20, 20, 20, { showRevenue: true, clock: 20, journey: { changed: 0, ready: 4, requested: 4, returned: 7 } });
    expect(relationDetails(snapshot, 'orders').explanation).toContain('source-only ingestion duration is not sampled');
    expect(relationDetails(snapshot, 'join').explanation).toContain('does not split computation duration');
    expect(relationDetails(snapshot, 'revenue').explanation).toContain('freshness delay 4 s + query latency 3 s = reaction time 7 s');
    expect(relationDetails(snapshot, 'revenue', false).explanation).not.toContain('freshness delay');
  });
});
