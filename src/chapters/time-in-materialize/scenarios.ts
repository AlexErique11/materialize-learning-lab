import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
import type { TemporalAction, TemporalFixture, TemporalRow } from './types';

export type TemporalStage = 'timeline' | 'source' | 'result';

export interface TemporalLesson {
  readonly time: number;
  readonly stage: TemporalStage;
  readonly title: string;
  readonly before?: LessonTextContent;
  readonly explanation: LessonTextContent;
  readonly view?: 'clocks' | 'lifetimes';
  readonly predictionStage?: TemporalStage;
  readonly focus?: 'clock' | 'diffs';
}

export interface TemporalLectureDefinition {
  readonly number: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly description: string;
  readonly fixture: TemporalFixture;
  readonly actions: readonly TemporalAction[];
  readonly lessons: readonly TemporalLesson[];
  readonly reference: {
    readonly objective: string;
    readonly sql: string;
    readonly documentationLinks: readonly { readonly label: string; readonly href: string }[];
  };
}

const term = (text: string) => ({ kind: 'term' as const, text });
const clock = (text: string) => ({ kind: 'time' as const, text });
const field = (text: string, column: string) => ({ kind: 'row' as const, text, column });
const count = (text: string) => ({ kind: 'count' as const, text });
const diff = (text: string) => ({ kind: 'diff' as const, text });
const advance = (timeMs: number): TemporalAction => ({ kind: 'advance', timeMs });
const event = (eventId: number, eventTimeMs: number, expiresAtMs?: number): TemporalRow =>
  ({ eventId, eventTimeMs, ...(expiresAtMs === undefined ? {} : { expiresAtMs }) });

const temporalDocs = {
  label: 'Temporal filters: sliding windows, TTL, and late arrivals',
  href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/',
};
const clockDocs = {
  label: 'now() and mz_now(): clock meanings and materialization',
  href: 'https://materialize.com/docs/sql/functions/now_and_mz_now/',
};
const timestampDocs = {
  label: 'mz_timestamp: millisecond timestamps and valid casts',
  href: 'https://materialize.com/docs/sql/types/mz_timestamp/',
};
const subscribeDocs = {
  label: 'SUBSCRIBE: observe signed result changes',
  href: 'https://materialize.com/docs/sql/subscribe/',
};
const fixtureNote = `-- The lab uses a controlled logical clock and millisecond offsets
-- from 2026-01-01 12:00:00+00. SQL timestamps below match its fixtures.
-- A live Materialize session uses its own logical time; use current
-- input timestamps to observe these lifetimes in a live session.`;

const exclusiveFixture: TemporalFixture = {
  id: 'exclusive-expiration', label: 'Exclusive expiration', logicalTimeMs: 12_000,
  rows: [event(101, 10_000)], predicate: 'exclusive-window', windowMs: 10_000, appliedAtMs: 12_000,
};
const inclusiveFixture: TemporalFixture = {
  ...exclusiveFixture, id: 'inclusive-expiration', label: 'Inclusive expiration', predicate: 'inclusive-window',
};

export const temporalLectureOne: TemporalLectureDefinition = {
  number: 1,
  title: 'Time can change the result',
  description: 'Watch time expire a row without changing its source.',
  fixture: exclusiveFixture,
  actions: [advance(19_999), advance(20_000), advance(20_001),
    { kind: 'switch-fixture', fixture: inclusiveFixture },
    advance(19_999), advance(20_000), advance(20_001)],
  lessons: [
    { time: 0, stage: 'timeline', view: 'clocks', focus: 'clock', title: 'Different clocks answer different questions', explanation: [
      term('now()'), ' samples the system clock at transaction start. ', term('mz_now()'),
      ' is the query’s logical time; the row’s event and arrival timestamps describe different moments.',
    ] },
    { time: 0, stage: 'source', title: 'A timestamp is data in the row', explanation: [
      'Event ', field('101', 'eventId'), ' happened at ', field('10.000 s', 'eventTime'),
      ' and was applied at ', clock('12.000 s'), '. Its ten-second window ends at ', clock('20.000 s'), '.',
    ] },
    { time: 1, stage: 'timeline', focus: 'clock', title: 'Just before expiration',
      before: ['Advance logical time to ', clock('19.999 s'), '. Does ', term('mz_now() < event_ts + 10 seconds'), ' still hold?'],
      explanation: ['The row is still visible: ', clock('19.999 s'), ' is before ', clock('20.000 s'), '. The source has not changed.'] },
    { time: 2, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'At an exclusive boundary',
      before: ['Logical time reaches ', clock('20.000 s'), '. Predict the result under ', term('<'), '.'],
      explanation: [diff('−1'), ' retracts event ', field('101', 'eventId'),
        ' at the boundary. It remains in the source table; only query membership changed.'] },
    { time: 3, stage: 'timeline', title: 'After expiration', explanation: [
      'At ', clock('20.001 s'), ' the event is already absent. Advancing time again produces ', term('No net changes'), '.',
    ] },
    { time: 4, stage: 'timeline', title: 'Compare a separate inclusive fixture', explanation: [
      'This fresh fixture resets logical time to ', clock('12.000 s'), ' and uses ', term('<='),
      '. It compares the same row under a different endpoint rule.',
    ] },
    { time: 5, stage: 'result', predictionStage: 'timeline', title: 'Before the inclusive boundary',
      before: ['Advance to ', clock('19.999 s'), ' with ', term('<='), '. Will the row remain visible?'],
      explanation: ['The event remains visible. Both ', term('<'), ' and ', term('<='), ' accept a time before the expiration boundary.'] },
    { time: 6, stage: 'result', predictionStage: 'timeline', title: 'Exactly at an inclusive boundary',
      before: ['Logical time reaches ', clock('20.000 s'), '. Does ', term('<='), ' include equality?'],
      explanation: ['The event is still visible: equality passes ', term('<='), '. There are ', term('No net changes'), ' at this checkpoint.'] },
    { time: 7, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'One millisecond later',
      before: ['Advance to ', clock('20.001 s'), '. Predict the first timestamp that fails the inclusive condition.'],
      explanation: [diff('−1'), ' now removes the event. The inclusive comparison preserves it at ', clock('20.000 s'), ' and retracts it one millisecond later.'] },
    { time: 7, stage: 'source', title: 'Expiration changes the result, not the source', explanation: [
      'The source still contains ', count('1 row'), ' while the result contains ', count('0 rows'),
      '. Use ', term('mz_now()'), ' in a temporal predicate for maintained expiration; queries calling ', term('now()'), ' cannot be materialized.',
    ] },
  ],
  reference: {
    objective: 'Distinguish system, transaction-start, event, arrival, and logical time. Predict when exclusive and inclusive temporal bounds retract a row without changing its source.',
    sql: `${fixtureNote}

CREATE TABLE events (event_id INT, event_ts TIMESTAMPTZ);
INSERT INTO events VALUES (101, TIMESTAMPTZ '2026-01-01 12:00:10+00');

-- Ad hoc clock inspection; this query cannot be materialized.
SELECT now() AS transaction_started_at, mz_now() AS logical_time;

CREATE MATERIALIZED VIEW recent_events AS
SELECT event_id, event_ts
FROM events
WHERE mz_now() < event_ts + INTERVAL '10 seconds';

-- Separate comparison fixture: equality remains visible.
CREATE MATERIALIZED VIEW inclusive_events AS
SELECT event_id, event_ts
FROM events
WHERE mz_now() <= event_ts + INTERVAL '10 seconds';

SUBSCRIBE recent_events;`,
    documentationLinks: [clockDocs, temporalDocs, timestampDocs, subscribeDocs],
  },
};

const futureFixture: TemporalFixture = {
  id: 'future-expiration-only', label: 'Expiration only', logicalTimeMs: 12_000,
  rows: [event(101, 20_000)], predicate: 'exclusive-window', windowMs: 10_000, appliedAtMs: 12_000,
};
const boundedFixture: TemporalFixture = {
  ...futureFixture, id: 'future-bounded-window', label: 'Entry and expiration', predicate: 'bounded-window',
};
const deadlinesFixture: TemporalFixture = {
  id: 'different-deadlines', label: 'Explicit row deadlines', logicalTimeMs: 12_000,
  rows: [event(101, 20_000, 30_000), event(102, 20_000, 35_000)],
  predicate: 'explicit-deadline', appliedAtMs: 12_000,
};

export const temporalLectureTwo: TemporalLectureDefinition = {
  number: 2,
  title: 'When should a row become visible?',
  description: 'Define when each row enters and leaves the result.',
  fixture: futureFixture,
  actions: [{ kind: 'switch-fixture', fixture: boundedFixture }, advance(20_000), advance(30_000),
    { kind: 'switch-fixture', fixture: deadlinesFixture }, advance(20_000), advance(30_000), advance(35_000)],
  lessons: [
    { time: 0, stage: 'source', title: 'The source already contains a future event', explanation: [
      'Event ', field('101', 'eventId'), ' is present at logical time ', clock('12.000 s'),
      ', but its event timestamp is ', field('20.000 s', 'eventTime'), '.',
    ] },
    { time: 0, stage: 'timeline', title: 'An expiration condition has no entry bound', explanation: [
      'The event is visible early because ', clock('12.000 s'), ' is before its ', clock('30.000 s'),
      ' expiration. An upper bound alone does not exclude future-dated events.',
    ] },
    { time: 1, stage: 'timeline', title: 'Add the entry condition',
      before: ['Compare a fresh fixture using ', term('mz_now() >= event_ts'), ' as well. Should event 101 be visible at ', clock('12.000 s'), '?'],
      explanation: ['It is absent in the bounded fixture. Its lifetime starts at ', clock('20.000 s'),
        ' and ends just before ', clock('30.000 s'), '; this fixture switch resets the comparison.'] },
    { time: 2, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'Enter at the start boundary',
      before: ['Advance logical time to ', clock('20.000 s'), '. Does the inclusive entry bound now pass?'],
      explanation: [diff('+1'), ' adds event 101 without another source message. Both entry and expiration conditions now pass.'] },
    { time: 3, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'Leave at the end boundary',
      before: ['Advance to ', clock('30.000 s'), '. Predict the result under the exclusive expiration bound.'],
      explanation: [diff('−1'), ' removes event 101. The visible interval includes its start and excludes its end.'] },
    { time: 4, stage: 'source', title: 'Each row can supply its own deadline', explanation: [
      'This separate fixture has two rows starting at ', field('20.000 s', 'eventTime'),
      '. Their ', term('expires_at'), ' values are ', field('30.000 s', 'expiresAt'), ' and ', field('35.000 s', 'expiresAt'), '.',
    ] },
    { time: 5, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'Both lifetimes begin together',
      before: ['Advance to ', clock('20.000 s'), '. How many rows should enter the result?'],
      explanation: ['Both rows enter: ', diff('+1'), ' for event 101 and ', diff('+1'),
        ' for event 102. They have the same start but different expiration times.'] },
    { time: 6, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'The first deadline expires',
      before: ['At ', clock('30.000 s'), ', which event has reached its own deadline?'],
      explanation: ['Event ', field('101', 'eventId'), ' retracts with ', diff('−1'),
        '. Event ', field('102', 'eventId'), ' remains visible until ', field('35.000 s', 'expiresAt'), '.'] },
    { time: 7, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'The second deadline expires',
      before: ['Advance to ', clock('35.000 s'), '. Predict the remaining result.'],
      explanation: ['Event ', field('102', 'eventId'), ' retracts with ', diff('−1'),
        '. Both source rows remain, but neither passes the current temporal predicate.'] },
    { time: 7, stage: 'timeline', title: 'Express the complete lifetime', explanation: [
      'Combine temporal bounds with ', term('AND'), ' and put interval arithmetic on the row expression. The SQL panel shows the same pattern in ', term('WHERE'), ' and ', term('HAVING'), '.',
    ] },
  ],
  reference: {
    objective: 'Explain why an expiration-only filter includes future events. Define inclusive entry and exclusive expiration, and generalize a fixed window to per-row expiration timestamps.',
    sql: `${fixtureNote}

CREATE TABLE events (
  event_id INT, event_ts TIMESTAMPTZ, expires_at TIMESTAMPTZ
);

-- A bounded, ten-second event-time window.
CREATE MATERIALIZED VIEW recent_events AS
SELECT event_id, event_ts
FROM events
WHERE mz_now() >= event_ts
  AND mz_now() < event_ts + INTERVAL '10 seconds';

-- An explicit deadline allows a different lifetime for each row.
CREATE MATERIALIZED VIEW active_events AS
SELECT event_id, event_ts, expires_at
FROM events
WHERE mz_now() >= event_ts
  AND mz_now() < expires_at;

-- Temporal predicates may also filter grouped rows in HAVING.
CREATE MATERIALIZED VIEW active_groups AS
SELECT event_ts, expires_at, COUNT(*) AS event_count
FROM events
GROUP BY event_ts, expires_at
HAVING mz_now() >= event_ts
   AND mz_now() < expires_at;

-- Keep arithmetic on the row expression, not on mz_now().
-- Maintained temporal predicates combine their bounds with AND.`,
    documentationLinks: [temporalDocs, clockDocs, subscribeDocs],
  },
};

export const temporalLectureThree: TemporalLectureDefinition = {
  number: 3,
  title: 'When events arrive late',
  description: 'Compare late arrivals in one event-time window.',
  fixture: {
    id: 'late-arrivals', label: 'Late events, fixed event-time window', logicalTimeMs: 10_000,
    rows: [], predicate: 'bounded-window', windowMs: 10_000,
  },
  actions: [
    { kind: 'insert', timeMs: 12_000, row: event(101, 10_000) },
    { kind: 'insert', timeMs: 18_000, row: event(102, 10_000) },
    advance(19_999), advance(20_000),
    { kind: 'insert', timeMs: 21_000, row: event(103, 10_000) },
  ],
  lessons: [
    { time: 0, stage: 'timeline', title: 'One event-time interval, different arrivals', explanation: [
      'Each event happened at ', field('10.000 s', 'eventTime'), ' and has a ten-second window. Their eligible interval ends at ', clock('20.000 s'), ', regardless of arrival time.',
    ] },
    { time: 1, stage: 'result', predictionStage: 'source', focus: 'diffs', title: 'Arrive with eight seconds remaining',
      before: ['Event ', field('101', 'eventId'), ' arrives at ', clock('12.000 s'), '. Does it receive ten new seconds or only the time remaining?'],
      explanation: [diff('+1'), ' makes it visible for the remaining ', count('8 seconds'),
        '. In this fixture, arrival and logical application happen together.'] },
    { time: 2, stage: 'result', predictionStage: 'source', focus: 'diffs', title: 'A later arrival has less time left',
      before: ['Event ', field('102', 'eventId'), ' has the same event timestamp but arrives at ', clock('18.000 s'), '. When will it expire?'],
      explanation: ['It enters with ', diff('+1'), ' and has only ', count('2 seconds'),
        ' remaining. Arrival does not restart an event-time window.'] },
    { time: 2, stage: 'timeline', title: 'Eligibility differs from actual contribution', explanation: [
      'The outlined interval is when each row would qualify. Its filled segment starts only when that row arrives and can actually contribute.',
    ] },
    { time: 3, stage: 'timeline', focus: 'clock', title: 'Both are still inside their window',
      before: ['Advance to ', clock('19.999 s'), '. Are both events still eligible?'],
      explanation: ['Both remain visible just before ', clock('20.000 s'),
        '. Different arrival times did not change their common expiration.'] },
    { time: 4, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'Expire together',
      before: ['Advance to ', clock('20.000 s'), '. Predict the signed changes for the two visible events.'],
      explanation: ['Each event retracts with ', diff('−1'), '. The result becomes empty while the source retains ', count('2 rows'), '.'] },
    { time: 5, stage: 'result', predictionStage: 'source', focus: 'diffs', title: 'Arrive after the entire interval',
      before: ['Event ', field('103', 'eventId'), ' arrives at ', clock('21.000 s'),
        ' with event time ', field('10.000 s', 'eventTime'), '. Will it enter this result?'],
      explanation: ['It is already expired, so the result has ', term('No net changes'),
        '. The source now contains ', count('3 rows'), ', including this late event.'] },
    { time: 5, stage: 'timeline', title: 'Choose a window that matches the requirement', explanation: [
      'A longer window can admit later arrivals, but it also changes what ', term('recent'),
      ' means. It does not recreate a period before the row was received.',
    ] },
  ],
  reference: {
    objective: 'Predict the remaining eligible lifetime of a late event. Distinguish the event-time interval from actual contribution after arrival, including an event that arrives after expiration.',
    sql: `${fixtureNote}

CREATE TABLE events (event_id INT, event_ts TIMESTAMPTZ);

CREATE MATERIALIZED VIEW recent_events AS
SELECT event_id, event_ts
FROM events
WHERE mz_now() >= event_ts
  AND mz_now() < event_ts + INTERVAL '10 seconds';

-- Each row has the same event timestamp, even though the lab applies
-- them at 12, 18, and 21 seconds respectively.
INSERT INTO events VALUES (101, TIMESTAMPTZ '2026-01-01 12:00:10+00');
INSERT INTO events VALUES (102, TIMESTAMPTZ '2026-01-01 12:00:10+00');
INSERT INTO events VALUES (103, TIMESTAMPTZ '2026-01-01 12:00:10+00');

SUBSCRIBE recent_events;

-- A longer grace period is a deliberate query change:
-- WHERE mz_now() >= event_ts
--   AND mz_now() < event_ts + INTERVAL '20 seconds'
-- It admits older events as well as more delayed arrivals.`,
    documentationLinks: [
      { label: 'Temporal filters: late-arriving events', href: temporalDocs.href + '#late-arriving-events' },
      clockDocs, subscribeDocs,
    ],
  },
};

export const temporalLectureFour: TemporalLectureDefinition = {
  number: 4,
  title: 'Changing a row’s lifetime',
  description: 'Update deadlines and follow their future effects.',
  fixture: {
    id: 'changing-deadlines', label: 'Mutable row deadlines', logicalTimeMs: 12_000,
    rows: [event(101, 10_000, 20_000), event(102, 10_000, 25_000), event(103, 10_000, 28_000)],
    predicate: 'explicit-deadline', appliedAtMs: 12_000,
  },
  actions: [
    { kind: 'update', timeMs: 15_000, row: event(101, 10_000, 30_000) },
    { kind: 'delete', timeMs: 16_000, eventId: 102 },
    { kind: 'update', timeMs: 17_000, row: event(103, 10_000, 16_000) },
    advance(20_000), advance(25_000), advance(28_000), advance(30_000),
  ],
  lessons: [
    { time: 0, stage: 'timeline', title: 'The current value determines the deadline', explanation: [
      'Three visible events expire at ', clock('20.000 s'), ', ', clock('25.000 s'), ', and ', clock('28.000 s'),
      '. Each deadline belongs to that row’s current value.',
    ] },
    { time: 0, stage: 'source', title: 'Include the deadline in the result', explanation: [
      'The result projects ', term('expires_at'), ' as well as the event ID and event time. Changing a visible deadline therefore replaces the displayed full row.',
    ] },
    { time: 1, stage: 'result', predictionStage: 'source', focus: 'diffs', title: 'Extend an active lifetime',
      before: ['At ', clock('15.000 s'), ', extend event ', field('101', 'eventId'),
        ' from ', field('20.000 s', 'expiresAt'), ' to ', field('30.000 s', 'expiresAt'), '. What changes?'],
      explanation: ['Retract the old displayed row with ', diff('−1'), ' and add its new deadline with ', diff('+1'),
        '. Event 101 remains visible, with expiration moved to 30.000 s.'] },
    { time: 2, stage: 'result', predictionStage: 'source', focus: 'diffs', title: 'Delete a row before its deadline',
      before: ['Delete event ', field('102', 'eventId'), ' at ', clock('16.000 s'),
        '. Should it remain visible until its old deadline?'],
      explanation: [diff('−1'), ' removes the row immediately. Its old ', field('25.000 s', 'expiresAt'), ' expiration must not remove it a second time.'] },
    { time: 3, stage: 'result', predictionStage: 'source', focus: 'diffs', title: 'Move a deadline into the past',
      before: ['At ', clock('17.000 s'), ', change event ', field('103', 'eventId'),
        ' to expire at ', field('16.000 s', 'expiresAt'), '. Will the new value qualify?'],
      explanation: ['The old result row retracts with ', diff('−1'),
        '. The updated source row is already expired, so no replacement enters the result.'] },
    { time: 4, stage: 'timeline', title: 'Pass the replaced expiration',
      before: ['Advance to event 101’s old deadline, ', clock('20.000 s'), '. Should it retract now?'],
      explanation: ['There are ', term('No net changes'), '. Event 101 now expires at ', field('30.000 s', 'expiresAt'), '; its old boundary is obsolete.'] },
    { time: 5, stage: 'timeline', title: 'Pass the deleted row’s expiration',
      before: ['Advance to ', clock('25.000 s'), ', the deleted event’s old deadline. Predict any result change.'],
      explanation: ['There are ', term('No net changes'), '. Event 102 was already deleted; an obsolete deadline cannot retract another copy.'] },
    { time: 6, stage: 'timeline', title: 'Pass the shortened row’s old expiration',
      before: ['Advance to ', clock('28.000 s'), ', event 103’s original deadline. Will anything else disappear?'],
      explanation: ['There are ', term('No net changes'), '. Event 103 stopped qualifying at the earlier update; its original deadline is obsolete.'] },
    { time: 7, stage: 'result', predictionStage: 'timeline', focus: 'diffs', title: 'Reach the current deadline',
      before: ['Advance to ', clock('30.000 s'), '. Which deadline is still relevant?'],
      explanation: ['Event ', field('101', 'eventId'), ' reaches its current expiration and retracts with ', diff('−1'),
        '. The result is empty, while two rows remain in the source.'] },
    { time: 7, stage: 'timeline', title: 'Future changes require maintained state', explanation: [
      'Temporal processing tracks future effects as row values change. Pending retractions need resources, so the visible row count is ', term('not a memory measurement'), '.',
    ] },
  ],
  reference: {
    objective: 'Predict how extending, shortening, or deleting a row changes its current result and future deadline. Explain why obsolete boundaries cause no extra result changes and why pending temporal effects require state.',
    sql: `${fixtureNote}

CREATE TABLE events (
  event_id INT, event_ts TIMESTAMPTZ, expires_at TIMESTAMPTZ
);
INSERT INTO events VALUES
  (101, TIMESTAMPTZ '2026-01-01 12:00:10+00', TIMESTAMPTZ '2026-01-01 12:00:20+00'),
  (102, TIMESTAMPTZ '2026-01-01 12:00:10+00', TIMESTAMPTZ '2026-01-01 12:00:25+00'),
  (103, TIMESTAMPTZ '2026-01-01 12:00:10+00', TIMESTAMPTZ '2026-01-01 12:00:28+00');

CREATE MATERIALIZED VIEW active_events AS
SELECT event_id, event_ts, expires_at
FROM events
WHERE mz_now() >= event_ts
  AND mz_now() < expires_at;

-- The lab applies these at logical times 15, 16, and 17 seconds.
UPDATE events SET expires_at = TIMESTAMPTZ '2026-01-01 12:00:30+00'
WHERE event_id = 101;
DELETE FROM events WHERE event_id = 102;
UPDATE events SET expires_at = TIMESTAMPTZ '2026-01-01 12:00:16+00'
WHERE event_id = 103;

SUBSCRIBE active_events;`,
    documentationLinks: [
      { label: 'Temporal filters: TTL and resources for pending retractions', href: temporalDocs.href },
      { label: 'UPDATE: replace stored row values', href: 'https://materialize.com/docs/sql/update/' },
      { label: 'DELETE: remove stored rows', href: 'https://materialize.com/docs/sql/delete/' },
      subscribeDocs,
    ],
  },
};

export const temporalLectures: readonly TemporalLectureDefinition[] = [
  temporalLectureOne, temporalLectureTwo, temporalLectureThree, temporalLectureFour,
];
