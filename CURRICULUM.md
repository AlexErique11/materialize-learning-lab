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

## Exercise progression

The exercises below are curriculum specifications, not implemented activities.
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

### Exercises

1. **Delete the winner** — maintain the three highest-value orders, then
   delete the first-ranked order. Predict the replacement and explain why
   keeping only the three displayed rows would be insufficient. Repeat with
   tied values using an explicit deterministic tie-breaker.
2. **One duplicate disappears** — maintain distinct customer regions while
   several customers share a region. Delete one customer, then the last
   customer in that region. Explain the bookkeeping needed to retract the
   region only when its final supporting row disappears.
3. **Expose the join expansion** — join three orders and four matching
   promotions on the same product key. Count the 12 joined rows before a final
   aggregate reduces them to one. Add another promotion and explain the
   affected matches; inspect a supplied plan to identify retained state
   without assuming every plan stores the full intermediate join result.
4. **Same output, different inputs** — compare two fixtures with identical
   aggregate results but different numbers of distinct keys and different
   widths in retained rows. Use a supplied state inventory to explain why
   equal output counts do not establish equal memory needs. Make qualitative
   predictions rather than claiming exact byte measurements.
5. **Hide a hot worker in the average** — distribute join keys evenly, then
   concentrate most records on one key. Inspect worker-level load alongside
   the cluster average. Identify the bottleneck and explain why a reassuring
   average can conceal a heavily loaded worker.

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

### Exercises

1. **Lookup or scan?** — match predicates to supplied indexes: equality on a
   full composite key, equality on only part of it, a range, and equality on
   an expression such as `lower(email)`. Predict point lookups versus scans
   and verify with a plan. Check that using an index does not necessarily
   mean reading only a few rows.
2. **Rewrite without changing the answer** — remove unused columns and apply
   valid filtering earlier in a maintained query, then compare results and
   plans. Include an outer-join case where moving a filter changes the answer.
   Reject that rewrite and recognize that an optimizer may already produce
   the same plan for equivalent SQL.
3. **An index arrives after the plan** — inspect a maintained object's plan,
   add a suitable index in the simulation, and inspect the existing plan
   again. Compare with a newly planned equivalent object. Explain
   creation-time planning and why index creation alone is not proof that an
   existing maintained computation now uses it.
4. **Spend the index budget** — choose among candidate indexes for a small
   collection of recurring lookups and joins. Use supplied illustrative state
   costs and observed plan reuse to justify the set. Explain why an extra
   index must earn its maintenance and memory cost.
5. **Optional extension: compare multiway joins** — inspect differential and
   delta plans for an equivalent three-way join. Identify reused arrangements
   and intermediate state, then explain the resource trade-off. Provide the
   plans rather than requiring the learner to memorize operator names or
   assume that one strategy is always best.

### Final challenge

Improve a maintained query under a memory constraint, justify the chosen
indexes or rewrites, and confirm both result equivalence and the intended plan
change. Offer a multiway-join version as an advanced variant.

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

### Exercises

1. **Isolate a competing workload** — place ingestion, maintained
   transformations, application serving, and an expensive exploratory query
   on a deployment map. Predict which workloads compete for a cluster's
   resources, then choose a placement that protects application serving.
   Explain the additional compute and state required by the choice.
2. **Add a replica, then lose one** — compare a single-replica cluster with a
   two-replica cluster, then fail one replica. Identify the remaining copy of
   the workload and explain the availability benefit. Check that adding a
   replica does not split a query's required state into smaller shards.
3. **What must be rebuilt?** — restart a replica maintaining a materialized
   view and indexes. Sort durable results, operator state, and indexed rows
   by what persists and what must be rebuilt. Identify the storage layer and
   existing indexes as hydration inputs; distinguish this from an upstream
   source's initial snapshot.
4. **Will the backlog shrink?** — use an illustrative backlog of 600 changes,
   with 20 arriving per second and capacity to process 30. Predict a
   60-second catch-up under these fixed-rate assumptions, then raise arrivals
   above capacity. Explain why being online alone does not imply recovery
   and choose an intervention that makes processing exceed incoming work.
5. **Optional extension: fit the recovery peak** — compare a resource budget
   that fits steady state with a supplied hydration profile that exceeds it.
   Diagnose repeated memory failures during restart and choose a larger
   recovery budget or reduced state requirements. Treat the profile as an
   illustrative fixture, not a universal memory multiplier.

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

### Exercises

1. **Start with the right baseline** — connect an empty client to a nonempty
   relation, once with a snapshot and once with `SNAPSHOT = false`. Reconstruct
   its state and explain why changes alone cannot recover untouched rows.
2. **Apply copies, not message counts** — replay inserts, a `+3` multiplicity,
   a partial retraction, and a value replacement into a client-side relation.
   Check client state against the server after complete timestamps.
3. **A fetch ends halfway through an update** — split one timestamp's
   retraction and insertion across network batches. Buffer the changes until
   completeness is established, then render. Check that a fetch boundary is
   not a timestamp boundary and that progress at time T completes times
   strictly below T.
4. **Choose a bounded slice** — assuming retained history is available, use
   `AS OF 10` and `UP TO 13` on a supplied update trace. With snapshots enabled,
   identify the initial state emitted at 10 and subsequent changes before 13.
   Disable the snapshot and check that only changes strictly after 10 and
   before 13 remain; updates at 10 are not replayed separately.
5. **Optional extension: recover a disconnected client** — disconnect after
   a completed timestamp, save client state atomically with its progress
   checkpoint, and resume using retained history. Account for the start-time
   exclusion when snapshots are disabled. Then move the checkpoint beyond
   available history and choose fresh snapshot recovery. Check for gaps and
   duplicate application, and label history-retention feature availability.

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

### Exercises

1. **Publish an existing relation** — attach a Kafka sink to a populated
   product-stock result. Compare including the initial snapshot with exporting
   only subsequent changes. Choose the behavior needed to initialize an
   empty downstream catalog.
2. **Translate a changing row** — insert, update, and delete one stock row at
   distinct logical timestamps. Predict the messages for upsert and Debezium
   envelopes. Explain how each represents replacement and deletion using
   format-correct fixtures.
3. **Choose a key that identifies the output** — export inventory per product
   and warehouse. Test `product_id` alone versus `(product_id, warehouse_id)`
   and identify conflicting output rows. Check that declaring a key with
   `NOT ENFORCED` does not repair a non-unique result.
4. **Do not invent a cross-partition order** — follow updates for two keys
   assigned to different Kafka partitions. Reconstruct each key from its
   ordered history and reject assumptions of one global delivery order.
   Explain why an application invariant spanning keys needs additional care.
5. **Optional extension: crash after the side effect** — interrupt a consumer
   after applying an external action but before committing its offset. Replay
   the message and design idempotent processing. Explain the distinction
   between Materialize's Kafka production guarantee and the consumer's
   responsibility for its effects and checkpoints.

### Final challenge

Design a Kafka export of product stock per warehouse. Choose its key, envelope,
and initial snapshot behavior; predict its update and deletion messages; and
explain where downstream processing guarantees require consumer cooperation.
Use consumer crash recovery as the optional advanced variant.

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

### Exercises

1. **Stop when nothing changes** — start with a short directed chain and a
   supplied reachability definition using `UNION`. Predict the newly
   reachable pairs at each iteration, then identify the fixed point. Check
   that completion means unchanged collections, not visiting every node once.
2. **Remove one of two routes** — build a diamond-shaped graph with two paths
   from A to D. Remove one edge, then remove the remaining route. Predict
   which reachability pairs retract and explain why A can still reach D
   after the first removal.
3. **Introduce a cycle** — compare the same cyclic reachability fixture under
   `UNION` and `UNION ALL`. Explain why eliminating duplicate pairs allows
   this finite graph example to converge, while counting repeated walks can
   grow without bound. Use a recursion-limit error as a safeguard rather
   than accepting truncated computation as the complete answer.
4. **Move the bridge** — compare an edge change near a leaf with a bridge
   change connecting two large regions of a graph. Predict the relative
   number of affected reachability pairs before running the simulation.
   Check that a small input update can cause a large recursive change.

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
- [Kafka sources: current syntax](https://materialize.com/docs/sql/create-source/kafka-v2/)
- [Views](https://materialize.com/docs/fundamentals/concepts/views/)
- [Indexes](https://materialize.com/docs/fundamentals/concepts/indexes/)
- [Arrangements](https://materialize.com/docs/fundamentals/concepts/arrangements/)
- [Temporal filters](https://materialize.com/docs/transform-data/patterns/temporal-filters/)
- [`SUBSCRIBE`](https://materialize.com/docs/sql/subscribe/)
- [Durable subscriptions](https://materialize.com/docs/serve-results/durable-subscriptions/)
- [Freshness troubleshooting](https://materialize.com/docs/transform-data/freshness-troubleshooting/)
- [Freshness and query latency](https://materialize.com/docs/fundamentals/concepts/reaction-time/)
- [Query optimization](https://materialize.com/docs/transform-data/optimization/)
- [Clusters](https://materialize.com/docs/fundamentals/concepts/clusters/)
- [Hydration](https://materialize.com/docs/fundamentals/concepts/hydration/)
- [Isolation levels](https://materialize.com/docs/serve-results/isolation-level/)
- [Kafka sink delivery and envelopes](https://materialize.com/docs/sql/create-sink/kafka/)
- [Recursive CTEs](https://materialize.com/docs/sql/select/recursive-ctes/)
