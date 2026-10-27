export const CHALLENGE_SLUG = 'live-order-operations';
export const SCENARIO_VERSION = 1;
export const incidentRules = { stateBudget: 8, windowMs: 300000, normalAgeMs: 3000, fallbackAgeMs: 10000, wallClock: 630000, stalledFrontier: 623000, caughtUpFrontier: 630001 } as const;
export const STAGE_IDS = ['feed', 'objects', 'query', 'progress', 'reads', 'client'] as const;
export type StageId = typeof STAGE_IDS[number];
export type Answers = Readonly<Record<string, string>>;
export interface DecisionField {
  readonly id: string;
  readonly label: string;
  readonly options?: readonly (readonly [string, string])[];
  readonly kind?: 'select' | 'number';
}
export interface StageDefinition {
  readonly id: StageId;
  readonly label: string;
  readonly title: string;
  readonly ticket: string;
  readonly goal: string;
  readonly minutes: number;
  readonly fields: readonly DecisionField[];
  readonly hints: readonly [string, string];
  readonly lesson: string;
  readonly lessonPath: string;
  readonly solution: Answers;
}

export const stages: readonly StageDefinition[] = [
  {
    id: 'feed', label: 'Feed', title: 'Repair the feed', minutes: 2,
    ticket: 'Operations: “A correction seems to create another order. Our EU count should be two.”',
    goal: 'Keep one latest value per order, while preserving separate orders from the same customer.',
    fields: [
      { id: 'envelope', label: 'Interpret incoming messages', options: [['NONE', 'Append only — independent events'], ['UPSERT', 'UPSERT — latest value for a key'], ['DEBEZIUM', 'Debezium — before/after changes']] },
      { id: 'key', label: 'Replacement identity', kind: 'select', options: [['order_id', 'Order ID'], ['customer_id', 'Customer ID'], ['status', 'Order status']] },
      { id: 'evidence', label: 'What supports your choice?', kind: 'select', options: [['replacement', 'The same order key carries a replacement value'], ['event', 'Every message represents a new order'], ['before-after', 'Messages contain before and after rows']] },
    ],
    hints: ['Inspect the two messages with key 101. Did the producer create a second order?', 'The contract sends the latest full value under a stable order-ID key. Choose the envelope that replaces that key.'],
    lesson: 'Chapter 4 · Events and current values', lessonPath: '/labs/getting-data-in/tutorial/lecture-2',
    solution: { envelope: 'UPSERT', key: 'order_id', evidence: 'replacement' },
  },
  {
    id: 'objects', label: 'Objects', title: 'Place maintained state', minutes: 2,
    ticket: 'Support: “We need our own serving cluster, using the same durable totals as operations.”',
    goal: 'Maintain the final transformation once, provide a local index in both serving clusters, and use at most eight illustrative state units.',
    fields: [
      { id: 'helper', label: 'Recent-orders helper', kind: 'select', options: [['view', 'Regular view · 0 units'], ['materialized', 'Materialized view · 4 units']] },
      { id: 'final', label: 'Regional totals on transform', kind: 'select', options: [['view', 'Regular view · 0 units'], ['materialized', 'Materialized view · 4 units']] },
      { id: 'indexes', label: 'Local serving indexes', options: [['both', 'Operations and support · 4 units'], ['operations', 'Operations only · 2 units'], ['transform', 'Transform only · 2 units'], ['none', 'No indexes · 0 units']] },
    ],
    hints: ['Separate durable shared results from cluster-local memory. The helper only organizes SQL.', 'Use a regular helper view, one final materialized view, and an index on that final result in each serving cluster.'],
    lesson: 'Chapter 3 · Choose what to maintain', lessonPath: '/labs/views-indexes-materialized-views/tutorial/lecture-3',
    solution: { helper: 'view', final: 'materialized', indexes: 'both' },
  },
  {
    id: 'query', label: 'Query', title: 'Make the result correct', minutes: 3,
    ticket: 'Operations: “Show paid orders from the last five event-time minutes. Cancellations and future orders must not count.”',
    goal: 'Complete the predicate, trace a signed update, and predict the result after the event batch.',
    fields: [
      { id: 'status', label: 'Status filter', kind: 'select', options: [['paid', "status = 'paid'"], ['all', 'All statuses']] },
      { id: 'lower', label: 'Entry bound', kind: 'select', options: [['event', 'mz_now() >= event_at'], ['none', 'No entry bound']] },
      { id: 'upper', label: 'Expiration bound', kind: 'select', options: [['exclusive', "mz_now() < event_at + INTERVAL '5 minutes'"], ['inclusive', "mz_now() <= event_at + INTERVAL '5 minutes'"], ['arrival', 'Five minutes after arrival']] },
      { id: 'diff', label: 'At 601 s, amount 40 becomes 70. Which EU change?', kind: 'select', options: [['replace', '−(EU, 2, 100), +(EU, 2, 130)'], ['insert', '+(EU, 2, 130) only'], ['count', '−(EU, 2, 100), +(EU, 3, 130)']] },
      { id: 'late', label: 'Order 104 arrives at 603 s, event time 320 s. Its remaining lifetime?', kind: 'select', options: [['17', '17 seconds'], ['300', '300 seconds'], ['0', 'Already expired']] },
      { id: 'expired', label: 'Order 105 arrives at 604 s, event time 290 s', kind: 'select', options: [['absent', 'Ingested, but never enters this result'], ['present', 'Appears for a fresh five minutes']] },
      { id: 'future', label: 'Order 106 arrives at 605 s, event time 620 s', kind: 'select', options: [['wait', 'Waits until 620 s to enter'], ['now', 'Enters immediately']] },
      { id: 'result', label: 'At 620 s, after all changes at that time', options: [['correct', 'EU: 1 / 70 · US: 1 / 35'], ['old', 'EU: 2 / 90 · US: 1 / 25'], ['zero', 'EU: 1 / 70 · US: 0 / 0']] },
    ],
    hints: ['The lifetime is [event time, event time + 300 s). The source keeps expired rows; the result does not.', 'At 620 s, order 104 expires and order 106 enters. Cancelled 102, expired 103/105, and the old amount of 101 do not contribute.'],
    lesson: 'Chapter 5 · Recent-event behavior', lessonPath: '/labs/time-in-materialize/tutorial/lecture-3',
    solution: { status: 'paid', lower: 'event', upper: 'exclusive', diff: 'replace', late: '17', expired: 'absent', future: 'wait', result: 'correct' },
  },
  {
    id: 'progress', label: 'Progress', title: 'Find the delay', minutes: 2,
    ticket: 'Support: “The page responds in 40 ms, but the data is seven seconds behind. Where should we intervene?”',
    goal: 'Find the limiting input using progress and connection evidence, then distinguish permitted progress from completed computation.',
    fields: [
      { id: 'dependency', label: 'Limiting dependency', options: [['orders', 'Orders input'], ['customers', 'Customers input'], ['serving', 'Serving query']] },
      { id: 'evidence', label: 'Evidence', kind: 'select', options: [['stalled', 'Customer progress stopped and its connection is paused'], ['quiet', 'There are no new customer rows'], ['latency', 'The page responded in 40 ms']] },
      { id: 'action', label: 'Intervention', kind: 'select', options: [['resume', 'Resume customer connection'], ['scale', 'Increase serving capacity'], ['refresh', 'Refresh browser'], ['window', 'Widen the time window']] },
      { id: 'catchup', label: 'After input progress advances, is the output immediately caught up?', options: [['no', 'Not necessarily — computation still has to process'], ['yes', 'Yes — input progress completes the output']] },
    ],
    hints: ['Compare the frontiers, then inspect the connection log. A quiet business table can still make progress.', 'Customers limits the output at 623 s. Resuming its connection permits further progress; output processing is a separate step.'],
    lesson: 'Chapter 6 · Limiting inputs', lessonPath: '/labs/progress-and-freshness/tutorial/lecture-2',
    solution: { dependency: 'customers', evidence: 'stalled', action: 'resume', catchup: 'no' },
  },
  {
    id: 'reads', label: 'Reads', title: 'Serve an honest snapshot', minutes: 2,
    ticket: 'Operations: “Normally allow at most three seconds of snapshot age. During catch-up we allow a labeled ten-second fallback, or an unavailable response.”',
    goal: 'Test the normal policy, handle its failure honestly, then finish catch-up and issue a new read.',
    fields: [
      { id: 'policy', label: 'Normal policy', options: [['bounded', 'Bounded staleness · 3 seconds'], ['serializable', 'Serializable · no age bound'], ['strict', 'Strict serializable · target 630.000 s']] },
      { id: 'failure', label: 'During the incident', options: [['unavailable', 'Show unavailable until the normal bound can be met'], ['fallback', 'Show a labeled ten-second fallback'], ['silent', 'Show older data as current']] },
      { id: 'timestamp', label: 'Newest complete fallback timestamp (seconds)', kind: 'number' },
      { id: 'external', label: 'Can a consistent read guarantee a cancellation not yet sent by the producer?', options: [['no', 'No — it must be ingested first'], ['yes', 'Yes — transaction consistency includes unsent changes']] },
    ],
    hints: ['Intersect the retained/complete windows. Equality with the write frontier is still open.', 'The newest complete millisecond is 622.999 s: 7.001 seconds old. Three seconds fails; ten seconds can succeed.'],
    lesson: 'Chapter 7 · Freshness policies', lessonPath: '/labs/consistent-reads/tutorial/lecture-3',
    solution: { policy: 'bounded', failure: 'fallback', timestamp: '622.999', external: 'no' },
  },
  {
    id: 'client', label: 'Client', title: 'Repair the live client', minutes: 3,
    ticket: 'Operations: “EU briefly vanishes during an amount correction. Keep the last complete result visible until the replacement is ready.”',
    goal: 'Build a complete baseline, consolidate signed full rows, and publish only complete timestamps.',
    fields: [
      { id: 'snapshot', label: 'New subscription baseline', options: [['on', 'Initial snapshot enabled'], ['off', 'Changes only · no coordinated baseline']] },
      { id: 'apply', label: 'Interpret changes', kind: 'select', options: [['signed', 'Signed changes to the full result row'], ['positive', 'Ignore negative changes'], ['region', 'Overwrite by region for every record']] },
      { id: 'publish', label: 'When is the 632.000 s replacement safe to publish?', options: [['later', 'P(632.001) — progress strictly beyond the timestamp'], ['equal', 'P(632.000) — progress at the same timestamp'], ['pair', 'As soon as the apparent pair arrives'], ['each', 'After every received row']] },
      { id: 'result', label: 'Final published application', kind: 'select', options: [['correct', 'EU: 1 / 90 · US: 1 / 35'], ['old', 'EU: 1 / 70 · US: 1 / 35'], ['missing', 'US: 1 / 35 · EU missing']] },
    ],
    hints: ['Use Next delivery to inspect the trays. A fetch batch or apparent pair cannot prove timestamp completeness.', 'Start with a snapshot; buffer the old-row retraction and new-row addition at 632.000 until P(632.001).'],
    lesson: 'Chapter 8 · Publish complete timestamps', lessonPath: '/labs/live-applications-subscribe/tutorial/lecture-3',
    solution: { snapshot: 'on', apply: 'signed', publish: 'later', result: 'correct' },
  },
];

export function stageDefinition(id: StageId) { return stages.find(stage => stage.id === id)!; }
export const requirements = [
  'Keep one latest value per stable order ID.',
  'Count paid orders only: event time ≤ logical time < event time + five minutes.',
  'Join customers and group order count and total by region.',
  'Share one durable final result with local indexes in operations and support.',
  'Use no more than eight illustrative state units.',
  'Enforce a three-second snapshot-age limit; label any authorized incident fallback.',
  'Initialize the live client and publish complete timestamps only.',
] as const;

export const referenceSql = `-- Browser simulation: this SQL is not executed.
-- orders and customers are already connected source-backed tables.
CREATE VIEW recent_paid_orders AS
SELECT o.order_id, o.amount, c.region
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.customer_id
WHERE o.status = 'paid'
  AND mz_now() >= o.event_at
  AND mz_now() < o.event_at + INTERVAL '5 minutes';

CREATE MATERIALIZED VIEW regional_order_totals IN CLUSTER transform AS
SELECT region, COUNT(*) AS orders, SUM(amount) AS total
FROM recent_paid_orders GROUP BY region;

CREATE INDEX regional_totals_ops IN CLUSTER operations
ON regional_order_totals (region);
CREATE INDEX regional_totals_support IN CLUSTER support
ON regional_order_totals (region);

SUBSCRIBE regional_order_totals
WITH (SNAPSHOT = true, PROGRESS = true);`;

export const documentationLinks = [
  { label: 'Kafka envelopes: NONE, UPSERT, and DEBEZIUM', href: 'https://materialize.com/docs/sql/create-table/kafka/' },
  { label: 'Views and shared maintained results', href: 'https://materialize.com/docs/fundamentals/concepts/views/' },
  { label: 'Temporal filters', href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/' },
  { label: 'Freshness troubleshooting', href: 'https://materialize.com/docs/transform-data/freshness-troubleshooting/' },
  { label: 'Isolation levels', href: 'https://materialize.com/docs/serve-results/isolation-level/' },
  { label: 'SUBSCRIBE: snapshots and progress', href: 'https://materialize.com/docs/sql/subscribe/' },
];
