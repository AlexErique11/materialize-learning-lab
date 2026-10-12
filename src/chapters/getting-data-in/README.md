# Getting Data In

All four lectures and three exercises are implemented. Sidebar and
overview entries live in chapterOutline.ts. LectureOne.tsx and RecordLecture.tsx
compose the shared LectureScreen without-tip frame. IngestionLayouts.tsx owns the
two Chapter 4 visualizations: a snapshot bridge with a CDC queue below its table
endpoints, and an asymmetric record inspector beside stacked changes and current
relation. Both use a compact status bar, familiar app controls, and existing field
colors. Chapter 2 remains unchanged.

scenario.ts owns the product catalog, ordered ingestion actions, guided text,
stage descriptions, SQL, and documentation links. simulation.ts reconstructs
each checkpoint from that fixed initial snapshot boundary. SnapshotPanels.tsx
renders the upstream catalog, CDC queue, unavailable/queryable table, and full
signed row changes. Product and CDC queue tables reserve four row slots.
Snapshot commitment summarizes all starting rows added together; subsequent CDC
operations display their signed row changes below the corresponding table.
ProductTable.tsx owns the four-column product table and field-colored row tuples
used by both lecture layouts. Record inspectors reserve four field rows;
Debezium shows before/after columns beside the same four field names.

record-scenarios.ts owns lectures 2–4: producer fixtures, ordered actions, guided
explanations, SQL, and documentation. RecordLecture.tsx supplies one shared page
for them, and RecordPanels.tsx renders the selected record, two-slot signed
change ledger, and four-slot current relation. record-simulation.ts reconstructs
each checkpoint without changing any fixture or earlier state.

Lecture 2 uses independent NONE and UPSERT fixtures, demonstrating append-only
copies, replacement pairs, and unchanged keyed values. Lecture 3 compares
mutable name keys with stable IDs, nullable fields with tombstones, and an
intentional remove-old/add-new key change. Independent seeded fixtures show
null-key and malformed-value errors under default upsert error handling. A valid
message for another key does not clear those errors. The retained internal
catalog is hidden while the relation is unavailable; the row card displays —.
Lecture 4 translates valid decoded Avro Debezium before/after projections into
inserts, replacements, and retractions. These panels omit full wire metadata.

Fixture switches are explicit teaching checkpoints and start with a separate
catalog; they are not live envelope changes or conversion of an existing table.
Records read counts messages since the current fixture began and excludes its
seeded rows. The Changes counter includes fixture switches. An upcoming record
is labeled Next record until it is applied, including guided prediction steps.
Normal playback and guided reveal/back/reset use the existing shared reducer.
The progress count stays on one line when it reaches two digits so the toolbar
keeps the controls stable. The shared frame and lecture simulation behavior are
unchanged.

The teaching sequence reads one snapshot row, captures a price update and
deletion, finishes reading, atomically commits the original snapshot, applies
the two queued changes, and processes a live insertion. Reading all snapshot
rows is distinct from committing them. A blocked query is shown as unavailable,
not as an empty or partial result. CDC replaces or removes snapshot rows instead
of creating a second catalog. Playback checkpoints are illustrative; they are
not wall-clock time, PostgreSQL log positions, or measured ingestion statistics.
The live insertion combines capture and application in one checkpoint. Pausing
at snapshot commitment is a teaching view, not a guarantee of observing that
intermediate state in a running deployment.

Guided runs use the shared useLectureRun reducer, prediction/reveal workflow,
Spotlight, and LessonText. Snapshot-reading steps target the progress card;
other steps target the relevant panel. Phones, tablets, and short compact desktop
windows use panel selectors, and guided runs select the target panel
automatically. Snapshot changes remain visible below their table without a
separate rows/changes toggle. The narrow Phase status uses Snapshot as the short
display of Snapshotting. Compact desktop product tables abbreviate product_id
to ID; the queue retains all four columns. Panel capacities and table dimensions
stay stable through inserts, replacements, deletions, and unavailable states.

## Exercises

IngestionExercisePage.tsx composes the existing ExerciseFrame and the same two
Chapter 4 workspaces. exercise-scenarios.ts owns 14 questions and fresh product
fixtures: initial-load commitment and catch-up (four questions), producer
contracts and CDC changes (five), and catalog repair, keys, nulls, and errors
(five). Exercise 3 opens the shared Chapter complete dialog and links to Chapter 5.

simulation.ts accepts an optional snapshot fixture while preserving the lecture
default. record-simulation.ts accepts the fixtures/actions subset used by both
lectures and exercises. ExerciseWorkspace.tsx renders a question's before state
until its complete prediction is accepted, then renders its after checkpoint.
An upcoming record is visible as evidence; its signed changes, chosen envelope,
and future error state are not disclosed before acceptance. Independent producer
fixtures and fresh replays are explicit, rather than live envelope conversion.

exercise-grading.ts checks exact radio selections, exact unordered checkbox sets,
and whole-number counts. ExerciseAnswers.tsx renders native accessible inputs.
Wrong answers cannot apply changes or advance progress. Hint preserves progress;
Show Answer fills and accepts the prediction. Questions x/y counts accepted
questions. Reset restores the first question, initial tables, and blank answers.
Answers are local to the current exercise, without persistent scores.
Accepted answers mark the choices without adding a feedback row. The question
keeps its original prompt, and navigation matches Chapter 2 Exercise 1's bottom inset.

exercises.css keeps the table fields and row slots. Desktop views show three
compact reference panels above the question, following Chapter 2's exercises.
Up to 1150px wide or 700px high, the selected panel sits beside the question;
metrics are available in a dialog, and answer-group buttons
show one complete group at a time. Phones stack the panel above the question and
allow page scrolling. Selections survive switching panels and groups. Tables
remain complete, at normal font sizes, without internal scrolling.

exercises.test.ts verifies fixture results and grading, including duplicate events,
full replacements, mutable keys, nullable fields, tombstones, and unavailable
relations. tests/e2e/chapter-four-exercises.spec.ts covers learner flows, keyboard
input, references, both themes, completion navigation, and every question before
and after acceptance across desktop, tablet, and phone viewport sizes.

Verified against official documentation on 2026-10-11:
- https://materialize.com/docs/fundamentals/concepts/snapshotting/
- https://materialize.com/docs/sql/create-source/postgres-v2/
- https://materialize.com/docs/sql/create-table/postgres/
- https://materialize.com/docs/sql/create-connection/
- https://materialize.com/docs/sql/create-source/kafka-v2/
- https://materialize.com/docs/sql/create-table/kafka/

The SQL reference uses the current separate CREATE SOURCE and CREATE TABLE FROM
SOURCE syntax, assumes a configured connection/publication, and uses no Kafka
envelope or preview-only feature. The record lectures use separate Kafka sources
and source-backed table definitions, text keys with Avro product values for
NONE/UPSERT, and compatible Avro key/value CDC records for DEBEZIUM. The lab is a
deterministic simulation; it does not connect to an external database or broker.

