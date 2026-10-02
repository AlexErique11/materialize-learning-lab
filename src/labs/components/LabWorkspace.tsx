import type { ReactNode } from 'react';

interface LabWorkspaceProps {
  timeline: ReactNode;
  source: ReactNode;
  currentMoment: ReactNode;
  result: ReactNode;
  subscription: ReactNode;
}

export function LabWorkspace({
  timeline,
  source,
  currentMoment,
  result,
  subscription,
}: LabWorkspaceProps) {
  return (
    <div className="lab-workspace">
      {timeline}
      <div className="lab-panel-grid">
        {source}
        {currentMoment}
        {result}
        {subscription}
      </div>
    </div>
  );
}
