import type { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  return <span className={`badge badge-${tone} ${className}`} {...props} />;
}
