import { incidentRules, stageDefinition, type Answers, type StageId } from './scenario';
import { boundedRead, clientAt, clientPreview, correctQuery, correctSource, queryConfiguration, runOrders, stateCost } from './simulation';

export interface RepairGrade { readonly correct: boolean; readonly title: string; readonly explanation: string; readonly errors: Readonly<Record<string, string>> }
export function parseSeconds(value: string): number | null {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value.trim())) return null;
  const milliseconds = Math.round(Number(value) * 1000);
  return Number.isSafeInteger(milliseconds) ? milliseconds : null;
}

const corrections: Readonly<Record<StageId, Readonly<Record<string, string>>>> = {
  feed: {
    envelope: 'This producer sends full replacement values. Append-only keeps old versions; Debezium expects before/after records that are absent here.',
    key: 'Customer IDs and status are shared by different orders. Use the producer’s stable order ID.',
    evidence: 'The two messages share an order key and carry different full values, rather than a new independent event or before/after pair.',
  },
  objects: {
    helper: 'Materializing the helper as well adds four units without satisfying an additional requirement.',
    final: 'The requirement is one durable maintained final result shared across the serving clusters.',
    indexes: 'Indexes are cluster-local. Both operations and support need their own local index on the final result.',
  },
  query: {
    status: 'Cancelled orders must remain in the source but stop contributing to this paid-orders query.',
    lower: 'An expiration bound alone admits future events. Logical time must first reach event_at.',
    upper: 'The window ends exactly at event_at + five minutes. Arrival must not restart that lifetime.',
    diff: 'Replace the entire EU aggregate row: retract (EU, 2, 100), then add (EU, 2, 130). The number of orders stays two.',
    late: '320 + 300 = 620 s. At arrival time 603 s, this order has 17 seconds left.',
    expired: 'Order 105 expired at 590 s, before arrival at 604 s. It is ingested but never qualifies.',
    future: 'Order 106 waits for logical time 620 s; its arrival at 605 s does not satisfy the entry bound.',
    result: 'At 620 s, order 104 expires and order 106 enters. The result is EU: 1 / 70 and US: 1 / 35.',
  },
  progress: {
    dependency: 'Orders progressed to 630.001 s. Customers limits the output to 623.000 s.',
    evidence: 'Quiet rows alone are inconclusive. The stopped frontier together with the paused-connection log identifies this incident.',
    action: 'The limiting customer connection is paused. Browser refreshes, serving capacity, and a wider window do not advance it.',
    catchup: 'Input progress permits the aggregate to advance; computation must still process the changes before its frontier advances.',
  },
  reads: {
    policy: 'The normal contract needs an explicit maximum age. Serializable does not impose it; the fixture’s strict target waits for progress.',
    failure: 'Use an explicit unavailable response or the authorized, labeled ten-second fallback. Do not call older data current.',
    timestamp: 'Complete timestamps are strictly below 623.000 s. The newest millisecond is 622.999 s, aged 7.001 s.',
    external: 'An unsent external change is outside the ingested relation. Transaction consistency does not ingest it.',
  },
  client: {
    snapshot: 'A fresh client needs a baseline. A stream of later changes alone cannot reconstruct the existing result.',
    apply: 'Use signed multiplicities and full-row identity. Ignoring retractions leaves old aggregates; per-record overwrite can expose partial state.',
    publish: 'The timestamp remains open at P(632.000). Even an apparent replacement pair cannot prove completeness. Publish at P(632.001).',
    result: 'After publication, EU is 1 / 90 and US is 1 / 35. The old EU row must be removed.',
  },
};
const successCopy: Readonly<Record<StageId, string>> = {
  feed: 'Replay the retained producer log into a correctly configured source: order 101 has one latest value. The initial totals are EU: 2 / 100 and US: 1 / 25.',
  objects: 'One final materialized view on transform, plus a local index in each serving cluster, uses eight illustrative units. The helper only saves SQL.',
  query: 'The event-time predicate handles cancellations, late and future orders, and clock-only expiration. At 620 s the totals are EU: 1 / 70 and US: 1 / 35.',
  progress: 'Resume the paused customer connection. Its frontier can reach 630.001 s; the aggregate remains at 623.000 s until the explicit catch-up step.',
  reads: 'The three-second request fails during the incident. Your response is honest. Finish catch-up and issue a new normal read at 630.000 s.',
  client: 'The snapshot establishes a baseline. Buffer both full-row changes at 632.000 and publish them together only at P(632.001).',
};

export function gradeRepair(id: StageId, answers: Answers): RepairGrade {
  const definition = stageDefinition(id);
  const errors: Record<string, string> = {};
  for (const field of definition.fields) {
    const value = answers[field.id];
    if (!value) { errors[field.id] = 'Choose an answer before testing this repair.'; continue; }
    if (field.options && !field.options.some(([option]) => option === value)) { errors[field.id] = 'Choose one of the supplied options.'; continue; }
    const valid = id === 'reads' && field.id === 'failure' ? ['unavailable', 'fallback'].includes(value)
      : id === 'reads' && field.id === 'timestamp' ? parseSeconds(value) === 622999
        : value === definition.solution[field.id];
    if (!valid) errors[field.id] = corrections[id][field.id]!;
  }
  if (id === 'objects' && stateCost(answers) > incidentRules.stateBudget) errors.helper = `This design uses ${stateCost(answers)} units; the budget is eight. Keep the SQL-only helper as a regular view.`;
  const correct = Object.keys(errors).length === 0;
  return { correct, title: correct ? 'Repair verified' : 'This repair needs another look', explanation: correct ? successCopy[id] : 'Inspect the consequence preview and the highlighted decisions. Your committed system has not changed.', errors };
}

export interface AcceptanceCheck { readonly id: StageId; readonly label: string; readonly passed: boolean; readonly detail: string }
export function acceptanceChecks(commits: readonly { readonly stage: StageId; readonly answers: Answers }[]): readonly AcceptanceCheck[] {
  const committed = (id: StageId) => commits.find(item => item.stage === id)?.answers;
  const feed = committed('feed');
  const query = committed('query');
  const client = committed('client');
  const trace = runOrders(feed ? { envelope: feed.envelope!, key: feed.key! } : correctSource, query ? queryConfiguration(query) : correctQuery);
  const result = trace[10]!.rows;
  const published = clientAt(8).published;
  const proposedClient = client ? clientPreview(client, 8) : [];
  return (Object.keys(successCopy) as StageId[]).map(id => {
    const commit = commits.find(item => item.stage === id);
    let passed = Boolean(commit && gradeRepair(id, commit.answers).correct);
    if (id === 'feed') passed &&= trace[0]!.orders.length === 3 && trace[0]!.orders.filter(row => row.orderId === 101).length === 1;
    if (id === 'objects') passed &&= Boolean(commit && stateCost(commit.answers) <= incidentRules.stateBudget && commit.answers.final === 'materialized' && commit.answers.indexes === 'both');
    if (id === 'query') passed &&= result.length === 2 && result[0]?.orders === 1 && result[0]?.total === 90 && result[1]?.orders === 1 && result[1]?.total === 35;
    if (id === 'reads') passed &&= boundedRead(incidentRules.normalAgeMs).status === 'stale' && boundedRead(incidentRules.normalAgeMs, true).status === 'available';
    if (id === 'client') passed &&= Boolean(client && published.length === 2 && published[0]?.row.total === 90 && published[1]?.row.total === 35
      && proposedClient.length === result.length && proposedClient.every((row, index) => JSON.stringify(row) === JSON.stringify(result[index]))
      && [5, 6, 7].every(deliveries => clientPreview(client, deliveries).find(row => row.region === 'EU')?.total === 70));
    return { id, label: stageDefinition(id).title, passed, detail: passed ? successCopy[id] : 'Apply a verified repair at this checkpoint before completing the handover.' };
  });
}
