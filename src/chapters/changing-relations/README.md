# Lecture 1: changing relations

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
Its Changes progress counts applied changes. Playback does not complete the tutorial.

Guided run has seven teaching steps: introduction, anatomy of a record, four
timestamp demonstrations, and recap. Each timestamp pauses with its previous
relation intact. Show effect applies that timestamp; Next advances the lesson.
Back revisits an earlier completed state. Only finishing the recap completes
Tutorial progress. Closing the guide keeps the actual applied state for playback.

The guide contains diagrams for the ledger/state relationship, record fields,
copy-count arithmetic, unchanged rows, and total copies versus distinct rows.
The removal step also includes a clearly labelled hypothetical partial retraction
of A, calculated with the same domain functions; it does not modify the scenario.
The guide card uses space beside the target on short desktop screens, and adjusts
scroll position on stacked phone layouts to keep the card and highlighted panel visible.

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

Lecture 2 reuses the same metrics, current-relation table, playback controller,
help, standard Tip, and frosted guide. It starts from a separate preloaded snapshot,
not Lecture 1's final state. Its ledger displays only the selected complete
timestamp, with a compact selector for completed history.

| Complete logical time | Authored diffs | Current relation | Copies / distinct rows |
| --- | --- | --- | --- |
| 0 | Starting snapshot | (A, $10) × 1, (B, $14) × 1, (C, $20) × 2 | 4 / 3 |
| 1 | −1 (B, $14), +1 (B, $18) | A × 1, (B, $18) × 1, (C, $20) × 2 | 4 / 3 |
| 2 | −2 (C, $20), +2 (C, $25) | A × 1, (B, $18) × 1, (C, $25) × 2 | 4 / 3 |
| 3 | +2 A, −1 A, +1 (B, $18), −1 (B, $18) | A × 2, (B, $18) × 1, (C, $25) × 2 | 5 / 3 |

Normal playback applies exactly three complete timestamp batches; Previous/Next
timestamp and the selector inspect complete results without discarding applied
progress. Reset and replay restore the seed. Guided run has eight steps: snapshot,
paired update, hypothetical insert-only comparison, multiple-copy update,
consolidation, cancellation versus replacement, record-order independence, and
recap. The three new timestamps pause before Show effect. Comparisons use the same
pure domain functions and never mutate the live scenario.

The header separates Timestamps (0/3) from Tutorial (0/8); completing playback
does not complete the tutorial. Educational diagrams appear only in the guide.
All diffs within a timestamp are consolidated by full-row identity before the
result is exposed. The cancellation diagram retains zero net diff for explanation;
the relation never includes zero-copy rows.

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

Chapter 1 now has one exercise with three phases. It starts with four copies of
(Kettle, $25), two of (Mug, $8), and one of (Mug, $10). The two Mug prices are
different full rows. Each phase previews an entire upcoming timestamp; the
current relation stays at the preceding timestamp until the answer is accepted.

| Phase | Task | Correct result |
| --- | --- | --- |
| 1 · Reconstruct | Five interleaved diffs: −3/+2 Kettle, +2/−3 Mug $8, +2 Mug $10 | Copies: 3, 1, 3; 7 total copies / 3 full rows |
| 2 · Build | Reprice every remaining Kettle from $25 to $30 and add one extra copy | Write −3 for the old row and +4 for the new row; 8 copies / 3 full rows |
| 3 · Check | +2/−1 Kettle $30, −1 Mug $8, −3 Mug $10, +3 Mug $12 | 8 total copies / 2 full rows; the remaining Mug price is $12 |

The first phase requires grouping several additions and retractions by full-row
identity, rather than reading one diff as a final count. The second uses typed
signed diffs in the ledger and checks both parts of the condition. The final
phase combines arithmetic, zero-copy removal, and price replacement. Its unchanged
total copy count does not imply that the relation stayed the same.

Wrong or blank answers keep time and progress unchanged and identify the fields
to recheck. A correct check applies the whole timestamp, explains the calculation,
and locks the answer. Show Answer fills the canonical solution and immediately
uses that same correct-check path, including state, feedback, and progress.
Next question sits below the question box and opens the next phase with empty
inputs. Hints do not complete a phase. Reset and reload restore the initial attempt.

The toolbar order is Reset, Hint, Show Answer, Check Answer. Exercises omit Tip
and SQL & Objectives. Compact chips identify rows, diffs, counts, and timestamps;
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
