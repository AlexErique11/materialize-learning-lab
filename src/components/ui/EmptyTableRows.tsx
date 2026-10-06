// Empty cells reserve table space without becoming data rows for assistive tools.
export function EmptyTableRows({ count, columns }: { count: number; columns: number }) {
  return Array.from({ length: Math.max(0, count) }, (_, row) => <tr key={`empty:${row}`} aria-hidden="true" data-placeholder="true">
    {Array.from({ length: columns }, (_, column) => <td key={column} />)}
  </tr>);
}
