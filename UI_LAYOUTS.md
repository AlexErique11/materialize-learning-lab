# Shared UI layouts and controls

This is the implementation reference for the current app. Presentation rules are included below; development workflow lives in
[MAINTAINABILITY.md](./MAINTAINABILITY.md). These templates are React components
and shared CSS, not independently maintained mockup files.

## Layout templates

| Template | Current users | Behavior |
| --- | --- | --- |
| `LectureScreen`, `layout="with-tip"` | Chapter 1 lectures 1–2 | Chapter 1 reference frame, metrics, visualization, playback, and bottom tip when it fits. |
| `LectureScreen`, `layout="without-tip"` | Chapter 2 lectures 1–4 | Same reference for upper content, no tip, and playback lower in the available viewport. |
| `ExerciseFrame` through `GuidedLabScreen` | Chapter 1 and Chapter 2 exercises | Shared progress and action controls, SQL reference, question flow, and chapter-owned visualization; no lecture tip. |

`src/labs/components/LectureScreen.tsx` accepts `metrics`, `visualization`, and
`playback` slots plus the common screen props. Chapter 2 supplies them through
`src/chapters/incremental-maintenance/MaintenanceLecture.tsx`. Chapter 1's lecture
components compose the same screen directly. Choose a template and populate its
slots when adding a lecture; do not copy its frame into the new page.

`src/labs/components/lecture-layout.css` owns lecture frame dimensions and
responsive tokens. The no-tip template measures the available viewport and content
so its footer stays aligned across all four Chapter 2 lectures. In roomy fullscreen
views, playback ends 16px above the viewport bottom, using
`--lecture-playback-bottom-space`; compact screens adapt to available space.
Lecture 4 omits visible metric cards but uses the same reference measurement for
footer alignment. Do not add empty visible cards to compensate.

The title, subtitle, SQL & Objectives, Reset, Run/Pause, and Start guided run
belong to the shared screen. Preserve their positions during changes to the frame
below them. Retain the current responsive subtitle placement and panel selectors.
Change requested frame spacing through its template rather than page-specific
margins. Chapter-specific CSS owns the visualization inside the frame.

## Shared component ownership

| Surface | Implementation |
| --- | --- |
| Title, toolbar, subtitle, reference popup composition | `src/labs/components/GuidedLabScreen.tsx`, `src/styles/guided-labs.css` |
| Lecture frame and footer placement | `src/labs/components/LectureScreen.tsx`, `src/labs/components/lecture-layout.css` |
| Exercise controls and question frame | `src/components/lab/ExerciseFrame.tsx` |
| Lecture Controls tour appearance and alignment | `src/components/walkthrough/LectureControlsTourButton.tsx`, `src/styles/spotlight.css`, `.guided-lab-help-slot` in `src/styles/guided-labs.css` |
| Lecture help slot and hidden page-link footprint | `src/components/chapter/ChapterPagination.tsx` |
| Docs and theme controls | `src/components/layout/AppHeader.tsx`, `src/styles/app-header.css` |
| Home-page Take a tour | `src/pages/LearningPathPage.tsx`, `.learning-path-tour-button` in `src/styles/learning-path.css` |
| SQL, objective, documentation dialog | `src/components/lab/SqlObjectivesPanel.tsx` |
| Guided explanation fragments | `src/components/lesson/LessonText.tsx` |
| Chapter 2 column colors and common panels | `src/chapters/incremental-maintenance/lecture-one.css` |

Controls tour is a single shared button for all six implemented lectures. Its
background matches the page in both themes; its border becomes purple on hover.
Its alignment uses the center of `[data-walkthrough="guided"]`, with a guard against
overlapping the title when the toolbar wraps on narrow screens. Preserve native
keyboard focus styling and focus restoration after the walkthrough closes.
Redesign this component once to update every lecture.

The home-page Take a tour label has a scoped 1px vertical adjustment for optical
centering in Arial. Keep that correction local to the label; it does not change
the button's size, position, or the shared Button component.

`ChapterPagination` retains the old page-navigation footprint while hiding those
links on implemented lectures and exercises. The playback controls below the
visualization are separate. The app header has no placeholder for the old question
mark. The SQL popup has no Tutorial or Exercises links.

## Guided text and tables

Chapter 2 uses `LessonTextContent` fragments with an optional `column` key and
`data-column` styling. Its shared mapping is:

| Column key | Color token |
| --- | --- |
| `orderId` | `--lab-purple` |
| `productId` | `--practice-accent` |
| `amount`, `total` | `--warning` |
| `note`, `name` | `--maintenance-note-color` (theme-specific blue) |
| `count` | `--success` |

Each row's distinct fields use their corresponding colors in guided text and
changed-field emphasis. Table headers stay neutral. `RowDiffs.tsx` uses the same
field keys; replacement pairs emphasize changed fields, while inserts and
deletions emphasize the complete row. Keep the displayed `note` name consistent
in scenarios, highlights, row diffs, and help.

Tables reserve rows and panel footprints so changing timestamps, showing diffs,
and removing rows do not move controls. Chapter 2 lectures 1–3 reuse the stage and
panel arrangement from Lecture 1; Lecture 4 keeps its comparison visualization
inside the same no-tip frame. Exercise visualizations reuse their matching
chapter's tables and panels.

## Verification references

- `tests/e2e/shared-lecture-layout.spec.ts`: both templates, unchanged upper
  controls, aligned Chapter 2 playback, fullscreen and compact viewport fit.
- `tests/e2e/chapter-two-consistency.spec.ts`: equivalent Chapter 2 panel geometry
  across timestamps and screen sizes.
- `tests/e2e/walkthrough.spec.ts`: lecture help, paused playback, and focus handling.
- `tests/e2e/incremental-maintenance.spec.ts`, `chapter-two-exercises.spec.ts`, and
  `changing-relations-exercise.spec.ts`: chapter-specific learner journeys.

Use only the checks relevant to a change. Include desktop, laptop, and narrow
screens when layout changes; include light/dark themes and keyboard interaction
when changing controls. Documentation-only changes need link and consistency
review, not an application test run.

## Additional shared ownership

- `src/components/lesson/lessonTextTypes.ts` owns JSX-independent explanation types.
- `src/components/lesson/RelationHelp.tsx` owns accessible relation help;
  `logicalTimestampHelp.ts` contains the cross-chapter timestamp definition.
- `src/hooks/useExerciseStages.ts` owns exercise-stage state, grading types and integer parsing.
- `src/styles/lesson.css` owns common lesson typography, metrics, panels, tables and help.
- `src/styles/exercise.css` owns the shared question frame and controls. Chapter 1
  keeps inventory inputs, visualization dimensions and completion styling local.
- `src/styles/ui.css` owns inert reserved-region dimensions. Missing content and
  learning-path completion leave empty space, excluded from focus and accessibility.

## Chapter style and layout

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
- The established Chapter 1 appearance is the baseline for app-wide typography, font sizes, buttons,
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
