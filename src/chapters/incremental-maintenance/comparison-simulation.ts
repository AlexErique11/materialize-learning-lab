import type { AggregateRow } from './aggregate-scenario';
import { contributeToGroup } from './aggregate-simulation';
import { comparisonChanges, comparisonOrders } from './comparison-scenario';
import type { Diff, Order } from './scenario';
import { consolidate } from './simulation';

type Contribution = Pick<Order, 'productId' | 'amount'>;
const project = ({ productId, amount }: Order): Contribution => ({ productId, amount });
const sorted = (groups: Map<number, AggregateRow>) => [...groups.values()].sort((a, b) => a.productId - b.productId);

export function comparisonSnapshotAt(time: number) {
  let orders = [...comparisonOrders];
  const groups = new Map<number, AggregateRow>();
  let contributions: Diff<Contribution>[] = orders.map((row) => ({ row: project(row), diff: 1 }));
  for (const { row, diff } of contributions) contributeToGroup(groups, row, diff);
  let previous: AggregateRow[] = [];
  let changedOrders: number[] = [];
  for (const change of comparisonChanges.slice(0, time)) {
    previous = sorted(groups);
    changedOrders = change.patches.map(({ orderId }) => orderId);
    const diffs: Diff<Contribution>[] = [];
    orders = orders.map((oldRow) => {
      const edit = change.patches.find(({ orderId }) => orderId === oldRow.orderId);
      if (!edit) return oldRow;
      const { amountDelta, ...patch } = edit.patch;
      const newRow = { ...oldRow, ...patch, ...(amountDelta === undefined ? {} : { amount: oldRow.amount + amountDelta }) };
      diffs.push({ row: project(oldRow), diff: -1 }, { row: project(newRow), diff: 1 });
      return newRow;
    });
    contributions = consolidate(diffs);
    for (const { row, diff } of contributions) contributeToGroup(groups, row, diff);
  }
  // An independent rebuild makes the two paths comparable at every snapshot.
  const recomputed = [...new Set(orders.map((row) => row.productId))].sort((a, b) => a - b).map((productId) => {
    const members = orders.filter((row) => row.productId === productId);
    return { productId, count: members.length, total: members.reduce((sum, row) => sum + row.amount, 0) };
  });
  const affectedKeys = [...new Set(contributions.map(({ row }) => row.productId))];
  const output = sorted(groups);
  const outputChanged = time > 0 && (output.length !== previous.length || output.some((row) => !previous.some((before) => before.productId === row.productId && before.count === row.count && before.total === row.total)));
  return { orders, inputCount: orders.length, output, outputChanged, recomputed, previous, contributions, affectedKeys, changedOrders,
    contributionCount: contributions.reduce((sum, { diff }) => sum + Math.abs(diff), 0),
    changeTitle: time === 0 ? 'Initial computation: six existing orders' : comparisonChanges[time - 1]!.title };
}
