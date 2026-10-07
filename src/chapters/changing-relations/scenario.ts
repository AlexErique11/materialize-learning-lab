import type { LessonTextContent } from './LessonText';
import type { RelationUpdate } from './simulation';

interface LectureStep {
  readonly time: number;
  readonly title: string;
  readonly explanation: LessonTextContent;
  readonly before?: LessonTextContent;
  readonly spotlight: 'ledger' | 'relation' | 'metrics';
}

export const lectureUpdates: readonly RelationUpdate[] = [
  { row: { product: 'A', price: 10 }, time: 1, diff: 3 },
  { row: { product: 'B', price: 14 }, time: 2, diff: 1 },
  { row: { product: 'C', price: 20 }, time: 3, diff: 2 },
  { row: { product: 'B', price: 14 }, time: 4, diff: -1 },
];

export const lectureSteps: readonly LectureStep[] = [
  {
    time: 0, title: 'Read one change record', spotlight: 'ledger',
    explanation: [
      'Read ', { kind: 'time', text: 't = 1' }, ', ', { kind: 'term', text: 'Signed diff' }, ' ',
      { kind: 'diff', text: '+3' }, ', and ', { kind: 'term', text: 'Row' }, ' ', { kind: 'row', text: '(A, $10)' },
      ' in the ', { kind: 'term', text: 'Change ledger' }, '. The ', { kind: 'term', text: 'Current relation' },
      ' starts empty at ', { kind: 'time', text: 't = 0' }, '.',
    ],
  },
  {
    time: 1, title: 'One change can add several copies', spotlight: 'relation',
    before: [
      'The relation is empty. How many copies of ', { kind: 'row', text: '(A, $10)' },
      ' will ', { kind: 'diff', text: '+3' }, ' add at ', { kind: 'time', text: 't = 1' }, '?',
    ],
    explanation: [
      { kind: 'row', text: '(A, $10)' }, ' now has ', { kind: 'count', text: '3 copies' },
      '. They share one table line, with ', { kind: 'term', text: 'Copies per row' }, ' equal to ',
      { kind: 'count', text: '3' }, '.',
    ],
  },
  {
    time: 2, title: 'A different row adds a distinct value', spotlight: 'relation',
    before: [
      'Next, ', { kind: 'diff', text: '+1' }, ' adds ', { kind: 'row', text: '(B, $14)' },
      '. Will the copies of ', { kind: 'row', text: '(A, $10)' }, ' change?',
    ],
    explanation: [
      { kind: 'row', text: '(B, $14)' }, ' appears with ', { kind: 'count', text: '1 copy' },
      '; ', { kind: 'row', text: '(A, $10)' }, ' keeps ', { kind: 'count', text: '3 copies' },
      '. Product and price together identify a full row.',
    ],
  },
  {
    time: 3, title: 'Total copies and distinct rows differ', spotlight: 'metrics',
    before: [
      { kind: 'diff', text: '+2' }, ' adds two copies of ', { kind: 'row', text: '(C, $20)' },
      '. How will ', { kind: 'term', text: 'Total row copies' }, ' and ',
      { kind: 'term', text: 'Distinct full rows' }, ' change?',
    ],
    explanation: [
      { kind: 'term', text: 'Total row copies' }, ' rises ', { kind: 'count', text: '4 → 6' },
      '; ', { kind: 'term', text: 'Distinct full rows' }, ' rises ', { kind: 'count', text: '2 → 3' },
      '. Two identical copies add one distinct full row.',
    ],
  },
  {
    time: 4, title: 'Zero-copy rows are removed', spotlight: 'relation',
    before: [
      { kind: 'diff', text: '−1' }, ' retracts the last copy of ', { kind: 'row', text: '(B, $14)' },
      '. What remains when its count reaches ', { kind: 'count', text: '0' }, '?',
    ],
    explanation: [
      { kind: 'row', text: '(B, $14)' }, ' disappears because its count is now ', { kind: 'count', text: '0' },
      '. ', { kind: 'row', text: '(A, $10)' }, ' and ', { kind: 'row', text: '(C, $20)' },
      ' remain with ', { kind: 'count', text: '5 copies' }, ' in total.',
    ],
  },
  {
    time: 4, title: 'The rule: add each diff to the row’s count', spotlight: 'relation',
    explanation: [
      'Add the ', { kind: 'term', text: 'Signed diff' }, ' to that full row’s previous copy count. ',
      'The final ', { kind: 'term', text: 'Current relation' }, ' has ', { kind: 'row', text: '(A, $10)' },
      ' × ', { kind: 'count', text: '3' }, ' and ', { kind: 'row', text: '(C, $20)' }, ' × ', { kind: 'count', text: '2' }, '.',
    ],
  },
];

export const relationHelp = {
  totalCopies: { label: 'Total row copies', text: 'The sum of Copies per row for every row currently present. Three copies of (A, $10) count as 3, even though they occupy one grouped table line.' },
  distinctRows: { label: 'Distinct full rows', text: 'The number of different full rows with at least one copy. All column values matter: (A, $10) and (A, $12) would be two distinct rows. Identical copies count once.' },
  logicalTime: { label: 'Current logical timestamp', text: 'The logical timestamp of the state being displayed. These small t values are teaching labels, not elapsed seconds. Inspecting an earlier timestamp shows its earlier state.' },
  ledger: { label: 'Change ledger', text: 'The authored sequence of changes in this tutorial. Each record contains a logical timestamp, a signed diff, and the affected full row. Upcoming changes have not been applied yet.' },
  time: { label: 't', text: 'The logical timestamp at which this change takes effect. Each timestamp here contains one complete change. Select an applied timestamp to inspect the relation after that change.' },
  diff: { label: 'Signed diff', text: 'How much the full row’s copy count changes. +3 adds three copies; −1 retracts one copy. The diff is a change in count, not the resulting count or a price adjustment.' },
  row: { label: 'Row', text: 'The full row affected by the diff, written as product and price. For example, (B, $14) identifies that exact combination of column values.' },
  relation: { label: 'Current relation', text: 'All rows present after the changes through the displayed timestamp. Identical copies are grouped for readability. A full row with zero copies is absent.' },
  product: { label: 'Product', text: 'The product value in the full row. Product alone is not the row’s identity: the price also matters.' },
  price: { label: 'Price', text: 'The price value in the full row. A diff adds or removes copies of this product-and-price combination; it does not add to or subtract from the price.' },
  copies: { label: 'Copies per row', text: 'How many identical copies of this full row are present. This is a display count, equivalent to COUNT(*) grouped by product and price, rather than a stored product column. Zero-copy rows are removed.' },
};

export const lectureReference = {
  objective: 'Understand how signed changes build a current relation. Distinguish total copies from distinct full rows, and explain why a row disappears when its copy count reaches zero.',
  sql: `-- Inspect the relation, including duplicate rows.
SELECT product, price FROM products;

-- Group identical rows to match the lab display.
SELECT product, price, COUNT(*) AS copies
FROM products
GROUP BY product, price;

-- Observe changes as mz_timestamp, mz_diff, and row values.
SUBSCRIBE products;`,
  documentationLinks: [
    { label: 'SUBSCRIBE: logical timestamps and signed diffs', href: 'https://materialize.com/docs/sql/subscribe/' },
    { label: 'SELECT: relations and duplicate rows', href: 'https://materialize.com/docs/sql/select/' },
  ],
};
