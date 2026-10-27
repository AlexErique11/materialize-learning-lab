# Live Order Operations: open investigation

Version 2 replaces the first version's six checkpoint forms. The single main-page
Challenge entry opens `/challenge`, with legacy aliases redirecting there. One
operations complaint leads into Dashboard, Data, SQL, System, and Client in any
order. Healthy components remain inspectable. No fault count or repair checklist
appears before handover. The design and build rationale is in
[CHALLENGE_SECOND_VERSION_PLAN.md](../../../CHALLENGE_SECOND_VERSION_PLAN.md).

## Implementation map

- `incident.ts`: initial configuration, neutral workspaces, business requirements,
  contextual hints, input snapshots, fronts/read requests, and query-derived
  subscription replay. The author-only defects are arrival-based expiry, a paused
  customer input, and per-record client publication.
- `simulation.ts`: immutable keyed ingestion, affected-region maintenance, signed
  full-row differences, and the hand-reviewed commerce fixture. `expectedAt` in
  the incident model uses this independent domain oracle, not edited SQL.
- `predicate.ts`: a bounded AST grammar for the editable temporal WHERE block.
  Comparisons, AND, parentheses, known columns and timestamp + INTERVAL are
  accepted independently of correctness. Unsupported Materialize shapes are
  rejected explicitly. The supplied projection, join and grouping remain fixed.
- `sqlDatabase.ts`: actual PostgreSQL execution with PGlite 0.5.12. Rehydrates
  orders/customers and a fixed UTC clock, then runs one SELECT under a limited
  role inside a read-only transaction that is always rolled back. A server-side
  cursor fetches at most 201 rows, returning 200 with an explicit truncation flag.
  The lab `mz_now()` returns a controlled timestamp for supported comparisons;
  it does not implement Materialize's full mz_timestamp type or planner.
- `sql.worker.ts` / `sqlClient.ts`: lazy worker, sequential requests, request IDs,
  bounded results, a 3-second database statement setting and a 30-second external
  deadline. Cancel/timeout terminates the worker; retry rebuilds it from saved
  configuration. All WASM/data assets use Vite's base-aware generated URLs.
- `run.ts`: free investigation actions, configuration revisions, undo, pinned
  observations, deployment, explicit processing and reads, assistance, validation
  invalidation, handover and persisted-state validation. No sequential stage.
- `grading.ts`: checks real SQL traces against the independent oracle and an
  additional fixture with changed IDs, amounts and event times; checks source
  identity, restored normal service, intermediate client publication, and serving
  resources. It never matches an expected SQL string or scores tab visits.
- `useChallengeRun.ts` / `src/progress/challengeProgress.ts`: autosave, active time,
  direct resume, tab synchronization, storage recovery, and achievements. Store
  `materialize-learning-lab-challenge-v2` is isolated from the first version's
  `materialize-learning-lab-challenges-v1`; its active run is never migrated.
  Valid old achievements are historical, not V2 completion.
- `LiveOrderOperationsPage.tsx`: shared activity chrome, worker/context lifecycle,
  dialogs, free workspace composition, optional help and notebook. SQL previews
  are bound to run/configuration/draft/mode/frame. Validation is also bound to
  time, processing and read context. Obsolete responses are discarded.
- `InvestigationSql.tsx`: predicate editor, read-only diagnostic console, complete
  query execution preview, real errors, deployed/inherited comparison, deployment.
- `InvestigationPanels.tsx` / `ChallengeEvidence.tsx`: data/dashboard/system/client
  observations and controls, shared tables, Chapter 7 ReadableWindow, and Chapter
  8 TimestampTrays. Client data always derives from the deployed query.
- `ChallengeReport.tsx`: acceptance results, actual pinned evidence, the learner's
  explanation, and honest independent/worked-repair attribution.

## Model boundaries

Logical fixture offsets use integer milliseconds. SQL timestamps use UTC from
2026-01-01; normal displays show seconds from the same origin. Event time,
ingestion time, complete read time, delivered progress, and active learner time
remain distinct. Live input/output frontiers advance with the incident, rather
than remaining fixed at the first version's 630.001 s fixture.

Historical SQL snapshots are cloned diagnostic contexts. They do not rewind the
live clock or apply a draft. Deliveries from the session starting at 631 s advance
the live clock without rewinding it during replay. Equal-time progress leaves a
timestamp open. Only strictly later progress publishes it in the correct client.
Normal service checks require a successful post-catch-up normal request still
within the three-second age bound; an authorized fallback alone cannot pass.

Sources, Materialize objects/clusters, processing, read policy, state units and
SUBSCRIBE are simulated; PGlite executes relational SELECT results only. There
is no credential or backend requirement. Config changes have visible consequences;
SQL/source changes invalidate dependent snapshots and rebaseline the replay.
Shared UI layouts are owned by [UI_LAYOUTS.md](../../../UI_LAYOUTS.md).

## Verification

Unit tests cover actual PostgreSQL results across canonical and additional
fixtures, read-only rejection and rollback, syntax errors, temporal grammar,
immutable oracle behavior, boundary times, free repair order, stale validation,
undo, assistance, malformed storage, and preserved achievements.

`tests/e2e/live-order-operations.spec.ts` covers independent/assisted completion,
equivalent SQL, wrong deployments, diagnostic SQL, drafts, refresh, automatic
multi-tab synchronization, optional reset, legacy history and storage failure.
`challenge-design.spec.ts` checks shared chrome, arbitrary workspaces, mobile
widths, themes, loading and reduced motion. The cross-browser smoke suite runs
the complete executable-SQL investigation in Chromium, Firefox and WebKit.

The 10–20 minute duration remains a content estimate; facilitated learner timing
is not replaced by automated runtime. Browser execution is a local sandbox and
not evidence of production Materialize connector or performance behavior.
