import { Button } from '../../components/ui/Button';
import type { RevenueObject, ServingCluster } from './simulation';

interface QueryControls {
  readonly object: RevenueObject;
  readonly cluster: ServingCluster;
  readonly disabled: boolean;
  readonly onObjectChange: (object: RevenueObject) => void;
  readonly onClusterChange: (cluster: ServingCluster) => void;
  readonly onRun: () => void;
}

// An inactive row keeps the same responsive footprint without exposing controls.
export function ObjectQueryControls({ controls }: { controls?: QueryControls }) {
  const reserved = !controls;
  return <div className="object-query-controls" aria-label={reserved ? undefined : 'Explore query access'} aria-hidden={reserved || undefined} inert={reserved || undefined}>
    <label><span className="object-query-label">Object</span><select aria-label="Query object" value={controls?.object ?? 'revenue_v'} disabled={reserved || controls.disabled} onChange={event => controls?.onObjectChange(event.target.value as RevenueObject)}><option value="revenue_v">revenue_v</option><option value="revenue_mv">revenue_mv</option></select></label>
    <label><span className="object-query-label">Query from</span><select aria-label="Query cluster" value={controls?.cluster ?? 'a'} disabled={reserved || controls.disabled} onChange={event => controls?.onClusterChange(event.target.value as ServingCluster)}><option value="a">Cluster A</option><option value="b">Cluster B</option></select></label>
    <Button disabled={reserved || controls.disabled} onClick={controls?.onRun}>Run query</Button>
  </div>;
}
