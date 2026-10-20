# Chapter 6 implementation plan: Progress and Freshness

Status: implementation specification, 2026-10-19. Implemented activities and their
source map are documented in `src/chapters/progress-and-freshness/README.md`.

## Selected design and scope

Use concept 3, the aligned input lanes and join progress boundary, as the chapter's
single visual language. Extend its lanes for downstream diagnosis; do not build
the other five mockups as separate visualizations. Generated images are concept
references only. Existing application templates are the layout source of truth.

Deliver three lectures and three exercises. Exercise 3 is the curriculum's final
challenge. Use Orders and Payments feeding Paid orders, then Revenue, throughout.
Business rows remain small supporting evidence, rather than another table lesson.

| Activity | Goal | Suggested duration |
| --- | --- | --- |
| Lecture 1: What progress proves | Read a frontier; separate observations from completeness; compare quiet and nonprogressing inputs | 7–9 min |
| Lecture 2: A join waits for both inputs | Separate the input limit from the join's actual progress | 7–9 min |
| Lecture 3: Find where delay starts | Distinguish source delay, inherited/local computation delay, and retrieval latency | 8–10 min |
| Exercise 1: Read the evidence | Four frontier and progress questions | 5–7 min |
| Exercise 2: Unblock the join | Five predictions in one continuous scenario | 6–8 min |
| Exercise 3: Diagnose three dashboards | Cause and evidence for three incidents, then one timing question | 8–10 min |

## Learning contract and correctness

Teach these definitions in this order, with visible examples:

1. A lane represents one relation/object, not one business row.
2. Logical timestamps label changes. They are different from event timestamps
   inside rows, scenario step numbers, and wall-clock time.
3. A write frontier F establishes completion strictly below F. Time F remains open.
4. Seeing a change at time 18 does not establish completion of time 12.
5. Progress can advance with no new business rows. No new rows alone proves
   neither completeness nor failure. A stationary frontier alone does not reveal
   a specific root cause.
6. In this scalar, direct two-input join fixture, inputLimit = min(Orders, Payments).
   The join's actual frontier cannot exceed that limit but can remain behind it.
   This is a focused model, not a universal rule for arbitrary SQL operators.
7. Input progress permits further downstream completion; processing must still
   happen. Actual results may change at open timestamps; an input limit is not a
   prohibition on processing or producing individual changes ahead of it.
8. Wall-clock lag and materialization lag answer different questions. Source delay
   contributes to wall-clock lag; it is not silently counted as inherited
   materialization lag.
9. Query duration is separate from maintained-object progress. Current data can
   be retrieved slowly, and a fast response can contain stale data.

Use small logical integers in lectures 1–2. In lecture 3 explicitly introduce a
new fixture whose logical timestamps are epoch-aligned values displayed as
seconds on the simulated clock. Only that fixture permits direct wall-clock
subtraction. Label durations, backlog counts, and rates illustrative. Never
subtract an arbitrary scenario-step number from wall-clock time.

## Shared layout and control contract

Reuse `LectureScreen` with `layout="without-tip"`, `LectureWorkspace`,
`GuidedLabScreen`, `WorkspaceMetric`, `Button`, `LectureControlsTourButton`,
`SqlObjectivesPanel`, `Spotlight`, `LessonText`, and `useLectureRun`.

Reference lectures: Chapter 2 Lecture 1 for title, toolbar, metrics, stage tabs,
and playback placement; Chapter 2 Lecture 2 for join vocabulary and guided
interaction. Reference exercises: Chapter 2 Exercise 1 and Chapter 4's
`IngestionExercisePage` for shared question/action behavior and compact views.
Before implementation inspect these pages rendered at the target viewport sizes,
as well as their markup and styles. Do not copy and approximate their frames.

Preserve the existing positions and responsive wrapping of SQL & Objectives,
Reset, Run/Pause, Start guided run, Controls tour, progress indicator, and bottom
playback. Reuse existing control order, variants, icons, disabled states, and
focus behavior. Exercise buttons follow the existing exercise template, not a
new lecture-style toolbar. Do not add the mockup's separate event-control row;
Previous/Next playback applies the named scenario action. Explain that action
inside the visualization. Do not relocate controls to fit long explanations.

Shared CSS owns page dimensions, spacing, upper controls, and playback baseline.
Chapter CSS owns only the lanes and supporting evidence inside the visualization.
All Chapter 6 pages using lanes share their labels, marker geometry, spacing,
legend, and responsive behavior. Reserve their footprint so labels, explanations,
changed evidence, and empty states do not move surrounding controls.

## Lane workspace

The desktop workspace has three metric cards, an existing-style stage selector,
and one bordered lane panel. Lectures 1–2 use Orders, Payments, and Paid orders.
Lecture 3 adds Revenue using the same lane renderer and reserved stage area.
The selected-stage evidence appears in a fixed detail slot, not a floating panel.

| Element | Meaning and explicit label |
| --- | --- |
| Shared horizontal ticks | Logical time; identical x-coordinate means identical time on every lane |
| Solid frontier marker | `Actual frontier: F`; secondary label `Complete before F` |
| Subtle shaded prefix | Times strictly below the actual frontier are complete |
| Hollow change marker | `Change observed at T`; deliberately different from a frontier |
| Dashed input-limit marker on output | `Inputs permit a frontier up to L`; label it as derived, not a reported frontier |
| Gap between actual and limit | `Processing still needed`; never imply that it is a measured row count |
| Limiting input annotation | `Payments limits input progress`; if tied, identify both |
| Wall-clock line, lecture 3 only | `Simulated wall clock: W` |
| Query-duration detail | Milliseconds/seconds, separate from the logical-time axis |

Keep a concise legend visible. Introduce the dashed marker only after actual
frontiers are understood. Use text and distinct shapes in addition to color.
Avoid unexplained labels such as capabilities, antichains, upper, or watermark.
Help popovers may repeat definitions but cannot be the only place they are taught.

On compact screens retain all three core lanes in a shared overview so the
limiting relationship remains visible. Existing panel selectors choose detail
content; they must not hide the relationship between inputs and output. Guided
steps select the relevant detail automatically. Simplify ticks and shorten labels
before reducing content; do not shrink fonts, add horizontal scrolling, or scale
the page. Use the existing exercise compact layout to keep the question visible.

## Guided-run teaching rules

Use the existing prediction/reveal flow. Every checkpoint has a title, spotlight
target, short explanation, explicit upcoming action, and, where appropriate, a
prediction prompt and reveal explanation. Avoid introducing several new terms
at once. First explain an element, then demonstrate it, then ask about it.

For predictions preserve the before-state until Reveal. Afterwards show the
changed marker and explain: what changed, why, and what remained unchanged.
Never say only "Correct" or "the frontier advanced". Name the object and values.
Questions test one primary distinction at a time. Guided predictions are for
reflection, not a new graded quiz interface; assessment belongs to exercises.

Keep explanations to roughly 25–55 words. Split longer material into checkpoints.
Back restores the relevant before/after state and explanation. Reset restores
the initial fixture. Guided mode pauses autoplay; opening Controls tour pauses
playback. Closing guidance leaves a coherent visible state. Maintain focus
restoration, keyboard navigation, and reduced-motion support.

Playback counters say `Steps`, not `Current logical time`: the existing hook's
selectedTime indexes scenario actions, while the fixture owns actual frontiers.
Respect the hook's existing prediction/back semantics; use adjacent before/after
action checkpoints rather than changing shared behavior for this chapter.

## Lecture 1: What progress proves

Initial fixture: Orders frontier 8, Payments frontier 8, Paid orders frontier 8.
Fixed axis 0–20. Initially hide the derived input-limit annotation.

| Step | Spotlight and action | Teaching copy / prediction |
| --- | --- | --- |
| 1 | Lane names | "Orders and Payments are inputs. Paid orders joins them by order ID. Each lane shows how far one object has completed its changes." |
| 2 | Axis | "These numbers are logical timestamps attached to changes. They are not the order's event time, seconds elapsed, or the tutorial step number." |
| 3 | Orders marker at 8 | "This is the write frontier. All changes before 8 are complete for Orders. Changes at 8 may still occur." |
| 4 | Advance Orders to 12 | Ask whether 11 and 12 are complete. Reveal: "11 is below 12, so it is complete. 12 is at the boundary and remains open." |
| 5 | Observe Orders change at 18; frontier stays 12 | Ask whether completion now reaches 18. Reveal that an observation is not a completeness guarantee; keep the two marker styles visible. |
| 6 | Observe another Orders change at 12 | "This is allowed: time 12 was still open. The earlier observation at 18 did not finish it." |
| 7 | Progress-only reports: Orders 12→14→16; no new rows | "Completeness can advance without business changes. Orders is quiet, but its progress reports still establish more completed time." |
| 8 | Payments remains at 8 while progress samples continue | Ask what can be concluded. "We cannot confirm Payments has completed more time. No new rows alone does not tell us whether it is quiet, disconnected, or otherwise delayed." |
| 9 | Distinguish event time | Show a newly arriving row with an old business event timestamp and a permitted logical timestamp. Explain that frontier completion does not forbid later arrivals describing older real-world events. |
| 10 | Recap on the same lanes | Learner identifies actual frontier, observed-change marker, and one guaranteed complete timestamp. Point to Lecture 2's question: what can the join complete? |

## Lecture 2: A join waits for both inputs

Start a clearly labeled fresh fixture: Orders 12, Payments 8, Paid orders 6.
Metrics are Orders frontier, Payments frontier, and Paid orders frontier.

| Step | Action / prediction | Explanation on reveal |
| --- | --- | --- |
| 1 | Reorient to the fresh fixture | "The inputs have completed different amounts of logical time. Paid orders has completed less than either input." |
| 2 | Introduce dashed marker at 8 | "Both inputs must finish a time before the join can finish that time. Payments currently limits input progress to 8. The solid marker at 6 shows the join's actual frontier." |
| 3 | Orders 12→16; predict limit and actual | Limit remains 8; actual remains 6. Advancing the faster input does not remove Payments' constraint. |
| 4 | Process join 6→8 | The join can catch up to the current limit without further input progress. Times below 8 are now complete; time 8 is still open. |
| 5 | Payments 8→14; predict limit | Limit becomes 14 because Orders is 16. Actual stays 8 until processing occurs. |
| 6 | Process part of the available work: join 8→10 | Inputs permit 14, but the join has only completed before 10. This is computation lag. |
| 7 | Process remaining work: join 10→14 | The gap closes. More processing alone cannot now establish completion beyond both inputs. |
| 8 | Payments 14→18; predict limiting input | Orders at 16 becomes the limiting input. A bottleneck is not permanently attached to one lane. |
| 9 | Orders 16→18, then separately process join 14→18 | Both inputs tie at 18. Separate actions demonstrate permission followed by actual processing; never jump the join automatically. |
| 10 | Recap | "Ask two questions: how far do the inputs permit progress, and how far has this object actually completed?" |

## Lecture 3: Find where delay starts

Use the same lanes with a selectable downstream Revenue stage. Explicitly reset
to the wall-clock-aligned seconds fixture. Introduce new measurements one at a
time; the detailed lag breakdown belongs to Revenue's detail stage.

1. **Introduce the clock.** W=20, Orders=18, Payments=18, Paid orders=14,
   Revenue=12. Explain that Revenue's wall-clock lag is 20−12=8 seconds.
2. **Separate local and inherited lag.** Revenue's direct input is 14, so local
   lag is 2 seconds. Root inputs are 18, so global materialization lag is 6
   seconds, of which 4 are inherited. Source lag to the clock is another 2.
   State explicitly: 2 local + 4 inherited + 2 source = 8 wall-clock lag.
3. **Inspect the first computation delay.** Both sources have reached 18, while
   Paid orders is 14. Ask whether Revenue introduced all its delay. Highlight
   the earlier gap rather than coloring every downstream stage as the culprit.
4. **Source incident, independent fixture.** Show samples where Payments remains
   at 8 while the clock advances, source status reports stalled, and both
   downstream stages have caught up to 8. Explain that the source status and
   progress history support an ingestion investigation.
5. **Computation incident, independent fixture.** Sources advance 16→18 while
   Paid orders stays at 12 and its illustrative backlog grows 40→90. Revenue
   remains 12. Explain that Revenue inherits the delay and that more evidence
   is needed before asserting CPU overload as the exact cause.
6. **Serving incident, independent fixture.** At query start all maintained
   stages are caught up to the chosen target time; the query returns after 3
   seconds. Separate query duration from the completed-time guarantee. A
   response need not include changes arriving after its chosen snapshot.
7. **Reaction-time example.** An update occurs at 0 s, becomes available at 4 s,
   a query starts then, and returns at 7 s. Teach 4 s freshness delay + 3 s
   query latency = 7 s reaction time for this explicitly sequenced example.
8. **Recap.** Identify whether to investigate ingestion, maintained computation,
   or serving. Do not promise that one metric alone proves a detailed cause.

## Exercises and exact assessment

Exercise fixtures differ from lecture numbers. Reuse the exact lane components,
legend, stage selector, detail slot, and metric labels. Show the upcoming action
as evidence; do not expose its result or the correct diagnosis before acceptance.

### Exercise 1: Read the evidence — four questions

| Question | Evidence and prompt | Accepted answer | Hint / corrective explanation |
| --- | --- | --- | --- |
| 1 | Orders frontier 15; classify 14 and 15 | 14 complete; 15 open | "Complete means strictly below the frontier." Explain boundary equality explicitly. |
| 2 | Observed change 22; frontier still 15. Is 20 guaranteed complete? | No | "Which marker states completeness?" A high observed timestamp supplies no such guarantee. |
| 3 | No new rows; Orders frontier 15→17; Payments 15→15. Select supported conclusions | Orders confirms progress; Payments has no additional confirmed progress; exact Payments cause unknown | "Separate row activity from progress reports." Reject both "quiet means failed" and "no rows means caught up." |
| 4 | New record describes event time 5 but carries logical time 18; frontier 17. Is older event time forbidden? | No; the guarantee concerns logical timestamps | "Which timestamp does the frontier describe?" Do not retract the completeness guarantee or equate business time with logical time. |

### Exercise 2: Unblock the join — five questions

Continuous fixture starts Orders=17, Payments=11, Paid orders=9.

| Question | Upcoming action | Required prediction and explanation |
| --- | --- | --- |
| 1 | None | Input limit 11; limiting input Payments; actual frontier 9. |
| 2 | Advance Orders 17→20 only | Limit 11 and actual 9 unchanged. Faster input progress does not resolve the limit. |
| 3 | Advance Payments 11→18 only | Limit 18; actual 9. Permission is not completed work. |
| 4 | Process join 9→13 only | Actual 13; time 12 complete and time 13 open; limit remains 18. |
| 5 | Process join 13→18, then propose next dependency action | Actual 18; Payments still limits at 18, so it must advance before completion can extend further. Do not accept extra processing alone as sufficient. |

Hints first point to the smaller input frontier, then to the difference between
the dashed marker and solid marker. Grade all required fields together. A wrong
prediction cannot move the simulation. After acceptance apply the action and
explain both the changed and unchanged quantities.

### Exercise 3: Diagnose three dashboards — four questions

Three independent incidents use the same lane workspace. Present cause choices
and evidence choices together. Require a correct stage AND the supporting
evidence set; a lucky cause selection is insufficient.

| Case | Evidence | Required diagnosis and investigation |
| --- | --- | --- |
| A | Payments frontier stays 10 across samples; Orders advances; Paid orders and Revenue reach 10; Payments status explicitly stalled; query 70 ms | Ingestion at Payments. Cite stalled status and stopped progress. Inspect source status/connectivity; fast serving is not the remedy. |
| B | Both sources 18; Paid orders 12 and backlog 40→90; Revenue 12; query 90 ms | Maintained computation at Paid orders; Revenue inherits the delay. Inspect transformation workload/resources and query shape. No unsupported claim that CPU is definitely the cause. |
| C | All maintained stages caught up to the request's target; serving query takes 3 s | Retrieval/serving. Cite completed target and query duration. Investigate the serving query; do not call this source lag or claim the response contains every change up to response time. |
| Timing question | Update at 0 s, available at 5 s; query starts at 5 s and returns at 7 s | Freshness delay 5 s; query latency 2 s; example reaction time 7 s. |

Hints identify the measurement to compare without naming the culprit. Wrong
answers explain the selected misconception using the visible evidence. Show
Answer fills and accepts the answer using shared behavior. Preserve answers when
switching details. Reset clears the exercise. Completion uses the existing
chapter-complete dialog and navigation to Chapter 7; do not add persistent scores.

## SQL & Objectives and resources

Include a small Orders/Payments join and Revenue aggregation with explicit
columns and order-ID relationship. Explain that the lane engine simulates
progress and does not execute SQL or contact Materialize. Use current official
diagnostic SQL for frontiers and materialization lag in the existing reference
dialog, with prerequisites and object-ID placeholders explained. Verify every
catalog column and query against official docs during implementation. Keep
diagnostic SQL out of the normal prediction flow.

Resources checked on 2026-10-19:

- https://materialize.com/docs/transform-data/freshness-troubleshooting/
- https://materialize.com/docs/fundamentals/concepts/reaction-time/

Exclude read-frontier/compaction and isolation-policy mechanics (Chapter 7),
replica recovery/capacity sizing (Chapter 10), and subscription buffering
(Chapter 11). Brief definitions may cross-link these without testing them here.

## Implementation sequence and ownership

Create chapter-local files under `src/chapters/progress-and-freshness/`, matching
the registered chapter slug. Keep deterministic simulation separate
from scenario content and React rendering; no additional dependencies planned.

1. **Simulation:** `simulation.ts` and semantic tests. Own actual frontiers,
   observed changes, progress-only reports, processing actions, simulated clock,
   selected-query timing, and derived limits/lags. Enforce monotone frontiers
   within one fixture and downstream limits. Fixture resets are explicit.
2. **Content:** `lecture-scenarios.ts`, `exercise-scenarios.ts`, and
   `resources.ts`. Own named actions, checkpoints, explanation fragments,
   spotlight targets, assessment expectations, hints, and reference SQL.
3. **Workspace:** `ProgressLanes.tsx` and `chapter.css`. Own lane geometry,
   accessible text equivalents, legend, selected detail, and compact layout.
   Derive marker coordinates from one shared scale, not independent percentages.
4. **Lectures:** `ProgressLecture.tsx` composes existing template and hook for
   all three definitions. Reuse the established spotlight and prediction markup.
5. **Exercises:** `ProgressExercisePage.tsx` and chapter-local grading compose
   `ExerciseFrame` and `useExerciseStages`; use native accessible inputs.
6. **Integration:** update `chapterOutline.ts`, `ChapterContentPage.tsx`, chapter
   registry introduction/resources, and navigation tests. Keep all existing
   chapter branches and routes intact. The three lectures and three exercises
   must be reachable from the overview and sidebar.
7. **Documentation:** add chapter README with implementation map, fixture scope,
   limitations, and verified sources. Update `UI_LAYOUTS.md` with Chapter 6's use
   of existing templates and local lane component, without duplicating policy.

These filenames are responsibilities, not an instruction to create empty
scaffolding or overabstract the implementation. Consolidate tiny adjacent modules
when that improves clarity.

## Verification and acceptance

Semantic tests cover strict frontier boundaries, observation versus completion,
quiet progress, late business event time, limiting-input changes and ties,
permission without processing, processing without new inputs, monotonicity,
local/inherited/source lag arithmetic, and separate query timing. Grading tests
cover exact evidence sets, incomplete submissions, malformed numeric answers,
wrong answers preserving state, reset, and deterministic replay.

Browser tests cover every guided checkpoint before/after reveal, Back/Reset,
autoplay completion, tour pause/focus restoration, every exercise before and
after acceptance, hints, Show Answer, and final completion navigation. Check that
answers are not disclosed early and that marker labels match their positions.

Compare Chapter 6 against rendered reference lectures at desktop 1440×900,
laptop 1366×768, tablet 1024×768, and phone 390×844. Match title, toolbar, controls
tour, metrics/stage inset, and playback bounds where the template is equivalent.
Exercise controls match exercise references. No screenshot-generated layout is
allowed to override existing component positions. Verify all checkpoints, both
themes, keyboard-only input, focus, reduced motion, readable axes, stable panel
sizes, and no clipping or unintended scrolling. Resolve fit within chapter
content using the existing responsive patterns; do not shrink type or move buttons.

Run typecheck, production build, focused unit/browser suites, and the existing
shared-layout suite when integration is complete. Broaden tests only for changed
shared behavior or a concrete regression. Review the final diff for unrelated
changes and ensure the generated concept pictures are not runtime UI assets.

Done means every curriculum objective is taught and assessed, all guided copy
explains its terms before use, the selected lane design is consistent throughout,
and shared controls remain in their established positions.
