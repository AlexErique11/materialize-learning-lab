import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
export interface Order {
  readonly orderId: number;
  readonly productId: number;
  readonly amount: number;
  readonly note: string;
}
export type OutputRow = Pick<Order, 'orderId' | 'amount'>;
export interface Diff<Row> { readonly row: Row; readonly diff: number }
export const MINIMUM_AMOUNT = 50;
export const initialOrders: readonly Order[] = [
  { orderId: 101, productId: 7, amount: 30, note: 'Standard' },
  { orderId: 102, productId: 8, amount: 80, note: 'Gift' },
  { orderId: 103, productId: 7, amount: 50, note: 'Standard' },
];
export const changes = [
  {
    title: 'Cross into the filter',
    before: [
      { kind: 'row', text: 'Order 101', column: 'orderId' }, ' changes from ',
      { kind: 'row', text: '$30', column: 'amount' }, ' to ', { kind: 'row', text: '$60', column: 'amount' },
      '. With ', { kind: 'term', text: 'amount >= 50' },
      ', which version passes the filter? Predict the result diff.',
    ],
    orderId: 101, patch: { amount: 60 },
    explanation: [
      { kind: 'row', text: 'Order 101', column: 'orderId' }, ' moves from ',
      { kind: 'row', text: '$30', column: 'amount' }, ' to ', { kind: 'row', text: '$60', column: 'amount' },
      '. The old row fails the filter; the new row passes. The result gains ', '(',
      { kind: 'row', text: '101', column: 'orderId' }, ', ', { kind: 'row', text: '60', column: 'amount' },
      ')', '.',
    ],
  },
  {
    title: 'Edit an unused column',
    before: [
      { kind: 'row', text: 'Order 103', column: 'orderId' }, ' keeps its ',
      { kind: 'row', text: '$50', column: 'amount' }, ' ',
      { kind: 'term', text: 'amount', column: 'amount' }, ' but changes its note from ',
      { kind: 'row', text: 'Standard', column: 'note' }, ' to ',
      { kind: 'row', text: 'Express', column: 'note' }, '. ', { kind: 'term', text: 'SELECT' },
      ' keeps only ', { kind: 'term', text: 'order_id', column: 'orderId' }, ' and ',
      { kind: 'term', text: 'amount', column: 'amount' }, '. Will the output change?',
    ],
    orderId: 103, patch: { note: 'Express' },
    explanation: [
      'Retract ', '(', { kind: 'row', text: '103', column: 'orderId' }, ', ',
      { kind: 'row', text: '7', column: 'productId' }, ', ', { kind: 'row', text: '50', column: 'amount' },
      ', ', { kind: 'row', text: 'Standard', column: 'note' }, ')', ' and insert ', '(',
      { kind: 'row', text: '103', column: 'orderId' }, ', ', { kind: 'row', text: '7', column: 'productId' },
      ', ', { kind: 'row', text: '50', column: 'amount' }, ', ',
      { kind: 'row', text: 'Express', column: 'note' }, ')',
      ' at the same timestamp. Only note changes. Both rows pass ', { kind: 'term', text: 'WHERE' },
      ', but ', { kind: 'term', text: 'SELECT' },
      ' drops note. Their identical projected rows cancel, so a ', { kind: 'term', text: 'SUBSCRIBE' },
      ' to qualifying_orders emits no result update for this edit.',
    ],
  },
  {
    title: 'Cross out of the filter',
    before: [
      { kind: 'row', text: 'Order 101', column: 'orderId' }, ' changes from ',
      { kind: 'row', text: '$60', column: 'amount' }, ' to ', { kind: 'row', text: '$40', column: 'amount' },
      '. Predict what happens to its existing result row when it no longer passes the filter.',
    ],
    orderId: 101, patch: { amount: 40 },
    explanation: [
      { kind: 'row', text: 'Order 101', column: 'orderId' }, ' falls below ',
      { kind: 'row', text: '$50', column: 'amount' }, '. Its old ',
      { kind: 'row', text: '$60', column: 'amount' }, ' row passes and is retracted; its new ',
      { kind: 'row', text: '$40', column: 'amount' }, ' row is filtered out. The result loses ', '(',
      { kind: 'row', text: '101', column: 'orderId' }, ', ', { kind: 'row', text: '60', column: 'amount' },
      ')', '.',
    ],
  },
  {
    title: 'Replace a qualifying amount',
    before: [
      { kind: 'row', text: 'Order 102', column: 'orderId' }, ' changes from ',
      { kind: 'row', text: '$80', column: 'amount' }, ' to ', { kind: 'row', text: '$90', column: 'amount' },
      '. Both versions pass the filter. Predict the retraction and insertion in the result.',
    ],
    orderId: 102, patch: { amount: 90 },
    explanation: [
      'Both amounts qualify. Retract ', '(', { kind: 'row', text: '102', column: 'orderId' }, ', ',
      { kind: 'row', text: '80', column: 'amount' }, ')', ' and insert ', '(',
      { kind: 'row', text: '102', column: 'orderId' }, ', ', { kind: 'row', text: '90', column: 'amount' },
      ')', ' at the same timestamp. An update replaces the old result row.',
    ],
  },
  {
    title: 'Delete a qualifying order',
    before: [
      { kind: 'row', text: 'Order 103', column: 'orderId' }, ', currently ',
      { kind: 'row', text: '$50', column: 'amount' },
      ', is deleted. Predict the result diff and decide whether ',
      { kind: 'row', text: 'order 102', column: 'orderId' }, ' should change too.',
    ],
    orderId: 103, patch: null,
    explanation: [
      'Deleting ', { kind: 'row', text: 'order 103', column: 'orderId' }, ' retracts its qualifying row. ',
      { kind: 'row', text: 'Order 102', column: 'orderId' }, ' is unaffected and remains in the result.',
    ],
  },
] as const;

export const stages = [
  { id: 'source', title: 'Orders', sql: 'FROM orders', description: 'The input keeps all order columns. A business update retracts the old full row and inserts its replacement at the same timestamp.' },
  { id: 'filter', title: 'Filter', sql: 'WHERE amount >= 50', description: 'Test each signed row against the predicate. Rows below $50 do not pass; exactly $50 qualifies. Retractions follow the same predicate as insertions.' },
  { id: 'projection', title: 'Projection', sql: 'SELECT order_id, amount', description: 'Keep only the selected columns. Opposite diffs for the same projected row at the same timestamp cancel. SELECT without DISTINCT still preserves duplicate row copies.' },
] as const;
export type StageId = typeof stages[number]['id'];
const inputExplanations: readonly LessonTextContent[] = [
  [
    'In Orders, retract the full ', { kind: 'row', text: '$30', column: 'amount' }, ' row for ',
    { kind: 'row', text: 'order 101', column: 'orderId' }, ' and insert its ',
    { kind: 'row', text: '$60', column: 'amount' }, ' replacement. Only ',
    { kind: 'term', text: 'amount', column: 'amount' }, ' changes; the other fields stay the same.',
  ],
  [
    'In Orders, retract ', { kind: 'row', text: 'order 103', column: 'orderId' }, ' with ',
    { kind: 'row', text: 'Standard', column: 'note' }, ' and insert its ',
    { kind: 'row', text: 'Express', column: 'note' }, ' replacement. Its ',
    { kind: 'term', text: 'amount', column: 'amount' }, ' stays ',
    { kind: 'row', text: '$50', column: 'amount' }, '. The highlighted notes distinguish the two full rows.',
  ],
  [
    'In Orders, retract ', { kind: 'row', text: 'order 101', column: 'orderId' }, ' at ',
    { kind: 'row', text: '$60', column: 'amount' }, ' and insert its ',
    { kind: 'row', text: '$40', column: 'amount' },
    ' replacement. The order still exists in the input; next, inspect what passes ',
    { kind: 'term', text: 'WHERE' }, '.',
  ],
  [
    'In Orders, replace ', { kind: 'row', text: 'order 102', column: 'orderId' }, ' at ',
    { kind: 'row', text: '$80', column: 'amount' }, ' with the full row at ',
    { kind: 'row', text: '$90', column: 'amount' }, '. The signed input rows show the old and new amounts.',
  ],
  [
    'Orders no longer contains ', { kind: 'row', text: 'order 103', column: 'orderId' },
    '. Its full row appears in the input diffs with ', { kind: 'diff', text: '-1' },
    ' and no replacement; the other orders remain.',
  ],
];
export const lessons: readonly { time: number; title: string; stage: StageId; explanation: LessonTextContent; before?: LessonTextContent }[] = [
  {
    time: 0, title: 'Compute the starting result', stage: 'source',
    explanation: [
      'Start with ', { kind: 'count', text: 'three existing orders', column: 'count' },
      '. The initial result is computed from ', { kind: 'count', text: 'all three rows', column: 'count' },
      '. Later changes maintain that result. These stages are a teaching model of the SQL, not a physical query plan.',
    ],
  },
  {
    time: 0, title: 'Choose rows with WHERE', stage: 'filter',
    explanation: [
      'The filter keeps ', { kind: 'row', text: 'orders 102 and 103', column: 'orderId' }, '. ',
      { kind: 'row', text: 'Order 101', column: 'orderId' }, ' is below ',
      { kind: 'row', text: '$50', column: 'amount' }, '. ',
      { kind: 'row', text: 'Order 103', column: 'orderId' }, ' is exactly ',
      { kind: 'row', text: '$50', column: 'amount' }, ' and passes because the predicate uses ',
      { kind: 'term', text: '>=' }, '.',
    ],
  },
  {
    time: 0, title: 'Choose columns with SELECT', stage: 'projection',
    explanation: [
      { kind: 'term', text: 'Projection' }, ' keeps ', { kind: 'term', text: 'order_id', column: 'orderId' },
      ' and ', { kind: 'term', text: 'amount', column: 'amount' },
      '. Notes remain in the input but do not appear in this query result.',
    ],
  },
  ...changes.flatMap((change, index) => [
    { time: index + 1, title: change.title, stage: 'source' as const, before: change.before, explanation: inputExplanations[index]! },
    { time: index + 1, title: `${change.title}: result`, stage: (index === 0 || index === 2 ? 'filter' : 'projection') as StageId, explanation: change.explanation },
  ]),
  {
    time: changes.length, title: 'Maintain the result from changes', stage: 'projection',
    explanation: [
      'The result stays consistent with the SQL as inputs change. A source update can yield zero, one, or several result diffs. Here, ',
      { kind: 'row', text: 'order 102', column: 'orderId' }, ' remains at ',
      { kind: 'row', text: '$90', column: 'amount' },
      '. Joins and aggregates will build on this example in later lectures.',
    ],
  },
];
export const runDefinition = { totalChanges: changes.length, steps: lessons };
export const lectureReference = {
  objective: 'Trace signed order changes through a filter and projection. Predict when the maintained output changes and when diffs cancel. Each numbered timestamp is one complete simulated batch, not elapsed seconds. The starting rows are already present at t = 0; the diff panels show only subsequent changes.',
  sql: 'CREATE MATERIALIZED VIEW qualifying_orders AS\nSELECT order_id, amount\nFROM orders\nWHERE amount >= 50;\n\nSELECT * FROM qualifying_orders;',
  documentationLinks: [
    { label: 'SELECT: filters and selected columns', href: 'https://materialize.com/docs/sql/select/' },
    { label: 'Views and incremental maintenance', href: 'https://materialize.com/docs/fundamentals/concepts/views/' },
    { label: 'SUBSCRIBE: signed result changes', href: 'https://materialize.com/docs/sql/subscribe/#output' },
  ],
};
