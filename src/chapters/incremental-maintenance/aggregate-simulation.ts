import { aggregateChanges, initialOrders, type AggregateRow } from './aggregate-scenario';
import type { Diff, Order } from './scenario';
import { consolidate } from './simulation';

export function contributeToGroup(groups: Map<number, AggregateRow>, row: Pick<Order, 'productId' | 'amount'>, diff: number) {
  const previous = groups.get(row.productId);
  const count = (previous?.count ?? 0) + diff;
  const total = (previous?.total ?? 0) + row.amount * diff;
  if (count === 0) groups.delete(row.productId);
  else groups.set(row.productId, { productId: row.productId, count, total });
}

export function aggregateSnapshotAt(time: number) {
  let orders = [...initialOrders];
  const groups = new Map<number, AggregateRow>();
  for (const row of orders) contributeToGroup(groups, row, 1);
  let orderDiffs: Diff<Order>[] = [];
  let outputDiffs: Diff<AggregateRow>[] = [];
  let previous: readonly AggregateRow[] = [...groups.values()];
  for (const change of aggregateChanges.slice(0, time)) {
    previous = [...groups.values()];
    const oldRow = orders.find((row) => row.orderId === change.orderId)!;
    const newRow = change.patch ? { ...oldRow, ...change.patch } : undefined;
    orderDiffs = [{ row: oldRow, diff: -1 }, ...(newRow ? [{ row: newRow, diff: 1 }] : [])];
    const keys = new Set(orderDiffs.map(({ row }) => row.productId));
    const before = [...keys].flatMap((key) => groups.has(key) ? [{ row: groups.get(key)!, diff: -1 }] : []);
    for (const { row, diff } of orderDiffs) contributeToGroup(groups, row, diff);
    orders = orders.flatMap((row) => row.orderId !== change.orderId ? [row] : newRow ? [newRow] : []);
    outputDiffs = consolidate([...before, ...[...keys].flatMap((key) => groups.has(key) ? [{ row: groups.get(key)!, diff: 1 }] : [])]);
  }
  return { orders, previous, output: [...groups.values()].sort((a, b) => a.productId - b.productId), orderDiffs, outputDiffs };
}
