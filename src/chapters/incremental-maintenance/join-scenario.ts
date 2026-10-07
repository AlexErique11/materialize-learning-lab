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
export const joinLessons: readonly { time: number; title: string; stage: JoinStage; explanation: string; before?: string }[] = [
  { time: 0, title: 'Start with Orders', stage: 'orders', explanation: 'Orders 101 and 103 have product_id 7; order 102 has product_id 8. These keys tell the join which product each order needs. This fresh scenario starts with the original three orders.' },
  { time: 0, title: 'Look up the product keys', stage: 'products', explanation: 'Products maps product_id 7 to Notebook and product_id 8 to Pen. Match these keys with product_id in Orders. Product names come from this table.' },
  { time: 0, title: 'Two inputs, one result', stage: 'result', explanation: 'Orders 101 and 103 join with Notebook; order 102 joins with Pen. The result keeps order_id, name and amount, leaving out product_id. This query has no amount filter. The diagram is a teaching model, not a physical execution plan.' },
  { time: 1, title: 'An order without a product', stage: 'orders', before: 'Order 104 arrives for product_id 9. Products has no matching key yet. Does an INNER JOIN produce a result row?', explanation: 'Orders now retains order 104 with product_id 9 and amount $70. Its full row appears with +1 in Orders diffs. Next, inspect the joined result.' },
  { time: 1, title: 'No match, no joined row', stage: 'result', explanation: 'The joined result has no order 104 and no result diff. There is no matching product yet, even though the order is retained in Orders.' },
  { time: 2, title: 'The match arrives later', stage: 'products', before: 'Product_id 9, Mug, arrives in Products. Order 104 has not changed. Can the joined result change?', explanation: 'Products gains (9, Mug), shown with +1 in its diffs. This new key matches the product_id 9 retained by order 104.' },
  { time: 2, title: 'A retained order gains its match', stage: 'result', explanation: 'The new Mug product matches order 104, inserting (104, Mug, 70) into the result. The order did not need to arrive again. Changes on either input can produce output.' },
  { time: 3, title: 'Rename product 7', stage: 'products', before: 'Product_id 7 changes its name from Notebook to Journal. It matches orders 101 and 103. How many joined rows need replacing?', explanation: 'Products still has key 7, now named Journal. Its diffs retract (7, Notebook) and insert (7, Journal). The key is unchanged; only the name changes.' },
  { time: 3, title: 'One product, several orders', stage: 'result', explanation: 'Orders 101 and 103 each lose their Notebook row and gain a Journal row: two retractions and two insertions. Their amounts stay the same. Orders 102 and 104 are unaffected.' },
  { time: 4, title: 'Remove the matching product', stage: 'products', before: 'Product_id 9, Mug, is deleted from Products. What happens to the joined row for order 104, and to the order itself?', explanation: 'Products no longer has key 9. The Products diffs show (9, Mug) with -1 and no replacement. Order 104 still exists in Orders.' },
  { time: 4, title: 'Retract the lost match', stage: 'result', explanation: 'The result retracts (104, Mug, 70). Order 104 remains in Orders with product_id 9, now unmatched again. Deleting a product does not delete its orders.' },
  { time: 4, title: 'Maintain matches from either side', stage: 'products', explanation: 'Keep both inputs available for future matches. An input change can produce zero, one, or several result changes. Only matching rows are affected; unrelated joined rows stay the same.' },
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
