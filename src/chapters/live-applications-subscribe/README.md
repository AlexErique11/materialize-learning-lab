# Chapter 8: SUBSCRIBE

Three lectures and three exercises use the selected **Timestamp trays** design.
The canonical commerce fixture follows an initial snapshot, an aggregate
replacement, quiet progress, group removal, an empty result, and disconnect.

## Implementation map

- `simulation.ts` owns immutable receipt, signed full-row consolidation, pending
  changes, completeness knowledge, progress-only publication, and authored fixtures.
- `lecture-scenarios.ts` authors 24 guided checkpoints across the three lectures.
  Manual playback skips explanation-only checkpoints. Named comparisons establish
  their own baseline before prediction and label the separate replay explicitly.
  They do not imply a real stream moves backwards. Related evidence uses the shared
  grouped spotlight with sequential inspection when the regions cannot fit together.
- `exercise-scenarios.ts` authors 4/5/7 questions, exact accepted answers, hints,
  explanations, and before/after states. The final exercise is the chapter challenge.
- `TimestampTrays.tsx` renders the same two tray slots, divider, native history
  selectors, and application table in all six activities. The Diagram key is
  available in lectures; exercises always show the diagram without a toggle.
- `SubscribeLecture.tsx` composes `LectureScreen`, `useLectureRun`, `Spotlight`,
  guided focus, prediction/reveal, and the established playback controls.
- `SubscribeExercisePage.tsx` composes `ExerciseFrame`, `LectureWorkspace`,
  `useExerciseStages`, and the shared completion provider. No separate page frame.
- `resources.ts`, `lessonText.ts`, and `chapter.css` own reference SQL, objectives,
  term styling, and chapter-local visual arrangements. Shared layout ownership is
  recorded in `UI_LAYOUTS.md`; learning scope is in `CHAPTER_8_PLAN.md`.

## Semantics and fixture limits

Data and progress timestamps are nondecreasing. Receiving either at T proves
times strictly below T complete; equality stays open. The client deliberately
publishes on explicit progress, so a complete-but-unpublished group can be visible.
`knownCompleteBefore` and `publishedBefore` are separate model values.

The first P(10) establishes the subscription start, not snapshot completion.
P(11) completes and publishes the initial snapshot. At 12 the old EU aggregate
is retracted and its replacement inserted; neither P(12) nor the apparent pair
closes 12. P(13) does. Quiet P(14) advances evidence without inventing row changes.
P(16) publishes the removal of US; P(19) produces a ready empty result.

The default snapshot initializes a complete baseline. The named snapshot-off
fixture has no baseline and cannot claim a correct reconstructed result. Its
received signed residuals may include negative counts and are never displayed
as a ready relation. An independently fetched SELECT requires a coordinated handoff.

Full tuple identity includes region, order count, and total. A result row is not
a region-only overwrite instruction. A named `row_copies` fixture demonstrates
multiplicity separately from the grouped query. Complete valid baseline-backed
results cannot have negative multiplicities. All authored trays reserve two rows;
the display is a received-history view, not a prediction of future rows.

A disconnect retains the last published result and all pending evidence, marking
the display stale. No SQL executes; connection state is illustrative. Logical-time
progress is not end-to-end external freshness. FETCH batches, timeouts, playback
indices, and logical timestamps are different. Durable replay, retained history,
and atomic external checkpoints remain advanced material.

## Presentation and validation

Lectures and exercises share the tray, boundary, and application components.
The lecture status area shows the Materialize result, live subscription, and
application as three equally sized icon cards with centered arrows. Exercises
keep the question below this lecture diagram in a centered workspace. The question
copy and compact answer controls share a row on tablet and desktop screens;
numeric inputs and result selectors have bounded widths. Fields in each row
align at their lower edge when labels wrap. Long result choices span the answer
area; three-part questions place their two numeric fields above the result choice.
Compact tuple labels follow the tables' region/orders/total order. Question boxes
use modest minimum padding while a shared slot reserves feedback room. Incorrect
feedback uses the question's conceptual hint and preserves all entries.
Short, narrow laptop windows replace
the repeated summary strip with a source label to preserve room for the question.
Startup copy explains
the snapshot before progress arrives. A publication connector leads from the
completed tray into the app and remains visible in compact layouts. Stacked trays
route it around the pending tray. History pickers appear only with multiple groups.
Lectures place received-record evidence directly below the tables, above playback,
with a noninteractive information icon. Diff, Copies, and both boundaries reuse
the shared animated hover/focus/touch help; the Diagram key icon previews the key
while its text button opens the full reference. Inspecting help pauses playback.
The application consistently labels its published-before boundary, including when
the retained display is stale after disconnect. A short,
continuous publication connector uses the same aligned endpoints in lectures and exercises.
The same order is used on phones.
On desktop viewports the application label sits beside its
table; short screens omit redundant footer copy to preserve question and navigation
space. On phones lecture trays stack and the divider becomes horizontal;
exercise trays stay side by side from 480px, and use the same stacked flow below
480px so column labels remain readable. The diagram stays above the question,
with a source label replacing the summary strip. Very narrow or short
windows retain normal document flow so essential content is never clipped.
Short landscape windows reuse compact phone guide typography and spacing so
long explanations stay separate from their highlighted evidence.

`simulation.test.ts` checks boundary equality, full-row replacement in either
arrival order, copy counts, quiet progress, later-data evidence, missing baselines,
disconnect, empty results, and immutable replay. `content.test.ts` checks routing,
script derivation, grading, and missing/incorrect evidence. Browser coverage lives
in `tests/e2e/chapter-eight.spec.ts` and exercises guided flow, actual answers,
keyboard and playback, help pause, history selection, and responsive consistency.

Chapter completion uses the same numbered topic cards, illustration dimensions,
and return navigation as the other chapters. The SVG overview has a raster copy
for link previews. SQL references follow the selected relation and snapshot setting;
the separate `row_copies` example never displays the grouped order query.

Official SUBSCRIBE output, snapshot, progress, and cursor references were checked
on 2026-10-26. Recheck documentation before changing protocol semantics or adding
recovery features. No new runtime dependency or generated image is required.
