# Materialize Learning Lab

## Start the app

Install Node.js 22.12 or newer, then run these commands from the project folder:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal. The app runs simulations in your
browser, so no Materialize account or database connection is needed.

## App structure

The **learning path** is the starting page. It introduces the chapters and gives
access to guided labs, a tour, and learning resources. Use the chapter sidebar
to move between topics and activities.

Each chapter is organized into:

- **Overview:** introduces the topic and lists its tutorials and exercises.
- **Tutorials:** interactive lectures that show how data and query results change.
  Playback controls let you step through a scenario or run it automatically.
  Guided runs ask you to predict an effect before revealing an explanation.
- **Exercises:** questions that apply the chapter's ideas, with answer checking,
  hints, and solutions.

Activities include **SQL & Objectives** for the learning goal, SQL reference,
and documentation links. Lectures also have a **Controls tour**. Light and dark
themes are available, and smaller screens use panel selectors to switch between
tables and questions.

The authored chapters include 26 lectures and 20 exercises:

| Chapter | Lectures | Exercises | Topics |
| --- | --- | --- | --- |
| 1: Changing Relations | 2 | 1 | Signed changes, updates, and logical timestamps |
| 2: Incremental Maintenance | 4 | 2 | Filters, projections, joins, aggregations, and maintenance work |
| 3: Views, Indexes & Materialized Views | 3 | 2 | Saved SQL, cluster-local indexes, and durable shared results |
| 4: Getting Data In | 4 | 3 | Snapshots, CDC, record envelopes, keys, and input errors |
| 5: Time in Materialize | 4 | 3 | Logical time, temporal filters, expiration, and late arrivals |
| 6: Progress and Freshness | 3 | 3 | Frontiers, limiting inputs, and source/computation/serving delay |
| 7: Consistent Reads | 3 | 3 | Readable windows, transaction ordering, freshness policies, and external ingestion |
| 8: SUBSCRIBE | 3 | 3 | Client baselines, signed result changes, timestamp trays, and complete publication |

Open **Challenge** on the main page to enter **Save the Flash Sale** directly at
`/challenge`. This is the platform’s only challenge: a six-checkpoint,
10–20 minute incident combining Chapters 1–8. Repair ingestion, choose maintained
objects, handle temporal changes, diagnose progress, choose honest read policies,
and publish complete live-client updates. There is no challenge catalog or list of
planned capstones. Previous `/challenges` and `/challenges/live-order-operations`
links redirect to `/challenge` and preserve the same saved run.

Challenge drafts, applied repairs, hints, and achievements save in this browser.
Pause, refresh, or open a lecture reference in a new tab and resume the incident.
Worked repairs are recorded as walkthrough assistance. Replaying preserves earlier
achievements. Challenge progress is separate from the eight core chapters, and
challenge navigation does not enter the chapter sidebar or completion sequence.
The full learning plan is in [CURRICULUM.md](./CURRICULUM.md); the scenario and
implementation specification are in [CAPSTONE_PLAN.md](./CAPSTONE_PLAN.md).

## Verification

Run `npm test` for the unit checks and `npm run build` for type checking and the
production build. Browser tests use the production preview on port 4173.

Install test browsers with `npx playwright install chromium firefox webkit`, then
run `npx playwright test tests/e2e/browser-smoke.spec.ts --workers=2` for the
representative Chromium desktop/phone, Firefox desktop, and WebKit phone checks.
Linux hosts can use `--with-deps` when installing browsers; CI does this automatically.
The larger layout suite retains its existing Chromium desktop/phone projects.
Run `npx playwright test tests/e2e/live-order-operations.spec.ts --workers=2`
for the complete independent and assisted challenge journeys, save/resume,
automatic cross-tab synchronization, saved-run resume, optional restart, storage recovery, and responsive interaction checks.
