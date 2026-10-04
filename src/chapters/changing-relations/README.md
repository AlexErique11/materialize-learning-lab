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

No live Materialize connection is used. Exercises remain placeholders.
