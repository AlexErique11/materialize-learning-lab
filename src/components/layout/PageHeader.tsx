import { useEffect, type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  trailing?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, trailing }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} | Materialize Learning Lab`;
  }, [title]);

  return (
    <header className="page-heading">
      <div className="min-w-0">
        {eyebrow && <div className="mb-3 flex flex-wrap items-center gap-3">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </header>
  );
}
