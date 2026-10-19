import { applyProgress, fixture, type LaneId, type ProgressAction, type ProgressSnapshot } from './simulation';

export type Target = LaneId | 'axis' | 'detail';
export interface ProgressCase { label: string; transition: string }
export interface ProgressLesson {
  title: string; target: Target; action: ProgressAction; explanation: string; before?: string;
  snapshot: ProgressSnapshot; showLimit: boolean;
  caseStudy?: ProgressCase;
}
export interface ProgressLecture {
  title: string; description: string; initial: ProgressSnapshot; lessons: readonly ProgressLesson[];
  initialCase?: ProgressCase;
}
type LessonSpec = Omit<ProgressLesson, 'snapshot' | 'showLimit'> & { showLimit?: boolean };
export function playbackFrames(lecture: ProgressLecture) {
  return lecture.lessons.flatMap((lesson, index) => lesson.action.type === 'explain' ? [] : [{ time: index + 1, lesson, previous: index === 0 ? lecture.initial : lecture.lessons[index - 1]!.snapshot }]);
}
export function playbackExplanation(lesson: ProgressLesson, previous: ProgressSnapshot): string {
  const action = lesson.action;
  if (action.type === 'frontier') {
    const name = { orders: 'Orders', payments: 'Payments', join: 'Paid orders', revenue: 'Revenue' }[action.lane];
    return action.lane === 'orders' || action.lane === 'payments'
      ? `${name} reports ${previous.frontiers[action.lane]} → ${action.to}. Green covers times before ${action.to}; ${action.to} stays open. No row arrives.`
      : `${name} processes work: ${previous.frontiers[action.lane]} → ${action.to}. Green expands; the orange processing gap shrinks.`;
  }
  if (action.type === 'observe') {
    const { logicalTime, eventTime, orderId } = action.change;
    return eventTime === undefined
      ? `Order ${orderId}: ◇ at ${logicalTime}. Frontier stays ${previous.frontiers[action.lane]}; seeing ${logicalTime} does not complete earlier times.`
      : `Order ${orderId}: ◇ at logical time ${logicalTime}; event time ${eventTime}. Frontier ${previous.frontiers[action.lane]} is unchanged.`;
  }
  return lesson.snapshot.evidence ?? lesson.explanation;
}
function lecture(title: string, description: string, initial: ProgressSnapshot, specs: readonly LessonSpec[], initialCase?: ProgressCase): ProgressLecture {
  let current = initial;
  let limit = false;
  let caseStudy = initialCase;
  return { title, description, initial, initialCase, lessons: specs.map(spec => {
    current = applyProgress(current, spec.action);
    limit = spec.showLimit ?? limit;
    caseStudy = spec.caseStudy ?? caseStudy;
    return { ...spec, snapshot: current, showLimit: limit, caseStudy };
  }) };
}
const explain: ProgressAction = { type: 'explain' };
export const diagnosisFixtures = {
  source: fixture(18, 8, 8, { revenue: 8, showRevenue: true, clock: 20, queryMs: 70, sourceStatus: 'stalled',
    evidence: 'New incident · Orders 16 → 18; Payments stays at 8 (status: stalled). Both maintained stages are at 8.' }),
  compute: fixture(18, 18, 12, { revenue: 12, showRevenue: true, clock: 20, queryMs: 90, backlog: [40, 90], sourceStatus: 'running',
    evidence: 'New incident · Sources 16 → 18; maintained stages stay at 12. Paid orders backlog grows 40 → 90 (illustrative).' }),
  serving: fixture(20, 20, 20, { revenue: 20, showRevenue: true, clock: 20, queryMs: 3000, queryTarget: 19, sourceStatus: 'running',
    evidence: 'New incident · Frontiers 20: target 19 is complete at request start. Query: 3 s. Later arrivals are outside this snapshot.' }),
};

export const progressLectures: readonly ProgressLecture[] = [
  lecture('What progress proves', 'Read the boundary between completed time and changes that may still arrive.', fixture(8, 8, 8), [
    { title: 'One lane, one object', target: 'orders', action: explain, explanation: 'Orders and Payments are input relations. Paid orders joins them by order ID. Each lane represents an object, not one order. We will follow how far each object has finished its changes.' },
    { title: 'Read the logical-time axis', target: 'axis', action: explain, explanation: 'Each tick is a logical timestamp attached to changes. The same horizontal position means the same logical time on all lanes. These numbers are not event times inside orders, elapsed seconds, or tutorial step numbers.' },
    { title: 'The solid marker is a write frontier', target: 'orders', action: explain, explanation: 'Orders has frontier 8. All changes at logical times below 8 are complete for Orders. Time 8 itself is still open. The shaded prefix ends at the marker: it excludes the boundary.' },
    { title: 'Before the boundary, not at it', target: 'orders', action: { type: 'frontier', lane: 'orders', to: 12 }, before: 'Orders will report frontier 12. Will time 11 be complete? What about time 12? Compare each time with the boundary before revealing.', explanation: 'Orders is now complete before 12. Time 11 is below the frontier and is complete. Time 12 equals the frontier and remains open. Payments and Paid orders have not advanced.' },
    { title: 'Observed is different from complete', target: 'orders', action: { type: 'observe', lane: 'orders', change: { orderId: 104, logicalTime: 18 } }, before: 'One Orders change at logical time 18 will arrive. No new progress report is supplied. Does seeing 18 guarantee that time 12 is complete?', explanation: 'The diamond marks one observed change at 18. The solid frontier stays at 12. A high observed timestamp does not prove earlier times are finished. Time 12 remains open.' },
    { title: 'An open time can receive another change', target: 'orders', action: { type: 'observe', lane: 'orders', change: { orderId: 105, logicalTime: 12 } }, before: 'Another change will arrive at logical time 12, after we saw a change at 18. Is that allowed with frontier 12?', explanation: 'Yes. A change at 12 is allowed because only times below 12 are complete. Receiving changes out of timestamp order does not break the guarantee. The frontier remains 12.' },
    { title: 'Quiet data can still make progress', target: 'orders', action: { type: 'frontier', lane: 'orders', to: 14 }, before: 'No new order rows arrive. Orders reports progress to 14. Can its frontier move even though its business data stays unchanged?', explanation: 'Yes. The progress report advances Orders to 14 without a new business row. More logical times are complete even though the order table is unchanged. Row activity and progress are separate evidence.' },
    { title: 'Quiet or stuck?', target: 'payments', action: { type: 'frontier', lane: 'orders', to: 16 }, before: 'Still no new business rows. Orders reports 16; Payments remains at 8. What can you conclude about Payments, and what is still unknown?', explanation: 'Orders confirms progress to 16. Payments confirms nothing beyond 8. No new rows alone establishes neither failure nor completeness. A stopped frontier does not tell us whether connectivity, compute, or another condition is responsible.' },
    { title: 'Business event time is a different clock', target: 'detail', action: { type: 'observe', lane: 'orders', change: { orderId: 106, logicalTime: 18, eventTime: 5 } }, before: 'A newly arriving order describes a business event at time 5 and carries logical time 18. Does frontier 16 forbid that older business event?', explanation: 'No. Frontier 16 refers to logical timestamps. This change has logical time 18, so it is allowed even though the event it describes happened at business time 5. Arrival does not rewrite the completeness guarantee.' },
    { title: 'What the evidence establishes', target: 'join', action: explain, explanation: 'A solid frontier establishes completion strictly before its value. A diamond establishes only that one change was seen. Progress reports can advance without rows. Next, we will ask how both inputs constrain the join.' },
  ]),
  lecture('A join waits for both inputs', 'Separate what the inputs permit from what the join has actually completed.', fixture(12, 8, 6), [
    { title: 'Start with a new fixture', target: 'join', action: explain, explanation: 'This is a fresh scenario: Orders frontier 12, Payments 8, Paid orders 6. Both inputs are ahead of the join. A smaller frontier means less logical time is guaranteed complete; it is not a count of rows.' },
    { title: 'The dashed marker is the input limit', target: 'join', action: explain, showLimit: true, explanation: 'For this direct join, both inputs must finish a time before the output can finish it. The smaller input frontier is 8. The dashed marker shows that inputs permit a frontier up to 8; the solid marker at 6 shows actual completion.' },
    { title: 'Advancing the faster input', target: 'orders', action: { type: 'frontier', lane: 'orders', to: 16 }, before: 'Orders will advance from 12 to 16. Payments stays at 8 and the join does no processing. Predict both the input limit and the join frontier.', explanation: 'The input limit stays 8 because Payments is still at 8. Paid orders stays at 6 because no processing action occurred. Advancing the faster input changes neither constraint nor actual output progress.' },
    { title: 'Catch up to the current input limit', target: 'join', action: { type: 'frontier', lane: 'join', to: 8 }, before: 'The join now processes its pending work up to the current input limit. Must a source advance first? Which output times become complete?', explanation: 'No input needs to advance for the join to catch up from 6 to 8. Paid orders is now complete before 8. Time 8 remains open. The solid and dashed markers meet, so this processing gap closes.' },
    { title: 'Permission is not completed processing', target: 'payments', action: { type: 'frontier', lane: 'payments', to: 14 }, before: 'Payments will advance from 8 to 14. Orders is 16. We will not process the join yet. Where will the dashed and solid output markers be?', explanation: 'Inputs now permit a frontier up to 14. The join remains at 8. Advancing a source permits more downstream completion but does not make the maintained computation catch up instantly.' },
    { title: 'The join makes partial progress', target: 'join', action: { type: 'frontier', lane: 'join', to: 10 }, before: 'The join processes part of its available work, reaching frontier 10. Is time 10 complete? Has it caught up to its inputs?', explanation: 'Times below 10 are complete; time 10 remains open. Inputs still permit 14. The gap from 10 to 14 represents processing still needed. It is logical-time distance, not a measured number of pending rows.' },
    { title: 'Catch up, then wait for input', target: 'join', action: { type: 'frontier', lane: 'join', to: 14 }, before: 'The remaining permitted work is processed. Can extra processing alone then move the join frontier beyond 14?', explanation: 'The join reaches 14 and catches up to its input limit. Processing alone cannot establish completion beyond Payments at 14. This does not forbid individual output changes at open times; it limits the completeness guarantee.' },
    { title: 'The limiting input can change', target: 'payments', action: { type: 'frontier', lane: 'payments', to: 18 }, before: 'Payments advances from 14 to 18 while Orders stays 16. Which input will now limit progress? Does the join move automatically?', explanation: 'Orders at 16 is now the limiting input. The dashed marker moves to 16, while Paid orders remains 14. The limiting dependency can change as sources advance at different rates.' },
    { title: 'A tie still constrains progress', target: 'orders', action: { type: 'frontier', lane: 'orders', to: 18 }, before: 'Orders now reaches 18. Which input is limiting when both are at 18?', explanation: 'Both inputs tie at 18. Both must eventually move beyond 18 to permit a frontier beyond 18. The join is still at 14 until it processes the available work.' },
    { title: 'Actual progress follows processing', target: 'join', action: { type: 'frontier', lane: 'join', to: 18 }, explanation: 'Processing advances Paid orders to 18. Always distinguish two questions: how far do inputs permit completion, and how far has this object actually completed? The solid marker answers the second question.' },
  ]),
  lecture('Find where delay starts', 'Trace delay through sources, computation, and queries.', diagnosisFixtures.source, [
    { title: 'Introduce the simulated wall clock', target: 'axis', action: explain, showLimit: true, explanation: 'Step 1 starts with a stalled-source incident. Logical timestamps are aligned to a simulated clock in seconds. Orders is at 18; Payments, Paid orders and Revenue are at 8. Each later step opens a separate incident with fresh values.' },
    { title: 'Read the lag legend', target: 'detail', action: explain, explanation: 'Revenue is 20 − 8 = 12 seconds behind the clock. Both maintained stages have caught up to Payments, so this delay comes from the source. The bottom legend always shows Revenue’s source, inherited, local, global and wall-clock lag in seconds. Global is inherited plus local; wall-clock is source plus global. Key explains each label.' },
    { caseStudy: { label: 'Step 1 · Stalled source', transition: 'Separate incident; fresh starting values. No frontier moved backward.' }, title: 'New incident: a stalled source', target: 'payments', action: explain, before: 'In this starting incident, Payments is at 8 while Orders is at 18. Both maintained stages are at 8. Compare source status and repeated progress samples: where does the delay begin?', explanation: 'Payments stays at 8 and reports stalled status while Orders advances. Both maintained stages have caught up to 8. This evidence points to Payments ingestion. A fast 70 ms query cannot repair missing input progress.' },
    { caseStudy: { label: 'Step 2 · Computation delay', transition: 'Separate incident; fresh starting values. Compare stages within this case.' }, title: 'New incident: maintained computation', target: 'join', action: { type: 'fixture', snapshot: diagnosisFixtures.compute }, before: 'Another independent incident: inspect whether inputs progress while the maintained result and backlog change. What evidence would distinguish source delay from computation delay?', explanation: 'Both sources advance to 18, but Paid orders stays at 12 and its illustrative backlog grows from 40 to 90 changes. Revenue inherits the delay. Investigate Paid orders computation and resources; this evidence alone does not prove a specific CPU or memory cause.' },
    { caseStudy: { label: 'Step 3 · Slow query', transition: 'Separate incident; fresh starting values. Data is current at request start.' }, title: 'New incident: current data, slow query', target: 'detail', action: { type: 'fixture', snapshot: diagnosisFixtures.serving }, before: 'In the next incident, every maintained stage has completed the request’s target time. The request still takes three seconds. Which part should you investigate?', explanation: 'All frontiers are 20, so target time 19 is complete at request start. The query takes 3 seconds. Investigate retrieval or serving. The returned snapshot need not include changes arriving after its chosen target.' },
    { caseStudy: { label: 'Step 4 · Reaction time', transition: 'Separate timing example: follow one update from occurrence to response.' }, title: 'An update’s full reaction time', target: 'detail', action: { type: 'fixture', snapshot: fixture(20, 20, 20, { showRevenue: true, clock: 20, journey: { changed: 0, ready: 4, requested: 4, returned: 7 }, evidence: 'Separate timing example · An update occurs at 0 s. Its result is ready at 4 s; a query starts then and returns at 7 s.' }) }, before: 'An update occurs at 0 s, its result becomes available at 4 s, and a query starts then and returns at 7 s. Separate freshness delay from query latency.', explanation: 'Freshness delay is 4 seconds; query latency is 3 seconds. In this explicitly sequenced example, reaction time is 7 seconds. A fast query can return stale data; a slow query can return a snapshot whose target was already complete.' },
    { title: 'Use evidence to choose an investigation', target: 'detail', action: explain, explanation: 'Check source progress and status first, then where maintained stages fall behind their inputs, then request duration. A stale downstream result can inherit delay. A slow request is a separate symptom. Use evidence rather than the dashboard’s appearance to choose a stage.' },
  ], { label: 'Step 1 · Stalled source', transition: 'Four independent examples. Next opens a separate incident with fresh values.' }),
];
