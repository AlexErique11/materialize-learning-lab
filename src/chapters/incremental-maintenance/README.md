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
separate from applying changes. Exercises use explicit checkpoint advancement.

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

All lecture tables reserve four rows with empty cells and fixed column widths. Empty rows are excluded from accessible data. The Changes
tracker follows the displayed timestamp, including history navigation; applied
timestamps remain separately tracked for playback. The shared Chapter 1 tip
is shown only when the current content leaves enough viewport space. On desktop,
Lectures 2 and 3 use the numbered stage buttons and SQL labels from Lecture 1.
Orders + Products leads to the joined result, with INNER JOIN and ON displayed
in the stage headers. Aggregation uses arrows through GROUP BY to COUNT/SUM.
Desktop help sits beside the stage names; mobile keeps the named panel headings
and selectors. Full SQL stays in SQL & Objectives.

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

## Lecture 3: Aggregations (verified 2026-10-06)

LectureThree.tsx shows Orders, logical group-state cards, and revenue by product.
aggregate-scenario.ts defines amount correction, last-order cancellation, a key
change, zero revenue, and final cancellation. aggregate-simulation.ts maintains
count and sum from signed input contributions, touching only affected keys. The
shared MaintenanceLecture presentation preserves Lecture 2 playback, spotlight,
history, SQL reference and mobile selectors without duplicating that workflow.

Verified against current official references:
- https://materialize.com/docs/sql/select/ (GROUP BY and maintained intermediate state)
- https://materialize.com/docs/sql/functions/#aggregate-functions (count and sum)
- https://materialize.com/docs/sql/subscribe/#output (full-row multiplicity changes)

These are stable SQL features, with no preview dependency. The query uses
GROUP BY, no join or filter, unique order IDs and non-null integer amounts.
An absent group emits no invented zero row; a present zero-sum group remains.
A key edit affects both old and new groups. A revenue delta is distinct from the
multiplicity of a complete result row. Initial snapshots and row ordering follow
the same limitations documented above. Cards model sufficient logical count/sum
state for this fixture, not actual operator layout, memory or measured work.

aggregate-simulation.test.ts independently executes the displayed SELECT with
SQLite and compares every snapshot and complete signed batch. It checks ordinary
SQL semantics, not a live Materialize connection. Browser coverage checks guided
predictions, history/reset, keyboard focus, both themes and viewport fit.

## Lecture 4: Recompute or maintain

Lecture 4, Recompute or maintain, uses the same query as Lecture 3 with six orders
and three groups. Its shared input strip feeds two independent comparison panels:
recomputed totals and retained totals, each with the same result table. The
comparison layout reuses MaintenanceLecture, Table, RelationHelp, playback,
history, reset, and guided prediction/reveal controls. Existing lecture geometry
is unchanged; the comparison has its own panel arrangement and mobile selectors.
Lecture 4 omits the row-count metric cards. Its timestamp is integrated into the
shared-orders selector so it remains visible when mobile users select either
method. Shared orders are centered above recomputation on the left and maintenance
on the right. Method titles are integrated into their panels; work counters sit
above each query result, without duplicate group-summary cards.
Purple branching arrows connect the shared input to both methods. Arrows light
only when the displayed batch changes the destination result tables, and remain
dim during guided predictions. An unused-note edit leaves both arrows dim.
The comparison omits the bottom tip and uses Chapter 1's panel-heading styling.

comparison-simulation.ts reuses contributeToGroup from aggregate-simulation.ts
and independently rebuilds results to compare the two methods. Amount correction,
key movement, an unused-note edit, and a broad six-order batch demonstrate local,
multi-group, cancelled, and widespread effects. Counts measure signed aggregate
contributions after projection/consolidation and group keys updated in these
illustrative algorithms. They exclude source processing, lookups, storage, and
result emission, and are not Materialize performance measurements.

Semantics were checked against the SELECT, aggregate-function, and arrangements
references already linked above and
https://materialize.com/docs/fundamentals/concepts/arrangements/ (initial
computation followed by incremental dataflow updates and retained state).
comparison-simulation.test.ts compares both algorithms with the displayed SQL
in SQLite and checks reuse, cancellation, two-key edits, and broad-batch counts.

## Shared Chapter 2 layout

All four lectures use MaintenanceLecture.tsx for metrics, numbered stage
headers, panels, help, playback and guided runs. lecture-one.css owns common
panel/table heights, padding, workspace gaps and diff spacing at each breakpoint.
Lecture-specific styles only add matching highlights, mobile panel selection
and the aggregation or comparison visualization. Desktop names and help live in the stage
headers; mobile also shows the active panel heading.

chapter-two-consistency.spec.ts compares panel width, height, padding, gaps,
stage-header height and panel position across all three pages and every playback
state at desktop, laptop and mobile sizes. Existing lecture checks cover guided
flow, both themes, keyboard focus and viewport fit.

## Exercises (verified 2026-10-06)

Two continuous scenarios contain six checkpoints (about 11–15 minutes).
Exercise 1 combines JOIN and WHERE: cross the threshold, match an initially
unmatched order, then predict filtered join fan-out. Exercise 2 combines a
customer join, regional count/revenue aggregation and the recompute/maintain
comparison: correct an amount, move a customer's retained orders between
regions, then remove the final member of a zero-revenue group.

`exercise-scenarios.ts` owns deterministic timestamp states, SQL, questions,
hints, explanations and pure checkbox grading. Answers select complete-row
diffs and affected groups; selection order does not matter. Incorrect answers
preserve the current input state. Check Answer and Show Answer preserve the
question and checkboxes, highlighting correct choices. Next question appears
only after one of those actions and permits advancement after an incorrect
prediction. Exercise 1's last checkpoint links to Exercise 2. Reset clears
answers and graded progress.

`ExerciseFrame` shares Chapter 1 controls and feedback while its inventory
metrics and ledger remain in Chapter 1. `MaintenancePanels` and
`MaintenanceTables` share actual lecture markup and styles. Exercise 2 uses
the reference's shared input above side-by-side recomputation and maintenance
tables, with its question below. All panels and questions remain visible on
desktop and laptop; mobile uses panel selectors while keeping the question
visible. There are no contribution-count questions or signed-row editors.
The legacy exercise-2 URL redirects to Exercise 1; exercise-4 redirects to
Exercise 2 at its preserved exercise-3 URL. Prediction states suppress row
highlights and active comparison connectors. After acceptance, recomputation
highlights every rebuilt row and maintenance highlights affected groups.

Verified against official SELECT, JOIN, SUBSCRIBE and arrangements documentation
linked above. Fixtures use stable SQL features, unique IDs, non-null keys and
integer amounts. Empty groups disappear; present zero-revenue groups remain.
Group counters illustrate rebuilt/updated keys, not measured Materialize work.
They exclude source processing, lookups, state storage and output emission.

`exercise-scenarios.test.ts` independently executes each displayed SQL query in
SQLite and verifies every snapshot and diff reconstruction. This checks ordinary
SQL semantics rather than a live Materialize instance. Browser tests cover manual
answers, incorrect retries, hints, reveal, advancement, reset, highlight suppression,
keyboard controls, themes and desktop/laptop/mobile layouts. Chapter 1 exercises
remain covered by their existing browser tests.
