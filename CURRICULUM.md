# Materialize Learning Lab Curriculum

This document defines the current proposed curriculum for the Materialize
Learning Lab. It is organized around learner questions and interactive labs,
rather than mirroring the navigation of the Materialize documentation.

The curriculum is grounded in the current
[Materialize documentation](https://materialize.com/docs/). Materialize changes
over time, so each chapter must be checked against current official documentation
when its content and simulation are implemented.

## What earns a standalone chapter

A chapter should have enough substance to support:

- one distinct mental model or practical skill;
- a guided scenario with several meaningful variations;
- at least one prediction or diagnosis exercise;
- an explanation of likely misconceptions; and
- a final challenge the learner can solve with reduced guidance.

A single animation or syntax example is normally a lesson within a chapter, not
a complete chapter.

## Orientation: What kind of database is Materialize?

This short orientation is not counted as a full chapter. It gives learners just
enough vocabulary to navigate the course: sources, source-backed tables, views,
indexes, materialized views, clusters, `SELECT`, and `SUBSCRIBE`.

The orientation should establish the top-level flow:

```text
External systems -> Sources/tables -> SQL transformations
                 -> Maintained results -> Queries/subscriptions/sinks
```

Suggested visualization:

1. **Interactive system map** — hover or select each object to see its role and
   how data or queries pass through it.

---

## Chapter 1: Changing Relations — Rows, Updates, and Diffs

### Learning goal

Understand a relation as a collection whose contents change over logical time.
Learners reconstruct its current state from additions and retractions, including
duplicate rows and multiplicities. An update is introduced as a retraction of an
old value and insertion of a new value.

### Core topics

- changing relations;
- `(data, time, diff)` records;
- positive and negative multiplicities;
- inserts, deletes, and updates;
- duplicate rows and cancellation; and
- multiple changes at one logical timestamp.

### Visualizations

1. **Diff ledger beside a live relation** — apply changes one at a time while the
   current relation and row multiplicities update.
2. **Update decomposition** — editing one business record reveals its old-row
   retraction and new-row insertion at the same logical timestamp.

### Final challenge

Reconstruct an inventory relation from a history containing deliveries,
corrections, cancellations, and duplicate rows.

---

## Chapter 2: Incremental Maintenance — How One Change Travels Through SQL

### Learning goal

Understand how a small input change produces targeted changes to a maintained
query result, and why incremental maintenance still requires retained state.

### Core topics

- initial computation versus subsequent maintenance;
- changes through filters and projections;
- changes through joins;
- aggregation updates;
- affected versus unaffected output; and
- full recomputation versus incremental work.

### Visualizations

1. **Interactive dataflow graph** — select a source update and trace its effects
   through a filter, join, aggregate, and output relation.
2. **Recomputation comparison** — run a small scenario both ways and highlight
   which records each method examines. Counts must be labeled as illustrative
   unless measured from Materialize.

### Final challenge

Predict how changing a customer's region changes a maintained revenue-by-region
result, including the emitted result diffs.

---

## Chapter 3: Views, Indexes, and Materialized Views

### Learning goal

Choose the correct Materialize object by understanding what stores a query
definition, what maintains results in cluster memory, what persists results in
durable storage, and which state is available across clusters.

### Core topics

- regular views;
- indexed views;
- materialized views;
- cluster-local indexes;
- durable results;
- serving from memory versus storage; and
- reuse across workloads and clusters.

### Visualizations

1. **State-location map** — distinguish saved SQL, cluster memory, and durable
   storage as learners create or remove objects.
2. **Query-path explorer** — run the same query from different clusters and show
   whether it uses local indexed results, durable materialized output, or fresh
   computation.

### Final challenge

Design the objects needed when one transformation feeds two independently scaled
serving clusters.

---

## Chapter 4: Getting Data In — Sources, Snapshots, and CDC

### Learning goal

Understand how Materialize obtains an initial relation and then keeps it current
from an external system. Learners choose an envelope that correctly turns
incoming records into inserts, updates, and deletions.

### Core topics

- connections, sources, and source-backed tables;
- initial snapshotting;
- transition to steady-state ingestion;
- append-only records;
- upsert keys and tombstones;
- Debezium before/after changes;
- duplicate or malformed input; and
- why update identity matters.

### Visualizations

1. **Snapshot-to-live pipeline** — show the upstream database, atomic initial
   snapshot, ongoing changes, and the relation visible in Materialize.
2. **Envelope interpreter** — feed the same messages through append-only, upsert,
   and Debezium interpretations and compare the resulting relations.
3. **Key failure simulator** — change or remove keys and observe duplicates,
   replacement, deletion, or an invalid source state.

### Final challenge

Repair a product catalog in which price updates were mistakenly interpreted as
additional products.

---

## Chapter 5: Time in Materialize — Temporal Filters

### Learning goal

Distinguish wall-clock time, event time, arrival time, and Materialize logical
time. Explain why a maintained result may change even when no new source row
arrives.

### Core topics

- `now()` and `mz_now()`;
- logical versus event time;
- temporal filter syntax and restrictions;
- rows entering and leaving time windows;
- scheduled future changes;
- late-arriving and future-dated events; and
- time-bound maintained state.

### Visualizations

1. **Synchronized multi-lane timeline** — show arrivals, event timestamps,
   logical time, result membership, and emitted diffs.
2. **Row lifetime bands** — display the interval in which each row satisfies the
   predicate; allow the learner to move event times and change window length.
3. **Late-arrival experiment** — control arrival delay independently of event
   time and compare rows with remaining lifetime against already-expired rows.

### Final challenge

Build and explain a recent-events view that behaves correctly for on-time, late,
and future-dated events.

This is the flagship MVP chapter.

---

## Chapter 6: Progress and Freshness — Why Is the System Behind?

### Learning goal

Understand what progress information establishes, how a slow input constrains
downstream progress, and how to distinguish ingestion lag from computation lag.

### Core topics

- write frontiers as statements about completed times;
- why the highest timestamp observed is insufficient;
- source and downstream frontiers;
- wall-clock lag;
- local versus inherited materialization lag;
- stalled sources and overloaded compute; and
- freshness, query latency, and reaction time.

### Visualizations

1. **Parallel progress lanes** — advance two inputs at different rates and watch
   the downstream frontier follow the limiting dependency.
2. **Lag dependency map** — select a stale output and trace lag through the
   dependency graph, separating locally introduced and inherited lag.

### Final challenge

Diagnose three stale dashboards caused respectively by a stalled source, slow
maintained computation, and slow query serving.

---

## Chapter 7: Consistent Reads — Which Moment Does a Query See?

### Learning goal

Reason about the logical timestamp chosen for a query and the trade-off among
freshness, waiting, predictable latency, and ordering guarantees.

### Core topics

- query timestamps;
- read and write frontiers;
- consistent snapshots across several inputs;
- retained history and compaction boundaries;
- strict serializable reads;
- serializable reads;
- bounded staleness; and
- transaction consistency versus recent external ingestion.

### Visualizations

1. **Readable-time intersection** — each input exposes a range of readable and
   complete times; move a requested timestamp to see immediate, waiting, too-old,
   or bounded-staleness-error outcomes.
2. **Transaction timeline** — compare observations under the available isolation
   policies while inputs progress at different rates.

### Final challenge

Choose a read policy for a dashboard with a freshness bound and predict its
behavior during an ingestion stall.

---

## Chapter 8: Maintained State — Why Small Results Can Be Expensive

### Learning goal

Identify the state required by joins, aggregations, distinctness, Top-K queries,
and upsert processing. Explain why output size alone does not predict memory or
maintenance cost.

### Core topics

- retained input and intermediate state;
- arrangements;
- cardinality and row width;
- join and aggregation state;
- update fan-out;
- skew and hot keys;
- temporal bounds; and
- shared versus duplicated arrangements.

### Visualizations

1. **State inventory** — place input, intermediate, and output collections side
   by side and show which rows or keys must remain available.
2. **Key-distribution heatmap** — redistribute records between keys and workers
   to reveal hot keys and concentrated state.
3. **Output-versus-state scale** — compare a tiny final relation with the much
   larger state required to keep it current.

### Final challenge

Explain why a query returning ten rows uses substantial memory and identify the
specific maintained state responsible.

---

## Chapter 9: Query Optimization — Change the Plan, Preserve the Answer

### Learning goal

Improve a query's serving and maintenance behavior using appropriate index keys,
query shapes, data reduction, and plan inspection while preserving semantics.

### Core topics

- early filtering and projection;
- compact representations;
- point lookups versus index scans;
- exact index-key expression matching;
- indexes for join keys;
- index reuse and its memory cost;
- creation-time planning and object recreation;
- differential and delta joins at a practical level;
- selected idiomatic Materialize SQL patterns; and
- verifying choices with `EXPLAIN`.

### Visualizations

1. **Before-and-after plan graph** — compare equivalent queries and highlight
   changed operators, index reuse, and retained intermediate state.
2. **Index experiment bench** — choose index keys and query predicates, then see
   whether the access is a point lookup or scan and whether maintained objects
   can reuse the index.
3. **Memory/speed budget board** — select candidate indexes under a fixed memory
   budget and evaluate the query patterns each helps.

### Final challenge

Improve a multiway maintained query under a memory constraint, justify the
chosen indexes, and confirm the plan still computes the intended result.

---

## Chapter 10: Clusters, Replicas, and Recovery

### Learning goal

Understand workload placement, compute isolation, replica redundancy, cluster
lifecycle, hydration, backlog catch-up, and the distinction between durable
output and in-memory maintenance state.

### Core topics

- clusters as isolated compute pools;
- source, transformation, and serving workloads;
- cluster-local indexes;
- replicas as redundant full copies rather than shards;
- provisioning, hydration, catch-up, and steady state;
- snapshotting versus hydration;
- restart and resize behavior; and
- steady-state versus peak hydration resource needs.

### Visualizations

1. **Interactive deployment map** — place objects on clusters, add replicas, and
   inspect accessible and isolated state.
2. **Failure-and-recovery timeline** — restart a replica and track durable data,
   rebuilt memory state, accumulated backlog, freshness, and availability.
3. **Resource profile over time** — compare hydration and steady-state demand and
   simulate a restart loop caused by insufficient resources.

### Final challenge

Diagnose a deployment whose durable results survived a restart but whose compute
has not caught up, then choose a recovery action.

---

## Chapter 11: Building Live Applications with `SUBSCRIBE`

### Learning goal

Consume a changing Materialize result correctly in an application, including
initial state, row diffs, logical timestamp groups, progress, buffering, and
reconnection.

### Core topics

- `SELECT` as a relation at a time;
- `SUBSCRIBE` as changes to a relation over time;
- snapshots and `SNAPSHOT = false`;
- `mz_timestamp` and `mz_diff`;
- progress messages;
- reconstructing client state;
- timestamp-complete batches;
- bounded subscriptions with `AS OF` and `UP TO`; and
- durable resumption as an advanced, feature-status-aware exercise.

### Visualizations

1. **Server/client state comparison** — show the maintained relation,
   subscription output, client buffer, and rendered client state simultaneously.
2. **Progress and reconnect timeline** — compare a quiet but progressing stream
   with a stalled stream, then disconnect and resume from a stored timestamp.
3. **Envelope output switcher** — compare differential, upsert, and applicable
   before/after representations without changing the underlying relation.

### Final challenge

Build a live table that handles inserts, updates, deletions, and timestamp groups
without exposing a partially applied state.

---

## Chapter 12: Sinks and Reliable Downstream Delivery

### Learning goal

Understand how maintained results become downstream messages and why reliable
end-to-end processing depends on the broker and consumer as well as Materialize.

### Core topics

- sinks and exported relations;
- keys and output envelopes;
- upsert and Debezium representations;
- deletion tombstones;
- progress metadata;
- partitions and ordering;
- replay and consumer checkpoints;
- idempotent processing; and
- end-to-end exactly-once requirements.

### Visualizations

1. **Relation-to-message translator** — change a result row and compare messages
   produced under different envelopes, including deletion behavior.
2. **Crash-point sequence diagram** — inject crashes between production,
   consumption, external side effects, and offset commits to reveal duplicate or
   lost-effect risks.

### Final challenge

Repair a consumer that applies an external side effect twice after restarting
and explain which guarantees each component provides.

---

## Optional Chapter 13: Recursive Queries and Changing Graphs

### Learning goal

Understand recursive SQL as repeated computation to a fixed point, and reason
about convergence, cycles, recursion limits, update locality, and amplification.

### Core topics

- `WITH MUTUALLY RECURSIVE`;
- fixed-point iteration;
- reachability and hierarchical aggregation;
- incremental changes across iterations;
- `UNION` versus unbounded duplicate growth with `UNION ALL`;
- recursion limits;
- update locality; and
- resource risks from widely propagating changes.

### Visualizations

1. **Editable graph** — add and remove edges and predict which reachability pairs
   appear or retract, including alternative paths.
2. **Iteration explorer** — step through recursive bindings until they stabilize
   and compare convergence with unbounded duplicate growth.

### Final challenge

Maintain inherited permissions through a changing group hierarchy and explain
the result of removing an edge.

Detailed Timely Dataflow capabilities, partial orders, traces, and reclocking can
form a later internals track once there is a clear learner need.

---

## Capstones

Capstones are separate from chapters and combine several established mental
models with less guidance.

### Capstone 1: Live Order Operations

After Chapter 5, build and explain a live recent-orders view from a changing
source. Handle updates, cancellations, late events, and automatic expiration.

### Capstone 2: The Dashboard Is Fresh but Expensive

After Chapter 9, diagnose maintained state, skew, query shape, index use, and
freshness for a costly operational dashboard. Redesign it under a fixed resource
budget.

### Capstone 3: Recover Without Corrupting Delivery

After Chapter 12, handle a cluster restart, hydration and catch-up, a live-client
reconnection, and a downstream consumer crash without silently losing or
duplicating business effects.

## Shared scenario strategy

Reuse a compact commerce domain—customers, products, orders, payments, and
shipments—across much of the curriculum. Familiar data lets learners focus on
Materialize behavior. Use a different domain only when it materially improves a
concept, such as a graph for recursive queries.

Shared subject matter must not imply shared simulation logic where the chapters
need different semantics. Each chapter can use a focused scenario derived from
the same domain.

## Supporting guides rather than chapters

Keep installation, credentials, individual connector setup, general SQL syntax,
BI-tool integrations, permissions reference, and deployment administration in
supporting guides. They are useful, but their main value is procedural rather
than visual or conceptual.

## Technical references

Use the current official documentation during implementation. Starting points:

- [Materialize concepts](https://materialize.com/docs/fundamentals/concepts/)
- [Getting started](https://materialize.com/docs/get-started/)
- [Ingest data](https://materialize.com/docs/ingest-data/)
- [Views](https://materialize.com/docs/fundamentals/concepts/views/)
- [Indexes](https://materialize.com/docs/fundamentals/concepts/indexes/)
- [Arrangements](https://materialize.com/docs/fundamentals/concepts/arrangements/)
- [Temporal filters](https://materialize.com/docs/transform-data/patterns/temporal-filters/)
- [`SUBSCRIBE`](https://materialize.com/docs/sql/subscribe/)
- [Query optimization](https://materialize.com/docs/transform-data/optimization/)
- [Clusters](https://materialize.com/docs/fundamentals/concepts/clusters/)
- [Hydration](https://materialize.com/docs/fundamentals/concepts/hydration/)
- [Isolation levels](https://materialize.com/docs/serve-results/isolation-level/)
- [Recursive CTEs](https://materialize.com/docs/sql/select/recursive-ctes/)
