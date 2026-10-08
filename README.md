# Materialize Learning Lab   

A static, browser-based learning product for developers and data engineers who
know SQL and want to understand Materialize. [CLAUDE.md](./CLAUDE.md) defines the
architecture; [CURRICULUM.md](./CURRICULUM.md) defines the learning sequence.

The app includes deterministic lectures and exercises for Chapters 1 and 2,
guided runs, control walkthroughs, SQL references, themes, and responsive chapter
navigation. Scenarios run locally; there is no live SQL service or Materialize
connection. Other curriculum chapters and capstones remain registered placeholders.
Learning-path completion totals are not yet a complete progress dashboard.

## Contributor instructions

Read [AGENTS.md](./AGENTS.md), [CLAUDE.md](./CLAUDE.md), and
[MAINTAINABILITY.md](./MAINTAINABILITY.md). For UI changes, use
[UI_LAYOUTS.md](./UI_LAYOUTS.md) to locate the shared templates and controls, then
read the relevant chapter README. Preserve existing spacing unless the user asks
to change it. Update a shared component once rather than patching each lecture.

## Getting started

Use Node.js 22.12 or newer and npm.

```sh
npm install
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
| `/challenges/:challengeSlug`                | Validated challenge placeholder                            |
| Other locations                             | Accessible not-found page                                  |

The selected chapter expands Tutorial and Exercises in the sidebar.
Guided labs links enter Chapter 1 directly. The sidebar provides access to all
twelve core chapters and the optional advanced chapter.
Desktop chapter navigation can collapse to an expand-button rail; mobile navigation
uses a keyboard-operable disclosure. Chapter overviews have no bottom pagination.
Chapter 1 implements two lectures and one exercise. Chapter 2 implements four
lectures and two exercises; its visible Exercise 2 retains the `exercise-3` URL.
Legacy exercise URLs redirect through `ChapterContentPage`. The Time in
Materialize chapter has two tutorial and two exercise placeholder slots.
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
    chapter/           Content placeholders, previous/next navigation
    lab/               Timeline, source, event, result, stream, reference, checkpoint
    walkthrough/       Chapter tour, lecture controls help and spotlight behavior
    ui/                Buttons, badges, progress, empty states, panels, table, dialog
  hooks/               Theme preference/provider and shared page-title behavior
  styles/              Tokens, global base rules and styles grouped by responsibility
  domain/              Boundary for domain code shared across chapters when needed
tests/e2e/             Chapter journeys, themes, routing, responsive checks
mock/                  Preserved exploratory prototype; not application code
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
- The lab workspace components remain available for future implementation but
  are not exposed as preview routes. Compose `LabWorkspace` with the explicit
  panel components. Panels accept display props or children; source/result
  tables use the semantic `Table`
  wrapper with ordinary `thead`, `tbody`, and cell elements.
- Supply callbacks to `LabToolbar` only when the real actions exist. Missing
  callbacks leave run/reset/guided controls disabled.
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
primitives, chapter navigation, reusable lab workspace, challenges, and FAQ each
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
