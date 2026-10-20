# Time in Materialize

The four lectures reuse `LectureScreen` with the `without-tip` layout. Shared
titles, toolbar, SQL dialog, guided run, and playback remain in their existing
components. `TemporalLecture.tsx` composes that frame; `TemporalWorkspace.tsx`
renders the compact metrics, lifetime timeline, source table, and result table.
The two tables reserve three rows, and the result-diff strip reserves two entries.
Short and narrow screens select Timeline, Source, or Result without scrolling.
Guided runs select their relevant panel and place explanations above it when possible.

`scenarios.ts` defines the four independent teaching scenarios, SQL, documentation,
and prediction/reveal steps. `types.ts` defines the fixture model and a fixed UTC
origin. `simulation.ts` replays source actions and time advancements using integer
millisecond offsets. The shared playback hook still uses consecutive checkpoint
indices; the displayed logical clock comes from each derived snapshot.

Lecture 1 compares exclusive and inclusive expiration and distinguishes clock
meanings using an illustrative ad-hoc serializable query sample. Lecture 2 adds
entry bounds, then compares explicit per-row deadlines. Lecture 3 applies late
inputs with remaining lifetime or after expiration. Lecture 4 extends a deadline,
deletes a row, and shortens another deadline into the past. Future effects are
updated without changing already observed history. Expiration never deletes an
input row. Query-fixture switches start a separate result and emit no fictitious
cross-query diffs.

The timeline's future boundaries are a conceptual model, not an inspection of
Materialize's internal timer queue. Source application times are logical input
timestamps; the late-arrival fixture explicitly aligns arrival and application.
Clock samples are not columns of the materialized result. SQL timestamps match
the controlled fixtures; a live session uses its own current logical clock.

`simulation.test.ts` checks boundary precision, late and future input, replacement
diffs, independent recomputation, scheduled transitions, immutable fixtures,
historical visibility, and the row/diff budgets across every authored checkpoint.
`tests/e2e/chapter-five-lectures.spec.ts` checks learner journeys, guided reveal and
back, SQL reference, themes, viewport fit, and shared frame alignment.

The three exercises contain four clock/boundary questions, four deadline-change
questions, and five recent-event questions. `exercise-scenarios.ts` owns their
fixtures, before/after checkpoint indices, answer groups, hints, and explanations.
`exercise-grading.ts` validates predictions without changing the simulation.
`TemporalExercisePage.tsx` composes the existing exercise frame and completion
dialog; `TemporalExerciseWorkspace.tsx` reuses the lecture panels. Pending actions
remain unapplied until a correct answer or Show Answer. Query comparisons and
independent late-arrival examples have explicitly named separate fixtures.

The exercise tests validate independently specified boundary diffs, atomic
replacement pairs, obsolete deadlines, late arrival, mixed time-only effects,
and malformed predictions. Browser checks cover every authored answer, hidden
solutions, reset, completion, theme and viewport fit, and exact alignment with
the established exercise header and next-button corner.

References checked on 2026-10-18:

- https://materialize.com/docs/transform-data/patterns/temporal-filters/
- https://materialize.com/docs/sql/functions/now_and_mz_now/
- https://materialize.com/docs/sql/types/mz_timestamp/
- https://materialize.com/docs/sql/subscribe/
