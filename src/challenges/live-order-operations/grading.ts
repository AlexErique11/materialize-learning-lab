import { clientState, expectedAt, frontiers, objectCost, ordersAt, requestRead, rowsAt, streamFor, type TraceFrame } from './incident';
import type { ChallengeRun, Check } from './run';
import type { SqlClient } from './sqlClient';
import type { ResultRow } from '../../chapters/live-applications-subscribe/simulation';
const normalized = (rows: readonly ResultRow[]) => JSON.stringify([...rows].sort((a, b) => a.region.localeCompare(b.region)).map(row => [row.region, Number(row.orders), Number(row.total)]));
export function queryCheck(trace: readonly TraceFrame[], variant = 0): Check {
  const failed = trace.find(frame => normalized(frame.rows) !== normalized(expectedAt(frame.time, variant)));
  return { id: 'query', label: 'Recent paid-order contract', passed: !failed, detail: failed ? `At ${(failed.time / 1000).toFixed(3)} s${variant ? ' in an additional order fixture' : ''}, observed ${normalized(failed.rows)}; the business contract gives ${normalized(expectedAt(failed.time, variant))}. Inspect eligible orders at that time.` : 'Replacements, cancellations, late and future arrivals, exact boundaries, and clock-only expiration agree with the contract.' };
}
export function systemChecks(run: ChallengeRun, trace: readonly TraceFrame[]): Check[] {
  const expectedSource = ordersAt(run.time, { envelope: 'UPSERT', key: 'order_id' });
  const actualSource = ordersAt(run.time, run.config.source);
  const sourceOK = JSON.stringify(actualSource) === JSON.stringify(expectedSource);
  const read = requestRead(run.config, run.time, run.processed ? run.time : run.processedTime);
  const serviceOK = run.config.connected && run.processed && read.status === 'available' && run.read?.status === 'available' && run.read.bound === 3000 && run.time - run.read.timestamp <= 3000 && run.read.timestamp >= 630000 && run.read.timestamp <= read.timestamp;
  const reference = { ...run.config, publication: 'complete' as const, snapshot: true };
  const length = streamFor(trace, true).length;
  let publicationOK = true;
  for (let delivery = 0; delivery <= length; delivery++) {
    const actual = clientState(trace, run.config, delivery);
    const expected = clientState(trace, reference, delivery);
    if (JSON.stringify(actual.published) !== JSON.stringify(expected.published) || actual.ready !== expected.ready) publicationOK = false;
  }
  const f = frontiers(run.config, run.time, run.processed ? run.time : run.processedTime);
  return [
    { id: 'source', label: 'Order identity', passed: sourceOK, detail: sourceOK ? 'The retained producer log yields one latest value for each stable order ID.' : 'The source relation differs from the latest full keyed values. Inspect producer messages and source identity.' },
    { id: 'service', label: 'Normal service restored', passed: Boolean(serviceOK), detail: serviceOK ? `Recorded normal read: ${(run.read!.timestamp / 1000).toFixed(3)} s; current replay can serve ${(read.timestamp / 1000).toFixed(3)} s. Output frontier: ${(f.output / 1000).toFixed(3)} s.` : `Output is complete below ${(f.output / 1000).toFixed(3)} s. Restore processing and demonstrate a new successful three-second normal read; an incident fallback alone does not restore normal service.` },
    { id: 'client', label: 'Complete application publication', passed: publicationOK, detail: publicationOK ? `The supplied client preserves the last complete result through all ${length} split deliveries and publishes the next complete result.` : 'The application differs from the complete database result during the delivery replay. Inspect the baseline, signed changes, and publication boundary.' },
    { id: 'objects', label: 'Shared serving and state budget', passed: run.config.final === 'materialized' && run.config.indexes === 'both' && objectCost(run.config) <= 8, detail: `Current design uses ${objectCost(run.config)} / 8 illustrative units. Operations and support require local indexes on one durable final result.` },
  ];
}
export async function validateIncident(run: ChallengeRun, client: SqlClient): Promise<Check[]> {
  const base = await client.request({ kind: 'trace', predicate: run.config.predicate, source: run.config.source });
  const additional = await client.request({ kind: 'trace', predicate: run.config.predicate, source: run.config.source, variant: 1 });
  const query = queryCheck(base.trace!);
  const extra = queryCheck(additional.trace!, 1);
  return [query.passed ? extra : query, ...systemChecks(run, base.trace!)];
}
export const displayedRows = (trace: readonly TraceFrame[], time: number, processed: boolean | number, connected: boolean) => rowsAt(trace, typeof processed === 'number' ? processed : processed && connected ? time : 622999);
