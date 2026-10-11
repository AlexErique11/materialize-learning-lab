import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';

export interface Product {
  readonly productId: number;
  readonly name: string;
  readonly price: number;
  readonly note: string | null;
}

export interface ProductChange {
  readonly before: Product | null;
  readonly after: Product | null;
}

export interface ProductDiff {
  readonly row: Product;
  readonly diff: -1 | 1;
}

export type IngestionPhase = 'Snapshotting' | 'Catch-up' | 'Live';
export type SnapshotStage = 'source' | 'ingestion' | 'relation';

export const initialProducts: readonly Product[] = [
  { productId: 101, name: 'Coffee', price: 8, note: 'Bag' },
  { productId: 102, name: 'Tea', price: 5, note: 'Loose' },
  { productId: 103, name: 'Mug', price: 12, note: 'Blue' },
];

export type SnapshotAction =
  | { readonly kind: 'read-snapshot'; readonly rowsRead: number }
  | { readonly kind: 'upstream-change'; readonly change: ProductChange }
  | { readonly kind: 'commit-snapshot' }
  | { readonly kind: 'apply-cdc' };

export const snapshotActions: readonly SnapshotAction[] = [
  { kind: 'read-snapshot', rowsRead: 1 },
  { kind: 'upstream-change', change: {
    before: initialProducts[0]!, after: { ...initialProducts[0]!, price: 10 },
  } },
  { kind: 'upstream-change', change: { before: initialProducts[2]!, after: null } },
  { kind: 'read-snapshot', rowsRead: 3 },
  { kind: 'commit-snapshot' },
  { kind: 'apply-cdc' },
  { kind: 'apply-cdc' },
  { kind: 'upstream-change', change: {
    before: null, after: { productId: 104, name: 'Cocoa', price: 6, note: 'Tin' },
  } },
];

interface SnapshotLesson {
  readonly time: number;
  readonly stage: SnapshotStage;
  readonly focus?: 'snapshot-progress';
  readonly title: string;
  readonly before?: LessonTextContent;
  readonly explanation: LessonTextContent;
}

export const snapshotLessons: readonly SnapshotLesson[] = [
  {
    time: 0, stage: 'source', title: 'Start with an existing catalog',
    explanation: [
      'A ', { kind: 'term', text: 'connection' }, ' provides access to PostgreSQL. The ',
      { kind: 'term', text: 'source' }, ' follows its changes; the source-backed ',
      { kind: 'term', text: 'products' }, ' table becomes queryable after its initial snapshot.',
    ],
  },
  {
    time: 1, stage: 'ingestion', focus: 'snapshot-progress', title: 'Read the first snapshot row',
    before: ['The snapshot will read ', { kind: 'row', text: 'Coffee', column: 'name' },
      ' first. Will reading one row make that product queryable?'],
    explanation: [
      'Snapshot progress is ', { kind: 'count', text: '1 / 3', column: 'count' },
      '. The row has been read, but the snapshot has not committed.',
    ],
  },
  {
    time: 1, stage: 'relation', title: 'Queries wait for the snapshot',
    explanation: [
      'A query waits for the ', { kind: 'term', text: 'complete snapshot' },
      '. This table is unavailable, rather than an empty result or a partially visible catalog.',
    ],
  },
  {
    time: 2, stage: 'source', title: 'An update arrives during loading',
    before: [
      { kind: 'row', text: 'Coffee', column: 'name' }, ' changes from ',
      { kind: 'row', text: '$8', column: 'price' }, ' to ',
      { kind: 'row', text: '$10', column: 'price' }, ' upstream. Predict where this change will wait.',
    ],
    explanation: [
      'PostgreSQL now has ', { kind: 'row', text: 'Coffee at $10', column: 'price' },
      '. Its CDC update is ', { kind: 'term', text: 'Queued' }, ' until the initial snapshot commits.',
    ],
  },
  {
    time: 3, stage: 'source', title: 'A deletion arrives too',
    before: [
      'The upstream database deletes ', { kind: 'row', text: 'Mug', column: 'name' },
      '. Should it also disappear from the snapshot taken before this deletion?',
    ],
    explanation: [
      { kind: 'row', text: 'Mug', column: 'name' }, ' is gone upstream. Its deletion joins the queue: ',
      { kind: 'count', text: '2 pending CDC changes', column: 'count' },
      '. The original snapshot still includes the mug.',
    ],
  },
  {
    time: 4, stage: 'ingestion', focus: 'snapshot-progress', title: 'Finish reading the starting rows',
    before: ['Read the remaining snapshot rows. Predict whether the queued update and deletion change that starting snapshot.'],
    explanation: [
      'All ', { kind: 'count', text: '3 / 3', column: 'count' },
      ' original rows have been read. The snapshot preserves the starting catalog; its later CDC changes remain queued.',
    ],
  },
  {
    time: 5, stage: 'relation', title: 'Commit the snapshot together',
    before: [
      'The initial snapshot will commit atomically. Predict the visible catalog, including ',
      { kind: 'row', text: 'Coffee at $8', column: 'price' }, ' and ',
      { kind: 'row', text: 'Mug', column: 'name' }, '.',
    ],
    explanation: [
      'All ', { kind: 'count', text: '3 starting rows', column: 'count' },
      ' become visible together. The phase is ', { kind: 'term', text: 'Catch-up' },
      ': the update and deletion still need to be applied.',
    ],
  },
  {
    time: 6, stage: 'relation', title: 'Catch up the price update',
    before: [
      'Apply the queued ', { kind: 'row', text: 'Coffee', column: 'name' },
      ' update. Will the table contain both prices or one current product?',
    ],
    explanation: [
      'Retract the ', { kind: 'row', text: '$8', column: 'price' }, ' row and add its ',
      { kind: 'row', text: '$10', column: 'price' }, ' replacement. Coffee remains one product; ',
      { kind: 'count', text: '1 change', column: 'count' }, ' is still pending.',
    ],
  },
  {
    time: 7, stage: 'relation', title: 'Catch up the deletion',
    before: [
      'Apply the queued deletion of ', { kind: 'row', text: 'Mug', column: 'name' },
      '. Predict the rows that remain and the pending-change count.',
    ],
    explanation: [
      'Retract ', { kind: 'row', text: 'Mug', column: 'name' }, '. Only ',
      { kind: 'row', text: 'Coffee and Tea', column: 'name' }, ' remain. With ',
      { kind: 'count', text: '0 pending changes', column: 'count' },
      ', the table has caught up and the phase becomes ', { kind: 'term', text: 'Live' }, '.',
    ],
  },
  {
    time: 8, stage: 'source', title: 'Continue with a live insertion',
    before: [
      'PostgreSQL adds ', { kind: 'row', text: 'Cocoa', column: 'name' }, ' at ',
      { kind: 'row', text: '$6', column: 'price' }, '. Does Materialize need another full snapshot?',
    ],
    explanation: [
      'The new ', { kind: 'row', text: 'Cocoa', column: 'name' },
      ' row flows through CDC into the existing table. Snapshot progress stays ',
      { kind: 'count', text: '3 / 3', column: 'count' }, '.',
    ],
  },
  {
    time: 8, stage: 'relation', title: 'Keep the catalog current',
    explanation: [
      'The snapshot established the starting relation. CDC maintained it through an ',
      { kind: 'term', text: 'update, deletion, and insertion' },
      '. The Materialize table now matches the upstream catalog.',
    ],
  },
];

export const snapshotRunDefinition = { totalChanges: snapshotActions.length, steps: snapshotLessons };

export const snapshotStages = [
  { id: 'source', title: 'Upstream database', shortTitle: 'Upstream', sql: 'PostgreSQL · public.products',
    description: 'The current upstream catalog. The initial snapshot reads a consistent starting point; later updates and deletions are captured separately through change data capture (CDC).' },
  { id: 'ingestion', title: 'Ingestion', sql: 'Initial snapshot + CDC', showChanges: false,
    description: 'Read the initial snapshot, commit all starting rows together, then apply queued CDC operations. Queued and applied operations remain visible here so you can follow their status.' },
  { id: 'relation', title: 'Materialize table', shortTitle: 'Table', sql: 'SELECT * FROM products',
    description: 'The queryable source-backed table. Queries wait during the initial snapshot. After it commits, CDC maintains the existing rows; updates replace products and deletions remove them.' },
] as const;

export const snapshotReference = {
  objective: 'Follow an atomic initial snapshot into a source-backed table, then apply subsequent database changes. Distinguish snapshot rows read from queryable rows. These checkpoints pause a small teaching fixture; they are not elapsed time, database log positions, or performance measurements. Native PostgreSQL CDC does not require choosing a Kafka envelope.',
  sql: [
    '-- Assumes pg_connection and an upstream PostgreSQL publication are configured.',
    '-- Upstream: public.products(product_id, name, price, note).',
    '',
    'CREATE SOURCE catalog_source',
    'FROM POSTGRES CONNECTION pg_connection',
    "  (PUBLICATION 'catalog_publication');",
    '',
    '-- Creating the source-backed table starts its initial snapshot.',
    'CREATE TABLE products',
    'FROM SOURCE catalog_source (REFERENCE public.products);',
    '',
    '-- Queries wait until the initial snapshot commits.',
    'SELECT product_id, name, price, note',
    'FROM products',
    'ORDER BY product_id;',
  ].join('\n'),
  documentationLinks: [
    { label: 'Snapshotting: atomic initial load and waiting queries', href: 'https://materialize.com/docs/fundamentals/concepts/snapshotting/' },
    { label: 'PostgreSQL sources: connections and native CDC', href: 'https://materialize.com/docs/sql/create-source/postgres-v2/' },
    { label: 'PostgreSQL source-backed tables', href: 'https://materialize.com/docs/sql/create-table/postgres/' },
    { label: 'CREATE CONNECTION: reusable upstream access', href: 'https://materialize.com/docs/sql/create-connection/' },
  ],
};
