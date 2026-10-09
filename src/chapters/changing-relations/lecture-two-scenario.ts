import type { LessonTextContent } from '../../components/lesson/LessonText';
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

export const lectureTwoLedger: readonly RelationUpdate[] = [
  ...lectureTwoInitial.map(({ row, copies }) => ({ row, time: 0, diff: copies })),
  ...lectureTwoUpdates,
];

interface LectureTwoStep {
  readonly time: number;
  readonly title: string;
  readonly explanation: LessonTextContent;
  readonly before?: LessonTextContent;
  readonly spotlight: 'ledger' | 'relation';
}

export const lectureTwoSteps: readonly LectureTwoStep[] = [
  {
    time: 0, title: 'Start with an existing relation', spotlight: 'relation',
    explanation: [
      'At ', { kind: 'time', text: 't = 0' }, ', the ', { kind: 'term', text: 'Current relation' },
      ' already has ', { kind: 'count', text: '4 copies' }, ' across ', { kind: 'count', text: '3 full rows' },
      '. Each next timestamp applies a complete group of diffs.',
    ],
  },
  {
    time: 1, title: 'One update, two signed changes', spotlight: 'relation',
    before: [
      'B’s price changes from ', { kind: 'row', text: '$14' }, ' to ', { kind: 'row', text: '$18' },
      '. Predict the effect of ', { kind: 'diff', text: '−1' }, ' for ', { kind: 'row', text: '(B, $14)' },
      ' and ', { kind: 'diff', text: '+1' }, ' for ', { kind: 'row', text: '(B, $18)' }, ' together at ',
      { kind: 'time', text: 't = 1' }, '.',
    ],
    explanation: [
      { kind: 'row', text: '(B, $14)' }, ' is replaced by ', { kind: 'row', text: '(B, $18)' },
      ', keeping ', { kind: 'count', text: '4 total copies' }, '. Adding only the new row would leave the old row present too.',
    ],
  },
  {
    time: 2, title: 'An update can replace several identical copies', spotlight: 'relation',
    before: [
      { kind: 'row', text: '(C, $20)' }, ' has ', { kind: 'count', text: '2 copies' },
      '. Predict the result of ', { kind: 'diff', text: '−2' }, ' for that row and ', { kind: 'diff', text: '+2' },
      ' for ', { kind: 'row', text: '(C, $25)' }, ' at ', { kind: 'time', text: 't = 2' }, '.',
    ],
    explanation: [
      'Both copies are now ', { kind: 'row', text: '(C, $25)' }, '; ', { kind: 'row', text: '(C, $20)' },
      ' disappears. The total stays at ', { kind: 'count', text: '4 copies' }, '.',
    ],
  },
  {
    time: 3, title: 'Combine matching diffs, cancel opposite ones', spotlight: 'relation',
    before: [
      'At ', { kind: 'time', text: 't = 3' }, ', sum the diffs separately for each full row. ',
      'What do ', { kind: 'diff', text: '+2 − 1' }, ' for ', { kind: 'row', text: '(A, $10)' },
      ' and ', { kind: 'diff', text: '+1 − 1' }, ' for ', { kind: 'row', text: '(B, $18)' }, ' change?',
    ],
    explanation: [
      { kind: 'row', text: '(A, $10)' }, ' gains ', { kind: 'count', text: '1 copy' }, ' and now has ',
      { kind: 'count', text: '2' }, '. The opposite diffs for ', { kind: 'row', text: '(B, $18)' },
      ' cancel, so B keeps ', { kind: 'count', text: '1 copy' }, '.',
    ],
  },
  {
    time: 3, title: 'Read the completed relation', spotlight: 'relation',
    explanation: [
      'Apply all diffs at a timestamp together, matching the full row. The final ',
      { kind: 'term', text: 'Current relation' }, ' has ', { kind: 'row', text: '(A, $10)' }, ' × ',
      { kind: 'count', text: '2' }, ', ', { kind: 'row', text: '(B, $18)' }, ' × ', { kind: 'count', text: '1' },
      ', and ', { kind: 'row', text: '(C, $25)' }, ' × ', { kind: 'count', text: '2' }, '.',
    ],
  },
];

export const lectureTwoRun = { steps: lectureTwoSteps, totalChanges: lectureTwoBatches.length };

export const batchHelp = {
  ledger: { label: 'Change ledger', text: 'The authored diff records for the selected logical timestamp. At t = 0, positive diffs describe the starting snapshot. The three later timestamps show complete changes; all records at a timestamp apply together. Blank rows only keep the table size fixed. Within a complete timestamp, record order does not change the summed diffs. Cancelling teaching records are not a promise of separate messages from a real SUBSCRIBE connection.' },
  time: { label: 't', text: 'The logical timestamp shared by every record in a batch. All its diffs apply together. Select an applied timestamp to inspect its complete result. Previous/Next timestamp also revisit completed results, including the starting snapshot at t = 0; future ones stay unavailable until applied.' },
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
