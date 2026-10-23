import { parseExerciseInteger, type ExerciseGrade } from '../../hooks/useExerciseStages';
import { applyProgress, fixture, type LaneId, type ProgressAction, type ProgressSnapshot } from './simulation';
import { progressText } from './lessonText';

export interface AnswerChoice { id: string; label: string; feedback: string }
export interface AnswerGroup {
  id: string; label: string; kind: 'single' | 'multiple' | 'integer'; choices?: readonly AnswerChoice[];
  solution: readonly string[];
}
export interface ProgressQuestion {
  focusLanes: readonly LaneId[];
  title: string; prompt: string; hint: string; explanation: string;
  before: ProgressSnapshot; after: ProgressSnapshot; actionLabel: string;
  groups: readonly AnswerGroup[]; showLimit: boolean;
}
export interface ProgressExercise { slug: string; title: string; description: string; questions: readonly ProgressQuestion[] }
export type Prediction = Readonly<Record<string, readonly string[]>>;
const c = (id: string, label: string, feedback: string): AnswerChoice => ({ id, label, feedback });
const single = (id: string, label: string, choices: readonly AnswerChoice[], solution: string): AnswerGroup => ({ id, label, kind: 'single', choices, solution: [solution] });
const integer = (id: string, label: string, value: number): AnswerGroup => ({ id, label, kind: 'integer', solution: [String(value)] });
const yesNo = (id: string, label: string, yes: boolean, wrong: string) => single(id, label, [c('yes', 'Yes', wrong), c('no', 'No', wrong)], yes ? 'yes' : 'no');
function question(focusLanes: readonly LaneId[], title: string, prompt: string, hint: string, explanation: string, before: ProgressSnapshot, action: ProgressAction,
  actionLabel: string, groups: readonly AnswerGroup[], showLimit = true): ProgressQuestion {
  return { focusLanes, title, prompt, hint, explanation, before, after: applyProgress(before, action), actionLabel, groups, showLimit };
}
const explain: ProgressAction = { type: 'explain' };
const read = fixture(15, 15, 15);
const high = applyProgress(read, { type: 'observe', lane: 'orders', change: { orderId: 201, logicalTime: 22 } });
const quiet = applyProgress(read, { type: 'frontier', lane: 'orders', to: 17 });
const event = applyProgress(quiet, { type: 'observe', lane: 'orders', change: { orderId: 202, logicalTime: 18, eventTime: 5 } });
const join0 = fixture(17, 11, 9);
const join1 = applyProgress(join0, { type: 'frontier', lane: 'orders', to: 20 });
const join2 = applyProgress(join1, { type: 'frontier', lane: 'payments', to: 18 });
const join3 = applyProgress(join2, { type: 'frontier', lane: 'join', to: 13 });
const causes = [
  c('source', 'Payments ingestion', 'Check whether source frontiers advance and whether a source status confirms a problem.'),
  c('join', 'Paid orders computation', 'Compare Paid orders with its inputs and inspect whether its pending work grows.'),
  c('serving', 'Query serving', 'A slow query needs request-duration evidence. Query speed does not establish freshness.'),
];
const source = fixture(19, 10, 10, { showRevenue: true, clock: 22, queryMs: 70, sourceStatus: 'stalled', evidence: 'Case A · Orders 17 → 19; Payments 10 → 10, status: stalled. Both outputs reach 10. Query: 70 ms.' });
const compute = fixture(19, 19, 13, { showRevenue: true, clock: 22, queryMs: 90, backlog: [50, 110], sourceStatus: 'running', evidence: 'Case B · Sources 17 → 19; both outputs stay 13. Paid orders backlog: 50 → 110 changes. Query: 90 ms.' });
const serving = fixture(22, 22, 22, { showRevenue: true, clock: 22, queryMs: 3000, queryTarget: 21, sourceStatus: 'running', evidence: 'Case C · At request start: all frontiers 22; query target 21. Query: 3 s. Later arrivals are outside this snapshot.' });
const timing = fixture(22, 22, 22, { showRevenue: true, clock: 22, journey: { changed: 0, ready: 5, requested: 5, returned: 7 }, evidence: 'Separate timing fixture · Update occurs at 0 s; result ready at 5 s; query starts at 5 s; response arrives at 7 s.' });

export const progressExercises: readonly ProgressExercise[] = [
  { slug: 'exercise-1', title: 'Read the evidence', description: 'Distinguish completed logical time from observed changes and quiet inputs.', questions: [
    question(['orders'], 'Read the boundary', 'Orders has write frontier 15. Classify logical times 14 and 15.', 'A frontier completes times strictly below its value.', '14 is complete because it is below frontier 15. Time 15 remains open: the boundary is exclusive.', read, explain, 'Inspect the current frontier; no change is applied.', [
      single('boundary', 'Which statement is guaranteed?', [c('below', '14 is complete; 15 is open.', ''), c('both', '14 and 15 are complete.', 'Time 15 is at the boundary, so it is still open.'), c('neither', 'Neither time is complete.', 'Time 14 is strictly below the frontier and is guaranteed complete.')], 'below'),
    ], false),
    question(['orders'], 'A high timestamp is not proof', 'Orders observed a change at 22; its frontier remains 15. Is time 20 guaranteed complete?', 'Use the solid frontier, not the diamond marking a single change.', 'No. Observing 22 does not complete 20. Frontier 15 guarantees completion only below 15.', high, explain, 'New fixture · a change at 22 has arrived; frontier stays 15.', [yesNo('complete', 'Is time 20 guaranteed complete?', false, 'Observation is evidence of one change, not completion of earlier times.')], false),
    question(['orders', 'payments'], 'Quiet input progress', 'No business rows arrive. Orders advances 15 → 17; Payments stays 15. Select every supported conclusion.', 'Separate the absence of rows from confirmed progress. A stopped frontier alone does not name a cause.', 'Orders confirms progress without rows. Payments confirms none, but silence does not establish its cause.', quiet, explain, 'New progress sample · business rows unchanged.', [{ id: 'evidence', label: 'Select every supported statement', kind: 'multiple', solution: ['orders', 'unknown'], choices: [
      c('orders', 'Orders confirms more completed time.', ''), c('unknown', 'Payments confirms no further progress; its cause is unknown.', ''), c('failed', 'Payments must have failed because there are no rows.', 'No rows alone does not prove failure.'), c('caught', 'Both inputs are caught up because there are no rows.', 'Absence of rows does not establish completeness.'),
    ] }], false),
    question(['orders'], 'Logical time and event time', 'Event time 5, logical time 18, Orders frontier 17: is the arriving record forbidden?', 'The guarantee refers to the change’s logical timestamp, not the business timestamp stored inside the row.', 'No: logical time 18 is above frontier 17. Business event time 5 is a separate field.', event, explain, 'New record · order 202; event time 5; logical time 18.', [yesNo('forbidden', 'Is this change forbidden?', false, 'Compare logical time 18 with frontier 17; do not compare event time 5 with the frontier.')], false),
  ] },
  { slug: 'exercise-2', title: 'Unblock the join', description: 'Predict input limits and actual completion before applying each action.', questions: [
    question(['orders', 'payments', 'join'], 'Find the current limit', 'Identify the input limit, actual Paid orders frontier, and limiting input.', 'The smaller input frontier sets the limit; the solid output marker reports actual progress.', 'Payments limits inputs to 11; the actual Paid orders frontier of 9 leaves permitted work unfinished.', join0, explain, 'Inspect the initial fixture.', [integer('limit', 'Input limit', 11), integer('actual', 'Actual join frontier', 9), single('limiter', 'Limiting input', [c('orders', 'Orders', 'Orders is ahead; Payments is the smaller input.'), c('payments', 'Payments', ''), c('both', 'Both', 'The frontiers are different, so there is no tie.')], 'payments')]),
    question(['orders', 'payments', 'join'], 'Advance the faster input', 'Advance only Orders to 20; no other stage moves. Predict the resulting markers.', 'Which input was smaller? Was a join-processing action supplied?', 'Orders reaching 20 changes neither value: Payments still limits inputs to 11; Paid orders stays 9.', join0, { type: 'frontier', lane: 'orders', to: 20 }, 'Upcoming action · Orders 17 → 20 only.', [integer('limit', 'New input limit', 11), integer('actual', 'New join frontier', 9)]),
    question(['orders', 'payments', 'join'], 'Advance the limiting input', 'Now advance only Payments from 11 to 18. Orders is 20. The join still does no processing.', 'The input limit can change while the actual join frontier stays fixed.', 'The limit becomes 18, but the actual join frontier remains 9. Permission is not completed computation.', join1, { type: 'frontier', lane: 'payments', to: 18 }, 'Upcoming action · Payments 11 → 18 only.', [integer('limit', 'New input limit', 18), integer('actual', 'New join frontier', 9)]),
    question(['join'], 'Process part of the work', 'Inputs stay 20 and 18. Paid orders reaches 13: is time 13 complete, and is the join caught up?', 'At frontier 13, only times below 13 are complete. Compare its actual frontier with the input limit.', 'Paid orders reaches 13 while the input limit stays 18. Time 12 is complete; 13 remains open.', join2, { type: 'frontier', lane: 'join', to: 13 }, 'Upcoming action · process Paid orders 9 → 13.', [single('state', 'Choose the resulting state', [c('partial', '12 complete; 13 open; join still behind.', ''), c('inclusive', '13 complete; join still behind.', 'The frontier excludes time 13 itself.'), c('caught', '12 complete; join fully caught up.', 'The inputs permit 18, so a frontier of 13 is still behind.')], 'partial')]),
    question(['orders', 'payments', 'join'], 'Finish permitted work', 'Process Paid orders from 13 to 18. Which input must advance before further completion?', 'Compare the input frontiers after the join catches up. More processing alone cannot remove an input boundary.', 'Paid orders catches up to 18. Payments at 18 is still limiting; it must advance before further completion.', join3, { type: 'frontier', lane: 'join', to: 18 }, 'Upcoming action · process Paid orders 13 → 18.', [single('next', 'What is required next?', [c('payments', 'Payments must advance beyond 18.', ''), c('orders', 'Advance Orders alone.', 'Orders is already ahead at 20; Payments remains the limit.'), c('process', 'More processing alone is sufficient.', 'The join cannot complete beyond the input limit even with spare processing capacity.')], 'payments')]),
  ] },
  { slug: 'exercise-3', title: 'Diagnose three dashboards', description: 'Choose an investigation and supporting evidence for each independent incident.', questions: [
    question(['orders', 'payments', 'join', 'revenue'], 'Case A: stale dashboard', 'Choose the stage to investigate first and every observation that supports that diagnosis.', 'Look for where progress first stops and whether source status confirms an issue.', 'Payments is stalled at 10; both outputs are caught up. Investigate ingestion even when queries are fast.', source, explain, 'Independent incident A · inspect the evidence.', [single('cause', 'Investigate first', causes, 'source'), { id: 'evidence', label: 'Supporting evidence', kind: 'multiple', solution: ['status', 'progress'], choices: [c('status', 'Payments is stalled.', ''), c('progress', 'Both outputs reach 10.', ''), c('query', 'Fast query means serving.', 'A fast query is not evidence of a serving bottleneck.')] }]),
    question(['orders', 'payments', 'join', 'revenue'], 'Case B: stale maintained result', 'This is a separate incident. Choose the first stage to investigate and every supporting observation.', 'Can the sources confirm newer time while a maintained transformation remains behind?', 'Paid orders delays Revenue despite newer inputs. Investigate computation; backlog growth does not prove a CPU bottleneck.', compute, explain, 'Independent incident B · no state carries over from A.', [single('cause', 'Investigate first', causes, 'join'), { id: 'evidence', label: 'Supporting evidence', kind: 'multiple', solution: ['inputs', 'work'], choices: [c('inputs', 'Sources 19; join 13.', ''), c('work', 'Join backlog: 50 → 110.', ''), c('cpu', 'CPU cause is proven.', 'Progress and backlog locate delay; they do not by themselves identify CPU as its exact cause.')] }]),
    question(['orders', 'payments', 'join', 'revenue'], 'Case C: a slow response', 'All frontiers are 22 when the query requests time 21. Choose a cause and supporting evidence.', 'Is the target strictly below every frontier? Compare that with the measured request duration.', 'Target 21 is complete, but retrieval takes 3 seconds: investigate serving. Later changes are outside this snapshot.', serving, explain, 'Independent incident C · target 21; frontiers 22.', [single('cause', 'Investigate first', causes, 'serving'), { id: 'evidence', label: 'Supporting evidence', kind: 'multiple', solution: ['target', 'duration'], choices: [c('target', 'Target 21 is complete.', ''), c('duration', 'Query takes 3 seconds.', ''), c('latest', 'Later changes included.', 'A completed target describes a snapshot, not every later arrival.')] }]),
    question(['orders', 'payments', 'join', 'revenue'], 'Separate the three durations', 'An update occurs at 0 s; its result is ready at 5 s. A query starts at 5 s and returns at 7 s. Enter each duration in seconds.', 'Freshness ends at result readiness. Query duration starts at the request. The full journey ends at the response.', 'Freshness delay is 5 s, query latency is 2 s, and this example’s reaction time is 7 s. The arithmetic relies on the query starting when the result becomes ready.', timing, explain, 'Separate timing example · these are elapsed seconds.', [integer('freshness', 'Freshness delay (s)', 5), integer('query', 'Query latency (s)', 2), integer('reaction', 'Reaction time (s)', 7)]),
  ] },
];

export function solutionFor(question: ProgressQuestion): Prediction {
  return Object.fromEntries(question.groups.map(g => [g.id, g.solution]));
}
export function gradePrediction(question: ProgressQuestion, prediction: Prediction): ExerciseGrade {
  const errors: Record<string, string> = {};
  for (const group of question.groups) {
    const supplied = prediction[group.id] ?? [];
    const valid = group.kind === 'integer'
      ? supplied.length === 1 && parseExerciseInteger(supplied[0]!) === Number(group.solution[0])
      : new Set(supplied).size === supplied.length && supplied.length === group.solution.length && supplied.every(id => group.solution.includes(id));
    if (!valid) {
      const misconception = group.choices?.find(choice => supplied.includes(choice.id) && !group.solution.includes(choice.id))?.feedback;
      errors[group.id] = misconception || (group.kind === 'integer'
        ? parseExerciseInteger(supplied[0] ?? '') === null
          ? `Enter a whole number for ${group.label}. ${question.hint}`
          : `${group.label} is not ${supplied[0]}. ${question.hint}`
        : 'Choose the complete supported answer set; include every required statement and exclude unsupported claims.');
    }
  }
  const correct = Object.keys(errors).length === 0;
  const incorrectGroups = question.groups.filter(group => errors[group.id]);
  const feedback = incorrectGroups.length > 1
    ? `Review ${incorrectGroups.map(group => group.label).join(', ')}. ${question.hint}`
    : Object.values(errors)[0]!;
  return { correct, errors, title: [correct ? 'Prediction accepted' : 'Check the evidence again'], explanation: progressText(correct ? question.explanation : feedback) };
}
