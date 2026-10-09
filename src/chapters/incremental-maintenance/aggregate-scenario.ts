import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
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
export const aggregateLessons: readonly { time: number; title: string; stage: 'orders' | 'groups' | 'result'; explanation: LessonTextContent; before?: LessonTextContent }[] = [
  {
    time: 0, stage: 'orders', title: 'Start with orders',
    explanation: [
      { kind: 'row', text: 'Orders 101 and 103', column: 'orderId' }, ' belong to ',
      { kind: 'row', text: 'product 7', column: 'productId' }, '. ',
      { kind: 'row', text: 'Order 102', column: 'orderId' }, ' belongs to ',
      { kind: 'row', text: 'product 8', column: 'productId' }, '. Every order contributes its ',
      { kind: 'term', text: 'amount', column: 'amount' }, '.',
    ],
  },
  {
    time: 0, stage: 'groups', title: 'Retain state by group',
    explanation: [
      { kind: 'row', text: 'Product 7', column: 'productId' }, ' has ',
      { kind: 'count', text: 'two contributions', column: 'count' }, ': ',
      { kind: 'row', text: '$30', column: 'amount' }, ' + ', { kind: 'row', text: '$50', column: 'amount' },
      ' = ', { kind: 'row', text: '$80', column: 'amount' }, '. ',
      { kind: 'row', text: 'Product 8', column: 'productId' }, ' has ',
      { kind: 'count', text: 'one', column: 'count' }, ': ', { kind: 'row', text: '$80', column: 'amount' },
      '. ', { kind: 'term', text: 'Count and sum' },
      ' summarize each group for this query. The cards model retained state, not measured memory.',
    ],
  },
  {
    time: 0, stage: 'result', title: 'One row per group',
    explanation: [
      'The output is (', { kind: 'term', text: 'product_id', column: 'productId' }, ', ',
      { kind: 'term', text: 'order_count', column: 'count' }, ', ',
      { kind: 'term', text: 'revenue', column: 'total' }, '): ', '(',
      { kind: 'row', text: '7', column: 'productId' }, ', ', { kind: 'row', text: '2', column: 'count' },
      ', ', { kind: 'row', text: '80', column: 'total' }, ')', ' and ', '(',
      { kind: 'row', text: '8', column: 'productId' }, ', ', { kind: 'row', text: '1', column: 'count' },
      ', ', { kind: 'row', text: '80', column: 'total' }, ')',
      '. Equal totals do not merge different group keys.',
    ],
  },
  {
    time: 1, stage: 'orders', title: 'Correct an amount',
    before: [
      { kind: 'row', text: 'Order 101', column: 'orderId' }, ' changes from ',
      { kind: 'row', text: '$30', column: 'amount' }, ' to ', { kind: 'row', text: '$60', column: 'amount' },
      '. Predict the count and ', { kind: 'term', text: 'revenue', column: 'total' }, ' for ',
      { kind: 'row', text: 'product 7', column: 'productId' }, '. Does ',
      { kind: 'row', text: 'product 8', column: 'productId' }, ' change?',
    ],
    explanation: [
      'Retract the old order and insert its replacement. Both signed contributions belong to ',
      { kind: 'row', text: 'product 7', column: 'productId' }, ' at the same timestamp.',
    ],
  },
  {
    time: 1, stage: 'groups', title: 'Adjust the affected group',
    explanation: [
      { kind: 'count', text: 'Count stays 2', column: 'count' },
      ': minus one order plus one order. Revenue changes by ',
      { kind: 'row', text: '-$30', column: 'amount' }, ' + ', { kind: 'row', text: '$60', column: 'amount' },
      ' = ', { kind: 'row', text: '+$30', column: 'amount' }, ', reaching ',
      { kind: 'row', text: '$110', column: 'amount' }, '. ',
      { kind: 'row', text: 'Product 8', column: 'productId' }, ' is untouched.',
    ],
  },
  {
    time: 1, stage: 'result', title: 'Replace the full result row',
    explanation: [
      'Retract ', '(', { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: '2', column: 'count' }, ', ', { kind: 'row', text: '80', column: 'total' }, ')',
      ' with ', { kind: 'diff', text: '-1' }, '; insert ', '(',
      { kind: 'row', text: '7', column: 'productId' }, ', ', { kind: 'row', text: '2', column: 'count' },
      ', ', { kind: 'row', text: '110', column: 'total' }, ')', ' with ', { kind: 'diff', text: '+1' },
      '. A ', { kind: 'row', text: '$30', column: 'amount' }, ' ',
      { kind: 'term', text: 'revenue', column: 'total' }, ' change is not ',
      { kind: 'diff', text: 'mz_diff +30' }, ': diffs describe copies of complete rows.',
    ],
  },
  {
    time: 2, stage: 'orders', title: 'Cancel the last order',
    before: [
      'Cancel ', { kind: 'row', text: 'order 102', column: 'orderId' }, ', the only order for ',
      { kind: 'row', text: 'product 8', column: 'productId' }, '. Will its result become ', '(',
      { kind: 'row', text: '8', column: 'productId' }, ', ', { kind: 'row', text: '0', column: 'count' },
      ', ', { kind: 'row', text: '0', column: 'total' }, ')', ', or disappear?',
    ],
    explanation: [
      { kind: 'row', text: 'Order 102', column: 'orderId' }, ' is retracted. ',
      { kind: 'row', text: 'Product 8', column: 'productId' }, ' now has no input rows.',
    ],
  },
  {
    time: 2, stage: 'result', title: 'An empty group disappears',
    explanation: [
      'Retract ', '(', { kind: 'row', text: '8', column: 'productId' }, ', ',
      { kind: 'row', text: '1', column: 'count' }, ', ', { kind: 'row', text: '80', column: 'total' }, ')',
      ' with no replacement. ', { kind: 'term', text: 'GROUP BY' },
      ' does not invent a zero-valued row for an absent key. This is a grouped query, not a global aggregate without ',
      { kind: 'term', text: 'GROUP BY' }, '.',
    ],
  },
  {
    time: 3, stage: 'orders', title: 'Move an order between groups',
    before: [
      'Move ', { kind: 'row', text: 'order 103', column: 'orderId' }, ' from ',
      { kind: 'row', text: 'product 7', column: 'productId' }, ' to ',
      { kind: 'row', text: 'product 9', column: 'productId' }, ', keeping its ',
      { kind: 'row', text: '$50', column: 'amount' }, ' ',
      { kind: 'term', text: 'amount', column: 'amount' }, '. Predict both groups and their output diffs.',
    ],
    explanation: [
      'Retract the ', { kind: 'row', text: 'product 7', column: 'productId' }, ' version and insert the ',
      { kind: 'row', text: 'product 9', column: 'productId' }, ' version. One edit touches two keys.',
    ],
  },
  {
    time: 3, stage: 'result', title: 'Replace one group, create another',
    explanation: [
      'Replace ', '(', { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: '2', column: 'count' }, ', ', { kind: 'row', text: '110', column: 'total' }, ')',
      ' with ', '(', { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: '1', column: 'count' }, ', ', { kind: 'row', text: '60', column: 'total' }, ')',
      ': ', { kind: 'diff', text: '-1' }, ' then ', { kind: 'diff', text: '+1' }, '. New ',
      { kind: 'row', text: 'product 9', column: 'productId' }, ' gains ', '(',
      { kind: 'row', text: '9', column: 'productId' }, ', ', { kind: 'row', text: '1', column: 'count' },
      ', ', { kind: 'row', text: '50', column: 'total' }, ')',
      '. Incremental maintenance can affect several result rows.',
    ],
  },
  {
    time: 4, stage: 'result', title: 'Zero revenue is still a group',
    before: [
      'Set ', { kind: 'row', text: 'order 101', column: 'orderId' }, ' to ',
      { kind: 'row', text: '$0', column: 'amount' }, '. It still exists. Does ',
      { kind: 'row', text: 'product 7', column: 'productId' }, ' disappear?',
    ],
    explanation: [
      'Replace ', '(', { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: '1', column: 'count' }, ', ', { kind: 'row', text: '60', column: 'total' }, ')',
      ' with ', '(', { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: '1', column: 'count' }, ', ', { kind: 'row', text: '0', column: 'total' }, ')',
      '. ', { kind: 'count', text: 'Count is still 1', column: 'count' },
      ', so the group exists. Zero sum does not mean an empty group.',
    ],
  },
  {
    time: 5, stage: 'result', title: 'Predict the final cancellation',
    before: [
      'Now cancel the zero-valued ', { kind: 'row', text: 'order 101', column: 'orderId' },
      '. Predict the complete result batch. Should ',
      { kind: 'row', text: 'product 9', column: 'productId' }, ' change?',
    ],
    explanation: [
      'Retract ', '(', { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: '1', column: 'count' }, ', ', { kind: 'row', text: '0', column: 'total' }, ')',
      ', with no replacement. ', { kind: 'row', text: 'Product 9', column: 'productId' }, ' stays ', '(',
      { kind: 'row', text: '9', column: 'productId' }, ', ', { kind: 'row', text: '1', column: 'count' },
      ', ', { kind: 'row', text: '50', column: 'total' }, ')', '. ',
      { kind: 'term', text: 'Retained counts' }, ' distinguish zero ',
      { kind: 'term', text: 'revenue', column: 'total' },
      ' from an absent group; unrelated results stay unchanged.',
    ],
  },
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
