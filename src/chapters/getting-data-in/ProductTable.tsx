import { Fragment } from 'react';
import { EmptyTableRows } from '../../components/ui/EmptyTableRows';
import { Table } from '../../components/ui/Table';
import type { Product, ProductDiff } from './scenario';

export function productFields(row: Product) {
  return [
    { key: 'productId', label: 'product_id', value: String(row.productId) },
    { key: 'name', label: 'name', value: row.name },
    { key: 'price', label: 'price', value: '$' + row.price },
    { key: 'note', label: 'note', value: row.note ?? 'NULL' },
  ];
}

export function ProductTuple({ row, opposite }: { row: Product; opposite?: Product }) {
  const oppositeFields = opposite && productFields(opposite);
  return <span className="maintenance-diff-tuple">({productFields(row).map((field, index) =>
    <Fragment key={field.key}>{index > 0 && ', '}<span data-field={field.key} data-column={field.key}
      data-changed={!oppositeFields || oppositeFields.find((other) => other.key === field.key)?.value !== field.value}
      aria-label={field.label + ': ' + field.value}>{field.value}</span></Fragment>
  )})</span>;
}

export function ProductTable({ rows, caption, diffs, highlight }: {
  rows: readonly Product[]; caption: string; diffs: readonly ProductDiff[]; highlight: boolean;
}) {
  return <Table caption={caption} className="snapshot-product-table">
    <colgroup>{['id', 'name', 'price', 'note'].map((field) => <col key={field} className={'snapshot-column-' + field} />)}</colgroup>
    <thead><tr><th aria-label="product_id"><span className="snapshot-id-full">product_id</span><span className="snapshot-id-short">ID</span></th>
      <th>name</th><th className="maintenance-currency">price</th><th className="maintenance-text">note</th></tr></thead>
    <tbody>
      {rows.map((row, index) => {
        const rowFields = productFields(row);
        const affected = highlight && diffs.some((entry) => entry.diff === 1
          && productFields(entry.row).every((field, i) => field.value === rowFields[i]!.value));
        const old = diffs.find((entry) => entry.diff === -1 && entry.row.productId === row.productId)?.row;
        const oldFields = old && productFields(old);
        return <tr key={row.productId + ':' + index} data-affected={affected}>
          {rowFields.map((field) => <td key={field.key} data-column={field.key}
            data-changed={affected && (!oldFields || oldFields.find((other) => other.key === field.key)?.value !== field.value)}
            className={field.key === 'price' ? 'maintenance-currency' : field.key === 'name' || field.key === 'note' ? 'maintenance-text' : undefined}>
            {field.value}
          </td>)}
        </tr>;
      })}
      <EmptyTableRows count={4 - rows.length} columns={4} />
    </tbody>
  </Table>;
}
