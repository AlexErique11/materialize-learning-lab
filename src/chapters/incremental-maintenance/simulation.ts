import { changes, initialOrders, MINIMUM_AMOUNT, type Diff, type Order, type OutputRow } from './scenario';

export function ordersAt(time: number): readonly Order[] {
  let rows = [...initialOrders];
  for (const change of changes.slice(0, time)) {
    rows = rows.flatMap((row) => row.orderId !== change.orderId ? [row] : change.patch ? [{ ...row, ...change.patch }] : []);
  }
  return rows;
}
export const qualifies = (row: Order) => row.amount >= MINIMUM_AMOUNT;
export const project = (row: Order): OutputRow => ({ orderId: row.orderId, amount: row.amount });

export function consolidate<Row>(diffs: readonly Diff<Row>[]): Diff<Row>[] {
  const totals = new Map<string, Diff<Row>>();
  for (const entry of diffs) {
    const key = JSON.stringify(entry.row);
    totals.set(key, { row: entry.row, diff: (totals.get(key)?.diff ?? 0) + entry.diff });
  }
  return [...totals.values()].filter((entry) => entry.diff !== 0);
}

export function snapshotAt(time: number) {
  const source = ordersAt(time);
  const filtered = source.filter(qualifies);
  const output = filtered.map(project);
  // The seed is initial computation, not a change in this playback timeline.
  const change = changes[time - 1];
  const oldRow = change ? ordersAt(time - 1).find((row) => row.orderId === change.orderId) : undefined;
  const newRow = change ? source.find((row) => row.orderId === change.orderId) : undefined;
  const sourceDiffs: Diff<Order>[] = [
    ...(oldRow ? [{ row: oldRow, diff: -1 }] : []),
    ...(newRow ? [{ row: newRow, diff: 1 }] : []),
  ];
  const filterDiffs = sourceDiffs.filter((entry) => qualifies(entry.row));
  const projectedDiffs = filterDiffs.map((entry) => ({ row: project(entry.row), diff: entry.diff }));
  return { source, filtered, output, sourceDiffs, filterDiffs, projectedDiffs, outputDiffs: consolidate(projectedDiffs) };
}
