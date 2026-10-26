# Chapter 8 plan: SUBSCRIBE

Status: implemented specification, 2026-10-24.
**Selected visualization: Timestamp trays (option 2).** The complete chapter has
three lectures and three exercises, using one shared timestamp-tray renderer.
Exercise 3 is the final challenge. The other concepts below are historical design
comparisons, not additional implementations.

Implementation details are mapped in
[`src/chapters/live-applications-subscribe/README.md`](./src/chapters/live-applications-subscribe/README.md).
Validation on 2026-10-24: 209 unit tests and 37 selected browser checks passed;
typecheck and production build passed. Browser checks include all Chapter 8
activities, every exercise feedback state at laptop size, both themes, phone
layout, Chapter 7 → 8 navigation, and saved progress across the eight chapters.

Chapter title: **SUBSCRIBE — From Maintained Results to Live Applications**.
Slug: `live-applications-subscribe`.

Follow [CURRICULUM.md](./CURRICULUM.md), [UI_LAYOUTS.md](./UI_LAYOUTS.md), and
[MAINTAINABILITY.md](./MAINTAINABILITY.md). Register Chapter 8 together with its
complete content and preserve existing chapter completions.

## Selected design and build sequence

The selected generated preview is the timestamp-tray composition: published
timestamp groups on the left, open groups on the right, an explicit completeness
boundary between them, and the application's published table below. The actual
app templates define all surrounding UI; the preview does not authorize copied
page frames, extra sliders, or changed toolbar positions.

1. Build and test the immutable subscription model, canonical delivery fixture,
   snapshot modes, multiplicities, completeness, publication, and disconnect.
2. Author the complete three lecture scripts and the 4/5/7 exercise checkpoints
   below. Store teaching content separately from model and presentation.
3. Build `TimestampTrays` once, then compose it through the established lecture
   and exercise frames. Use native timestamp selection and the existing Diagram
   key; keep the same table dimensions, tray geometry, and evidence positions.
4. Wire guided prediction/reveal, rewind, playback, hints, assessment, reset,
   completion, tours, and keyboard behavior through their existing owners.
5. Register all six activities and Chapter 7 → 8 navigation, then update current
   curriculum, implementation maps, and relevant registry/progress expectations.
6. Validate model boundaries and all guided/exercise flows; compare the selected
   geometry across lectures/exercises, laptop/mobile sizes, themes, and sidebar
   states. Run relevant unit tests, browser checks, typecheck, and production build.

### Timestamp-tray visual contract

- A compact subscription strip names the subscribed relation, received progress,
  known completeness, and published boundary without equating them with freshness.
- Use a fixed two-tray footprint: one selected completed group and one selected
  pending group. Earlier/later groups are reachable with labeled native choices,
  not an ever-growing horizontal carousel or overflowing history.
- Label each tray with its logical timestamp and state. Show signed full-row
  records with Region, Orders, Total, and Diff columns, reserving stable row space.
  A progress record is separate from business rows.
- The completeness divider labels the strict boundary. A group equal to T stays
  on the pending side. Completion evidence and the app's deliberate publication
  policy are separate: a complete-but-unpublished group must be labeled honestly.
- Below the trays, one compact application table shows the consolidated result,
  its published boundary, and loading / ready / disconnected state. No client
  total changes merely because the partial group looks like a replacement pair.
- Keep the evidence caption below the shared diagram for lectures; exercises use
  the shared question region without a redundant second explanation. Preserve
  the established title, toolbar, and bottom navigation positions.
- On narrow screens, stack the same trays and change the divider orientation.
  Keep table text readable and every control keyboard-accessible; never require
  drag-and-drop or shrink an entire desktop canvas to fit.

## Purpose and scope

The learner's question is: **How do I turn a changing SQL result into a correct
live application?** The chapter closes the loop from maintained SQL to an
external consumer. Reuse earlier concepts instead of reteaching diff arithmetic,
frontier propagation, or snapshot selection as separate subjects.

By the end, a learner can initialize a client, apply signed changes, distinguish
pending delivery from a published result, justify publication with timestamp
evidence, and explain the limits of connection and progress indicators.

Deliver three lectures and three exercises; Exercise 3 is the final challenge.
Suggested total duration: 45–60 minutes, with no forced timing or score system.

| Activity | New practical task | Approximate duration |
| --- | --- | --- |
| Lecture 1: Start with a snapshot | Bootstrap an empty client and distinguish snapshot rows from later changes | 7–9 min |
| Lecture 2: Turn changes into client state | Apply retractions and replacements without corrupting the local result | 7–9 min |
| Lecture 3: Publish complete results | Separate arrival from completeness and publication | 8–10 min |
| Exercise 1: Bootstrap the live table | Choose initialization and reconstruct its result | 5–7 min |
| Exercise 2: Repair the consumer | Diagnose three faulty state-update rules | 6–8 min |
| Exercise 3: Keep the dashboard correct | Run the complete client through partial delivery, quiet progress, and disconnect | 9–12 min |

Required material uses the default signed-diff output. Output envelopes are
reference-only; they must not replace learning how result diffs work. SDKs,
WebSockets, browser deployment, connector credentials, sinks, and production
checkpoint storage are outside the required implementation.

## Shared scenario and SQL

Use the commerce domain: a live summary of open orders by region. The maintained
result is `open_order_totals(region, open_count, total)`. One group produces one
full result row, so a changed total replaces that row with a retraction and an
insertion. Use integer currency units to avoid floating-point distractions.

Reference setup, independent of any live database connection:

```sql
CREATE TABLE orders (
    order_id bigint,
    region text,
    amount bigint,
    status text
);

CREATE MATERIALIZED VIEW open_order_totals AS
SELECT region, COUNT(*) AS open_count, SUM(amount) AS total
FROM orders
WHERE status = 'open'
GROUP BY region;

-- In a client that supports incremental cursor consumption:
BEGIN;
DECLARE live_orders CURSOR FOR
    SUBSCRIBE open_order_totals WITH (SNAPSHOT = true, PROGRESS = true);
FETCH 20 live_orders WITH (timeout = '1s');
-- Repeat FETCH while consuming the subscription; COMMIT ends this session.
COMMIT;
```

The simulator never executes SQL. A real default subscription selects its own
starting timestamp; the small integers below are authored logical timestamps.
Do not add `AS OF 10` to this setup: no retained-history prerequisite is needed.
The reference can show `SNAPSHOT false` as a deliberately different startup mode.

Initial underlying orders: EU orders 1 and 2 with amounts 50 and 50; US order 3
with amount 50. At t=12, order 2 changes to 80. At t=15, the US order is canceled.
At t=18, both EU orders are canceled at that timestamp. An edit to an unused note
in a separate fixture can demonstrate that a source edit need not change a result.
An optional Chapter 5 bridge can substitute expiration for cancellation, with an
explicit temporal query and independently authored fixture; do not silently add
expiration semantics to the ordinary query above.

## Canonical delivery fixture

The lesson displays message arrival one record at a time. This is an illustrative
delivery schedule, not a claim about real packet boundaries or fixed emission
frequency. P(T) means a progress row with `mz_progressed=true` and timestamp T.
Progress rows carry no business-row diff and must never enter the result table.

| Arrival | Received record | Pending effect / permitted publication |
| --- | --- | --- |
| 1 | P(10) | Initial lower boundary; snapshot at 10 is not complete |
| 2 | t=10, +1, (EU, 2, 100) | Part of starting snapshot; loading remains visible |
| 3 | t=10, +1, (US, 1, 50) | Both authored snapshot rows arrived; still no evidence that 10 is complete |
| 4 | P(11) | Publish the snapshot: EU 100, US 50; complete before 11 |
| 5 | t=12, -1, (EU, 2, 100) | Retraction pending; published EU stays 100 |
| 6 | P(12) | Does not complete t=12; published EU stays 100 |
| 7 | t=12, +1, (EU, 2, 130) | Replacement pair is present, but t=12 could still receive more rows |
| 8 | P(13) | Publish the complete t=12 group: EU 130, US 50 |
| 9 | P(14) | No changed totals; advance publication evidence without inventing a business event |
| 10 | t=15, -1, (US, 1, 50) | US removal pending; receiving t=15 also proves times below 15 complete |
| 11 | P(16) | Publish the removal: EU 130 only; do not invent a US zero row |
| 12 | t=18, -1, (EU, 2, 130) | Last group removal pending |
| 13 | P(19) | Publish an empty result, distinct from initial loading |
| 14 | Simulated disconnect | Keep the last published result and boundary; mark disconnected/stale |

For an update-order variation, swap the two t=12 data rows without changing their
timestamp or final sum. A temporary received accumulator can have two EU versions
or negative counts. It is an internal pending calculation, not a published valid
relation. Consolidate and publish the whole complete timestamp. Never claim that
the retraction must arrive first, that a pair is one transport message, or that
the authored row count proves completeness.

## Semantic and state contract

The design must make these distinct quantities inspectable:

- **Maintained result:** the Materialize-side result at an explicitly named
  fixture timestamp; it can be ahead of client receipt.
- **Received records:** the prefix of the authored output actually delivered to
  this client, including progress records.
- **Pending changes:** signed counts grouped by timestamp and full result row.
- **Published result:** the last complete prefix deliberately applied to the
  client display; its boundary remains labeled even when newer rows are pending.

Use a pure reducer with immutable replay state. A full row is identified by all
its columns; use explicit tuple fields or a canonical tuple encoding, not a
region-only map or delimiter concatenation. Consolidation sums signed counts and
removes zero counts. Complete valid fixtures must have nonnegative multiplicities.
Publication removes rows whose multiplicity reaches zero.

Track two boundaries rather than conflating them:

1. `knownCompleteBefore`: the greatest timestamp seen on any data or progress
   record. Nondecreasing output means timestamps strictly below this boundary
   cannot receive later records. Equality remains open.
2. `publishedBefore`: the boundary through which this particular application has
   chosen to flush complete timestamps. The taught policy publishes on explicit
   progress records, applying pending timestamps strictly below that record's T.

A consumer can use a later data timestamp as completeness evidence as well.
Teach and assess that fact; the progress-only publication policy is a simple
application choice, not a database restriction. Receiving no rows supplies no new
evidence. Progress is particularly useful during quiet intervals. A progress
record may skip timestamps; never require a marker for every timestamp.

The initial P(10) does not mark the snapshot ready. In this fixture P(11) does.
Snapshot output at 10 describes state at the chosen subscription start; it is
not a replay of each row's original insertion time. `SNAPSHOT false` suppresses
that starting baseline, so an empty client misses unchanged rows. A separately
obtained baseline needs a coordinated handoff; two unrelated queries are not a
safe startup recipe.

Do not equate any of these with end-to-end freshness: network connection,
receipt of a data row, explicit progress, or publication. The progress boundary
is logical-time evidence, not necessarily current wall-clock time or proof that
an upstream external write has arrived. Keep playback indices, timestamp units,
and optional illustrative delivery delays visibly distinct.

Disconnect freezes incoming evidence. It neither empties the business result nor
proves completion of a pending group. Reset/rewind reconstruct a fixture, rather
than suggesting a real stream or frontier runs backwards. Ending a FETCH, an empty
FETCH, a timeout, and reaching a timestamp boundary are different events.

## Lecture design

All lectures use predict → inspect → explain checkpoints, existing guided-run
controls, manual exploration, and deterministic rewind. A wrong prediction leaves
the scenario unchanged until the established reveal action.

### Lecture 1: Start with a snapshot

1. Freeze a `SELECT` result; change the maintained result and observe that the
   already returned table does not update itself. Avoid a latency benchmark.
2. Start the subscription; inspect the first progress message and distinguish it
   from a business row. State the initial client result as loading, not empty.
3. Deliver the two snapshot records separately. Predict whether their historical
   source insertion times appear in this snapshot output.
4. Deliver P(11); publish the baseline and mark it ready.
5. Deliver the first subsequent change to establish that the connection continues.
6. Restart the fixture with `SNAPSHOT false`. Identify the unchanged US row the
   empty client cannot reconstruct. A preview explains the need for an existing,
   coordinated baseline without introducing a durable resume algorithm.

Exit understanding: initial state plus subsequent changes describes an ongoing
result. A default snapshot is not an event-history export.

### Lecture 2: Turn changes into client state

1. Begin from the completed baseline. Predict the changed aggregate row at t=12.
2. Inspect the old-row retraction separately from the new-row insertion. Trace
   their full tuples into pending changes and keep the published baseline stable.
3. Compare correct signed consolidation with appending every received record.
4. Replay the valid reverse order of the two data records. Explain why overwriting
   by region on each arrival is unsafe; the final complete multiset is unchanged.
5. Cancel the final US order. Show a vanished group, not `(US, 0, 0)` invented by
   the client or a retained stale US total.
6. In the separate `row_copies` relation, apply +2 and -1 to an identical row.
   Distinguish row copies, received messages, and distinct rows.

Exit understanding: these records describe result changes; they are not
append-only business events, key-value overwrite instructions, or a one-to-one
copy of source writes. Reference Chapter 2 for how SQL produces the diffs.

### Lecture 3: Publish complete results

1. Pause after the t=12 retraction. Explain why rendering that partial group can
   make the EU row briefly disappear.
2. Deliver P(12); predict whether t=12 is complete. Test boundary equality.
3. Deliver the replacement row. The authored pair is visible, but no protocol
   rule promises that only two rows will exist at that timestamp.
4. Deliver P(13); release the complete t=12 group into the published result.
5. Deliver P(14) without changed rows. Keep totals unchanged and advance evidence.
6. Contrast a quiet advancing stream with a silent stream having no new evidence.
   Do not label silence alone as a diagnosed database stall.
7. Show a later data timestamp without an intervening progress record. Ask which
   older timestamps are known complete, separately from the chosen flush policy.
8. Disconnect during a pending update. Retain the last published result, expose
   its boundary, and mark stale/disconnected. Reconnection is advanced material.

Exit understanding: arrival, completeness, and publication are separate. A
transport batch does not define a complete logical-time change.

## Exercise and feedback design

Assess both a predicted state and the evidence behind it. Use structured choices,
small numeric fields, or row selections with exact answer sets; do not require
free-text semantic grading. Each prompt has a short conceptual hint and a worked
explanation after the established Show Answer action. Wrong answers preserve
inputs and scenario position. Do not expose derived answers in the diagram.

### Exercise 1: Bootstrap the live table (four checkpoints)

1. From an empty client needing the entire current result, choose snapshot on.
2. After P(10) and one snapshot row, choose loading/incomplete rather than ready
   or a genuinely empty result.
3. After P(11), select exactly EU (2, 100) and US (1, 50), each at multiplicity 1.
4. With snapshot off and only the EU change delivered, identify the missing
   unchanged US baseline and explain the absent initialization evidence.

### Exercise 2: Repair the consumer (five checkpoints)

1. Choose signed full-row consolidation over appending every message.
2. Given both t=12 data rows and P(13), construct EU (2, 130), US (1, 50).
3. In reverse arrival order, choose the same published result; reject a client
   that erases the replacement on receiving the old-row retraction.
4. After t=15 and P(16), remove US entirely. Accept no invented zero aggregate.
5. In the duplicate-row side fixture, +2 and -1 leave one copy, not two messages
   or a count of two distinct rows. Give this fixture its own title and reset.

### Exercise 3: Keep the dashboard correct (seven checkpoints)

Start from a fresh copy of the canonical fixture with reduced guidance:

1. Publish the starting snapshot only with evidence that t=10 is complete.
2. With just the retraction at t=12, retain the published EU 100 and buffer it.
3. At P(12), keep t=12 pending: equality is not completion.
4. With both t=12 rows but no later timestamp, reject “two rows means complete.”
5. At P(13), publish EU 130; at P(14), keep the same rows but advance the boundary.
6. After receiving the data row at t=15, identify times below 15 as known complete
   while the progress-only app still displays its previously published result;
   then use P(16) to publish the US removal.
7. In a named disconnect variant after the t=18 retraction and before P(19), keep
   EU 130 visible but stale. Contrast this with an uninterrupted run through
   P(19), where a ready, empty result is correct. Explain the evidence difference.

Completion requires all checkpoints and ends through the shared chapter dialog.
The final explanation links a correct visible result to its publication evidence;
message count or apparent visual plausibility alone does not earn completion.

## Historical visualization comparisons

Timestamp trays was selected. The alternatives below record the design comparison;
they are not implementation requirements. Each preview used the same EU
replacement and three states:
retraction plus P(12) received, replacement received, and P(13) received.
The source is already at t=12; delivery can lag that maintained result.

### Stream workbench

**Composition:** three stable regions from left to right: Materialize's maintained
result at a named timestamp; a received-record ledger with timestamp buffer; and
the application's published table. Direct connectors trace the selected row.
The maintained result and published result can visibly disagree while data waits.

**Interaction:** step through arrivals; select a record to trace its pending
effect; reveal a complete timestamp together when progress passes it. Use the
same workspace for initialization, deletion, quiet progress, and disconnect.

**Strength:** connects every chapter objective in one concrete application flow;
the separation between Materialize, transport, and client is explicit.
**Tradeoff:** three regions need disciplined density on laptops. On mobile, use
the established panel selector with a persistent pending/publication summary.
Avoid becoming another Chapter 2 SQL operator graph: show consumption boundaries,
not a repeated filter/join/aggregate pipeline.

### Timestamp trays

**Composition:** a dominant strip of timestamp trays containing signed full-row
records. A labeled completeness boundary divides released older trays from open
ones; a compact published table remains underneath. A tray at the boundary stays
open even when its expected-looking pair has arrived.

**Interaction:** receive records into trays; advance the evidence boundary; inspect
which trays the application can release. Use native timestamp/record choices,
with optional pointer gestures rather than required drag-and-drop.

**Strength:** clearest explanation of timestamp grouping, strict inequality,
skipped progress markers, and the difference between pair arrival and completion.
**Tradeoff:** needs explicit source and client labels to avoid looking like an
internal database scheduler. Tray boundaries are consumer bookkeeping, not packets
or database transactions. On small screens, stack trays in timestamp order.

### Delivery timeline

**Composition:** three aligned lanes for maintained changes, records received,
and client publications. Horizontal position is illustrative delivery order, with
logical timestamps attached to each record. A shaded pending span connects the
two t=12 records to their later publication at P(13).

**Interaction:** move a playback cursor through arrivals; inspect the published
table in a fixed evidence slot; compare delivery schedules that split a timestamp
across different fetches without changing the complete result.

**Strength:** best at exposing staggered delivery, network delay, and publication
lag. The silence/progress distinction is easy to demonstrate.
**Tradeoff:** delivery order and logical time must remain explicitly separate;
do not place a progress boundary on the delivery axis as if they had the same
units. Denser than the other options; mobile uses a vertical event sequence.

### Client debugger

**Composition:** the application table is dominant. A compact incoming-record
inspector and consumer-rule panel sit beside it; pending changes and publication
boundary stay visible. Highlight the rule used by the selected arrival.

**Interaction:** switch between “Publish every row” and “Publish completed times,”
then step the same stream. The faulty client loses EU after the retraction; the
correct one retains the baseline until P(13). Later exercises diagnose append-only
and key-overwrite rules without adding permanent code-editor chrome.

**Strength:** most tangible payoff and strongest debugging exercise. Learners see
the user-facing consequence of a faulty consumer immediately.
**Tradeoff:** can suggest a coding course or distract from completeness. Use
short pseudocode and accessible labels; no executable language prerequisite.
Preserve a real pending region so the result does not look like a magic update.

### How to choose

| If the priority is… | Best starting concept |
| --- | --- |
| The clearest complete journey from SQL result to application | Stream workbench |
| Understanding why a timestamp must remain pending | Timestamp trays |
| Seeing how delivery timing differs from result time | Delivery timeline |
| Understanding and fixing a visibly broken live application | Client debugger |

The original recommendation was Stream workbench; the user selected Timestamp
trays instead. The selected composition is specified at the start of this plan.
Previews compare one partial-update scenario and do not define production page
frames or a chapter-overview illustration.

## Presentation contract

- Reuse `LectureScreen` with `layout="without-tip"`, `LectureWorkspace`,
  `GuidedLabScreen`, `ExerciseFrame`, and `useExerciseStages` through their current
  interfaces. Keep shared controls, SQL & Objectives, tours, and completion.
- Inspect Chapter 7's current lectures/exercises and Chapter 2's table/record
  patterns in the running app before implementation. Shared frames and controls
  follow existing owners; the new chapter owns visualization content only.
- Use one renderer and common geometry for every lecture and exercise. Equivalent
  headings, tables, timestamp labels, pending regions, and publication boundaries
  retain their placement; hints and feedback do not move the diagram or footer.
- Reuse semantic theme tokens, signed-diff and frontier vocabulary, typography,
  tables, and native keyboard controls. Pair color with text/sign/shape. Keep
  numeric values aligned; use reduced-motion support and no looping packet motion.
- Label a progress marker `Complete before T`; label the application's boundary
  `Published before T`. A timestamp group equal to T remains open. Do not call a
  timestamp a message number or turn progress into a fake business row.
- Show loading, ready empty, pending, and stale/disconnected as distinguishable
  states. A published table remains stable while a pending group is incomplete.
- Fit at 1280×640 and standard laptop widths with the usual sidebar; exercise
  prompt, answer, evidence, and navigation stay reachable. Use existing responsive
  flow for narrow or short windows. Do not shrink typography or scale the page.
- Before releasing, compare actual panel/control bounds across all six activities,
  both themes, sidebar states, feedback states, and reduced motion. Concept
  previews do not override the production templates' layout requirements.

## Implementation map and integration sequence

Keep chapter-local code under `src/chapters/live-applications-subscribe/`:

| Owner | Responsibility |
| --- | --- |
| `simulation.ts` | Typed data/progress arrivals, tuple multiplicities, pending groups, completeness knowledge, publication, and replay |
| `lecture-scenarios.ts` | Three guided scripts and prediction/reveal checkpoints |
| `exercise-scenarios.ts` | The 4/5/7 checkpoint sets, accepted states, hints, and worked explanations |
| `TimestampTrays.tsx` | One renderer, native group selection, pending/published labels, and accessible descriptions |
| `SubscribeLecture.tsx`, `SubscribeExercisePage.tsx` | Existing template composition and chapter-local state plumbing |
| `resources.ts`, `lessonText.ts`, `chapter.css`, `README.md` | SQL, objectives, references, local layout, and implementation map |

Do not turn the four proposals into four implementations. Name the renderer after
the chosen concept. Extend an existing shared utility only if its semantics match;
reuse Chapter 1's multiplicity concepts without copying its entire simulator or
assuming its authored complete batches are actual stream delivery units.

1. Record the selected Timestamp trays composition and lock one canonical fixture.
2. Implement the pure model and its meaningful boundary/replay tests first.
3. Implement the chosen shared renderer and Lecture 1 using the established frame;
   verify its rendered layout against the existing reference pages.
4. Add the remaining lectures, three exercises, shared hints, tours, and completion.
5. Register Chapter 8 in `chapterRegistry.ts`, `chapterOutline.ts`, and the router;
   add its real activity paths and next/previous navigation through shared owners.
6. Promote the curriculum heading from `Planned Chapter 8` to `Chapter 8` when
   implemented. Update registry tests to eight core chapters and check old invalid
   route expectations for `/labs/live-applications-subscribe`.
7. Change Chapter 7 completion from learning-path return to the next chapter through
   existing shared behavior. Verify persisted completions remain valid when the
   denominator becomes eight; do not erase earlier chapter progress.
8. Update walkthrough content, current implementation maps in `UI_LAYOUTS.md`, and
   Chapter 7's README statement that the shipped course ends there. Keep historical
   plans labeled historical where needed, rather than rewriting every old note.

No new dependency or overview image is required to validate the teaching design.
Choose the chapter-overview illustration separately after the main visualization.

## Validation and completion criteria

Meaningful model tests must cover full-row multiplicities, aggregate replacement
in either valid within-timestamp order, zero removal, an actually empty result,
initial progress, a partial snapshot, equality at P(T), skipped progress times,
later-data completeness evidence, publication restricted to complete groups, quiet
progress, disconnect with pending rows, and deterministic reset/rewind.

Browser coverage must walk every guided checkpoint and all three exercises, check
wrong answers and hint/reveal/reset behavior, verify keyboard and motion behavior,
and exercise Chapter 7 → Chapter 8 → learning path navigation. Include empty versus
loading states, stale display, both themes, sidebar changes, and layout alignment.
Use the existing test and browser tooling; do not test superficial implementation
details or add a separate screenshot framework.

The chapter is complete when each objective is taught and assessed, the final
challenge requires a correct result and correct publication evidence, all six
activities reuse the selected design, existing progress is preserved, and the
relevant unit/browser/type/build checks pass. A convincing animation alone is not
the acceptance criterion.

## References and advanced extension

Official documentation checked 2026-10-24; recheck syntax and feature availability
when implementation begins:

- [SUBSCRIBE: output](https://materialize.com/docs/sql/subscribe/#output)
- [Snapshot behavior](https://materialize.com/docs/sql/subscribe/#snapshot)
- [Progress semantics](https://materialize.com/docs/sql/subscribe/#progress)
- [Cursor consumption](https://materialize.com/docs/sql/subscribe/#subscribing-with-fetch)
- [SELECT and SUBSCRIBE](https://materialize.com/docs/serve-results/query-results/)
- [Durable subscriptions](https://materialize.com/docs/serve-results/durable-subscriptions/)

Durable recovery is an advanced follow-up for the recovery capstone. It needs
retained history, a correct resume boundary, and durable coordination between
effects and checkpoints. History retention is currently private preview. Do not
promise replay or exactly-once external effects from a normal reconnect. Required
exercises end with accurate disconnect awareness; they never depend on preview
access, resume arithmetic, or an invented automatic recovery protocol.
