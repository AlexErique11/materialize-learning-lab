import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
import type { Order } from './scenario';
import { aggregateReference } from './aggregate-scenario';

export const comparisonOrders: readonly Order[] = [
  { orderId: 101, productId: 7, amount: 30, note: 'Standard' },
  { orderId: 102, productId: 7, amount: 50, note: 'Standard' },
  { orderId: 103, productId: 8, amount: 80, note: 'Standard' },
  { orderId: 104, productId: 8, amount: 20, note: 'Standard' },
  { orderId: 105, productId: 9, amount: 40, note: 'Standard' },
  { orderId: 106, productId: 9, amount: 60, note: 'Standard' },
];

export const comparisonChanges: readonly { title: string; patches: readonly { orderId: number; patch: Partial<Order> & { amountDelta?: number } }[] }[] = [
  { title: 'Correct order 101: $30 → $60', patches: [{ orderId: 101, patch: { amount: 60 } }] },
  { title: 'Move order 103: product 8 → product 7', patches: [{ orderId: 103, patch: { productId: 7 } }] },
  { title: 'Edit order 102’s unused note', patches: [{ orderId: 102, patch: { note: 'Express' } }] },
  { title: 'One batch: add $100 to all six orders', patches: comparisonOrders.map((row) => ({ orderId: row.orderId, patch: { amountDelta: 100 } })) },
];

export const comparisonStages = [
  { id: 'orders', title: 'Shared orders', shortTitle: 'Orders', sql: 'Same inputs → both methods', description: 'Each chip shows order ID, product ID, and amount. The same complete input snapshot feeds both methods. Highlighted orders changed in this batch. The query ignores notes.', showChanges: false },
  { id: 'recompute', title: 'Full recomputation', shortTitle: 'Recompute', sql: 'Rebuild COUNT(*) and SUM(amount)', description: 'This teaching algorithm starts with empty group totals and processes every current order to rebuild the result after each batch.', showChanges: false },
  { id: 'incremental', title: 'Incremental maintenance', shortTitle: 'Maintain', sql: 'Signed changes + retained group state', description: 'This teaching algorithm retains count and sum by product. It consolidates changes to the selected product and amount, then applies their signed contributions to affected groups.', showChanges: false },
] as const;

export const comparisonLessons: readonly { time: number; title: string; stage: 'orders' | 'recompute' | 'incremental'; explanation: LessonTextContent; before?: LessonTextContent }[] = [
  {
    time: 0, stage: 'orders', title: 'One query, the same inputs',
    explanation: [
      { kind: 'count', text: 'Six orders', column: 'count' }, ' belong to ',
      { kind: 'count', text: 'three products', column: 'count' },
      '. Both methods compute the grouped count and ', { kind: 'term', text: 'revenue', column: 'total' },
      ' query from Lecture 3. Their result tables must agree at every complete timestamp.',
    ],
  },
  {
    time: 0, stage: 'recompute', title: 'Initial computation needs the existing rows',
    explanation: [
      'Both methods process ', { kind: 'count', text: 'six initial contributions', column: 'count' },
      ' and establish ', { kind: 'count', text: 'three groups', column: 'count' },
      '. Incremental maintenance does not make the initial computation free.',
    ],
  },
  {
    time: 0, stage: 'incremental', title: 'Keep state for the next change',
    explanation: [
      'The incremental path retains each product’s ', { kind: 'term', text: 'count and sum' },
      '. These summaries are sufficient for this query’s updates. This is a logical model, not measured memory or an execution plan.',
    ],
  },
  {
    time: 1, stage: 'orders', title: 'Predict an amount correction',
    before: [
      { kind: 'row', text: 'Order 101', column: 'orderId' }, ' changes from ',
      { kind: 'row', text: '$30', column: 'amount' }, ' to ', { kind: 'row', text: '$60', column: 'amount' },
      '. Which product groups will change? Must both methods process every order again?',
    ],
    explanation: [
      'The edit replaces the old order with a new version at one timestamp. Only ',
      { kind: 'row', text: 'product 7', column: 'productId' }, '’s ',
      { kind: 'term', text: 'revenue', column: 'total' }, ' changes, from ',
      { kind: 'row', text: '$80', column: 'amount' }, ' to ',
      { kind: 'row', text: '$110', column: 'amount' }, '. Its ',
      { kind: 'count', text: 'count remains 2', column: 'count' }, '.',
    ],
  },
  {
    time: 1, stage: 'recompute', title: 'Rebuild the same query result',
    explanation: [
      'The recomputation model processes ',
      { kind: 'count', text: 'all six current orders', column: 'count' }, ' and rebuilds ',
      { kind: 'count', text: 'all three groups', column: 'count' },
      ', including products 8 and 9 whose results did not change.',
    ],
  },
  {
    time: 1, stage: 'incremental', title: 'Adjust one retained group',
    explanation: [
      'Apply ', { kind: 'row', text: '−$30', column: 'amount' }, ' and ',
      { kind: 'row', text: '+$60', column: 'amount' }, ' to ',
      { kind: 'row', text: 'product 7', column: 'productId' }, '. ',
      { kind: 'count', text: 'Two signed aggregate contributions', column: 'count' },
      ' update one group; products 8 and 9 keep their retained state. Both result tables show the same full rows.',
    ],
  },
  {
    time: 2, stage: 'orders', title: 'One edit can affect two groups',
    before: [
      'Move ', { kind: 'row', text: 'order 103', column: 'orderId' }, ', worth ',
      { kind: 'row', text: '$80', column: 'amount' }, ', from ',
      { kind: 'row', text: 'product 8', column: 'productId' }, ' to ',
      { kind: 'row', text: 'product 7', column: 'productId' },
      '. Predict both new totals and which group remains unchanged.',
    ],
    explanation: [
      'Retract its contribution from ', { kind: 'row', text: 'product 8', column: 'productId' },
      ' and add it to ', { kind: 'row', text: 'product 7', column: 'productId' }, '. ',
      { kind: 'row', text: 'Product 7', column: 'productId' }, ' becomes ', '(',
      { kind: 'count', text: 'count 3', column: 'count' }, ', ',
      { kind: 'term', text: 'revenue', column: 'total' }, ' ',
      { kind: 'row', text: '$190', column: 'amount' }, ')', '; ',
      { kind: 'row', text: 'product 8', column: 'productId' }, ' becomes ', '(',
      { kind: 'count', text: 'count 1', column: 'count' }, ', ',
      { kind: 'term', text: 'revenue', column: 'total' }, ' ',
      { kind: 'row', text: '$20', column: 'amount' }, ')', '. ',
      { kind: 'row', text: 'Product 9', column: 'productId' }, ' stays unchanged.',
    ],
  },
  {
    time: 2, stage: 'recompute', title: 'All groups are rebuilt again',
    explanation: [
      'Recomputation uses ', { kind: 'count', text: 'all six orders', column: 'count' },
      '. It reaches the same result, but this model rebuilds ',
      { kind: 'row', text: 'product 9', column: 'productId' }, ' as well as the ',
      { kind: 'count', text: 'two changed groups', column: 'count' }, '.',
    ],
  },
  {
    time: 2, stage: 'incremental', title: 'Reuse the unaffected state',
    explanation: [
      { kind: 'count', text: 'Two signed contributions', column: 'count' }, ' touch ',
      { kind: 'count', text: 'two group keys', column: 'count' },
      '. The number of affected groups depends on the old and new keys, not just the number of edited orders.',
    ],
  },
  {
    time: 3, stage: 'orders', title: 'An input edit may leave the result unchanged',
    before: [
      'Only ', { kind: 'row', text: 'order 102', column: 'orderId' }, '’s note changes. This query uses ',
      { kind: 'term', text: 'product_id', column: 'productId' }, ' and ',
      { kind: 'term', text: 'amount', column: 'amount' }, '. Will any result row change?',
    ],
    explanation: [
      'The old and new projected (', { kind: 'term', text: 'product_id', column: 'productId' }, ', ',
      { kind: 'term', text: 'amount', column: 'amount' },
      ') contributions are identical. Their opposite diffs consolidate to zero before the aggregate in this model.',
    ],
  },
  {
    time: 3, stage: 'incremental', title: 'No net aggregate contribution',
    explanation: [
      'No group totals change. The recomputation model still processes ',
      { kind: 'count', text: 'six rows', column: 'count' }, '; the incremental model applies ',
      { kind: 'count', text: 'zero net aggregate contributions', column: 'count' },
      '. Processing the source edit still has work that these counters do not measure.',
    ],
  },
  {
    time: 4, stage: 'orders', title: 'Predict a broad batch',
    before: [
      'Add ', { kind: 'row', text: '$100', column: 'amount' },
      ' to every order in one batch. Which groups change? Will the incremental path still touch only a small part of the result?',
    ],
    explanation: [
      'All ', { kind: 'count', text: 'three groups', column: 'count' }, ' change. Their revenues become ',
      { kind: 'row', text: '$490', column: 'amount' }, ', ', { kind: 'row', text: '$120', column: 'amount' },
      ', and ', { kind: 'row', text: '$300', column: 'amount' }, '. ',
      { kind: 'count', text: 'Counts stay 3, 1, and 2', column: 'count' }, '.',
    ],
  },
  {
    time: 4, stage: 'recompute', title: 'Compare the whole batch',
    explanation: [
      'Recomputation processes ', { kind: 'count', text: 'six current contributions', column: 'count' },
      '. Maintenance applies ', { kind: 'count', text: 'twelve signed contributions', column: 'count' },
      ': six old amounts out and six new amounts in. Both produce the same ',
      { kind: 'count', text: 'three result rows', column: 'count' }, '.',
    ],
  },
  {
    time: 4, stage: 'incremental', title: 'Explain what maintenance reuses',
    explanation: [
      'For any batch, the old and new product keys determine the affected groups. ',
      { kind: 'term', text: 'Retained counts' },
      ' and sums let this query apply signed contributions to those groups. A broad batch can touch every group; illustrative contribution counts alone do not predict which approach runs faster.',
    ],
  },
] as const;

export const comparisonRunDefinition = { totalChanges: comparisonChanges.length, steps: comparisonLessons };
export const comparisonReference = {
  ...aggregateReference,
  objective: 'Compare identical grouped revenue results from full recomputation and signed incremental maintenance. Predict affected groups and explain reused count/sum state. Counters describe illustrative algorithms, not Materialize measurements or total work. Unique order IDs and non-null integer values keep the example focused. Timestamps identify complete batches, not elapsed time.',
  documentationLinks: [...aggregateReference.documentationLinks,
    { label: 'Incremental dataflows and retained state', href: 'https://materialize.com/docs/fundamentals/concepts/arrangements/' }],
};
