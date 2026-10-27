import { parseExerciseInteger, type ExerciseGrade } from '../../hooks/useExerciseStages';
import { applySubscription, applySubscriptions, createSubscription, data, deliveryAt, duplicateStart, eu100, eu130, progress, receive, snapshotOff, type SubscriptionState } from './simulation';
import { subscriptionText } from './lessonText';

export interface SubscriptionChoice { readonly id: string; readonly label: string }
export interface SubscriptionAnswerGroup {
  readonly id: string;
  readonly label: string;
  readonly kind: 'single' | 'integer';
  readonly choices?: readonly SubscriptionChoice[];
  readonly wide?: boolean;
  readonly solution: string;
}
export type SubscriptionPrediction = Readonly<Record<string, string>>;
export interface SubscriptionQuestion {
  readonly title: string;
  readonly prompt: string;
  readonly hint: string;
  readonly explanation: string;
  readonly actionLabel: string;
  readonly before: SubscriptionState;
  readonly after: SubscriptionState;
  readonly groups: readonly SubscriptionAnswerGroup[];
}
export interface SubscriptionExercise {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly questions: readonly SubscriptionQuestion[];
}
const choice = (id: string, label: string): SubscriptionChoice => ({ id, label });
const single = (id: string, label: string, choices: readonly SubscriptionChoice[], solution: string, wide = false): SubscriptionAnswerGroup => ({ id, label, kind: 'single', choices, solution, wide });
const integer = (id: string, label: string, solution: number): SubscriptionAnswerGroup => ({ id, label, kind: 'integer', solution: String(solution) });
const yesNo = [choice('yes', 'Yes'), choice('no', 'No')];
const visibleRows = [choice('baseline', 'EU (2, 100) · US (1, 50)'), choice('replacement', 'EU (2, 130) · US (1, 50)'), choice('eu-only', 'EU (2, 130) only'), choice('empty', 'Ready with no rows'), choice('both-eu', 'EU 100 + EU 130 · US 50'), choice('zero-us', 'EU 130 · US 0')];
const rows = (solution: string, id = 'rows', label = 'Published result') => single(id, label, visibleRows, solution, true);
function question(title: string, prompt: string, hint: string, explanation: string, before: SubscriptionState, after: SubscriptionState, actionLabel: string, groups: readonly SubscriptionAnswerGroup[]): SubscriptionQuestion {
  return { title, prompt, hint, explanation, before, after, actionLabel, groups };
}
const reverse = applySubscriptions(deliveryAt(4), [data(12, 1, eu130), data(12, -1, eu100), progress(13)].map(receive));
const copies = duplicateStart();
const disconnected = applySubscription(deliveryAt(12), { type: 'disconnect' });

export const subscriptionExercises: readonly SubscriptionExercise[] = [
  { slug: 'exercise-1', title: 'Bootstrap the live table', description: 'Build the starting result and choose a valid client initialization strategy.', questions: [
    question('Choose the baseline', 'An empty client needs every current region, including regions that never change. Which snapshot setting should it use?', 'Changes alone do not describe unchanged rows that already exist.', 'Use the default initial snapshot. It supplies the starting relation before later result changes. A separate baseline requires a coordinated handoff.', createSubscription(), deliveryAt(1), 'Start the subscription', [single('snapshot', 'Snapshot setting', [choice('on', 'SNAPSHOT true'), choice('off', 'SNAPSHOT false')], 'on')]),
    question('One row is not the whole snapshot', 'Receive P(10) and the first snapshot row at 10. Is the application ready with the complete starting result?', 'Compare the snapshot timestamp with the strict progress boundary.', 'No. Timestamp 10 is equal to the boundary, so its snapshot remains open. Keep the application loading rather than calling a partial snapshot complete.', deliveryAt(1), deliveryAt(2), 'Receive the first snapshot row', [single('ready', 'Ready to display a complete result?', yesNo, 'no')]),
    question('Release the initial snapshot', 'P(11) will arrive next. Choose the complete published result after applying it.', 'Only changes strictly before 11 can be flushed. Both snapshot rows are at 10.', 'Publish the two snapshot rows together: EU (2, 100) and US (1, 50), each with multiplicity 1. The application is now ready.', deliveryAt(3), deliveryAt(4), 'Receive P(11)', [rows('baseline')]),
    question('The missing unchanged region', 'Restart empty with SNAPSHOT false and receive only the EU replacement. Can this client reconstruct the entire current result? Which unchanged region never arrives?', 'The stream omits the starting relation. The US row does not change in this interval.', 'It cannot reconstruct the result. US is absent from the delivery, and the EU retraction refers to an unseen old row. The display must report a missing baseline.', createSubscription(false), snapshotOff(), 'Replay without the initial snapshot', [single('complete', 'Complete client baseline?', yesNo, 'no'), single('missing', 'Unchanged region omitted', [choice('EU', 'EU'), choice('US', 'US')], 'US')]),
  ] },
  { slug: 'exercise-2', title: 'Repair the consumer', description: 'Repair signed full-row updates, aggregate replacement, and duplicate-row handling.', questions: [
    question('Choose a state-update rule', 'The client appends every received record. Which replacement rule correctly maintains a local relation?', 'A negative diff removes copies of a full result row.', 'Consolidate signed multiplicities by the entire row. Appending messages, subtracting currency, and blindly overwriting by region each lose the result semantics.', deliveryAt(4), deliveryAt(5), 'Inspect the first EU retraction', [single('rule', 'Consumer rule', [choice('signed', 'Sum signed full-row copies'), choice('append', 'Append as new order events'), choice('region', 'Overwrite/delete by region')], 'signed', true)]),
    question('Replace the aggregate', 'The replacement records are received. P(13) arrives next. Choose the published result after that progress message.', 'Retract the old full row, add the new full row, and leave US alone.', 'EU (2, 100) loses its only copy; EU (2, 130) gains one. The result has one EU aggregate, not both versions or their sum.', deliveryAt(7), deliveryAt(8), 'Receive P(13)', [rows('replacement')]),
    question('Reverse the arrival order', 'A named replay receives the new EU row first, the old retraction second, then P(13). Does the final result differ?', 'Within one complete timestamp, signed full-row changes consolidate to the same sum.', 'The result is unchanged. Region-only overwrite/delete logic can erase the new row when the old retraction arrives later; full-row identity avoids this bug.', deliveryAt(4), reverse, 'Replay the replacement in the other valid order', [rows('replacement'), single('different', 'Does valid within-time order change the result?', yesNo, 'no')]),
    question('Remove the last group', 'The only US order is canceled at 15. After P(16), what should the grouped result contain?', 'This GROUP BY produces no group when its final input order disappears.', 'Remove the US aggregate entirely. A (US, 0, 0) row would be invented by the consumer, not emitted by this query.', deliveryAt(10), deliveryAt(11), 'Receive P(16)', [rows('eu-only')]),
    question('Copies in a separate relation', 'In the separate row_copies fixture, the baseline has +2 identical rows. A −1 change is completed by P(13). How many copies remain?', 'Count copies of the identical full tuple, not messages or region keys.', 'Two copies minus one copy leaves one. This named relation allows duplicates; it is distinct from the grouped order summary.', copies, applySubscriptions(copies, [data(12, -1, eu100), progress(13)].map(receive)), 'Remove one of two copies', [integer('copies', 'Remaining copies', 1)]),
  ] },
  { slug: 'exercise-3', title: 'Keep the dashboard correct', description: 'Publish complete times through partial delivery, quiet progress, cancellation, and disconnect.', questions: [
    question('Initialize the dashboard', 'Both authored snapshot rows have arrived at 10. P(11) is next. Choose the result and the publication boundary after it arrives.', 'Do not infer completion from seeing two rows; use the progress record.', 'P(11) proves the snapshot at 10 complete. Publish EU 100 and US 50 together, with published-before boundary 11.', deliveryAt(3), deliveryAt(4), 'Receive P(11)', [rows('baseline'), integer('published', 'Published before', 11)]),
    question('Do not expose the partial update', 'The old EU aggregate will be retracted at 12. Choose what the application should show immediately after receiving that record.', 'A pending retraction is not yet a complete change to publish.', 'Keep EU 100 and US 50 visible. The retraction is buffered at the open timestamp 12.', deliveryAt(4), deliveryAt(5), 'Receive the t = 12 retraction', [rows('baseline')]),
    question('Test boundary equality', 'P(12) will arrive next. Does it permit publishing changes at timestamp 12?', 'A progress boundary completes times strictly less than its timestamp.', 'No. Equality remains open. It is safe to advance the published-before boundary to 12 while leaving the changes at 12 pending.', deliveryAt(5), deliveryAt(6), 'Receive P(12)', [single('release', 'Publish timestamp 12?', yesNo, 'no'), rows('baseline')]),
    question('An apparent pair is not proof', 'The +1 EU replacement is next. Both authored rows will then be received. Is that alone enough to prove timestamp 12 complete?', 'The client does not know how many rows a real timestamp will contain.', 'No. A replacement-looking pair, completed FETCH, or pause is not a completeness signal. Keep the published baseline until later timestamp evidence arrives.', deliveryAt(6), deliveryAt(7), 'Receive the t = 12 replacement', [single('complete', 'Proven complete?', yesNo, 'no')]),
    question('Publish and advance through quiet time', 'Receive P(13), then P(14) with no new data. Choose the final visible rows and published-before boundary.', 'The first marker releases 12. The second changes evidence, not business totals.', 'P(13) publishes the EU replacement. P(14) leaves the same rows visible and advances the publication boundary to 14.', deliveryAt(7), deliveryAt(9), 'Receive P(13), then quiet P(14)', [rows('replacement'), integer('published', 'Published before', 14)]),
    question('Separate receipt, knowledge, and flushing', 'Receive the US retraction at 15, then P(16). Just after the data row, what is known complete and what has this progress-only client published through? Choose the result after P(16).', 'A later data timestamp is evidence for older times; this client still flushes only on progress.', 'The data row proves times below 15 complete, but the client still has published-before 14. P(16) then flushes the US removal, leaving only EU 130.', deliveryAt(9), deliveryAt(11), 'Receive data at 15, then P(16)', [integer('known', 'Known complete before (after data)', 15), integer('published', 'Published before (after data)', 14), rows('eu-only', 'rows', 'Result after P(16)')]),
    question('Distinguish stale from ready empty', 'Retract EU at 18, then disconnect before P(19). What remains visible? Compare with a separate uninterrupted run that receives P(19).', 'A disconnect supplies no new completion evidence. An empty complete result needs its own proof.', 'The disconnected display retains EU 130 but is stale, with the final retraction pending. In the separate uninterrupted run P(19) completes that retraction and a ready empty result is correct.', deliveryAt(11), disconnected, 'Receive t = 18, then disconnect', [single('disconnect', 'Disconnected display', [choice('stale', 'EU 130 retained · stale'), choice('empty', 'Ready and empty')], 'stale'), single('uninterrupted', 'Uninterrupted after P(19)', [choice('empty', 'Ready and empty'), choice('stale', 'EU 130 still pending')], 'empty')]),
  ] },
];

export const solutionFor = (question: SubscriptionQuestion): SubscriptionPrediction => Object.fromEntries(question.groups.map(group => [group.id, group.solution]));
export function gradeSubscription(question: SubscriptionQuestion, prediction: SubscriptionPrediction): ExerciseGrade {
  const errors: Record<string, string> = {};
  for (const group of question.groups) {
    const actual = prediction[group.id] ?? '';
    const correct = group.kind === 'integer' ? parseExerciseInteger(actual) === Number(group.solution) : actual === group.solution;
    if (!correct) errors[group.id] = `Recheck ${group.label.toLowerCase()}.`;
  }
  const correct = Object.keys(errors).length === 0;
  return { correct, title: [correct ? 'Correct prediction' : 'Check the result and its evidence'], explanation: subscriptionText(correct ? question.explanation : `${question.hint} Your entries are preserved.`), errors };
}
