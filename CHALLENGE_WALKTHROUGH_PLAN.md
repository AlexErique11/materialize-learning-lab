# Guided walkthrough for Save the Flash Sale

Status: implemented. The 32-stop interface tour is available from Full walkthrough
on the challenge overview. Question-mark buttons explain only the current page.
The sections below preserve its design and verification
criteria; facilitated learner timing remains a follow-up.

## Purpose

Give learners a guided explanation of the challenge's pages, observations, and
controls so they can investigate confidently. Explain the interface and the
concepts needed to interpret it while preserving the open investigation described
in [the challenge design](./CHALLENGE_SECOND_VERSION_PLAN.md).

By the end, a learner should know:

- What the operating contract asks them to demonstrate.
- Where to inspect inputs, SQL, completeness, serving, and application results.
- Which actions only change a view, save a draft, apply a change, or advance work.
- Why a correct query, fresh database snapshot, and complete application result
  are separate things to verify.
- How to use help, recover from changes, and complete handover.

The walkthrough explains every workspace and control group. It does not identify
the faulty components, supply the repaired SQL, select correct settings, or make
repairs. Existing investigation hints and worked repairs remain available after
the tour. Taking the interface tour does not count as assisted completion.

## Entry and navigation

Current behavior: the purple question-mark button starts the displayed page's
explanations immediately, without a welcome or cross-page section selector. It
finishes on that same page and leaves full-tour preferences intact. Full
walkthrough is a separate action in the overview heading; its welcome, sequence,
navigation transitions, and resume behavior are described below.

- Place the **Explain this page** question-mark icon beside **Start investigation**
  on the overview, with **Full walkthrough** in the overview heading.
  Offer a quiet, dismissible first-visit invitation; do not start a modal tour
  automatically or delay starting the challenge.
- Keep the page-help icon available in the investigation toolbar and on handover.
  Use the shared IconButton with a purple question mark and narrow-screen Tools
  pattern. Leave the home page's chapter tour intact.
- The full tour starts with a concise welcome. Start walkthrough follows **Overview & controls**,
  **Dashboard**, **Data**, **SQL**, **System**, **Client**, and **Help & handover**
  in one continuous sequence. Do not offer a section-only start.
- Give each workspace a title introduction explaining its purpose before
  covering the controls. On page changes, unblur the old page where the learner
  left it, move a visible pointer to the next navigation control, show a click
  and switch the page, then restore the spotlight on the new workspace title.
  Space these automatic stages 700 ms apart. Keep interaction blocked and
  Exit/Escape available. Consecutive stops on the same page focus immediately.
  Optional section jumps continue through the remaining sequence.
- Use the existing spotlight treatment with **Back**, **Next**, **Exit tour**,
  a section label, and step count. The final action is **Finish walkthrough**.
  Section navigation belongs inside the tour card so the background stays modal.
- Target roughly 6–10 minutes for the full tour, with short sections available
  independently. Treat this as an estimate to validate with learners, separate
  from the existing 10–20 minute investigation estimate.
- On exit or finish, return to the surface, workspace, selections, and scroll
  position from which the learner opened it. Finishing the tour never starts,
  submits, restarts, or completes an investigation.
- Remember a dismissed invitation and the last unfinished step using separate,
  versioned tour preferences. Offer **Resume walkthrough** or **Start again** on
  the next explicit opening. Do not reopen automatically after refresh.

Welcome copy:

> Learn how to investigate Save the Flash Sale. We'll visit each workspace and
> explain what its controls and results mean. Your investigation stays as it is
> while you look around. You can leave at any time and investigate in any order.

## Walkthrough storyboard

Each row is one stop, anchored to the named element. Keep visible copy to two or
three short sentences; use an optional **More detail** disclosure where the
coverage below needs more space. The details remain inside the tour card rather
than opening a second help dialog.

The 27 control stops below are supplemented by five workspace-title introductions,
for 32 stops in the implementation. Each introduction highlights Dashboard, Data,
SQL, System, or Client in the navigation and explains that page's purpose.

### Overview and shared controls

| Stop and spotlight | Explanation to provide |
| --- | --- |
| 1. Incident report and Operating contract | Introduce the operations complaint and the learner's role. Explain regional paid-order totals, the five-minute event-time window, replacement corrections, three-second normal reads, complete application publication, and the eight-unit shared serving budget. These requirements define success. |
| 2. Your working environment and Start investigation | Explain that SQL runs locally in PostgreSQL through PGlite, while streaming, connections, progress, clusters, and deliveries are simulated. No credentials are needed. Start begins an attempt; Continue resumes it. Drafts and applied changes save in this browser when storage is available. |
| 3. Investigation workspace tabs | Introduce Dashboard, Data, SQL, System, and Client as views of one shared system. Give a one-line purpose for each. The tour's visiting order is an orientation route; learners may investigate in any order afterward. |
| 4. Shared system and Show details | Explain incident time, applied query version, customer connection, processing status, and received client deliveries. The compact status and expanded details describe applied state across all workspaces. Selecting a different workspace does not apply edits. |
| 5. Advance incident and action scope labels | Explain the named next event and manual clock. Advance incident moves time forward without processing pending work or applying a repair. Introduce View only, Not applied, Changes shared system, and request/delivery labels. Reading and editing do not advance time. |

### Dashboard: see the symptom and compare layers

| Stop and spotlight | Explanation to provide |
| --- | --- |
| 6. Compare results and Explore the incident | Show how Show results displays database, application, or both. Explain that this is a view filter and the workspace links are navigation. Neither changes the underlying system. |
| 7. Operations dashboard and snapshot metrics | Explain Region, Orders, and Total as deployed-query output at the latest complete database snapshot. Distinguish snapshot time, snapshot age, and illustrative serving duration. A quick response can contain old data; a serving-unavailable notice means the observations are not currently serviceable. |
| 8. User-visible application | Explain that these are published client results, which can differ from the database because delivery and publication are separate. An empty client waiting for a baseline does not establish that there are no business orders. Client contains the delivery evidence. |

### Data: understand what enters the query

| Stop and spotlight | Explanation to provide |
| --- | --- |
| 9. Inspect input data | Explain Current orders, Retained producer messages, and Customers. Current orders reflect the applied source interpretation; retained messages preserve incoming history; Customers maps customer IDs to regions. Filter by order ID narrows the first two views and is unavailable for Customers. |
| 10. Input table and column headings | Define Order, Customer, Status, Amount, Event time, and Arrival. Explain that event time is when the business event happened and arrival is when it entered the lab. All displayed seconds share the same UTC origin. These are input rows, separate from query aggregates or complete serving snapshots. |
| 11. Source settings and Apply/Discard | Explain the behavior of append versus latest full keyed value, and what Order identity determines, without recommending a selection. Edits are saved drafts; Apply changes rebuilds current orders from retained messages, clears the last read, and resets client deliveries. Discard edits restores the applied source values. |

### SQL: inspect, test, and deploy deliberately

| Stop and spotlight | Explanation to provide |
| --- | --- |
| 12. Repair deployed query / Diagnostic SELECT | Explain the two modes. Repair edits the temporal WHERE predicate inside a supplied join and grouped regional query. Diagnostic SELECT inspects orders and customers with a single read-only query and cannot be deployed as the repair. |
| 13. Scenario replay snapshot | Explain the required explicit snapshot selection and its frozen SQL clock. Cases can include future scenario data; selecting one does not advance or rewind the live incident. This selection determines SQL execution context, not live freshness. |
| 14. Temporal WHERE predicate editor | Explain the fixed SELECT, JOIN, and GROUP BY around the editable filter. Point to the supported comparisons, AND, parentheses, and row timestamp plus INTERVAL syntax. Explain mz_now() as the selected scenario's logical clock, and direct learners to Reference for its supported form. Do not insert a repaired predicate. |
| 15. Run query preview and Query observations | Explain Ctrl+Enter, actual result rows, column types, empty results, errors, and the 200-row display limit. Execution does not apply the draft. Editor, mode, source, or snapshot changes can make a preview obsolete and require another run. Explain Cancel execution and retry when relevant. |
| 16. Applied/inherited comparison and Apply query | Distinguish the executed draft, applied query at the same scenario snapshot, and optional inherited-query comparison. Comparisons use the same applied source settings and time. Apply query requires a current successful repair preview; applying changes the shared system, clears the last read, and resets deliveries. Inspect deployed and inherited SQL shows definitions without changing them. |

### System: separate progress, freshness, and serving

| Stop and spotlight | Explanation to provide |
| --- | --- |
| 17. Connection and processing | Explain Pause/Resume customer connection separately from Process pending updates. Resuming permits progress; processing catches up available work without advancing the incident clock. Describe disabled states using the current connection and processing status, without activating either action. |
| 18. Dependencies and progress | Trace Orders + Customers through Recent orders and Regional totals to serving. Explain that Complete strictly below excludes the boundary timestamp itself, and that the limiting required input can hold back downstream completeness. Quiet inputs can still report progress; completeness and query speed measure different things. |
| 19. Request a snapshot and Snapshot requests | Explain the readable-window diagram as one retained, complete timestamp across required inputs. Request normal read tests the three-second age bound. Authorization enables an explicitly labeled ten-second fallback request; fallback is temporary mitigation. Explain available, waiting, and age-bound outcomes, and that the saved request result requires another request to test changed conditions. |
| 20. Serving settings and Applied serving design | Explain the recent-orders helper, final regional result, and cluster-local serving indexes. A regular view stores a definition, a materialized result stores maintained output, and local indexes support serving. Describe each option and displayed cost neutrally; distinguish the draft budget from applied objects. Apply changes clears the last read while preserving input rows, SQL previews, and client deliveries. Units are a teaching budget rather than a memory measurement. |

### Client: understand what users actually receive

| Stop and spotlight | Explanation to provide |
| --- | --- |
| 21. Receive deliveries | Explain the next signed row change or progress record, delivery count, and upstream prerequisites. Receive and process delivery processes output through the delivery timestamp and can advance shared time as labeled. Replay deliveries resets the client replay without undoing repairs or rewinding time. |
| 22. Application subscription diagram | Explain the input/result-to-client flow, progress boundary, pending and completed timestamp trays, and published application. Positive diffs add full rows and negative diffs remove them; Copies shows multiplicity. Multiple deliveries can belong to the same timestamp. Tray selectors inspect received history, and Diagram key explains the notation; neither receives more data. |
| 23. Client settings and application publication | Explain the three publication policies by what they do: publish each record, publish when progress reaches a timestamp, or publish after progress passes it. Explain the coordinated starting snapshot as a complete baseline for later changes. Do not choose a policy for the learner. Apply changes restarts deliveries while preserving database reads and SQL previews; Discard edits restores applied client settings. |

### Help, recovery, and handover

| Stop and spotlight | Explanation to provide |
| --- | --- |
| 24. Tools, Reference, and contextual help | Explain Challenge overview/Continue, Reference schemas, time conventions, operating contract, documentation links, and lecture links. Question icons explain a nearby concept. Show where keyboard shortcut help lives; walkthrough keys take precedence while the tour is open. These resources remain available after the tour. |
| 25. Investigation help, history, and Undo | Explain workspace-specific progressive hints and worked repairs. Hints are recorded; worked repairs mark assistance. A worked SQL repair fills a draft for preview, while other worked repairs apply immediately. Applied change history is automatic; Undo last change restores the prior configuration and is separate from replaying or rewinding time. |
| 26. Review handover and End-to-end acceptance | Explain that opening handover does not submit completion. Checks use the applied system, including additional query cases and client delivery behavior; unapplied edits remain drafts. Explain Passed and Needs investigation feedback and returning to the investigation. Current passing results for all five checks enable Complete handover; relevant incident changes require revalidation. |
| 27. Completion, leaving, and Restart challenge | Explain that Complete handover records success and opens the completion celebration; reopening an already completed attempt does not replay it. Back to main page preserves the saved attempt. Restart challenge asks before replacing the active investigation and drafts, while preserving prior achievements and chapter progress. Taking this interface tour grants no completion credit. |

Finish copy:

> You're ready to investigate. Choose any workspace, compare what you observe
> with the operating contract, and test your ideas. When you're ready, Review
> handover checks the applied system. You can reopen this walkthrough at any time.

## State and interaction contract

Tour navigation must be presentational. The current challenge reducer persists
workspace, inspection, snapshot, phase, and configuration changes, so replaying
ordinary challenge actions to navigate the tour would have unwanted side effects.

Use a challenge-owned adapter with local presentation overrides for the overview,
workspace, SQL mode/snapshot, expanded details, and handover surface. Render the
existing panels against the current saved run, with view-only overrides where
needed. Do not fork panel markup or create another simulation. Preserve drafts
and applied settings visibly, and never fabricate successful checks or results.

- Do not dispatch start, workspace, frame, inspection, edit, apply, process, read,
  delivery, hint, worked repair, handover, complete, undo, or restart actions on
  behalf of tour navigation. Do not save a temporary tour run.
- Keep underlying controls inert, including highlighted buttons and challenge
  keyboard shortcuts. The tour explains actions through its own controls.
- Pause active investigation time while touring. Incident time already advances
  manually and must remain fixed throughout the tour.
- Do not automatically execute SQL previews or acceptance checks to illustrate
  a step. Existing read-only trace loading may supply real observations.
- Retain disabled controls and explain their prerequisites. Cover result areas
  even when empty, pending, completed, or unavailable; do not require a repair or
  successful query to finish the tour.
- Expand a hidden target locally before measuring it. For alternate data views
  and SQL modes, use temporary view overrides and preserve the learner's values.
- Close existing help dialogs before opening the tour. Describe Reference,
  Investigation help, Diagram key, and Restart inside the tour instead of nesting
  their modals. No confirmation is necessary to start an interface tour.
- Exit removes overrides. Never write a captured run back into storage: another
  browser tab may have updated it. End the tour with a brief notice if a cross-tab
  update changes the run, configuration, or phase; ignore timer-only updates.
- Clear tour overrides on route exit, refresh, or restart. Restore focus to the
  opening control when available, otherwise the challenge heading.
- Handle SQL loading/failure with honest status and Retry after exit. A missing
  spotlight target must fall back to a readable, unanchored explanation with
  working navigation, rather than leaving an invisible modal lock.

## Content and accessibility

Use the current element labels and values from the challenge as the source of
truth. Reuse contextual explanations from ChallengeHelp where appropriate;
centralize shared concepts instead of maintaining conflicting definitions.

Keep step headings task-oriented: "Test a query before applying it", "Read the
completeness boundary", and "Separate the database from the application". Explain
terms where first encountered. Avoid announcing a fault count or prescribing a
repair order. Explain option behavior without suggesting the right configuration.

Reuse Dialog, Spotlight, shared buttons, typography, theme tokens, and motion
behavior. Follow [UI_LAYOUTS.md](./UI_LAYOUTS.md) and
[MAINTAINABILITY.md](./MAINTAINABILITY.md); add no tour library.

- Keyboard: Tab remains in the tour; Left/Right and Enter navigate; Escape exits.
  Focus follows each step and returns meaningfully after exit.
- Announce section, heading, and step count to assistive technology. Associate
  the explanation with its heading; do not rely on a spotlight or color alone.
- On phones and short screens, scroll the target into view and keep explanations
  and navigation reachable. Target a control or heading rather than an entire
  tall card. Do not shrink the app or obscure the relevant target with the card.
- Respect reduced motion. Test both themes, text zoom, and long explanations.
- Use a separate tour preference key with an in-memory fallback when storage is
  unavailable. Tour preference failure must not block either the tour or challenge.
- Rename the existing assisted completion label **Completed with walkthrough** to
  **Completed with worked repair**, so an interface tour cannot be confused with
  solution assistance. Preserve existing assistance scoring and achievements.

## Implementation sequence

1. **Content and targets:** add challenge walkthrough data near the challenge,
   containing stable step IDs, section, surface/workspace, target, explanation,
   and disabled/empty-state copy. Add narrowly scoped data-walkthrough anchors
   to the actual elements in the page, workspace panels, SQL, and report.
2. **Shared tour integration:** extend WalkthroughProvider with a challenge
   session kind and a small adapter boundary for presentation changes. Replace
   hardcoded chapter/lecture labels with session labels. Retain existing tours,
   spotlight navigation, and interaction locking. Add a local challenge adapter
   rather than putting challenge reducer logic into the global provider.
3. **Safe presentation:** connect the adapter to LiveOrderOperationsPage and its
   existing panels; add local view overrides and timer pausing. Cover briefing,
   active investigation, handover, and completed entry points. Support target
   readiness, hidden controls, and missing-target fallback explicitly.
4. **Entry and replay:** add the overview/toolbar entries, first-visit invitation,
   continuous full tour, section jumps, and versioned resume preferences. Correct
   the assisted-completion wording without changing stored run attribution.
5. **Verification and documentation:** add the focused coverage below; update the
   feature README, root README, and UI_LAYOUTS implementation map with entry
   points, state guarantees, and files. Keep this plan's status current.

Primary existing touchpoints are WalkthroughProvider, walkthroughContent,
walkthroughStorage, useWalkthroughInteractionLock, LiveOrderOperationsPage,
InvestigationWorkspace, InvestigationPanels, InvestigationSql, ChallengeHelp,
ChallengeReport, and useChallengeRun. New challenge-specific content and adapter
files should live alongside the challenge rather than expanding incident.ts.

## Verification and completion criteria

Implementation should add focused browser coverage for the complete tour and
state preservation, using the current chapter-tour tests as the reference.

- Page-help icons explain only the current page, close after its final stop,
  and preserve full-tour preferences, drafts, applied state, and workspace.
  Full walkthrough visits all 32 stops. Section jumps, Back, Next, Finish,
  exit, Escape, and explicit resume work. Page navigation retains the old page
  while unblurring and moving the pointer, switches only at the visual click,
  and explains the new workspace title first. Each stage lasts 700 ms; exiting
  cancels pending navigation timers.
- Compare saved run state before/after touring from briefing, an in-progress run
  with unapplied SQL/settings, handover, and completion. Preserve run ID, phase,
  workspace, inspection, SQL context/drafts, applied configuration, clock,
  processing, reads, deliveries, history, validation, hints, worked repairs,
  achievements, and active duration during the open tour. Account separately
  for legitimate active-time flushing at entry/exit boundaries.
- Attempt background clicks and keyboard shortcuts during the tour. No edits,
  incident advancement, processing, deliveries, SQL execution, checks, assistance,
  restart, or handover completion occur.
- Exercise cross-tab changes and route exit: dismiss safely, show current saved
  state, and never restore old data over another tab's work.
- Test empty/no-preview states, no selected SQL snapshot, pending processing,
  completed replay, SQL loading/error, disabled targets, unavailable storage,
  and a deliberately missing target. Every step remains readable and escapable.
- Verify focus, accessible names, spotlight/card geometry, scrolling, and modal
  cleanup on desktop and phone in both themes and reduced motion. Include a
  keyboard-only pass and text zoom.
- Re-run chapter walkthrough and tour interaction regressions when changing
  shared infrastructure, plus the existing independent/assisted challenge
  journeys. Run npm test and npm run build after implementation.
- Do a learner pass: ask someone unfamiliar with the challenge where to inspect
  source rows, how to make SQL live, why a result can be stale, how to receive
  application updates, and how to finish. They should find these without being
  given the repair. Use this pass to adjust length and validate the time estimate.

The feature is complete when learners can explain each workspace's role and the
effect of its controls, traverse or leave the walkthrough from any challenge
phase, and return to an intact investigation with independent completion still
available. Automated checks cover interface behavior and state preservation;
the facilitated learner pass remains necessary to validate comprehension and the
6–10 minute estimate.
