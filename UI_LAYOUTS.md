# Shared UI layouts and controls

This is the implementation reference for the current app. Presentation rules live
in [CLAUDE.md](./CLAUDE.md); development workflow lives in
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
| Guided explanation fragments | `src/chapters/changing-relations/LessonText.tsx` |
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
