import type { Product, ProductDiff } from './scenario';
import type { CatalogEntry, IncomingRecord, RecordFixture, RecordLectureDefinition } from './record-scenarios';

export interface RecordState {
  readonly fixture: RecordFixture;
  readonly record: IncomingRecord | null;
  readonly recordsRead: number;
  readonly entries: readonly CatalogEntry[];
  readonly relation: readonly Product[] | null;
  readonly diffs: readonly ProductDiff[];
  readonly errors: readonly string[];
  readonly explanation: string;
}

export function sameProduct(left: Product, right: Product) {
  return left.productId === right.productId && left.name === right.name
    && left.price === right.price && left.note === right.note;
}

export function recordsAt(definition: RecordLectureDefinition, checkpoint: number): RecordState {
  if (!Number.isInteger(checkpoint) || checkpoint < 0 || checkpoint > definition.actions.length) {
    throw new RangeError('Record checkpoint is outside this lecture.');
  }
  let fixture = definition.fixtures[0]!;
  let entries = [...fixture.initial];
  let record: IncomingRecord | null = null;
  let recordsRead = 0;
  let diffs: ProductDiff[] = [];
  let explanation = 'Read the next record to see its effect.';
  const errors = new Map<string | null, string>();

  for (const action of definition.actions.slice(0, checkpoint)) {
    diffs = [];
    if (action.kind === 'fixture') {
      fixture = action.fixture;
      entries = [...fixture.initial];
      record = null;
      recordsRead = 0;
      errors.clear();
      explanation = 'A separate fixture starts from its own catalog.';
      continue;
    }
    record = action.record;
    recordsRead++;
    if (record.kind === 'malformed') {
      errors.set(record.key, 'Value for key ' + record.key + ' cannot decode as an Avro product.');
      explanation = 'Non-null bytes failed decoding. This is not a tombstone.';
      continue;
    }
    if (record.kind === 'debezium') {
      if (record.before) {
        const before = record.before;
        const index = entries.findIndex((entry) => sameProduct(entry.row, before));
        if (index === -1) throw new Error('The CDC fixture retracts a row not present in its relation.');
        entries.splice(index, 1);
        diffs.push({ row: record.before, diff: -1 });
      }
      if (record.after) {
        entries.push({ identity: 'cdc:' + recordsRead, row: record.after });
        diffs.push({ row: record.after, diff: 1 });
      }
      explanation = record.before ? record.after ? 'Retract Before and add After.' : 'After is null: retract Before.' : 'Before is null: add After.';
      continue;
    }
    if (fixture.envelope === 'NONE') {
      if (!record.value) throw new Error('Append-only teaching fixtures require non-null product values.');
      entries.push({ identity: 'event:' + recordsRead, row: record.value });
      diffs.push({ row: record.value, diff: 1 });
      explanation = 'Append one event row, including repeated values.';
      continue;
    }
    if (record.key === null) {
      if (record.value === null) errors.delete(null);
      else errors.set(null, 'A null message key cannot identify an upsert entry.');
      explanation = 'Upsert requires a usable message key.';
      continue;
    }
    errors.delete(record.key);
    const key = record.key;
    const old = entries.find((entry) => entry.identity === key);
    if (old && record.value && sameProduct(old.row, record.value)) {
      explanation = 'The current value is unchanged: no net changes.';
      continue;
    }
    if (old) {
      entries = entries.filter((entry) => entry.identity !== key);
      diffs.push({ row: old.row, diff: -1 });
    }
    if (record.value) {
      entries.push({ identity: key, row: record.value });
      diffs.push({ row: record.value, diff: 1 });
    }
    explanation = record.value ? old ? 'Replace the previous value for key ' + key + '.' : 'Insert the value for new key ' + key + '.'
      : old ? 'Tombstone: retract the row for key ' + key + '.' : 'The tombstone has no existing row to retract.';
  }
  return { fixture, record, recordsRead, entries, relation: errors.size ? null : [...entries].sort((left, right) => left.row.productId - right.row.productId).map((entry) => entry.row),
    diffs, errors: [...errors.values()], explanation };
}
