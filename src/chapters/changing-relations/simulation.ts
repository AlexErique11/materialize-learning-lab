export interface ProductRow {
  readonly product: string;
  readonly price: number;
}

export interface RelationUpdate {
  readonly row: ProductRow;
  readonly time: number;
  readonly diff: number;
}

export interface RowMultiplicity {
  readonly row: ProductRow;
  readonly copies: number;
}

export function rowKey(row: ProductRow) {
  return JSON.stringify([row.product, row.price]);
}

function compareRows(a: { row: ProductRow }, b: { row: ProductRow }) {
  return a.row.product.localeCompare(b.row.product) || a.row.price - b.row.price;
}

export function consolidateTimestamp(updates: readonly RelationUpdate[]): readonly RelationUpdate[] {
  const combined = new Map<string, RelationUpdate>();
  const time = updates[0]?.time;
  for (const update of updates) {
    if (!Number.isSafeInteger(update.diff) || !Number.isSafeInteger(update.time) || update.time !== time)
      throw new Error('A timestamp group must contain integer diffs at one logical time.');
    const key = rowKey(update.row);
    combined.set(key, { ...update, diff: (combined.get(key)?.diff ?? 0) + update.diff });
  }
  return [...combined.values()].sort(compareRows);
}

// Consolidate a complete timestamp before checking the resulting relation.
// Delivery order within it must not create artificial, readable intermediate states.
export function applyTimestamp(
  relation: readonly RowMultiplicity[],
  updates: readonly RelationUpdate[],
): readonly RowMultiplicity[] {
  const next = new Map(relation.map((entry) => [rowKey(entry.row), { ...entry }]));
  for (const update of consolidateTimestamp(updates)) {
    const key = rowKey(update.row);
    const copies = (next.get(key)?.copies ?? 0) + update.diff;
    next.set(key, { row: update.row, copies });
  }
  for (const entry of next.values()) {
    if (entry.copies < 0) throw new Error('This example retracts more copies than exist.');
  }
  return [...next.values()]
    .filter((entry) => entry.copies > 0)
    .sort(compareRows);
}

export function relationAt(updates: readonly RelationUpdate[], time: number, initialRelation: readonly RowMultiplicity[] = []) {
  const groups = new Map<number, RelationUpdate[]>();
  for (const update of updates) {
    if (update.time > time) continue;
    const group = groups.get(update.time) ?? [];
    group.push(update);
    groups.set(update.time, group);
  }
  let relation: readonly RowMultiplicity[] = initialRelation;
  for (const [, group] of [...groups].sort(([a], [b]) => a - b)) {
    relation = applyTimestamp(relation, group);
  }
  return relation;
}

export function getRelationMetrics(relation: readonly RowMultiplicity[]) {
  return {
    totalCopies: relation.reduce((total, entry) => total + entry.copies, 0),
    distinctRows: relation.length,
  };
}

export function copiesOf(relation: readonly RowMultiplicity[], row: ProductRow) {
  return relation.find((entry) => rowKey(entry.row) === rowKey(row))?.copies ?? 0;
}
