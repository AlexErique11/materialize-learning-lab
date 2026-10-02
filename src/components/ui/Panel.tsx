import type { ComponentPropsWithoutRef } from 'react';

export function Panel({ className = '', ...props }: ComponentPropsWithoutRef<'section'>) {
  return <section className={`panel ${className}`} {...props} />;
}
