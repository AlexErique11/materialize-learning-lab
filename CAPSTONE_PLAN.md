# Final capstone: Live Order Operations

Status: historical specification for the guided first version, preserved at
commit `da81e4d` on `challenge-first-version`. The current implementation follows
[the second-version plan](./CHALLENGE_SECOND_VERSION_PLAN.md). The 10–20 minute
duration remains a learner-testing estimate.

The implemented second version replaces the guided checkpoints with an open
investigation. See [the second-version plan](./CHALLENGE_SECOND_VERSION_PLAN.md).

Navigation decision: the platform has one challenge, opened directly through
**main page → Challenge** at `/challenge`. There is no challenge catalog or
planned-challenge list. This supersedes the earlier catalog proposal and Chapter 8
handoff and chapter-sidebar link below. The challenge has its own workspace and
progress; the learning sequence remains separate.

## 1. Product decision

Build one continuous incident simulation after Chapter 8: **Live Order Operations — Save the Flash Sale**. The learner is the engineer responsible for making an operational dashboard trustworthy before the next sale wave. They repair data interpretation, choose maintained objects, fix a recent-orders query, diagnose stalled progress, choose a read policy, and repair the live client.

Target **16 minutes**, with a normal range of **10–20 minutes** for someone who has completed the lectures. This is a suggested duration, not a countdown or pass condition. The learner can pause, inspect evidence, revisit lectures, and resume later.

Live Order Operations is the only challenge. Its canonical URL is `/challenge`;
earlier `/challenges` and `/challenges/live-order-operations` links redirect there.
Chapter 8 is the recommended prerequisite. Durable recovery and downstream
delivery require additional teaching and are outside this exercise.

Interpret “at the end of the chapters” as one finale combining all eight chapters. Existing chapter exercises remain the shorter practice activities.

### Success criteria

The learner finishes with a simulated system that:

1. Represents the latest value of each order exactly once.
2. Maintains paid orders in the specified five-minute event-time window.
3. Shares one maintained aggregate across two serving clusters within a stated illustrative budget.
4. Distinguishes input progress, computation progress, query latency, and client publication.
5. Handles the product's freshness requirement explicitly, including a visible unavailable state.
6. Publishes a correct initial client baseline and complete subsequent changes.

No Materialize account, credentials, backend, arbitrary SQL engine, or paid service is required. The browser runs the same kind of deterministic simulation as the existing chapters.

## 2. Learner brief and business requirements

Show this opening message:

> You are supporting Northstar Shop's flash sale. Operations uses a live dashboard to decide where to assign staff. The dashboard is counting some orders twice, showing cancelled orders, and occasionally flashing an empty region. Support also reports that a fast response does not always contain recent data. You have inherited the pipeline. Inspect the evidence, repair it, and hand over a dashboard the team can trust.

The persistent mission brief defines the requirements before the learner makes choices:

| Requirement | Observable acceptance condition |
| --- | --- |
| Latest orders | Kafka publishes full replacement values keyed by stable `order_id`; order updates must replace prior values. |
| Relevant orders | Include only `status = 'paid'`, with `event_at <= logical time < event_at + 5 minutes`. |
| Correct totals | Join each order to its customer and group by the customer's current region; count orders and sum their amounts. All amounts use one currency. |
| Shared serving | Operations and support run on separate serving clusters; both need a local indexed serving path to the same maintained final result. |
| Resource limit | At most eight illustrative state units, under the explicitly provided object-cost model. |
| Normal freshness | The operations read may use a snapshot at most three seconds old; if unavailable, report that condition instead of silently showing older data as current. |
| Incident fallback | Operations permits an explicitly labeled ten-second snapshot-age bound while the pipeline catches up. |
| Live display | A fresh client starts from a complete baseline and never publishes part of a logical timestamp. |

“Snapshot age” is a logical-time measurement, not a guarantee that every recent external business event has already arrived. Keep upstream delivery evidence separate throughout the exercise.

The learner receives a populated system, a short incident ticket, inspectable tables and logs, and constrained configuration controls. They do not write boilerplate SQL or invent connector configuration from memory.

## 3. Journey and timing

| Stage | Target | Learner action | Main chapters |
| --- | ---: | --- | --- |
| Briefing | 1 min | Read requirements and inspect the broken dashboard. | Orientation |
| 1. Repair the feed | 2 min | Inspect the producer contract and select the envelope and identity. | 1, 4 |
| 2. Place maintained state | 2 min | Configure objects and serving indexes within the budget. | 3 |
| 3. Make the result correct | 3 min | Complete the filter; predict an aggregate update and time-based changes. | 1, 2, 5 |
| 4. Find the delay | 2 min | Select the limiting dependency, evidence, and intervention. | 6 |
| 5. Serve an honest snapshot | 2 min | Select a read policy and handle the stale result explicitly. | 7 |
| 6. Repair the live client | 3 min | Establish a baseline and publish a split update at the right boundary. | 1, 8 |
| Handover | 1 min | Run acceptance checks and review the incident summary. | All |
| **Total** | **16 min** | Six connected checkpoints, approximately 10–12 compact decisions. | |

Reading speed and retries account for the 10–20 minute range. Stage 3 uses a batch of short probes rather than five separate question screens. Optional exploration and lecture review can exceed 20 minutes without failure.

## 4. One canonical scenario

### Data and clocks

Use two source-backed relations:

```text
customers(customer_id, region)
orders(order_id, customer_id, status, amount, event_at)
```

Customers come from a native PostgreSQL source whose initial snapshot has already completed. Customers 1 and 2 map to EU and US respectively. Each customer ID has exactly one row in this fixture. Orders come from a Kafka producer that sends full replacement values under a stable order-ID key. Do not present Kafka envelope choices as options for the native PostgreSQL connector.

Store logical times as integer milliseconds relative to a fixed UTC fixture origin. Display seconds since that origin, preserving three decimal places at boundary questions. Convert `event_at` to a real timestamp relative to the same origin in SQL references. Playback steps and learner elapsed time are separate clocks.

At logical time 600 seconds, the correctly ingested orders are:

| Order | Customer | Status | Amount | Event time | Expires |
| --- | --- | --- | ---: | ---: | ---: |
| 101 | 1 / EU | paid | 40 | 540 s | 840 s |
| 102 | 1 / EU | paid | 60 | 570 s | 870 s |
| 103 | 2 / US | paid | 25 | 310 s | 610 s |

The correct initial aggregate is `(EU, 2, 100)` and `(US, 1, 25)`, with one copy of each full result row. For the initial broken-feed preview, the retained producer log also contains the earlier value of order 101 with amount 30. Append-only interpretation retains both 30 and 40 and incorrectly shows `(EU, 3, 130)`.

### Required event script and answer oracle

All times below describe logical application time. This fixture deliberately aligns delivery with application except where source progress is paused. “No output change” never means that an input record was not ingested.

| Time | Event | Correct aggregate after the complete timestamp |
| --- | --- | --- |
| 600 s | Baseline above | EU: 2 / 100; US: 1 / 25 |
| 601 s | Replace order 101 amount 40 with 70 | EU: 2 / 130; US: 1 / 25 |
| 602 s | Replace order 102 status with `cancelled` | EU: 1 / 70; US: 1 / 25 |
| 603 s | Late order 104: customer 1, paid, 20, event time 320 s | EU: 2 / 90; US: 1 / 25; order 104 has 17 s remaining |
| 604 s | Late order 105: customer 2, paid, 15, event time 290 s | Unchanged; order 105 already expired at 590 s |
| 605 s | Future order 106: customer 2, paid, 35, event time 620 s | Unchanged; order 106 is not eligible yet |
| 610 s | Advance logical time; no source record | EU: 2 / 90; US group disappears when order 103 expires |
| 620 s | Advance logical time; no source record | EU: 1 / 70; US: 1 / 35; order 104 expires as order 106 enters |
| 630–631 s | Diagnose progress, read, then complete catch-up | Same values; freshness evidence changes |
| 632 s | Replace order 101 amount 70 with 90 | EU: 1 / 90; US: 1 / 35 |

At 601 s the aggregate diff is `-(EU, 2, 100)` and `+(EU, 2, 130)`. At 602 s it is `-(EU, 2, 130)` and `+(EU, 1, 70)`. At 610 s it is only `-(US, 1, 25)`; the query does not invent a zero-valued US row. At 620 s it is `-(EU, 2, 90)`, `+(EU, 1, 70)`, and `+(US, 1, 35)`.

Keep this table as the hand-reviewed test oracle. Generate displayed tables, diagrams, and records from the simulation; do not maintain unrelated hardcoded versions of the same dashboard in different panels.

## 5. Checkpoint specifications

### Checkpoint 1 — Repair the feed

**Ticket:** “A price correction appears to create another order.”

**Evidence:** Show the Kafka key/value contract, the two values for order 101, the current append-only relation, and its inflated EU total. Offer a customer-source inspector that states its initial database snapshot is complete.

**Task:** Choose `NONE`, `UPSERT`, or `DEBEZIUM`, then select the identity: order ID, customer ID, or a changing field such as status. Require one evidence selection: “same order key, full replacement value.”

**Accepted repair:** UPSERT with the producer's stable order-ID key. Both order 101 values represent one evolving order. The repair action explicitly rebuilds the simulated source relation from the retained record log. This is a sandbox replay, not a claim that an existing source can be repaired by flipping a setting in place.

**Consequences:** NONE leaves the duplicate. Customer-ID identity collapses distinct orders from the same customer. DEBEZIUM does not match this producer's message contract. The preview shows exactly which rows become incorrect.

**Feedback example:** “These two messages describe versions of order 101. Keeping both increases the order count. Use the producer's order key to replace the previous value.”

**Completion:** Source relation equals the three initial orders and the learner identifies why the stable key matters. The rest of the pipeline remains visibly unverified until its checkpoints pass.

### Checkpoint 2 — Place maintained state

**Ticket:** “Operations and support need independent serving capacity. We cannot maintain every intermediate result.”

**Evidence:** A small object map: orders + customers → paid/recent-orders helper → regional totals → operations and support. Label clusters `transform`, `operations`, and `support`.

**Task:** Assign an object type to the helper and final aggregate; place local serving indexes. Use select controls on the diagram with a keyboard-equivalent list, not mandatory drag-and-drop.

**Budget card:** Regular view: 0 state units; materialized result: 4; each maintained index: 2. This is a deliberately simplified teaching budget, not memory sizing, measured performance, or Materialize pricing. Only these choices count; source storage and cluster base costs are outside the model.

**Accepted design:** Regular helper view; final materialized view maintained on `transform`; one index on that final result in each serving cluster. Total: 8 units. Accept any configuration that satisfies the explicit semantic requirements and budget, rather than grading visual placement order.

**Consequences:** An index in operations does not provide support with a local index. Materializing the helper as well raises the cost to 12. A plain final view without maintained state fails the stated maintained-result requirement. Show the actual missing requirement; do not claim every alternative architecture would be invalid in production.

**Completion:** Shared durable output, both local serving paths, and budget pass. Amounts are provisional until the next checkpoint verifies query semantics. This state-location model follows the [views documentation](https://materialize.com/docs/fundamentals/concepts/views/).

### Checkpoint 3 — Make the result correct

**Ticket:** “Cancelled orders remain visible, and future-dated orders appear too early.”

**Task A:** Fill three constrained SQL decisions: paid-status filter, lower time bound, exclusive upper time bound. Keep the join and aggregation supplied. Show a live SQL preview; do not grade free text or SQL formatting.

Reference query after acceptance:

```sql
CREATE VIEW recent_paid_orders AS
SELECT o.order_id, o.amount, c.region
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.customer_id
WHERE o.status = 'paid'
  AND mz_now() >= o.event_at
  AND mz_now() < o.event_at + INTERVAL '5 minutes';

CREATE MATERIALIZED VIEW regional_order_totals IN CLUSTER transform AS
SELECT region, COUNT(*) AS orders, SUM(amount) AS total
FROM recent_paid_orders
GROUP BY region;

CREATE INDEX regional_totals_ops IN CLUSTER operations
ON regional_order_totals (region);

CREATE INDEX regional_totals_support IN CLUSTER support
ON regional_order_totals (region);
```

Connections, source DDL, grants, and production sizing stay outside the exercise. The SQL panel states that these statements illustrate the configured model and are not executed. Syntax references are [temporal filters](https://materialize.com/docs/transform-data/patterns/temporal-filters/), [CREATE MATERIALIZED VIEW](https://materialize.com/docs/sql/create-materialized-view/), and [CREATE INDEX](https://materialize.com/docs/sql/create-index/); recheck them during implementation.

**Task B:** Choose the signed aggregate replacement at 601 s, then classify a compact event batch: cancellation removes a contribution; the partially late order appears temporarily; the expired order never appears; the future order waits until its event time. Finally select the result at 620 s. Reveal the intervening 610 s transition in the same timeline, including the removed US group.

**Consequences:** Missing the lower bound shows order 106 early. Using arrival time grants late order 104 a new five-minute lifetime. An inclusive upper bound retains a row at its exact expiration. Adding a changed aggregate without retracting its old full row leaves two aggregate rows.

**Completion:** Predicate, aggregate diff, and final relation agree with the oracle. Time-driven removals affect the result, not source-table membership. Use integer amounts and small row counts so arithmetic does not dominate the exercise.

### Checkpoint 4 — Find the delay

**Ticket:** “The page responds quickly, but the pipeline is seven seconds behind.”

At wall-clock offset 630.000 s, show these diagnostic values:

| Object | Write frontier | Supporting evidence |
| --- | ---: | --- |
| Orders input | 630.001 s | Progress is advancing. |
| Customers input | 623.000 s | Progress has stopped; connector log reports a paused connection. |
| Regional aggregate | 623.000 s | It has reached the current input limit. |
| Operations serving index | 623.000 s | It has reached the aggregate's current frontier. |

Show a simulated 40 ms serving duration separately from these frontiers. A quiet customer table alone would not establish a fault; the stalled progress and connection evidence do.

**Task:** Select the limiting dependency, select the relevant evidence, and choose the intervention: resume the customer connection, increase serving capacity, refresh the browser, or change the time window.

**Accepted action:** Resume the paused customer connection. Then ask whether downstream output is necessarily caught up immediately; the correct answer is no.

**Consequence:** The customer frontier advances to 630.001 s. The aggregate and index remain at 623.000 s until the explicit compute/catch-up event in checkpoint 5. This separates permitted progress from completed processing. Wrong interventions leave the same limiting frontier in the preview.

**Completion:** Correct dependency, evidence, and intervention; learner recognizes the next stage still needs to process. Frontier evidence follows [freshness troubleshooting](https://materialize.com/docs/transform-data/freshness-troubleshooting/).

### Checkpoint 5 — Serve an honest snapshot

**Ticket:** “Operations needs a usable response while the fix catches up. Do not label stale data as current.”

The inspection query reads regional totals alongside the orders relation at one logical moment. At wall time 630.000 s, its physical read inputs expose:

| Read input | Retained from | Complete strictly before |
| --- | ---: | ---: |
| Operations aggregate index | 600.000 s | 623.000 s |
| Orders read input | 610.000 s | 630.001 s |

The shared immediately readable interval is `[610.000, 623.000)` seconds. The latest eligible millisecond is 622.999 s, aged 7.001 s. The index's retained history is a snapshot constraint, not the five-minute business window. These retained bounds are supplied teaching-fixture assumptions, not default retention promises or instructions to configure history retention.

**Task:** Choose the normal three-second bounded-staleness policy, observe that it cannot be satisfied, and choose an honest response: show unavailable or use the ticket-authorized ten-second fallback with its age clearly labeled. Both are valid operational choices. Require the learner to recognize why the fallback can serve 622.999 s and why 623.000 s is not complete yet.

**Comparison panel:** A fixture-assigned strict read target of 630.000 s waits. Serializable alone does not enforce the product's maximum age. Do not imply all strict reads select wall-clock time or that bounded staleness guarantees a particular network/query duration. The policy behavior follows [isolation levels](https://materialize.com/docs/serve-results/isolation-level/); the interval follows [EXPLAIN TIMESTAMP](https://materialize.com/docs/sql/explain-timestamp/).

**Recovery:** Advance the explicit catch-up event, moving the aggregate and index frontier to 630.001 s. Issue a new read under the normal three-second bound; it can return at 630.000 s. A failed bounded read is not retroactively changed into a success.

**External-write evidence:** Show a producer-side cancellation that has not yet been sent to Kafka as an isolated, labeled “what if” evidence card. The correct conclusion is that transaction consistency alone cannot promise its visibility. It does not enter the main event script or alter its expected totals.

**Completion:** Valid read behavior during the incident and after catch-up, plus recognition of the separate external-ingestion boundary. The [isolation documentation](https://materialize.com/docs/serve-results/isolation-level/) is supporting reference, not a requirement to memorize settings syntax.

### Checkpoint 6 — Repair the live client

**Ticket:** “The dashboard flashes an empty EU region during an amount correction.”

The source, maintained query, and serving path now work. Start a fresh live client at 631.000 s. Its starting result must be EU: 1 / 70 and US: 1 / 35.

**Task A:** Choose a subscription with the initial snapshot enabled and progress enabled. In this simulation the client publishes only on explicit progress records. A snapshot-free stream with no coordinated baseline cannot reconstruct the current result. Show reference SQL `SUBSCRIBE regional_order_totals WITH (SNAPSHOT = true, PROGRESS = true);`.

**Task B:** Inspect these deliveries; choose when to publish and the correct final application rows:

| Delivery | Correct client behavior |
| --- | --- |
| P(631.000), then snapshot data at 631.000 | Keep baseline pending. |
| P(631.001) | Publish EU: 1 / 70 and US: 1 / 35; baseline ready. |
| At 632.000: `-(EU, 1, 70)` | Buffer; keep the published dashboard unchanged. |
| P(632.000) | Continue buffering changes at 632.000. |
| At 632.000: `+(EU, 1, 90)` | Keep buffering even though the replacement pair appears complete. |
| P(632.001) | Publish EU: 1 / 90 and US: 1 / 35 atomically. |

Use full-row identity `(region, orders, total)` and signed multiplicities, matching Chapter 8. Fetch boundaries do not close a timestamp. This client uses progress for publication even though later data can also establish completeness knowledge. Protocol reference: [SUBSCRIBE output, snapshots, and progress](https://materialize.com/docs/sql/subscribe/).

**Consequences:** Publishing the retraction immediately briefly removes EU. Ignoring negative diffs leaves the previous aggregate. Publishing at equal progress treats an open timestamp as complete. The failure preview contrasts the incorrect application with the maintained result using the same delivered records.

**Completion:** Correct baseline, buffering rule, publication boundary, and final rows. An optional ungraded disconnect probe marks the last published table stale; it makes no replay or exactly-once guarantee and is outside the 16-minute core.

## 6. Interaction, feedback, and assessment

Use a repeated work loop: **inspect evidence → choose a repair → simulate its effect → apply a valid repair → continue**. The main action is “Test repair”; after acceptance it becomes “Apply and continue.” Configuration inputs remain editable after a failed attempt.

Wrong choices produce deterministic, reversible consequence previews from the checkpoint's entry state. They do not corrupt the canonical incident or force later tasks into impossible states. Applying an accepted choice commits it and its event sequence. Trying another choice restores the checkpoint preview; label this as replay, never as real frontiers moving backwards.

The six stages share one storyline and committed state, but their answer controls change with the work: source configuration, object assignment, query clauses, evidence selection, read policy, and client publication. Avoid turning the experience into six visually identical multiple-choice quizzes.

Each checkpoint supplies:

- A concise incident request and a visible definition of success.
- Inspectable evidence that justifies the decision; no hidden operational facts.
- Feedback tied to the failed invariant, with before/after rows or frontier evidence.
- Hint 1 pointing to evidence; hint 2 naming the relevant concept.
- “Show worked repair,” which demonstrates the consequence and marks that checkpoint assisted.
- A link to the exact relevant chapter activity; returning resumes the challenge.

Hints and retries do not deduct points. Record per-checkpoint `passed`, `usedHints`, and `usedWorkedRepair` separately. A run is **completed independently** when all six pass without a worked repair; hints are disclosed in the recap. A run using a worked repair is **completed with walkthrough**. Both can finish, but the recap must not imply independent mastery. No score threshold, speed bonus, leaderboard, or permanent failure state is needed.

Accept semantic equivalents: valid object graphs within the defined budget; any retained, complete timestamp satisfying the bound where the prompt permits one; either honest incident response. Require exact evidence only where the task names the evidence needed. Reject incomplete required choices with field-level feedback before evaluating.

### Handover and acceptance report

“Run acceptance checks” replays the canonical event trace using the learner's committed configuration and validates all six requirements. Show failures with a direct “Review checkpoint” link. Completion is recorded only after every requirement passes or its worked repair has been explicitly applied.

The final report contains the configured source identity, object graph and budget, chosen temporal predicate, root cause and evidence, incident/normal read behavior, final published table, and assistance used. Each finding links back to a relevant lecture or exercise. At 632.001 s the application shows EU: 1 / 90 and US: 1 / 35 with no pending 632.000 changes.

If the learner edits an earlier accepted configuration, reopen that checkpoint and invalidate downstream results within the current run. Retain previously earned completion as a historical achievement, clearly separate from the replay's status. Provide “Retry this checkpoint,” “Replay challenge,” and “Return to learning path.” Replaying does not erase chapter progress.

## 7. Workspace and visual design

Reuse the platform's typography, design tokens, panels, tables, SQL & Objectives dialog, buttons, focus treatment, light/dark themes, and reduced-motion behavior.

```text
Home / Challenge
Save the Flash Sale             Checkpoint 3 of 6       Saved
Brief / SQL & Objectives        Hint      Test repair

Orders + Customers -> Maintained result -> Serving -> Live client
                       selected stage

Evidence and simulation                 Incident task
Relevant rows / timeline / frontiers     Decisions and explanation
Before / after preview                  Result of latest test

Incident log                            Apply and continue
```

The pipeline strip is persistent orientation, not a second independently editable graph. Indicate verified, failing, and unverified stages with icons and text. Do not initially color every untouched subsystem healthy.

Show only the stage's relevant evidence, with a “System overview” inspector for the rest. Reuse Chapter 6 progress lanes, Chapter 7 readable-window vocabulary, and Chapter 8 timestamp trays where their component contracts fit. Keep any adapted visualization's labels and boundary rules consistent with its chapter.

On wide screens, place evidence beside the task. On narrow screens, use Evidence / Task / Dashboard selectors; preserve answers on tab switches and allow normal document scrolling. Keep the primary action reachable without hiding evidence or shrinking text. Show the current checkpoint and save state in both arrangements.

Accessibility requirements: all decisions work with native keyboard controls; diagram actions have equivalent labeled controls; feedback is announced politely; focus moves to the checkpoint title on progression and returns correctly from dialogs. Color and animation are supplementary. Respect reduced motion and test 200% zoom. No decision has a real-time deadline.

Do not add new artwork or runtime charting libraries for the first version. Existing HTML/SVG visualization patterns and Lucide icons are sufficient.

## 8. Integration into the current platform

### Platform boundaries

- `src/challenges/challengeRegistry.ts` defines one challenge and its canonical `/challenge` URL.
- `src/pages/LearningPathPage.tsx` opens the incident directly from its singular Challenge card.
- The old catalog and planned-challenge pages are removed; previous entry URLs redirect to the incident.
- Chapter completion stays separate in `src/chapters/ChapterCompletionPanel.tsx`.
- `src/progress/labProgress.ts` validates only known chapter-activity paths and counts eight core chapters.
- `ExerciseFrame`, `GuidedLabScreen`, and `LearningAreaLayout` require chapter context. Challenge routes currently sit directly under `AppShell`.
- Chapter simulators are intentionally local. `src/domain/README.md` permits sharing pure semantics when there is an actual second consumer.

### Planned changes

| Area / file | Concrete implementation |
| --- | --- |
| `src/challenges/challengeRegistry.ts` | Define the single challenge's canonical URL, legacy aliases, title, duration, and recommended prerequisite. |
| `src/challenges/ChallengePage.tsx` | Removed: the canonical route renders the incident directly. |
| `src/challenges/live-order-operations/` | Own the feature page, scenario content, reducer, grading, panels, reference links, and local styles. Suggested modules below. |
| `src/pages/ChallengesPage.tsx` | Removed: there is no catalog. |
| `src/pages/LearningPathPage.tsx` | Show one Challenge card with its incident summary, 10–20 minute duration, and Start / Resume / Review action. All links open the incident directly. |
| `src/chapters/ChapterCompletionPanel.tsx` | Keep chapter completion separate. The user selected direct entry through Challenge on the main page. |
| `src/components/layout/ChapterSidebar.tsx` | Keep chapter navigation separate. The challenge has no chapter-sidebar entry. Core-chapter progress stays at eight. |
| `src/challenges/ChallengeWorkspace.tsx` | Compose a challenge frame from existing shared primitives. Own mission controls and checkpoint navigation without creating a fake ninth chapter. |
| `src/progress/challengeProgress.ts`, `src/hooks/useChallengeProgress.ts` | Persist resumable runs and achievements separately from chapter activity paths. Reuse the existing external-store subscription pattern where useful. |
| `src/app/router.tsx`, `staticRoutes.ts` | Render `/challenge` directly and redirect previous entry URLs. Stage belongs to saved run state. Verify direct load, refresh, base-path deployment, title, and generated route metadata. |
| `src/pages/FaqPage.tsx`, `README.md`, `CURRICULUM.md`, `UI_LAYOUTS.md` | Document challenge availability, browser-local resume, assistance labels, separate completion, and the new frame owner when shipped. |

Prerequisites are advisory: display “Recommended after Chapters 1–8” and links to unfinished chapters, but allow experienced users to start directly. Missing chapter completion never locks the challenge or silently marks chapters complete.

Do not mount `LearningAreaLayout` on a challenge URL: it expects a valid chapter slug. Reuse existing UI primitives directly, and only extract a chapter-neutral part of `GuidedLabScreen` if actual duplication warrants it. Preserve its current chapter API and regression-test callers if extracted. `ExerciseFrame`'s answer-acceptance and chapter-completion hooks do not govern capstone achievement.

### Feature module boundaries

```text
src/challenges/live-order-operations/
  LiveOrderOperationsPage.tsx    # brief, run, handover orchestration
  scenario.ts                    # producer log, event script, requirements, stage copy
  simulation.ts                  # immutable source/query/clock/progress transitions
  grading.ts                     # requirements and misconception-specific feedback
  useChallengeRun.ts             # draft/preview/apply, replay, persistence adapter
  ChallengeEvidence.tsx          # stage-specific evidence composition
  ChallengeDecisions.tsx         # controlled inputs for the six stages
  ChallengeReport.tsx            # acceptance and learning recap
  resources.ts                   # reference SQL and verified documentation links
  challenge.css                 # feature-owned workspace arrangements
  simulation.test.ts
  grading.test.ts
```

Split large panels further only when they have independent responsibilities. Keep learning copy outside reducers and browser APIs outside pure simulation. No generalized challenge-authoring framework is necessary for a single implemented capstone.

For reusable semantics, audit existing `simulation.ts` files first. The Chapter 8 full-row consolidation and subscription reducer are strong candidates for a small shared `src/domain/subscription.ts` extraction with both consumers updated. The Chapter 7 interval calculation can likewise be reused as a pure helper. Keep chapter-specific fixtures, copy, and timing assumptions local. Do not connect independent chapter playback hooks as if they were one consistent engine.

## 9. State, replay, and persistence contract

Suggested conceptual state (final TypeScript types should use explicit unions for each stage):

```text
ChallengeRun
  schemaVersion, scenarioVersion, runId, challengeSlug
  stageId, status: briefing | active | handover | completed
  committedConfiguration
  committedActions[]
  draftAnswersByStage
  assessmentsByStage: attempts, hintsUsed, workedRepairUsed, accepted
  activeDurationMs
  savedAt

DerivedSimulation
  sourceRelations, logicalTime, wallClock
  maintainedRows, signedChanges
  sourceFrontiers, aggregateFrontier, servingFrontier, retainedBounds
  readAttempts
  subscription: pending, published, knownCompleteBefore, publishedBefore, ready
```

Persist canonical actions, configuration, drafts, and assessment metadata; derive simulation values through deterministic replay. Store checkpoints as event positions rather than duplicating independently mutable copies of every table. A tested failed draft is a preview and does not enter the committed event log.

Use a versioned key such as `materialize-learning-lab-challenges-v1`. Persist accepted actions, draft edits, hints, and stage changes. Do not depend on `beforeunload` to save. Use lightweight debouncing for typing only, flush on blur/navigation where controlled, and save discrete choices immediately. If storage fails, continue in memory and visibly report that progress will not survive closing the tab.

Validate loaded data before replay: known challenge/scenario versions, stage/action IDs, bounded arrays, legal transitions, and configuration values. Invalid data opens a recoverable restart state rather than crashing. A scenario-version mismatch preserves the historical completion record but starts a new run with a clear explanation; migrate only when semantics are compatible.

Keep current-run status separate from historical achievements, including assistance and scenario version. “Restart challenge” resets only the active capstone run after confirmation; it does not erase completed chapters or past achievements. Checkpoint retry needs no destructive confirmation.

Use storage events to synchronize the active run and achievements across tabs automatically. Returning opens the latest saved checkpoint and drafts directly, without a loading choice. Each action updates the current saved run; separate event histories are not merged. Offer an explicit restart from the beginning while preserving achievements and chapter progress. No server sync or analytics backend is part of this feature.

Track active elapsed time only while the challenge is visible and active; pause it in hidden tabs and reference/review states. Timing is informational and never drives simulation events or achievement.

## 10. Simulation invariants and content guardrails

- Latest-value ingestion uses the producer key, while result diffs use full result-tuple identity. These are different concepts.
- Aggregate rows come from the current joined, filtered order relation. A cancelled order remains in the source but no longer contributes.
- Compute incremental before/after deltas for affected rows/groups; compare their results against an independent full recomputation in tests. Do not claim the UI is executing Materialize's internal dataflow engine.
- Temporal boundaries are `[event_at, event_at + 300000 ms)`. Apply all changes at a timestamp before presenting its completed result.
- Quiet sources may advance. Lack of business rows alone neither proves stalling nor completeness.
- Actual downstream progress cannot exceed permitted input progress and need not equal it immediately. Include the temporal operator's logical-clock eligibility when deriving result progress.
- In the single-timeline teaching model, a read requires `max(retained) <= T < min(write)` across its physical inputs. Never mix rows from different selected moments.
- Bounded reads either find an eligible snapshot or fail without waiting for input progress. Query execution duration is a separate measurement.
- Pending client changes are not published results. Full-row multiplicities consolidate; zero counts disappear; a complete baseline-backed relation cannot have negative counts.
- Explicit named replay can restore earlier simulation state. Within one continuous execution, frontiers and received timestamps never move backwards.
- All resource units, processing delays, and serving durations are labeled illustrative. Do not make measured-throughput or production-SLA claims.

## 11. Delivery sequence and verification

Implement in reviewable slices. Rough engineering estimate: **6–9 focused developer days**, subject to UI reuse and playtest findings; this is separate from learner duration.

| Slice | Deliverable | Exit check |
| --- | --- | --- |
| 1 — Content and engine, 1–2 days | Canonical scenario, event reducer, configuration constraints, hand-reviewed expected outputs, grading. | All oracle states and wrong-choice consequences pass pure tests. |
| 2 — One complete interaction, 1 day | Brief plus checkpoint 1, consequence preview, hints, apply/retry, provisional save/resume. | Keyboard-only user can enter, repair, refresh, and resume without state loss. |
| 3 — Remaining incident, 2–3 days | Object design, time events, diagnosis, reads, subscription, acceptance report. | Full run works from brief through handover, including supported alternative decisions. |
| 4 — Platform integration, 1 day | Single-challenge metadata, direct main-page entry, persistent achievements, documentation. | Direct and navigated entry agree; chapter completion remains separate. |
| 5 — QA and learner timing, 1–2 days | Responsive/accessibility checks, supported browser coverage, novice-of-capstone playtests. | Acceptance checklist passes and observed timings support the advertised duration. |

Release the single challenge only once the full flow and persistence work together. No catalog or future-challenge placeholders are needed.

### Automated checks

**Vitest:** canonical source replay; every oracle row and signed diff; cancellation; multiple orders sharing a customer; late and future arrivals; exact expiration; disappearance of a group; input-limited versus compute-limited progress; inclusive retained/exclusive write boundaries; 622.999 versus 623.000; three-second failure and ten-second success; new read after catch-up; initial subscription baseline; split replacement and equal progress; wrong-action previews; deterministic reset/replay; assistance flags; invalidation of later decisions; valid/invalid persistence versions; storage failure; separate chapter denominator.

Use expected fixtures written from the answer table, plus independent recomputation checks. A test that merely asks the same grading function for its own expected answer is insufficient.

**Playwright:** `tests/e2e/live-order-operations.spec.ts` covers a full independent run using actual controls, one failed repair with evidence feedback, both accepted incident-read responses, worked-repair completion, reload mid-checkpoint, return from a lecture, restart, cross-tab update handling, and direct main-page entry. The foundation suite covers legacy redirects and unknown URLs. Check correct and assisted achievements separately.

Compare the new frame with existing exercise header/control styling at desktop, laptop, tablet, and phone sizes, including a short laptop viewport, sidebar/navigation variants, both themes, 200% zoom, reduced motion, keyboard focus, and screen-reader labels. Use the repository's representative Chromium desktop/phone, Firefox desktop, and WebKit phone projects. Avoid screenshot-only correctness tests.

Run `npm test`, `npm run build`, the new capstone browser tests, and affected navigation/progress/shared-frame regressions. Recheck official SQL syntax before publishing the reference panel.

### Learner validation

Observe at least five people familiar with the chapter content but new to this capstone. Measure active completion time, time by checkpoint, first unsuccessful repair, hint usage, and whether they can explain the root cause without being shown the answer. Collect this in facilitated sessions; no analytics integration is required.

Target a median of 14–17 minutes and at least four of five finishing the core within 20 minutes without facilitator intervention. If it runs long, shorten copy, combine event probes, or move extra diagnostic comparisons into optional inspection. Preserve the core decisions and semantic boundaries. If it runs short because users guess, require the specific evidence that supports their repair instead of adding filler questions.

### Release acceptance checklist

- [x] All six checkpoints have tasks, valid solutions, wrong-choice consequences, hints, worked repairs, and review links.
- [x] The same canonical orders produce the expected tables at every checkpoint.
- [x] The final client table is correct and no incomplete timestamp has been published.
- [x] Valid alternatives pass; formatting and click order do not affect assessment.
- [x] Pausing, refresh, lecture review, retries, and storage failure behave as documented.
- [x] Core chapters still count as eight; challenge progress is separate and honest about assistance.
- [x] Challenge on the main page opens the incident directly, independently of chapter navigation. Previous entry URLs redirect to the incident.
- [x] Existing chapter layouts retain their intended behavior; no catalog or planned challenge appears in the UI.
- [x] The experience works without credentials, network calls during play, or new runtime dependencies.
- [ ] Playtests support the 10–20 minute estimate and accessibility checks pass.

## 12. Explicitly deferred extensions

After the core experience has been validated, consider an optional alternate incident with slow computation rather than a stalled input, a customer-region change causing join fan-out, or a new seed with different order values. Each needs its own reviewed oracle. Do not randomize the first release.

Keep durable subscription replay, retention administration, cluster restart/hydration, sink guarantees, external side effects, and atomic checkpointing outside this challenge. They require additional instruction. A new connection alone is not a recovery design.

Official semantic references above were checked on **2026-10-26**. Local chapter READMEs and `UI_LAYOUTS.md` remain the source for existing implementation behavior. Recheck documentation when implementation changes SQL or protocol behavior.
