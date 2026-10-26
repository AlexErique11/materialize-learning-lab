import { describe, expect, it } from 'vitest';
import { applySubscription, applySubscriptions, canonicalRecords, consolidate, createSubscription, data, deliveryAt, duplicateStart, eu100, eu130, progress, receive, snapshotOff, timestampGroups, us50 } from './simulation';

describe('subscription delivery and publication', () => {
  it('keeps the initial progress and partial snapshot in loading state', () => {
    for (const count of [0, 1, 2, 3]) expect(deliveryAt(count).ready).toBe(false);
    expect(deliveryAt(4)).toMatchObject({ ready: true, publishedBefore: 11, published: [{ row: eu100, count: 1 }, { row: us50, count: 1 }] });
  });
  it('does not close a timestamp at equality or after an apparent replacement pair', () => {
    for (const count of [5, 6, 7]) {
      expect(deliveryAt(count).published[0]?.row).toEqual(eu100);
      expect(timestampGroups(deliveryAt(count)).at(-1)?.complete).toBe(false);
    }
    expect(deliveryAt(8)).toMatchObject({ publishedBefore: 13, pending: [], published: [{ row: eu130, count: 1 }, { row: us50, count: 1 }] });
  });
  it('advances on quiet progress and distinguishes knowledge from publication', () => {
    expect(deliveryAt(9).published).toEqual(deliveryAt(8).published);
    expect(deliveryAt(10)).toMatchObject({ knownCompleteBefore: 15, publishedBefore: 14, progress: 14 });
    expect(timestampGroups(deliveryAt(10)).at(-1)).toMatchObject({ timestamp: 15, complete: false, published: false });
    const laterData = applySubscription(deliveryAt(7), receive(data(15, -1, us50)));
    expect(timestampGroups(laterData).find(group => group.timestamp === 12)).toMatchObject({ complete: true, published: false });
    expect(laterData.published[0]?.row).toEqual(eu100);
  });
  it('consolidates both valid replacement orders to the same complete result', () => {
    const reversed = applySubscriptions(deliveryAt(4), [data(12, 1, eu130), data(12, -1, eu100), progress(13)].map(receive));
    expect(reversed.published).toEqual(deliveryAt(8).published);
    expect(deliveryAt(11).published).toEqual([{ row: eu130, count: 1 }]);
    expect(deliveryAt(13)).toMatchObject({ ready: true, published: [] });
  });
  it('uses full tuples and signed copy counts instead of region-only identity', () => {
    expect(consolidate([], [{ row: eu100, diff: 2 }, { row: eu100, diff: -1 }, { row: eu130, diff: 1 }])).toEqual([{ row: eu100, count: 1 }, { row: eu130, count: 1 }]);
    const result = applySubscriptions(duplicateStart(), [data(12, -1, eu100), progress(13)].map(receive));
    expect(result.published).toEqual([{ row: eu100, count: 1 }]);
  });
  it('does not claim a missing snapshot is a complete client baseline', () => {
    expect(snapshotOff()).toMatchObject({ ready: false, snapshot: false });
    expect(snapshotOff().published.some(item => item.row.region === 'US')).toBe(false);
  });
  it('freezes evidence and retains the previous display when disconnected', () => {
    const state = deliveryAt(12);
    const disconnected = applySubscription(state, { type: 'disconnect' });
    expect(disconnected).toMatchObject({ connected: false, published: state.published, pending: state.pending, publishedBefore: 16 });
    expect(() => applySubscription(disconnected, receive(progress(19)))).toThrow('disconnected');
  });
  it('replays deterministically without mutating earlier state or accepting invalid output', () => {
    const before = deliveryAt(4);
    const original = JSON.stringify(before);
    applySubscription(before, receive(data(12, -1, eu100)));
    expect(JSON.stringify(before)).toBe(original);
    expect(deliveryAt(canonicalRecords.length)).toEqual(deliveryAt(canonicalRecords.length));
    expect(() => applySubscription(createSubscription(), receive(data(10, 1, eu100)))).toThrow('first record');
    expect(() => applySubscription(before, receive(progress(9)))).toThrow('nondecreasing');
    expect(() => applySubscriptions(before, [data(12, -2, eu100), progress(13)].map(receive))).toThrow('negative');
    expect(() => consolidate([], [{ row: eu100, diff: 1.5 }])).toThrow('safe integers');
  });
});
