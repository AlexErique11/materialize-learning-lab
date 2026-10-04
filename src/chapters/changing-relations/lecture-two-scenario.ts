import type { LessonTextContent } from './LessonText';
import type { RelationUpdate, RowMultiplicity } from './simulation';

export const lectureTwoInitial: readonly RowMultiplicity[] = [
  { row: { product: 'A', price: 10 }, copies: 1 },
  { row: { product: 'B', price: 14 }, copies: 1 },
  { row: { product: 'C', price: 20 }, copies: 2 },
];

export const lectureTwoBatches = [
  { time: 1, title: 'Correct B’s price', updates: [
    { row: { product: 'B', price: 14 }, time: 1, diff: -1 },
    { row: { product: 'B', price: 18 }, time: 1, diff: 1 },
  ] },
  { time: 2, title: 'Correct both copies of C', updates: [
    { row: { product: 'C', price: 20 }, time: 2, diff: -2 },
    { row: { product: 'C', price: 25 }, time: 2, diff: 2 },
  ] },
  { time: 3, title: 'Combine matching diffs', updates: [
    { row: { product: 'A', price: 10 }, time: 3, diff: 2 },
    { row: { product: 'A', price: 10 }, time: 3, diff: -1 },
    { row: { product: 'B', price: 18 }, time: 3, diff: 1 },
    { row: { product: 'B', price: 18 }, time: 3, diff: -1 },
  ] },
] as const satisfies readonly { time: number; title: string; updates: readonly RelationUpdate[] }[];

export const lectureTwoUpdates: readonly RelationUpdate[] = lectureTwoBatches.flatMap((batch) => [...batch.updates]);

export type UpdateDiagramKind = 'start' | 'replace' | 'insert-only' | 'batch' | 'cancel' | 'order' | 'recap';

interface LectureTwoStep {
  readonly time: number;
  readonly title: string;
  readonly explanation: LessonTextContent;
  readonly before?: LessonTextContent;
  readonly spotlight: 'ledger' | 'relation' | 'metrics';
  readonly diagram: UpdateDiagramKind;
  readonly phase?: string;
}

export const lectureTwoSteps: readonly LectureTwoStep[] = [
  {
    time: 0, title: 'From individual changes to timestamp batches', diagram: 'start', spotlight: 'relation', phase: 'Introduction',
    explanation: [
      'Lecture 1 built a relation from individual diffs. Here we start with ', { kind: 'count', text: '4 copies' },
      ' across ', { kind: 'count', text: '3 full rows' }, '. Each next timestamp groups several diffs. Watch them update the relation together.',
    ],
  },
  {
    time: 1, title: 'One update, two signed changes', diagram: 'replace', spotlight: 'relation',
    before: [
      'B’s price changes from ', { kind: 'row', text: '(B, $14)' }, ' to ', { kind: 'row', text: '(B, $18)' },
      '. The old full row gets ', { kind: 'diff', text: '−1' }, '; the new full row gets ', { kind: 'diff', text: '+1' },
      '. Both belong to ', { kind: 'time', text: 't = 1' }, '. Show their combined effect.',
    ],
    explanation: [
      { kind: 'row', text: '(B, $14)' }, ' is gone; ', { kind: 'row', text: '(B, $18)' },
      ' now has ', { kind: 'count', text: '1 copy' }, '. The values changed, but the metrics stay at ',
      { kind: 'count', text: '4 copies / 3 full rows' }, '. Zero change in the total does not mean an unchanged relation.',
    ],
  },
  {
    time: 1, title: 'Inserting a new value does not replace the old one', diagram: 'insert-only', spotlight: 'relation', phase: 'Hypothetical comparison',
    explanation: [
      'Starting from ', { kind: 'time', text: 't = 0' }, ', adding only ', { kind: 'diff', text: '+1' },
      ' for ', { kind: 'row', text: '(B, $18)' }, ' would leave ', { kind: 'row', text: '(B, $14)' },
      ' present too. The comparison below is hypothetical; the current relation still shows the correct update.',
    ],
  },
  {
    time: 2, title: 'An update can replace several identical copies', diagram: 'replace', spotlight: 'relation',
    before: [
      { kind: 'row', text: '(C, $20)' }, ' has ', { kind: 'count', text: '2 copies' },
      '. Correcting both prices uses ', { kind: 'diff', text: '−2' }, ' for the old full row and ',
      { kind: 'diff', text: '+2' }, ' for ', { kind: 'row', text: '(C, $25)' },
      ', together at ', { kind: 'time', text: 't = 2' }, '.',
    ],
    explanation: [
      'Both copies now have price ', { kind: 'row', text: '$25' }, '. ', { kind: 'row', text: '(C, $20)' },
      ' has zero copies and disappears; ', { kind: 'row', text: '(C, $25)' }, ' has two. The total remains ',
      { kind: 'count', text: '4' }, '. A diff measures copies, not the number of edits.',
    ],
  },
  {
    time: 3, title: 'Combine diffs separately for each full row', diagram: 'batch', spotlight: 'relation',
    before: [
      'At ', { kind: 'time', text: 't = 3' }, ', four authored diffs affect two full rows. Group matching rows and sum their signed diffs. The relation stays at ',
      { kind: 'time', text: 't = 2' }, ' until you show the complete batch’s effect.',
    ],
    explanation: [
      'For ', { kind: 'row', text: '(A, $10)' }, ', ', { kind: 'diff', text: '+2' }, ' and ', { kind: 'diff', text: '−1' },
      ' combine to ', { kind: 'diff', text: '+1' }, '. A now has two copies. B’s matching diffs cancel. We finish with ',
      { kind: 'count', text: '5 copies / 3 full rows' }, '.',
    ],
  },
  {
    time: 3, title: 'Cancellation requires the same full row', diagram: 'cancel', spotlight: 'relation', phase: 'Cancellation',
    explanation: [
      { kind: 'diff', text: '+1' }, ' and ', { kind: 'diff', text: '−1' }, ' cancel for ', { kind: 'row', text: '(B, $18)' },
      ' at the same time, so B keeps one copy. At ', { kind: 'time', text: 't = 1' },
      ', the two diffs targeted different prices: that changed B’s value instead.',
    ],
  },
  {
    time: 3, title: 'Record order does not change the completed result', diagram: 'order', spotlight: 'relation', phase: 'Same batch, different order',
    explanation: [
      'Reversing the records at ', { kind: 'time', text: 't = 3' },
      ' gives the same combined diffs and final relation. These orders are illustrations of one complete timestamp, rather than separate readable states. A has ',
      { kind: 'count', text: '2 copies' }, '; B has ', { kind: 'count', text: '1' }, '.',
    ],
  },
  {
    time: 3, title: 'Read values, counts, and time together', diagram: 'recap', spotlight: 'metrics', phase: 'Recap',
    explanation: [
      'Updates replace full rows; matching diffs at one timestamp combine. We finish with ',
      { kind: 'row', text: '(A, $10) × 2' }, ', ', { kind: 'row', text: '(B, $18) × 1' },
      ', and ', { kind: 'row', text: '(C, $25) × 2' }, '. After finishing, use the timestamp controls to revisit each complete result.',
    ],
  },
];

export const lectureTwoRun = { steps: lectureTwoSteps, totalChanges: lectureTwoBatches.length };

export const batchHelp = {
  ledger: { label: 'Change ledger', text: 'The authored diff records for the selected complete timestamp. t = 0 describes the starting snapshot. Later timestamps contain an update pair or a teaching batch. Cancelling teaching records are not a promise of separate messages from a real SUBSCRIBE connection.' },
  time: { label: 't', text: 'The logical timestamp shared by every record in this batch. All its diffs apply together. The selector and Previous/Next timestamp controls revisit completed timestamps; future ones stay unavailable until applied.' },
};

export const lectureTwoReference = {
  objective: 'Express an update as an old-row retraction and new-row insertion at the same logical time. Combine diffs by full row within a complete timestamp, distinguish cancellation from replacement, and explain unchanged counts alongside changed values.',
  sql: `-- Observe full-row changes in a separate SQL connection.
SUBSCRIBE products;

-- Each UPDATE below is a separate statement on a read-write table.
UPDATE products SET price = 18
WHERE product = 'B' AND price = 14;

-- All identical matching rows are updated.
UPDATE products SET price = 25
WHERE product = 'C' AND price = 20;

-- Inspect the grouped current relation.
SELECT product, price, COUNT(*) AS copies
FROM products GROUP BY product, price;

-- t = 3 is an authored diff-consolidation example,
-- not a claim about individual SUBSCRIBE message delivery.`,
  documentationLinks: [
    { label: 'SUBSCRIBE: mapping an update to its old and new rows', href: 'https://materialize.com/docs/sql/subscribe/#mapping-rows-to-their-updates' },
    { label: 'UPDATE: changing values in read-write tables', href: 'https://materialize.com/docs/sql/update/' },
  ],
};
