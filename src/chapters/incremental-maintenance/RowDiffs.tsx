import { Fragment } from 'react';
import { DiffBadge } from '../changing-relations/RelationWorkbench';
import type { JoinedOrder, Product } from './join-scenario';
import type { Diff, Order, OutputRow } from './scenario';

type Row = Order | OutputRow | Product | JoinedOrder;

function fields(row: Row) {
  return [
    ...('orderId' in row ? [{ key: 'orderId', label: 'order_id', value: row.orderId }] : []),
    ...('productId' in row ? [{ key: 'productId', label: 'product_id', value: row.productId }] : []),
    ...('name' in row ? [{ key: 'name', label: 'name', value: row.name }] : []),
    ...('amount' in row ? [{ key: 'amount', label: 'amount', value: row.amount }] : []),
    ...('note' in row ? [{ key: 'note', label: 'note', value: row.note }] : []),
  ];
}

const identity = (row: Row) => 'orderId' in row ? row.orderId : row.productId;

/** Display full signed rows; emphasis compares replacements, not individual cell updates. */
export function RowDiffs({ entries, label, emptyReason, className = '' }: {
  entries: readonly Diff<Row>[]; label: string; emptyReason?: string; className?: string;
}) {
  return <section className={`maintenance-diffs ${className}`} aria-label={label}>
    <h3>{label}</h3>
    {entries.length ? <ul>{entries.map(({ row, diff }, index) => {
      const other = entries.find((entry) => entry.diff * diff < 0 && identity(entry.row) === identity(row));
      const otherFields = other ? fields(other.row) : undefined;
      return <li key={index}>
        <DiffBadge diff={diff} />
        <span className="maintenance-diff-tuple">({fields(row).map((field, fieldIndex) => {
          const changed = !otherFields || otherFields.find(({ key }) => key === field.key)?.value !== field.value;
          const value = field.key === 'amount' ? `$${field.value}` : field.value;
          return <Fragment key={field.key}>{fieldIndex > 0 && ', '}<span data-field={field.key} data-changed={changed}
            title={field.label} aria-label={`${field.label}: ${field.value}`}>{value}</span></Fragment>;
        })})</span>
      </li>;
    })}</ul> : <p>No net changes{emptyReason && <span className="maintenance-empty-reason">{emptyReason}</span>}</p>}
  </section>;
}
