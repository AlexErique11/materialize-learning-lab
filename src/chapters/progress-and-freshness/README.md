# Chapter 6: Progress and Freshness

Three lectures and three exercises implement the Chapter 6 curriculum using
aligned input and output progress lanes. The selected concept is the join's
actual frontier versus the limit permitted by its inputs. Exercises reuse the
same diagram rather than a separate dashboard design.

## Implementation map

- `simulation.ts`: immutable actions, frontier constraints, input limits, lag
  measurements, and explicitly sequenced reaction-time examples.
- `lecture-scenarios.ts`: three deterministic lecture traces with explanations,
  prediction prompts, named spotlight targets, and explicit independent fixtures.
- `exercise-scenarios.ts`: 13 questions across boundary evidence, join progress,
  and three dashboard diagnoses; exact answer sets and misconception feedback.
- `ProgressLanes.tsx`: stage headers, exercise evidence, accessible HTML lanes,
  marker legend, and selected-object evidence. One scale positions every marker.
- `ProgressLecture.tsx`: shared `LectureScreen` without-tip frame, `useLectureRun`,
  `Spotlight`, prediction/reveal, playback, and controls-tour pause behavior.
- `ProgressExercisePage.tsx`: shared `ExerciseFrame`, `useExerciseStages`, native
  answers, hint/show-answer/reset, and completion navigation to Chapter 7.
- `ProgressExerciseWorkspace.tsx`: exact lecture diagram geometry and
  bounded placement of the prompt, evidence and answers without scrolling.
- `resources.ts`: objective, reference SQL, and official documentation links.
- `lessonText.ts`: chapter vocabulary annotations for the shared `LessonText`
  renderer. Objects and measurements keep the same inline colors in guided
  predictions, explanations, exercise prompts, hints, answers, and evidence.
- `LagLegend.tsx`: always-visible Lecture 3 values for source, inherited, local,
  global and wall-clock lag, computed for Revenue in the displayed snapshot.
- `chapter.css`: chapter-owned visualization and compact arrangements only.

## Semantics and teaching

A frontier F completes times strictly below F. Seeing a high timestamp is not a
completeness guarantee. Progress-only reports require no new business rows. A
stationary frontier alone does not diagnose its cause. Business event time is
different from the change's logical timestamp.

Observed changes are retained per lane as teaching history. A later observation
does not replace the earlier diamond, and advancing a frontier does not erase
diamonds. Changes at the same logical time share a marker with a multiplicity
label such as ×2. Rewind, Reset, and explicit new fixtures restore the appropriate
history rather than accumulating events across replays.

The direct scalar two-input join fixture has input limit min(Orders, Payments).
Input advancement never automatically processes the join. Output completion
cannot exceed its input limit; individual changes may still be processed at open
times. Frontier gaps are logical-time distances, not measured row counts.

Lectures 1–2 use arbitrary logical integers. Lecture 3 explicitly introduces a
wall-clock-aligned fixture displayed in seconds; only then does the model expose
wall-clock lag. Local plus inherited lag gives global materialization lag. Source
delay to the clock is separate. Query duration is independent of these frontiers.
Timing examples explicitly start a query when a result is ready before adding
freshness delay and query latency. The exercise hides those computed durations
until its prediction is accepted.

Scenario step numbers are not logical timestamps. The shared playback hook indexes
actions; snapshots own domain timestamps. Independent diagnostic fixtures are
labeled as new incidents rather than backwards progress within one incident.
Counts, clocks, and processing are illustrative. No SQL is executed and no external
connection is required. Read frontiers, isolation policies, compaction, recovery,
and subscription buffering remain in later chapters.

## Presentation and assessment

Existing shared templates own title, toolbar, upper actions, Controls tour, and
playback positions. Chapter CSS does not override those positions. Compact lanes
retain the relationship between all inputs and output, while stage buttons choose
the detail. Both themes use common tokens; marker shapes and explicit text
duplicate color meaning. Guides spotlight actual lanes or the evidence section.
Revealed observation and join-progress checkpoints also expose their evidence
panel. A checkpoint can specify the evidence relation separately from its source
lane, so inspecting a changed input limit keeps Paid orders' gap and limiter
visible without applying another action or changing the reserved panel size.

All lanes use the same row dimensions. Lectures 1–2 omit the fourth row inside
the box and retain equivalent space outside it, so introducing Revenue does not
move the shared surrounding content. Lectures have no metric cards or Metrics
popup. Stage selectors use simple icon-and-title headers with a subtle active
underline; subtitles appear when space permits. Clock values are in the diagram
key, alongside the existing frontier and lag information. Phone subtitles reserve
two lines up to 480px wide. The compact lag
legend uses one line when space permits, matching the normal caption footprint.
Exercises retain every relevant lane with the same dimensions and spacing as lectures.

Object references use purple for Orders, teal for Payments, blue for Paid orders,
and amber for Revenue, matching their lane labels. Actual frontiers and logical
time use purple; input limits and local lag use amber; observations and inherited
lag use teal; event time and query latency use blue; reaction time uses green.
The text and marker shapes still carry the meaning independently of color.
Annotations use existing inline-reference styling, with theme-aware colors and
plain colored text in compact evidence panels and answer choices.

The legend's (?) button opens the Diagram key, defining the purple completion
boundary, green completed range, observed-change diamonds, orange input limit,
orange pending-processing range, and optional wall clock. Coincident input and
actual frontiers share one centered marker and timestamp, retaining the orange
outline around the purple circle. Opening
the key pauses lecture playback. Compact exercises keep the Key
control available even when the rest of the legend is condensed. Only this icon
is interactive; its animated tooltip previews the key on hover or keyboard focus.

Normal playback visits state-changing actions only (six in Lecture 1), with an
action explanation in the selected lane's detail panel and emphasis on affected
lanes. Guided runs cover 27 teaching checkpoints. Both modes use the existing
playback controls; Lectures 1–2 count actions, not logical timestamps.
Lecture headers also select a relation inspector backed by `relation-details.ts`.
Sources show actual report history, observed changes and clock lag when available;
Paid orders shows the input limit, limiting sources, processing gap and sampled
backlog; Revenue separates local, inherited, source and total delay. Interpretations
use the displayed snapshot, including each independent diagnosis, and never apply
an action. The source-status sample belongs to Payments. End-to-end journey
durations are not presented as measured per-source or per-operator durations.
The inspector reserves the same space across selections, supports keyboard
scrolling for longer explanations, and resets its scroll position when selection
or the scenario changes. Exercises retain their compact evidence strip.
Bands and boundaries update together without position transitions so loading,
rewind and catch-up never show mismatched progress. The observation arrival
effect respects reduced-motion preferences and never fades away history.

Lecture 3 starts with the stalled-source incident at Step 1 of 4, followed by
computation delay, slow queries, and reaction time. Next change / Previous change
controls stay in the existing playback positions. The evidence heading identifies
the selected relation. The existing caption space holds a two-line Revenue lag
legend with all five values and the independent case's step identity. Hover descriptions and the
existing Diagram key explain each lag and its formula. There is no separate lag
popup or extra panel shifting the layout. Fixture replacements
do not highlight differences from the previous incident as progress changes.
Case identity follows the displayed snapshot during guided predictions, rewind,
reset and autoplay, without moving the shared controls.

Exercises use `ExerciseFrame` with full-width lanes and permanent prompt/answer
regions. There is no question/diagram toggle. The workspace briefly measures an
inert, hidden instance of the matching lecture in the same page container, then
removes it. This reuses the actual responsive frame rather than estimating its
diagram offset. The exercise shares the lecture's complete diagram geometry,
including panel edges, padding, axis, lane heights, tracks and legend.
On roomy screens the question stays below the diagram. When necessary, the prompt
uses the upper whitespace and the answers stay below; evidence uses whichever
region fits. Placement checks all region bounds against the navigation footer.
Frontier values stay on their lanes; clock, query duration and additional evidence
share one compact strip below the diagram. The normal exercise navigation inset reserves
the footer. Reference positions are measured only on entry and window resize, so
hints, errors and accepted answers cannot recenter the lanes.
Lectures and exercises share the same stage headers without metric cards. Exercise
headers sit above the fixed diagram; short screens use compact header padding.
Three-row boxes are one row shorter. Lectures keep the omitted row as outside
spacing. Desktop exercises remove that spacer, leaving 36px between the actual
diagram and the evidence strip in Exercises 1–2 and 24px in Exercise 3, then 8px
before the question. The complete metric group reserves at least 48px below the
heading when needed; its internal header gap,
lane dimensions and navigation stay unchanged. Tight frames reduce the gaps to fit.
Compact exercises use native selects for single answers, checkboxes for multiple
answers, and one row of numeric fields for timing questions. In the shortest
windows, answers dock beside the navigation button; multiple-choice selections
use a checkbox dialog. Short legends retain full accessible field names.
Evidence may occupy the unused left side of a wide legend row. The axis, markers,
color vocabulary and Diagram key are shared with lectures. Internal diagram
geometry has no exercise-only overrides.

Exercise routes explicitly clip document scrolling and disable overscroll;
leaving the exercise removes that rule automatically. Wheel and PageDown checks
verify actual scroll position, alongside visibility and fitting checks. In short
tablet windows, the compact header omits duplicate breadcrumbs and subtitle;
diagram evidence appears above the question so both fit without clipping
the answer fields or footer.

Exercise 1 has four questions. Exercise 2 has five continuous predictions; a wrong
answer does not apply the proposed action. Exercise 3 has three independent cases
requiring both stage and evidence plus one timing question. Hint preserves inputs;
Show Answer accepts the complete solution. Completion uses the shared dialog.

## Verification

`simulation.test.ts` covers semantic boundaries, deterministic replay, actual
versus permitted progress, exact evidence sets, numeric parsing, and lag/timing.
`tests/e2e/chapter-six.spec.ts` covers all guides and exercises and compares
control/playback geometry with Chapter 2 across desktop, laptop, tablet and phone.

Official references checked on 2026-10-19:

- https://materialize.com/docs/transform-data/freshness-troubleshooting/
- https://materialize.com/docs/fundamentals/concepts/reaction-time/

Diagnostic SQL uses `mz_internal.mz_frontiers` and
`mz_internal.mz_materialization_lag`, with object IDs explained in the reference.
These views require a real deployment and maintained objects; the lab simulates
their conceptual measurements rather than claiming to query them.
