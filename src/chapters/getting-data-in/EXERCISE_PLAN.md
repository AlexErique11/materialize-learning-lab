# Chapter 4 exercise implementation plan

Status: implemented content specification, 2026-10-12.
Branch: `lecture-4-redesign`. The three exercises below are implemented and
registered. The chapter README describes their source files and responsive UI.
Short views keep a selected panel beside the question, with answer-group selectors
and a metrics dialog. Accepted choices are marked without adding a feedback row.

## Scope and progression

Build three exercises using Chapter 4's two existing visualizations. Keep the
shared exercise controls and the chapter's redesigned panels. The curriculum's
four exercise ideas and final challenge fit into these three activities; they
do not need separate pages for every variation.

| Activity | Questions | Layout | Estimated time | Learning progression |
| --- | --- | --- | --- | --- |
| Exercise 1: Finish the initial load | 4 | Snapshot bridge and CDC queue | 5–7 min | Predict availability, commit the initial rows, catch up, then process a live insertion. |
| Exercise 2: Interpret the producer's message | 5 | Record inspector, changes, current relation | 6–8 min | Choose contracts for events, current values, and CDC; translate Debezium inserts, updates, and deletes. |
| Exercise 3: Repair the product catalog | 5 | Same record layout | 7–9 min | Repair duplicate values, diagnose mutable keys, distinguish nulls, delete by key, and diagnose invalid input. |

Exercise 1 gives a continuous, lightly guided prediction scenario. Exercise 2
uses explicitly separate producer fixtures before continuing its CDC fixture.
Exercise 3 is the final challenge: it supplies facts and smaller prompts, with
guidance available through Hint rather than an automatic walkthrough.

There are 14 required questions. Null-key recovery, inline decoding errors,
connector setup, broker offsets, compaction internals, and schema evolution do
not need additional exercise pages in this implementation. Lecture 3 already
introduces null-key errors; the required diagnosis question tests malformed
values under the same default-error model.

## Curriculum coverage

| Curriculum requirement | Assessment |
| --- | --- |
| Atomic snapshot, blocked query, CDC catch-up | Exercise 1, questions 1–3 |
| Steady-state ingestion without another snapshot | Exercise 1, question 4 |
| Connections, sources, source-backed tables | SQL & Objectives references; labels on the existing pipeline |
| Independent events and repeated copies | Exercise 2, question 1 |
| Keyed current values and full replacement pairs | Exercise 2, question 2 |
| Debezium before/after inserts, updates, deletes | Exercise 2, questions 3–5 |
| Price changes mistakenly retained as products | Exercise 3, question 1 |
| Identical upsert values do not add copies | Exercise 3, question 1 replay and feedback |
| Mutable identity, stable IDs, intentional key change | Exercise 3, questions 1–2 |
| Nullable field versus whole-value tombstone | Exercise 3, questions 3–4 |
| Malformed input and unavailable relation | Exercise 3, question 5 |

## Shared fixture vocabulary

Use fresh product data rather than asking learners to repeat the lectures from
memory. Retain the existing four fields: `product_id`, `name`, `price`, `note`.
Prices are whole dollar amounts, not copy counts. Display `NULL` explicitly.

| Internal alias, used only in this specification | Full product row |
| --- | --- |
| N6 | `(301, Notebook, 6, Soft)` |
| N8 | `(301, Notebook, 8, Soft)` |
| N9 | `(301, Notebook, 9, Soft)` |
| P2 | `(302, Pen, 2, Blue)` |
| L20 | `(303, Lamp, 20, Desk)` |
| R3 | `(304, Ruler, 3, Clear)` |
| J8 | `(301, Journal, 8, Soft)` |
| J8-null | `(301, Journal, 8, NULL)` |

All UI questions, choices, feedback, and ledger entries display the actual rows,
not these aliases. The row projection excludes the Kafka key; show message-key
identity in the record inspector and existing Current keys footer. Two different
keys can therefore produce two displayed rows with the same `product_id`.

## Exercise 1: Finish the initial load

Objective: distinguish rows read from rows queryable, reconstruct the atomic
initial snapshot, then maintain it using queued and live database changes.

Initial snapshot boundary: `[N6, P2, L20]`. Start the question sequence after one
of three snapshot rows has been read and two subsequent upstream changes have
been captured:

1. Product 301 changes from N6 to N8.
2. Product 303, L20, is deleted.

The upstream table now contains `[N8, P2]`; the queue contains those two pending
operations. The Materialize table has not committed its snapshot.

### Question 1: Reading is not commitment

Prompt: "The remaining snapshot rows are read: 3 of 3. The snapshot has not
committed. What can a query return now?"

Input: advance only the reading action to 3/3. Do not commit or apply CDC.
One radio group:

- The query still waits for snapshot commitment. **Correct.**
- It returns the subset of snapshot rows read first.
- It returns the current upstream rows immediately.

Expected state: relation unavailable, phase Snapshotting, rows read 3/3,
pending CDC 2. This is a blocked query, not a successful zero-row result.

Hint: "Reading the last row and committing the snapshot are separate steps."

Accepted feedback: "All snapshot rows have been read, but queries still wait.
The initial rows become queryable together when the snapshot commits."

For this question, the destination panel must use a neutral prediction message
rather than spelling out the availability answer before submission. Its rows,
status text, and accessibility description must follow the same masking rule.

### Question 2: Commit the initial rows

Prompt: "Commit the initial snapshot before applying either queued change.
Select every row now visible in Materialize, then choose the ingestion phase."

Row checkboxes: N6, N8, P2, L20. Expected: **N6, P2, L20**.
Phase radios: Snapshotting, Catch-up, Live. Expected: **Catch-up**.

Expected state: `[N6, P2, L20]`, 3 rows, pending CDC 2. Commit all initial rows
together. The current upstream table is deliberately different from the
snapshot boundary.

Hint: "Commit the starting snapshot. The queued update and deletion are applied
afterward."

Accepted feedback: "The original three rows commit together. Notebook is still
$6 and Lamp is still present. Two later database changes remain to be applied."

Reveal the existing compact snapshot-commit summary rather than three extra
ledger rows that repeat the table.

### Question 3: Catch up with the database

Prompt: "Apply both queued changes in order. Select the rows after catch-up and
enter how many CDC operations remain pending."

Row checkboxes: N6, N8, P2, L20. Expected: **N8, P2**.
Pending-operation count input: expected integer **0**.

Expected state: `[N8, P2]`, phase Live, pending CDC 0. Notebook's update replaces
N6 with N8; the deletion removes L20. Neither operation adds a second catalog.

Hint: "The update replaces the old row; the deletion removes its matching row."

Accepted feedback: "Notebook becomes $8 and Lamp disappears. No operations
remain pending, so ingestion is live."

This question advances through two existing action checkpoints. It asks for the
state after both, not one fabricated logical timestamp. The queue shows both
operations applied. If the table footer shows signed changes, label them as
the most recent applied operation, matching the simulation's last-action diffs;
do not imply that its final deletion is the entire catch-up sequence.

### Question 4: Keep the live table current

Prompt: "The database inserts Ruler, product 304, at $3. Select its table change.
Does ingestion need to repeat the initial snapshot?"

Diff radios: `+1 R3`, `-1 R3`, No net change. Expected: **+1 R3**.
Resnapshot radios: Yes, No. Expected: **No**.

Expected state: `[N8, P2, R3]`, phase Live, pending CDC 0, snapshot rows read still
3/3. The live checkpoint captures and applies the insertion.

Hint: "Live CDC maintains the table that already exists."

Accepted feedback: "Add Ruler to the maintained table. The initial snapshot is
not repeated for this new database row."

### Layout and metrics

Reuse Layout 1: upstream table on the left, Materialize table on the right,
snapshot-to-CDC bridge between them, ingestion and queue below.

- Status bar: Snapshot rows read, Pending CDC, Phase.
- Upstream and Materialize product tables: four reserved row slots each.
- CDC queue: four reserved slots, with product ID, action, change, and status.
- Question card below the visualization, followed by Next question at the right.

Show the current state while predicting an upcoming action; apply the target
state only after acceptance. Question 1 has the additional availability masking
described above. The snapshot boundary is stated once in the initial scenario;
do not create a fourth panel to store it.

## Exercise 2: Interpret the producer's message

Objective: choose the envelope from the producer's contract and translate the
incoming record into a complete change to the relation.

Questions 1, 2, and 3 each identify a separate valid fixture. They are not an
envelope switch on an existing table. Questions 3–5 continue one CDC fixture.
Seed rows are explicitly labeled and excluded from Records read.

### Question 1: Every event counts

Fixture: independent product events; one starting copy of N6 is already present.
Next valid message: key `"301"`, value N6, identical to the previous event.

Prompt: "These messages are independent events, including identical repeats.
Choose the envelope and enter the number of row copies after this message."

Envelope radios: NONE, UPSERT, DEBEZIUM. Expected: **NONE**.
Row-copy count input: expected integer **2**.

Expected change: `+1 N6`. Expected relation: `[N6, N6]`. Distinct projected rows
remain 1; the count being graded is row copies.

Hint: "The producer says each message is another event."

Accepted feedback: "NONE keeps each event as another row. The same value now has
two copies; sharing a message key does not make these replacement values."

### Question 2: Replace the current value

Separate fixture: starting keyed values `"301" → N6`, `"302" → P2`.
Producer contract: each message is the latest full value for its stable key.
Next message: key `"301"`, value N8.

Prompt: "Choose the envelope for these current values. Select every change
produced by Notebook's new price."

Envelope radios: NONE, UPSERT, DEBEZIUM. Expected: **UPSERT**.
Diff checkboxes: `-1 N6`, `+1 N8`, `+1 N6`, `-1 N8`.
Expected: **-1 N6 and +1 N8**.

Expected relation: `[N8, P2]`, 2 rows.

Hint: "A new value for an existing key replaces its previous full row."

Accepted feedback: "UPSERT retracts Notebook at $6 and adds Notebook at $8.
Pen stays unchanged, and the table still contains two rows."

### Question 3: A CDC insertion

Separate fixture: compatible Avro-encoded Debezium records; starting relation
`[P2]`. The inspector shows a decoded projection: Before NULL, After N8.

Prompt: "Choose the envelope for this CDC producer. Select the change represented
by Before = NULL and the new After row."

Envelope radios: NONE, UPSERT, DEBEZIUM. Expected: **DEBEZIUM**.
Diff radios: `+1 N8`, `-1 N8`, No net change. Expected: **+1 N8**.

Expected relation: `[N8, P2]`, 2 rows.

Hint: "The record explicitly supplies row versions from a database change."

Accepted feedback: "DEBEZIUM interprets the before/after record. There is no old
row to retract, so Notebook is inserted."

### Question 4: A CDC update

Continue the same fixture. Next record: Before N8, After N9.

Prompt: "Notebook changes from $8 to $9. Select every signed row change."

Diff checkboxes: `-1 N8`, `+1 N9`, `+1 N8`, `-1 N9`.
Expected: **-1 N8 and +1 N9**.

Expected relation: `[N9, P2]`, still 2 rows. The known DEBEZIUM label can remain
visible for questions 4 and 5.

Hint: "Retract Before, then add After."

Accepted feedback: "The old Notebook row leaves and the new row enters. A price
update changes its value without adding another product."

### Question 5: A CDC deletion

Continue the same fixture. Next record: Before P2, After NULL.

Prompt: "The producer deletes Pen. Select the change represented by this record."

Diff radios: `-1 P2`, `+1 P2`, No net change. Expected: **-1 P2**.

Expected relation: `[N9]`, 1 row.

Hint: "After is absent. Check which complete row was present Before."

Accepted feedback: "Retract Pen's Before row. A null After means this CDC record
deletes the row. Notebook remains."

### Layout and metrics

Reuse Layout 2: incoming record inspector on the left, interpreted changes above
the current relation on the right. Keep the two-row ledger and four-row relation.

- Status bar: Records read, Current row copies, Envelope.
- Incoming record: key/value or four-field Before/After view as appropriate.
- Interpreted changes: neutral prediction placeholder before acceptance;
  actual signed changes afterward.
- Current relation: the known before-state during prediction, then the result.

For questions 1–3, replace the envelope metric and `ENVELOPE ...` panel label with
neutral text such as "Choose an envelope". Help text, hidden labels, and SQL
reference must not identify the selected fixture's correct envelope in advance.
Keep the producer's event/current-value/CDC contract visible; that is the evidence
the learner needs. Reveal the actual envelope only after acceptance.

## Exercise 3: Repair the product catalog

Objective: repair ingestion according to the producer's identity and value
contract, then predict renames, nullable values, deletions, and default errors.

### Question 1: Stop treating prices as new products

Broken fixture: a producer sends latest full values keyed by stable product ID,
but the consumer uses NONE. The known history is:

1. `"301" → N6`
2. `"301" → N8`
3. `"301" → N8` again
4. `"302" → P2`

The broken relation has four rows: `[N6, N8, N8, P2]`. The producer also needs
product identity to survive future name changes.

Prompt: "Repair this catalog's contract, then select its rows after replaying the
listed history into a fresh table. Product identity must survive a rename."

Configuration radios:

- UPSERT with stable product-ID keys. **Correct.**
- NONE with stable product-ID keys.
- UPSERT with product-name keys.

Result-row checkboxes: N6, N8, P2. Expected: **N8 and P2**.

Expected repaired relation: `"301" → N8`, `"302" → P2`, 2 rows. The repeated N8
has no net effect under UPSERT. Price replacement does not require Debezium
before/after records when the producer supplies current keyed values.

Hint: "Keep the latest full value for each stable identity."

Accepted feedback: "UPSERT with product-ID keys keeps Notebook at $8 and Pen
at $2. The identical Notebook repeat adds no copy. A name key would be unstable
when Notebook is renamed."

The repair is a deterministic replay into a fresh fixture. Do not animate a
live envelope conversion, imply a key change clears historical rows, or offer
SQL writes against a read-only source-backed table. The question text states
the complete replay history; the inspector can show its selected/latest record.
Do not add a history panel or a fifth product-table row.

### Question 2: A rename leaves an old key

Separate legacy fixture: UPSERT with `"Notebook" → N8`. Next record is
`"Journal" → J8`; its value still has product_id 301.

Prompt: "This legacy producer uses names as keys. Predict the rename, then choose
the message that removes the stale Notebook entry."

Outcome radios:

- Two rows remain, both with product_id 301. **Correct.**
- The existing row is automatically renamed in place.
- The different name key makes the relation unavailable.

Cleanup-message radios:

- Key `"Notebook"`, whole value NULL. **Correct.**
- Key `"301"`, whole value NULL.
- Key `"Notebook"`, non-null N8 with only note set to NULL.

Expected rename result: two keys, `"Notebook" → N8`, `"Journal" → J8`.
Its change is `+1 J8`; no old row has been retracted yet. The selected cleanup
would then produce `-1 N8`, leaving only Journal. Do not apply that cleanup as
part of the rename's result reveal. Its rationale remains in the grading metadata.

Hint: "UPSERT looks up the separate message key, not a field inside its value."

Accepted feedback: "Journal is a new key, so Notebook remains. Tombstone the old
Notebook key to remove it. Stable product-ID keys avoid this identity change;
an intentional name-key change needs remove-old and add-new messages."

### Question 3: NULL inside a value

Start an explicitly separate repaired fixture with stable keys:
`"301" → J8`, `"302" → P2`. This fixture represents a correctly seeded catalog,
not changing the keys of the legacy fixture in place.

Next record: key `"301"`, non-null value J8-null.

Prompt: "Journal's new value has note = NULL. What happens to the product row?"

Outcome radios:

- The row remains, with note set to NULL. **Correct.**
- The row is deleted as a tombstone.
- The relation becomes unavailable.

Expected changes: `-1 J8`, `+1 J8-null`. Expected relation: `[J8-null, P2]`,
2 rows. The whole value is present and conforms to the nullable-note schema.

Hint: "Is the entire value NULL, or just one permitted field?"

Accepted feedback: "Journal remains. Its complete value is present; only the
nullable note field changed. This is a replacement, not a tombstone."

### Question 4: Delete the keyed product

Continue the repaired fixture. Next record: key `"301"`, whole value NULL.

Prompt: "The producer sends a tombstone for key 301. Select the signed change
and the product IDs that remain."

Diff radios: `-1 J8-null`, `+1 J8-null`, `-1 P2`.
Expected: **-1 J8-null**.
Remaining-ID checkboxes: 301, 302. Expected: **302 only**.

Expected relation: `[P2]`, 1 row. No zero-copy Journal row remains in the table.

Hint: "A whole-value tombstone removes the current row for that exact key."

Accepted feedback: "Retract Journal, including its NULL note. Pen's different
key is unaffected."

### Question 5: Invalid bytes are not a deletion

Continue the repaired fixture, now containing only `"302" → P2`. Next message
has key `"301"` and non-null bytes that cannot decode as an Avro product. Use
default UPSERT value-decoding error handling, without INLINE.

Prompt: "The next non-null value fails Avro decoding. With default error handling,
what can a query of this source-backed table return?"

Outcome radios:

- The relation is unavailable because of the input error. **Correct.**
- It returns Pen and silently skips the malformed value.
- It returns an empty table because the malformed value is a tombstone.

Expected relation: unavailable. Display current row copies as **—**, not 0 or 1.
The known Pen entry is retained internally but must not appear as a successful
query result. The malformed bytes are non-null and are not a deletion message.

Hint: "Failed decoding is different from a null whole value."

Accepted feedback: "Default decoding errors make the relation unavailable.
Malformed non-null bytes are not a tombstone. A valid message for another key
does not correct this key's decoding error."

### Layout and metrics

Use the same record inspector, changes ledger, and relation as Exercise 2.
The legacy and repaired fixtures are clearly named. The known envelope is shown
except while question 1 asks for the repaired configuration; its baseline NONE
label may be shown as "Current configuration: NONE", never as the selected
repair. Feedback explains the difference between the old and repaired fixture.

Keep four relation slots, two signed-change slots, and four inspector field rows.
The initial broken table fills all four slots; later fewer rows do not shrink it.
Mask errors and future changes until acceptance. The unavailable overlay occupies
the same table area and does not move the question or navigation.

## Exercise interaction contract

Use `ExerciseFrame`, `useExerciseStages`, `LessonText`, shared Button, and the
existing SQL & Objectives dialog. Preserve the app title, description, progress,
toolbar, and navigation positions. Chapter 2 is a behavior reference, not a file
to modify or an exercise page to copy in full.

1. Header progress is **Questions x/y**, counting accepted questions only. The
   title stays `Exercise 1`, `Exercise 2`, or `Exercise 3`; the sidebar and overview
   include the descriptive title. The question heading is `Question n of y:
   [checkpoint title]`, followed by its description on a separate line.
2. Prediction displays the known before-state and clearly labeled Next record
   or Upcoming action. Never show the target rows, emitted changes, target error,
   or selected envelope before the learner answers. A neutral placeholder means
   "prediction pending", not "no changes".
3. Check Answer grades every required answer group together. Do not apply a
   partly correct prediction. An incorrect answer keeps the before-state and
   progress; retain selections and identify the group needing revision.
4. Hint gives the short hint above, without advancing. Show Answer fills the
   answer controls with the solution, accepts it, and reveals the target state,
   matching the existing exercise behavior. Accepted controls are read-only.
5. Correct feedback marks accepted choices with existing semantic field colors
   and check marks, matching Chapter 2 Exercise 1 without adding a review row.
   Use `preserveQuestion` to retain the checkpoint title and accepted prompt. Incorrect
   feedback uses the shared frame's question body and field-level errors. Reserve
   enough height for the longest hint or feedback so controls stay stable.
6. Next question appears at the lower right only after acceptance; reserve its
   footprint while absent. At the end of exercises 1 and 2, use Exercise 2 and
   Exercise 3 respectively. End exercise 3 with Finish chapter.
7. Reset restores the exercise's initial fixture, empty answers, zero accepted
   questions, first question, and initial panel selection. Navigating to another
   exercise creates its own state. Do not introduce cross-page persisted scores
   or an application-wide completion tracker in this feature.
8. Use native radios for one answer, checkboxes for exact row/diff sets, and the
   existing integer parser for counts. Grade typed option IDs and product data,
   not formatted strings. Ignore selection order; do not collapse row copies
   when a question asks for their count. Counts require whole, non-negative
   integers; an unavailable count is not a numeric answer.

Wrong-answer guidance should be specific to the failed group. Examples:
"Recheck which snapshot boundary supplies these rows", "Select both sides of
the replacement", "Check the message key rather than product_id in the value",
and "Distinguish a decoding error from a tombstone". Avoid revealing the whole
solution after the first incorrect attempt.

## Space and responsive behavior

Reuse the chapter's panels and visual identity. Product tables retain four rows;
the signed ledger retains two. Exercise-specific spacing makes the reference and
answer controls visible together, following Chapter 2's table-and-answer layout.
Reuse the existing status bar rather than returning to three large cards.

On roomy desktops, show the status bar, complete visualization, question card,
and lower-right navigation together. The existing full lecture canvas is 458px
high in a roomy viewport; do not blindly append a question card to it. Budget
exercise space by removing redundant narration and spare panel space while
preserving the tables and their row heights. Use at most two answer groups per
question, arranged side by side when there is room; each group has at most four
choices. Keep the description above the answer controls and retain normal font
sizes.

Keep the tables visible while answering. Desktop screens show three compact
panels above the question. Up to 1150px wide or 700px high, use the Chapter 4 panel selectors
beside the question. Phones stack the selected panel above the question and allow
page scrolling rather than hiding either section. Metrics remain available in a
dialog in compact layouts. Keep selections when
switching panels and answer groups; checking, hints, and revealing an answer
return focus to the question. Do not hide a needed record, error, answer control,
or Next question button to make a screen fit.

The exact compact breakpoint must be selected from rendered measurements during
implementation, not assumed to equal the lecture breakpoint: the question takes
additional space. Verify 1440×1000, 1366×768, 1280×650, 1024×768, 900×650,
768×768, and 390×664. Test question 2 of exercise 1 and questions 1–2 of exercise
3 as the largest answer sets, plus accepted and error states. No scaling, font
shrinking, clipped data, or changing row capacities is an acceptable fit fix.

## SQL & Objectives content

Supply exercise-specific objectives from the sections above. Reuse the canonical
lecture SQL and documentation URLs where they already describe the same contract;
do not paste question-specific answers into the reference before submission.

| Exercise | Reference content |
| --- | --- |
| 1 | PostgreSQL connection/publication assumptions; separate CREATE SOURCE and CREATE TABLE FROM SOURCE; SELECT the four product columns. Explain native CDC snapshot and catch-up, without a Kafka envelope selector. |
| 2 | Equal reference examples for NONE, UPSERT, and compatible Avro DEBEZIUM. Explain connection → source → source-backed table. Do not label one example as the solution to the current question. |
| 3 | Show the broken NONE configuration and alternative contract templates without selecting the repair; later explain text keys, nullable fields, tombstones, and default errors. Reference producer messages as input, not INSERT/DELETE on the source-backed table. |

Assume configured PostgreSQL or Kafka/schema-registry connections. Keep native
PostgreSQL ingestion and Kafka envelopes separate. Decoded Debezium panels show
only the relevant Before/After row projection of a valid compatible Avro record;
do not claim arbitrary JSON examples are supported Debezium input. Fixture
checkpoints and question numbers are teaching steps, not measured ingestion
statistics, Kafka offsets, or Materialize logical timestamps.

Semantics were cross-checked against official documentation on 2026-10-12:

- [Snapshotting](https://materialize.com/docs/fundamentals/concepts/snapshotting/): atomic initial commitment, blocked snapshot queries, queued subsequent database changes.
- [Kafka envelopes](https://materialize.com/docs/sql/create-table/kafka/#envelopes): event insertion, keyed replacement/deletion, and default input errors.
- [Debezium envelope](https://materialize.com/docs/sql/create-table/kafka/#debezium-envelope): compatible Avro records and Before/After interpretation.

The repository curriculum and existing Chapter 4 simulations supply the teaching
scope and the deterministic behavior of these proposed fixtures.

## Chapter completion

After the last accepted answer, Finish chapter opens the familiar completion
dialog using shared Dialog/Button and existing completion styling. It should
contain:

- Eyebrow: **Chapter complete**.
- Title: **You finished Chapter 4**.
- Intro: "You followed data from an initial snapshot into a maintained table,
  and chose how incoming records become changes."
- Three brief recap topics: Snapshot and live CDC; Producer contracts; Stable
  keys and deletions.
- Takeaway: "The producer's contract determines how records become rows.
  Correct identity keeps updates from becoming additional products."
- Next destination: Chapter 5, from the chapter registry, with Go to next chapter.

The final input-error example is a successfully diagnosed condition, not an
exercise failure. It does not prevent Finish chapter after the correct answer.

## Implementation map

Keep new code in `src/chapters/getting-data-in/` and register only this chapter.
Do not change Chapter 1 or Chapter 2 files or shared behavior to create these
exercises.

| File or existing owner | Planned responsibility |
| --- | --- |
| `exercise-scenarios.ts` (new) | Three activity definitions, fresh fixtures, before/after action checkpoints, question copy, typed options, solutions, objectives, and navigation metadata. |
| `exercise-grading.ts` (new) | Pure exact-set, radio, and integer grading with targeted feedback. Reuse existing grade and integer types/utilities. |
| `IngestionExercisePage.tsx` (new) | Compose ExerciseFrame, manage answers and fixture/panel selection, reveal accepted states, and provide next activity/completion flow. |
| `ExerciseAnswers.tsx` (new, local) | Small native radio/checkbox/count renderer; no dependency on Chapter 2's scenario-specific answer component. |
| `exercises.css` (new, scoped) | Simultaneous reference panels and question, answer groups, reserved navigation, and compact panel selectors. Preserve fields and row capacities. |
| `simulation.ts` | Allow a supplied snapshot fixture while keeping the existing lecture defaults. Reuse the same reconstruction logic rather than building a second snapshot simulator. |
| `record-simulation.ts` | Narrow simulation input to the existing fixtures/actions it actually reads, so exercise runs need no fabricated lecture lessons or reference metadata. Preserve lecture callers. |
| `IngestionLayouts.tsx` | Reuse both workspaces. Add narrowly scoped props for neutral envelope labels, a supplied snapshot row total, and pending-prediction presentation where needed. Default lecture rendering stays identical. |
| `SnapshotPanels.tsx`, `RecordPanels.tsx`, `ProductTable.tsx` | Reuse product rows, record inspector, signed changes, unavailable overlays, and capacities. Parameterize exercise-specific masks or labels only when required. |
| `src/chapters/chapterOutline.ts` | Derive three Chapter 4 exercise entries from the activity definitions; preserve every other chapter's entries and slugs. |
| `src/chapters/ChapterContentPage.tsx` | Add a Chapter 4 exercises dispatch with page-keyed state; preserve existing routing. |
| Chapter 4 `README.md`, `UI_LAYOUTS.md` | Update the implementation map once pages exist; do not present this proposal as shipped. |

Use normal sequential slugs `exercise-1`, `exercise-2`, `exercise-3` under
`/labs/getting-data-in/exercises/`. Navigation and overview titles come from one
activity-definition source. Avoid copying Chapter 2's maintenance panels or
introducing a generic exercise engine beyond the existing shared frame/hook.

### Proposed implementation order

1. Add fixture and question definitions; verify their expected states against
   the reused simulations and pure grader.
2. Implement exercise 1 with the snapshot layout and the shared question flow.
   Resolve desktop/compact space before adding the other pages.
3. Implement exercise 2 using the record layout and correct prediction masking.
4. Implement exercise 3, its explicit fixture transitions, and completion dialog.
5. Register all three finished pages, add overview descriptions and durations,
   update implementation documentation, and run the scoped validation below.

### Meaningful verification

- Simulation fixtures: snapshot read versus commit; original boundary versus
  current upstream; full catch-up and live insertion; NONE copies; UPSERT
  replacement/repeat; each Debezium operation; different keys sharing a product
  ID; null field; exact-key tombstone; malformed input and unavailable relation.
- Grading: reject missing or additional diffs/rows, wrong contract, invalid
  counts, and incomplete answer groups. Selection order is immaterial.
- Learner flow: incorrect answer cannot reveal/advance; Hint does not advance;
  Show Answer fills and reveals; next activity resets local state; Reset clears
  answers and restores the fixture; final diagnosis permits chapter completion.
- Disclosure: no selected envelope or future-result text leaks through panels,
  metrics, help, hidden content, or accessibility labels before acceptance.
- Layout: fixed table row heights/capacities and control bounds across the
  largest questions, hints, accepted feedback, and unavailable states; no
  overflow in the listed viewport matrix; both themes and keyboard interaction.
- Regressions: existing Chapter 4 lecture states and shared top controls remain
  identical; Chapters 1 and 2 remain unchanged. Run build, relevant simulation
  and grading tests, chapter navigation tests, and scoped exercise/lecture
  browser checks once implementation exists.
