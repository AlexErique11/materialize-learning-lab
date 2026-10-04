import type { LessonTextContent } from './LessonText';
import type { RelationUpdate } from './simulation';

export type LectureDiagramKind = 'overview' | 'record' | 'copies' | 'new-row' | 'metrics' | 'removal' | 'recap';

interface LectureStep {
  readonly time: number;
  readonly title: string;
  readonly explanation: LessonTextContent;
  readonly before?: LessonTextContent;
  readonly spotlight: 'ledger' | 'relation' | 'metrics';
  readonly diagram: LectureDiagramKind;
}

export const lectureUpdates: readonly RelationUpdate[] = [
  { row: { product: 'A', price: 10 }, time: 1, diff: 3 },
  { row: { product: 'B', price: 14 }, time: 2, diff: 1 },
  { row: { product: 'C', price: 20 }, time: 3, diff: 2 },
  { row: { product: 'B', price: 14 }, time: 4, diff: -1 },
];

export const lectureSteps: readonly LectureStep[] = [
  {
    time: 0,
    title: 'Read changes, see the current state',
    explanation: [
      'A relation can contain identical copies of a row. The ', { kind: 'term', text: 'Change ledger' },
      ' records additions and retractions; the ', { kind: 'term', text: 'Current relation' },
      ' shows what remains. We start empty at ', { kind: 'time', text: 't = 0' },
      '. Follow the guide to see how a change becomes current state.',
    ],
    spotlight: 'ledger',
    diagram: 'overview',
  },
  {
    time: 0,
    title: 'Read one change record',
    explanation: [
      'Read the first record as three parts: the full ', { kind: 'term', text: 'Row' },
      ' is ', { kind: 'row', text: '(A, $10)' }, ', its logical time is ', { kind: 'time', text: 't = 1' },
      ', and its ', { kind: 'term', text: 'Signed diff' }, ' is ', { kind: 'diff', text: '+3' },
      '. The diff changes the number of copies of that exact row.',
    ],
    spotlight: 'ledger',
    diagram: 'record',
  },
  {
    time: 1,
    title: 'One change can add several copies',
    before: [
      'The relation is still empty. At ', { kind: 'time', text: 't = 1' }, ', ',
      { kind: 'diff', text: '+3' }, ' will add three identical copies of ', { kind: 'row', text: '(A, $10)' },
      '. Show the effect to see how the table groups those copies.',
    ],
    explanation: [
      'At ', { kind: 'time', text: 't = 1' }, ', the signed diff ', { kind: 'diff', text: '+3' },
      ' adds three identical copies of ', { kind: 'row', text: '(A, $10)' },
      '. The table groups them into one line: ', { kind: 'count', text: '3 copies' },
      ' of ', { kind: 'count', text: '1 distinct full row' }, '. One change record can add several copies.',
    ],
    spotlight: 'relation',
    diagram: 'copies',
  },
  {
    time: 2,
    title: 'A different row adds a distinct value',
    before: [
      { kind: 'row', text: '(A, $10)' }, ' already has ', { kind: 'count', text: '3 copies' },
      '. The next change adds ', { kind: 'diff', text: '+1' }, ' for ', { kind: 'row', text: '(B, $14)' },
      '. Watch a new full row appear while A stays unchanged.',
    ],
    explanation: [
      'At ', { kind: 'time', text: 't = 2' }, ', ', { kind: 'diff', text: '+1' },
      ' adds ', { kind: 'row', text: '(B, $14)' }, '. ', { kind: 'row', text: '(A, $10)' },
      ' keeps its three copies. We now have ', { kind: 'count', text: '4 total copies' },
      ' across ', { kind: 'count', text: '2 distinct full rows' },
      '. Both product and price identify a full row.',
    ],
    spotlight: 'relation',
    diagram: 'new-row',
  },
  {
    time: 3,
    title: 'Total copies and distinct rows differ',
    before: [
      'We have ', { kind: 'count', text: '4 copies' }, ' across ', { kind: 'count', text: '2 full rows' },
      '. The next ', { kind: 'diff', text: '+2' }, ' adds two identical copies of ', { kind: 'row', text: '(C, $20)' },
      '. Watch the two metrics increase by different amounts.',
    ],
    explanation: [
      'At ', { kind: 'time', text: 't = 3' }, ', ', { kind: 'diff', text: '+2' },
      ' adds two copies of ', { kind: 'row', text: '(C, $20)' }, '. ',
      { kind: 'term', text: 'Total row copies' }, ' rises by two, while ',
      { kind: 'term', text: 'Distinct full rows' }, ' rises by one: ',
      { kind: 'count', text: '6 copies' }, ' across ', { kind: 'count', text: '3 full rows' }, '.',
    ],
    spotlight: 'metrics',
    diagram: 'metrics',
  },
  {
    time: 4,
    title: 'Zero-copy rows are removed',
    before: [
      { kind: 'row', text: '(B, $14)' }, ' has ', { kind: 'count', text: '1 copy' },
      '. At ', { kind: 'time', text: 't = 4' }, ', ', { kind: 'diff', text: '−1' },
      ' will retract that copy. Show the effect to see what happens when a count reaches zero.',
    ],
    explanation: [
      'At ', { kind: 'time', text: 't = 4' }, ', ', { kind: 'diff', text: '−1' },
      ' retracts the last copy of ', { kind: 'row', text: '(B, $14)' }, ': ',
      { kind: 'count', text: '1 → 0 copies' }, '. That row disappears. ',
      { kind: 'row', text: '(A, $10)' }, ' and ', { kind: 'row', text: '(C, $20)' },
      ' remain, leaving ', { kind: 'count', text: '5 total copies' },
      ' across ', { kind: 'count', text: '2 distinct full rows' }, '.',
    ],
    spotlight: 'relation',
    diagram: 'removal',
  },
  {
    time: 4,
    title: 'The rule: add each diff to the row’s count',
    explanation: [
      { kind: 'diff', text: '+diff' }, ' adds copies; ', { kind: 'diff', text: '−diff' },
      ' retracts copies. A row disappears when its count reaches ', { kind: 'count', text: '0' },
      '. The final relation is ', { kind: 'row', text: '(A, $10) × 3' },
      ' and ', { kind: 'row', text: '(C, $20) × 2' },
      '. After finishing, select an applied timestamp in the ledger to revisit any change.',
    ],
    spotlight: 'relation',
    diagram: 'recap',
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
