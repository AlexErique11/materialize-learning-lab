import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
import { snapshotReference, type Product } from './scenario';
import { recordLectures, type Envelope, type IncomingRecord, type RecordFixture, type RecordLectureDefinition } from './record-scenarios';
import { recordsAt, type RecordRun } from './record-simulation';
import { snapshotAt, type SnapshotFixture } from './simulation';

export type ChoiceOption = { readonly id: string; readonly label: string }
  | { readonly id: string; readonly row: Product; readonly diff?: -1 | 1 };
interface AnswerGroupBase {
  readonly id: string;
  readonly label: string;
  readonly guidance: string;
}
export type AnswerGroup = AnswerGroupBase & (
  | { readonly kind: 'radio'; readonly options: readonly ChoiceOption[]; readonly expected: string }
  | { readonly kind: 'checkbox'; readonly options: readonly ChoiceOption[]; readonly expected: readonly string[] }
  | { readonly kind: 'count'; readonly expected: number }
);
interface QuestionBase {
  readonly title: string;
  readonly question: LessonTextContent;
  readonly hint: LessonTextContent;
  readonly explanation: LessonTextContent;
  readonly actionLabel: string;
  readonly groups: readonly AnswerGroup[];
}
export interface SnapshotQuestion extends QuestionBase {
  readonly kind: 'snapshot';
  readonly fixture: SnapshotFixture;
  readonly before: number;
  readonly after: number;
  readonly maskAvailability?: boolean;
}
interface RecordCheckpoint { readonly run: RecordRun; readonly checkpoint: number }
export interface RecordQuestion extends QuestionBase {
  readonly kind: 'record';
  readonly before: RecordCheckpoint;
  readonly after: RecordCheckpoint;
  readonly record: IncomingRecord;
  readonly chooseEnvelope?: boolean;
}
export type IngestionQuestion = SnapshotQuestion | RecordQuestion;
export interface IngestionExercise {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly reference: RecordLectureDefinition['reference'];
  readonly questions: readonly IngestionQuestion[];
}

export const exerciseProducts = {
  notebook: { productId: 301, name: 'Notebook', price: 6, note: 'Soft' },
  notebookEight: { productId: 301, name: 'Notebook', price: 8, note: 'Soft' },
  notebookNine: { productId: 301, name: 'Notebook', price: 9, note: 'Soft' },
  pen: { productId: 302, name: 'Pen', price: 2, note: 'Blue' },
  lamp: { productId: 303, name: 'Lamp', price: 20, note: 'Desk' },
  ruler: { productId: 304, name: 'Ruler', price: 3, note: 'Clear' },
  journal: { productId: 301, name: 'Journal', price: 8, note: 'Soft' },
  journalNull: { productId: 301, name: 'Journal', price: 8, note: null },
} satisfies Record<string, Product>;
const p = exerciseProducts;
const textOption = (id: string, label: string): ChoiceOption => ({ id, label });
const rowOption = (id: string, row: Product, diff?: -1 | 1): ChoiceOption => ({ id, row, diff });
const value = (key: string, row: Product | null): IncomingRecord => ({ kind: 'value', key, value: row });
const envelopeGroup = (expected: Envelope): AnswerGroup => ({
  kind: 'radio', id: 'envelope', label: 'Producer envelope', expected,
  options: ['NONE', 'UPSERT', 'DEBEZIUM'].map((name) => textOption(name, name)),
  guidance: 'Choose the contract described by the producer: independent events, current keyed values, or before/after CDC.',
});
const replacementGroup = (before: Product, after: Product): AnswerGroup => ({
  kind: 'checkbox', id: 'diffs', label: 'Select every signed change', expected: ['retract-old', 'add-new'],
  options: [rowOption('retract-old', before, -1), rowOption('add-new', after, 1),
    rowOption('add-old', before, 1), rowOption('retract-new', after, -1)],
  guidance: 'A replacement needs the complete old row retracted and the complete new row added.',
});
function recordRun(label: string, envelope: Envelope, initial: RecordFixture['initial'], records: readonly IncomingRecord[], keyLabel = 'Stable product ID'): RecordRun {
  const fixture: RecordFixture = { label, envelope, initial, records, keyLabel };
  return { fixtures: [fixture], actions: records.map((record) => ({ kind: 'record', record })) };
}
const keyed = (key: string, row: Product) => ({ identity: key, row });
const recordCheckpoint = (run: RecordRun, checkpoint: number): RecordCheckpoint => ({ run, checkpoint });

const loadFixture: SnapshotFixture = {
  initial: [p.notebook, p.pen, p.lamp],
  actions: [
    { kind: 'read-snapshot', rowsRead: 1 },
    { kind: 'upstream-change', change: { before: p.notebook, after: p.notebookEight } },
    { kind: 'upstream-change', change: { before: p.lamp, after: null } },
    { kind: 'read-snapshot', rowsRead: 3 },
    { kind: 'commit-snapshot' },
    { kind: 'apply-cdc' },
    { kind: 'apply-cdc' },
    { kind: 'upstream-change', change: { before: null, after: p.ruler } },
  ],
};
const loadRows = [rowOption('notebook-old', p.notebook), rowOption('notebook-new', p.notebookEight),
  rowOption('pen', p.pen), rowOption('lamp', p.lamp)];
const snapshotQuestions: readonly SnapshotQuestion[] = [
  {
    kind: 'snapshot', fixture: loadFixture, before: 3, after: 4, maskAvailability: true,
    title: 'Reading is not commitment', actionLabel: 'Read the remaining snapshot rows: 3 of 3.',
    question: ['Next, all snapshot rows finish reading (3 of 3), before commitment. What can a query return then?'],
    hint: ['Reading the last row and committing the snapshot are separate steps.'],
    explanation: ['All snapshot rows have been read, but queries still wait. The initial rows become queryable together when the snapshot commits.'],
    groups: [{ kind: 'radio', id: 'availability', label: 'Query outcome', expected: 'waiting',
      options: [textOption('waiting', 'The query still waits for snapshot commitment.'),
        textOption('partial', 'It returns the subset of snapshot rows read first.'),
        textOption('upstream', 'It returns the current upstream rows immediately.')],
      guidance: 'Recheck whether reading the last row also commits the snapshot.' }],
  },
  {
    kind: 'snapshot', fixture: loadFixture, before: 4, after: 5,
    title: 'Commit the initial rows', actionLabel: 'Commit the initial snapshot, before CDC catch-up.',
    question: ['Select every row visible immediately after snapshot commitment, then choose the ingestion phase. The starting snapshot held Notebook at $6, Pen at $2, and Lamp at $20.'],
    hint: ['Commit the starting snapshot. The queued update and deletion are applied afterward.'],
    explanation: ['The original three rows commit together. Notebook is still $6 and Lamp is present. Two later database changes remain to be applied.'],
    groups: [{ kind: 'checkbox', id: 'rows', label: 'Rows after commitment', options: loadRows,
      expected: ['notebook-old', 'pen', 'lamp'], guidance: 'Use the initial snapshot boundary, before the queued update and deletion.' },
    { kind: 'radio', id: 'phase', label: 'Ingestion phase', expected: 'catch-up',
      options: [textOption('snapshot', 'Snapshotting'), textOption('catch-up', 'Catch-up'), textOption('live', 'Live')],
      guidance: 'The snapshot has committed, but two captured changes remain pending.' }],
  },
  {
    kind: 'snapshot', fixture: loadFixture, before: 5, after: 7,
    title: 'Catch up with the database', actionLabel: 'Apply the price update, then the deletion.',
    question: ['Apply both queued changes in order. Select the rows after catch-up and enter how many CDC operations remain pending.'],
    hint: ['The update replaces the old row; the deletion removes its matching row.'],
    explanation: ['Notebook becomes $8 and Lamp disappears. No operations remain pending, so ingestion is live.'],
    groups: [{ kind: 'checkbox', id: 'rows', label: 'Rows after catch-up', options: loadRows,
      expected: ['notebook-new', 'pen'], guidance: 'Apply both queued operations to the committed snapshot.' },
    { kind: 'count', id: 'pending', label: 'Pending CDC operations', expected: 0,
      guidance: 'Count operations still waiting after both queued changes have been applied.' }],
  },
  {
    kind: 'snapshot', fixture: loadFixture, before: 7, after: 8,
    title: 'Keep the live table current', actionLabel: 'Insert Ruler (304), at $3, upstream.',
    question: ['The database inserts Ruler, product 304, at $3. Select its table change. Does ingestion need to repeat the initial snapshot?'],
    hint: ['Live CDC maintains the table that already exists.'],
    explanation: ['Add Ruler to the maintained table. The initial snapshot is not repeated for this new database row.'],
    groups: [{ kind: 'radio', id: 'diff', label: 'Table change', expected: 'add',
      options: [rowOption('add', p.ruler, 1), rowOption('retract', p.ruler, -1), textOption('none', 'No net change')],
      guidance: 'The upstream operation inserts a previously absent product.' },
    { kind: 'radio', id: 'resnapshot', label: 'Repeat the initial snapshot?', expected: 'no',
      options: [textOption('yes', 'Yes'), textOption('no', 'No')],
      guidance: 'Consider how the live CDC phase maintains an existing table.' }],
  },
];

const eventRecord = value('301', p.notebook);
const events = recordRun('Independent events · separate fixture', 'NONE', [keyed('event:seed', p.notebook)], [eventRecord], 'Product ID supplied with each event');
const newPrice = value('301', p.notebookEight);
const currentValues = recordRun('Current values · separate fixture', 'UPSERT', [keyed('301', p.notebook), keyed('302', p.pen)], [newPrice]);
const cdcRecords: readonly IncomingRecord[] = [
  { kind: 'debezium', before: null, after: p.notebookEight },
  { kind: 'debezium', before: p.notebookEight, after: p.notebookNine },
  { kind: 'debezium', before: p.pen, after: null },
];
const cdc = recordRun('Database CDC · separate fixture', 'DEBEZIUM', [keyed('cdc:seed', p.pen)], cdcRecords, 'Compatible Avro database changes');
const producerQuestions: readonly RecordQuestion[] = [
  {
    kind: 'record', before: recordCheckpoint(events, 0), after: recordCheckpoint(events, 1), record: eventRecord, chooseEnvelope: true,
    title: 'Every event counts', actionLabel: 'Read another identical Notebook event.',
    question: ['These messages are independent events, including identical repeats. Choose the envelope and enter the number of row copies after this message.'],
    hint: ['The producer says each message is another event.'],
    explanation: ['NONE keeps each event as another row. Notebook now has two copies; sharing a key does not make these replacement values.'],
    groups: [envelopeGroup('NONE'), { kind: 'count', id: 'copies', label: 'Row copies after this message', expected: 2,
      guidance: 'Count row copies, including the identical event already present.' }],
  },
  {
    kind: 'record', before: recordCheckpoint(currentValues, 0), after: recordCheckpoint(currentValues, 1), record: newPrice, chooseEnvelope: true,
    title: 'Replace the current value', actionLabel: 'Read Notebook at $8 for stable key 301.',
    question: ['This separate producer sends the latest full value for each stable key. Choose its envelope and select every change produced by Notebook’s new price.'],
    hint: ['A new value for an existing key replaces its previous full row.'],
    explanation: ['UPSERT retracts Notebook at $6 and adds Notebook at $8. Pen stays unchanged, and the table still contains two rows.'],
    groups: [envelopeGroup('UPSERT'), replacementGroup(p.notebook, p.notebookEight)],
  },
  {
    kind: 'record', before: recordCheckpoint(cdc, 0), after: recordCheckpoint(cdc, 1), record: cdcRecords[0]!, chooseEnvelope: true,
    title: 'A CDC insertion', actionLabel: 'Read a compatible Avro CDC insertion.',
    question: ['This separate CDC producer supplies Avro before/after records. Choose the envelope and the change represented by Before = NULL and the new After row.'],
    hint: ['The record explicitly supplies row versions from a database change.'],
    explanation: ['DEBEZIUM interprets the before/after record. There is no old row to retract, so Notebook is inserted.'],
    groups: [envelopeGroup('DEBEZIUM'), { kind: 'radio', id: 'diff', label: 'Signed change', expected: 'add',
      options: [rowOption('add', p.notebookEight, 1), rowOption('retract', p.notebookEight, -1), textOption('none', 'No net change')],
      guidance: 'Check whether the record has an old Before row to retract.' }],
  },
  {
    kind: 'record', before: recordCheckpoint(cdc, 1), after: recordCheckpoint(cdc, 2), record: cdcRecords[1]!,
    title: 'A CDC update', actionLabel: 'Read Notebook’s Before $8 and After $9.',
    question: ['Continue the same CDC fixture. Notebook changes from $8 to $9. Select every signed row change.'],
    hint: ['Retract Before, then add After.'],
    explanation: ['The old Notebook row leaves and the new row enters. A price update changes its value without adding another product.'],
    groups: [replacementGroup(p.notebookEight, p.notebookNine)],
  },
  {
    kind: 'record', before: recordCheckpoint(cdc, 2), after: recordCheckpoint(cdc, 3), record: cdcRecords[2]!,
    title: 'A CDC deletion', actionLabel: 'Read Pen’s Before row and After NULL.',
    question: ['The same CDC producer deletes Pen. Select the change represented by this record.'],
    hint: ['After is absent. Check which complete row was present Before.'],
    explanation: ['Retract Pen’s Before row. A null After deletes the row. Notebook remains at $9.'],
    groups: [{ kind: 'radio', id: 'diff', label: 'Signed change', expected: 'retract',
      options: [rowOption('retract', p.pen, -1), rowOption('add', p.pen, 1), textOption('none', 'No net change')],
      guidance: 'A null After row leaves no replacement to insert.' }],
  },
];

const history = [value('301', p.notebook), value('301', p.notebookEight), value('301', p.notebookEight), value('302', p.pen)];
const broken = recordRun('Broken current-value catalog', 'NONE', [], history);
const repaired = recordRun('Fresh replay · stable product-ID keys', 'UPSERT', [], history);
const rename = value('Journal', p.journal);
const legacy = recordRun('Legacy name keys · separate fixture', 'UPSERT', [keyed('Notebook', p.notebookEight)], [rename], 'Product name');
const repairedRecords: readonly IncomingRecord[] = [value('301', p.journalNull), value('301', null),
  { kind: 'malformed', key: '301', raw: 'not-an-avro-record' }];
const stable = recordRun('Repaired stable keys · separate fixture', 'UPSERT', [keyed('301', p.journal), keyed('302', p.pen)], repairedRecords);
const repairQuestions: readonly RecordQuestion[] = [
  {
    kind: 'record', before: recordCheckpoint(broken, 4), after: recordCheckpoint(repaired, 4), record: history[3]!,
    title: 'Stop treating prices as new products', actionLabel: 'Replay the listed history into a fresh, correctly configured table.',
    question: ['History: Notebook $6 → $8 → $8 for key 301, then Pen $2 for key 302. These are latest full values. Choose a repair that survives future renames, then select the fresh replay’s rows.'],
    hint: ['Keep the latest full value for each stable identity.'],
    explanation: ['UPSERT with product-ID keys keeps Notebook at $8 and Pen at $2. The identical repeat adds no copy. A product-name key would change when Notebook is renamed.'],
    groups: [{ kind: 'radio', id: 'configuration', label: 'Repaired producer contract', expected: 'stable-upsert',
      options: [textOption('stable-upsert', 'UPSERT with stable product-ID keys'), textOption('events', 'NONE with stable product-ID keys'),
        textOption('name-upsert', 'UPSERT with product-name keys')],
      guidance: 'Keep current full values and an identity that survives name changes.' },
    { kind: 'checkbox', id: 'rows', label: 'Rows after fresh replay',
      options: [rowOption('old', p.notebook), rowOption('latest', p.notebookEight), rowOption('pen', p.pen)],
      expected: ['latest', 'pen'], guidance: 'Reconstruct the latest value for each stable key; repeated identical values add no copy.' }],
  },
  {
    kind: 'record', before: recordCheckpoint(legacy, 0), after: recordCheckpoint(legacy, 1), record: rename,
    title: 'A rename leaves an old key', actionLabel: 'Read key Journal, with the same product_id 301.',
    question: ['This separate legacy producer uses names as keys. Predict the rename, then choose the message that removes the stale Notebook entry.'],
    hint: ['UPSERT looks up the separate message key, not a field inside its value.'],
    explanation: ['Journal is a new key, so Notebook remains. Tombstone the old Notebook key to remove it. Stable product-ID keys avoid this identity change.'],
    groups: [{ kind: 'radio', id: 'outcome', label: 'After the rename message', expected: 'two',
      options: [textOption('two', 'Two rows remain, both with product_id 301.'), textOption('replace', 'The existing row is renamed in place.'),
        textOption('error', 'The different name key makes the relation unavailable.')],
      guidance: 'The new name is a different message key; product_id in the value does not override it.' },
    { kind: 'radio', id: 'cleanup', label: 'Remove the stale entry afterward', expected: 'old-key',
      options: [textOption('old-key', 'Key "Notebook", whole value NULL'), textOption('id-key', 'Key "301", whole value NULL'),
        textOption('null-note', 'Key "Notebook", non-null value with note = NULL')],
      guidance: 'Remove the exact old message key with a null whole value.' }],
  },
  {
    kind: 'record', before: recordCheckpoint(stable, 0), after: recordCheckpoint(stable, 1), record: repairedRecords[0]!,
    title: 'NULL inside a value', actionLabel: 'Read Journal’s non-null value with note = NULL.',
    question: ['This separate repaired fixture uses stable product-ID keys. Journal’s new value has note = NULL. What happens to the product row?'],
    hint: ['Is the entire value NULL, or just one permitted field?'],
    explanation: ['Journal remains. Its complete value is present; only the nullable note changed. This is a replacement, not a tombstone.'],
    groups: [{ kind: 'radio', id: 'outcome', label: 'Product row outcome', expected: 'retained',
      options: [textOption('retained', 'The row remains, with note set to NULL.'), textOption('deleted', 'The row is deleted as a tombstone.'),
        textOption('error', 'The relation becomes unavailable.')],
      guidance: 'A permitted null field inside a non-null product value is not a tombstone.' }],
  },
  {
    kind: 'record', before: recordCheckpoint(stable, 1), after: recordCheckpoint(stable, 2), record: repairedRecords[1]!,
    title: 'Delete the keyed product', actionLabel: 'Read key 301, with the whole value NULL.',
    question: ['The producer sends a tombstone for key 301. Select the signed change and the product IDs that remain.'],
    hint: ['A whole-value tombstone removes the current row for that exact key.'],
    explanation: ['Retract Journal, including its NULL note. Pen’s different key is unaffected.'],
    groups: [{ kind: 'radio', id: 'diff', label: 'Signed change', expected: 'journal',
      options: [rowOption('journal', p.journalNull, -1), rowOption('add-journal', p.journalNull, 1), rowOption('pen', p.pen, -1)],
      guidance: 'Retract the current full row for key 301, including its nullable note.' },
    { kind: 'checkbox', id: 'ids', label: 'Remaining product IDs', expected: ['302'],
      options: [textOption('301', '301'), textOption('302', '302')], guidance: 'A tombstone affects only its matching key.' }],
  },
  {
    kind: 'record', before: recordCheckpoint(stable, 2), after: recordCheckpoint(stable, 3), record: repairedRecords[2]!,
    title: 'Invalid bytes are not a deletion', actionLabel: 'Read non-null bytes that fail Avro decoding.',
    question: ['The next non-null value fails Avro decoding. With default error handling (without INLINE), what can a query of this source-backed table return?'],
    hint: ['Failed decoding is different from a null whole value.'],
    explanation: ['Default decoding errors make the relation unavailable. Malformed non-null bytes are not a tombstone; a valid message for another key does not repair this error.'],
    groups: [{ kind: 'radio', id: 'outcome', label: 'Query outcome', expected: 'unavailable',
      options: [textOption('unavailable', 'The relation is unavailable because of the input error.'),
        textOption('skipped', 'It returns Pen and silently skips the malformed value.'),
        textOption('empty', 'It returns an empty table because the value is a tombstone.')],
      guidance: 'Distinguish a default decoding error from a null whole value or a successful empty query.' }],
  },
];

const kafkaReference = {
  sql: [recordLectures[0]!.reference.sql, '', recordLectures[2]!.reference.sql].join('\n'),
  documentationLinks: recordLectures[0]!.reference.documentationLinks,
};
export const ingestionExercises: readonly IngestionExercise[] = [
  { slug: 'exercise-1', title: 'Finish the initial load', durationMinutes: 6,
    description: 'Predict snapshot commitment, catch-up, and live database changes.',
    reference: { ...snapshotReference, objective: 'Distinguish snapshot rows read from queryable rows. Reconstruct the atomic initial snapshot, apply queued CDC, and maintain the live table. These checkpoints are teaching steps, not elapsed time or database log positions.' },
    questions: snapshotQuestions },
  { slug: 'exercise-2', title: 'Interpret the producer’s message', durationMinutes: 7,
    description: 'Choose producer contracts and predict inserts, replacements, and deletions.',
    reference: { ...kafkaReference, objective: 'Choose an envelope from the producer’s contract and predict the complete signed changes. Separate event, current-value, and compatible Avro CDC fixtures start from their own seeded rows; they do not convert an existing table’s envelope.' },
    questions: producerQuestions },
  { slug: 'exercise-3', title: 'Repair the product catalog', durationMinutes: 8,
    description: 'Repair duplicates, follow identity through renames, and diagnose nulls and errors.',
    reference: { ...recordLectures[1]!.reference, objective: 'Repair a product catalog using a fresh deterministic replay and stable identity. Predict name-key changes, nullable fields, whole-value deletions, and default decoding errors. Producer messages update these read-only source-backed tables; they are not SQL INSERT or DELETE statements.' },
    questions: repairQuestions },
];

export function stateForQuestion(question: IngestionQuestion, accepted: boolean) {
  if (question.kind === 'snapshot') return { kind: 'snapshot' as const,
    state: snapshotAt(accepted ? question.after : question.before, question.fixture) };
  const point = accepted ? question.after : question.before;
  return { kind: 'record' as const, state: recordsAt(point.run, point.checkpoint) };
}
