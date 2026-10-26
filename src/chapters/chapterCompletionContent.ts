interface CompletionTopic {
  readonly title: string;
  readonly description: string;
}

interface ChapterCompletionContent {
  readonly title: string;
  readonly description: string;
  readonly topics: readonly [CompletionTopic, CompletionTopic, CompletionTopic];
  readonly takeaway: string;
}

export const chapterCompletionContent: Readonly<Record<string, ChapterCompletionContent>> = {
  'changing-relations': {
    title: 'How signed changes build a relation',
    description: 'You reconstructed a changing inventory from additions, retractions, and updates at complete logical timestamps.',
    topics: [
      { title: 'Signed diffs', description: 'Add or retract copies of a full row, then combine all its changes at a timestamp.' },
      { title: 'Copies & full rows', description: 'Treat different prices as different full rows. Remove a row when its copy count reaches zero.' },
      { title: 'Updates & batches', description: 'Replace old row values with new ones, and explain why an unchanged total can still hide a changed relation.' },
    ],
    takeaway: 'The current relation is the starting state plus the net signed diffs for each full row. Apply complete timestamp batches, and distinguish a change in copies from a change in row values.',
  },
  'incremental-maintenance': {
    title: 'How one change travels through SQL',
    description: 'You explored incremental maintenance: how input changes travel through filters, joins, and grouped aggregates.',
    topics: [
      { title: 'Filters & projections', description: 'Predict when rows enter or leave a result, and when unused-column edits leave it unchanged.' },
      { title: 'Joins & retained matches', description: 'Follow late matches and product edits that change many rows.' },
      { title: 'Grouped counts & revenue', description: 'Maintain COUNT and SUM as rows change values, move between groups, or disappear.' },
    ],
    takeaway: 'Incremental maintenance reuses retained state to apply changes. You compared this with rebuilding the full result, and predicted the complete rows inserted or retracted at each timestamp.',
  },
  'views-indexes-materialized-views': {
    title: 'Choose what to save and where to maintain it',
    description: 'You designed one transformation with two serving clusters, separating saved SQL, local indexes, and durable output.',
    topics: [
      { title: 'Regular views', description: 'Save a reusable SQL definition without storing a maintained result.' },
      { title: 'Cluster-local indexes', description: 'Maintain complete results in cluster memory. Separate clusters keep separate index state.' },
      { title: 'Materialized views', description: 'Maintain durable output readable across clusters. Creation and restarts require hydration.' },
    ],
    takeaway: 'Choose the object by what must be saved and where it must be served. Removing a serving index leaves durable output available; maintaining that output still uses transform-cluster memory.',
  },
  'getting-data-in': {
    title: 'From incoming data to current rows',
    description: 'You followed data from an initial snapshot into a maintained table, and chose how incoming records become changes.',
    topics: [
      { title: 'Snapshot and live CDC', description: 'Commit the starting rows together, catch up, then maintain the live table.' },
      { title: 'Producer contracts', description: 'Interpret events, current keyed values, and explicit before/after changes.' },
      { title: 'Stable keys and deletions', description: 'Preserve identity through updates and distinguish nullable fields, tombstones, and errors.' },
    ],
    takeaway: 'The producer’s contract determines how records become rows. Correct identity keeps updates from becoming additional products.',
  },
  'time-in-materialize': {
    title: 'Time is an input to maintained results',
    description: 'You predicted how query time, event timestamps, and source changes affect a temporal result.',
    topics: [
      { title: 'Clocks and boundaries', description: 'Use logical time and distinguish inclusive from exclusive limits.' },
      { title: 'Changing lifetimes', description: 'Replace deadlines and ignore obsolete future effects.' },
      { title: 'Recent events', description: 'Handle late and future events without restarting their event-time windows.' },
    ],
    takeaway: 'A result can change as logical time advances, even when the source receives no new rows. Expiration changes membership, not the source table.',
  },
  'progress-and-freshness': {
    title: 'What progress proves, and where delay starts',
    description: 'You read completed logical time, followed two inputs into a maintained join, and traced delay back to its first stage.',
    topics: [
      { title: 'Frontier guarantees', description: 'A frontier F completes times below F. Quiet inputs still need explicit progress evidence.' },
      { title: 'Inputs and computation', description: 'The slowest required input limits progress. Computation must still catch up.' },
      { title: 'Locate the delay', description: 'Use different evidence for source delay, computation delay, and slow queries.' },
    ],
    takeaway: 'Progress guarantees completed logical time, not the timestamp of the last observed row. Check the limiting input and actual computation before diagnosing freshness.',
  },
  'consistent-reads': {
    title: 'Choose one complete moment for every input',
    description: 'You chose coherent snapshots, explained transaction ordering, and predicted bounded reads during an ingestion stall.',
    topics: [
      { title: 'Readable snapshots', description: 'Choose one timestamp in every input’s retained, complete window, then read all inputs there.' },
      { title: 'Transaction ordering', description: 'Keep transaction observations in order. External writes require independent ingestion.' },
      { title: 'Freshness and waiting', description: 'Separate complete results from fresh ones. A freshness bound may require an error.' },
    ],
    takeaway: 'A consistent read uses the same retained, complete timestamp for every input. Transaction order does not prove that an external write has arrived, and a freshness policy can reject an otherwise readable snapshot.',
  },
};
