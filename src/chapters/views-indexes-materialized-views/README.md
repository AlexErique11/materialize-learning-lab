# Views, Indexes, and Materialized Views

Three lectures develop one evolving flow graph: save SQL, run a
query, add a local index, update input, then introduce durable output and a second
serving cluster. Two exercises contain eight checkpoints and end with a complete
shared-serving design. The final challenge starts with an unsolved new fixture.

Guided runs start with explanation-only concept pages before prediction/reveal.
Lecture 1 introduces the input/query, regular views, clusters, indexes and durable
output; Lecture 2 explains materialized views and storage versus memory; Lecture 3
explains intermediate views and serving requirements. These pages keep the initial
diagram unchanged. Back, close and restart work across the introduction/action
boundary; introductions never create objects or count as scenario changes.

`ObjectQueryControls` supplies the responsive query-controls row to lectures.
Lecture 1 reserves it invisibly and inertly.
Both exercises reuse `FlowGraph`, with the diagram, question and answers visible
together. Exercise spacing removes the lecture-only scenario and query controls
and compacts the graph vertically while retaining its panel columns and table rows.
Narrow windows use a panel selector above the selected reference table, with the
question always below it. The navigation footer reserves its space and matches the
earlier exercises' bottom-right controls. The exercise route disables page scrolling.

Guided prose and examples use explicit `LessonTextContent` references. Order IDs
and regular-view names use purple, regions and materialized-view references use
teal, amounts/revenue use amber, and indexes/cluster references use green. Graph
table values use the same field colors; headers stay neutral. The
`object-lesson-text` wrapper also scopes these colors inside the shared spotlight.

`scenario.ts` owns lectures and reference SQL; `resources.ts` owns official links;
`exercise-scenarios.ts` owns requirements, hints, distractors and exact-set grading.
`simulation.ts` derives grouped revenue and query paths. The current input/setup
drives every maintained-result panel. Query observations are separately captured
and explicitly labeled: an already-returned query result does not refresh itself.

`FlowGraph` is shared between lectures and exercises. Its HTML cards show saved
definitions, input, serving-cluster compute and memory, a separate Transform
cluster, and external durable output. `flowGraphModel.ts` derives maintenance,
definition and query-read edges from the supplied simulation snapshot. SVG
connectors anchor to the actual card bounds and adapt to resizing. The graph
does not advance the simulation or infer a physical execution plan.

Purple solid arrows show maintenance, teal dashed arrows show query reads and
returned results, and muted dotted links connect definitions to compute. Result
tables always use the current fixture; the last-query inspector retains its own
captured rows. The query strip reserves its populated height before any query
runs so the shared lecture frame does not shift the graph when the first answer
appears. Node headings expose explanations through keyboard-operable buttons.
Narrow windows combine a compact graph overview with one readable detail panel;
guided steps automatically select their target. Reduced motion disables row
animations and uses a static tint. `ChapterLecture` composes
`LectureScreen` without-tip and the shared `useLectureRun`/`Spotlight` flow.
`ChapterExercise` uses `ExerciseFrame` and `useExerciseStages`. Follow
[UI_LAYOUTS.md](../../../UI_LAYOUTS.md) for shared ownership and templates.

Compact graph spacing starts at 880px viewport height, including laptop windows
just above 800px. At widths up to 1150px, the overview/detail layout leaves room
for wrapped shared controls. Short windows reduce secondary graph navigation
while retaining lecture tables, query controls and playback buttons without page scrolling.

## Semantic verification — 2026-10-15

- [Views](https://materialize.com/docs/fundamentals/concepts/views/): regular views
  store definitions; indexed views maintain cluster-local memory results;
  materialized views persist maintained output accessible across clusters.
- [Indexes](https://materialize.com/docs/fundamentals/concepts/indexes/): indexes
  maintain full rows, not keys/pointers. Indexes on materialized views make
  already-maintained output local without repeating the original transformation.
- [CREATE VIEW](https://materialize.com/docs/sql/create-view/),
  [CREATE INDEX](https://materialize.com/docs/sql/create-index/),
  [CREATE MATERIALIZED VIEW](https://materialize.com/docs/sql/create-materialized-view/)
  verify the displayed SQL and IN CLUSTER syntax.
- [DROP INDEX](https://materialize.com/docs/sql/drop-index/): remove the index;
  the underlying view/materialized view remains. No dependent objects are modeled.
- [SELECT](https://materialize.com/docs/sql/select/): grouped revenue reference.

The SQL panel includes an orders fixture to run independently in a fresh schema,
with already-existing transform/serving_a/serving_b clusters and object-creation
permissions. These SQL cluster names map to Transform/A/B in the graph. All used features are stable;
preview replacement/retention features are excluded. Lecture 3 contrasts separate
deployment choices; it does not claim to convert a regular view into a materialized
view. Its reference script explicitly drops the first design's index before
creating the shared-output design, then runs the final order correction and query.
SQL building-block views need not be separately materialized, but a final
maintained dataflow can still retain intermediate state. Each serving index also
requires its own memory and maintenance.

## Educational limits

Steps are completed scenario actions, not logical timestamps or timing claims.
Canonical snapshots omit ingestion delay, hydration and asynchronous maintenance;
no latest-upstream-data guarantee is taught. Query routes illustrate this fixture
with no alternate indexes; they are not a physical optimizer plan or guaranteed
latency. Durable output does not eliminate transform memory or hydration.
Displayed row order is illustrative, not a promise from SELECT without ORDER BY.

Simulation tests execute the displayed plain and stacked SELECTs independently
in SQLite, including negative amounts filtered by order_enriched, zero values,
duplicate inputs, empty groups and empty input. They also check local-versus-remote
paths, index removal, past observations, grading and final state. SQLite checks
ordinary SELECT semantics; Materialize-specific DDL/storage claims are checked
against the official documentation, not a live Materialize instance.
Browser journeys cover guided predictions, exploration, history, exercise retries,
reveal/reset/completion, both themes, keyboard access and viewport geometry.
Exercise workspaces stretch to the available canvas height so answer explanations
cannot recenter the diagram or move its tables.
`ObjectExerciseWorkspace` briefly measures an inert, hidden copy of the real
lecture frame, then removes it. Canvas and panel positions, dimensions, padding
and table spacing match the lectures. The complete diagram is raised by up to
55px, limited by clearance beneath the heading and controls. Questions use a
separate anchor 5px below the unshifted lecture canvas bottom. The reference is refreshed on
window or sidebar resize; assessment feedback cannot shift the diagram.
Questions stay below the canvas, with compact inline headings and a selection
dialog when there is insufficient space for the full answer list. Single-answer
questions use radios; multiple-answer questions use checkboxes. Hidden measurement
copies remove input names so they cannot alter the learner's radio selections.
Each checkpoint reserves the tallest question, hint and grading message before
choosing its layout. Top-aligned copy and controls therefore remain fixed when
revealing an answer or displaying feedback.
Accepted selections can still be reviewed in that dialog. Query observations
occupy the space above the diagram. The Next question footer retains its existing
page position, and exercise routes retain their scroll lock.
