import type { LessonTextContent } from './LessonText';
import type { RelationUpdate, RowMultiplicity } from './simulation';

export const inventoryInitial: readonly RowMultiplicity[] = [
  { row: { product: 'Kettle', price: 25 }, copies: 4 },
  { row: { product: 'Mug', price: 8 }, copies: 2 },
  { row: { product: 'Mug', price: 10 }, copies: 1 },
];

export const inventoryBatches = [
  { time: 1, updates: [
    { row: { product: 'Kettle', price: 25 }, time: 1, diff: -3 },
    { row: { product: 'Mug', price: 8 }, time: 1, diff: 2 },
    { row: { product: 'Kettle', price: 25 }, time: 1, diff: 2 },
    { row: { product: 'Mug', price: 10 }, time: 1, diff: 2 },
    { row: { product: 'Mug', price: 8 }, time: 1, diff: -3 },
  ] },
  { time: 2, updates: [
    { row: { product: 'Kettle', price: 25 }, time: 2, diff: -3 },
    { row: { product: 'Kettle', price: 30 }, time: 2, diff: 4 },
  ] },
  { time: 3, updates: [
    { row: { product: 'Kettle', price: 30 }, time: 3, diff: 2 },
    { row: { product: 'Mug', price: 10 }, time: 3, diff: -3 },
    { row: { product: 'Mug', price: 8 }, time: 3, diff: -1 },
    { row: { product: 'Mug', price: 12 }, time: 3, diff: 3 },
    { row: { product: 'Kettle', price: 30 }, time: 3, diff: -1 },
  ] },
] as const satisfies readonly { time: number; updates: readonly RelationUpdate[] }[];

export const inventoryUpdates: readonly RelationUpdate[] = inventoryBatches.flatMap((batch) => [...batch.updates]);
export const inventoryGridRows = Math.max(...inventoryBatches.map((batch) => batch.updates.length));

export type InventoryAnswerField = 'kettle' | 'mug8' | 'mug10' | 'oldDiff' | 'newDiff' | 'total' | 'distinct' | 'mugPrice';
interface InventoryCheckpoint {
  title: string;
  kind: 'counts' | 'build' | 'summary';
  fields: readonly { id: InventoryAnswerField; label: string; labelContent?: LessonTextContent }[];
  question: LessonTextContent;
  hint: LessonTextContent;
}

export const inventoryCheckpoints: readonly InventoryCheckpoint[] = [
  {
    title: 'Reconstruct the stock', kind: 'counts',
    fields: [
      { id: 'kettle', label: 'Copies of (Kettle, $25) after t = 1', labelContent: [{ kind: 'row', text: 'Kettle · $25' }, ' copies'] },
      { id: 'mug8', label: 'Copies of (Mug, $8) after t = 1', labelContent: [{ kind: 'row', text: 'Mug · $8' }, ' copies'] },
      { id: 'mug10', label: 'Copies of (Mug, $10) after t = 1', labelContent: [{ kind: 'row', text: 'Mug · $10' }, ' copies'] },
    ],
    question: ['Five changes share ', { kind: 'time', text: 't = 1' }, '. Starting from the current relation, calculate the final copies of each full row. The two Mug prices are separate rows.'],
    hint: ['Start with each row’s current count and sum only its matching diffs. ', { kind: 'row', text: '(Mug, $8)' }, ' and ', { kind: 'row', text: '(Mug, $10)' }, ' must be calculated separately. Enter final counts, not net diffs.'],
  },
  {
    title: 'Write a change that meets the condition', kind: 'build',
    fields: [
      { id: 'oldDiff', label: 'Signed diff for (Kettle, $25)' },
      { id: 'newDiff', label: 'Signed diff for (Kettle, $30)' },
    ],
    question: ['At ', { kind: 'time', text: 't = 2' }, ', move every ', { kind: 'row', text: '(Kettle, $25)' }, ' copy to ', { kind: 'row', text: '(Kettle, $30)' }, ' and add ', { kind: 'count', text: '1 extra copy' }, '. No old-price Kettle may remain. Write both signed diffs in the ledger.'],
    hint: ['Retract all current copies of the old full row. The new full row needs every repriced copy ', { kind: 'term', text: 'plus one extra' }, '. Diffs count copies, not the dollar difference.'],
  },
  {
    title: 'Check the final inventory', kind: 'summary',
    fields: [
      { id: 'total', label: 'Total row copies after t = 3', labelContent: ['Total row copies'] },
      { id: 'distinct', label: 'Distinct full rows after t = 3', labelContent: ['Distinct full rows'] },
      { id: 'mugPrice', label: 'Remaining Mug price after t = 3', labelContent: [{ kind: 'row', text: 'Mug' }, ' price ($)'] },
    ],
    question: ['Apply all five changes at ', { kind: 'time', text: 't = 3' }, '. What are the final ', { kind: 'term', text: 'total row copies' }, ', ', { kind: 'term', text: 'distinct full rows' }, ', and the price of the remaining Mug row?'],
    hint: ['Compute each full row first. Rows that reach ', { kind: 'count', text: '0 copies' }, ' disappear. Retracting ', { kind: 'row', text: '(Mug, $10)' }, ' and adding ', { kind: 'row', text: '(Mug, $12)' }, ' changes row values even when the total count stays the same.'],
  },
];

export const inventoryExerciseReference = {
  objective: 'Reconstruct inventory at each complete logical timestamp: combine full-row diffs, distinguish copies from distinct rows, and build a price replacement with an extra copy.',
  sql: `SELECT product, price, COUNT(*) AS copies
FROM products GROUP BY product, price;
SELECT COUNT(*) AS total_copies FROM products;
SELECT DISTINCT product, price FROM products;
-- Observe changes in a separate SQL connection.
SUBSCRIBE products;`,
  documentationLinks: [
    { label: 'SELECT: duplicate rows and grouping', href: 'https://materialize.com/docs/sql/select/' },
    { label: 'COUNT: counting row copies', href: 'https://materialize.com/docs/sql/functions/#aggregate-functions' },
    { label: 'SUBSCRIBE: logical timestamps and signed diffs', href: 'https://materialize.com/docs/sql/subscribe/#output' },
    { label: 'SUBSCRIBE: old and new rows in an update', href: 'https://materialize.com/docs/sql/subscribe/#mapping-rows-to-their-updates' },
  ],
};
