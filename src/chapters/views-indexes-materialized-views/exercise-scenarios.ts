import type { ExerciseGrade } from '../../hooks/useExerciseStages';
import { makeSnapshot, updatedOrders, type ObjectSnapshot } from './simulation';
import { objectSql, stackedSql } from './scenario';

interface Choice { readonly id: string; readonly label: string; readonly misconception: string }
export interface ObjectCheckpoint {
  readonly title: string; readonly question: string; readonly hint: string;
  readonly choices: readonly Choice[]; readonly solution: readonly string[];
  readonly explanation: string; readonly before: ObjectSnapshot; readonly after: ObjectSnapshot;
}
interface ObjectExercise { readonly title: string; readonly sql: string; readonly checkpoints: readonly ObjectCheckpoint[] }
const choice = (id: string, label: string, misconception = ''): Choice => ({ id, label, misconception });
const view = makeSnapshot({ view: true });
const indexed = makeSnapshot({ view: true, viewIndexes: ['a'] });
const materialized = makeSnapshot({ materialized: true });
const intermediates = makeSnapshot({ stacked: true });
const shared = makeSnapshot({ stacked: true, materialized: true });
const complete = makeSnapshot({ ...shared.setup, materializedIndexes: ['a', 'b'] });

export const objectExercises: readonly ObjectExercise[] = [
  { title: 'Choose and inspect objects', sql: objectSql, checkpoints: [
    { title: 'Save a definition', question: 'You need reusable regional-revenue SQL, without maintaining its result. Select the one object that meets this requirement.', hint: 'Decide whether the requirement asks you to store SQL or maintained result rows.',
      choices: [choice('view', 'Regular view'), choice('index', 'Index', 'An index adds maintained full results in cluster memory.'), choice('mv', 'Materialized view', 'A materialized view adds maintained durable output.')], solution: ['view'],
      explanation: 'A regular view saves the SQL definition without executing or maintaining its result. An index and a materialized view add maintained state that this requirement does not ask for.', before: makeSnapshot(), after: view },
    { title: 'Serve one cluster', question: 'A repeatedly queries revenue_v and needs its result maintained in local memory. Select every correct statement.', hint: 'Think about both the contents of an index and the boundary of its owning cluster.',
      choices: [choice('add', 'Add an index in A'), choice('full', 'The index stores the full result'), choice('remote', 'B can use A’s index', 'Index memory is local to the cluster that maintains it.'), choice('keys', 'Only region keys are stored', 'Materialize indexes contain complete result rows, not only keys and row pointers.')], solution: ['add', 'full'],
      explanation: 'An index on revenue_v in A maintains all result columns in A’s memory. B cannot access A’s index.', before: view, after: indexed },
    { title: 'Remove an index', question: 'New fixture: revenue_mv has an index in A. Drop revenue_mv_a. Select every statement that will be true.', hint: 'Which object does DROP INDEX name? Distinguish local memory from durable output.',
      choices: [choice('removed', 'The local index is removed'), choice('durable', 'The durable result remains'), choice('query', 'A can still query revenue_mv'), choice('deleted', 'The materialized view is deleted', 'Removing an index does not remove its underlying materialized view.')], solution: ['removed', 'durable', 'query'],
      explanation: 'Only the index is removed. revenue_mv and its durable output remain. A can still read that maintained output from storage.',
      before: makeSnapshot({ materialized: true, materializedIndexes: ['a'] }), after: makeSnapshot(materialized.setup, undefined, { object: 'revenue_mv', cluster: 'a' }) },
    { title: 'Move a query', question: 'New fixture: revenue_v is indexed only in A. Query it from B. Select the correct access path.', hint: 'A shared SQL definition and cluster-local index memory have different scopes.',
      choices: [choice('compute', 'B computes the saved view query'), choice('remote', 'B reads A’s index', 'A’s index is inaccessible from B.'), choice('missing', 'The view is inaccessible in B', 'Regular view definitions can be referenced across clusters.'), choice('wrong', 'B must return a different answer', 'A different access path need not change the SQL result.')], solution: ['compute'],
      explanation: 'B can reference the saved definition, but not A’s index. It computes the view query and returns the same North $150 / South $80 result.', before: indexed, after: makeSnapshot(indexed.setup, undefined, { object: 'revenue_v', cluster: 'b' }) },
  ] },
  { title: 'Design shared serving', sql: stackedSql, checkpoints: [
    { title: 'Keep intermediate views simple', question: 'order_base → order_enriched → revenue. Only final revenue is served. Select what the two intermediate stages need for this requirement.', hint: 'Which stages are independently queried? Saving their definitions can be sufficient.',
      choices: [choice('base', 'order_base as a regular view'), choice('enriched', 'order_enriched as a regular view'), choice('allmv', 'Materialize every stage', 'Separately maintaining every intermediate is unnecessary for this fixture.'), choice('allindex', 'Index every intermediate stage', 'These stages have no independent serving requirement.')], solution: ['base', 'enriched'],
      explanation: 'Use regular views for intermediate SQL definitions. The final maintained dataflow can still have intermediate state; this does not require separately materializing each definition.', before: makeSnapshot(), after: intermediates },
    { title: 'Maintain once, share output', question: 'Transform must maintain one final transformation for both A and B. Select the final object that provides shared maintained output.', hint: 'Which object persists results that can be read from different clusters?',
      choices: [choice('mv', 'Final materialized view in Transform'), choice('view', 'Final regular view alone', 'A definition alone does not maintain the output.'), choice('indexa', 'Index the final view only in A', 'A’s index is not a shared result that B can read.')], solution: ['mv'],
      explanation: 'A final materialized view in Transform maintains durable output accessible from both serving clusters. Intermediate views remain SQL building blocks.', before: intermediates, after: shared },
    { title: 'Serve from both memories', question: 'A and B must each serve the shared result from their own memory. Select every index needed.', hint: 'Each serving cluster needs local access to the same already-maintained output.',
      choices: [choice('a', 'Index revenue_mv in A'), choice('b', 'Index revenue_mv in B'), choice('remote', 'Share A’s index with B', 'Indexes are local, so B needs its own.'), choice('duplicate', 'Maintain two separate aggregations', 'The stated requirement asks Transform to maintain the original transformation once.')], solution: ['a', 'b'],
      explanation: 'Create one index on revenue_mv in each serving cluster. Both indexes maintain local access to the same durable result without repeating the original aggregate.', before: shared, after: complete },
    { title: 'Complete architecture', question: 'New fixture: two SQL-only intermediates; final maintenance in Transform; memory serving in A and B. Correct order 1 to $120. Select every required object.', hint: 'Separate SQL definitions, final durable maintenance, and each cluster’s local serving state.',
      choices: [choice('intermediate', 'Regular intermediates'), choice('final', 'Final materialized view'), choice('a', 'Index revenue_mv in A'), choice('b', 'Index revenue_mv in B'), choice('all', 'Materialize each stage', 'The intermediate stages only organize SQL in this requirement.'), choice('remote', 'Use A’s index from B', 'Each serving cluster needs its own index.'), choice('sql', 'Save final SQL only', 'A saved definition alone neither maintains durable output nor creates local memory results.')], solution: ['intermediate', 'final', 'a', 'b'],
      explanation: 'Regular intermediate views → final materialized view in Transform → indexes in A and B. At $120 for order 1, all three results are North $170 / South $80.',
      before: makeSnapshot(), after: makeSnapshot(complete.setup, updatedOrders, { object: 'revenue_mv', cluster: 'b' }) },
  ] },
];

export function gradeObjectPrediction(checkpoint: ObjectCheckpoint, selections: readonly string[]): ExerciseGrade {
  const selected = new Set(selections);
  const extra = [...selected].filter(id => !checkpoint.solution.includes(id));
  const missing = checkpoint.solution.filter(id => !selected.has(id));
  const correct = extra.length === 0 && missing.length === 0;
  const explanation = correct ? checkpoint.explanation : selected.size === 0 ? 'Choose an answer before checking. Use the diagram and Hint to distinguish saved SQL, local memory and durable output.'
    : extra.length ? (checkpoint.choices.find(item => item.id === extra[0])?.misconception || 'This selection does not meet the stated requirement.') + (missing.length ? ' A required choice is also missing.' : '')
    : 'At least one required choice is missing. Check every part of the requirement: definitions, maintained output and local serving state.';
  return { correct, title: [correct ? 'Correct prediction' : 'Recheck the object requirements'], explanation: [explanation], errors: correct ? {} : { choices: explanation } };
}
