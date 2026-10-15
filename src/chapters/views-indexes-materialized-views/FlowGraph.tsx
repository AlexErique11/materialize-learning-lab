import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowRight, Database, FileCode2, Layers, Search, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { flowEdges, panelDescriptions, panelNames, type FlowEdge, type FlowNodeId } from './flowGraphModel';
import { revenueFor, pathDescriptions, type DiagramPanel, type ObjectSnapshot, type QueryObservation, type RevenueRow, type ServingCluster } from './simulation';

function RevenueTable({ rows, caption }: { rows: readonly RevenueRow[]; caption: string }) {
  return <Table caption={caption}><thead><tr><th scope="col">region</th><th scope="col">revenue</th></tr></thead>
    <tbody>{rows.map(row => <tr key={`${row.region}-${row.revenue}`} className="flow-result-row"><td data-column="region">{row.region}</td><td data-column="amount">${row.revenue}</td></tr>)}</tbody></Table>;
}

function Connectors({ edges, canvasRef }: { edges: readonly FlowEdge[]; canvasRef: RefObject<HTMLDivElement | null> }) {
  const markerId = useId().replace(/:/g, '');
  const [paths, setPaths] = useState<readonly { edge: FlowEdge; d: string }[]>([]);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      const rect = (id: FlowNodeId) => {
        const element = canvas.querySelector<HTMLElement>(`[data-flow-node="${id}"]`);
        if (!element || element.getClientRects().length === 0) return null;
        const box = element.getBoundingClientRect();
        return { left: box.left - bounds.left, right: box.right - bounds.left, top: box.top - bounds.top, bottom: box.bottom - bounds.top, x: box.left + box.width / 2 - bounds.left, y: box.top + box.height / 2 - bounds.top };
      };
      setPaths(edges.flatMap(edge => {
        const from = rect(edge.source), to = rect(edge.target);
        if (!from || !to) return [];
        let d: string;
        if (edge.source === 'definitions') {
          // Route definitions around the serving boundary, never through its cards.
          const gutter = from.left - (edge.target === 'transform' ? 17 : 9);
          d = edge.target === 'transform'
            ? `M ${from.left} ${from.y} H ${gutter} V ${to.top - 10} H ${to.x} V ${to.top - 3}`
            : `M ${from.left} ${from.y} H ${gutter} V ${to.y - 8} H ${to.left - 3}`;
        } else if (edge.route === 'below') {
          const gutter = (from.top + to.bottom) / 2;
          d = edge.kind === 'query'
            ? `M ${from.x + 8} ${from.top} V ${gutter + 4} H ${to.x} V ${to.bottom + 3}`
            : `M ${from.x} ${from.top} V ${gutter} H ${to.right + 18} V ${to.y} H ${to.right + 3}`;
        } else if (edge.route === 'above') {
          const gutter = to.bottom + 9;
          d = `M ${from.right} ${from.y} H ${from.right + 8} V ${gutter} H ${to.x} V ${to.bottom + 3}`;
        } else if (edge.source === 'input' && edge.target === 'b-compute') {
          const cluster = canvas.querySelector<HTMLElement>('[data-panel="b"]')!.getBoundingClientRect();
          const gutter = cluster.top - bounds.top - 14;
          d = `M ${from.x} ${from.top} V ${gutter} H ${to.left - 25} V ${to.y} H ${to.left - 3}`;
        } else {
          const middle = (from.right + to.left) / 2;
          d = `M ${from.right} ${from.y} H ${middle} V ${to.y} H ${to.left - 3}`;
        }
        return [{ edge, d }];
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    canvas.querySelectorAll<HTMLElement>('[data-flow-node]').forEach(node => observer.observe(node));
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [edges, canvasRef]);
  return <svg className="flow-connectors" aria-label="Maintenance, definition and query connections" role="img">
    <defs>{(['maintenance', 'query', 'definition'] as const).map(kind => <marker key={kind} id={`${markerId}-${kind}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto-start-reverse"><path d="M 0 0 L 7 3.5 L 0 7 Z" className={`flow-arrow-${kind}`} /></marker>)}</defs>
    {paths.map(({ edge, d }) => <path key={edge.id} d={d} className={`flow-edge flow-edge-${edge.kind}`} markerEnd={`url(#${markerId}-${edge.kind})`}
      data-source={edge.source} data-target={edge.target} data-kind={edge.kind}><title>{edge.label}</title></path>)}
  </svg>;
}

const overviewPositions: Record<DiagramPanel, [number, number]> = {
  definitions: [49, 13], input: [10, 50], a: [49, 50], b: [88, 50], transform: [36, 88], durable: [73, 88],
};
const nodePanel = (node: FlowNodeId): DiagramPanel => node.startsWith('a-') ? 'a' : node.startsWith('b-') ? 'b' : node as DiagramPanel;

function Overview({ panels, edges, selected, onSelect }: { panels: readonly DiagramPanel[]; edges: readonly FlowEdge[]; selected: DiagramPanel; onSelect: (panel: DiagramPanel) => void }) {
  const seen = new Set<string>();
  const arrowId = useId().replace(/:/g, '');
  return <nav className="flow-overview" aria-label="Flow graph overview">
    <svg viewBox="0 0 100 104" preserveAspectRatio="none" aria-hidden="true"><defs>{(['maintenance', 'query', 'definition'] as const).map(kind => <marker key={kind} id={`${arrowId}-${kind}`} markerWidth="3" markerHeight="3" refX="3" refY="1.5" orient="auto"><path d="M 0 0 L 3 1.5 L 0 3 Z" className={`flow-arrow-${kind}`} /></marker>)}</defs>{edges.map(edge => {
      const source = nodePanel(edge.source), target = nodePanel(edge.target);
      const key = `${edge.kind}-${source}-${target}`;
      if (source === target || seen.has(key)) return null;
      seen.add(key);
      const [x1, y1] = overviewPositions[source], [x2, y2] = overviewPositions[target];
      const endX = x2 - (x2 > x1 ? 9 : -9);
      return <path key={key} d={`M ${x1} ${y1} H ${(x1 + x2) / 2} V ${y2} H ${endX}`} className={`flow-edge flow-edge-${edge.kind}`} vectorEffect="non-scaling-stroke" markerEnd={`url(#${arrowId}-${edge.kind})`} />;
    })}</svg>
    {panels.map(panel => <Button key={panel} aria-pressed={selected === panel} style={{ left: `${overviewPositions[panel][0]}%`, top: `${overviewPositions[panel][1]}%` }} onClick={() => onSelect(panel)}>{panelNames[panel]}</Button>)}
  </nav>;
}

export function FlowGraph({ snapshot, showClusterB, selectedPanel, onSelectPanel, panelRefs, query = snapshot.query, pending = false }: {
  snapshot: ObjectSnapshot; showClusterB: boolean; selectedPanel: DiagramPanel; onSelectPanel: (panel: DiagramPanel) => void;
  panelRefs?: Partial<Record<DiagramPanel, RefObject<HTMLElement | null>>>; query?: QueryObservation | null; pending?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { setup } = snapshot;
  const rows = revenueFor(snapshot.orders, setup.stacked);
  const finalDefinitions = [setup.view ? 'revenue_v' : '', setup.materialized ? 'revenue_mv' : ''].filter(Boolean).join(' · ');
  const definitions = setup.stacked ? `order_base → order_enriched${finalDefinitions ? ` → ${finalDefinitions}` : ''}` : finalDefinitions;
  const panels: DiagramPanel[] = ['definitions', 'input', 'a', 'transform', 'durable', ...(showClusterB ? ['b' as const] : [])];
  const edges = flowEdges(snapshot, query, showClusterB, pending);
  const heading = (panel: DiagramPanel, icon: ReactNode, suffix?: string) => <header className="flow-panel-heading">
    <button type="button" aria-label={`Inspect ${panelNames[panel]}`} aria-pressed={selectedPanel === panel} onClick={() => onSelectPanel(panel)}>{icon}<span>{panelNames[panel]}</span></button>
    {suffix && <span className="flow-location-label">{suffix}</span>}
    <RelationHelp label={`${panelNames[panel]} details`} text={panelDescriptions[panel]} />
  </header>;
  const cluster = (id: ServingCluster) => {
    const viewIndex = setup.viewIndexes.includes(id);
    const mvIndex = setup.materializedIndexes.includes(id);
    const computing = !pending && query?.cluster === id && query.path === 'compute';
    const observing = !pending && query?.cluster === id;
    return <section ref={panelRefs?.[id]} className={`flow-panel flow-cluster flow-cluster-${id}`} data-panel={id} aria-label={panelNames[id]}>
      {heading(id, <Layers size={15} aria-hidden="true" />, 'Local compute & memory')}
      <div className="flow-cluster-body">
        <div className="flow-compute flow-card" data-flow-node={`${id}-compute`} data-present={viewIndex || computing}>
          <Settings2 size={17} aria-hidden="true" /><strong>{viewIndex ? 'Maintain view' : computing ? 'Compute query' : 'Query compute'}</strong>
          <span>{viewIndex ? 'GROUP BY region' : computing ? 'Run saved SQL here' : 'Idle'}</span>
          <small>{viewIndex ? 'On input changes' : computing ? 'For the last query' : 'No view computation'}</small>
        </div>
        <div className="flow-indexes">
          {viewIndex && <div className="flow-card flow-index" data-flow-node={`${id}-view-index`}><strong><Layers size={13} aria-hidden="true" />revenue_v_{id}</strong><span>Full result · memory</span><RevenueTable rows={rows} caption={`${panelNames[id]} view index result`} /></div>}
          {mvIndex && <div className="flow-card flow-index" data-flow-node={`${id}-mv-index`}><strong><Layers size={13} aria-hidden="true" />revenue_mv_{id}</strong><span>Durable output · local copy</span><RevenueTable rows={rows} caption={`${panelNames[id]} materialized view index result`} /></div>}
          {!viewIndex && !mvIndex && <div className="flow-card flow-empty"><Layers size={18} aria-hidden="true" /><strong>No local index</strong><span>Other clusters’ indexes<br />are unavailable here</span></div>}
        </div>
      </div>
      <div className="flow-query-endpoint" data-flow-node={`${id}-query`} data-active={observing}>
        <Search size={12} aria-hidden="true" />{observing ? `SELECT ${query.object}` : `Queries in ${id.toUpperCase()}`}<span>{observing ? query.path === 'memory' ? 'Local memory' : query.path === 'storage' ? 'Durable storage' : query.path === 'compute' ? 'Compute query' : 'Unavailable' : 'Ready'}</span>
      </div>
    </section>;
  };
  return <div className="object-diagram flow-graph" data-testid="object-diagram" data-selected-panel={selectedPanel} data-cross-cluster={showClusterB} data-pending={pending}>
    <div className="flow-legend" aria-label="Connection legend"><span><i className="flow-key-maintenance" />Maintenance</span><span><i className="flow-key-query" />Last query read</span><span><i className="flow-key-definition" />SQL definition</span><small>Completed steps · lag and hydration omitted</small></div>
    <Overview panels={panels} edges={edges} selected={selectedPanel} onSelect={onSelectPanel} />
    <div className="flow-canvas" ref={canvasRef}>
      <Connectors edges={edges} canvasRef={canvasRef} />
      <section ref={panelRefs?.definitions} className="flow-panel flow-definitions" data-panel="definitions" data-flow-node="definitions" aria-label="Saved definitions">
        {heading('definitions', <FileCode2 size={15} aria-hidden="true" />, 'SQL definitions, not result rows')}
        <code>{definitions || 'No objects created · start with a SQL definition'}</code>
      </section>
      <section ref={panelRefs?.input} className="flow-panel flow-input" data-panel="input" data-flow-node="input" aria-label="Input">
        {heading('input', <Database size={15} aria-hidden="true" />)}<strong className="flow-object-name">orders</strong>
        <Table caption="Input orders"><thead><tr><th scope="col">id</th><th scope="col">region</th><th scope="col">amount</th></tr></thead><tbody>{snapshot.orders.map(row => <tr key={`${row.orderId}-${row.amount}`} className="flow-result-row"><td data-column="orderId">{row.orderId}</td><td data-column="region">{row.region}</td><td data-column="amount">${row.amount}</td></tr>)}</tbody></Table>
        <span className="flow-input-note">Source rows</span>
      </section>
      {cluster('a')}{showClusterB && cluster('b')}
      <section ref={panelRefs?.transform} className="flow-panel flow-transform" data-panel="transform" data-flow-node="transform" data-present={setup.materialized} aria-label="Transform">
        {heading('transform', <Settings2 size={15} aria-hidden="true" />, 'Compute cluster')}
        <strong>{setup.materialized ? 'Maintain revenue_mv' : 'No materialized view'}</strong>
        <code>{setup.materialized ? 'GROUP BY region · SUM(amount)' : 'No durable-output computation'}</code>
      </section>
      <section ref={panelRefs?.durable} className="flow-panel flow-durable" data-panel="durable" data-flow-node="durable" data-present={setup.materialized} aria-label="Durable output">
        {heading('durable', <Database size={15} aria-hidden="true" />, 'Outside serving memory')}
        {setup.materialized ? <><strong className="flow-object-name">revenue_mv</strong><RevenueTable rows={rows} caption="Durable materialized output" /></> : <div className="flow-empty"><strong>Not created</strong><span>No persisted query output</span></div>}
      </section>
    </div>
    <div className="flow-inspector"><strong>{panelNames[selectedPanel]}</strong><span>{panelDescriptions[selectedPanel]}</span></div>
    <div className="object-query-result" aria-live="polite" data-testid="object-query-result">
      <strong><Search size={14} aria-hidden="true" />{query ? `Last query · Cluster ${query.cluster.toUpperCase()}` : 'No query run yet'}</strong>
      {query ? <><span className="object-query-route"><code>{query.object}</code><ArrowRight size={14} aria-hidden="true" />{query.path === 'memory' ? 'Local memory' : query.path === 'compute' ? 'Compute query' : query.path === 'storage' ? 'Durable storage' : 'Unavailable'}</span>
        <span>{query.path === 'unavailable' ? 'Object not created · query cannot run' : query.rows.map(row => `${row.region} $${row.revenue}`).join(' · ') || 'Empty result'}</span><small>Snapshot · updates only when queried</small>
        <RelationHelp label="Last query observation" text={`${pathDescriptions[query.path]} This is the last query’s answer, not a live result. Completed steps omit ingestion lag and hydration. Connectors illustrate access paths, not physical execution plans or timing.`} /></> : <span>Run a query to trace its route and capture an answer.</span>}
    </div>
  </div>;
}
