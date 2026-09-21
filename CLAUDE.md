# CLAUDE.md

## Project: Materialize Learning Lab

This repository contains an interactive, browser-based learning application for
[Materialize](https://materialize.com/), the live data layer built around
incrementally maintained SQL results.

The product exists to make behavior that is normally invisible in a streaming
database visible and manipulable. A learner should be able to see how input
changes, logical time, maintained state, query results, diffs, subscriptions,
freshness, and recovery relate to one another.

The project should be a serious, cleanly engineered educational product while
remaining intentionally lightweight. It may eventually be shared with or
reviewed by Materialize, but it must remain useful using public information and
public interfaces.

The central product idea is:

> **Make invisible streaming database behavior visible.**

---

## 1. Product Positioning

The lab complements Materialize's documentation and quickstart:

```text
Documentation / Quickstart -> Interactive Learning Lab -> Competent user
```

- Documentation provides precise reference material.
- The quickstart gets a new user running Materialize.
- The learning lab builds the mental model needed to predict system behavior.

Do not turn the application into a documentation mirror, generic SQL course,
administration console, benchmark suite, or generic learning-management system.

---

## 2. Audience

The primary audience is developers and data engineers who understand basic SQL
but are new to Materialize.

Secondary audiences can include engineers evaluating Materialize, customer and
solutions engineers, internal onboarding groups, workshop participants, and
database students. Do not optimize the whole experience for one secondary
audience unless explicitly requested.

The app should bridge the gap between:

> "I know SQL."

and:

> "I understand how Materialize actually behaves."

---

## 3. Learning Method

Each lab should follow the loop:

```text
Learn -> See -> Try -> Check -> Build
```

### Learn

Introduce the mental model in a short, technically accurate explanation. Avoid
large walls of text and unnecessary implementation detail.

### See

Demonstrate the concept through synchronized representations of one system
state. Useful representations include a source relation, logical clock,
timeline, maintained result, retained state, subscription output, and the
current query or predicate.

### Try

Let the learner change an input, timestamp, key, predicate, query shape, index,
envelope, or system condition. Ask the learner to predict important outcomes
before revealing them.

### Check

Explain what happened, why it happened, whether the prediction was correct, and
which mistaken mental model would lead to a different answer.

### Build

End with a less-guided problem that combines the chapter's ideas in a realistic
scenario.

The explanation is more important than a bare correct/incorrect result.

---

## 4. Curriculum

The current curriculum is defined in [CURRICULUM.md](./CURRICULUM.md). It
contains twelve core chapters and one optional advanced chapter on recursive
queries.

Treat that document as the source of truth for chapter boundaries and ordering
until the user explicitly revises it. A chapter earns its own place when it
supports a complete lab with:

- a distinct mental model or practical skill;
- several meaningful variations or failure modes;
- prediction and explanation exercises; and
- a final challenge that demonstrates useful understanding.

The visible chapter sequence should reflect learning prerequisites rather than
the navigation structure of the Materialize documentation.

---

## 5. Flagship MVP

The initial MVP should prove the learning mechanism with one polished chapter,
not implement the entire curriculum.

The strongest initial chapter is **Time in Materialize: Temporal Filters**. A
representative predicate is:

```sql
WHERE mz_now() < event_time + INTERVAL '10 seconds'
```

The lab should make this behavior visible:

1. a row arrives;
2. it enters the maintained result;
3. logical time advances;
4. it expires even though no new source row arrives; and
5. the maintained result and `SUBSCRIBE` output contain its retraction.

The chapter can teach changing relations, logical time, temporal filters,
scheduled future changes, diffs, and `SUBSCRIBE` without requiring a large
backend.

---

## 6. Visualization Principles

Every visualization must answer a learning question. Typical questions are:

- What changed?
- When did it change?
- Which state was retained?
- Where is that state stored?
- What progress has the system established?
- What result can be read safely?

Several panels may display the same canonical simulation state:

```text
Scenario definition
        |
        v
Simulation/domain engine
        |
        v
Canonical simulation state
        |
        +--> source relation
        +--> logical-time timeline
        +--> maintained result
        +--> retained-state view
        +--> subscription stream
        +--> explanation
```

If an event occurs, all affected views must update consistently. Avoid decorative
charts, diagrams, and motion that are disconnected from the simulation.

Use a coherent visual language across chapters. For example:

- additions use a consistent `+diff` treatment;
- retractions use a consistent `-diff` treatment;
- logical time uses the same ruler and controls;
- in-memory and durable state have distinct markers;
- frontiers and progress use a recognizable indicator; and
- animations preserve timestamp semantics and do not imply false ordering.

---

## 7. Exercise Design

Exercises should expose misconceptions rather than test SQL syntax recall.

Prefer exercises such as:

- predict the next diff;
- reconstruct the current relation;
- trace a change through a join or aggregate;
- explain why a result changed without new input;
- diagnose stale data;
- choose between a view, index, and materialized view;
- identify unexpectedly large maintained state;
- diagnose skew or a blocked frontier;
- select a safe read timestamp or consistency policy;
- explain hydration after restart; and
- debug downstream delivery after a crash.

Use syntax-writing tasks only when syntax is part of the learning objective.

---

## 8. Technical Accuracy

Materialize evolves quickly. Verify product behavior against the current
[official Materialize documentation](https://materialize.com/docs/) before
encoding it in content or simulation logic.

For each lab, record or retain enough evidence to answer:

- Which official documentation pages support the behavior?
- Is the feature stable, public preview, or private preview?
- Does a real query or reproducible example confirm it?
- What boundary cases could invalidate the simplified simulation?

Important distinctions include:

- logical time is different from application event time and wall-clock time;
- `mz_now()` is Materialize's logical query time, while `now()` reflects the
  transaction's system-clock time;
- a Materialize index maintains the indexed object's full result in a cluster's
  memory and is not a PostgreSQL-style secondary B-tree;
- cluster replicas redundantly perform the full workload rather than sharding it;
- a running object is not necessarily fresh;
- consistency does not guarantee that every recent external write has already
  been ingested;
- snapshotting from an upstream source differs from rebuilding in-memory state
  during hydration;
- a materialized view's durable output does not remove all hydration work;
- small result sets can require large maintained intermediate state; and
- exactly-once behavior is an end-to-end property involving downstream systems.

Label educational estimates as estimates. Never present simulated timing,
memory, or work counts as measured Materialize performance.

---

## 9. Application Architecture

The application is a static client-side web application with a real codebase.

Default stack:

- Vite
- React
- strict TypeScript
- React Router
- Tailwind CSS
- Vitest
- Playwright

The app should compile to static assets and require no persistent application
server for the MVP. Do not add Next.js, a backend, authentication, an application
database, GraphQL, or server-side sessions without a concrete product need.
`localStorage` is sufficient for early progress persistence.

Do not add Redux or Zustand by default. Start with pure domain functions,
`useReducer`, and small custom hooks. Add global state infrastructure only after
a concrete need appears.

Do not introduce MDX or a generic lesson engine initially. Interactive chapters
are naturally expressed in TSX. Extract shared abstractions only after repeated
patterns exist in at least two real chapters.

---

## 10. Code Boundaries

Materialize and simulation semantics must not be implemented independently in
presentation components.

Use three conceptual layers:

### Domain and simulation

Pure TypeScript for relations, updates, logical timestamps, events, state
transitions, maintained results, subscription changes, and prediction
validation. Prefer deterministic functions that do not depend on React or DOM
APIs.

```ts
type Diff = number;

interface RelationUpdate<Row> {
  row: Row;
  time: number;
  diff: Diff;
}
```

Do not unnecessarily restrict the general domain type to `1 | -1`; Materialize
diffs represent changes in row multiplicity and can have larger magnitudes.
Individual introductory scenarios may use only `+1` and `-1`.

### Learning content

Chapter metadata, objectives, explanations, misconceptions, scenarios,
checkpoints, exercises, hints, and expected predictions. Keep this content close
to its chapter rather than scattering it through generic UI components.

### Presentation

React components render state derived from the simulation. Components such as
`SourceTable`, `Timeline`, `MaintainedRelation`, `SubscriptionStream`,
`PredictionPrompt`, and `ExplanationPanel` should contain as little domain logic
as practical.

---

## 11. Suggested Project Structure

```text
materialize-learning-lab/
|-- public/
|-- src/
|   |-- app/
|   |   |-- App.tsx
|   |   |-- router.tsx
|   |   `-- layout/
|   |-- chapters/
|   |   |-- chapterRegistry.ts
|   |   `-- time/
|   |       |-- Chapter.tsx
|   |       |-- TemporalFilterLab.tsx
|   |       |-- scenario.ts
|   |       |-- simulation.ts
|   |       `-- simulation.test.ts
|   |-- components/
|   |   |-- chapter/
|   |   |-- simulation/
|   |   |-- sql/
|   |   `-- ui/
|   |-- domain/
|   `-- styles/
|-- tests/e2e/
|-- CLAUDE.md
|-- CURRICULUM.md
|-- package.json
|-- tsconfig.json
`-- vite.config.ts
```

The boundaries matter more than the exact filenames.

Each chapter and substantial lab should have a stable URL so it can be linked,
shared, navigated with browser controls, and targeted by tests.

---

## 12. Testing

Educational correctness is the highest-value testing target.

Use Vitest for:

- relation and diff behavior;
- deterministic state transitions;
- logical-time boundaries;
- maintained results and subscription changes; and
- exercise answers where an incorrect answer would misteach the concept.

Use Playwright for a small set of complete learner journeys. For the temporal
filter MVP, a meaningful end-to-end flow is:

```text
open the Time chapter
-> predict the outcome
-> start the scenario
-> observe a row enter the result
-> advance logical time
-> observe the row retract
-> receive the explanation
```

Do not write low-value tests solely to increase coverage percentage.

---

## 13. Design Direction

The application should feel like an interactive systems textbook, laboratory,
and guided worksheet.

Prefer:

- clear information hierarchy;
- compact explanations;
- synchronized views of system state;
- visible causality;
- purposeful animation;
- restrained interaction; and
- progressive disclosure.

Avoid generic dashboard styling, excessive gradients, arbitrary decoration,
animations without instructional meaning, excessive gamification, large UI
libraries by default, and abstraction layers created for hypothetical chapters.

---

## 14. Scope and Priorities

### Must

- clear learning objective;
- technically accurate content;
- interactive visual model;
- one canonical state driving synchronized views;
- learner prediction or manipulation;
- misconception-aware explanation;
- polished end-to-end chapter flow;
- clean domain/UI separation; and
- tests for important simulation semantics.

### Should

- several meaningful exercises per chapter;
- checkpoints and free exploration;
- official documentation references;
- stable chapter and lab URLs;
- visual consistency; and
- CI for build, lint, and tests.

### Could

- a real Materialize backend for selected exercises;
- cloud progress persistence;
- a SQL sandbox;
- telemetry, instructor tools, or adaptive exercises; and
- an expanded advanced track.

### Initial MVP excludes

- all chapters implemented at once;
- a generic SQL playground;
- broad LMS functionality;
- unnecessary infrastructure; and
- features unrelated to understanding Materialize.

---

## 15. Decision Rule

When choosing between two designs, prefer the one that makes Materialize's
behavior clearer to the learner while preserving technical correctness.

When choosing between two technical architectures, prefer the simpler approach
that still provides separation of concerns, testability, maintainability, and a
clear path to extend the product.

Success means a learner can accurately predict and explain behavior that was
previously surprising. It is not measured by page count, feature count,
dependency count, or architectural complexity.

---

## 16. Current Source of Truth

Unless explicitly changed later, assume:

- the product is **Materialize Learning Lab**;
- the repository is `materialize-learning-lab`;
- SQL-capable Materialize newcomers are the primary audience;
- the learner loop is **Learn -> See -> Try -> Check -> Build**;
- [CURRICULUM.md](./CURRICULUM.md) defines the current chapter split;
- the temporal-filter lab is the flagship MVP;
- simulations may be deterministic when they accurately teach the concept;
- current official Materialize documentation must be checked before technical
  behavior is encoded;
- multiple panels derive from one canonical simulation state;
- domain semantics live in pure TypeScript where practical;
- the stack is Vite, React, TypeScript, React Router, Tailwind CSS, Vitest, and
  Playwright;
- the app is statically deployable and has no backend by default; and
- abstractions and dependencies are introduced only in response to demonstrated
  needs.

New explicit user direction takes precedence over this file.
