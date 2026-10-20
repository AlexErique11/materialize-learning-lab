import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';
import { temporalLectureOne, temporalLectureFour } from './scenarios';
import { formatTemporalTime, temporalSnapshotAt } from './simulation';
import type { TemporalAction, TemporalFixture, TemporalRow } from './types';

export interface TemporalAnswerOption {
  readonly id: string;
  readonly content: LessonTextContent;
  readonly diff?: -1 | 1;
  readonly code?: string;
  readonly guidance?: string;
}
interface AnswerGroupBase { readonly id: string; readonly label: string; readonly guidance: string }
export type TemporalAnswerGroup = AnswerGroupBase & (
  | { readonly kind: 'radio'; readonly options: readonly TemporalAnswerOption[]; readonly expected: string }
  | { readonly kind: 'checkbox'; readonly options: readonly TemporalAnswerOption[]; readonly expected: readonly string[] }
  | { readonly kind: 'count'; readonly expected: number }
);
export interface TemporalQuestion {
  readonly id: string;
  readonly title: string;
  readonly question: LessonTextContent;
  readonly hint: LessonTextContent;
  readonly explanation: LessonTextContent;
  readonly actionLabel: string;
  readonly fixture: TemporalFixture;
  readonly actions: readonly TemporalAction[];
  readonly before: number;
  readonly after: number;
  readonly groups: readonly TemporalAnswerGroup[];
  readonly concealPredicate?: boolean;
}
export interface TemporalExercise {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly hasClocks: boolean;
  readonly questions: readonly TemporalQuestion[];
  readonly reference: typeof temporalLectureOne.reference;
}
const time = (text: string) => ({ kind: 'time' as const, text });
const term = (text: string) => ({ kind: 'term' as const, text });
const option = (id: string, text: string): TemporalAnswerOption => ({ id, content: [text] });
const event = (eventId: number, seconds: number, deadline?: number): TemporalRow => ({ eventId, eventTimeMs: seconds * 1000, ...(deadline === undefined ? {} : { expiresAtMs: deadline * 1000 }) });
const advance = (timeMs: number): TemporalAction => ({ kind: 'advance', timeMs });
const signed = (id: string, diff: -1 | 1, row: TemporalRow): TemporalAnswerOption => ({ id, diff, content: [
  '(', { kind: 'row', text: String(row.eventId), column: 'eventId' }, ', ',
  { kind: 'time', text: formatTemporalTime(row.eventTimeMs), column: 'eventTime' },
  ...(row.expiresAtMs === undefined ? [] : [', ', { kind: 'time' as const, text: formatTemporalTime(row.expiresAtMs), column: 'expiresAt' }]), ')',
] });
const base: TemporalFixture = { id: 'exercise-clock', label: 'Clock comparison', logicalTimeMs: 18_000,
  appliedAtMs: 12_000, predicate: 'exclusive-window', windowMs: 10_000, rows: [event(101, 10)] };
const exclusive: TemporalFixture = { ...base, id: 'exercise-exclusive', label: 'Exclusive expiration', logicalTimeMs: 19_999 };
const inclusive: TemporalFixture = { ...base, id: 'exercise-inclusive', label: 'Inclusive expiration · new fixture', logicalTimeMs: 20_000, predicate: 'inclusive-window' };
const future: TemporalFixture = { id: 'exercise-future', label: 'Future event · new fixture', logicalTimeMs: 16_000,
  predicate: 'exclusive-window', rows: [event(102, 24)], windowMs: 10_000 };
const boundedFuture: TemporalFixture = { ...future, id: 'exercise-future-bounded', label: 'Bounded future event · new query', predicate: 'bounded-window' };

const boundaryQuestions: readonly TemporalQuestion[] = [
  { id: 'choose-clock', title: 'Choose the clock', fixture: base, actions: [], before: 0, after: 0,
    actionLabel: 'Read the three clock samples at this checkpoint.',
    question: ['System and transaction time read ', time('20.000 s'), '; query time reads ', time('18.000 s'), '. Which clock controls maintained membership?'],
    hint: ['Use the logical timestamp of the query, rather than the transaction-start clock.'],
    explanation: [term('mz_now()'), ' supplies query logical time. Event time and application time describe the row, not the query clock.'],
    groups: [{ kind: 'radio', id: 'clock', label: 'Membership clock', expected: 'logical', guidance: 'Choose the query logical timestamp used by the temporal predicate.',
      options: [option('system', 'System clock'), option('transaction', 'now()'), option('logical', 'mz_now()')] }] },
  { id: 'exclusive-boundary', title: 'Find the exclusive boundary', fixture: exclusive, actions: [advance(20_000)], before: 0, after: 1,
    actionLabel: 'Advance logical time from 19.999 s to 20.000 s; no source change.',
    question: ['Advance to ', time('20.000 s'), ' under ', term('<'), '. Select the result change; the source receives no new message.'],
    hint: ['Compare logical time with event time plus ten seconds. Does a strict comparison include equality?'],
    explanation: ['Equality fails ', term('<'), '. One copy retracts at ', time('20.000 s'), '; event 101 remains in the source.'],
    groups: [{ kind: 'radio', id: 'change', label: 'Result change at 20.000 s', expected: 'retract', guidance: 'At equality, the exclusive predicate stops matching the existing row.',
      options: [option('none', 'No net changes'), signed('add', 1, event(101, 10)), signed('retract', -1, event(101, 10))] }] },
  { id: 'inclusive-boundary', title: 'Include equality', fixture: inclusive, actions: [advance(20_001)], before: 0, after: 1,
    actionLabel: 'New inclusive fixture: advance from 20.000 s to 20.001 s.',
    question: ['This separate query uses ', term('<='), '. Choose the behavior at equality and one millisecond later.'],
    hint: ['The inclusive predicate accepts equality, but not the next millisecond.'],
    explanation: ['The row is present at ', time('20.000 s'), ' and retracts at ', time('20.001 s'), '. Its source row remains.'],
    groups: [{ kind: 'radio', id: 'boundary', label: 'Inclusive schedule', expected: 'after', guidance: 'The inclusive boundary must retain the row exactly at 20.000 s.', options: [
      option('at', 'Retract at 20.000 s'), option('after', 'Present at 20.000 s; retract at 20.001 s'), option('retain', 'Keep the row after 20.001 s')] }] },
  { id: 'exclude-future', title: 'Exclude a future event', fixture: future, actions: [{ kind: 'switch-fixture', fixture: boundedFuture }], before: 0, after: 1,
    actionLabel: 'Compare a fresh bounded query over the same future event.',
    question: ['Event 102 is dated ', time('24.000 s'), ' but arrives at ', time('16.000 s'), '. Choose the missing bound and its intended lifetime.'],
    hint: ['Expiration alone allows future events. Add a condition that waits for the event timestamp.'],
    explanation: [term('mz_now() >= event_ts'), ' delays entry until ', time('24.000 s'), '; the exclusive ten-second window ends at ', time('34.000 s'), '. This is a separate query, not an input retraction.'],
    groups: [{ kind: 'radio', id: 'bound', label: 'Entry condition', expected: 'entry', guidance: 'Logical time must reach the event timestamp before the row enters.', options: [
      option('entry', 'mz_now() >= event_ts'), option('reverse', 'mz_now() < event_ts'), option('none', 'No entry condition')] },
    { kind: 'radio', id: 'interval', label: 'Eligible lifetime', expected: 'event-window', guidance: 'Start at event time, not application time; exclude the expiration boundary.', options: [
      option('arrival-window', '[16.000 s, 26.000 s)'), option('event-window', '[24.000 s, 34.000 s)'), option('inclusive-end', '[24.000 s, 34.000 s]')] }] },
];

const deadlines: TemporalFixture = { id: 'exercise-deadlines', label: 'Changing row deadlines', logicalTimeMs: 12_000,
  predicate: 'explicit-deadline', rows: [event(201, 10, 20), event(202, 10, 25), event(203, 10, 28)] };
const deadlineActions: readonly TemporalAction[] = [
  { kind: 'update', timeMs: 15_000, row: event(201, 10, 30) },
  { kind: 'delete', timeMs: 16_000, eventId: 202 },
  { kind: 'update', timeMs: 17_000, row: event(203, 10, 16) },
  advance(20_000), advance(25_000), advance(28_000), advance(30_000),
];
const deadlineQuestions: readonly TemporalQuestion[] = [
  { id: 'extend', title: 'Extend a lifetime', fixture: deadlines, actions: deadlineActions, before: 0, after: 1,
    actionLabel: 'At 15.000 s, change event 201’s deadline from 20.000 s to 30.000 s.',
    question: ['The result includes ', term('expires_at'), '. Select every result change caused by extending event 201’s deadline.'],
    hint: ['The projected deadline changes too. Replace the old complete row with the new one at the same timestamp.'],
    explanation: ['Retract the row with deadline ', time('20.000 s'), ' and add its replacement with deadline ', time('30.000 s'), '. Both changes occur at ', time('15.000 s'), '.'],
    groups: [{ kind: 'checkbox', id: 'changes', label: 'Select every signed change', expected: ['old', 'new'], guidance: 'An update replaces the old full projected row; inserting only the replacement leaves the old value behind.', options: [
      signed('old', -1, event(201, 10, 20)), signed('new', 1, event(201, 10, 30)), signed('wrong-old', 1, event(201, 10, 20)), signed('wrong-new', -1, event(201, 10, 30))] }] },
  { id: 'delete', title: 'Delete before expiration', fixture: deadlines, actions: deadlineActions, before: 1, after: 2,
    actionLabel: 'At 16.000 s, delete event 202 from the source.',
    question: ['Delete event 202 before its deadline. What changes in the maintained result now?'],
    hint: ['A matching source row disappears immediately; its old deadline is no longer an independent future removal.'],
    explanation: ['Event 202 retracts at ', time('16.000 s'), '. Two source rows remain; its old ', time('25.000 s'), ' deadline is obsolete.'],
    groups: [{ kind: 'radio', id: 'change', label: 'Result change at 16.000 s', expected: 'retract', guidance: 'The deleted event is currently visible, so its full result row retracts now.', options: [
      option('none', 'No net changes'), signed('retract', -1, event(202, 10, 25)), signed('add', 1, event(202, 10, 25))] }] },
  { id: 'shorten', title: 'Move expiration into the past', fixture: deadlines, actions: deadlineActions, before: 2, after: 3,
    actionLabel: 'At 17.000 s, change event 203’s deadline from 28.000 s to 16.000 s.',
    question: ['Select every result change. The replacement source row’s new deadline is already in the past.'],
    hint: ['Remove the old visible result row, then evaluate whether the replacement qualifies at logical time 17.000 s.'],
    explanation: ['Retract the old row with deadline ', time('28.000 s'), '. The source keeps the replacement with deadline ', time('16.000 s'), ', but that replacement does not enter the result.'],
    groups: [{ kind: 'checkbox', id: 'changes', label: 'Select every signed change', expected: ['old'], guidance: 'Retract the old projected value; the already-expired replacement produces no insertion.', options: [
      signed('old', -1, event(203, 10, 28)), signed('new', 1, event(203, 10, 16)), signed('wrong-retraction', -1, event(203, 10, 16))] }] },
  { id: 'obsolete-deadlines', title: 'Follow the remaining schedule', fixture: deadlines, actions: deadlineActions, before: 3, after: 7,
    actionLabel: 'Advance through 20.000 s, 25.000 s, 28.000 s, and 30.000 s; no source changes.',
    question: ['After the previous edits, identify the first future output change and its signed row.'],
    hint: ['Use the surviving row’s current deadline. The old deadlines belong to replaced or deleted values.'],
    explanation: ['Nothing changes at ', time('20.000 s'), ', ', time('25.000 s'), ', or ', time('28.000 s'), '. Only event 201 retracts at ', time('30.000 s'), '; expiration keeps the two source rows.'],
    groups: [{ kind: 'radio', id: 'deadline', label: 'First output change', expected: '30', guidance: 'The surviving event now expires at 30.000 s, not at its old deadline.', options: ['20', '25', '28', '30'].map((value) => option(value, value + '.000 s')) },
    { kind: 'radio', id: 'change', label: 'Signed result change', expected: 'retract-current', guidance: 'Use event 201’s replacement row, whose projected deadline is 30.000 s.', options: [
      signed('retract-current', -1, event(201, 10, 30)), signed('retract-old', -1, event(201, 10, 20)), option('none', 'No net changes')] }] },
];

const empty: TemporalFixture = { id: 'exercise-query', label: 'Build a recent-events query', logicalTimeMs: 12_000, predicate: 'bounded-window', windowMs: 10_000, rows: [] };
const late: TemporalFixture = { ...empty, id: 'exercise-late', label: 'Late arrival · new fixture', logicalTimeMs: 18_000 };
const expired: TemporalFixture = { ...empty, id: 'exercise-expired', label: 'Expired arrival · new fixture', logicalTimeMs: 21_000 };
const mixed: TemporalFixture = { ...empty, id: 'exercise-mixed', label: 'Mixed recent events · new fixture', logicalTimeMs: 22_000, rows: [event(401, 22)] };
const mixedActions: readonly TemporalAction[] = [
  { kind: 'insert', timeMs: 24_000, row: event(402, 18) },
  { kind: 'insert', timeMs: 24_000, row: event(403, 30) }, advance(28_000), advance(30_000),
];
const ids = [401, 402, 403].map((id) => option(String(id), 'Event ' + id));
const recentQuestions: readonly TemporalQuestion[] = [
  { id: 'build-filter', title: 'Choose a maintainable filter', fixture: empty, actions: [], before: 0, after: 0, concealPredicate: true,
    actionLabel: 'Choose a maintained temporal filter.',
    question: ['Select a ten-second event-time window that excludes future events.'],
    hint: ['Use query logical time, combine bounds with AND, and put interval arithmetic on the row expression.'],
    explanation: ['Use ', term('mz_now()'), ' with both bounds. Keep interval arithmetic on ', term('event_ts'), '.'],
    groups: [{ kind: 'radio', id: 'filter', label: 'Temporal WHERE clause', expected: 'bounded', guidance: 'Use mz_now() with AND, leaving arithmetic on event_ts rather than on the clock.', options: [
      { id: 'transaction', content: [], code: "now() >= event_ts AND now() < event_ts + INTERVAL '10 seconds'", guidance: 'now() samples transaction start and cannot be materialized. Use query logical time.' },
      { id: 'bounded', content: [], code: "mz_now() >= event_ts AND mz_now() < event_ts + INTERVAL '10 seconds'" },
      { id: 'arithmetic', content: [], code: "mz_now() >= event_ts AND mz_now() - INTERVAL '10 seconds' < event_ts", guidance: 'Move interval arithmetic to event_ts; mz_now() must remain a direct comparison.' },
      { id: 'or', content: [], code: "mz_now() >= event_ts OR mz_now() < event_ts + INTERVAL '10 seconds'", guidance: 'Combine temporal bounds with AND; OR does not define the intended maintained window.' },
    ] }] },
  { id: 'arrive-late', title: 'Arrive with time remaining', fixture: late,
    actions: [{ kind: 'insert', timeMs: 18_000, row: event(301, 10) }], before: 0, after: 1,
    actionLabel: 'At 18.000 s, apply event 301 with event time 10.000 s.',
    question: ['Predict whether event 301 enters the result and how many seconds remain before expiration.'],
    hint: ['The deadline is based on event time plus ten seconds, not application time plus ten seconds.'],
    explanation: ['The event enters at ', time('18.000 s'), ' and expires at ', time('20.000 s'), '. Only two seconds remain.'],
    groups: [{ kind: 'radio', id: 'visible', label: 'Result membership', expected: 'enters', guidance: 'Logical time is after the event timestamp but before the expiration boundary.', options: [option('enters', 'Enters the result'), option('absent', 'Stays absent')] },
    { kind: 'count', id: 'remaining', label: 'Seconds remaining', expected: 2, guidance: 'Subtract application time 18 from the event-based deadline 20.' }] },
  { id: 'arrive-expired', title: 'Arrive after expiration', fixture: expired,
    actions: [{ kind: 'insert', timeMs: 21_000, row: event(302, 10) }], before: 0, after: 1,
    actionLabel: 'New empty fixture: at 21.000 s, apply event 302 with event time 10.000 s.',
    question: ['Predict the source and result effect of an event arriving after its complete event-time window.'],
    hint: ['Distinguish accepting an input row from that row passing the temporal filter.'],
    explanation: ['The source gains event 302, but its deadline was ', time('20.000 s'), '. It never enters this result and emits no result insertion.'],
    groups: [{ kind: 'radio', id: 'effect', label: 'Effect of the arrival', expected: 'source-only', guidance: 'Temporal filtering affects result membership; it does not discard this source row.', options: [
      option('both', 'Source and result both gain the row'), option('source-only', 'Source gains the row; result unchanged'), option('neither', 'Neither source nor result stores the row')] }] },
  { id: 'mixed-expiration', title: 'Expire one event in a mixed result', fixture: mixed, actions: mixedActions, before: 2, after: 3,
    actionLabel: 'Mixed fixture: advance from 24.000 s to 28.000 s with no source changes.',
    question: ['Events 401 and 402 are visible at ', time('24.000 s'), '; 403 is future-dated. Select the rows and change at ', time('28.000 s'), '.'],
    hint: ['Compare each event timestamp plus ten seconds with the target time. The future event still waits for its start.'],
    explanation: ['Event 402 retracts at ', time('28.000 s'), '. Only 401 remains visible; 403 waits until ', time('30.000 s'), '. All three source rows remain.'],
    groups: [{ kind: 'checkbox', id: 'rows', label: 'Result events at 28.000 s', expected: ['401'], guidance: '401 has not expired, 402 reaches its exclusive deadline, and 403 has not started.', options: ids },
    { kind: 'radio', id: 'change', label: 'Result change', expected: 'expire-late', guidance: 'Retract the late event whose event-based window ends at 28.000 s.', options: [
      signed('expire-late', -1, event(402, 18)), signed('expire-current', -1, event(401, 22)), signed('early-future', 1, event(403, 30))] }] },
  { id: 'mixed-entry', title: 'Admit a future event', fixture: mixed, actions: mixedActions, before: 3, after: 4,
    actionLabel: 'Continue to 30.000 s; the source still receives no new message.',
    question: ['Select the result rows and signed change when logical time reaches ', time('30.000 s'), '.'],
    hint: ['The future row can enter when its lower bound passes, without being inserted into the source again.'],
    explanation: ['Event 403 enters with ', term('+1'), '. The result now contains 401 and 403, while the source still contains all three events.'],
    groups: [{ kind: 'checkbox', id: 'rows', label: 'Result events at 30.000 s', expected: ['401', '403'], guidance: '401 lasts until 32.000 s; 403 starts at 30.000 s; 402 already expired.', options: ids },
    { kind: 'radio', id: 'change', label: 'Result change', expected: 'future-entry', guidance: 'The new output is the already-stored future event entering its eligible interval.', options: [
      option('none', 'No net changes'), signed('future-entry', 1, event(403, 30)), signed('retract-current', -1, event(401, 22))] }] },
];

export const temporalExercises: readonly TemporalExercise[] = [
  { slug: 'exercise-1', title: 'Read clocks and boundaries', description: 'Predict exact boundaries and exclude future events.', durationMinutes: 6, hasClocks: true,
    questions: boundaryQuestions, reference: { ...temporalLectureOne.reference, objective: 'Choose the query clock and predict exclusive, inclusive, and future-event boundaries. Times are seconds after the fixed UTC origin; each comparison fixture is independent.' } },
  { slug: 'exercise-2', title: 'Keep changing deadlines correct', description: 'Predict replacements, deletions, and obsolete deadlines.', durationMinutes: 7, hasClocks: false,
    questions: deadlineQuestions, reference: { ...temporalLectureFour.reference,
      sql: temporalLectureFour.reference.sql.replace(/\b101\b/g, '201').replace(/\b102\b/g, '202').replace(/\b103\b/g, '203'),
      objective: 'Predict result changes when deadlines change or rows are deleted. The result projects expires_at, so a visible deadline edit replaces the full result row.' } },
  { slug: 'exercise-3', title: 'Build a reliable recent-events view', description: 'Combine late arrivals, future events, and time-only changes.', durationMinutes: 8, hasClocks: false,
    questions: recentQuestions, reference: { ...temporalLectureOne.reference,
      objective: 'Choose a maintained ten-second event-time window that excludes future events. Predict its output for late arrivals and mixed event times. All fixtures use the fixed UTC origin and integer milliseconds.',
      sql: `CREATE TABLE events (event_id INT, event_ts TIMESTAMPTZ);

-- Complete this task using the choices in Question 1:
-- CREATE MATERIALIZED VIEW recent_events AS
-- SELECT event_id, event_ts FROM events
-- WHERE <your temporal predicate>;

-- Later questions use a ten-second window with an inclusive entry
-- boundary and an exclusive expiration boundary.
-- Event time is row data; application time does not restart this window.`,
    } },
];

export function temporalQuestionState(question: TemporalQuestion, accepted: boolean) {
  return temporalSnapshotAt(accepted ? question.after : question.before, question.fixture, question.actions);
}
