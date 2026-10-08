# Materialize Learning Lab

Read [MAINTAINABILITY.md](./MAINTAINABILITY.md) before changes. It is the single
source of truth for code quality and workflow. Explicit user direction takes
precedence over repository guidance.

## Product and content

- Teach SQL-capable newcomers to predict and explain Materialize behavior through
  interactive simulations: Learn -> See -> Try -> Check -> Build.
- [CURRICULUM.md](./CURRICULUM.md) defines chapter boundaries and order. Implement
  the requested scope; do not expand into a generic SQL playground or LMS.
- Each chapter needs a distinct objective, meaningful variations, prediction and
  explanation exercises, and a final less-guided challenge. Order by prerequisites.
- Ask learners to predict before revealing effects. Explain what happened, why,
  and the misconception behind an incorrect answer. Test SQL syntax only when it
  is a learning objective; favor understanding behavior over syntax recall.
- Build every lecture and exercise from current official
  [Materialize documentation](https://materialize.com/docs/). Before adding or
  changing content or semantics, verify explanations, SQL, simulations, guided
  steps, hints, answers, and grading against it. None may contradict documented
  behavior. Resolve uncertainty before implementation; do not invent semantics.
- Keep supporting links and verification notes beside each chapter: feature
  availability (stable or preview), relevant boundary cases, and reproducible
  SQL examples where practical. Use real queries to resolve unclear behavior.
- Label educational simplifications and their limits without teaching false
  behavior. Never present simulated timing, memory, or work as measured performance.
- Preserve distinctions between logical, event, and wall-clock time; input
  ingestion and read consistency; durable output and in-memory state. Diffs are
  changes in full-row multiplicity, not necessarily restricted to +1 and -1.
- Teach causality and misconceptions through synchronized views, predictions,
  explanations, and exercises. Avoid decoration that implies false behavior.

## Technical accuracy reminders

Verify these distinctions when relevant; this list does not replace documentation:

- Distinguish mz_now() logical query time from now() transaction system-clock time.
- Indexes maintain full results in cluster memory; they are not secondary B-trees.
  Replicas redundantly execute workloads rather than shard them.
- A running object need not be fresh. Consistency does not imply all recent
  upstream writes have been ingested.
- Source snapshots differ from hydration. Durable materialized output does not
  eliminate hydration; small results can require large intermediate state.
- Exactly-once behavior depends on the whole delivery path, including downstream
  systems.

## Architecture

- Static client app: Vite, React, strict TypeScript, React Router, Tailwind CSS,
  Vitest, and Playwright. No backend or new infrastructure without a concrete need.
- One canonical simulation state drives every related panel. Keep domain semantics
  and deterministic state transitions in pure TypeScript, separate from rendering.
- Keep chapter scenarios, explanations, objectives, and exercises beside their
  chapter. Reuse appropriate shared components, hooks, and styles.
- Preserve stable chapter and lab URLs. Use localStorage for existing local
  progress; do not add persistence systems without a requirement.
- Prefer pure functions, useReducer, and small hooks. Add global state libraries,
  lesson engines, or other infrastructure only for demonstrated needs.

## Chapter style and layout

- [UI_LAYOUTS.md](./UI_LAYOUTS.md) maps the current templates, shared controls,
  styles, and regression checks. Use it alongside the rules here. Chapter READMEs
  describe their own visualizations; historical audits and `mock/` are not current
  layout specifications.
- Lectures must reuse `LectureScreen` in `src/labs/components/LectureScreen.tsx`:
  `with-tip` preserves the Chapter 1 frame and bottom tip; `without-tip` uses the
  same content frame with playback near the viewport bottom. Chapter 1 uses `with-tip`;
  Chapter 2 lectures 1–4 use `without-tip`. Shared frame measurements live in
  `src/labs/components/lecture-layout.css`; chapter styles only define the
  visualization inside it. Both layouts retain their compact viewport behavior.
- Change the selected layout at its shared source, not with per-lecture footer
  offsets or copied frames. All four Chapter 2 lectures share a playback baseline,
  including Lecture 4 without metric cards. The no-tip layout uses available
  viewport space below the visualization; it does not move the title or toolbar.
- Preserve existing spacing and the positions of titles, controls, and panels
  unless the user explicitly requests a layout change. When removing or moving
  controls, retain their layout footprint so surrounding content does not shift.
- Keep lecture subtitles and exercise status text readable using the shared
  typography. Do not hide subtitles, shrink fonts, or alter unrelated gaps to make
  a requested control change fit. Retain the existing responsive adaptations.
- Consistency has two levels, and both are required. Across the whole app,
  typography, font sizes, buttons, controls, and shared styling must follow the
  common design system and remain consistent from chapter to chapter. Within a
  chapter, lectures and exercises that use the same visualization must also share
  its layout: spacing, dimensions, alignment, labels, and responsive behavior.
- Treat an existing page that the user or curriculum identifies as the reference
  as the source of truth. Before building or editing a comparable page, inspect
  that page's rendered structure and reuse its components, markup, class names,
  and styles wherever practical. Prefer extending a shared component or shared
  stylesheet over copying a page and tuning it independently. Do not approximate
  a reference from memory or create a parallel layout and reconcile it later.
- Matching design tokens alone is insufficient. Preserve the arrangement of
  headings, stage selectors, SQL labels, tables, panels, metrics, controls,
  navigation, help, and guided steps. When a shared layout changes, update all
  affected lectures and exercises together.
- Chapter 1 is the baseline for app-wide typography, font sizes, buttons,
  controls, and shared styling. Within each chapter, use its established lectures
  and exercises as the reference for spacing and equivalent visualization
  layouts. For Chapter 2, Lecture 1 defines the numbered stage-button layout with
  names and SQL labels above the panels. Later lectures must reuse that pattern.
- Chapters may and should use different visualizations and concept-specific
  panels when the learning objective calls for them. Keep those visualization
  differences inside the shared app styling and, where applicable, the chapter's
  shared layout. Do not force distinct concepts into identical diagrams.
- Keep terminology, equivalent control behavior, focus handling, and responsive
  patterns consistent within and across chapters. Fit content by removing
  redundancy or moving detail into existing help and SQL & Objectives, while
  preserving familiar page structure. Changes to shared patterns must be applied
  consistently to affected pages; do not redesign a single page without an
  explicit user request or a concrete learning or accessibility need.
- Lectures and exercises must fit the viewport without page or workspace scrolling.
  Never scale the page or shrink fonts to fit content. Remove redundant information
  or move supporting detail into guided explanations and SQL & Objectives.
- Keep table and panel dimensions stable as rows change, using empty rows where
  needed. On narrow screens, use panel selectors; guided steps must reveal their
  highlighted panel. Keep active information and controls visible.
- Preserve other chapters' expanded navigation branches and subsections when the
  active chapter changes. Support keyboard access and both themes.
- Implemented lecture and exercise pages have no top Previous/Next page links.
  Preserve the separate Previous/Next change or timestamp playback controls.
  Chapter navigation remains in the sidebar and chapter overviews.
- All lectures use the shared `LectureControlsTourButton`: question-circle icon
  and Controls tour label, page-colored background, and a border highlight on
  hover rather than an underline. Center it over Start guided run where space
  permits; preserve its narrow-screen title-overlap protection. Keep Docs beside
  the theme switch without a reserved header help-button spacer. The home-page
  Take a tour button remains the entry to the full chapter walkthrough.
- SQL & Objectives popups contain the learning objective, SQL reference, and
  documentation links. Do not restore Tutorial/Exercises navigation buttons
  inside these popups on either lectures or exercises.
- Guided explanations reuse `LessonText` for rows, diffs, timestamps, counts,
  and terms. Chapter 2 distinguishes columns with consistent colors in guided
  highlights and changed fields in row diffs; table headers remain neutral.
  Use the shared column mapping in Chapter 2's `lecture-one.css`, including dark
  theme colors. Text and signed badges must still convey meaning without color.
- Explanations and row diffs must use the table's actual field names. In Chapter 2,
  the column is `note`; call it note, never delivery note. This naming rule does
  not prohibit the technical term delivery in unrelated streaming explanations.
- Keep explanations compact, hierarchy clear, and animation purposeful. Avoid
  arbitrary decoration, excessive gradients, gamification, and large UI libraries.

## Verification

- Match checks to the change. Use targeted tests for affected behavior; do not add
  tests that merely repeat implementation or rerun broad suites without a reason.
- Use Vitest for simulation semantics, state transitions, grading, and navigation.
  Use Playwright for important learner journeys and interaction regressions.
- For lecture or exercise layout changes, verify affected states at desktop,
  laptop, and mobile sizes. Cover guided flow, themes, and keyboard access when
  relevant.
- Commands: npm test, npm run typecheck, npm run build, npm run test:e2e.
  Documentation-only edits need no application test suite.

## Git

- Check the active branch before editing. Default to david-ui-changes unless the
  user directs another branch; continue on an explicitly requested task branch.
- Preserve unrelated work. Do not reset or discard changes without authorization.
- Commit, merge, push, or deploy only when requested.
