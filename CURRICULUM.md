# Materialize Learning Lab Curriculum

This document defines the current proposed curriculum for the Materialize
Learning Lab. It is organized around learner questions and interactive labs,
rather than mirroring the navigation of the Materialize documentation.

This is a learning-scope specification, not an inventory of shipped pages or a UI
template. Current implementation details live in the chapter READMEs and
`src/chapters/chapterOutline.ts`. Follow [UI_LAYOUTS.md](./UI_LAYOUTS.md) for shared
presentation and layout requirements and [MAINTAINABILITY.md](./MAINTAINABILITY.md)
for the development workflow.

The learning path comprises seven foundation chapters followed by an application
chapter on `SUBSCRIBE`. All eight chapters are registered in the app.
The Chapter 8 activity, simulation, and visualization specification is in
[CHAPTER_8_PLAN.md](./CHAPTER_8_PLAN.md). Timestamp trays is the selected
visualization.

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

## Exercise progression

The exercises below are curriculum specifications; implemented activities may
combine several of them into one continuous scenario, as in Chapters 1 and 2.
Use them in order within a chapter: begin with a guided prediction, introduce a
different behavior or failure mode, then reduce guidance for the final challenge.
Each exercise names what the learner does and what their explanation should
establish. These checks guide feedback and do not need to be shown as answers
before the learner tries.

Exercise counts vary with the subject. Do not add variations that merely change
the numbers. Reuse a chapter's visualizations where appropriate, and offer hints
before revealing an explanation. Optional extensions are not prerequisites for
the core final challenge. Preview-only behavior must be labeled and kept out of
required hands-on exercises when it is unavailable to the learner.

Use deterministic fixtures for simulations. Label work counts, resource budgets,
and processing rates as illustrative, and check real behavior against the
technical references before implementing an exercise.

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

### Exercises

1. **Count copies, not messages** — apply `+3` and then `-1` to the same row in an
   initially empty relation. Predict its multiplicity after each change and
   compare with applying three separate `+1` changes. Check that the learner
   counts row copies rather than received messages or distinct values.
2. **Correct a price** — change `(product_id, price)` from `(7, 20)` to `(7, 25)`.
   Choose the rows and signs needed to express the update. Check that the old
   full row is retracted and the new row is inserted at the same logical time;
   simply inserting the new price leaves both values present.
3. **One timestamp, several changes** — group additions and retractions by full
   row at one timestamp and calculate their net effect. Reorder the entries and
   explain why the relation after that complete timestamp is unchanged. Check
   that animation steps are not mistaken for separately committed states.

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

### Exercises

1. **Cross the filter boundary** — move an order's amount from below to above a
   minimum, then back below it. Next, edit a column unused by the query. Predict
   whether the output gains a row, loses a row, or stays unchanged. Check that
   a source update does not necessarily imply an output update.
2. **An old row finds a new match** — insert an order whose product is absent
   from an inner join, then add the product later. Predict when the joined row
   appears and what information must have remained available. Remove the
   product and predict the retraction.
3. **One edit, many affected rows** — change a product attribute used by a join
   when several orders reference that product. Mark every affected output and
   every unaffected order. Check that incremental work can still be large when
   one changed row has many matches.
4. **Replace an aggregate result** — change an order amount in a grouped revenue
   query, then cancel the last order in one group. Write the old-result
   retractions and new-result insertions. Check that a vanished group in this
   grouped query does not remain as an invented zero-valued row.

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

### Exercises

1. **Choose what to maintain** — assign objects to three small requirements: a
   reusable SQL definition, repeatedly served results in one cluster, and
   precomputed results shared across clusters. Justify each choice in terms of
   saved SQL, maintained memory state, and durable output.
2. **Move the query, follow the state** — run a view query in a cluster with an
   index and then in one without it. Repeat with a materialized view. Identify
   which state each query can access; check that a remote cluster cannot use
   another cluster's index but can read durable materialized results.
3. **Remove an index** — in the simulation, remove an index on a materialized
   view that has no other dependents. Predict which state disappears and
   whether the materialized result remains available. Check that losing an
   in-memory access path is not confused with deleting durable output.
4. **Avoid materializing every step** — inspect three stacked views used only
   to organize SQL, with only the final result served to applications. Choose
   where to maintain results and explain any extra state introduced by
   maintaining each intermediate step separately.

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

### Exercises

1. **Finish the initial load** — follow a native database CDC fixture containing
   an initial snapshot plus an update and a deletion after its snapshot point.
   Predict the table after snapshot commitment and after catch-up. Check that
   the initial snapshot is committed atomically and subsequent changes are not
   treated as an unrelated second copy of the table.
2. **Interpret the producer's message** — inspect separate, valid Kafka
   fixtures containing independent events, keyed replacement values, and
   Debezium before/after records. Choose the matching envelope and reconstruct
   the resulting relation. Check that envelope choice follows the producer's
   contract; native database connectors are not configured by choosing one of
   these Kafka envelopes.
3. **Delete by key** — apply two values and then a Kafka tombstone for one key
   under the upsert envelope. Compare the tombstone with a non-null record
   containing a nullable field. Explain which removes the row and why a null
   field inside a value is not itself a tombstone.
4. **A rename creates a second product** — use a mutable product name as an
   upsert key, then rename the product without deleting the old key. Diagnose
   why two keys remain. Design a stable product-ID key and explain how the
   producer would have to remove the old key if a key change were intentional.

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

### Exercises

1. **Find the exact expiration** — give a row event time 10 seconds and a
   10-second lifetime. Predict membership just before, at, and just after time
   20 under `<` and `<=` predicates. Advance logical time without sending a new
   row and identify the retraction boundary for each predicate.
2. **Exclude the future** — start with an expiration-only predicate and insert
   an event dated in the future. Explain why it already qualifies, then add a
   lower bound requiring logical time to reach the event time. Predict both
   its entry and exit without additional source changes.
3. **Arrive late with time remaining** — give two rows the same event time but
   different logical arrival times: one within the window and one after its
   expiration. Predict visibility and remaining lifetime. Check that arrival
   does not automatically restart an event-time-based window.
4. **Extend a lifetime before it expires** — update a row's expiration from
   time 20 to time 30 while logical time is 15. Trace the source update and
   result changes, then advance through both deadlines. Check that the old
   scheduled expiration cannot remove the replacement row at time 20.
5. **Choose the clock for the question** — compare a transaction-time value
   from `now()` with a temporal predicate using `mz_now()`. Match each to the
   question it answers and explain which drives continuously maintained
   membership. Rewrite a predicate that incorrectly performs interval
   arithmetic directly on `mz_now()` by moving arithmetic to the row's
   timestamp expression.

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

### Exercises

1. **Quiet or stuck?** — compare two inputs with no new business rows. One
   continues reporting progress; the other's progress stops. Decide what the
   system can conclude in each case. Check that an absence of row updates
   alone does not establish either completeness or failure.
2. **Read the boundary correctly** — give an object write frontier 12 and ask
   whether changes at logical times 11 and 12 are complete. Contrast this with
   merely observing a high timestamp on one of several inputs. Check that
   completeness is strictly below the frontier and refers to logical time,
   not a promise that no older business event can arrive later.
3. **Advance the limiting input** — join two inputs with frontiers 12 and 8.
   Predict which input must advance before the output can complete more time,
   then advance it while deliberately slowing the join's own processing.
   Check that input progress permits downstream progress but does not force
   computation to catch up instantly.
4. **Find where the delay starts** — inspect a dependency chain with an
   upstream source, two maintained transformations, and a serving query. Move
   a simulated bottleneck between ingestion, a transformation, and retrieval.
   Identify introduced versus inherited lag, and distinguish fresh data
   returned slowly from data that has not caught up.

### Final challenge

Diagnose three delayed dashboards: stale data caused by a stalled source, stale
data caused by slow maintained computation, and current data retrieved by a slow
serving query. Identify the evidence for each cause and the stage to investigate.

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

### Exercises

1. **Find a readable moment** — use input A with retained times starting at 3
   and write frontier 10, and input B with retained times starting at 5 and
   write frontier 8. Select a complete timestamp both can serve. Classify
   requests for times 4, 7, and 8 as too old, available, or waiting. Treat this
   as a timestamp-selection model, not arbitrary time-travel SQL syntax.
2. **Can the second read go backwards?** — inspect two successive read
   transactions: the first reads a table and the second reads a lagging
   materialized result derived from it. Compare allowed observations under
   serializable and strict serializable isolation. Explain when preserving
   the observed ordering requires waiting.
3. **Meet a staleness bound** — give a dashboard a five-second logical
   staleness limit and vary the latest readable timestamp from two to eight
   seconds behind. Predict successful reads versus bounded-staleness errors.
   Check that this policy does not wait for ingestion to satisfy the bound,
   and does not guarantee zero query execution time.
4. **A source write is not yet a visible read** — insert a row in the upstream
   database while pausing ingestion in the fixture. Explain why strict
   serializable reads in Materialize do not by themselves guarantee immediate
   visibility of that external write. Identify the difference between
   transaction ordering inside Materialize and end-to-end source recency.

### Final challenge

Choose a read policy for a dashboard with a freshness bound and predict its
behavior during an ingestion stall.

---

## Chapter 8: SUBSCRIBE — From Maintained Results to Live Applications

### Learning goal

Keep an application's local result correct as Materialize streams a starting
snapshot and subsequent result changes. Decide when the received changes provide
enough evidence to publish a complete timestamp to the application's display.

This chapter applies the signed diffs from Chapters 1–2, maintained objects from
Chapter 3, temporal changes from Chapter 5, and progress and timestamp reasoning
from Chapters 6–7. Its new skill is consuming a result stream outside Materialize.

### Core topics

- one `SELECT` result versus an ongoing `SUBSCRIBE`;
- default initial snapshot and subsequent changes; when `SNAPSHOT false` leaves
  an empty client without a starting baseline;
- `mz_timestamp`, `mz_diff`, and, with `PROGRESS`, `mz_progressed`;
- applying signed multiplicities by full result row, including aggregate
  replacement and a group disappearing;
- received changes, pending changes, and the published client result;
- progress at T establishing completeness strictly before T, including progress
  with no business-row changes;
- nondecreasing output timestamps and the completeness evidence from receiving
  a later timestamp;
- why a fetch batch, row count, or pause is not a timestamp boundary; and
- a connected subscription versus a demonstrably advancing result, and showing
  the last known result as stale after a disconnect.

### Visualizations

Use **Timestamp trays** across all three lectures and three exercises, following
[CHAPTER_8_PLAN.md](./CHAPTER_8_PLAN.md). The chosen composition groups signed
records by timestamp, separates published and pending groups with a strict
completeness boundary, and shows the application's published result below.
The original design comparisons were:

1. **Stream workbench** — trace a maintained result through received records and
   a timestamp buffer into the application's published table.
2. **Timestamp trays** — collect diffs into open timestamp groups and move only
   completed groups across a progress boundary into the published result.
3. **Delivery timeline** — align result changes, client receipt, and publication
   to expose partial delivery and the evidence that permits publication.
4. **Client debugger** — inspect an incoming record and compare a faulty
   publish-on-every-row client with a consumer that publishes completed times.

### Lectures

1. **Start with a snapshot** — contrast a one-time query with a continuing
   subscription, initialize an empty client, and predict what disabling the
   snapshot omits.
2. **Turn changes into client state** — apply additions and retractions to full
   result rows, replace an aggregate, remove a vanished group, and distinguish
   an incomplete delivery from a completed result.
3. **Publish complete results** — read progress evidence, handle quiet intervals,
   and keep incomplete timestamps out of the published display.

### Exercises

1. **Bootstrap the live table** — reconstruct a starting result from snapshot
   records and choose a valid initialization strategy. Explain why a client
   starting empty cannot reconstruct unchanged rows with `SNAPSHOT false`.
2. **Repair the consumer** — fix an append-only or key-overwrite interpretation
   of signed result diffs. Predict an aggregate replacement, a group deletion,
   and the final multiplicities of a small duplicate-row fixture.
3. **Keep the dashboard correct** — follow split delivery at one timestamp,
   choose which changes can be published at progress boundaries, interpret
   advancing progress with no changed rows, and mark a disconnected display
   stale. This exercise is the chapter's final challenge.

### Final challenge

Maintain a live open-order summary through initial load, an amount correction,
quiet progress, cancellation of the last order in a region, and a disconnect.
Select the correct visible rows and publication boundary at each checkpoint,
then explain why the client can be connected while its latest received timestamp
is still incomplete. Assess both the result and the evidence for publishing it.

### Scope boundary

Required work is a deterministic client simulation using the default diff output,
not a connector setup or application framework tutorial. Put executable cursor /
`FETCH` examples in SQL & Objectives. Keep output envelopes, durable resume,
retention configuration, and atomic checkpoint/effect handling in supporting or
advanced material; the final challenge does not depend on them. A new connection
alone is not a durable recovery strategy. Durable subscription history retention
is currently private preview; recheck availability before any extension ships.

---

## Capstones

Capstones are separate from chapters and combine several established mental
models with less guidance.

### Capstone 1: Live Order Operations

After Chapter 5, build and explain a live recent-orders view from a changing
source. Handle updates, cancellations, late events, and automatic expiration.

### Capstone 2: The Dashboard Is Fresh but Expensive

Diagnose maintained state, skew, query shape, index use, and
freshness for a costly operational dashboard. Redesign it under a fixed resource
budget.

### Capstone 3: Recover Without Corrupting Delivery

After Chapter 8 and additional recovery instruction, handle a cluster restart,
hydration and catch-up, a live-client reconnection, and a downstream consumer
crash without silently losing or duplicating business effects. Durable replay
and atomic checkpoint/effect handling belong to that additional instruction;
Chapter 8 establishes live consumption and disconnect awareness only.

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
- [Kafka sources: current syntax](https://materialize.com/docs/sql/create-source/kafka-v2/)
- [Views](https://materialize.com/docs/fundamentals/concepts/views/)
- [Indexes](https://materialize.com/docs/fundamentals/concepts/indexes/)
- [Arrangements](https://materialize.com/docs/fundamentals/concepts/arrangements/)
- [Temporal filters](https://materialize.com/docs/transform-data/patterns/temporal-filters/)
- [`SUBSCRIBE`](https://materialize.com/docs/sql/subscribe/)
- [`SELECT` and `SUBSCRIBE`: serving results](https://materialize.com/docs/serve-results/query-results/)
- [Durable subscriptions: advanced extension and availability](https://materialize.com/docs/serve-results/durable-subscriptions/)
- [Durable subscriptions](https://materialize.com/docs/serve-results/durable-subscriptions/)
- [Freshness troubleshooting](https://materialize.com/docs/transform-data/freshness-troubleshooting/)
- [Freshness and query latency](https://materialize.com/docs/fundamentals/concepts/reaction-time/)
- [Query optimization](https://materialize.com/docs/transform-data/optimization/)
- [Clusters](https://materialize.com/docs/fundamentals/concepts/clusters/)
- [Hydration](https://materialize.com/docs/fundamentals/concepts/hydration/)
- [Isolation levels](https://materialize.com/docs/serve-results/isolation-level/)
- [Kafka sink delivery and envelopes](https://materialize.com/docs/sql/create-sink/kafka/)
- [Recursive CTEs](https://materialize.com/docs/sql/select/recursive-ctes/)
