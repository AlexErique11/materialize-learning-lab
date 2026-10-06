# Incremental Maintenance

## Lecture 1: Filters and projections

Lecture 1 follows an orders relation through `WHERE amount >= 50` and
`SELECT order_id, amount`. Five complete timestamp batches demonstrate filter
entry, an unused-column edit, filter exit, a qualifying amount replacement,
and deletion. The initial fixture contains three orders; the exact threshold
qualifies.

`scenario.ts` owns fixtures and explanations. `simulation.ts` derives snapshots
and signed changes, consolidating equal projected rows. The diagram is a
logical teaching model, not Materialize's physical execution plan. Snapshot
reconstruction is deterministic; no performance counts or measured execution
claims are presented. Domain tests independently apply result diffs and compare
them with recomputing the query after every timestamp.

References checked for this implementation:

- https://materialize.com/docs/sql/select/ — WHERE selects rows and SELECT
  chooses output columns; ALL is the default.
- https://materialize.com/docs/fundamentals/concepts/views/ — indexes on views
  and materialized views incrementally maintain results as inputs change.
- https://materialize.com/docs/sql/subscribe/#output — signed result updates.

Playback uses the shared `labs/useLectureRun.ts` reducer. Guided completion is
separate from applying changes. The lecture on aggregates and Chapter 2
exercises are intentionally not registered until implemented.

The workspace keeps the Orders → Filter → Projection dataflow and three tables,
using Chapter 1's typography, metric cards, panel borders, and controls. Each
stage shows its own signed changes; projection compares raw and consolidated
diffs side by side. Supporting explanations live in the guided run and
SQL & Objectives. Do not scale the page to fit.

## Lecture 2: Joins

`join-scenario.ts` defines a four-batch Orders + Products inner join scenario:
an unmatched order, its late product, a product-name update with two matches,
and product deletion. `join-simulation.ts` propagates signed changes from the
changed input against the retained other input. Tests compare those deltas
with independently recomputed results. Unmatched orders remain retained.

`LectureTwo.tsx` reuses the lecture shell, playback reducer, spotlight, metric
cards and panels. Matching keys are tinted for the current batch. Mobile
selectors expose one input/result and its rows or diffs at a time; desktop
shows all three panels. No measured performance or physical-plan claims.

Tables reserve their maximum scenario row count with empty cells and fixed
column widths. Empty rows are excluded from accessible data. The Changes
tracker follows the displayed timestamp, including history navigation; applied
timestamps remain separately tracked for playback. The shared Chapter 1 tip
is shown only when the current content leaves enough viewport space. On desktop,
Lecture 2 shows FROM, INNER JOIN and ON beneath the panel headings, connected
with a plus and an arrow; mobile uses panel selectors.

All three panels reserve their full table and diff footprint so changes and
history navigation never resize them. `RowDiffs.tsx` renders complete rows as
inline tuples beside Chapter 1's signed badges. Matching old/new rows emphasize
only changed fields; inserts and deletions emphasize the full row. Projection
shows only selected columns. Both lectures share Chapter 1's
Current logical timestamp help and Return to latest history action. On short
desktop screens the introductory subtitle is omitted to keep controls visible.

Guided runs show each change in its input table before moving to its downstream
effect at the same timestamp. The join introduction visits Orders and Products
before the result, so product IDs are visible alongside their names. Mobile
panel selection follows these same steps automatically.

Join semantics were checked against https://materialize.com/docs/sql/select/join/
and retained-input behavior against
https://materialize.com/docs/fundamentals/concepts/arrangements/.

## Correctness audit (2026-10-06)

Both implemented lectures were reviewed against the SELECT, JOIN, SUBSCRIBE,
views, and arrangements references above. `sql-correctness.test.ts` executes
the SELECT text displayed in SQL & Objectives using Node's built-in SQLite,
then compares every snapshot and its signed batch with the simulation. This
independently checks ordinary SQL semantics; it is not a live Materialize test.

The fixtures use unique order/product IDs and non-null amounts and join keys.
They illustrate one changed input per timestamp; they are not a general engine
for nullable keys, duplicate IDs, or simultaneous changes to both join inputs.
Ordinary SELECT preserves duplicate row copies. Cancellation combines opposite
diffs for an identical full output row at the same timestamp, not DISTINCT.

Each lecture starts from its own initial state. The small timestamp numbers
label complete simulated batches, not wall-clock seconds. Initial rows are
excluded from the subsequent-change diff panels; a real SUBSCRIBE includes an
initial snapshot by default. Table order is illustrative: the reference queries
do not specify ORDER BY. No physical-plan, latency, or memory-size claim is made.
