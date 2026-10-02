import { useId, type ReactNode } from 'react';
import { Radio } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { PanelHeader } from '../ui/PanelHeader';

interface SubscriptionPanelProps {
  ordering?: string;
  children?: ReactNode;
}

export function SubscriptionPanel({ ordering, children }: SubscriptionPanelProps) {
  const titleId = useId();
  return (
    <Panel aria-labelledby={titleId}>
      <PanelHeader
        title="Subscription"
        titleId={titleId}
        icon={<Radio size={17} />}
        trailing={ordering ? <Badge>{ordering}</Badge> : undefined}
      />
      <div className="panel-body">
        {children ?? (
          <EmptyState
            compact
            icon={<Radio size={22} />}
            title="No result changes yet."
            description="The change stream will appear here during a lab."
          />
        )}
      </div>
    </Panel>
  );
}
