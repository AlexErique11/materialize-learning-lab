import type { ReactNode } from 'react';

interface PanelHeaderProps {
  title: string;
  titleId?: string;
  icon?: ReactNode;
  eyebrow?: string;
  trailing?: ReactNode;
}

export function PanelHeader({ title, titleId, icon, eyebrow, trailing }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <div className="flex min-w-0 items-center gap-3">
        {!icon && <span className="panel-heading-mark" aria-hidden="true" />}
        {icon && (
          <span className="panel-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 id={titleId} className="panel-title">
            {title}
          </h2>
        </div>
      </div>
      {trailing && <div className="panel-trailing">{trailing}</div>}
    </div>
  );
}
