# Chapter 7 implementation plan: Consistent Reads

Status: implementation specification, 2026-10-22. The implementation map and
current model scope are documented in `src/chapters/consistent-reads/README.md`.

## Selected direction and scope

Implement the selected **time aperture / readable window** concept for Chapter 7,
"Consistent Reads — Which Moment Does a Query See?" Follow the learning scope in
[CURRICULUM.md](./CURRICULUM.md), the shared presentation rules in
[UI_LAYOUTS.md](./UI_LAYOUTS.md), and the workflow in
[MAINTAINABILITY.md](./MAINTAINABILITY.md).

Deliver three lectures and three exercises. Exercise 3 is the final challenge.
Use one reusable visualization across all six activities. The snapshot filmstrip,
policy switchboard, and rewind detective previews supply teaching ideas, not
three additional page designs. Generated previews are concept references only;
the actual application templates define the production layout.

| Activity | Main objective | Suggested duration |
| --- | --- | --- |
| Lecture 1: Find a readable moment | Read retained-history and completion boundaries; find one shared snapshot | 8–10 min |
| Lecture 2: Keep reads in order | Separate one-query consistency from ordering between successive transactions | 8–10 min |
| Lecture 3: Choose freshness and waiting | Compare read policies and distinguish an external write from a visible read | 9–11 min |
| Exercise 1: Choose the snapshot | Classify retained, complete, waiting, and too-old times | 6–8 min |
| Exercise 2: Explain the observation | Predict successive reads and explain an upstream write that is not yet visible | 7–9 min |
| Exercise 3: Keep the dashboard within its bound | Choose a read policy and predict behavior through an ingestion stall and recovery | 8–10 min |

## Mandatory template and layout rules

These are implementation requirements and release criteria, not visual suggestions.

1. **Reuse the existing templates.** Every lecture must compose
   `src/labs/components/LectureScreen.tsx` with `layout="without-tip"`, using
   `LectureWorkspace` and `GuidedLabScreen` through their existing interfaces.
   Every exercise must compose `src/components/lab/ExerciseFrame.tsx` and
   `src/hooks/useExerciseStages.ts`. Do not recreate, copy, or approximate their
   title, toolbar, navigation, reference dialog, or playback frame.
2. **Reuse the established controls and behavior.** Use `Button`,
   `SqlObjectivesPanel`, `Spotlight`, `LessonText`, `useGuidedFocus`,
   `useLectureRun`, and the shared walkthrough, completion, and progress behavior.
   Preserve keyboard bindings, control order, variants, focus restoration, and
   disabled states. Integrate with the existing Controls tour.
3. **Shared owners control shared geometry.** `lecture-layout.css`, the shared
   screen components, and `exercise.css` own page padding, title/toolbar position,
   upper controls, playback baseline, and exercise navigation inset. Chapter CSS
   owns only Chapter 7's visualization and its content arrangements. No per-page
   margins, footer offsets, copied frames, or lecture-number-specific fixes.
4. **All lectures share one layout.** At a given viewport and sidebar state,
   equivalent title, subtitle, toolbar, visualization, query-result, legend, and
   playback anchors must align across all three lectures. Use a shared footprint
   for supporting detail so a longer explanation or newly introduced concept does
   not push the visualization or playback elsewhere.
5. **All exercises share one layout.** Equivalent diagram, evidence, question,
   answer, and navigation regions must have the same positions and spacing across
   Exercises 1–3 at the same responsive mode. Reserve answer and feedback space
   for that mode. Hints, errors, accepted answers, Show Answer, and question changes
   must not recenter the diagram or move the navigation button.
6. **Lectures and exercises reuse the exact visualization.** Reuse the same
   renderer, axis, label column, lane heights, window geometry, cursor, frontier
   markers, legend, result slot, and responsive rules. Do not make an exercise-only
   version with different padding, smaller fonts, or narrower tracks. Anchor the
   exercise diagram to the corresponding lecture frame using the established
   rendered-reference measurement pattern where necessary; measure on entry and
   viewport/sidebar resize, not after every answer change.
7. **Repeated visual elements must be identical.** A write frontier, retained
   boundary, timestamp cursor, input label, result status, table row, or policy
   control keeps the same shape, size, type treatment, meaning, and interaction
   wherever it appears in Chapter 7. Differences in data or selected state are
   expressed through the same component's supported states, not new markup.
8. **Keep app-wide visual consistency.** Reuse the site's typography, semantic
   theme tokens, borders, radii, button styles, icons, table styles, and inline
   references. Check both themes. Matching colors alone does not satisfy layout
   consistency; arrangement, dimensions, spacing, and responsive behavior matter.
9. **Allow justified differences from Chapter 6.** Keep familiar object colors,
   logical-time vocabulary, and the meaning of write-frontier symbols. Add a
   distinct retained-history boundary, query cursor, shared window, and query
   result because Chapter 7 teaches snapshot selection. Do not force its new
   concepts into Chapter 6's stage-selector and three-lane composition.
10. **Fit within the existing viewport rules.** No page scaling, font shrinking,
    clipped controls, or horizontal scrolling. Reuse the current shared responsive
    flow when narrow or very short windows need vertical scrolling to keep content
    reachable; do not enforce the earlier fixed-height policy by clipping content.
    Reuse existing compact input, panel-selection, and question patterns. The
    shared input window relationship and query outcome must remain understandable
    at every supported size. Any legitimate responsive change applies consistently
    to all six activities through their common owner.

Before writing UI code, inspect the rendered Chapter 6 lectures and exercises,
Chapter 2's shared lecture controls/playback, and their owning components/styles.
Use Chapter 6's implemented README as its current reference; historical details
in `CHAPTER_6_PLAN.md` do not override shipped layouts or `UI_LAYOUTS.md`.

## Visual design contract

The dominant interaction is selecting or following **one query timestamp** through
the windows exposed by every queried input.

### Stable workspace

Use this arrangement in every activity:

1. A compact query strip naming the queried objects, policy, and selected or
   requested timestamp. Introduce values gradually; do not add empty metric cards
   or stage buttons that have no selection behavior.
2. One readable-window diagram containing two input lanes and a shared time axis.
3. One fixed result/evidence region below the diagram. It holds the request
   outcome and, when needed, a compact transaction history or upstream-write
   observation. Keep its outer dimensions stable across lectures.
4. The established legend/key and scenario caption, followed by the template's
   playback controls in their normal position. Exercise questions use the
   exercise template's reserved regions around this same diagram.

The shared readable interval is a translucent **vertical window spanning both
inputs**, rather than a third "Both inputs" lane. The query cursor crosses both
lanes. This is the agreed refinement of the selected screenshot and distinguishes
Chapter 7's visual emphasis from Chapter 6's progress lanes.

| Element | Meaning | Consistency requirement |
| --- | --- | --- |
| Shared horizontal axis | Logical timestamp within the active fixture | One scale calculates ticks, boundaries, cursor, and shading |
| Left retained boundary | Earliest retained snapshot time, inclusive | One marker style and label: `Retained from R`; same renderer everywhere |
| Right write frontier | Times strictly before W are complete | Preserve Chapter 6's established frontier identity; label `Complete before W` |
| Muted prefix before R | History no longer retained for this read model | Same fill and meaning on every input; not an empty relation |
| Band from R to W | Retained and complete snapshots, [R, W) | Same geometry and theme treatment in every activity |
| Area at or after W | Not yet guaranteed complete | Keep distinct from discarded history; avoid implying observed rows cannot exist there |
| Vertical overlap | Shared retained and complete snapshots | Derived from every queried input; never add an independently advancing third frontier |
| Query cursor | Requested/selected query snapshot t | A distinct line/handle identity; do not reuse the frontier dot alone |
| Result status | Available, Waiting, Too old, or Staleness bound exceeded | One status component, with text and shape as well as semantic color |
| Current-clock marker | Reference for staleness in the clock-aligned fixture | Appears only after the clock model is introduced; never relabel playback steps as seconds |

Use the familiar Orders and Payments object vocabulary initially. Lecture 2
explicitly changes the queried objects to Orders and a derived result over it;
retain object identities and styles. Name the fixture change and relationship so
learners do not assume two unrelated queries must return the same rows.

Reserve the same number of lanes throughout. Introduce transaction or upstream
detail within the evidence slot without moving the axis, lane bounds, result
status, or playback. Do not insert a large filmstrip or policy-card dashboard in
one lecture and thereby change the chapter's visual language.

The cursor may be controlled by native, keyboard-accessible inputs or labeled
timestamp choices; pointer dragging is optional. All control paths use the same
simulation actions. In a strict read, distinguish the requested timestamp from
the returned snapshot; a waiting request has no completed query result.

Keep the scale fixed within each fixture family. An explicitly labeled switch
from arbitrary logical integers to clock-aligned timestamps may change its units.
Never rescale silently when a cursor, frontier, or selected object changes.

## Semantic contract and fixture limits

Use a scalar, single-timeline teaching model. Let input i retain snapshots from
R_i and complete times strictly below W_i. The shared interval is
`[max(R_i), min(W_i))`. A requested t is available when it belongs to that interval,
too old when below its retained boundary, and otherwise waiting for completion.
An empty overlap offers no immediately readable timestamp. For a t that is both
discarded by one input and incomplete on another, the model reports Too old;
waiting cannot restore discarded history.

Require R_i <= W_i for each input and use explicit replacement fixtures when
teaching a different starting state. Compaction advances the earliest retained
snapshot; it does not delete the current
relation's business rows. Do not simulate an active read losing its protected
history: either model a read hold or constrain compaction examples to completed
requests followed by new requests. Frontiers advance monotonically within a
fixture; Back, Reset, and independent-case replacement restore saved state.

Serializable guarantees a coherent serial history but can allow a later real-time
transaction to observe an older derived snapshot. Strict serializable additionally
respects real-time transaction ordering. Use the documented table/derived-result
example, with an unchanged qualifying row, rather than teaching a universal rule
that arbitrary later query timestamps or different query results must match.

Serializable can wait when no consistent snapshot is available. Strict reads can
wait for their chosen timestamp; do not promise a timestamp exactly equal to the
clock, a latest-possible snapshot, or a fixed waiting duration. Label the chosen
strict target as part of the illustrative fixture.

Bounded staleness chooses a sufficiently recent shared snapshot or errors without
waiting for input progress. It is read-only. Its freshness limit concerns logical
snapshot age, not event-time age, external source recency, or execution duration.
Use epoch-millisecond fixtures displayed in seconds and a positive five-second
bound; equality at the bound succeeds. Query evaluation/retrieval can still take
time. Teach policy failure separately from a requested timestamp that is too old.

An upstream write may not yet be included in a Materialize read. Strict transaction
ordering by itself supplies no immediate external-write visibility guarantee.
After ingestion, the model must still advance/process the relevant fixture state
and choose a snapshot containing the update before displaying it. Optional real-time
recency is reference-only, labeled with its verified availability; it is not a
prerequisite or required exercise action.

The lab is a deterministic simulation. Timestamp choices, source pauses, processing
rates, and waits are illustrative, not measured deployment behavior. Selecting a
cursor time is not an assertion that arbitrary time-travel SQL is supported.

## Lecture progression

All lectures use the same scenario wrapper, shared layout, and readable-window
component. Every checkpoint identifies the upcoming action, target, prediction
where appropriate, and explanation on reveal. Introduce each term before testing it.

Manual Previous/Next and autoplay visit only checkpoints with visible state changes.
Explanation-only checkpoints remain in guided runs, consume no autoplay interval,
and do not count toward normal playback totals. Back restores the previous visible
state, including when leaving guidance between two visual changes.

### Lecture 1: Find a readable moment

Start with Orders R=3/W=10 and Payments R=5/W=8 on a fixed logical-integer axis.

| Checkpoint | Action and intended understanding |
| --- | --- |
| 1 | Identify the queried inputs, shared logical-time axis, and query cursor. Step numbers are playback positions, not timestamps. |
| 2 | Introduce Orders' left boundary at 3 and right frontier at 10, including the inclusive/exclusive endpoints. |
| 3 | Introduce Payments' [5,8) window. Reveal the spanning shared window [5,8). |
| 4 | Request t=7. Both inputs contribute their state at the same logical moment; the result is available. |
| 5 | Predict a request at t=4. Payments no longer retains that snapshot; advancing its write frontier will not restore it. |
| 6 | Predict t=8. It equals Payments' write frontier, so the request waits. |
| 7 | Separately advance Payments' frontier to 9. The pending t=8 request can complete. |
| 8 | After completing/releasing that request, advance Payments' retained boundary to 7. A new t=6 request is now too old; current rows have not been deleted. |
| 9 | Recap one-query consistency using small input/result evidence from one timestamp. The result is coherent even if newer time remains incomplete. |

### Lecture 2: Keep reads in order

Use a labeled new fixture: T1 reads Orders at t=10 and observes qualifying order
42; it completes before T2 starts. T2 reads a derived result defined over the same
table and known to contain order 42 once caught up. No deletion or filter change
occurs. Its newest complete integer snapshot is 7 (write frontier 8).

| Checkpoint | Action and intended understanding |
| --- | --- |
| 1 | Explain the derived query and establish why order 42 should appear once processing catches up. |
| 2 | Complete T1 and record its query time and observed row in the evidence slot. |
| 3 | Under serializable, predict T2 at the retained, complete t=7 snapshot. It can return an older observation without order 42. |
| 4 | Explain the possible serial ordering T2 before T1. Keep real-time request order visibly separate from serial history. |
| 5 | Explicitly replay the same starting fixture under strict serializable. Do not reverse a frontier while pretending to continue the previous run. |
| 6 | Request T2 with illustrative target t=10. Its cursor lies beyond the derived result's complete window, so it waits. |
| 7 | Advance/process the derived result until its write frontier is beyond 10. Predict and reveal T2 containing order 42. |
| 8 | Show an independent no-overlap fixture under serializable: no consistent snapshot is ready, so this policy can also wait. |
| 9 | Recap consistency within one read, ordering between transactions, and waiting for the chosen snapshot. |

### Lecture 3: Choose freshness and waiting

Introduce a labeled clock-aligned fixture, displayed in seconds, with current
logical time 100 and a five-second bound. Explicitly define the latest available
snapshot in milliseconds; do not infer it by subtracting a whole second from a
write frontier on an arbitrary integer axis.

| Checkpoint | Action and intended understanding |
| --- | --- |
| 1 | Introduce snapshot age and the five-second policy requirement. Distinguish it from query execution duration. |
| 2 | Latest shared snapshot 98: bounded staleness succeeds at age 2. |
| 3 | Keep the latest shared snapshot at 98 and advance the clock to 103: predict equality with the bound; age 5 succeeds. |
| 4 | Advance the clock to 106 while the snapshot remains 98: age 8 errors. Clock advancement creates greater staleness without moving any frontier backwards. |
| 5 | Replay equivalent lag under serializable and strict serializable. Show an available older snapshot versus waiting for the fixture's stated strict target. Use the same diagram and result slot. |
| 6 | A separate upstream write commits while ingestion is paused. Show its pending external identity in the evidence slot; do not place it on Materialize's logical axis prematurely. |
| 7 | A strict read can still lack that external row; transaction ordering does not assert source recency. Depending on the fixture's selected time/completion, it may also be waiting. Show exactly which state applies. |
| 8 | Resume ingestion, assign the change its logical timestamp, process it, and complete a read whose snapshot includes it. Keep these stages explicit. |
| 9 | Compare two queries over equally fresh snapshots with different illustrative execution times. Neither freshness bound nor input readiness implies zero response time. |
| 10 | Recap the final challenge: choose a dashboard policy that meets its bound and required behavior during a stall. |

Use roughly 25–55 words per guided explanation. Prediction states retain the
before-state until Reveal; Back restores the right state and explanation. Guided
mode and Controls tour pause autoplay. Reset clears the current run. Preserve
existing keyboard and reduced-motion behavior.

## Exercises and exact assessment

Exercise numbers differ from lecture fixtures where useful, while retaining the
same renderer, labels, geometry, and controls. Show evidence and the upcoming
action, but conceal computed outcomes, classifications, correct policies, and
revealing explanations until the learner submits or uses Show Answer.

### Exercise 1: Choose the snapshot — five questions

| Question | Visible evidence / action | Accepted answer and reasoning |
| --- | --- | --- |
| 1 | A R=4/W=13; B R=7/W=11. Choose a complete timestamp both retain. | Any whole-number t in [7,11), i.e. 7, 8, 9, or 10. Grade the valid range, not one preferred answer. |
| 2 | Classify requests at t=6, t=9, and t=11 in that fixture. | Too old, Available, Waiting respectively. Require all three. |
| 3 | A t=11 request is waiting; advance B W=11 to W=12. | It becomes available. Time 11 is now strictly below both write frontiers. |
| 4 | Release completed reads; advance B's retained boundary from 7 to 9. Classify a new t=8 request and explain current rows. | Too old; retained history changed, not the current relation's business-row existence. |
| 5 | Independent fixture: A [9,13), B [5,9). Is there a shared immediately readable time? | No. Equality of the maximum retained boundary and minimum write frontier gives an empty intersection. |

Hints identify the relevant left/right boundary without giving the classification.
An incorrect answer does not apply the proposed frontier/compaction action.

### Exercise 2: Explain the observation — four questions

| Question | Evidence | Accepted answer and reasoning |
| --- | --- | --- |
| 1 | T1 observes an unchanged qualifying row at t=14. Later T2 queries the derived result with retained complete t=10 under serializable. | An older observation is allowed if consistent with a serial history ordering T2 before T1; no claim that every execution must choose t=10. |
| 2 | Replay the same requests under strict serializable with stated T2 target t=14 and derived W=11. | T2 must wait; the older observation does not preserve the required order. |
| 3 | Advance/process the derived result to W=15. | The t=14 request can finish and includes the observed row. Equality W=14 would still be insufficient for that target. |
| 4 | Independent case: a row committed upstream, ingestion paused, and a completed strict read without that row. Select the explanation and next stage to inspect. | External-write recency is not guaranteed by strict transaction ordering alone; inspect ingestion/visibility evidence, not a supposed dirty read. |

Require both the selected outcome and the relevant explanation/evidence. Teach
that absence from a different SQL predicate would be a separate issue; use a
fixture where the row qualifies for both queries.

### Exercise 3: Keep the dashboard within its bound — final challenge

Continuous clock-aligned fixture: the application requires a snapshot at most five
seconds stale and an error instead of waiting when the freshness bound cannot be
met. It permits nonzero query execution time.

| Question | Scenario | Accepted answer and reasoning |
| --- | --- | --- |
| 1 | Choose the read policy and bound from the stated dashboard requirements. | Bounded staleness 5 s; both the policy and duration are required. |
| 2 | Current logical time 100 s; freshest shared snapshot 98 s. | Read succeeds with snapshot age 2 s; do not claim zero execution duration. |
| 3 | Pause ingestion; clock reaches 103 s while latest readable snapshot stays 98 s. | Age 5 s still meets the inclusive bound. |
| 4 | Clock reaches 106 s; snapshot remains 98 s. Choose outcome and supporting evidence. | Error without waiting for input progress; age 8 s exceeds 5 s. Do not return the stale snapshot or keep displaying it as a newly successful read. |
| 5 | An upstream row commits during the stall. Can changing to strict serializable alone promise immediate visibility of this external write? | No; distinguish source ingestion/visibility from transaction ordering. A policy change is not an ingestion repair. |
| 6 | Resume ingestion and process to latest readable snapshot 107 s at current logical time 108 s. | A new bounded read succeeds at age 1 s. The already failed request is not silently completed; the fixture explicitly issues a new request. |

Final feedback names why the chosen policy meets the requirements, what evidence
caused failure during the stall, and what permitted recovery. Reduce guidance
through the sequence; hints precede Show Answer. Preserve answers during detail
selection. Use shared reset, acceptance, completion dialog, and navigation to
the learning path, with no new score system. Remote main now ends at Chapter 7;
do not recreate a removed Chapter 8 just to provide a completion destination.

## Implementation responsibilities and sequence

Create chapter-local code under `src/chapters/consistent-reads/`. Keep simulation,
content, rendering, and integration separate without introducing unnecessary
dependencies or a generic framework for hypothetical chapters.

1. **Model and semantic tests:** `simulation.ts` owns retained/write boundaries,
   shared-window computation, read outcomes, illustrative policy timestamp
   selection, transaction observations, clock-aligned age, and explicit ingestion
   state. Distinguish model decisions from actual Materialize timestamp-selection
   internals. Use immutable actions and deterministic replay. Model any active-read
   history hold or prohibit conflicting compaction actions explicitly.
2. **Content:** `lecture-scenarios.ts`, `exercise-scenarios.ts`, `resources.ts`,
   and `lessonText.ts` own fixtures, steps, expected answers, hints, explanations,
   object references, objectives, and verified SQL/docs. Derive navigation titles
   from these definitions, not duplicate hardcoded page lists.
3. **One workspace:** `ReadableWindow.tsx` and `chapter.css` own the diagram and
   its stable query/evidence slots. Keep marker positioning in one scale helper.
   Reuse existing Chapter 6 presentation primitives where their meaning and
   ownership fit; do not import its whole progress workspace or copy its CSS.
   Extract a genuinely shared primitive only when both chapters need it, and
   verify both callers if doing so.
4. **One lecture wrapper:** `ConsistentReadsLecture.tsx` composes the existing
   screen, playback, guidance, and chapter workspace for every lecture definition.
   Use explicit spotlight targets for boundaries, overlap, cursor, outcome, and
   supporting evidence.
5. **One exercise wrapper:** `ConsistentReadsExercisePage.tsx` composes
   `ExerciseFrame` and `useExerciseStages`. A local workspace alignment adapter
   may follow `ProgressExerciseWorkspace` where needed; avoid copying its entire
   layout engine. Share one set of exercise anchors and geometry across all
   questions. Keep grading separate from view code when it has meaningful logic.
6. **Integration:** update `chapterOutline.ts`, `ChapterContentPage.tsx`,
   `chapterRegistry.ts` introductions/documentation links, relevant navigation and
   outline tests, and `components/walkthrough/walkthroughContent.ts` for Chapter 7's
   actual scenario controls. Preserve other chapters' routes and expanded branches.
7. **Documentation:** add a chapter README with the final implementation map,
   fixture scope, current limitations, and verified sources. Update `UI_LAYOUTS.md`
   to record actual template usage, component ownership, alignment behavior, and
   compact rules after implementation. Do not describe planned code as shipped.

The filenames express responsibilities; consolidate tiny adjacent modules where
clearer. Do not leave empty scaffolding or prototype-only code in production.

## SQL and technical references

The existing SQL & Objectives dialog should contain a small Orders/Payments query,
the derived result used in the ordering fixture, valid isolation-policy examples,
and `EXPLAIN TIMESTAMP FOR SELECT ...` as optional diagnostic context. Explain
that the simulator does not execute SQL or connect to a deployment. Do not present
the cursor as arbitrary `AS OF` SQL support or promise stable diagnostic output.

Official references checked on 2026-10-22; recheck relevant details when implementing:

- [EXPLAIN TIMESTAMP](https://materialize.com/docs/sql/explain-timestamp/): query
  timestamps, read/write frontiers, shared boundaries, and diagnostic output.
- [Isolation levels](https://materialize.com/docs/serve-results/isolation-level/):
  serializable versus strict serializable, bounded staleness, execution latency,
  external ingestion, and real-time recency availability.

If a referenced feature changes, update teaching copy, deterministic fixtures,
assessment expectations, and links together. Keep preview-only functionality out
of required tasks.

## Verification and acceptance gates

### Semantic and teaching checks

Test inclusive retained and exclusive write boundaries, exact equality, tied
frontiers, no shared interval, old-plus-incomplete requests, waiting completion,
compaction after release, monotone frontiers, explicit fixture replacement, and
deterministic Back/Reset/replay. A query result always uses one shared snapshot.

Test the fixed qualifying-row ordering scenario under both isolation policies,
serializable without an available snapshot, bounded age below/equal/above the
limit, bounded errors without input waiting, and explicit new requests after
recovery. Test that upstream commit, ingestion, processing, and selected-snapshot
visibility remain distinct. Validate numeric inputs and exact evidence sets;
incorrect or partial answers preserve the before-state.

Walk every guided checkpoint, prediction/reveal, Back, Reset, autoplay completion,
tour pause, keyboard interaction, hint, incorrect submission, acceptance, Show
Answer, and completion navigation. Verify that grading evidence and computed
answers are not revealed before acceptance.

### Positional and spacing checks

Record bounding boxes from real browser renders, not screenshots alone. Compare:

| Comparison | Required matching elements |
| --- | --- |
| All Chapter 7 lectures at one viewport | Title/toolbar/help anchors; diagram top/left/width; axis origin; lane/track height and gaps; cursor geometry; result/key slots; playback baseline |
| All Chapter 7 exercises at one viewport | Diagram and evidence anchors; question/answer region bounds; internal gaps; footer inset and button bounds |
| Each exercise and its reference lecture | Same visualization outer bounds, padding, scale width, label column, tracks, markers, legend, and typography; exercise-specific question controls stay in their own slots |
| Every state within an activity | No diagram/footer movement due to longer labels, changed status, empty output, hints, error copy, accepted answers, or supporting evidence |
| Chapter 7 and established reference pages | Shared template title, toolbar, tour, buttons, reference dialog, playback/navigation geometry and responsive behavior |

At an identical viewport and responsive mode, equivalent anchors and dimensions
should match within 1 CSS pixel to allow browser rounding. Encode meaningful
geometry comparisons in the focused browser suite; do not merely check that
elements exist or that the page has no overflow. A valid breakpoint transition
may change the arrangement, but it must do so consistently across all Chapter 7
pages using that arrangement. If support content cannot fit, shorten/restructure
it within the shared content slot rather than introducing page-specific offsets.

Check desktop 1440×1000 and 1440×900, laptop 1366×768, short laptop 1280×650,
tablet 1024×768 and 768×900, and phone 390×844 and 390×664. Include expanded and
collapsed/resized sidebars, both themes, keyboard-only input, reduced motion,
readable labels, accessible marker descriptions, and actual wheel/PageDown scroll
position checks where the template locks scrolling.
At laptop viewports at least 1280×640 with the standard sidebar, keep the diagram, question, answer controls,
and navigation visible simultaneously without page/workspace scrolling or a
diagram/question toggle. Budget the question height in the shared frame and
remove duplicated supporting copy before compacting common diagram spacing.

Run focused semantic/grading tests, `npm run typecheck`, `npm run build`, focused
Chapter 7 browser tests, and the affected existing navigation/shared-layout tests.
If shared components or styles change, cover every affected caller, including
Chapter 6. Broaden testing for concrete failures or changed shared behavior rather
than repeatedly running unrelated suites. Review the final diff for unrelated
changes, duplicated geometry, dead code, and screenshot assets in runtime UI.

Chapter 7 is complete only when every curriculum objective is taught and assessed,
the single readable-window language stays consistent, all mandatory template and
spacing rules pass, and learners can explain freshness, waiting, and external
visibility using evidence from the displayed fixture.
