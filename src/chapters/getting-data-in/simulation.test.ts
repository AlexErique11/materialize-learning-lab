import { describe, expect, it } from 'vitest';
import { initialProducts, snapshotActions } from './scenario';
import { snapshotAt } from './simulation';

describe('native database snapshot and CDC', () => {
  it('keeps queries unavailable until the complete snapshot commits', () => {
    expect(snapshotAt(0).snapshotRowsRead).toBe(0);
    expect(snapshotAt(1).snapshotRowsRead).toBe(1);
    expect(snapshotAt(4).snapshotRowsRead).toBe(3);
    for (let checkpoint = 0; checkpoint <= 4; checkpoint++) {
      expect(snapshotAt(checkpoint).relation).toBeNull();
      expect(snapshotAt(checkpoint).relationDiffs).toEqual([]);
      expect(snapshotAt(checkpoint).phase).toBe('Snapshotting');
    }
  });

  it('captures upstream changes without modifying the initial snapshot boundary', () => {
    const loading = snapshotAt(3);
    expect(loading.upstream.map(({ productId, price }) => ({ productId, price }))).toEqual([
      { productId: 101, price: 10 }, { productId: 102, price: 5 },
    ]);
    expect(loading.pendingCount).toBe(2);
    expect(loading.records.map((record) => record.applied)).toEqual([false, false]);

    const committed = snapshotAt(5);
    expect(committed.relation).toEqual([
      { productId: 101, name: 'Coffee', price: 8, note: 'Bag' },
      { productId: 102, name: 'Tea', price: 5, note: 'Loose' },
      { productId: 103, name: 'Mug', price: 12, note: 'Blue' },
    ]);
    expect(committed.relationDiffs.map(({ diff }) => diff)).toEqual([1, 1, 1]);
    expect(committed.phase).toBe('Catch-up');
    expect(committed.pendingCount).toBe(2);
  });

  it('replaces a complete snapshot row when applying the queued price update', () => {
    const state = snapshotAt(6);
    expect(state.relation?.find((row) => row.productId === 101)?.price).toBe(10);
    expect(state.relation).toHaveLength(3);
    expect(state.relationDiffs).toEqual([
      { diff: -1, row: { productId: 101, name: 'Coffee', price: 8, note: 'Bag' } },
      { diff: 1, row: { productId: 101, name: 'Coffee', price: 10, note: 'Bag' } },
    ]);
    expect(state.pendingCount).toBe(1);
    expect(state.phase).toBe('Catch-up');
  });

  it('removes the deleted product and enters live ingestion after catch-up', () => {
    const state = snapshotAt(7);
    expect(state.relation?.map((row) => row.productId)).toEqual([101, 102]);
    expect(state.relationDiffs).toEqual([
      { diff: -1, row: { productId: 103, name: 'Mug', price: 12, note: 'Blue' } },
    ]);
    expect(state.pendingCount).toBe(0);
    expect(state.phase).toBe('Live');
    expect(state.relation).toEqual(state.upstream);
  });

  it('applies a live insertion without starting another snapshot or duplicating rows', () => {
    const state = snapshotAt(snapshotActions.length);
    expect(state.snapshotRowsRead).toBe(3);
    expect(state.pendingCount).toBe(0);
    expect(state.phase).toBe('Live');
    expect(state.relation).toEqual(state.upstream);
    expect(state.relation?.map((row) => row.productId)).toEqual([101, 102, 104]);
    expect(state.records.every((record) => record.applied)).toBe(true);
    expect(state.relationDiffs).toEqual([
      { diff: 1, row: { productId: 104, name: 'Cocoa', price: 6, note: 'Tin' } },
    ]);
  });

  it('reconstructs every queryable checkpoint from its full signed changes', () => {
    const retained = new Map<string, number>();
    for (let checkpoint = 0; checkpoint <= snapshotActions.length; checkpoint++) {
      const state = snapshotAt(checkpoint);
      for (const { row, diff } of state.relationDiffs) {
        const key = JSON.stringify(row);
        const count = (retained.get(key) ?? 0) + diff;
        expect(count).toBeGreaterThanOrEqual(0);
        if (count === 0) retained.delete(key);
        else retained.set(key, count);
      }
      const reconstructed = [...retained].flatMap(([row, count]) => Array.from({ length: count }, () => JSON.parse(row)))
        .sort((a, b) => a.productId - b.productId);
      if (state.relation === null) expect(reconstructed).toEqual([]);
      else expect(reconstructed).toEqual(state.relation);
    }
  });

  it('preserves prior checkpoints and the original fixture during history and replay', () => {
    const starting = structuredClone(initialProducts);
    const committed = snapshotAt(5);
    snapshotAt(8);
    expect(snapshotAt(5)).toEqual(committed);
    expect(initialProducts).toEqual(starting);
    expect(snapshotAt(0).records).toEqual([]);
    expect(snapshotAt(0).relation).toBeNull();
  });

  it.each([-1, 9, 1.5, Number.NaN])('rejects an invalid checkpoint: %s', (checkpoint) => {
    expect(() => snapshotAt(checkpoint)).toThrow(RangeError);
  });
});
