# Materialize Learning Lab   

A static, browser-based learning product for developers and data engineers who
know SQL and want to understand Materialize. [CURRICULUM.md](./CURRICULUM.md) defines the learning sequence.

The app includes deterministic lectures and exercises for Chapters 1 and 2,
guided runs, control walkthroughs, SQL references, themes, and responsive chapter
navigation. Scenarios run locally; there is no live SQL service or Materialize
connection. Other curriculum chapters and capstones have registered routes with empty
reserved workspaces. Chapter and challenge completion is not tracked across the
learning path. Working activities retain their question and playback progress.

## Contributor instructions

Read [MAINTAINABILITY.md](./MAINTAINABILITY.md) for code quality and workflow. For UI changes, use
[UI_LAYOUTS.md](./UI_LAYOUTS.md) to locate the shared templates and controls, then
read the relevant chapter README. Preserve existing spacing unless the user asks
to change it. Update a shared component once rather than patching each lecture.

## Getting started

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Other commands:

```sh
npm run typecheck
npm run test
npm run build
npm run preview
```

The build produces static assets in `dist/`. A static host must rewrite requests
for application routes to `/index.html` while serving existing asset files
normally. Browser history, shared links, and deep-link reloads depend on this SPA
fallback. No backend or persistent server is required.

## Routes

| URL                                         | Surface                                                    |
| ------------------------------------------- | ---------------------------------------------------------- |
| `/`                                         | Learning path                                              |
| `/labs`                                     | Opens the first core chapter directly                      |
| `/labs/:chapterSlug`                        | Validated chapter overview                                 |
| `/labs/:chapterSlug/:sectionSlug`           | Tutorial or Exercises overview                             |
| `/labs/:chapterSlug/:sectionSlug/:pageSlug` | Registered lecture or exercise page                        |
| `/challenges`                               | Three capstone overviews                                   |
| `/challenges/:challengeSlug`                | Validated challenge detail                            |
| Other locations                             | Accessible not-found page                                  |

The selected chapter expands Tutorial and Exercises in the sidebar.
Guided labs links enter Chapter 1 directly. The sidebar provides access to all
twelve core chapters and the optional advanced chapter.
Desktop chapter navigation can collapse to an expand-button rail; mobile navigation
uses a keyboard-operable disclosure. Chapter overviews have no bottom pagination.
Chapter 1 implements two lectures and one exercise. Chapter 2 implements four
lectures and two exercises; its visible Exercise 2 retains the `exercise-3` URL.
Legacy exercise URLs redirect through `ChapterContentPage`. The Time in
Materialize chapter has two tutorial and two exercise navigation slots.
Implemented lectures and exercises omit top Previous/Next page links. Lecture
playback retains Previous/Next change or timestamp controls. Use chapter
navigation and overview entries to move between pages. Unknown sections/pages
show a not-found page; the old `/workspace` previews are no longer exposed.

## Source boundaries

```text
src/
  app/                 Router, app entry, shared layouts and resource configuration
  chapters/            Registry, outline, chapter scenarios, simulations and pages
  challenges/          Capstone registry and challenge overview
  pages/               Learning path, libraries, not-found/error pages
  labs/                Shared screens, lecture layouts and playback reducer
  components/
    layout/            Header, sidebar, breadcrumbs, page layout
    chapter/           Overview sections and previous/next navigation
    lab/               Exercise frame, metrics, panel tabs and SQL reference
    walkthrough/       Chapter tour, lecture controls help and spotlight behavior
    lesson/            Explanation fragments, help and shared help definitions
    ui/                Buttons, badges, progress, panels, table and dialog
  hooks/               Theme preference/provider, page titles and exercise-stage flow
  styles/              Tokens, global base rules and styles grouped by responsibility
  domain/              Boundary for domain code shared across chapters when needed
tests/e2e/             Chapter journeys, themes, routing, responsive checks
```

## Extending the app

- Keep chapter metadata in `src/chapters/chapterRegistry.ts`. Core counts,
  navigation, headings, and lookups are derived from that registry.
- Add a chapter's navigation slots in `src/chapters/chapterOutline.ts`, following
  Chapter 1. Tutorial pages come first, followed by exercise pages. The sidebar,
  route validation, section lists, and navigation destinations share this outline.
  This is navigation metadata, not a lesson engine. Implement real page content
  in explicit chapter-owned components when it is ready.
- Keep section labels and overview descriptions in `chapterOutline.ts`, and
  chapter introductions and documentation links in `chapterRegistry.ts`.
  `chapterNavigation.ts` derives previous/next destinations from that same outline.
  Overview documentation, overview sections, sidebar entries, and sidebar groups
  have focused components under `src/components/chapter/` and `src/components/layout/`.
- Keep learning-path feature and featured-challenge copy in
  `src/pages/learningPathContent.ts`. Shared external resources live in
  `src/app/resources.ts`, rather than being exported by a UI component.
- Place objectives, scenarios, simulations, and lab components beside their chapter.
  Keep deterministic simulation functions separate from React panels. Extract
  cross-chapter domain code only when real reuse requires it.
- Compose lectures with `LectureScreen` and one of the two layouts documented in
  [UI_LAYOUTS.md](./UI_LAYOUTS.md): `with-tip` for Chapter 1 and `without-tip` for
  all Chapter 2 lectures. Reuse `ExerciseFrame` for exercise controls and flow;
  keep the chapter's visualization inside the shared frame.
- `SqlObjectivesPanel` accepts an objective, optional SQL text, and documentation
  links. Its popups omit Tutorial/Exercises navigation. Lectures share
  `useLectureRun` for playback and guided prediction/reveal state. `WalkthroughProvider`
  owns the full chapter tour and per-lecture controls help. Keep native dialog focus
  containment, Escape handling, and focus restoration intact.
- `LectureControlsTourButton` owns the icon, label, hover treatment, and alignment
  for every implemented lecture. It is centered over Start guided run when space
  permits. The home-page Take a tour button opens the full chapter walkthrough;
  Docs remains beside the header theme switch.
- Theme defaults to light. Only an explicit light/dark choice is persisted under
  `materialize-learning-lab-theme`. Storage failures do not prevent switching.
- The learning path follows the supplied reference: guided-lab features, two
  featured challenge entry points, and Documentation and FAQ resources.
  All three capstones remain available at `/challenges`. Its styles are scoped in
  `src/styles/learning-path.css`; the shared navbar is unchanged and the footer is
  omitted on this route. Compact typography and spacing keep the overview within
  desktop and laptop viewports. Smaller screens stack the cards and scroll naturally.
- `PageContainer` has a `fitViewport` option for compact lesson pages
  and a `tone` option for learning (violet) or practice (teal) surfaces. Shared
  CSS tokens account for the header, footer, and collapsed chapter navigation.
  Implemented lectures and exercises must fit their viewport using the existing
  responsive layouts and panel selectors. Overview and learning-path pages can
  scroll on small screens; scrolling is never globally disabled. The desktop
  chapter sidebar scrolls independently.
- `Panel` uses one shared paper treatment: a neutral surface, thin border,
  small corners, and a subtle shadow. `PanelHeader` adds a small decorative accent
  dot when no icon is supplied. Background and accent colors come from theme
  tokens; there is no top accent stripe or per-page panel variant.
- The small local brand mark is replaceable. Official documentation is linked.

`src/styles/globals.css` imports the presentation system and defines only global
theme mappings, base rules, and reduced-motion behavior. Shared layout, UI
primitives, chapter navigation, SQL reference, challenges, and FAQ each
have their own stylesheets. `learning-path.css`, `guided-labs.css`, and
`chapter-overview.css` own their corresponding page styles; `app-header.css`
owns the complete header and uses the shared theme tokens. Preserve the existing
CSS layers and import order when editing styles, since page styles intentionally
override shared component defaults.

## Tests

```sh
npm run test
npx playwright install chromium
npm run test:e2e
```

Vitest covers registries, routing, theme storage, pure simulations, diff
reconstruction, grading, and SQL fixture comparisons. Playwright serves a production
build unless an existing server is reused, and checks learner journeys, guided
runs, walkthroughs, keyboard focus, themes, and responsive layouts. Shared lecture
frame and Chapter 2 panel checks are listed in [UI_LAYOUTS.md](./UI_LAYOUTS.md).
Browser console errors fail the journeys. Screenshots are
saved in `test-results/` for
visual review, with traces/screenshots retained on failure.

For interactive test debugging, use `npm run test:e2e:ui`.

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
