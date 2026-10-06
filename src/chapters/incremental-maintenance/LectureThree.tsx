import type { ReactNode } from 'react';
import type { ChapterDefinition } from '../chapterRegistry';
import { Table } from '../../components/ui/Table';
import { EmptyTableRows } from '../../components/ui/EmptyTableRows';
import { MaintenanceLecture } from './MaintenanceLecture';
import { RowDiffs } from './RowDiffs';
import { aggregateLessons, aggregateReference, aggregateRunDefinition, aggregateStages } from './aggregate-scenario';
import { aggregateSnapshotAt } from './aggregate-simulation';
import './lecture-three.css';

function AggregatePanel({ stage, state }: { stage: string; state: ReturnType<typeof aggregateSnapshotAt> }) {
  if (stage === 'groups') {
    const keys = [...new Set([...state.previous, ...state.output].map((row) => row.productId))].sort();
    return <div className="aggregate-groups" aria-label="Retained group state">
      {keys.map((key) => {
        const before = state.previous.find((row) => row.productId === key);
        const after = state.output.find((row) => row.productId === key);
        const affected = state.orderDiffs.some(({ row }) => row.productId === key);
        return <section key={key} className="aggregate-group" data-affected={affected}>
          <h3>Product {key}{affected && <span>affected</span>}</h3>
          <p>{state.orders.filter((row) => row.productId === key).map((row) => '$' + row.amount).join(' + ') || 'No remaining orders'}</p>
          <dl><div><dt>Count</dt><dd>{before?.count ?? 0} &rarr; {after?.count ?? 0}</dd></div>
            <div><dt>Sum</dt><dd>{before ? '$' + before.total : '\u2014'} &rarr; {after ? '$' + after.total : '\u2014'}</dd></div></dl>
        </section>;
      })}
      <p className="aggregate-model-note">Logical state model &middot; before &rarr; after this batch</p>
    </div>;
  }
  const source = stage === 'orders';
  return <><Table caption={source ? 'Orders' : 'Revenue by product'}>
    <thead><tr>{source && <th>order_id</th>}<th>product_id</th>{!source && <th>order_count</th>}<th className="maintenance-currency">{source ? 'amount' : 'revenue'}</th></tr></thead>
    <tbody>{source ? state.orders.map((row) => <tr key={row.orderId} data-affected={state.orderDiffs.some((entry) => entry.row.orderId === row.orderId)}><td>{row.orderId}</td><td>{row.productId}</td><td className="maintenance-currency">$ {row.amount}</td></tr>)
      : state.output.map((row) => <tr key={row.productId} data-affected={state.outputDiffs.some((entry) => entry.row.productId === row.productId)}><td>{row.productId}</td><td>{row.count}</td><td className="maintenance-currency">$ {row.total}</td></tr>)}
      <EmptyTableRows count={4 - (source ? state.orders.length : state.output.length)} columns={3} /></tbody>
  </Table><RowDiffs className="join-diffs" entries={source ? state.orderDiffs : state.outputDiffs} label={source ? 'Orders diffs' : 'Result diffs'} /></>;
}

export function IncrementalLectureThree({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  return <MaintenanceLecture chapter={chapter} navigation={navigation} title="Lecture 3" timeTestId="aggregate-time"
    description="Track group state as changes update aggregate results."
    definition={aggregateRunDefinition} lessons={aggregateLessons} stages={aggregateStages} reference={aggregateReference}
    snapshot={(time) => { const state = aggregateSnapshotAt(time); return { ...state, inputCount: state.orders.length }; }}
    renderRows={(stage, state) => <AggregatePanel stage={stage} state={state} />} />;
}
