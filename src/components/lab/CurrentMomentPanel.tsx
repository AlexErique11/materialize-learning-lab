import { useId, type ReactNode } from 'react';
import { Clock3 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Panel } from '../ui/Panel';
import { PanelHeader } from '../ui/PanelHeader';

interface CurrentMomentPanelProps {
  time?: ReactNode;
  eventLabel?: string;
  heading?: string;
  description?: string;
  children?: ReactNode;
}

export function CurrentMomentPanel({
  time = 'Not set',
  eventLabel = 'Waiting',
  heading = 'No scenario is running.',
  description = 'The current event and its explanation will appear here.',
  children,
}: CurrentMomentPanelProps) {
  const titleId = useId();
  return (
    <Panel aria-labelledby={titleId}>
      <PanelHeader title="Current moment" titleId={titleId} icon={<Clock3 size={17} />} />
      <div className="panel-body">
        <div className="moment-readout">
          <span className="font-mono text-sm">{time}</span>
          <Badge>{eventLabel}</Badge>
        </div>
        <h3 className="mb-2 mt-6 text-sm font-medium">{heading}</h3>
        <p className="text-sm leading-relaxed text-text-muted">{description}</p>
        {children && <div className="mt-5 space-y-2">{children}</div>}
      </div>
    </Panel>
  );
}
