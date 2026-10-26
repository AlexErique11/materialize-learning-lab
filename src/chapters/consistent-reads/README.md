# Chapter 7: Consistent Reads

Three lectures and three exercises implement the curriculum with one reusable
readable-window diagram. Two input windows share a vertical overlap and a query
cursor; there is no independently advancing third shared frontier.

## Implementation map

- `simulation.ts`: immutable windows, shared interval, illustrative policy
  timestamp selection, sealed request outcomes, pending-read history holds,
  transaction observations, clock-aligned freshness, and external ingestion.
- `lecture-scenarios.ts`: 28 guided checkpoints; `exercise-scenarios.ts`: 15
  questions, hints, before/after fixtures, range-aware grading, and exact evidence sets.
- `ReadableWindow.tsx`: one renderer for all six activities, native time selection,
  accessible descriptions, and the Diagram key, which pauses lecture playback.
- `ConsistentReadsLecture.tsx`: `LectureScreen` without-tip, `useLectureRun`,
  `Spotlight`, shared completion, rewind, autoplay, and prediction/reveal.
  Manual and automatic playback visit only visual changes (6/5/8 per lecture);
  all 28 teaching checkpoints remain available in guided runs. The step counter
  and Previous/Next controls use the visual sequence outside guidance.
  Revealed steps inspect their authored related regions with the shared guided
  focus navigation; inspecting an effect does not advance the scenario.
- `ConsistentReadsExercisePage.tsx`: `ExerciseFrame`, `useExerciseStages`, and
  the same `LectureWorkspace`/diagram. Questions use `afterVisualization`.
  Incorrect answer controls and choice dialogs reference their field-specific
  error descriptions without adding visible feedback rows.
- `resources.ts`, `lessonText.ts`: objective, SQL, documentation, and consistent
  object/measurement references; `chapter.css`: visualization content only.

## Semantics and fixture limits

This scalar single-timeline model immediately serves snapshots in
`[max(retained), min(write))`. Retained equality is inclusive; write equality waits.
An empty overlap offers no complete shared snapshot. Discarded history cannot be
restored by waiting. Compaction does not delete current business rows; a pending
request holds its chosen history, and compaction lessons release completed reads.

The ordering fixture uses one unchanged qualifying row in a table and a maintained
derived result, with T1 completed before T2 starts. Serializable can admit an older
observation in a consistent serial history; strict serializable preserves real-time
ordering and waits in that example. Serializable can also wait without a shared
complete snapshot. Strict targets are explicit illustrative choices, not a model
of the real timestamp oracle or a promise to always choose the current clock.

Clock-aligned fixtures use milliseconds displayed as seconds. The newest complete
millisecond is `min(write)-1`, not one whole second before the frontier. Bounded
reads use a positive snapshot-age ceiling, including equality, and error without
input waiting if no eligible snapshot exists. Completed and failed requests stay
sealed; recovery explicitly issues a new request. Execution duration is separate.

An external write has no logical timestamp before ingestion in this model.
Ingestion, processing, input completion, and snapshot selection are explicit stages.
Strict transaction ordering alone does not imply immediate external visibility.
Real-time recency is optional reference material, currently private preview.

All data and timing are illustrative. Playback steps are not logical timestamps.
Named fixture replacements, reset, and rewind restore state instead of suggesting
frontiers reverse in a continuous execution. No SQL is executed, no deployment
is contacted, and the cursor does not offer arbitrary time-travel SQL.

## Presentation and assessment

All activities reuse one query strip, axis, lane geometry, marker vocabulary, key,
result slot, and responsive rules. Shared templates own headings, controls, help,
and playback/navigation. Layout ownership is recorded in `UI_LAYOUTS.md`.
Laptop exercise viewports of at least 1280×640 with the standard sidebar show the diagram, question, answers,
and navigation together without scrolling or a diagram/question switch. Shared
workspace measurements include the question's height; short laptop spacing is
consistent across activities. Exercises omit repeated captions and supplementary
status lines while keeping the action and required evidence visible.

Exercise 1 has five window questions and accepts every valid integer in the
requested range. Exercise 2 has four ordering/ingestion questions. Exercise 3
is the six-question dashboard stall/recovery challenge. Wrong predictions do not
apply actions. Hints preserve inputs; Show Answer accepts the full solution.
Computed classifications and ages are hidden before acceptance. The chapter
completion dialog returns to the learning path; the curriculum ends at Chapter 7.

`simulation.test.ts` covers boundary equality, empty windows, monotone frontiers,
protected history, policies, sealed outcomes, external stages, deterministic replay,
numeric parsing, and exact evidence sets. `tests/e2e/chapter-seven.spec.ts` walks
every guide and exercise, checks exploration/help/completion, and compares actual
diagram geometry across six activities and seven viewport sizes.

Official references checked on 2026-10-22:

- https://materialize.com/docs/sql/explain-timestamp/
- https://materialize.com/docs/serve-results/isolation-level/

EXPLAIN TIMESTAMP syntax/output are not stable. Recheck syntax and feature
availability when updating references. No new dependency or runtime screenshot
asset is introduced.
