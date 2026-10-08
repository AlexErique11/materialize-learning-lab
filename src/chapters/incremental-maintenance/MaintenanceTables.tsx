import { Table } from '../../components/ui/Table';
import { EmptyTableRows } from '../../components/ui/EmptyTableRows';
import { RelationHelp } from '../changing-relations/RelationHelp';
import type { Order, OutputRow } from './scenario';
import { joinStages, type Product, type JoinedOrder } from './join-scenario';

export function OrderTable({ rows, caption }: { rows: readonly Order[] | readonly OutputRow[]; caption: string }) {
  const fullRows = caption !== 'Maintained output';
  return <Table caption={caption}>
    {fullRows && <colgroup><col style={{ width: '25%' }} /><col style={{ width: '29%' }} /><col style={{ width: '22%' }} /><col style={{ width: '24%' }} /></colgroup>}
    <thead><tr><th>order_id</th>{fullRows && <th>product_id</th>}<th className="maintenance-currency">amount</th>{fullRows && <th className="maintenance-text">note</th>}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.orderId}>
      <td>{row.orderId}</td>{'productId' in row && <td>{String(row.productId)}</td>}<td className="maintenance-currency">${row.amount}</td>
      {'note' in row && <td className="maintenance-text" aria-label={String(row.note)}><span className="maintenance-note-cell">{row.note}</span></td>}
    </tr>)}<EmptyTableRows count={4 - rows.length} columns={fullRows ? 4 : 2} /></tbody>
  </Table>;
}


type JoinRow = Order | Product | JoinedOrder;
export function JoinTable({ rows, stage, affectedProductId, affectedOrderIds, showNote = false }: {
  rows: readonly JoinRow[]; stage: { id: typeof joinStages[number]['id']; title: string }; showNote?: boolean; affectedProductId?: number; affectedOrderIds: readonly number[];
}) {
  return <Table caption={stage.title} data-many-rows={rows.length > 4}>
    {showNote && <colgroup>{[25, 29, 21, 25].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>}
    <thead><tr>{stage.id !== 'products' && <th>order_id</th>}{stage.id !== 'result' && <th>product_id</th>}
      {stage.id !== 'orders' && <th className="maintenance-text">name</th>}{stage.id !== 'products' && <th className="maintenance-currency">amount</th>}{showNote && <th className="maintenance-text">note</th>}</tr></thead>
    <tbody>{rows.map((row) => <tr key={'orderId' in row ? row.orderId : row.productId}
      data-affected={'productId' in row ? row.productId === affectedProductId : affectedOrderIds.includes(row.orderId)}>
      {'orderId' in row && <td>{row.orderId}</td>}{'productId' in row && <td>{row.productId}</td>}
      {'name' in row && <td className="maintenance-text"><span className="maintenance-note-cell">{row.name}</span></td>}{'amount' in row && <td className="maintenance-currency">${row.amount}</td>}{showNote && 'note' in row && <td className="maintenance-text">{row.note}</td>}
    </tr>)}<EmptyTableRows count={4 - rows.length} columns={showNote ? 4 : stage.id === 'products' ? 2 : 3} /></tbody>
  </Table>;
}


const countHelp = 'Illustrative model counts, not measured Materialize work or speed. Contributions counts signed copies applied to COUNT and SUM after projection and consolidation. Recompute processes one positive contribution per current order; maintenance uses net signed contributions. Source processing, lookups, state storage, and result emission are not counted.';

type GroupedResult = { productId: number; count: number; total: number } | { region: string; count: number; total: number };
const groupKey = (row: GroupedResult) => 'region' in row ? row.region : row.productId;
export function ComparisonPanel({ stage, state, customers, showContributions = true }: {
 stage: string; customers?: readonly { customerId: number; region: string; name: string }[]; showContributions?: boolean;
 state: { orders: readonly Order[]; changeTitle: string; changedOrders: readonly number[]; output: readonly GroupedResult[]; recomputed: readonly GroupedResult[]; contributionCount: number; affectedKeys: readonly (string | number)[]; previous: readonly GroupedResult[] };
}) {
  if (stage === 'orders') return <div className="comparison-input">
    <p>{state.changeTitle}</p>
    <ul aria-label="Shared input orders">{state.orders.map((row) => <li key={row.orderId} data-affected={state.changedOrders.includes(row.orderId)}
      aria-label={`order_id ${row.orderId}; ${customers ? 'customer_id' : 'product_id'} ${row.productId}; amount $${row.amount}; note ${row.note}`}>
      <span>Order {row.orderId}{customers && ` \u00b7 $${row.amount}`}</span><span>{customers ? `Customer ${row.productId} \u00b7 ${customers.find(c => c.customerId === row.productId)?.region ?? 'No match'}` : <>Product {row.productId} · <strong>${row.amount}</strong></>}</span>
    </li>)}</ul>
  </div>;
  const incremental = stage === 'incremental';
  const result = incremental ? state.output : state.recomputed;
  return <div className="comparison-method">
    <div className="comparison-counters">
      {showContributions && <span>Illustrative model counts</span>}
      <dl>{showContributions && <div><dt>Contributions</dt><dd>{incremental ? state.contributionCount : state.orders.length}</dd></div>}
        <div><dt>Groups {incremental ? 'updated' : 'rebuilt'}</dt><dd>{incremental ? state.affectedKeys.length : result.length}</dd><RelationHelp label={incremental ? 'Groups updated' : 'Groups rebuilt'} text={showContributions ? countHelp : 'Recomputation rebuilds every current nonempty group. Maintenance updates the affected region keys, including any group removed by the batch. These counts illustrate the teaching model, not measured Materialize performance.'} /></div></dl>
    </div>
    <section>
    <h3 className="comparison-section-title">Query result</h3>
    <Table caption={incremental ? 'Incrementally maintained revenue' : 'Recomputed revenue'}>
      <thead><tr><th>{customers ? 'region' : 'product_id'}</th><th>order_count</th><th className="maintenance-currency">revenue</th></tr></thead>
      <tbody>{result.map((row) => <tr key={groupKey(row)} data-affected={state.previous.length > 0 && (!incremental || state.affectedKeys.includes(groupKey(row)))}>
        <td>{groupKey(row)}</td><td>{row.count}</td><td className="maintenance-currency">${row.total}</td>
      </tr>)}{customers && <EmptyTableRows count={3 - result.length} columns={3} />}</tbody>
    </Table>
    </section>
  </div>;
}


