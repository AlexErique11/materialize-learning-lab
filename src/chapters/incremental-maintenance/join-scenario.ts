import type { LessonTextContent } from '../changing-relations/LessonText';
import { initialOrders, type Order } from './scenario';

export interface Product { readonly productId: number; readonly name: string }
export interface JoinedOrder { readonly orderId: number; readonly name: string; readonly amount: number }
export type JoinStage = 'orders' | 'products' | 'result';
export { initialOrders };
export const initialProducts: readonly Product[] = [
  { productId: 7, name: 'Notebook' }, { productId: 8, name: 'Pen' },
];
export type JoinChange =
  | { readonly input: 'orders'; readonly row: Order; readonly diff: 1 }
  | { readonly input: 'products'; readonly oldRow?: Product; readonly newRow?: Product };
export const joinChanges: readonly JoinChange[] = [
  { input: 'orders', row: { orderId: 104, productId: 9, amount: 70, note: 'Gift' }, diff: 1 },
  { input: 'products', newRow: { productId: 9, name: 'Mug' } },
  { input: 'products', oldRow: initialProducts[0]!, newRow: { productId: 7, name: 'Journal' } },
  { input: 'products', oldRow: { productId: 9, name: 'Mug' } },
];
export const joinStages = [
  { id: 'orders', title: 'Orders', sql: 'FROM orders AS o', description: 'Orders are retained even when there is no matching product. A later product can join with an existing order.' },
  { id: 'products', title: 'Products', sql: 'INNER JOIN products AS p', description: 'Match products to orders by product_id. A product change can affect several existing orders.' },
  { id: 'result', title: 'Joined result', sql: 'ON o.product_id = p.product_id', description: 'Only matching pairs appear. Keep order_id, product name and amount. Signed diffs maintain the result as either input changes.' },
] as const;
export const joinLessons: readonly { time: number; title: string; stage: JoinStage; explanation: LessonTextContent; before?: LessonTextContent }[] = [
  {
    time: 0, title: 'Start with Orders', stage: 'orders',
    explanation: [
      { kind: 'row', text: 'Orders 101 and 103', column: 'orderId' }, ' have ',
      { kind: 'row', text: 'product_id 7', column: 'productId' }, '; ',
      { kind: 'row', text: 'order 102', column: 'orderId' }, ' has ',
      { kind: 'row', text: 'product_id 8', column: 'productId' },
      '. These keys tell the join which product each order needs. This fresh scenario starts with the original ',
      { kind: 'count', text: 'three orders', column: 'count' }, '.',
    ],
  },
  {
    time: 0, title: 'Look up the product keys', stage: 'products',
    explanation: [
      'Products maps ', { kind: 'row', text: 'product_id 7', column: 'productId' }, ' to ',
      { kind: 'row', text: 'Notebook', column: 'name' }, ' and ',
      { kind: 'row', text: 'product_id 8', column: 'productId' }, ' to ',
      { kind: 'row', text: 'Pen', column: 'name' }, '. Match these keys with ',
      { kind: 'term', text: 'product_id', column: 'productId' },
      ' in Orders. Product names come from this table.',
    ],
  },
  {
    time: 0, title: 'Two inputs, one result', stage: 'result',
    explanation: [
      { kind: 'row', text: 'Orders 101 and 103', column: 'orderId' }, ' join with ',
      { kind: 'row', text: 'Notebook', column: 'name' }, '; ',
      { kind: 'row', text: 'order 102', column: 'orderId' }, ' joins with ',
      { kind: 'row', text: 'Pen', column: 'name' }, '. The result keeps ',
      { kind: 'term', text: 'order_id', column: 'orderId' }, ', name and ',
      { kind: 'term', text: 'amount', column: 'amount' }, ', leaving out ',
      { kind: 'term', text: 'product_id', column: 'productId' }, '. This query has no ',
      { kind: 'term', text: 'amount', column: 'amount' },
      ' filter. The diagram is a teaching model, not a physical execution plan.',
    ],
  },
  {
    time: 1, title: 'An order without a product', stage: 'orders',
    before: [
      { kind: 'row', text: 'Order 104', column: 'orderId' }, ' arrives for ',
      { kind: 'row', text: 'product_id 9', column: 'productId' },
      '. Products has no matching key yet. Does an ', { kind: 'term', text: 'INNER JOIN' },
      ' produce a result row?',
    ],
    explanation: [
      'Orders now retains ', { kind: 'row', text: 'order 104', column: 'orderId' }, ' with ',
      { kind: 'row', text: 'product_id 9', column: 'productId' }, ' and ',
      { kind: 'term', text: 'amount', column: 'amount' }, ' ',
      { kind: 'row', text: '$70', column: 'amount' }, '. Its full row appears with ',
      { kind: 'diff', text: '+1' }, ' in Orders diffs. Next, inspect the joined result.',
    ],
  },
  {
    time: 1, title: 'No match, no joined row', stage: 'result',
    explanation: [
      'The joined result has no ', { kind: 'row', text: 'order 104', column: 'orderId' },
      ' and no result diff. There is no matching product yet, even though the order is retained in Orders.',
    ],
  },
  {
    time: 2, title: 'The match arrives later', stage: 'products',
    before: [
      { kind: 'row', text: 'Product_id 9', column: 'productId' }, ', ',
      { kind: 'row', text: 'Mug', column: 'name' }, ', arrives in Products. ',
      { kind: 'row', text: 'Order 104', column: 'orderId' },
      ' has not changed. Can the joined result change?',
    ],
    explanation: [
      'Products gains ', '(', { kind: 'row', text: '9', column: 'productId' }, ', ',
      { kind: 'row', text: 'Mug', column: 'name' }, ')', ', shown with ', { kind: 'diff', text: '+1' },
      ' in its diffs. This new key matches the ', { kind: 'row', text: 'product_id 9', column: 'productId' },
      ' retained by ', { kind: 'row', text: 'order 104', column: 'orderId' }, '.',
    ],
  },
  {
    time: 2, title: 'A retained order gains its match', stage: 'result',
    explanation: [
      'The new ', { kind: 'row', text: 'Mug', column: 'name' }, ' product matches ',
      { kind: 'row', text: 'order 104', column: 'orderId' }, ', inserting ', '(',
      { kind: 'row', text: '104', column: 'orderId' }, ', ', { kind: 'row', text: 'Mug', column: 'name' },
      ', ', { kind: 'row', text: '70', column: 'amount' }, ')',
      ' into the result. The order did not need to arrive again. Changes on either input can produce output.',
    ],
  },
  {
    time: 3, title: 'Rename product 7', stage: 'products',
    before: [
      { kind: 'row', text: 'Product_id 7', column: 'productId' }, ' changes its name from ',
      { kind: 'row', text: 'Notebook', column: 'name' }, ' to ',
      { kind: 'row', text: 'Journal', column: 'name' }, '. It matches ',
      { kind: 'row', text: 'orders 101 and 103', column: 'orderId' },
      '. How many joined rows need replacing?',
    ],
    explanation: [
      'Products still has key 7, now named ', { kind: 'row', text: 'Journal', column: 'name' },
      '. Its diffs retract ', '(', { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: 'Notebook', column: 'name' }, ')', ' and insert ', '(',
      { kind: 'row', text: '7', column: 'productId' }, ', ',
      { kind: 'row', text: 'Journal', column: 'name' }, ')',
      '. The key is unchanged; only the name changes.',
    ],
  },
  {
    time: 3, title: 'One product, several orders', stage: 'result',
    explanation: [
      { kind: 'row', text: 'Orders 101 and 103', column: 'orderId' }, ' each lose their ',
      { kind: 'row', text: 'Notebook', column: 'name' }, ' row and gain a ',
      { kind: 'row', text: 'Journal', column: 'name' }, ' row: ',
      { kind: 'count', text: 'two retractions', column: 'count' }, ' and ',
      { kind: 'count', text: 'two insertions', column: 'count' }, '. Their amounts stay the same. ',
      { kind: 'row', text: 'Orders 102 and 104', column: 'orderId' }, ' are unaffected.',
    ],
  },
  {
    time: 4, title: 'Remove the matching product', stage: 'products',
    before: [
      { kind: 'row', text: 'Product_id 9', column: 'productId' }, ', ',
      { kind: 'row', text: 'Mug', column: 'name' },
      ', is deleted from Products. What happens to the joined row for ',
      { kind: 'row', text: 'order 104', column: 'orderId' }, ', and to the order itself?',
    ],
    explanation: [
      'Products no longer has key 9. The Products diffs show ', '(',
      { kind: 'row', text: '9', column: 'productId' }, ', ', { kind: 'row', text: 'Mug', column: 'name' },
      ')', ' with ', { kind: 'diff', text: '-1' }, ' and no replacement. ',
      { kind: 'row', text: 'Order 104', column: 'orderId' }, ' still exists in Orders.',
    ],
  },
  {
    time: 4, title: 'Retract the lost match', stage: 'result',
    explanation: [
      'The result retracts ', '(', { kind: 'row', text: '104', column: 'orderId' }, ', ',
      { kind: 'row', text: 'Mug', column: 'name' }, ', ', { kind: 'row', text: '70', column: 'amount' }, ')',
      '. ', { kind: 'row', text: 'Order 104', column: 'orderId' }, ' remains in Orders with ',
      { kind: 'row', text: 'product_id 9', column: 'productId' },
      ', now unmatched again. Deleting a product does not delete its orders.',
    ],
  },
  {
    time: 4, title: 'Maintain matches from either side', stage: 'products',
    explanation: [
      'Keep both inputs available for future matches. An input change can produce zero, one, or several result changes. Only matching rows are affected; unrelated joined rows stay the same.',
    ],
  },
];
export const joinRunDefinition = { totalChanges: joinChanges.length, steps: joinLessons };
export const joinReference = {
  objective: 'Predict how inserts, product edits and deletions maintain an inner join. Identify matching and unaffected orders. Each numbered timestamp is one complete simulated batch, not elapsed seconds. Initial rows are already present at t = 0. Diffs show complete rows, with changed fields highlighted and unchanged fields muted.',
  sql: 'CREATE MATERIALIZED VIEW order_products AS\nSELECT o.order_id, p.name, o.amount\nFROM orders AS o\nINNER JOIN products AS p\n  ON o.product_id = p.product_id;\n\nSELECT * FROM order_products;',
  documentationLinks: [
    { label: 'INNER JOIN: matching rows', href: 'https://materialize.com/docs/sql/select/join/' },
    { label: 'Arrangements and retained join inputs', href: 'https://materialize.com/docs/fundamentals/concepts/arrangements/' },
    { label: 'SUBSCRIBE: signed result changes', href: 'https://materialize.com/docs/sql/subscribe/#output' },
  ],
};
