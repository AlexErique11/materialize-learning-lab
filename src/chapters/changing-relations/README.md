# Changing Relations

## Shared presentation

Follow [CLAUDE.md](../../../CLAUDE.md) and
[UI_LAYOUTS.md](../../../UI_LAYOUTS.md) for shared UI rules and component ownership.
Both lectures use `LectureScreen` with `layout="with-tip"`. The tip appears only
when it fits; the shared frame owns the visualization and playback footprint.
The exercise uses `ExerciseFrame` without a tip. Preserve the existing title,
toolbar, subtitle, metric, and table positions unless a layout change is requested.

Lectures use the shared Controls tour button above Start guided run, with the
mobile title-overlap guard. Top Previous/Next page links are hidden on lectures
and exercises; the separate change/timestamp playback controls remain. All SQL &
Objectives popups contain objective, SQL, and documentation only, without
Tutorial/Exercises navigation buttons. `LessonText` remains the reusable renderer
for typed inline explanation fragments, including Chapter 2's column references.

## Lecture 1 behavior

The first tutorial uses a deterministic product relation and the approved split
workbench: ledger on the left, grouped current relation on the right, metrics
above, and compact playback controls below. It starts empty at t = 0.

| Complete logical time | Change | Current relation | Copies / distinct rows |
| --- | --- | --- | --- |
| 1 | +3 (A, $10) | A × 3 | 3 / 1 |
| 2 | +1 (B, $14) | A × 3, B × 1 | 4 / 2 |
| 3 | +2 (C, $20) | A × 3, B × 1, C × 2 | 6 / 3 |
| 4 | −1 (B, $14) | A × 3, C × 2 | 5 / 2 |

Run is an observation mode: it applies the four changes every 2.2 seconds,
shows tables and metrics, and can be paused or stepped with Next change.
Previous change and Next change revisit already applied timestamps without
discarding playback progress; at the latest timestamp, Next change applies
the next pending change. The standard Tip box sits below the workbench.
Its Changes progress follows the displayed logical state, from 0/4 to 4/4,
including during guided runs. Playback does not complete the tutorial.

Guided run has six teaching steps: read a ledger record, add copies, add a new
full row, compare copies with distinct rows, retract a last copy, and recap.
Each timestamp pauses for a prediction; Show effect applies it, and Next advances
the lesson. Back revisits the prediction or an earlier completed state. Only
finishing the recap marks the tutorial complete; playback stays separate.

Both Chapter 1 lectures reuse Chapter 2's compact text-only guide card and
controls. Chapter 1 opts into placement above the relevant table or metric,
falling below when there is insufficient room above. Its copies-versus-rows step
highlights the two count metrics, excluding the logical-time card. Short inline
explanations use the live tables instead of duplicated diagrams or hypothetical
panels. Other chapters retain their existing spotlight placement.

Both lectures define the reference visualization footprint used by the shared
lecture layouts. Chapter 2 uses the separate no-tip footer treatment; it does not
set Chapter 1's playback or tip positions. The four-row tables retain their size.
The three metric cards share equal columns and gaps;
Lecture 1's two-card guide target uses those same columns. On phones, each selected
ledger reserves four rows so playback does not move when the timestamp changes.
Return to latest stays in the right-hand playback group. The Tip appears only when
it fits. Desktop descriptions remain under the title, with modest gaps above the
metric cards and between the cards and tables. Compact screens
reserve less visualization space to retain the description and visible controls.

Rows, timestamps, diffs, counts, and named panels have compact inline styling
in guide explanations. Every metric, panel, and table column has
help available on hover, keyboard focus, and click or tap.

## Semantics and public references

Verified against public Materialize documentation on 2026-10-04:

- [SUBSCRIBE](https://materialize.com/docs/sql/subscribe/): `mz_timestamp` is
  logical time and `mz_diff` changes the frequency of the full row. Diffs may have
  magnitude greater than one. An update can retract an old full row and add a new
  full row at the same timestamp.
- [SELECT](https://materialize.com/docs/sql/select/): a read returns a relation
  at a moment in time. The tutorial groups identical rows with a display-only
  count, equivalent to grouping by product and price; it does not imply DISTINCT.

The ledger is authored teaching data, not a claim about the exact grouping or
delivery order of a real SUBSCRIBE connection. Its timestamps are simplified
logical labels, not seconds or performance measurements. Each shown timestamp is
complete by construction; actual progress/frontier handling belongs in later labs.
The simulation forbids a negative final row count. Complete timestamp groups are
consolidated first so cancellation does not depend on animation or delivery order.

## Lecture 2: updates and timestamp batches

Lecture 2 reuses Lecture 1's `ChangeLedger`, metrics, current-relation table,
playback controller, help, standard Tip, and frosted guide. Both ledgers use the
same Signed diff / Row styling and row spacing. Lecture 2 omits the timestamp
column and numbered history buttons; the current-relation heading shows the time.
The ledger heading identifies a guided preview as Upcoming and its shown logical
timestamp; after revealing the effect, it identifies the batch as Applied.
Lecture 2 starts from a separate preloaded snapshot, not Lecture 1's final state.
Its ledger shows one complete timestamp at a time in four reserved rows, matching
Lecture 1's desktop table dimensions. Previous/Next timestamp revisits the starting
snapshot at t = 0 and all three applied batches on desktop and phones. Positive
snapshot diffs describe the initial copies. Shorter batches use blank rows;
t = 3 shows all four authored records without hiding cancellation. Guided previews
show the next complete batch while preserving the preceding current relation
until Show effect.
On mobile, both lectures display Previous/Next while retaining their full
accessible change/timestamp labels, leaving room for Return to latest.

| Complete logical time | Authored diffs | Current relation | Copies / distinct rows |
| --- | --- | --- | --- |
| 0 | Starting snapshot | (A, $10) × 1, (B, $14) × 1, (C, $20) × 2 | 4 / 3 |
| 1 | −1 (B, $14), +1 (B, $18) | A × 1, (B, $18) × 1, (C, $20) × 2 | 4 / 3 |
| 2 | −2 (C, $20), +2 (C, $25) | A × 1, (B, $18) × 1, (C, $25) × 2 | 4 / 3 |
| 3 | +2 A, −1 A, +1 (B, $18), −1 (B, $18) | A × 2, (B, $18) × 1, (C, $25) × 2 | 5 / 3 |

Normal playback applies exactly three complete timestamp batches; Previous/Next
timestamp inspect complete results without
discarding applied progress. Reset and replay restore the seed. Guided run has
five steps: snapshot, paired price update, multiple-copy update, combined diffs
and cancellation, and recap. All three new timestamps pause before Show effect.
The insert-only misconception is one sentence in the replacement explanation;
record-order independence remains in ledger help.

The header always shows Changes (0/3); each complete timestamp batch counts as
one change, and the starting snapshot is excluded. The guide keeps its own
five-step counter. Completing playback does not complete the tutorial.
All diffs within a timestamp are consolidated by full-row identity before the
result is exposed. Cancelling records stay visible in the authored ledger;
the relation never includes zero-copy rows.

The ledger's timestamp, diff, starting snapshot, and update-pair explanations
were rechecked against the official SUBSCRIBE documentation on 2026-10-07.

Additional official references verified on 2026-10-04:

- [SUBSCRIBE: mapping rows to their updates](https://materialize.com/docs/sql/subscribe/#mapping-rows-to-their-updates):
  retraction of the old row and insertion of the new row share a timestamp.
  Real output can already consolidate matching diffs, so t = 3 explicitly displays
  authored teaching records rather than promising four individual messages.
- [UPDATE](https://materialize.com/docs/sql/update/): updates change all matching
  rows of a read-write table. The reference SQL uses separate UPDATE statements;
  it does not put them in an explicit multi-statement transaction.

No live Materialize connection is used.

## Exercise 1: one inventory timeline

Chapter 1 now has one exercise with three questions. Its header shows Questions
(0/3), counting accepted answers, and the question headings use Question 1–3.
It starts with four copies of
(Kettle, $25), two of (Mug, $8), and one of (Mug, $10). The two Mug prices are
different full rows. Each question previews an entire upcoming timestamp; the
current relation stays at the preceding timestamp until the answer is accepted.

The exercise shares the lectures' description-to-metrics and metrics-to-tables
spacing through `lecture-one.css`. The tables retain tutorial row sizing and five
rows, and the question uses the same gap below the tables as the cards use above.
Panel padding and title-to-table spacing also reuse the tutorials' responsive
styles. Desktop screens show both tables and the question together. The question
keeps its title above its description at every size and grows when the description
wraps, retaining 4px more vertical padding on each side of the compact laptop box.
The existing panel selector remains limited to phones.

| Question | Task | Correct result |
| --- | --- | --- |
| 1 · Reconstruct | Five interleaved diffs: −3/+2 Kettle, +2/−3 Mug $8, +2 Mug $10 | Copies: 3, 1, 3; 7 total copies / 3 full rows |
| 2 · Build | Reprice every remaining Kettle from $25 to $30 and add one extra copy | Write −3 for the old row and +4 for the new row; 8 copies / 3 full rows |
| 3 · Check | +2/−1 Kettle $30, −1 Mug $8, −3 Mug $10, +3 Mug $12 | 8 total copies / 2 full rows; the remaining Mug price is $12 |

The first question requires grouping several additions and retractions by full-row
identity, rather than reading one diff as a final count. The second uses typed
signed diffs in the ledger and checks both parts of the condition. The final
question combines arithmetic, zero-copy removal, and price replacement. Its unchanged
total copy count does not imply that the relation stayed the same.

Wrong or blank answers keep time and progress unchanged and identify the fields
to recheck. A correct check applies the whole timestamp, explains the calculation,
and locks the answer. Show Answer fills the canonical solution and immediately
uses that same correct-check path, including state, feedback, and progress.
Next question sits below the question box and opens the next question with empty
inputs. Hints do not complete a question. Reset and reload restore the initial attempt.

After the final question is accepted, Finish chapter opens a recap dialog with the
Chapter 1 illustration, signed diffs, copies versus full rows, and updates at
complete timestamps. Its markup and responsive styling match Chapter 2's
completion presentation; the copied styles are scoped to Chapter 1. Closing the
dialog preserves the completed exercise and returns focus to Finish chapter.
Go to next chapter opens the Chapter 2 overview. Reset clears the completion
action along with the attempt. Incorrect predictions cannot finish the chapter.
On phones, inspecting a completed table hides the disabled grading controls to
keep Finish chapter visible; returning to Question restores the full toolbar.

The toolbar order is SQL & Objectives, Reset, Hint, Show Answer, Check Answer.
The exercise uses the shared SQL & Objectives dialog with its inventory objective,
grouped copy counts, total copies, distinct full rows, SUBSCRIBE, and official
documentation links. It omits Tip. Compact chips identify rows, diffs, counts, and timestamps;
their values stay together on one line. Both table grids reserve five real rows,
including placeholders, so shorter batches and removed rows do not move the
workbench. The old Exercise 2 URL redirects to Exercise 1 and is absent from
chapter and sidebar lists.

Answers and explanations derive from the lectures' canonical timestamp
simulation. Counts must be nonnegative safe whole numbers; signed diffs also
accept positive, negative, and zero integers. The typographic minus sign used
in the ledger is accepted when pasted into a signed answer.

The full-row diff and paired replacement model was rechecked on 2026-10-04
against [SUBSCRIBE](https://materialize.com/docs/sql/subscribe/) and
[UPDATE](https://materialize.com/docs/sql/update/). These are authored complete
teaching batches, not promises about the exact message grouping of a real
SUBSCRIBE stream. The reprice-and-restock phase combines a price replacement
with an additional copy; it does not claim that one UPDATE inserts extra stock.

The exercise reference SQL was checked on 2026-10-07 against the official
[SELECT](https://materialize.com/docs/sql/select/),
[aggregate functions](https://materialize.com/docs/sql/functions/#aggregate-functions),
and [SUBSCRIBE output](https://materialize.com/docs/sql/subscribe/#output)
documentation. These stable features use a `products` relation with duplicate
`(product, price)` rows; `copies` is a grouped display count, not a stored column.
The reference queries inspect the current state without supplying checkpoint
answers. Real SUBSCRIBE output includes an initial snapshot by default, while
the exercise starts from a preloaded state and shows authored complete batches.

## Chapter overview

The overview introduces both tutorials and the single three-phase inventory
exercise. Its summaries live in the existing chapter outline; the introduction,
documentation links, and illustration are chapter metadata.

Learn more links to SUBSCRIBE's output, snapshot, and update-mapping sections,
SELECT's duplicate-row and grouping behavior, aggregate functions including COUNT,
and INSERT, UPDATE, and DELETE. These official references were checked on
2026-10-04 and supplement the general Materialize documentation link.

The supplied transparent diagram is stored unchanged at
`public/changing-relations-overview.png`. Only Chapter 1 selects this image.
It uses the same 400:160 illustration frame and responsive sizing as the default
SVG; fitting it crops outer transparent padding without stretching the artwork.
