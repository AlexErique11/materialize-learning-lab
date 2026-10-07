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

export const comparisonLessons = [
  { time: 0, stage: 'orders', title: 'One query, the same inputs', explanation: 'Six orders belong to three products. Both methods compute the grouped count and revenue query from Lecture 3. Their result tables must agree at every complete timestamp.' },
  { time: 0, stage: 'recompute', title: 'Initial computation needs the existing rows', explanation: 'Both methods process six initial contributions and establish three groups. Incremental maintenance does not make the initial computation free.' },
  { time: 0, stage: 'incremental', title: 'Keep state for the next change', explanation: 'The incremental path retains each product’s count and sum. These summaries are sufficient for this query’s updates. This is a logical model, not measured memory or an execution plan.' },
  { time: 1, stage: 'orders', title: 'Predict an amount correction', before: 'Order 101 changes from $30 to $60. Which product groups will change? Must both methods process every order again?', explanation: 'The edit replaces the old order with a new version at one timestamp. Only product 7’s revenue changes, from $80 to $110. Its count remains 2.' },
  { time: 1, stage: 'recompute', title: 'Rebuild the same query result', explanation: 'The recomputation model processes all six current orders and rebuilds all three groups, including products 8 and 9 whose results did not change.' },
  { time: 1, stage: 'incremental', title: 'Adjust one retained group', explanation: 'Apply −$30 and +$60 to product 7. Two signed aggregate contributions update one group; products 8 and 9 keep their retained state. Both result tables show the same full rows.' },
  { time: 2, stage: 'orders', title: 'One edit can affect two groups', before: 'Move order 103, worth $80, from product 8 to product 7. Predict both new totals and which group remains unchanged.', explanation: 'Retract its contribution from product 8 and add it to product 7. Product 7 becomes (count 3, revenue $190); product 8 becomes (count 1, revenue $20). Product 9 stays unchanged.' },
  { time: 2, stage: 'recompute', title: 'All groups are rebuilt again', explanation: 'Recomputation uses all six orders. It reaches the same result, but this model rebuilds product 9 as well as the two changed groups.' },
  { time: 2, stage: 'incremental', title: 'Reuse the unaffected state', explanation: 'Two signed contributions touch two group keys. The number of affected groups depends on the old and new keys, not just the number of edited orders.' },
  { time: 3, stage: 'orders', title: 'An input edit may leave the result unchanged', before: 'Only order 102’s note changes. This query uses product_id and amount. Will any result row change?', explanation: 'The old and new projected (product_id, amount) contributions are identical. Their opposite diffs consolidate to zero before the aggregate in this model.' },
  { time: 3, stage: 'incremental', title: 'No net aggregate contribution', explanation: 'No group totals change. The recomputation model still processes six rows; the incremental model applies zero net aggregate contributions. Processing the source edit still has work that these counters do not measure.' },
  { time: 4, stage: 'orders', title: 'Predict a broad batch', before: 'Add $100 to every order in one batch. Which groups change? Will the incremental path still touch only a small part of the result?', explanation: 'All three groups change. Their revenues become $490, $120, and $300. Counts stay 3, 1, and 2.' },
  { time: 4, stage: 'recompute', title: 'Compare the whole batch', explanation: 'Recomputation processes six current contributions. Maintenance applies twelve signed contributions: six old amounts out and six new amounts in. Both produce the same three result rows.' },
  { time: 4, stage: 'incremental', title: 'Explain what maintenance reuses', explanation: 'For any batch, the old and new product keys determine the affected groups. Retained counts and sums let this query apply signed contributions to those groups. A broad batch can touch every group; illustrative contribution counts alone do not predict which approach runs faster.' },
] as const;

export const comparisonRunDefinition = { totalChanges: comparisonChanges.length, steps: comparisonLessons };
export const comparisonReference = {
  ...aggregateReference,
  objective: 'Compare identical grouped revenue results from full recomputation and signed incremental maintenance. Predict affected groups and explain reused count/sum state. Counters describe illustrative algorithms, not Materialize measurements or total work. Unique order IDs and non-null integer values keep the example focused. Timestamps identify complete batches, not elapsed time.',
  documentationLinks: [...aggregateReference.documentationLinks,
    { label: 'Incremental dataflows and retained state', href: 'https://materialize.com/docs/fundamentals/concepts/arrangements/' }],
};
