import type { HTMLAttributes } from 'react';

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  fitViewport?: boolean;
  tone?: 'learning' | 'practice';
}

export function PageContainer({
  className = '',
  fitViewport = false,
  tone = 'learning',
  ...props
}: PageContainerProps) {
  return (
    <div
      className={`page-container ${fitViewport ? 'page-container-fit' : ''} ${className}`}
      data-tone={tone}
      {...props}
    />
  );
}
