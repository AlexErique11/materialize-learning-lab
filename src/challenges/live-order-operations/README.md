# Live Order Operations — Save the Flash Sale

The main page’s **Challenge** card opens `/challenge` directly. This is the only
challenge; there is no catalog. Old `/challenges` and
`/challenges/live-order-operations` URLs redirect to the same saved run. This is a
separate incident workspace, not a
chapter activity. It does not use the chapter sidebar, completion provider, or
activity-path progress store. Chapters 1–8 are advisory prerequisites.

## Implementation map

- `scenario.ts`: six authored stages, controls, hints, worked repairs, mission
  requirements, SQL reference, and official documentation links.
- `simulation.ts`: immutable latest-value ingestion, eligible input changes,
  affected-group maintenance, full-row result diffs, event-time boundaries, read
  fixtures, and client consequence previews. Customers have a completed native
  database snapshot; only orders use the Kafka envelope choice.
- `grading.ts`: decision validation, misconception feedback, and final acceptance
  using committed configuration and the canonical order history.
- `run.ts`: legal transitions, drafts versus committed repairs, assistance,
  ordered application, downstream invalidation, and strict load validation.
- `useChallengeRun.ts`: browser persistence, automatic tab synchronization, pause, timing, and
  achievement creation. `src/progress/challengeProgress.ts` owns the versioned
  store; `useChallengeProgress` subscribes the main page.
- `ChallengeEvidence.tsx`: source and result tables, object map, query draft and
  event inspection, progress lanes, shared `ReadableWindow`, and shared
  `TimestampTrays`. `ChallengeDecisions.tsx` owns native answer controls and
  evidence-specific feedback. `ChallengeReport.tsx` owns handover and recap.
- `LiveOrderOperationsPage.tsx` and `challenge.css`: local page composition and
  responsive layout using the shared lab theme, ActivityHeading, ProgressBar,
  Breadcrumbs, relation panels/tables, Button, Dialog, SQL & Objectives, and
  ShortcutHelp. Main-page entry reuses LabEntryTransition and its flask animation;
  direct entry and refresh restore the incident immediately. Shared workspace,
  feedback and checkpoint motion honors reduced motion. No new dependency or asset.

## Semantics and persistence

The event trace and independently authored answer oracle are in
`CAPSTONE_PLAN.md`. Amounts are integer values in one currency. Logical times use
integer millisecond offsets from a fixed fixture origin; display seconds except
the reused subscription trays, which explicitly display the underlying integer
milliseconds. Playback/event selectors, elapsed learner time, and logical time
are separate.

Incremental maintenance touches only affected regions and is checked against
independent recomputation. Expiration removes query membership, not source rows.
Reinterpreting the Kafka feed is a fresh sandbox replay, not live envelope
conversion. Progress evidence distinguishes a paused source from quiet business
data and fast queries from recent results. Resource units and timings are
illustrative. Retained read bounds are supplied fixture assumptions.

The existing Chapter 7 pure read model and Chapter 8 pure subscription model are
reused directly; their specialized lecture fixtures and playback remain local.
They require retained-inclusive/write-exclusive reads and strictly later progress
for publication. The normal read fails during the stall, then a new request
succeeds after explicit catch-up. The live client must inspect all eight
deliveries; snapshot initialization and the split replacement share the same
canonical order totals as earlier stages. Disconnect is an optional stale-display
probe with no durable recovery guarantee.

Failed choices produce reversible previews. Only an accepted repair commits;
editing an earlier repair invalidates later commits and their exploration state.
Drafts and discrete actions save immediately. Storage failures retain the run in
memory with an explicit session-only status. Invalid or incompatible runs offer
a fresh start while preserving valid achievements. Returning opens the saved
checkpoint directly. Open tabs follow the latest saved run automatically, and
each action updates that current run without a manual loading step.
Restart replaces the active run after confirmation and preserves achievements.
Hints and worked-repair use are tracked separately; walkthrough completion is
never labeled independent. Timing pauses for hidden tabs, help dialogs, and the
explicit pause screen and is never a pass condition.

## Verification

`simulation.test.ts`, `grading.test.ts`, and
`src/progress/challengeProgress.test.ts` cover the numerical oracle, exact
boundaries, immutable replay, wrong choices, both incident-read responses,
ordered transitions, assistance, invalidation, persistence and storage failures.
`tests/e2e/live-order-operations.spec.ts` exercises actual controls through full
independent and assisted runs, navigation, refresh, lecture review, cross-tab
automatic synchronization, optional restart, storage failure, focus, themes, and responsive panels.
`challenge-design.spec.ts` checks shared header geometry, loading, reduced motion,
incident shortcuts, and animation hooks. The shared
browser-smoke suite includes a full assisted incident in Chromium desktop/phone,
Firefox desktop, and WebKit phone.

The 10–20 minute duration is a content-design estimate. Facilitated learner
timing studies described in the plan remain a release follow-up; automated
browser runtime is not evidence of human completion time. SQL/protocol sources
were reviewed on 2026-10-26. The browser executes no SQL and contacts no deployment.
