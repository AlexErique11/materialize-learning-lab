import { useId, type ReactNode } from 'react';
import { Table2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { PanelHeader } from '../ui/PanelHeader';

interface MaintainedResultPanelProps {
  rowCount?: number;
  status?: string;
  children?: ReactNode;
}

export function MaintainedResultPanel({
  rowCount = 0,
  status = 'Awaiting scenario',
  children,
}: MaintainedResultPanelProps) {
  const titleId = useId();
  return (
    <Panel aria-labelledby={titleId}>
      <PanelHeader title="Maintained result" titleId={titleId} icon={<Table2 size={17} />} />
      <div className="panel-body">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="text-3xl font-medium tracking-tight">{rowCount}</span>{' '}
            <span className="text-xs text-text-muted">
              {rowCount === 1 ? 'row' : 'rows'} in result
            </span>
          </p>
          <Badge>{status}</Badge>
        </div>
        <div className="mt-5 border-t border-border">
          {children ?? (
            <EmptyState
              compact
              title="No maintained result yet."
              description="The current answer will appear here during a lab."
            />
          )}
        </div>
      </div>
    </Panel>
  );
}
