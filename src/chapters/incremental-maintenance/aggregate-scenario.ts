import { initialOrders, type Order } from './scenario';
export { initialOrders };
export interface AggregateRow { readonly productId: number; readonly count: number; readonly total: number }
export const aggregateChanges: readonly { orderId: number; patch: Partial<Order> | null }[] = [
  { orderId: 101, patch: { amount: 60 } }, { orderId: 102, patch: null },
  { orderId: 103, patch: { productId: 9 } }, { orderId: 101, patch: { amount: 0 } }, { orderId: 101, patch: null },
];
export const aggregateStages = [
  { id: 'orders', title: 'Orders', sql: 'FROM orders', description: 'Every order contributes. There is no amount filter or join in this query.' },
  { id: 'groups', title: 'Group state', sql: 'GROUP BY product_id', description: 'Retained count and sum per key: a logical teaching model, not a physical execution plan.' },
  { id: 'result', title: 'Revenue result', shortTitle: 'Revenue', sql: 'COUNT(*), SUM(amount)', description: 'One full result row per present group. Signed diffs replace changed rows at one logical timestamp.' },
] as const;
export const aggregateLessons = [
  { time: 0, stage: 'orders', title: 'Start with orders', explanation: 'Orders 101 and 103 belong to product 7. Order 102 belongs to product 8. Every order contributes its amount.' },
  { time: 0, stage: 'groups', title: 'Retain state by group', explanation: 'Product 7 has two contributions: $30 + $50 = $80. Product 8 has one: $80. Count and sum summarize each group for this query. The cards model retained state, not measured memory.' },
  { time: 0, stage: 'result', title: 'One row per group', explanation: 'The output is (product_id, order_count, revenue): (7, 2, 80) and (8, 1, 80). Equal totals do not merge different group keys.' },
  { time: 1, stage: 'orders', title: 'Correct an amount', before: 'Order 101 changes from $30 to $60. Predict the count and revenue for product 7. Does product 8 change?', explanation: 'Retract the old order and insert its replacement. Both signed contributions belong to product 7 at the same timestamp.' },
  { time: 1, stage: 'groups', title: 'Adjust the affected group', explanation: 'Count stays 2: minus one order plus one order. Revenue changes by -$30 + $60 = +$30, reaching $110. Product 8 is untouched.' },
  { time: 1, stage: 'result', title: 'Replace the full result row', explanation: 'Retract (7, 2, 80) with -1; insert (7, 2, 110) with +1. A $30 revenue change is not mz_diff +30: diffs describe copies of complete rows.' },
  { time: 2, stage: 'orders', title: 'Cancel the last order', before: 'Cancel order 102, the only order for product 8. Will its result become (8, 0, 0), or disappear?', explanation: 'Order 102 is retracted. Product 8 now has no input rows.' },
  { time: 2, stage: 'result', title: 'An empty group disappears', explanation: 'Retract (8, 1, 80) with no replacement. GROUP BY does not invent a zero-valued row for an absent key. This is a grouped query, not a global aggregate without GROUP BY.' },
  { time: 3, stage: 'orders', title: 'Move an order between groups', before: 'Move order 103 from product 7 to product 9, keeping its $50 amount. Predict both groups and their output diffs.', explanation: 'Retract the product 7 version and insert the product 9 version. One edit touches two keys.' },
  { time: 3, stage: 'result', title: 'Replace one group, create another', explanation: 'Replace (7, 2, 110) with (7, 1, 60): -1 then +1. New product 9 gains (9, 1, 50). Incremental maintenance can affect several result rows.' },
  { time: 4, stage: 'result', title: 'Zero revenue is still a group', before: 'Set order 101 to $0. It still exists. Does product 7 disappear?', explanation: 'Replace (7, 1, 60) with (7, 1, 0). Count is still 1, so the group exists. Zero sum does not mean an empty group.' },
  { time: 5, stage: 'result', title: 'Predict the final cancellation', before: 'Now cancel the zero-valued order 101. Predict the complete result batch. Should product 9 change?', explanation: 'Retract (7, 1, 0), with no replacement. Product 9 stays (9, 1, 50). Retained counts distinguish zero revenue from an absent group; unrelated results stay unchanged.' },
] as const;
export const aggregateRunDefinition = { totalChanges: aggregateChanges.length, steps: aggregateLessons };
export const aggregateReference = {
  objective: 'Predict grouped count and revenue, complete-row replacements, key changes and last-order deletion. Timestamps label complete simulated batches, not elapsed seconds. Initial rows exist at t = 0. The cards model logical retained state, not a physical plan or measured resources. Fixtures use unique IDs and non-null integer amounts; nullable and global aggregates are outside this lecture.',
  sql: 'CREATE MATERIALIZED VIEW revenue_by_product AS\nSELECT product_id, COUNT(*) AS order_count,\n       SUM(amount) AS revenue\nFROM orders\nGROUP BY product_id;\n\nSELECT * FROM revenue_by_product;',
  documentationLinks: [
    { label: 'SELECT and GROUP BY', href: 'https://materialize.com/docs/sql/select/' },
    { label: 'Aggregate functions', href: 'https://materialize.com/docs/sql/functions/#aggregate-functions' },
    { label: 'SUBSCRIBE result diffs', href: 'https://materialize.com/docs/sql/subscribe/#output' },
  ],
};
