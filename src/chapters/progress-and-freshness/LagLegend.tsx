import { lagFor, type ProgressSnapshot } from './simulation';
import type { RefObject } from 'react';
import { RelationHelp } from '../../components/lesson/RelationHelp';

export function LagLegend({ snapshot, sectionRef, caseLabel }: { snapshot: ProgressSnapshot; sectionRef?: RefObject<HTMLElement | null>; caseLabel?: string }) {
  const lag = lagFor(snapshot, 'revenue');
  const entries = [
    { label: 'Source', value: lag.source, column: 'lag', meaning: 'Clock minus the slower source frontier: delay before maintained computation.' },
    { label: 'Inherited', value: lag.inherited, column: 'inheritedLag', meaning: 'Slower source frontier minus Paid orders frontier: upstream computation delay inherited by Revenue.' },
    { label: 'Local', value: lag.local, column: 'localLag', meaning: 'Paid orders frontier minus Revenue frontier: delay added at Revenue itself.' },
    { label: 'Global', value: lag.global, column: 'lag', meaning: 'Inherited + local: total materialization lag, excluding source delay.' },
    { label: 'Wall-clock', value: lag.wallclock, column: 'lag', meaning: 'Source + global: clock minus Revenue frontier. Query duration is separate.' },
  ];
  return <section ref={sectionRef} className="progress-caption progress-lag-legend" aria-label="Revenue lag breakdown" aria-live="polite">
    <div className="progress-lag-heading"><strong>Revenue lag (s)</strong><span data-testid={caseLabel ? 'progress-case-label' : undefined}>{caseLabel ?? 'Independent case'}</span></div>
    <dl>{entries.map(entry => <div key={entry.label}>
      <dt><RelationHelp className="progress-lag-help" label={`${entry.label} lag`} text={entry.meaning} showIcon={false}>{entry.label}</RelationHelp></dt>
      <dd data-motion-value className="progress-data-value" data-column={entry.column}>{entry.value}</dd>
    </div>)}</dl>
  </section>;
}
