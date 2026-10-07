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
  { orderId: 101, productId: 7, amount: 30, note: 'Standard delivery' },
  { orderId: 102, productId: 8, amount: 80, note: 'Gift' },
  { orderId: 103, productId: 7, amount: 50, note: 'Standard delivery' },
];
export const changes = [
  { title: 'Cross into the filter', before: 'Order 101 changes from $30 to $60. With amount >= 50, which version passes the filter? Predict the result diff.', orderId: 101, patch: { amount: 60 }, explanation: 'Order 101 moves from $30 to $60. The old row fails the filter; the new row passes. The result gains (101, 60).' },
  { title: 'Edit an unused column', before: 'Order 103 keeps its $50 amount but changes its note from Standard delivery to Express delivery. SELECT keeps only order_id and amount. Will the output change?', orderId: 103, patch: { note: 'Express delivery' }, explanation: 'Retract (103, 7, 50, Standard delivery) and insert (103, 7, 50, Express delivery) at the same timestamp. Only note changes. Both rows pass WHERE, but SELECT drops note. Their identical projected rows cancel, so a SUBSCRIBE to qualifying_orders emits no result update for this edit.' },
  { title: 'Cross out of the filter', before: 'Order 101 changes from $60 to $40. Predict what happens to its existing result row when it no longer passes the filter.', orderId: 101, patch: { amount: 40 }, explanation: 'Order 101 falls below $50. Its old $60 row passes and is retracted; its new $40 row is filtered out. The result loses (101, 60).' },
  { title: 'Replace a qualifying amount', before: 'Order 102 changes from $80 to $90. Both versions pass the filter. Predict the retraction and insertion in the result.', orderId: 102, patch: { amount: 90 }, explanation: 'Both amounts qualify. Retract (102, 80) and insert (102, 90) at the same timestamp. An update replaces the old result row.' },
  { title: 'Delete a qualifying order', before: 'Order 103, currently $50, is deleted. Predict the result diff and decide whether order 102 should change too.', orderId: 103, patch: null, explanation: 'Deleting order 103 retracts its qualifying row. Order 102 is unaffected and remains in the result.' },
] as const;

export const stages = [
  { id: 'source', title: 'Orders', sql: 'FROM orders', description: 'The input keeps all order columns. A business update retracts the old full row and inserts its replacement at the same timestamp.' },
  { id: 'filter', title: 'Filter', sql: 'WHERE amount >= 50', description: 'Test each signed row against the predicate. Rows below $50 do not pass; exactly $50 qualifies. Retractions follow the same predicate as insertions.' },
  { id: 'projection', title: 'Projection', sql: 'SELECT order_id, amount', description: 'Keep only the selected columns. Opposite diffs for the same projected row at the same timestamp cancel. SELECT without DISTINCT still preserves duplicate row copies.' },
] as const;
export type StageId = typeof stages[number]['id'];
const inputExplanations = [
  'In Orders, retract the full $30 row for order 101 and insert its $60 replacement. Only amount changes; the other fields stay the same.',
  'In Orders, retract order 103 with Standard delivery and insert its Express delivery replacement. Its amount stays $50. The highlighted notes distinguish the two full rows.',
  'In Orders, retract order 101 at $60 and insert its $40 replacement. The order still exists in the input; next, inspect what passes WHERE.',
  'In Orders, replace order 102 at $80 with the full row at $90. The signed input rows show the old and new amounts.',
  'Orders no longer contains order 103. Its full row appears in the input diffs with -1 and no replacement; the other orders remain.',
];
export const lessons: readonly { time: number; title: string; stage: StageId; explanation: string; before?: string }[] = [
  { time: 0, title: 'Compute the starting result', stage: 'source', explanation: 'Start with three existing orders. The initial result is computed from all three rows. Later changes maintain that result. These stages are a teaching model of the SQL, not a physical query plan.' },
  { time: 0, title: 'Choose rows with WHERE', stage: 'filter', explanation: 'The filter keeps orders 102 and 103. Order 101 is below $50. Order 103 is exactly $50 and passes because the predicate uses >=.' },
  { time: 0, title: 'Choose columns with SELECT', stage: 'projection', explanation: 'Projection keeps order_id and amount. Delivery notes remain in the input but do not appear in this query result.' },
  ...changes.flatMap((change, index) => [
    { time: index + 1, title: change.title, stage: 'source' as const, before: change.before, explanation: inputExplanations[index]! },
    { time: index + 1, title: `${change.title}: result`, stage: (index === 0 || index === 2 ? 'filter' : 'projection') as StageId, explanation: change.explanation },
  ]),
  { time: changes.length, title: 'Maintain the result from changes', stage: 'projection', explanation: 'The result stays consistent with the SQL as inputs change. A source update can yield zero, one, or several result diffs. Here, order 102 remains at $90. Joins and aggregates will build on this example in later lectures.' },
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
