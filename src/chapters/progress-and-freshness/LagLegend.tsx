import { lagFor, type ProgressSnapshot } from './simulation';
import type { RefObject } from 'react';

export function LagLegend({ snapshot, sectionRef }: { snapshot: ProgressSnapshot; sectionRef?: RefObject<HTMLElement | null> }) {
  const lag = lagFor(snapshot, 'revenue');
  const entries = [
    { label: 'Source', value: lag.source, column: 'lag', meaning: 'Clock minus the slower source frontier: delay before maintained computation.' },
    { label: 'Inherited', value: lag.inherited, column: 'inheritedLag', meaning: 'Slower source frontier minus Paid orders frontier: upstream computation delay inherited by Revenue.' },
    { label: 'Local', value: lag.local, column: 'localLag', meaning: 'Paid orders frontier minus Revenue frontier: delay added at Revenue itself.' },
    { label: 'Global', value: lag.global, column: 'lag', meaning: 'Inherited + local: total materialization lag, excluding source delay.' },
    { label: 'Wall-clock', value: lag.wallclock, column: 'lag', meaning: 'Source + global: clock minus Revenue frontier. Query duration is separate.' },
  ];
  return <section ref={sectionRef} className="progress-caption progress-lag-legend" aria-label="Revenue lag breakdown" aria-live="polite">
    <div className="progress-lag-heading"><strong>Revenue lag (s)</strong><span>Independent case</span></div>
    <dl>{entries.map(entry => <div key={entry.label} title={entry.meaning}>
      <dt><abbr title={entry.meaning}>{entry.label}</abbr></dt>
      <dd data-motion-value className="progress-data-value" data-column={entry.column}>{entry.value}</dd>
    </div>)}</dl>
  </section>;
}
