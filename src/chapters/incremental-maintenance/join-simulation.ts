import { initialOrders, initialProducts, joinChanges, type JoinedOrder, type Product } from './join-scenario';
import type { Diff, Order } from './scenario';

export function joinRows(orders: readonly Order[], products: readonly Product[]): JoinedOrder[] {
  return orders.flatMap((order) => products.filter((product) => product.productId === order.productId)
    .map((product) => ({ orderId: order.orderId, name: product.name, amount: order.amount })));
}

export function joinSnapshotAt(time: number) {
  let orders = [...initialOrders];
  let products = [...initialProducts];
  let orderDiffs: Diff<Order>[] = [];
  let productDiffs: Diff<Product>[] = [];
  let outputDiffs: Diff<JoinedOrder>[] = [];
  for (const change of joinChanges.slice(0, time)) {
    orderDiffs = [];
    productDiffs = [];
    outputDiffs = [];
    if (change.input === 'orders') {
      orderDiffs = [{ row: change.row, diff: change.diff }];
      outputDiffs = joinRows([change.row], products).map((row) => ({ row, diff: change.diff }));
      orders.push(change.row);
    } else {
      if (change.oldRow) productDiffs.push({ row: change.oldRow, diff: -1 });
      if (change.newRow) productDiffs.push({ row: change.newRow, diff: 1 });
      outputDiffs = productDiffs.flatMap(({ row, diff }) => joinRows(orders, [row]).map((joined) => ({ row: joined, diff })));
      if (change.oldRow) products = products.filter((product) => product.productId !== change.oldRow!.productId);
      if (change.newRow) products.push(change.newRow);
    }
  }
  const output = joinRows(orders, products);
  const lastChange = joinChanges[time - 1];
  const affectedProductId = lastChange === undefined ? undefined
    : lastChange.input === 'orders' ? lastChange.row.productId : (lastChange.newRow ?? lastChange.oldRow)!.productId;
  return { orders, products, output, orderDiffs, productDiffs, outputDiffs, affectedProductId };
}
