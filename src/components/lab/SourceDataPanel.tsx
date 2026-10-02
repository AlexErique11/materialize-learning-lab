import { useId, type ReactNode } from 'react';
import { Database } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { PanelHeader } from '../ui/PanelHeader';

interface SourceDataPanelProps {
  rowCount?: number;
  children?: ReactNode;
}

export function SourceDataPanel({ rowCount = 0, children }: SourceDataPanelProps) {
  const titleId = useId();
  return (
    <Panel aria-labelledby={titleId}>
      <PanelHeader
        title="Source data"
        titleId={titleId}
        icon={<Database size={17} />}
        trailing={
          <Badge>
            {rowCount} {rowCount === 1 ? 'row' : 'rows'}
          </Badge>
        }
      />
      <div className="panel-body">
        {children ?? (
          <EmptyState
            compact
            icon={<Database size={22} />}
            title="No source rows yet."
            description="This panel will show source tables during a lab."
          />
        )}
      </div>
    </Panel>
  );
}
