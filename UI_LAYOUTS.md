# Shared UI layouts and controls

This is the implementation reference for the current app. Presentation rules are included below; development workflow lives in
[MAINTAINABILITY.md](./MAINTAINABILITY.md). These templates are React components
and shared CSS, not independently maintained mockup files.

## Layout templates

| Template | Current users | Behavior |
| --- | --- | --- |
| `LectureScreen`, `layout="with-tip"` | Chapter 1 lectures 1–2 | Chapter 1 reference frame, metrics, visualization, playback, and bottom tip when it fits. |
| `LectureScreen`, `layout="without-tip"` | Chapter 2 lectures 1–4; Chapter 3 lectures 1–3; Chapter 4 lectures 1–4; Chapter 5 lectures 1–4 | Shared upper controls, no tip, chapter-owned visualization, and playback lower in the available viewport. |
| `ExerciseFrame` through `GuidedLabScreen` | Chapter 1–6 exercises | Shared progress and action controls, SQL reference, question flow, and chapter-owned visualization; no lecture tip. |

`src/labs/components/LectureScreen.tsx` accepts `metrics`, `visualization`, and
`playback` slots plus the common screen props. Chapter 2 supplies them through
`src/chapters/incremental-maintenance/MaintenanceLecture.tsx`. Chapter 1's lecture
components compose the same screen directly. Choose a template and populate its
slots when adding a lecture; do not copy its frame into the new page.

`LectureWorkspace` owns that frame independently of the page controls.
`ExerciseFrame.renderWorkspace` can compose its visualization, question, and
navigation slots with this same frame. Questions supplied through
`afterVisualization` follow the graph without changing its measured upper inset.
Chapter 3 exercises use `ObjectExerciseWorkspace` to measure the actual lecture
canvas on entry and resize, including sidebar resizing. The temporary hidden,
inert reference is removed immediately. Exercises share all lecture panel geometry
and table spacing. The whole exercise diagram is lifted up to 55px from that
baseline, limited by header clearance; questions have a separate anchor at the
unshifted lecture canvas bottom plus 5px.
Compact
questions use a checkbox selection dialog; the prompt itself stays visible.
Query observations sit above the diagram. The existing Next question footer stays
independently anchored to the page. Narrow windows select a reference panel.
Chapter 3 owns this viewport fit and route-scoped scroll lock.
Chapter 3 uses the shared exercise navigation inset: 12px by default, 16px on
desktop windows at least 741px high, and 24px from 850px.
All exercise chapters use this October 10 navigation clearance on desktop.
`src/styles/exercise.css` anchors navigation independently of compact lecture
padding so a 2px lecture inset cannot pull it against the bottom. Desktop Next
question buttons are 40px tall, including Chapter 6. Navigation rows still reserve
their space; the buttons anchor to the page independently so compact content
cannot push them below the shared baseline.

`src/labs/components/lecture-layout.css` owns lecture frame dimensions and
responsive tokens. The no-tip template measures the available viewport and content
so its footer stays aligned across all four Chapter 2 lectures. In roomy fullscreen
views, playback ends 16px above the viewport bottom, using
`--lecture-playback-bottom-space`; compact screens adapt to available space.
Short desktop views share 2px of page-bottom padding through
`--lecture-page-padding-bottom`; chapter CSS must not override that bottom spacing.
Chapter 2 Lecture 4 omits visible metric cards but uses the same reference measurement for
footer alignment. Do not add empty visible cards to compensate.
Chapter 4 uses two distinct visualizations in this frame, implemented locally in
`src/chapters/getting-data-in/IngestionLayouts.tsx`. Its metrics form a compact
status bar rather than three cards. Lecture 1 places upstream and Materialize
tables on opposite sides of a snapshot-to-CDC bridge, with a shared ingestion
queue below. Lectures 2–4 place the record inspector on the left, and stack signed
changes above a wider current relation on the right. The signed ledger reserves
two rows, its maximum replacement pair; product tables reserve four rows.
Chapter-specific styles own these arrangements and their compact dimensions.
On phones, tablets below 1024px, and short windows up to 1150px wide, panel
selectors reveal one complete panel, including its relevant
changes. Guided runs select their target panel automatically. The shared screen
measures the whole status bar as its metrics slot to keep playback within the
viewport.

Chapter 4 exercises reuse the panels through `ExerciseFrame`, preserving their
fields and row capacities. Desktop views arrange three compact reference panels
above the question, following Chapter 2's table-and-answer arrangement.
Chapter 4 exercises use a 24px gap between the status row and reference panels,
matching Lecture 2, and the same 24px gap between panels and the question. Remaining
viewport space sits before the bottom navigation.
Accepted answers mark the choices without an extra feedback row, matching Chapter
2 Exercise 1. The next button uses that reference's responsive bottom inset.
Up to 1150px wide or 700px high, panel selectors show one reference beside the question;
metrics are available in a dialog, and answer-group buttons
reveal one complete group. Phones stack the selected panel above the question,
allowing page scrolling so both remain accessible. Table containers do not scroll.
Answers survive panel and group switches. Chapter-local exercise styles own this
adaptation without changing the shared title, subtitle, or action controls.

The title, subtitle, SQL & Objectives, Reset, Run/Pause, and Start guided run
belong to the shared screen. Preserve their positions during changes to the frame
below them. Retain the current responsive subtitle placement and panel selectors.
Change requested frame spacing through its template rather than page-specific
margins. Chapter-specific CSS owns the visualization inside the frame.

Chapter 5 uses the same no-tip frame through `TemporalLecture.tsx`. A compact
source/result/logical-time strip sits above Source, Row lifetimes, and Current
result panels arranged in one row. Tables reserve three rows; the result panel
reserves two signed diffs. Lecture 1 shows clock samples and its single lifetime
bar together. The timeline reserves two SQL lines to keep its rows aligned as
predicates wrap. All four lectures share the same outer dimensions. Below 1280px
wide or at heights up to 620px, panel selectors show one complete panel and follow
the active guided step. Actual logical time is separate from playback indices.

Chapter 5 exercises reuse these panels and `ExerciseFrame` for a 4/4/5-question
sequence. Desktop and laptop views keep all three reference panels visible above
the question, with clock samples inside Exercise 1's Row lifetimes panel, as in
Lecture 1. The summary strip contains only the three metrics. Roomy views use
a 24px gap before the question. Shorter views tighten panel spacing and place
the prompt beside its answers within the question box below the metrics; panels
are never replaced with selectors on these screens. The existing bottom-right
navigation stays aligned with other chapters. Phones switch between the question
and reference panels and offer a Metrics dialog without losing answers. Table rows
keep the lecture dimensions. Accepted predictions update the known state and
replace the question's description with feedback, without adding a feedback row.
The filter-choice question conceals the reference predicate until acceptance.

## Shared component ownership

`src/progress/labProgress.ts` stores completed canonical activity paths in browser
localStorage, under `materialize-learning-lab-progress-v1`. `useLabProgress`
subscribes the sidebar and Learning path to the same completed core chapter count,
including storage changes from other tabs. A chapter counts only after all of its
authored tutorials and exercises are complete. Both bars use the total number of
core chapters as their denominator; empty future chapters cannot earn completion,
and challenges are excluded.
Finishing a guided run earns tutorial completion; normal playback does not.
`ExerciseFrame` records completion only when all questions are accepted, including
Show Answer. Reset, replay, navigation and reload preserve earned completion.
`useLectureRun` exposes the saved completion state to every lecture template.
Sidebar activity dots turn green when completed, with purple taking precedence
on the current page. Completed lecture and exercise labels use the same muted
green as completed chapter titles; the current page label stays purple.
Completed chapters share that same completion calculation:
their number boxes gain a very light green fill, light green border and green
number when unselected. The selected chapter keeps the normal purple styling,
including in compact navigation. Completed, unselected chapter titles use a
muted green, while selected titles keep their normal purple navigation color.
Exercise completion uses the existing tutorial checkmark
and success color, anchored to the shared navigation inset at the lower left
(28px on desktop, 16px on phones) without shifting questions or metrics.
Completed Chapter 6 activities keep compact docked answers above this footer,
with short labels beside their controls so the measured diagram stays fixed.

`AreaTransition` owns navigation within Guided Labs and between app areas.
In-lab Guided labs breadcrumb and sidebar links use `guidedLabsHomePath` from
the chapter registry, bypassing the empty `/labs` entry redirect so they use the
same transition. The Learning path entry still uses `/labs` for its intro flow.
Overview, lecture and exercise navigation uses an 80ms fade of the frozen outgoing
content to the page's own background, then a 140ms reveal of the settled destination.
The destination's visible images, fonts and diagram layout settle behind the opaque
surface. Header and sidebar remain visible; live content is never transformed.
Sidebar indicators keep their color feedback in `src/styles/motion.css`.
Direct loads and reduced-motion navigation update immediately. Forward area
navigation slides the outgoing view left. Returning to Learning path slides that
page in from the left over the stationary outgoing view. Other returns slide
the outgoing view right. Explicit
Guided Labs entry eases the loading screen in over the preserved source page for
220ms, keeps its flask reaction, then slides that screen left.
Both use the 320ms timing and easing in `src/motion/motion.ts`. The destination
stays fully opaque and stationary so diagrams retain their measured geometry.
The header stays fixed. Inert snapshots preserve source backgrounds,
scroll positions and SVG references inside a clipped viewport. Reduced motion
skips slides and the reaction delay.

| Surface | Implementation |
| --- | --- |
| Title, toolbar, subtitle, reference popup composition | `src/labs/components/GuidedLabScreen.tsx`, `src/styles/guided-labs.css` |
| Lecture frame and footer placement | `src/labs/components/LectureScreen.tsx`, `src/labs/components/LectureWorkspace.tsx`, `src/labs/components/lecture-layout.css` |
| Exercise controls and question frame | `src/components/lab/ExerciseFrame.tsx` |
| Lecture Controls tour appearance and alignment | `src/components/walkthrough/LectureControlsTourButton.tsx`, `src/styles/spotlight.css`, `.guided-lab-help-slot` in `src/styles/guided-labs.css` |
| Lecture help slot and hidden page-link footprint | `src/components/chapter/ChapterPagination.tsx` |
| Docs and theme controls | `src/components/layout/AppHeader.tsx`, `src/styles/app-header.css` |
| Home-page Take a tour | `src/pages/LearningPathPage.tsx`, `.learning-path-tour-button` in `src/styles/learning-path.css` |
| Learning path documentation banner | `src/pages/LearningPathPage.tsx`, `.learning-path-documentation` in `src/styles/learning-path.css`; two faint diagonal bands echo the logo, text and the Open docs link share the cards' horizontal insets, and content stacks on phones; spacing separates it from the cards without a divider |
| SQL, objective, documentation dialog | `src/components/lab/SqlObjectivesPanel.tsx`, `src/components/ui/Dialog.tsx`; SQL panels opt into backdrop-click dismissal through the existing close animation and focus restoration, while content clicks and drags from inside stay open |
| Guided explanation fragments | `src/components/lesson/LessonText.tsx` |
| Chapter 4 snapshot bridge and record inspector | `src/chapters/getting-data-in/IngestionLayouts.tsx`, `lecture-one.css`, `record-lectures.css` |
| Chapter 4 exercise answers and compact views | `src/chapters/getting-data-in/IngestionExercisePage.tsx`, `ExerciseAnswers.tsx`, `ExerciseWorkspace.tsx`, `exercises.css` |
| Chapter 5 temporal exercises and compact views | `src/chapters/time-in-materialize/TemporalExercisePage.tsx`, `TemporalExerciseAnswers.tsx`, `TemporalExerciseWorkspace.tsx`, `exercises.css` |
| Chapter 2 column colors and common panels | `src/chapters/incremental-maintenance/lecture-one.css` |

Controls tour is a single shared button for all implemented lectures. Its
background matches the page in both themes; its border becomes purple on hover.
Its alignment uses the center of `[data-walkthrough="guided"]`, with a guard against
overlapping the title when the toolbar wraps on narrow screens. Preserve native
keyboard focus styling and focus restoration after the walkthrough closes.
Redesign this component once to update every lecture.

Exercise controls use compact shared buttons between 640px and 1150px width.
On tablets, the title takes a full row so the controls cannot squeeze it into a
narrow column. `src/styles/lesson.css` owns compact table and metric styles for
laptop heights up to 900px and tablet widths. Chapter 1's exercise keeps its
lecture's data gaps, stacks question text above answers on tablets, and uses a
compact question on short laptops to leave room for the navigation footer.

The home-page Take a tour label has a scoped 1px vertical adjustment for optical
centering in Arial. Keep that correction local to the label; it does not change
the button's size, position, or the shared Button component.

`ChapterPagination` retains the old page-navigation footprint while hiding those
links on implemented lectures and exercises. The playback controls below the
visualization are separate. The app header has no placeholder for the old question
mark. The SQL popup has no Tutorial or Exercises links.

## Guided text and tables

`useLabShortcuts` activates the existing enabled buttons in the active screen.
Guided-run arrows follow Back/forward, including predictions and same-state
inspections. Outside a guide, lecture arrows step changes/timestamps/cases and
Space toggles playback and Enter starts a guided run. R resets a lecture or
exercise. Exercise Enter checks the answer, including from a single-line answer
input; once accepted, Enter or Right activates the forward button, including the
next exercise or chapter completion. Ctrl+Enter reveals the answer, H shows the
exercise hint, and S toggles SQL & Objectives (Escape also closes it). Native button
activation, editing, selects, text selection, other modifiers, and IME composition
retain their behavior. Letter shortcuts do not run while typing in an input.
Held keys do not repeatedly advance or toggle actions. A modal blocks underlying
page shortcuts; Escape retains native dialog cancellation and tooltip dismissal.
The shared screen, guide, and exercise frame own these bindings across chapters.
Chapter completion marks its next-chapter button with `data-dialog-primary`.
The shared dialog focuses this action on opening and supports Enter to activate
it; Escape closes the window and restores focus to the finished exercise.

`Spotlight` owns guide placement, masking, and related-region navigation.
Lessons name a primary target and optional `related` targets; `useGuidedFocus`
connects those names to panel refs and the existing responsive panel selector.
Predictions expose only their primary target. After Show effect, up to three
separate regions are exposed together when the viewport has room for the card
without covering them. Otherwise Next/Back inspect each region in order before
advancing the lesson. The inspection buttons also allow direct selection.
Inspection changes only the target, never the simulation checkpoint or time.
Back from the first region retains the lesson's existing prediction/rewind
behavior. Keep related targets in causal order and include changed counts,
status, or limits when the explanation depends on them. Avoid adding every
unchanged panel. The mask leaves separate clear openings, keeping unrelated
content dimmed. Controls tours continue to use their existing single target.
When a compact frame hides a required summary, inspect that same summary as a
temporary floating target. The normal frame and its measured metric space stay
unchanged, and the summary returns to its responsive state when focus moves on.

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
- `tests/e2e/chapter-four-lecture.spec.ts` and `chapter-four-records.spec.ts`:
  snapshot and record layouts, guided predictions, and stable viewport fit through
  every checkpoint on desktop, tablet, and phone screens.
- `tests/e2e/walkthrough.spec.ts`: lecture help, paused playback, and focus handling.
- `tests/e2e/incremental-maintenance.spec.ts`, `chapter-two-exercises.spec.ts`, and
  `changing-relations-exercise.spec.ts`: chapter-specific learner journeys.

Use only the checks relevant to a change. Include desktop, laptop, and narrow
screens when layout changes; include light/dark themes and keyboard interaction
when changing controls. Documentation-only changes need link and consistency
review, not an application test run.

## Additional shared ownership

- Chapter 6's `progress-and-freshness/ProgressLanes.tsx` and `chapter.css` own
  aligned Orders/Payments/Paid orders lanes and the optional downstream Revenue
  lane. Solid markers show actual frontiers, dashed markers the input limit,
  diamonds observed changes, and dotted lines the simulated wall clock. A single
  scale positions every lane. Compact views keep the dependency lanes together;
  stage buttons select the evidence detail. Lectures reuse `LectureScreen`
  without-tip and its playback baseline. Three-row diagrams omit the unused Revenue row inside the box; equivalent
  outside space keeps the top edge, existing rows and surrounding content fixed.
  Phone subtitles reserve two lines up to 480px; the lag legend shares the normal
  caption footprint. Chapter CSS owns these matching visualization dimensions.
  Chapter 6 lecture headers use compact icons and titles with a selected underline;
  there are no metric cards or Metrics popup. The diagram key includes the clock
  value, while frontiers and lag stay in their existing lanes and evidence areas.
  Exercises reuse `ExerciseFrame` actions and questions with all relevant lanes
  permanently visible with the question. `ProgressExerciseWorkspace` measures the
  actual matching lecture once on entry/resize to share its complete diagram
  geometry, including panel bounds, axis, padding and lane/track spacing. Its hidden, inert reference is removed immediately after measurement.
  One compact clock/query/evidence strip replaces large metric cards and repeated
  details. The prompt may occupy space above the anchored diagram, with answers
  below, when the full question does not fit beneath it. Bounds checks prevent
  overlap and scrolling. Hints, errors and accepted answers cannot move the anchor.
  Navigation uses the shared exercise footer inset. Compact single-answer fields
  use native selects; multiple-answer fields keep checkboxes. In short windows,
  answers dock beside navigation and multiple choices use a checkbox dialog.
  Wide legends can host evidence in their unused left space. Lecture layouts and
  stage selectors remain unchanged.
  Document scrolling and overscroll are locked only while a Chapter 6 exercise
  is present. Short tablet windows use a compact header and place evidence in
  the same workspace to keep all controls accessible within the viewport.
  Chapter CSS changes visualization content only; shared controls
  retain their existing ownership and positions.

- `LectureScreen` marks no-tip lectures with `lecture-subtitle-layout`.
  `lecture-layout.css` owns their tablet subtitle wrapping, extracted from the
  original Chapter 2 styling so new lectures retain the same title and toolbar
  positions without importing chapter-specific CSS.

- Chapter 3's `views-indexes-materialized-views/FlowGraph.tsx`,
  `flowGraphModel.ts` and `chapter.css` own its input/compute/index/storage graph,
  shared by lectures and exercises. Solid purple maintenance paths, dashed teal
  query reads and dotted definition links connect HTML cards through SVG.
  Transform has a compute boundary separate from durable storage. Narrow windows
  use an overview and selected detail panel. Its actions are scenario steps, not
  logical timestamps. The shared lecture and exercise frames still own controls.
  `ObjectQueryControls.tsx` owns the query row and its inert reservation for
  Lecture 1, so the lecture diagram footprint stays consistent. Chapter 3
  exercises measure the real lecture frame through `ObjectExerciseWorkspace`
  and reuse its graph styles. The diagram is lifted as a single unit while the
  question uses a separate anchor below the diagram;
  compact answer selection prevents scrolling or moving the navigation footer.

- `src/components/lesson/lessonTextTypes.ts` owns JSX-independent explanation types.
- `src/components/lesson/RelationHelp.tsx` owns accessible relation help;
  pointer tooltips expand subtly from the trigger with the shared motion easing
  (160ms in, 100ms out), reversing from their current appearance on quick hovers.
  Keyboard focus and reduced-motion preferences show help immediately.
  `logicalTimestampHelp.ts` contains the cross-chapter timestamp definition.
- `src/hooks/useExerciseStages.ts` owns exercise-stage state, grading types and integer parsing.
- `src/styles/lesson.css` owns common lesson typography, metrics, panels, tables and help.
- `src/styles/exercise.css` owns the shared question frame and controls. Chapter 1
  keeps inventory inputs, visualization dimensions and completion styling local.
- `src/styles/ui.css` owns inert reserved-region dimensions. Missing activity content
  leaves empty space, excluded from focus and accessibility. The learning-path page
  uses saved activity progress for Guided labs. Challenge progress and status
  badges remain placeholders until challenge completion is implemented.

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
  Chapter 3 questions remain below the diagram with fixed question and navigation
  anchors; the diagram is raised independently without changing its panel spacing.
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
