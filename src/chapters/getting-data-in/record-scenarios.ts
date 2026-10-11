import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
import { initialProducts, type Product } from './scenario';

export type Envelope = 'NONE' | 'UPSERT' | 'DEBEZIUM';
export type RecordStage = 'record' | 'changes' | 'relation';
export type IncomingRecord =
  | { readonly kind: 'value'; readonly key: string | null; readonly value: Product | null }
  | { readonly kind: 'malformed'; readonly key: string; readonly raw: string }
  | { readonly kind: 'debezium'; readonly before: Product | null; readonly after: Product | null };
export interface CatalogEntry { readonly identity: string; readonly row: Product }
export interface RecordFixture {
  readonly label: string;
  readonly envelope: Envelope;
  readonly keyLabel: string;
  readonly initial: readonly CatalogEntry[];
  readonly records: readonly IncomingRecord[];
}
export type RecordAction =
  | { readonly kind: 'fixture'; readonly fixture: RecordFixture }
  | { readonly kind: 'record'; readonly record: IncomingRecord };
export interface RecordLesson {
  readonly time: number;
  readonly stage: RecordStage;
  readonly title: string;
  readonly before?: LessonTextContent;
  readonly explanation: LessonTextContent;
}
export interface RecordLectureDefinition {
  readonly number: 2 | 3 | 4;
  readonly title: string;
  readonly description: string;
  readonly fixtures: readonly RecordFixture[];
  readonly actions: readonly RecordAction[];
  readonly lessons: readonly RecordLesson[];
  readonly reference: { objective: string; sql: string; documentationLinks: readonly { label: string; href: string }[] };
}

const coffee = initialProducts[0]!;
const tea = initialProducts[1]!;
const coffeeTen = { ...coffee, price: 10 };
const roast = { ...coffee, name: 'Roast' };
const cocoa = { productId: 104, name: 'Cocoa', price: 6, note: 'Tin' };
const value = (key: string | null, row: Product | null): IncomingRecord => ({ kind: 'value', key, value: row });
const term = (text: string) => ({ kind: 'term' as const, text });
const field = (text: string, column: string) => ({ kind: 'row' as const, text, column });
const count = (text: string) => ({ kind: 'count' as const, text, column: 'count' });

const eventFixtures: readonly RecordFixture[] = [
  { label: 'Independent events', envelope: 'NONE', keyLabel: 'Product ID (not replacement identity)', initial: [],
    records: [value('101', coffee), value('101', coffeeTen), value('101', coffeeTen)] },
  { label: 'Current catalog', envelope: 'UPSERT', keyLabel: 'Stable product ID', initial: [],
    records: [value('101', coffee), value('101', coffeeTen), value('101', coffeeTen)] },
];
const keyFixtures: readonly RecordFixture[] = [
  { label: 'Mutable name key', envelope: 'UPSERT', keyLabel: 'Product name', initial: [],
    records: [value('Coffee', coffee), value('Roast', roast)] },
  { label: 'Stable ID key', envelope: 'UPSERT', keyLabel: 'Stable product ID', initial: [],
    records: [value('101', coffee), value('101', roast), value('101', { ...roast, note: null }), value('101', null)] },
  { label: 'Intentional key change', envelope: 'UPSERT', keyLabel: 'Product name',
    initial: [{ identity: 'Coffee', row: coffee }], records: [value('Coffee', null), value('Roast', roast)] },
  { label: 'Null key error', envelope: 'UPSERT', keyLabel: 'Stable product ID',
    initial: [{ identity: '101', row: coffee }, { identity: '102', row: tea }],
    records: [value(null, coffeeTen), value('102', { ...tea, price: 6 })] },
  { label: 'Value decoding error', envelope: 'UPSERT', keyLabel: 'Stable product ID',
    initial: [{ identity: '101', row: coffee }, { identity: '102', row: tea }],
    records: [{ kind: 'malformed', key: '101', raw: 'not-an-avro-record' }] },
];
const cdcFixtures: readonly RecordFixture[] = [
  { label: 'Decoded Avro CDC', envelope: 'DEBEZIUM', keyLabel: 'Before / after row data', initial: [], records: [
    { kind: 'debezium', before: null, after: coffee },
    { kind: 'debezium', before: null, after: tea },
    { kind: 'debezium', before: coffee, after: coffeeTen },
    { kind: 'debezium', before: tea, after: null },
    { kind: 'debezium', before: null, after: cocoa },
  ] },
];

function actionsFor(fixtures: readonly RecordFixture[]): readonly RecordAction[] {
  return fixtures.flatMap((fixture, index) => [
    ...(index ? [{ kind: 'fixture' as const, fixture }] : []),
    ...fixture.records.map((record) => ({ kind: 'record' as const, record })),
  ]);
}

const eventLessons: readonly RecordLesson[] = [
  { time: 0, stage: 'record', title: 'Read the producer’s contract', explanation: [
    'This first fixture contains independent events. ', term('NONE'), ' keeps each event; a matching product ID does not replace an earlier row.',
  ] },
  { time: 1, stage: 'changes', title: 'Append the first event', before: ['The first event describes ', field('Coffee at $8', 'price'), '. Predict its signed change.'],
    explanation: [field('+1', 'count'), ' adds one event row. The key is not used to replace earlier events under ', term('NONE'), '.'] },
  { time: 2, stage: 'relation', title: 'Keep both events', before: ['Another event describes ', field('Coffee at $10', 'price'), '. Will the $8 event remain?'],
    explanation: ['Both events remain. The table has ', count('2 rows'), ', even though both concern product ', field('101', 'productId'), '.'] },
  { time: 3, stage: 'relation', title: 'An identical event is another copy', before: ['Repeat the $10 event. Predict the number of table rows.'],
    explanation: [term('NONE'), ' adds another copy. There are now ', count('3 event rows'), '; equal values do not make an append-only record a replacement.'] },
  { time: 4, stage: 'record', title: 'Start a separate catalog fixture', explanation: [
    'This fresh fixture uses ', term('UPSERT'), ' because the producer supplies a current value for each stable product-ID key. The event history above has not been converted.',
  ] },
  { time: 5, stage: 'relation', title: 'Insert a new key', explanation: [
    'Key ', field('101', 'productId'), ' is new, so its ', field('Coffee', 'name'), ' value inserts one catalog row.',
  ] },
  { time: 6, stage: 'changes', title: 'Replace the value for the same key', before: ['Key ', field('101', 'productId'), ' now supplies ', field('$10', 'price'), '. Predict which row is removed and which is added.'],
    explanation: ['Retract the ', field('$8', 'price'), ' row and add the ', field('$10', 'price'), ' row. One key still has ', count('one current value'), '.'] },
  { time: 7, stage: 'changes', title: 'Repeat an unchanged value', before: ['Send the same $10 value for key 101 again. Will it add another product?'],
    explanation: ['The value is unchanged, so there are ', term('No net changes'), '. Records read increases, while the table still contains ', count('1 row'), '.'] },
  { time: 7, stage: 'relation', title: 'Choose from the intended meaning', explanation: [
    'Use ', term('NONE'), ' for independent events and ', term('UPSERT'), ' for current keyed values. Envelope choice follows the producer’s contract.',
  ] },
];

const keyLessons: readonly RecordLesson[] = [
  { time: 0, stage: 'record', title: 'Identity comes from the key', explanation: [
    'This fixture uses the product ', field('name', 'name'), ' as its upsert key. The product ID inside the value does not override that key.',
  ] },
  { time: 1, stage: 'relation', title: 'Store the original name key', explanation: ['Key ', field('Coffee', 'name'), ' stores product ', field('101', 'productId'), '.'] },
  { time: 2, stage: 'relation', title: 'A rename creates another key', before: ['The name and key change to ', field('Roast', 'name'), '. Does the old Coffee key disappear?'],
    explanation: ['No deletion was sent for ', field('Coffee', 'name'), '. Both keys remain, leaving ', count('2 rows'), ' for the same product ID.'] },
  { time: 4, stage: 'record', title: 'Replay with a stable product ID', explanation: [
    'A separate fixture starts from one Coffee value under key ', field('101', 'productId'), '. The product’s name can change without changing its identity.',
  ] },
  { time: 5, stage: 'changes', title: 'Rename the existing product', before: ['Keep key ', field('101', 'productId'), ' and change the name to ', field('Roast', 'name'), '. Predict the row count.'],
    explanation: ['The existing value is replaced. ', field('Roast', 'name'), ' is still ', count('one product'), ' under key 101.'] },
  { time: 6, stage: 'record', title: 'A nullable field is still a value', before: ['The value contains ', field('note: NULL', 'note'), '. Does this delete the product?'],
    explanation: ['The whole value is non-null. Only ', field('note', 'note'), ' becomes NULL; the product remains in the table.'] },
  { time: 7, stage: 'changes', title: 'A tombstone removes the key', before: ['Now send key ', field('101', 'productId'), ' with a null ', term('whole value'), '. Predict the change.'],
    explanation: ['This is a ', term('tombstone'), '. Retract the current row for key 101; the table becomes empty.'] },
  { time: 8, stage: 'record', title: 'An intentional key change needs two records', explanation: [
    'This fresh name-keyed fixture starts with Coffee. To change its key intentionally, first delete the old key, then provide the new value.',
  ] },
  { time: 9, stage: 'changes', title: 'Remove the old key', before: ['Send a tombstone for ', field('Coffee', 'name'), '. Predict which row disappears.'],
    explanation: ['The old ', field('Coffee', 'name'), ' key is removed before the new key is introduced.'] },
  { time: 10, stage: 'relation', title: 'Add the new key', explanation: ['Key ', field('Roast', 'name'), ' inserts the renamed product. Only ', count('1 row'), ' remains.'] },
  { time: 11, stage: 'record', title: 'Check a separate error fixture', explanation: [
    'The next fixture starts with Coffee and Tea. ', term('UPSERT'), ' needs a usable message key; it has no general rule requiring a positive integer.',
  ] },
  { time: 12, stage: 'record', title: 'A null key produces an error', before: ['The incoming value has a product ID, but the message key is ', term('NULL'), '. Can upsert identify its entry?'],
    explanation: ['A null key puts ingestion into an ', term('error state'), '. The relation is unavailable, and its row count is shown as —.'] },
  { time: 13, stage: 'relation', title: 'An unrelated valid record does not fix it', explanation: [
    'A valid value for key ', field('102', 'productId'), ' does not retract the null-key error. The relation remains unavailable; correction must address the offending input.',
  ] },
  { time: 14, stage: 'record', title: 'Decoding is a separate requirement', explanation: [
    'This fresh fixture has valid text keys and Avro product values. A non-null value must also decode using the configured schema.',
  ] },
  { time: 15, stage: 'changes', title: 'Reject a malformed value', before: ['Key 101 is valid, but its bytes are not an Avro product record. Predict whether this is a tombstone or a decoding error.'],
    explanation: ['These non-null bytes fail decoding. Default upsert error handling makes the relation unavailable; malformed input is not a deletion.'] },
  { time: 15, stage: 'relation', title: 'Keep identity and deletion explicit', explanation: [
    'Stable keys identify replacements. A null whole value deletes a key. A nullable field keeps the row. Input errors must be corrected explicitly.',
  ] },
];

const cdcLessons: readonly RecordLesson[] = [
  { time: 0, stage: 'record', title: 'Read an explicit database change', explanation: [
    'These are readable projections of ', term('Avro-encoded Debezium'), ' records. ', term('Before'), ' describes the old row; ', term('After'), ' describes the new row.',
  ] },
  { time: 1, stage: 'changes', title: 'Insert when before is null', before: [term('Before'), ' is NULL and ', term('After'), ' contains Coffee. Predict the signed change.'],
    explanation: ['There is no old row to retract. Add the ', field('Coffee at $8', 'price'), ' row with ', field('+1', 'count'), '.'] },
  { time: 2, stage: 'relation', title: 'Retain the established rows', explanation: [
    'A second insertion adds ', field('Tea', 'name'), '. These ', count('2 rows'), ' form the current relation before the next change.',
  ] },
  { time: 3, stage: 'record', title: 'An update supplies both versions', before: [
    'Compare Coffee in ', term('Before'), ' and ', term('After'), '. Predict how ', field('$8 → $10', 'price'), ' changes the relation.',
  ], explanation: ['The two versions differ only in ', field('price', 'price'), '. The update supplies the exact old and new rows.'] },
  { time: 3, stage: 'changes', title: 'Translate before and after into diffs', explanation: [
    'Retract ', term('Before'), ' with ', { kind: 'diff', text: '−1' }, ' and add ', term('After'), ' with ', { kind: 'diff', text: '+1' }, '. This is the replacement pair from Chapter 1.',
  ] },
  { time: 3, stage: 'relation', title: 'Keep one current Coffee row', explanation: [
    'Coffee now costs ', field('$10', 'price'), '. Tea is unchanged, and the relation still has ', count('2 rows'), '.',
  ] },
  { time: 4, stage: 'changes', title: 'Delete when after is null', before: [term('Before'), ' contains Tea and ', term('After'), ' is NULL. Predict which change remains.'],
    explanation: ['Retract the ', field('Tea', 'name'), ' row. There is no replacement to add.'] },
  { time: 5, stage: 'relation', title: 'Continue applying explicit changes', explanation: [
    'An insertion adds ', field('Cocoa', 'name'), '. Upsert supplies a current value for a key; Debezium describes the old and new row explicitly. Both maintain a relation through signed changes.',
  ] },
];

const links = [
  { label: 'Kafka sources: connection and topic', href: 'https://materialize.com/docs/sql/create-source/kafka-v2/' },
  { label: 'Kafka tables: formats and envelopes', href: 'https://materialize.com/docs/sql/create-table/kafka/' },
  { label: 'Upsert keys, tombstones, and input errors', href: 'https://materialize.com/docs/sql/create-table/kafka/#upsert-envelope' },
  { label: 'Debezium before/after records', href: 'https://materialize.com/docs/sql/create-table/kafka/#debezium-envelope' },
];
const sourceSql = (name: string, topic: string) => [
  `CREATE SOURCE ${name}`, 'FROM KAFKA CONNECTION kafka_connection', `  (TOPIC '${topic}');`,
].join('\n');
const tableSql = (name: string, source: string, envelope: Envelope) => [
  `CREATE TABLE ${name} FROM SOURCE ${source}`,
  ...(envelope === 'DEBEZIUM' ? ['FORMAT AVRO'] : ['KEY FORMAT TEXT', 'VALUE FORMAT AVRO']),
  '  USING CONFLUENT SCHEMA REGISTRY CONNECTION csr_connection', `ENVELOPE ${envelope};`,
].join('\n');
const assumptions = '-- Assumes configured Kafka and schema-registry connections.\n-- Values use an Avro product schema: product_id, name, price, nullable note.\n-- Checkpoints are teaching steps, not Kafka offsets or logical timestamps.\n';

export const recordLectures: readonly RecordLectureDefinition[] = [
  { number: 2, title: 'Events and current values', description: 'See how records become table changes.',
    fixtures: eventFixtures, actions: actionsFor(eventFixtures), lessons: eventLessons,
    reference: { objective: 'Choose NONE for independent events and UPSERT for current keyed values. Follow inserts, repeated events, replacements, and unchanged values. Each fixture starts afresh with an appropriate producer contract; changing the demonstration does not convert an existing table. Records read counts messages within the current fixture.',
      sql: [assumptions, '-- Independent product events: retain every record.', sourceSql('events_source', 'product-events'), tableSql('product_events', 'events_source', 'NONE'), '',
        '-- Separate current-value topic: maintain one value per text key.', sourceSql('catalog_source', 'product-values'), tableSql('catalog', 'catalog_source', 'UPSERT'), '',
        'SELECT product_id, name, price, note FROM product_events;', 'SELECT key AS message_key, product_id, name, price, note FROM catalog;'].join('\n'), documentationLinks: links } },
  { number: 3, title: 'Keys, renames, and deletions', description: 'Follow keys through replacements and deletions.',
    fixtures: keyFixtures, actions: actionsFor(keyFixtures), lessons: keyLessons,
    reference: { objective: 'Use stable upsert keys. Diagnose a rename that leaves the old name key, distinguish a null field from a null whole value, and remove the old key before an intentional key change. Separate seeded fixtures demonstrate a null key and malformed Avro bytes using default error handling. Unrelated valid messages do not clear an outstanding input error; the stored catalog is hidden while queries are unavailable.',
      sql: [assumptions, '-- Text keys can represent names or stable IDs; producer choice determines identity.', sourceSql('catalog_source', 'product-values'), tableSql('catalog', 'catalog_source', 'UPSERT'), '',
        'SELECT key AS message_key, product_id, name, price, note', 'FROM catalog ORDER BY key;', '',
        '-- Producer records, not INSERT/DELETE statements against this read-only table:',
        '-- key="101", value={product_id:101, name:"Roast", price:8, note:null}: keep row.',
        '-- key="101", value=null: tombstone, remove that key.',
        '-- Rename a mutable key: tombstone the old key, then send the new key/value.',
        '-- A null key with a non-null value creates an error.',
        '-- Recovery of the null-key error requires a null-key/null-value retraction.',
        '-- Malformed values error by default; a later correct value for that same key',
        '-- replaces its decoding error. An unrelated valid key is not a repair.'].join('\n'), documentationLinks: links } },
  { number: 4, title: 'CDC with before and after', description: 'Turn before and after rows into signed changes.',
    fixtures: cdcFixtures, actions: actionsFor(cdcFixtures), lessons: cdcLessons,
    reference: { objective: 'Interpret Avro-encoded Debezium inserts, updates, and deletes. A null before row produces an insertion; two row versions produce a replacement pair; a null after row produces a retraction. Compare this explicit change contract with upsert current values. The panel shows only the decoded before/after projection of valid CDC records, not the full wire record or a JSON ingestion configuration.',
      sql: ['-- Assumes Kafka and schema-registry connections and a compatible Debezium topic.',
        '-- The topic contains Avro-encoded Debezium records with before/after row data.',
        sourceSql('products_cdc_source', 'products-cdc'), tableSql('products_cdc', 'products_cdc_source', 'DEBEZIUM'), '',
        'SELECT product_id, name, price, note', 'FROM products_cdc ORDER BY product_id;', '',
        '-- Decoded teaching projection (the producer supplies the full CDC metadata):',
        '-- Insert: before=null, after=Coffee at $8.', '-- Update: before=Coffee at $8, after=Coffee at $10.', '-- Delete: before=Tea, after=null.'].join('\n'), documentationLinks: links } },
];

export const recordStages = (envelope: Envelope) => [
  { id: 'record', title: 'Incoming record', shortTitle: 'Record', sql: envelope === 'DEBEZIUM' ? 'Avro before / after' : 'Kafka key / value', showChanges: false,
    description: 'One selected incoming record. Keys are separate from values; Debezium displays the decoded before/after row projection. A Next record label means it has not yet been read.' },
  { id: 'changes', title: 'Interpreted changes', shortTitle: 'Changes', sql: 'ENVELOPE ' + envelope, showChanges: false,
    description: 'Full signed row changes produced by this record. A replacement retracts the previous row and adds the new row; repeated upsert values have no net change.' },
  { id: 'relation', title: 'Current relation', shortTitle: 'Table', sql: 'SELECT product_id, name, price, note', showChanges: false,
    description: 'The queryable product projection. Each row copy counts, including repeated events or two different upsert keys for one product. An outstanding input error makes this relation unavailable.' },
] as const;
