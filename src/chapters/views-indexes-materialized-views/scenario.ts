import { makeSnapshot, updatedOrders, type DiagramPanel, type ObjectSnapshot } from './simulation';
import { objectDocumentationLinks } from './resources';
import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';

// Explicit references share field colors with the graph; ordinary prose stays neutral.
function ref(column: 'orderId' | 'region' | 'amount' | 'view' | 'materialized' | 'index' | 'cluster', text: string) {
  return { kind: 'term', column, text } as const;
}
const revenueQuery: LessonTextContent = ['SELECT ', ref('region', 'region'), ', SUM(', ref('amount', 'amount'), ') AS ', ref('amount', 'revenue'), '\nFROM ', ref('view', 'orders'), ' GROUP BY ', ref('region', 'region')];
export const revenueSql = revenueQuery.map(part => typeof part === 'string' ? part : part.text).join('');
export const documentationLinks = objectDocumentationLinks.map(({ title, href }) => ({ label: title, href }));
const inputSql = `-- Run each lecture's script independently in a fresh schema.
-- Referenced clusters must already exist, with permission to create objects.
-- Diagram names: Transform = transform; A = serving_a; B = serving_b.
CREATE TABLE orders (order_id INT, region TEXT, amount INT);
INSERT INTO orders VALUES (1, 'North', 100), (2, 'North', 50), (3, 'South', 80);`;
const localViewSql = `${inputSql}\n\n-- Save a definition, then query it without an index.\nCREATE VIEW revenue_v AS\n${revenueSql};\nSET CLUSTER = serving_a;\nSELECT * FROM revenue_v;\n-- Maintain the full result locally.\nCREATE INDEX revenue_v_a IN CLUSTER serving_a ON revenue_v (region);\nUPDATE orders SET amount = 120 WHERE order_id = 1;\nSELECT * FROM revenue_v;`;
export const objectSql = `${inputSql}

-- Build the starting diagram: a view index in A and durable output in Transform.
CREATE VIEW revenue_v AS
${revenueSql};
CREATE INDEX revenue_v_a IN CLUSTER serving_a ON revenue_v (region);
CREATE MATERIALIZED VIEW revenue_mv IN CLUSTER transform AS
${revenueSql};

-- Same regular view, different access paths.
SET CLUSTER = serving_a;
SELECT * FROM revenue_v;
SET CLUSTER = serving_b;
SELECT * FROM revenue_v;

-- B reads durable output, then its own index, then durable output again.
SELECT * FROM revenue_mv;
CREATE INDEX revenue_mv_b IN CLUSTER serving_b ON revenue_mv (region);
SELECT * FROM revenue_mv;
DROP INDEX revenue_mv_b;
SELECT * FROM revenue_mv;`;
export const stackedRevenueSql = 'SELECT region, SUM(amount) AS revenue FROM order_enriched GROUP BY region';
export const stackedSql = `${inputSql}

CREATE VIEW order_base AS SELECT order_id, region, amount FROM orders;
CREATE VIEW order_enriched AS SELECT * FROM order_base WHERE amount >= 0;
CREATE VIEW revenue_v AS ${stackedRevenueSql};

-- First design: maintain the final regular view in A only.
CREATE INDEX revenue_v_a IN CLUSTER serving_a ON revenue_v (region);
SET CLUSTER = serving_a;
SELECT * FROM revenue_v ORDER BY region;

-- Switch to the separate transform/serving design shown next.
-- Remove the first design's index; revenue_v remains a definition.
DROP INDEX revenue_v_a;
-- This creates a new object; it does not convert revenue_v.
CREATE MATERIALIZED VIEW revenue_mv IN CLUSTER transform AS
${stackedRevenueSql};
CREATE INDEX revenue_mv_a IN CLUSTER serving_a ON revenue_mv (region);
SELECT * FROM revenue_mv ORDER BY region;
CREATE INDEX revenue_mv_b IN CLUSTER serving_b ON revenue_mv (region);
SET CLUSTER = serving_b;
SELECT * FROM revenue_mv ORDER BY region;

-- Final completed maintenance step: North becomes 170, South stays 80.
UPDATE orders SET amount = 120 WHERE order_id = 1;
SELECT * FROM revenue_mv ORDER BY region;`;

export interface ObjectLesson {
  readonly title: string;
  readonly shortTitle: string;
  readonly target: DiagramPanel;
  readonly before: LessonTextContent;
  readonly explanation: LessonTextContent;
  readonly snapshot: ObjectSnapshot;
}
export interface ObjectLecture {
  readonly title: string;
  readonly description: string;
  readonly objective: string;
  readonly sql: string;
  readonly initial: ObjectSnapshot;
  readonly introductions: readonly { readonly title: string; readonly target: DiagramPanel; readonly explanation: LessonTextContent; readonly example?: LessonTextContent }[];
  readonly lessons: readonly ObjectLesson[];
  readonly showClusterB: boolean;
  readonly explore: boolean;
}
const view = makeSnapshot({ view: true });
const firstQuery = makeSnapshot({ view: true }, undefined, { object: 'revenue_v', cluster: 'a' });
const indexed = makeSnapshot({ view: true, viewIndexes: ['a'] });
const crossCluster = makeSnapshot({ view: true, viewIndexes: ['a'], materialized: true });

export const objectLectures: readonly ObjectLecture[] = [
  {
    title: 'Lecture 1', description: 'Save the query. Add an index. See what changes.',
    objective: 'Distinguish saved SQL, a past query result, and a full result maintained in cluster memory. Scenario steps are completed actions, not timestamps or processing-time measurements.',
    sql: localViewSql, initial: makeSnapshot(), showClusterB: false, explore: false,
    introductions: [
      { title: 'Start with orders and a question', target: 'input', explanation: ['The ', ref('view', 'orders'), ' table stores individual purchases. We want total ', ref('amount', 'revenue'), ' for each ', ref('region', 'region'), '. ', ref('region', 'North'), ' has two ', ref('view', 'orders'), ': ', ref('amount', '$100'), ' + ', ref('amount', '$50'), ' = ', ref('amount', '$150'), '. ', ref('region', 'South'), ' has one: ', ref('amount', '$80'), '. SQL describes how to turn the input rows into those totals.'], example: revenueQuery },
      { title: 'What is a regular view?', target: 'definitions', explanation: ['A ', ref('view', 'regular view'), ' gives a name to a SQL query so you can reuse it like a table. Here, ', ref('view', 'revenue_v'), ' means “total order ', ref('amount', 'amount'), ' for each ', ref('region', 'region'), '”. Creating the view saves that calculation’s instructions; it does not store the calculated ', ref('amount', 'revenue'), ' rows.'], example: ['CREATE VIEW ', ref('view', 'revenue_v'), ' AS\nSELECT ', ref('region', 'region'), ', SUM(', ref('amount', 'amount'), ') AS ', ref('amount', 'revenue'), '\nFROM ', ref('view', 'orders'), ' GROUP BY ', ref('region', 'region'), ';'] },
      { title: 'Using a view means running its query', target: 'a', explanation: ['SELECT asks for rows. Instead of writing the whole ', ref('amount', 'revenue'), ' calculation again, you can query ', ref('view', 'revenue_v'), '. Without an ', ref('index', 'index'), ', Materialize computes the saved query when asked. The returned answer is a snapshot for that query; it does not keep changing after you receive it.'], example: ['SELECT * FROM ', ref('view', 'revenue_v'), ';\n-- ', ref('region', 'North'), ': ', ref('amount', '$150'), '    ', ref('region', 'South'), ': ', ref('amount', '$80')] },
      { title: 'What is a cluster?', target: 'a', explanation: ['A cluster provides the computers and ', ref('cluster', 'memory'), ' that run queries and maintain results. The dashed ', ref('cluster', 'Cluster A'), ' box represents its own ', ref('cluster', 'memory'), '. An ', ref('index', 'index'), ' inside A belongs to A; a different cluster cannot borrow that ', ref('index', 'index'), '. “Local” means inside the cluster running the query.'] },
      { title: 'What is an index in Materialize?', target: 'a', explanation: ['An ', ref('index', 'index'), ' keeps the complete result of a view in a cluster’s ', ref('cluster', 'memory'), ', ready for queries. Materialize updates those rows as input changes arrive: this is what “maintain” means. For ', ref('view', 'revenue_v'), ', the ', ref('index', 'index'), ' holds ', ref('region', 'region'), ' AND ', ref('amount', 'revenue'), '. Next, we will create the view, query it, and add its ', ref('index', 'index'), '.'], example: ['Saved view = calculation instructions\n', ref('index', 'Index'), ' = result rows kept up to date in ', ref('cluster', 'memory')] },
      { title: 'What is the durable-output panel for?', target: 'durable', explanation: ['A ', ref('materialized', 'materialized view'), ' also keeps a query’s result up to date, but writes its output to ', ref('materialized', 'durable storage'), ' that different clusters can read. That is what this panel will show in Lecture 2. In this first lecture it stays empty: we are learning ', ref('view', 'regular views'), ' and local ', ref('index', 'indexes'), ' first.'], example: [ref('view', 'Regular view'), ' → saved SQL\n', ref('index', 'Index'), ' → maintained rows in local ', ref('cluster', 'memory'), '\n', ref('materialized', 'Materialized view'), ' → maintained rows in ', ref('materialized', 'durable storage')] },
    ],
    lessons: [
      { title: 'Save SQL without computing the result', shortTitle: 'Save SQL', target: 'definitions', before: ['CREATE VIEW saves ', ref('view', 'revenue_v'), '. Will ', ref('region', 'North'), ' = ', ref('amount', '$150'), ' appear as a maintained result?'], explanation: ['No. A ', ref('view', 'regular view'), ' saves the query definition. Creating it does not execute the query or maintain its result.'], snapshot: view },
      { title: 'Run the first query', shortTitle: 'Query', target: 'a', before: ['Query ', ref('view', 'revenue_v'), ' in ', ref('cluster', 'Cluster A'), '. There is no ', ref('index', 'index'), '. Where will its answer come from?'], explanation: [ref('cluster', 'Cluster A'), ' computes the saved query from its inputs. ', ref('region', 'North'), ' is ', ref('amount', '$150'), ' and ', ref('region', 'South'), ' is ', ref('amount', '$80'), '. This is a query observation, not a maintained result.'], snapshot: firstQuery },
      { title: 'Add a local index', shortTitle: 'Add index', target: 'a', before: ['Create an ', ref('index', 'index'), ' on ', ref('view', 'revenue_v'), ' in A. Does it store only ', ref('region', 'region'), ' keys, or the full result?'], explanation: ['The ', ref('index', 'index'), ' stores the full result in ', ref('cluster', 'Cluster A'), '’s ', ref('cluster', 'memory'), ', including ', ref('region', 'region'), ' and ', ref('amount', 'revenue'), '. It maintains that result as input changes arrive.'], snapshot: { ...indexed, query: firstQuery.query } },
      { title: 'Change input before the next query', shortTitle: 'Change input', target: 'a', before: [ref('orderId', 'Order 1'), ' changes from ', ref('amount', '$100'), ' to ', ref('amount', '$120'), '. Does the ', ref('index', 'index'), ' wait for the next query before ', ref('region', 'North'), ' becomes ', ref('amount', '$170'), '?'], explanation: ['No. After this completed simulated maintenance step, A’s ', ref('index', 'index'), ' contains ', ref('region', 'North'), ' = ', ref('amount', '$170'), '. The last query still shows its earlier observation of ', ref('amount', '$150'), '; it does not refresh itself.'], snapshot: { ...makeSnapshot(indexed.setup, updatedOrders), query: firstQuery.query } },
      { title: 'Read the maintained answer', shortTitle: 'Query again', target: 'a', before: ['Query ', ref('view', 'revenue_v'), ' again in A. Must the grouped ', ref('amount', 'revenue'), ' query be rebuilt from its input?'], explanation: ['This query reads the local maintained result: ', ref('region', 'North'), ' = ', ref('amount', '$170'), ' and ', ref('region', 'South'), ' = ', ref('amount', '$80'), '. No durable query output was created by the view or its ', ref('index', 'index'), '.'], snapshot: makeSnapshot(indexed.setup, updatedOrders, { object: 'revenue_v', cluster: 'a' }) },
    ],
  },
  {
    title: 'Lecture 2', description: 'Follow the query to the state its cluster can access.',
    objective: 'Trace local memory, fresh view computation, and durable-output reads across clusters. Compare the same completed input snapshot; real clusters can have different maintenance progress. Paths are conceptual, not physical plans or latency guarantees.',
    sql: objectSql, initial: crossCluster, showClusterB: true, explore: true,
    introductions: [
      { title: 'A definition and an index have different scopes', target: 'a', explanation: ['A ', ref('view', 'regular view'), ' saves a named query. Its definition can be used from different clusters. An ', ref('index', 'index'), ' keeps that query’s result in one cluster’s ', ref('cluster', 'memory'), '. This starting setup has ', ref('view', 'revenue_v'), ' indexed in A, but no local ', ref('index', 'index'), ' in B. We will compare how each cluster answers the same query.'] },
      { title: 'What is a materialized view?', target: 'transform', explanation: ['A ', ref('materialized', 'materialized view'), ' is a named query whose result Materialize computes and keeps up to date in ', ref('materialized', 'durable storage'), '. Unlike a ', ref('view', 'regular view'), ' alone, it maintains result rows. Here, a cluster named ', ref('cluster', 'Transform'), ' maintains ', ref('materialized', 'revenue_mv'), ': ', ref('region', 'North'), ' ', ref('amount', '$150'), ' and ', ref('region', 'South'), ' ', ref('amount', '$80'), '. Other clusters can read this shared output.'], example: [ref('view', 'Regular view'), ': saved query\n', ref('materialized', 'Materialized view'), ': saved query + maintained durable result'] },
      { title: 'Durable output and local memory', target: 'b', explanation: [ref('materialized', 'Durable storage'), ' holds the materialized result outside any serving cluster’s local ', ref('index', 'index'), ' ', ref('cluster', 'memory'), '. B can read ', ref('materialized', 'revenue_mv'), ' from storage even without an ', ref('index', 'index'), '. Adding an ', ref('index', 'index'), ' in B makes that same output available in B’s ', ref('cluster', 'memory'), '. Removing that ', ref('index', 'index'), ' removes the local copy; it leaves the ', ref('materialized', 'materialized view'), ' available.'], example: [ref('cluster', 'Transform'), ' → durable result → local ', ref('index', 'index'), ' in B'] },
    ],
    lessons: [
      { title: 'Query a local indexed view', shortTitle: 'View in A', target: 'a', before: [ref('view', 'revenue_v'), ' has an ', ref('index', 'index'), ' only in A. Which state can A use?'], explanation: ['A can read its own full indexed result from ', ref('cluster', 'memory'), '.'], snapshot: makeSnapshot(crossCluster.setup, undefined, { object: 'revenue_v', cluster: 'a' }) },
      { title: 'Move the same query to B', shortTitle: 'View in B', target: 'b', before: ['Does querying ', ref('view', 'revenue_v'), ' from B use A’s ', ref('index', 'index'), '?'], explanation: ['No. The definition is available in B, but A’s ', ref('index', 'index'), ' is local to A. B computes the view query. For the same completed input snapshot, both return the same answer.'], snapshot: makeSnapshot(crossCluster.setup, undefined, { object: 'revenue_v', cluster: 'b' }) },
      { title: 'Read durable output from B', shortTitle: 'Durable query', target: 'durable', before: ['Query ', ref('materialized', 'revenue_mv'), ' in B without an ', ref('index', 'index'), ' there. Is the maintained result accessible?'], explanation: ['Yes. ', ref('cluster', 'Transform'), ' maintains ', ref('materialized', 'revenue_mv'), ' in ', ref('materialized', 'durable storage'), ', which B can read. B does not need to rerun the original aggregation.'], snapshot: makeSnapshot(crossCluster.setup, undefined, { object: 'revenue_mv', cluster: 'b' }) },
      { title: 'Add a serving index in B', shortTitle: 'Index in B', target: 'b', before: ['Add ', ref('index', 'revenue_mv_b'), ' and query in B. Where is the full result now available locally?'], explanation: ['B’s ', ref('index', 'index'), ' makes the already-maintained output available in B’s ', ref('cluster', 'memory'), '. It does not repeat the original transformation.'], snapshot: makeSnapshot({ ...crossCluster.setup, materializedIndexes: ['b'] }, undefined, { object: 'revenue_mv', cluster: 'b' }) },
      { title: 'Remove only the index', shortTitle: 'Drop index', target: 'durable', before: ['Drop ', ref('index', 'revenue_mv_b'), '. Does the ', ref('materialized', 'materialized view'), ' disappear too?'], explanation: ['No. The local ', ref('index', 'index'), ' is removed, while ', ref('materialized', 'revenue_mv'), ' and its ', ref('materialized', 'durable output'), ' remain. B can still query that durable result.'], snapshot: makeSnapshot(crossCluster.setup, undefined, { object: 'revenue_mv', cluster: 'b' }) },
    ],
  },
  {
    title: 'Lecture 3', description: 'Choose what to maintain for one or several serving clusters.',
    objective: 'Keep intermediate views as SQL building blocks, then choose local maintenance or shared durable output for the final result. Maintaining a materialized view still needs transform memory; creation and restarts require hydration. Chapter 10 explores recovery.',
    sql: stackedSql, initial: makeSnapshot(), showClusterB: true, explore: true,
    introductions: [
      { title: 'Build a query from smaller named queries', target: 'definitions', explanation: ['A view can use another view. Here, ', ref('view', 'order_base'), ' selects the order columns, ', ref('view', 'order_enriched'), ' filters out negative amounts, and ', ref('amount', 'revenue'), ' groups the remaining ', ref('view', 'orders'), ' by ', ref('region', 'region'), '. These intermediate views organize SQL. Saving their definitions does not require keeping a separate result for each one.'], example: [ref('view', 'orders'), ' → ', ref('view', 'order_base'), ' → ', ref('view', 'order_enriched'), ' → ', ref('amount', 'revenue')] },
      { title: 'Choose objects from the serving requirement', target: 'durable', explanation: ['“Serving” means answering application queries. If only A needs maintained results in ', ref('cluster', 'memory'), ', ', ref('index', 'index'), ' the final ', ref('view', 'regular view'), ' in A. If ', ref('cluster', 'Transform'), ' must maintain one result shared by A and B, use a final ', ref('materialized', 'materialized view'), '. If both must serve from ', ref('cluster', 'memory'), ', each also needs its own ', ref('index', 'index'), ' on that ', ref('materialized', 'materialized view'), '.'], example: ['View: reuse SQL\n', ref('index', 'Index'), ': maintain local ', ref('cluster', 'memory'), ' rows\n', ref('materialized', 'Materialized view'), ': maintain shared durable rows'] },
    ],
    lessons: [
      { title: 'Organize SQL with regular views', shortTitle: 'Definitions', target: 'definitions', before: ['Only final ', ref('amount', 'revenue'), ' will be queried. Do ', ref('view', 'order_base'), ' and ', ref('view', 'order_enriched'), ' each need a separately maintained result?'], explanation: ['No. Keep these intermediate definitions as ', ref('view', 'regular views'), '. Maintaining a final dataflow can still require intermediate state; this avoids separately materializing every SQL building block.'], snapshot: makeSnapshot({ view: true, stacked: true }) },
      { title: 'Serve one cluster from memory', shortTitle: 'One cluster', target: 'a', before: ['A alone serves this result. What makes the final view’s answer continuously available in A’s ', ref('cluster', 'memory'), '?'], explanation: ['An ', ref('index', 'index'), ' on the final ', ref('view', 'regular view'), ' maintains its full result in A. No separate durable final output is needed for this requirement.'], snapshot: makeSnapshot({ view: true, stacked: true, viewIndexes: ['a'] }, undefined, { object: 'revenue_v', cluster: 'a' }) },
      { title: 'Choose a shared-output deployment', shortTitle: 'Share output', target: 'durable', before: ['Now consider a separate deployment: one ', ref('cluster', 'Transform'), ' cluster maintains the query for both A and B. Which object shares maintained output?'], explanation: ['Create the final ', ref('materialized', 'materialized view'), ' in ', ref('cluster', 'Transform'), '. This alternative uses ', ref('materialized', 'durable output'), ', while intermediate views stay definitions. It is a new object, not an automatic conversion of ', ref('view', 'revenue_v'), '.'], snapshot: makeSnapshot({ view: true, stacked: true, materialized: true }) },
      { title: 'Serve A locally', shortTitle: 'Index A', target: 'a', before: ['A must serve from its own ', ref('cluster', 'memory'), '. Is ', ref('materialized', 'durable output'), ' alone enough to meet that specific requirement?'], explanation: ['Add an ', ref('index', 'index'), ' on ', ref('materialized', 'revenue_mv'), ' in A. The durable result remains the shared maintained output.'], snapshot: makeSnapshot({ view: true, stacked: true, materialized: true, materializedIndexes: ['a'] }, undefined, { object: 'revenue_mv', cluster: 'a' }) },
      { title: 'Give B its own index', shortTitle: 'Index B', target: 'b', before: ['B must also serve from its own ', ref('cluster', 'memory'), '. Can it borrow A’s ', ref('index', 'index'), '?'], explanation: ['No. Add an ', ref('index', 'index'), ' on the same ', ref('materialized', 'revenue_mv'), ' in B. Each serving cluster owns its local result; neither reruns the original aggregate.'], snapshot: makeSnapshot({ view: true, stacked: true, materialized: true, materializedIndexes: ['a', 'b'] }, undefined, { object: 'revenue_mv', cluster: 'b' }) },
      { title: 'Follow one update through the design', shortTitle: 'Update', target: 'b', before: [ref('orderId', 'Order 1'), ' changes to ', ref('amount', '$120'), '. What should B’s next query return after maintenance completes?'], explanation: [ref('region', 'North'), ' becomes ', ref('amount', '$170'), ' in ', ref('materialized', 'durable output'), ' and both local ', ref('index', 'indexes'), '. B reads its own ', ref('cluster', 'memory'), '. One final transformation maintains shared output; the two intermediate definitions were not separately materialized.'], snapshot: makeSnapshot({ view: true, stacked: true, materialized: true, materializedIndexes: ['a', 'b'] }, updatedOrders, { object: 'revenue_mv', cluster: 'b' }) },
    ],
  },
];
