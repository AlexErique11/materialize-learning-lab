import type { ComponentPropsWithoutRef } from 'react';

interface TableProps extends ComponentPropsWithoutRef<'table'> {
  caption: string;
}

// Compose standard thead/tbody/th/td elements; no row schema or domain semantics.
export function Table({ caption, children, className = '', ...props }: TableProps) {
  return (
    <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table className={`data-table ${className}`} {...props}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
