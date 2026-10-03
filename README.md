# Materialize Learning Lab   

A static, browser-based learning product for developers and data engineers who
know SQL and want to understand Materialize. [CLAUDE.md](./CLAUDE.md) defines the
architecture; [CURRICULUM.md](./CURRICULUM.md) defines the learning sequence.

This release is the **frontend foundation**: application shell, real routes,
chapter and capstone registries, themes, responsive navigation, and reusable lab
surfaces. It does not implement exercises, simulations, SQL execution, or
Materialize semantics. Progress intentionally starts and stays at zero.

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
Chapter 1 scaffolds Lecture 1, Lecture 2, Exercise 1, and Exercise 2. The Time in
Materialize chapter also has two tutorial slots and two exercise slots.
Next/previous navigation follows each chapter's sequence across the two groups.
Lecture/exercise pages include breadcrumbs and reference controls. These are
empty content slots. Other chapters have empty section overviews and no
invented lectures or exercises. Unknown sections/pages show a not-found page;
the old `/workspace` previews are no longer exposed.

## Source boundaries

```text
src/
  app/                 Router, app entry, shared layouts and resource configuration
  chapters/            Curriculum, navigation outline, overview and content shells
  challenges/          Capstone registry and challenge overview
  pages/               Learning path, libraries, not-found/error pages
  labs/                Lab page, header, toolbar, workspace layout
  components/
    layout/            Header, sidebar, breadcrumbs, page layout
    chapter/           Content placeholders, previous/next navigation
    lab/               Timeline, source, event, result, stream, reference, checkpoint
    ui/                Buttons, badges, progress, empty states, panels, table, dialog
  hooks/               Theme preference/provider and shared page-title behavior
  styles/              Tokens, global base rules and styles grouped by responsibility
  domain/              Documented boundary for future pure domain code
tests/e2e/             Chapter journeys, themes, routing, responsive checks
mock/                  Preserved exploratory prototype; not application code
```

## Extending the foundation

- Keep chapter metadata in `src/chapters/chapterRegistry.ts`. Core counts,
  navigation, headings, and lookups are derived from that registry.
- Add a chapter's navigation slots in `src/chapters/chapterOutline.ts`, following
  Chapter 1. Tutorial pages come first, followed by exercise pages. The sidebar,
  route validation, section lists, and next/previous links share this outline.
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
- Place actual objectives, scenarios, and lab components beside their chapter.
  Keep deterministic simulation functions in the domain layer, not in panels.
- The lab workspace components remain available for future implementation but
  are not exposed as preview routes. Compose `LabWorkspace` with the explicit
  panel components. Panels accept display props or children; source/result
  tables use the semantic `Table`
  wrapper with ordinary `thead`, `tbody`, and cell elements.
- Supply callbacks to `LabToolbar` only when the real actions exist. Missing
  callbacks leave run/reset/guided controls disabled.
- `SqlObjectivesPanel` accepts an objective, optional SQL text, and documentation
  links. `GuidedRunOverlay` accepts controlled visibility, checkpoint copy,
  counts, and continue/close callbacks. It intentionally has no production demo
  or checkpoint state machine. Both use the native dialog’s focus containment,
  Escape handling, and focus restoration.
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
  Pages can still grow at small sizes or when real content is added; scrolling
  is never globally disabled. The desktop chapter sidebar scrolls independently.
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

Vitest protects registry identity/order against the curriculum, core/advanced
counts, chapter-outline ordering and validation, pagination boundaries, route
helpers, capstone prerequisites, and theme storage behavior. Playwright serves a production build
and checks desktop/mobile learner journeys,
back/forward and reloads, lecture-to-exercise navigation, keyboard-operable
sidebar groups, theme persistence, not-found routes, and widths
1440/1024/768/390. Browser console errors fail the journeys. Screenshots are
saved in `test-results/` for
visual review, with traces/screenshots retained on failure.

For interactive test debugging, use `npm run test:e2e:ui`.
