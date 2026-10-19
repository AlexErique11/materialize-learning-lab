export type RevenueObject = 'revenue_v' | 'revenue_mv';
export type ServingCluster = 'a' | 'b';
export type DiagramPanel = 'definitions' | 'input' | 'a' | 'transform' | 'durable' | 'b';
export interface Order { readonly orderId: number; readonly region: string; readonly amount: number }
export interface RevenueRow { readonly region: string; readonly revenue: number }
export interface ObjectSetup {
  readonly view: boolean;
  readonly materialized: boolean;
  readonly viewIndexes: readonly ServingCluster[];
  readonly materializedIndexes: readonly ServingCluster[];
  readonly stacked: boolean;
}
export type QueryPath = 'memory' | 'compute' | 'storage' | 'unavailable';
export interface QueryObservation {
  readonly object: RevenueObject;
  readonly cluster: ServingCluster;
  readonly path: QueryPath;
  readonly rows: readonly RevenueRow[];
}
export interface ObjectSnapshot {
  readonly orders: readonly Order[];
  readonly setup: ObjectSetup;
  readonly query: QueryObservation | null;
}
export const initialOrders: readonly Order[] = [
  { orderId: 1, region: 'North', amount: 100 },
  { orderId: 2, region: 'North', amount: 50 },
  { orderId: 3, region: 'South', amount: 80 },
];
export const updatedOrders = initialOrders.map(row => row.orderId === 1 ? { ...row, amount: 120 } : row);
export const emptySetup: ObjectSetup = { view: false, materialized: false, viewIndexes: [], materializedIndexes: [], stacked: false };

export function revenueFor(orders: readonly Order[], stacked = false): RevenueRow[] {
  const totals = new Map<string, number>();
  for (const row of orders) {
    if (stacked && row.amount < 0) continue; // order_enriched's WHERE amount >= 0
    totals.set(row.region, (totals.get(row.region) ?? 0) + row.amount);
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([region, revenue]) => ({ region, revenue }));
}

export function querySnapshot(snapshot: Pick<ObjectSnapshot, 'orders' | 'setup'>, object: RevenueObject, cluster: ServingCluster): QueryObservation {
  const materialized = object === 'revenue_mv';
  const exists = materialized ? snapshot.setup.materialized : snapshot.setup.view;
  const indexes = materialized ? snapshot.setup.materializedIndexes : snapshot.setup.viewIndexes;
  const path: QueryPath = !exists ? 'unavailable' : indexes.includes(cluster) ? 'memory' : materialized ? 'storage' : 'compute';
  return { object, cluster, path, rows: exists ? revenueFor(snapshot.orders, snapshot.setup.stacked) : [] };
}

export function makeSnapshot(setup: Partial<ObjectSetup> = {}, orders = initialOrders, query?: { object: RevenueObject; cluster: ServingCluster }): ObjectSnapshot {
  const snapshot = { orders, setup: { ...emptySetup, ...setup }, query: null };
  return { ...snapshot, query: query ? querySnapshot(snapshot, query.object, query.cluster) : null };
}

export const pathDescriptions: Record<QueryPath, string> = {
  memory: 'Read the full result from this cluster’s local index.',
  compute: 'Compute the view query here; another cluster’s index is unavailable here.',
  storage: 'Read the already-maintained result from durable storage.',
  unavailable: 'This object has not been created in the current setup.',
};
