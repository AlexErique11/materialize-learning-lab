import { applySubscriptions, canonicalRecords, createSubscription, data, deliveryAt, duplicateStart, eu100, eu130, progress, receive, snapshotOff, type SubscriptionAction, type SubscriptionState } from './simulation';

export type SubscriptionTarget = 'subscription' | 'trays' | 'boundary' | 'application';
export interface SubscriptionLesson {
  readonly title: string;
  readonly target: SubscriptionTarget;
  readonly explanation: string;
  readonly before?: string;
  readonly actions: readonly SubscriptionAction[];
  readonly state: SubscriptionState;
}
export interface SubscriptionLecture {
  readonly title: string;
  readonly description: string;
  readonly initial: SubscriptionState;
  readonly lessons: readonly SubscriptionLesson[];
}
type LessonSpec = Omit<SubscriptionLesson, 'state' | 'actions'> & { readonly actions?: readonly SubscriptionAction[] };
function lecture(title: string, description: string, initial: SubscriptionState, specs: readonly LessonSpec[]): SubscriptionLecture {
  let state = initial;
  const lessons = specs.map(spec => {
    const actions = spec.actions ?? [{ type: 'observe' } as const];
    state = applySubscriptions(state, actions);
    return { ...spec, actions, state };
  });
  return { title, description, initial, lessons };
}
export function subscriptionFrames(lecture: SubscriptionLecture) {
  return lecture.lessons.flatMap((lesson, index) => lesson.actions.some(action => action.type !== 'observe') ? [{ time: index + 1, lesson }] : []);
}
const records = (from: number, to: number) => canonicalRecords.slice(from, to).map(receive);
const fixture = (state: SubscriptionState): SubscriptionAction => ({ type: 'fixture', state });

export const subscriptionLectures: readonly SubscriptionLecture[] = [
  lecture('Start with a snapshot', 'Build a client baseline, then follow a continuing stream of result changes.', createSubscription(), [
    { title: 'One result or a continuing result?', target: 'subscription', explanation: 'A SELECT returns a result at one moment. An EU total of 100 stays 100 in your application until you query again or apply updates. SUBSCRIBE supplies a continuing stream of result changes. The client consumes those records and publishes complete groups by updating its visible table.' },
    { title: 'The starting progress message', target: 'boundary', before: 'P(10) means a progress record at timestamp 10. Does this first record mean the snapshot at 10 is complete?', actions: records(0, 1), explanation: 'P(10) has mz_timestamp = 10 and mz_progressed = true. It establishes the starting boundary and completes only times below 10, so the snapshot at 10 is still open. Ignore its other fields; they are not a business-row change.' },
    { title: 'Receive part of the snapshot', target: 'trays', before: 'One snapshot row arrives. Can the application claim it has the whole starting result?', actions: records(1, 2), explanation: 'The EU row is part of the starting snapshot. Keep it pending while the application is loading. Its output timestamp is the subscription start, not the original insertion time of every underlying order.' },
    { title: 'Two rows are not a completion signal', target: 'trays', actions: records(2, 3), explanation: 'The US snapshot row arrives at the same timestamp. Our fixture contains two rows, but a real client does not know the final row count. Both rows stay pending until completion evidence advances.' },
    { title: 'Publish the starting baseline', target: 'application', before: 'Now P(11) arrives. Which timestamp group can move into the application?', actions: records(3, 4), explanation: 'Timestamp 10 is strictly below 11. Publish both snapshot rows together: EU has 2 orders totaling 100; US has 1 totaling 50. The application is ready, and its published boundary is 11.' },
    { title: 'Continue after the snapshot', target: 'trays', before: 'The old EU aggregate is retracted at timestamp 12. Does the live display immediately lose its EU row?', actions: records(4, 5), explanation: 'The connection continues after initialization. The retraction waits in the open timestamp 12 tray; this application keeps its previously published EU total visible until that group is complete.' },
    { title: 'A fresh client without a snapshot', target: 'subscription', before: 'Compare a fresh, empty client using SNAPSHOT false. Can later EU changes reconstruct the unchanged US row?', actions: [fixture(snapshotOff())], explanation: 'No. SNAPSHOT false omits the initial snapshot. The unchanged US row never arrives, and an old-row retraction can refer to state the client never received. This client has no complete baseline. A separate SELECT needs a coordinated handoff with the stream so changes are neither missed nor applied twice.' },
  ]),
  lecture('Turn changes into client state', 'Apply full-row retractions, replacements, and multiplicities to a live result.', deliveryAt(4), [
    { title: 'An aggregate changes as a full row', target: 'application', explanation: 'The published result begins with EU (2 orders, total 100) and US (1 order, total 50). A correction to one EU order will change the aggregate to (EU, 2, 130). The old and new complete rows have different identities.' },
    { title: 'Retract the old aggregate', target: 'trays', before: 'Does −1 mean subtract one currency unit from the EU total?', actions: records(4, 5), explanation: 'No. The diff −1 retracts one copy of the full row (EU, 2, 100). It does not subtract 1 from a cell and it is not an append-only order event.' },
    { title: 'Receive the replacement', target: 'trays', actions: records(5, 7), explanation: 'The +1 record adds one copy of (EU, 2, 130). P(12) does not close timestamp 12, and seeing an apparent pair does not prove completeness. Keep both signed full rows in the pending tray.' },
    { title: 'Apply the complete replacement', target: 'application', before: 'At P(13), should the application show both EU versions, add their totals, or replace the old row?', actions: records(7, 8), explanation: 'Apply both signed changes at the complete timestamp: remove (EU, 2, 100), add (EU, 2, 130). The published result contains exactly one EU aggregate and the unchanged US row.' },
    { title: 'A different valid arrival order', target: 'trays', before: 'In this named replay the +1 arrives before the −1. Will the final complete result change?', actions: [fixture(applySubscriptions(deliveryAt(4), [data(12, 1, eu130), data(12, -1, eu100), progress(13)].map(receive)))], explanation: 'The complete sum is unchanged. A region-only consumer that overwrites with the new row and then deletes EU for the old retraction can lose the replacement. Consolidate by the full result tuple instead.' },
    { title: 'The final order in a group disappears', target: 'application', before: 'Cancel the only US order and finish its timestamp. Is the US result a zero row or no row?', actions: [fixture(deliveryAt(11))], explanation: 'The grouped query no longer has a US group. Retract its last aggregate row and remove it from the client. Do not invent a (US, 0, 0) row that this SQL did not produce.' },
    { title: 'Count copies rather than messages', target: 'trays', before: 'Switch to the separate row_copies example. Starting with 2 identical rows, a complete −1 change leaves how many copies?', actions: [fixture(applySubscriptions(duplicateStart(), [data(12, -1, eu100), progress(13)].map(receive)))], explanation: 'One copy remains. This separate relation can contain duplicate rows; the grouped order query has only one row per region. Orders is a value inside each row. Copies counts identical full rows, not orders, distinct keys, or received messages.' },
  ]),
  lecture('Publish complete results', 'Use timestamp evidence to keep partial deliveries out of a published application.', deliveryAt(4), [
    { title: 'Hold a partial change', target: 'trays', before: 'The EU retraction arrives alone. Should a complete live display briefly lose EU?', actions: records(4, 5), explanation: 'Keep the retraction pending. Publishing each received row can expose an incomplete intermediate display. This application deliberately publishes only on explicit progress.' },
    { title: 'Equality stays open', target: 'boundary', before: 'Does P(12) complete the changes at timestamp 12?', actions: records(5, 6), explanation: 'P(12) completes times strictly below 12. Timestamp 12 is equal to the boundary and stays open. The published table still has EU 100 and US 50.' },
    { title: 'Both rows have arrived', target: 'trays', before: 'Now the replacement arrives. Is the apparent pair enough evidence to publish timestamp 12?', actions: records(6, 7), explanation: 'No. A timestamp can contain more changes than the two rows in this authored pair. A FETCH batch ending, a timeout, or a pause in delivery is not a logical completeness boundary.' },
    { title: 'Progress releases the tray', target: 'application', before: 'P(13) arrives. Which pending group can the application publish?', actions: records(7, 8), explanation: 'Timestamp 12 is strictly below 13, so publish its consolidated changes together. The EU total becomes 130, US stays 50, and the published boundary advances to 13.' },
    { title: 'Progress without changed rows', target: 'boundary', before: 'P(14) arrives with no intervening data changes. Should the totals change?', actions: records(8, 9), explanation: 'No business row changes. Keep the same totals and advance the publication boundary to 14. Progress can communicate advancement through a quiet interval; it need not have a marker for every timestamp.' },
    { title: 'Silence supplies no new evidence', target: 'subscription', explanation: 'A connected socket alone does not prove the result is advancing. Silence can mean quiet data, a network delay, or a stall; it does not diagnose the cause. Even logical progress does not prove a particular upstream write has arrived.' },
    { title: 'A later data row is also evidence', target: 'boundary', before: 'In this replay, a data row at 15 follows the open timestamp 12 group, without P(13). Is 12 now known complete?', actions: [fixture(applySubscriptions(deliveryAt(7), [receive(canonicalRecords[9]!)]))], explanation: 'Yes. Output timestamps do not go backwards, so receiving data at 15 proves times below 15 complete. The timestamp 12 tray is complete but unpublished: this client still waits for explicit progress to update its display.' },
    { title: 'Separate knowledge from publication', target: 'application', actions: [receive(progress(16))], explanation: 'P(16) flushes both the complete EU replacement and the US removal. A different client could have flushed older complete groups earlier using later-data evidence; waiting for progress is an application policy.' },
    { title: 'Disconnect with changes pending', target: 'application', before: 'The last EU row is retracted at 18 and then the connection drops before P(19). Is an empty ready display justified?', actions: [receive(canonicalRecords[11]!), { type: 'disconnect' }], explanation: 'No. Keep the last published EU total 130 and boundary 16, mark the display disconnected and stale, and retain the pending retraction. Reconnecting alone does not guarantee durable replay or exactly-once effects.' },
    { title: 'A ready empty result is different', target: 'application', before: 'Compare an independent uninterrupted run that receives P(19). Is an empty table now correct?', actions: [fixture(deliveryAt(13))], explanation: 'Yes. The final retraction is complete and published. The application is ready with no groups. Empty, still loading, missing a baseline, and disconnected are different states even when some show no rows.' },
  ]),
];
