# Challenge second version: investigate the flash-sale dashboard

Status: implemented on `challenge-second-version`. See
[the feature README](./src/challenges/live-order-operations/README.md) for the code
map, execution boundaries, and verification. This document preserves the design
and implementation gates; facilitated learner timing remains a release follow-up.

Current simplification: manual notebooks, pinned observations, and evidence
submission have been removed. Handover requires five passing technical checks
and a short repair explanation. Notebook-related requirements below describe
the earlier design and are historical.

Starting point: commit `da81e4d` on `challenge-first-version`. Development branch:
`challenge-second-version`. The first version remains recoverable on its branch.
The previous [capstone plan](./CAPSTONE_PLAN.md) describes that guided version.
This document supersedes its checkpoint workflow for the proposed second version.

## 1. Product decision

Transform the existing challenge into an open incident investigation. Retain its
tested domain models, order history, shared website UI, and persistence behavior.
Replace its linear run model, answer forms, and answer-key grading. Starting the
whole platform again would discard useful, tested work without improving the task.

The learner receives one symptom, inspects a working system, forms a diagnosis,
changes its behavior, and proves the repair. They can investigate in any order.
There is no visible fault count, chapter checklist, next-step instruction, or
requirement to visit every panel.

Recommend real SQL execution in a browser sandbox for relational query results.
Keep Materialize-specific streaming behavior in the existing explicit simulation.
SQL execution is a scoped part of the investigation, not a new database IDE.

Target: 15–20 active minutes for a learner who completed Chapters 1–8. Keep the
original 10–20 minute product estimate until learner testing supports changing it;
do not expand the required task to 30–40 minutes to cover every chapter separately.
Use three connected faults and a supplied codebase to make this feasible.

## 2. What the learner sees first

The main page still has one **Challenge** entry and opens `/challenge` directly.
Keep the name **Save the Flash Sale** and the existing entry animation.

Initial message from operations:

> Regional totals disagree with the latest paid orders during the flash sale.
> Can we trust this dashboard before the next sale wave?

The briefing supplies the business contract, access to the system, and permission
to make reversible changes. It does not identify the faulty components.

Business contract:

- Show paid-order counts and totals by customer region.
- Include orders during `[event time, event time + five minutes)`.
- A correction replaces the previous version of the same order.
- Normal reads must meet the three-second snapshot-age limit. During the
  incident, an explicitly labeled ten-second fallback or unavailable state is
  authorized; neither counts as restoring normal service by itself.
- Publish complete live results; temporary partial results must not reach users.
- Keep operations and support serving the same maintained result within the
  existing eight illustrative state units.

Provide an inherited, partially faulty system, not a blank canvas. Show its live
dashboard and ordinary operational evidence. The learner must discover whether
the problem lies in data, query semantics, processing progress, or presentation.
Relevant technical facts appear where they would be observable in that system.

## 3. Author-only incident specification

Do not expose this table as a task list in the product.

| Component | Initial condition | Discoverable evidence | Effective intervention |
| --- | --- | --- | --- |
| Order ingestion | Healthy: stable order-ID UPSERT and full replacement values | Retained keyed messages compared with current source rows | No change needed. Wrong changes affect subsequent results. |
| Regional query | Fault: expiration uses arrival time instead of event time | Compare the deployed SQL with late arrivals and clock-only expiry | Edit, execute, and deploy the corrected temporal predicate. |
| Customer input | Fault: connection paused at frontier 623.000 s | Compare wall clock, input/output frontiers, connection history, and query duration | Resume the connection, allow processing to advance, then issue a new read. |
| Serving objects | Healthy: regular helper view, one final materialized result, two local indexes | Catalog and dependency map; eight-unit state accounting | Preserve the contract. Additional or removed objects have observable consequences. |
| Read policy | Healthy: bounded normal request; last complete display is honestly labeled | Request records include selected timestamp, age, and availability | Verify normal service after catch-up. Optional authorized fallback is a mitigation. |
| Live client | Fault: publishes each received record | Compare the database result with the visible app during a split replacement | Change the client's publication policy to buffer until progress is strictly later. |

The three initial faults are query expiration, stalled input, and partial client
publication. Correct components are genuine diagnostic alternatives, not decoy
cards labeled as suspicious. Do not introduce Debezium configuration, production
connector setup, arbitrary JavaScript, or additional untaught concepts.

This is a pipeline investigation with interacting symptoms. A correct SQL query
can still return an old snapshot. A current database result can still be rendered
incorrectly by the client. Faster serving or a wider freshness allowance does not
repair either underlying problem.

## 4. Investigation workspace

Reuse the actual shared website elements described in [UI_LAYOUTS.md](./UI_LAYOUTS.md):
`ActivityHeading`, lab theme, panels/tables, buttons, dialogs, `ShortcutHelp`, entry
transition, and existing motion hooks. Keep light/dark themes and reduced motion.

Replace the six numbered checkpoints with neutral workspace tabs:

| Workspace | Contents and actions |
| --- | --- |
| Dashboard | Regional totals, timestamp/age/availability, and the application's published result. Replay the incident or advance its next event. |
| Data | Schemas, retained producer records, current source rows, and customer relation. Inspect an order and follow its successive versions. |
| SQL | Deployed query, editable temporal predicate, diagnostic SQL console, result table, draft/deployed comparison, and deploy action. |
| System | Object dependencies, clusters, source connection logs, frontiers, read requests, and reversible operational settings. |
| Client | Subscription configuration, delivered records, pending changes, progress, and the user-visible application. Change publication behavior and replay deliveries. |

All tabs are accessible from the start. Selecting a tab changes the view only;
it does not move the incident clock, apply a repair, or earn credit.

Keep a compact incident notebook available beside or below the workspace:

- Pin an actual observation, query result, request, or before/after comparison.
- Add an optional hypothesis and a short note explaining the evidence.
- Record applied changes automatically, including revision and replay context.
- Compare two observations at compatible times; do not imply that snapshots at
  different logical times should have identical values.

Header actions: Incident brief, Reference, Pause, and Submit handover. Restart
remains an explicit option with its existing confirmation. There is no repairs
progress bar or `0 / 3` counter revealing how many faults exist. Prefer a plain
incident status such as Investigating or Ready for handover.

Reference opens schemas, business requirements, clock meanings, relevant SQL
syntax, and lecture/documentation links. The current `SQL & Objectives` dialog
contains a complete working answer and must not remain available as the default
reference in this version. Full repairs appear only through explicit assistance.

Desktop: two related panes, such as SQL beside its output or a dependency map
beside selected-object details. Avoid showing five large panels simultaneously.
On mobile, show one pane at a time with the same data and state; preserve normal
scrolling and use an accessible plain-text SQL editor with a visible Run action.
Changing tabs must retain unsent SQL and notebook text.

## 5. Concrete learner journey

This is one plausible route, not a required sequence:

1. Open the dashboard and notice that its last complete result is older than the
   normal freshness contract. Compare a displayed total with an order record.
2. Inspect the deployed query, run it against an explicit complete snapshot, and
   examine a late order. Discover that its lifetime restarts at arrival.
3. Edit the predicate, run a preview at several relevant times, and deploy it.
4. Observe that the serving result still has old freshness evidence. Follow the
   dependency map and logs, resume the customer connection, advance processing,
   and request a new normal read.
5. Replay the price correction. Notice that the database result is correct but
   the application exposes a partial replacement. Inspect delivery timestamps
   and change the client's publication policy.
6. Run an end-to-end replay, attach useful before/after evidence, and submit a
   handover explaining the repairs and any remaining limitation.

An equally valid route starts at the client or connection logs. Fixing a later
layer does not automatically repair earlier layers. Discovery, testing, and
deployment are separate actions; no correct selection silently advances a stage.

Timing budget: roughly two minutes to understand the contract, four to
investigate, four to edit/test SQL, five for operational and client verification,
and two for handover. These are content targets, not a countdown or pass condition.

## 6. Editable and executable SQL

### Recommended scope

Yes: let learners change SQL and execute it. The current answer menus and generated
SQL preview are insufficient for the intended investigation.

Use two modes in the SQL workspace:

1. **Inspect:** an ordinary, read-only `SELECT` console against the incident's
   supplied relations at a clearly identified snapshot. Return actual rows,
   column metadata, and SQL errors.
2. **Repair:** show the inherited full aggregate query, with its `WHERE` block
   editable. Keep the supplied projection, join, grouping, and output schema
   stable for this first investigation release. Run the complete resulting SQL,
   not just a classification of its text. Support multiple equivalent predicates.

The scoped repair block keeps the exercise focused on diagnosing temporal
behavior, supports a small explicit expression grammar, and avoids requiring a
general SQL-to-streaming compiler. It still requires writing a repair, rather
than choosing a prewritten clause. Full-query deployment can follow later if
learner testing demonstrates a need.

Starter query, shown only when the learner inspects SQL:

```sql
SELECT c.region, COUNT(*) AS orders, SUM(o.amount) AS total
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.customer_id
WHERE o.status = 'paid'
  AND mz_now() >= o.event_at
  AND mz_now() < o.arrived_at + INTERVAL '5 minutes'
GROUP BY c.region;
```

The `arrived_at` field is supplied lab ingestion metadata. Its meaning is explained
in the schema, not labeled as the mistake. A correct repair makes expiration
depend on `event_at` and preserves the business contract across replay cases.

### Execution architecture and limits

Preferred candidate: lazy-load `@electric-sql/pglite` in a dedicated worker.
It provides a browser Postgres runtime and real SQL queries. This is a justified
new dependency only if the feasibility checks below pass; it is not installed by
this planning task. Use an in-memory database reconstructed from saved incident
state. Keep the existing browser store as the source of truth for the attempt.

PGlite is not Materialize. It must not be presented as executing Kafka connectors,
Materialize clusters, incremental arrangements, write frontiers, bounded-staleness
policies, or the real `SUBSCRIBE` protocol. Its reactive-query extension is not a
replacement for the Chapter 8 subscription model.

For the supported query, supply a documented lab `mz_now()` compatibility function
that returns the worker's frozen snapshot time as a timestamp. Seed `event_at`
and `arrived_at` as UTC timestamp columns from the fixture's integer offsets.
Materialize's real `mz_now()` returns `mz_timestamp`; this compatibility function
only reproduces the supported timestamp comparisons. It does not reproduce the
complete function/type system or timestamp selection policy.

Before deployment, validate the editable expression with a bounded, AST-based
grammar for identifiers, timestamp/interval literals, comparisons, parentheses,
and `AND`, matching the lecture's supported Materialize temporal-filter form.
Return a precise unsupported-expression message for other constructs. Ordinary
diagnostic `SELECT` execution may support more SQL, but that does not establish
that it can be deployed as a maintained Materialize query. Do not validate a
repair by comparing strings, regex-detecting the expected answer, or translating
arbitrary SQL into the existing `paidOnly/lower/upper` configuration enum.

Worker execution sequence:

1. Receive run ID, configuration revision, request ID, selected fixture frame,
   and SQL draft. Freeze a complete logical timestamp for that request.
2. Hydrate source relations as of that timestamp, including only ingested changes
   applicable there. Select the same timestamp across all queried inputs.
3. Install the fixed lab clock and execute the query in a read-only transaction
   with a limited role. No learner schema changes, writes, or extensions are needed.
4. Return rows, column types, errors, and snapshot metadata. Row limits affect
   display only; acceptance evaluates the full result within a bounded fixture.
5. Accept the response only if its run/configuration/request IDs still match.
   SQL edits, replay movement, external-tab updates, restart, and cancellation
   must invalidate obsolete results. Never deploy an older successful draft.

Run is a preview; Deploy changes the incident's configured query after successful
syntax/supported-form checks. Allow semantically wrong but valid SQL to deploy
and show its consequences. A failed parse or unsupported expression leaves the
deployed query intact. Keep the previous deployed revision for Undo last change.

Use database statement limits where supported and a main-thread worker deadline
as the final bound. Cancel/terminate and rebuild an unresponsive worker; retain
the SQL draft and saved attempt. Limit fixture sizes and query/history retention.
Worker initialization and recovery reuse the site's loading language; do not
show the global entry animation for every query or tab switch.

Product disclosure belongs in concise Reference/help copy: SQL rows execute in a
local Postgres sandbox; streaming and cluster behavior are simulated. Avoid
backend details in the normal incident decisions. If the SQL runtime cannot
start, keep saved work and inspection accessible and offer Retry. Do not report
an unexecuted repair as verified or silently replace execution with answer matching.

### Required feasibility spike before committing to the dependency

- Verify Vite production asset paths, worker initialization, offline/local assets,
  and Chromium, Firefox, and WebKit behavior, including a phone-sized viewport.
- Execute the inherited query and equivalent correct repairs at the same frames
  as the independent oracle. Confirm millisecond boundaries, UTC conversion,
  aggregate types, empty groups, and timestamp comparisons.
- Demonstrate that the supported-expression AST accepts reordered conjunctions,
  whitespace, comments, aliases, and parentheses without accepting clock arithmetic
  or other maintained-query forms outside the supported Materialize subset.
- Prove cancellation, stale-response rejection, safe replay, and database rebuild
  after worker termination. Measure startup and memory costs on representative
  hardware; choose and document performance limits from those measurements.
- Verify that a limited role/read-only execution prevents learner SQL from
  modifying fixture or clock state. Do not rely on a `SELECT` prefix check.

If this fails, revisit the execution architecture before implementing the whole
new UI. Real Materialize execution would require a separate backend/environment
project with isolated sessions and lifecycle management; it is not a small
substitution. A bounded interpreter would need explicit user-visible simulation
wording. Neither alternative should be silently shipped as real SQL execution.

## 7. One coherent incident model

The current version uses several independent fixtures and a reference client
whose rows are generated from the canonical correct query. That separation is
acceptable for guided checkpoints but must change here: every workspace must
show consequences of the same deployed configuration and replay state.

Use a shared incident state with these distinct clocks and versions:

- Integer fixture time and delivered event position.
- Per-input progress, permitted output progress, and actual processed progress.
- A read request's chosen logical timestamp and its success/wait/failure outcome.
- Subscription delivery position and strictly complete publication boundary.
- Learner active duration, separate from all simulated clocks.
- Deployed configuration revision and SQL draft revision.

The learner controls Replay and Next event; time does not run while reading or
editing. A paused connection prevents its input progress from advancing.
Resuming permits progress, while later processing advances the aggregate and
serving frontiers. Replace the answer-revealing Finish catch-up sequence with
ordinary replay/processing observations. Preserve the distinction between source
progress and actual output completion.

The live incident opens at wall time 630.000 s. Historical Replay is a separate
cloned diagnostic session over the retained 600–632 s history; it can compare the
inherited and currently deployed configurations without rewinding the live
incident, erasing actions, or changing saved repairs. Label the replay's time,
configuration, and input-progress assumptions. Next event advances the live
incident; client delivery controls can split a timestamp without advancing its
completeness. After the customer connection resumes, healthy inputs may advance
beyond 630.001 s as later events arrive; do not leave that frontier fixed when
validating the 632.000 s replacement.

For each complete query snapshot, execute the deployed SQL over the corresponding
inputs. Derive signed changes by comparing successive full result rows. Deliver
those changes through the chosen client policy. Do not feed the client a
hardcoded correct answer when the learner deployed a wrong query.

Split a replacement's negative and positive records across deliveries and insert
an equal-time progress message before the strictly later progress message. The
correct policy buffers until progress is greater than the timestamp. The buggy
policy exposes partial state. Relational changes remain full-row multiplicities.
No JavaScript coding is required; the learner configures the supplied client.

Reconfiguring SQL invalidates dependent read previews and creates a new simulated
subscription session with a coordinated baseline. Explain the rebaseline in the
action log. Do not splice a new query's diffs into an old query's pending stream.
Operational controls are explicitly sandbox actions, not a claim that production
Materialize permits every in-place mutation shown by the lab.

## 8. Fixture and validation design

Reuse the first version's hand-reviewed fixture: amount correction at 601 s,
cancellation at 602 s, late order at 603 s, already-expired order at 604 s,
future order at 605 s, and clock-only changes at 610 and 620 s. Preserve the
623.000 s stalled frontier at wall time 630.000 s and the 632.000 s replacement.

Baseline regression oracle:

| Complete time | Correct regional result |
| --- | --- |
| 600 s | EU: 2 / 100; US: 1 / 25 |
| 601 s | EU: 2 / 130; US: 1 / 25 |
| 602 s | EU: 1 / 70; US: 1 / 25 |
| 603 s | EU: 2 / 90; US: 1 / 25 |
| 610 s | EU: 2 / 90; US group absent |
| 620 s | EU: 1 / 70; US: 1 / 35 |
| 632 s | EU: 1 / 90; US: 1 / 35 |

The initial wrong arrival-based query must demonstrably disagree with this oracle
for late/expired/clock-only cases. Keep it correct on ordinary arrivals so one
successful sample is not sufficient proof.

Validation runs cloned scenarios without altering the learner's current replay.
Use the deployed SQL, operational configuration, read policy, and client policy.
Freeze the configuration revision for the entire validation run. Later edits
invalidate that validation and completion; preserve historical achievements.

Acceptance checks behavior, not a particular path through the interface:

- Correct complete relational results across replacements, cancellations, late,
  expired, future, and clock-only events, including exact window boundaries.
- Matching behavior on a small deterministic additional fixture with changed
  order IDs, amounts, and times; hardcoded final totals cannot pass.
- Correct source identity and serving contract remain intact after any edits.
- Restored input/output progress and a newly successful normal three-second
  read. A fallback alone is not an end-to-end repair.
- An initialized client with signed changes, correct final rows, and no partial
  replacement visible while its timestamp is still open.
- The state budget and both serving-cluster requirements remain satisfied.

Use independently computed domain expectations for SQL outputs. Do not generate
expected values using the same edited SQL, the same adapter, or a copy of the
learner's predicate. Compare unordered multisets and preserve empty-result and
duplicate-row semantics; normalize numeric/timestamp representations explicitly.

Business requirements are public. Extra replay inputs can remain unseen until
validation; there are no secret business rules. A failed run identifies an
observed contract violation with a concrete timestamp/example, not the exact
replacement SQL or a list of all faulty components. Further detail is optional.

Submit handover requires current-revision technical checks to pass and an attached
before/after observation explaining the reported discrepancy. Check that evidence
references exist and match their saved context. Keep the explanation human-readable;
do not pretend keyword matching or an LLM has verified reasoning. Report technical
behavior as verified and the learner's narrative as their supplied explanation.
No score for visiting tabs, clicking controls, speed, or discovering faults in an
authored order.

## 9. Help, difficulty, and completion

Increase difficulty through fewer supplied answers, interacting layers, realistic
observations, and verification over time. Do not hide ordinary diagnostic tools,
add surprise failures, or require a perfect first attempt.

Help is learner-requested and contextual:

1. Suggest a useful comparison, without naming the cause.
2. Point to a relevant observation or concept after the learner asks for more.
3. Offer a worked repair for the selected area, explicitly recorded as assistance.

Provide relevant lecture links from Reference and observations. Keep supplied
syntax help separate from hints. Worked assistance does not skip replay or final
validation. Use the existing independent/assisted distinction, preserving explicit
hint counts and accurately describing what help was used.

After completion, show the learner's change log, before/after evidence, actual
acceptance results, and a causal recap. Explain the query, freshness, and client
failures here, once the investigation is over. Offer Review and Replay; do not
force a six-step retrospective before awarding completion.

## 10. Persistence and platform integration

Keep one public challenge route and one main-page entry. No challenge catalog,
learning-path step, chapter sidebar item, or chapter completion credit is added.

New persisted run shape: run ID, scenario version, revision, phase
(`briefing/investigating/handover/completed`), selected workspace, replay position,
deployed configuration, SQL draft, bounded observations/query history, applied
changes, hints/worked assistance, and latest validation with its revision.
There is no `stage`, sequential `commits`, or dependency on `STAGE_IDS`.

Autosave drafts and actions. Reopening resumes directly. Preserve automatic
cross-tab synchronization, explicit Restart, and the absence of a saved-status
label or Load saved run action. When a tab receives a newer run revision, discard
its obsolete worker responses and rebuild from the saved state. Durable state
contains configuration and bounded observations, not a worker/database instance.

Use a new schema version and isolated V2 run-storage key. Preserve the V1 key and
history without converting an active six-stage attempt into an investigation.
Show valid V1 completion as historical, explicitly labeled First version; it
does not mark V2 completed. V2 reset affects only the V2 active run. Chapter
progress and prior achievements remain untouched. Corrupt/unsupported records
recover with the existing honest recovery behavior.

Update `challengeRegistry` descriptions and main-page feature copy when V2 ships,
then update `staticRoutes`, FAQ, curriculum, README, and UI_LAYOUTS together. Do
not change the running product's documentation to claim V2 is implemented now.

## 11. Implementation map

Keep the feature in `src/challenges/live-order-operations/`. Suggested boundaries
below are implementation responsibilities, not a requirement to split every
small control into a new file.

| Existing owner | Planned treatment |
| --- | --- |
| `scenario.ts` | Replace stage definitions/solutions with business contract, initial configuration, replay fixtures, and optional contextual help. |
| `simulation.ts` | Reuse ingestion, aggregation oracle, fixtures, diff generation, and state cost. Introduce one coherent world state; retire helpers that return hardcoded healthy progress/client state. |
| `run.ts` | Replace sequential reducer/parser with free investigation actions, configuration revisions, undo, observation pinning, and validation invalidation. |
| `useChallengeRun.ts` | Retain autosave/pause patterns; manage the V2 store and cancel stale SQL/replay work after external updates or reset. |
| `grading.ts` | Replace field/solution matching with asynchronous behavior checks and independent expected outputs. |
| `LiveOrderOperationsPage.tsx` | Compose neutral workspace tabs and submission, using shared chrome and controls. |
| `ChallengeEvidence.tsx` | Reuse useful tables/diagrams; remove answer-revealing titles, fixed sequences, and canonical-only consequence previews. |
| `ChallengeDecisions.tsx` | Retire the quiz form. Replace with SQL editing and contextual operational/client actions. |
| `ChallengeReport.tsx` | Show actual findings, versioned evidence, replay acceptance, and honest assistance attribution. |
| New SQL worker/adapter module | Own runtime initialization, clock/schema hydration, bounded expression validation, query execution, cancellation, and typed results. |
| Progress store and main-page hook | Own V2 persistence/versioning, V1 historical achievements, and Start/Resume/Review entry. |

Continue importing the Chapter 7 read model and Chapter 8 signed-row/publication
model. Extend shared pure interfaces only where the integrated incident requires
it, with chapter regressions. Do not fork their underlying semantics into another
copy. Keep the relational oracle independent of the SQL execution implementation.

## 12. Build order and completion gates

1. **SQL feasibility:** prove the worker, clock, supported expression model,
   actual result execution, cancellation, and browser compatibility. Gate: real
   correct and wrong SQL produce the expected distinct replay results.
2. **Incident model:** define initial faults, healthy components, and coherent
   state/revisions. Gate: arbitrary investigation order and changes propagate
   consistently through SQL, reads, signed diffs, and client display.
3. **Vertical slice:** one complaint, Dashboard/Data/SQL exploration, a working SQL
   repair, autosave, and useful validation feedback. Gate: no quiz/Next checkpoint
   dependency is needed to discover and fix the query.
4. **Complete investigation:** System and Client workspaces, operational actions,
   notebook comparisons, undo, and contextual help. Gate: all three faults are
   independently discoverable and the end-to-end repair works in different orders.
5. **Handover and migration:** versioned validation, evidence submission, assisted
   completion, V1 historical handling, reset, and product copy. Gate: reopening,
   editing after success, and stale worker results cannot award false completion.
6. **Experience verification:** compare the actual main page and lecture references
   with V2 at desktop/phone widths, both themes, keyboard and reduced motion.
   Pilot with learners who completed the chapters. Gate: most can identify useful
   evidence without a prescribed path and complete within the intended duration.

Technical regression coverage must include:

- Both independent and assisted complete investigations in multiple repair orders.
- Equivalent correct SQL, valid-but-wrong SQL, syntax errors, unsupported temporal
  forms, snapshot-age failures, clock-only expiration, and the additional fixture.
- Correct query with stale serving, fresh serving with incorrect client, and
  incorrect query with otherwise healthy infrastructure.
- Split retractions/additions and equal-time progress; no false completeness.
- Run/deploy/undo, edits during validation, worker failure/cancel/rebuild, and old
  responses arriving after a newer draft, cross-tab change, or restart.
- Refresh with an unsent SQL draft; switching panes; automatic resume; storage
  failure; V1/V2 histories; preserved achievements and chapter progress.
- Source/read/serving configuration changes have actual consequences. Learners
  cannot pass by changing a label, widening the business window, or refreshing.
- Existing lecture/exercise geometry, behavior, accessibility, and page navigation.

The implementation began with the bounded SQL spike, followed by the vertical
slice and the complete workspace. PGlite 0.5.12 is installed, and real SQL
execution is covered by database and browser tests. Learner timing studies remain
separate from automated verification.

## 13. Technical references checked for this plan

The browser SQL proposal is an engineering choice based on the following official
capabilities, not a claim that PostgreSQL implements Materialize streaming:

- [PGlite getting started](https://pglite.dev/docs/): browser/in-memory execution
  and parameterized SQL queries.
- [PGlite API](https://pglite.dev/docs/api): database initialization and query API.
- [PGlite worker support](https://pglite.dev/docs/multi-tab-worker) and
  [bundler support](https://pglite.dev/docs/bundler-support): implementation
  references for the feasibility spike; use one worker per tab and synchronize
  the application run store, rather than persisting a shared database as truth.
- [Materialize now and mz_now](https://materialize.com/docs/sql/functions/now_and_mz_now/)
  and [temporal filters](https://materialize.com/docs/transform-data/patterns/temporal-filters/):
  logical time, comparison forms, and maintained-query restrictions.
- [Materialize SUBSCRIBE](https://materialize.com/docs/sql/subscribe/): signed
  changes, snapshots, and progress strictly excluding timestamps below its value.

Recheck exact dependency/runtime APIs during the spike and record the selected
version. No claims about bundle cost, startup speed, or cancellation support are
considered verified until measured in this repository.
