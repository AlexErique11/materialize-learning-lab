import type { ReactNode } from 'react';

export function WorkspaceMetric({ icon, label, value, testId }: {
  icon: ReactNode; label: ReactNode; value: ReactNode; testId?: string;
}) {
  return <div className="relation-metric" data-testid={testId}>
    {icon}<div><span>{label}</span><strong>{value}</strong></div>
  </div>;
}
