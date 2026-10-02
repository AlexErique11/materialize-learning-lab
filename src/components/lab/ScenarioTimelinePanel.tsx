import { useId, type ReactNode } from 'react';
import { GitBranch } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { PanelHeader } from '../ui/PanelHeader';

interface ScenarioTimelinePanelProps {
  title?: string;
  status?: string;
  logicalTime?: ReactNode;
  children?: ReactNode;
  legend?: ReactNode;
}

export function ScenarioTimelinePanel({
  title = 'Scenario timeline',
  status = 'No scenario',
  logicalTime = 'Not set',
  children,
  legend,
}: ScenarioTimelinePanelProps) {
  const titleId = useId();
  return (
    <Panel aria-labelledby={titleId}>
      <PanelHeader
        title={title}
        titleId={titleId}
        icon={<GitBranch size={18} />}
        trailing={<Badge>{status}</Badge>}
      />
      <div className="panel-body">
        <div className="mb-4 flex items-center justify-between gap-4 text-sm">
          <span className="text-text-muted">Logical time</span>
          <span className="font-mono text-sm">{logicalTime}</span>
        </div>
        <div className="timeline-region">
          {children ?? (
            <EmptyState
              compact
              icon={<GitBranch size={24} />}
              title="No scenario is running yet."
              description="The timeline will bring the events of a lab into view."
            />
          )}
        </div>
        {legend && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-muted">{legend}</div>
        )}
      </div>
    </Panel>
  );
}
