import { describe, expect, it } from 'vitest';
import { initialProducts } from './scenario';
import { recordLectures, type IncomingRecord, type RecordLectureDefinition } from './record-scenarios';
import { recordsAt } from './record-simulation';

const events = recordLectures[0]!;
const keys = recordLectures[1]!;
const cdc = recordLectures[2]!;
const coffee = initialProducts[0]!;
const fixtureFor = (records: readonly IncomingRecord[]): RecordLectureDefinition => ({ ...events,
  fixtures: [{ label: 'Test catalog', envelope: 'UPSERT', keyLabel: 'Text key', initial: [], records }],
  actions: records.map((record) => ({ kind: 'record', record })),
});

describe('record interpretation', () => {
  it('retains every independent event, including identical copies', () => {
    const state = recordsAt(events, 3);
    expect(state.fixture.envelope).toBe('NONE');
    expect(state.recordsRead).toBe(3);
    expect(state.relation).toEqual([coffee, { ...coffee, price: 10 }, { ...coffee, price: 10 }]);
    expect(state.diffs).toEqual([{ row: { ...coffee, price: 10 }, diff: 1 }]);
  });
  it('starts a separate keyed fixture and replaces rather than duplicates', () => {
    expect(recordsAt(events, 4).relation).toEqual([]);
    expect(recordsAt(events, 4).recordsRead).toBe(0);
    expect(recordsAt(events, 6).diffs).toEqual([
      { row: coffee, diff: -1 }, { row: { ...coffee, price: 10 }, diff: 1 },
    ]);
    const repeated = recordsAt(events, 7);
    expect(repeated.recordsRead).toBe(3);
    expect(repeated.relation).toEqual([{ ...coffee, price: 10 }]);
    expect(repeated.diffs).toEqual([]);
  });
  it('retains the old mutable key but replaces a stable ID key on rename', () => {
    const renamed = { ...coffee, name: 'Roast' };
    expect(recordsAt(keys, 2).entries).toEqual([
      { identity: 'Coffee', row: coffee }, { identity: 'Roast', row: renamed },
    ]);
    expect(recordsAt(keys, 5).entries).toEqual([{ identity: '101', row: renamed }]);
  });
  it('distinguishes a null field from a null whole value and removes the latest row', () => {
    const row = { ...coffee, name: 'Roast', note: null };
    expect(recordsAt(keys, 6).relation).toEqual([row]);
    expect(recordsAt(keys, 7).relation).toEqual([]);
    expect(recordsAt(keys, 7).diffs).toEqual([{ row, diff: -1 }]);
  });
  it('changes a key intentionally by removing the old entry before inserting the new one', () => {
    expect(recordsAt(keys, 8).entries[0]?.identity).toBe('Coffee');
    expect(recordsAt(keys, 9).entries).toEqual([]);
    expect(recordsAt(keys, 10).entries).toEqual([{ identity: 'Roast', row: { ...coffee, name: 'Roast' } }]);
  });
  it('keeps a null-key error outstanding after a valid record for a different key', () => {
    expect(recordsAt(keys, 12).relation).toBeNull();
    const later = recordsAt(keys, 13);
    expect(later.relation).toBeNull();
    expect(later.errors).toEqual(['A null message key cannot identify an upsert entry.']);
    expect(later.entries.find((entry) => entry.identity === '102')?.row.price).toBe(6);
  });
  it('models explicit null-key recovery and per-key value decoding recovery', () => {
    const definition = fixtureFor([
      { kind: 'value', key: null, value: coffee },
      { kind: 'value', key: '102', value: initialProducts[1]! },
      { kind: 'value', key: null, value: null },
      { kind: 'malformed', key: '101', raw: 'invalid Avro bytes' },
      { kind: 'value', key: '102', value: initialProducts[1]! },
      { kind: 'value', key: '101', value: coffee },
    ]);
    expect(recordsAt(definition, 2).relation).toBeNull();
    expect(recordsAt(definition, 3).relation).toEqual([initialProducts[1]!]);
    expect(recordsAt(definition, 5).relation).toBeNull();
    expect(recordsAt(definition, 6).errors).toEqual([]);
    expect(recordsAt(definition, 6).relation).toHaveLength(2);
  });
  it('treats malformed non-null bytes as an error rather than a tombstone', () => {
    const malformed = recordsAt(keys, 15);
    expect(malformed.relation).toBeNull();
    expect(malformed.entries).toHaveLength(2);
    expect(malformed.errors[0]).toContain('cannot decode');
  });
  it('accepts text keys without an invented positive-integer requirement', () => {
    const definition = fixtureFor([
      { kind: 'value', key: '-1', value: coffee }, { kind: 'value', key: 'abc', value: coffee },
      { kind: 'value', key: 'missing', value: null },
    ]);
    expect(recordsAt(definition, 3).errors).toEqual([]);
    expect(recordsAt(definition, 3).relation).toEqual([coffee, coffee]);
  });
  it('reconstructs CDC updates and deletions from their explicit old/new rows', () => {
    expect(recordsAt(cdc, 1).diffs).toEqual([{ row: coffee, diff: 1 }]);
    expect(recordsAt(cdc, 3).relation).toEqual([{ ...coffee, price: 10 }, initialProducts[1]!]);
    expect(recordsAt(cdc, 3).diffs).toEqual([{ row: coffee, diff: -1 }, { row: { ...coffee, price: 10 }, diff: 1 }]);
    expect(recordsAt(cdc, 4).diffs).toEqual([{ row: initialProducts[1]!, diff: -1 }]);
    expect(recordsAt(cdc, 5).relation?.map((row) => row.name)).toEqual(['Coffee', 'Cocoa']);
  });
  it('preserves history and fixture data and stays within four row slots', () => {
    for (const definition of recordLectures) {
      const fixtureData = JSON.stringify(definition.fixtures);
      const earlier = recordsAt(definition, 1);
      const saved = JSON.stringify(earlier);
      for (let checkpoint = 0; checkpoint <= definition.actions.length; checkpoint++) {
        const state = recordsAt(definition, checkpoint);
        expect(state.entries.length).toBeLessThanOrEqual(4);
        expect(state.diffs.length).toBeLessThanOrEqual(4);
      }
      expect(JSON.stringify(earlier)).toBe(saved);
      expect(recordsAt(definition, 1)).toEqual(earlier);
      expect(JSON.stringify(definition.fixtures)).toBe(fixtureData);
    }
  });
  it.each([-1, 1.5, NaN, 100])('rejects an invalid checkpoint %s', (checkpoint) => {
    expect(() => recordsAt(events, checkpoint)).toThrow(RangeError);
  });
});
