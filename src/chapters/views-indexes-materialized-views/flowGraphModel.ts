import type { DiagramPanel, ObjectSnapshot, QueryObservation, ServingCluster } from './simulation';

export const panelNames: Record<DiagramPanel, string> = {
  definitions: 'Saved SQL', input: 'Input', a: 'Cluster A', transform: 'Transform', durable: 'Durable output', b: 'Cluster B',
};

export const panelDescriptions: Record<DiagramPanel, string> = {
  definitions: 'Regular views save SQL definitions, not result rows. In the stacked design, order_base selects columns, order_enriched filters amount >= 0, and only the final query groups by region and sums amount. A materialized view also has a saved definition.',
  input: 'Orders are the source rows. Correcting order 1 from $100 to $120 changes North’s total from $150 to $170 after simulated maintenance completes.',
  a: 'Cluster A (serving_a in SQL) owns its compute and index memory. A view index maintains the full query result here. An index on a materialized view instead makes its durable output local.',
  transform: 'Transform (transform in SQL) maintains the materialized view, including intermediate state in memory. It writes durable output. On creation or restart, rebuilding this memory state is called hydration.',
  durable: 'A materialized view persists maintained result rows. Different clusters can read this output, or index it in their own memory. Removing a serving index leaves the durable output available.',
  b: 'Cluster B (serving_b in SQL) has its own compute and memory. It cannot borrow A’s index. It can compute a regular view, read materialized output from storage, or use its own local index. Each local index also needs memory and maintenance.',
};

export type FlowNodeId = 'input' | 'definitions' | 'transform' | 'durable'
  | `${ServingCluster}-compute` | `${ServingCluster}-view-index` | `${ServingCluster}-mv-index` | `${ServingCluster}-query`;
export interface FlowEdge {
  readonly id: string;
  readonly source: FlowNodeId;
  readonly target: FlowNodeId;
  readonly kind: 'maintenance' | 'query' | 'definition';
  readonly label: string;
  readonly route: 'across' | 'below' | 'above';
}

// The graph describes the supplied snapshot; it never advances or grades a scenario.
export function flowEdges(snapshot: ObjectSnapshot, query: QueryObservation | null, showClusterB: boolean, pending: boolean): FlowEdge[] {
  const edges: FlowEdge[] = [];
  const { setup } = snapshot;
  const add = (source: FlowNodeId, target: FlowNodeId, kind: FlowEdge['kind'], label: string, route: FlowEdge['route'] = 'across') => {
    edges.push({ id: `${kind}-${source}-${target}`, source, target, kind, label, route });
  };
  for (const cluster of (showClusterB ? ['a', 'b'] : ['a']) as readonly ServingCluster[]) {
    const indexedView = setup.viewIndexes.includes(cluster);
    const computingQuery = !pending && query?.cluster === cluster && query.path === 'compute';
    if (indexedView || computingQuery) {
      add('definitions', `${cluster}-compute`, 'definition', `Saved SQL defines the computation in ${cluster.toUpperCase()}`, 'above');
      add('input', `${cluster}-compute`, indexedView ? 'maintenance' : 'query', indexedView ? `Input changes maintain the view in ${cluster.toUpperCase()}` : `Read input to compute the view in ${cluster.toUpperCase()}`);
    }
    if (indexedView) add(`${cluster}-compute`, `${cluster}-view-index`, 'maintenance', 'Maintain full result in local memory');
    if (setup.materializedIndexes.includes(cluster)) add('durable', `${cluster}-mv-index`, 'maintenance', `Maintain a local copy of durable output in ${cluster.toUpperCase()}`, 'below');
  }
  if (setup.materialized) {
    add('definitions', 'transform', 'definition', 'Saved SQL defines the maintained transformation', 'above');
    add('input', 'transform', 'maintenance', 'Input changes feed Transform');
    add('transform', 'durable', 'maintenance', 'Persist maintained output');
  }
  if (!pending && query && query.path !== 'unavailable') {
    const source: FlowNodeId = query.path === 'storage' ? 'durable' : query.path === 'compute' ? `${query.cluster}-compute`
      : `${query.cluster}-${query.object === 'revenue_mv' ? 'mv' : 'view'}-index`;
    add(source, `${query.cluster}-query`, 'query', query.path === 'storage' ? 'Read durable output → return query snapshot'
      : query.path === 'memory' ? 'Read local memory → return query snapshot' : 'Compute view → return query snapshot', source === 'durable' ? 'below' : 'above');
  }
  return edges;
}
