import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { CircleHelp, Clock3, Database, Gauge } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { inputLimit, lagFor, laneNames, limitingInputs, reactionTime, type LaneId, type ProgressSnapshot } from './simulation';
import type { Target } from './lecture-scenarios';
import { LessonText } from '../../components/lesson/LessonText';
import { progressText } from './lessonText';
import { LagLegend } from './LagLegend';

export function ProgressMetrics({ snapshot: s, compact = false }: { snapshot: ProgressSnapshot; compact?: boolean }) {
  const entries = s.clock === undefined
    ? [{ label: 'Orders frontier', value: s.frontiers.orders }, { label: 'Payments frontier', value: s.frontiers.payments }, { label: 'Paid orders frontier', value: s.frontiers.join }]
    : [{ label: 'Simulated wall clock', value: `${s.clock} s` }, { label: 'Revenue frontier', value: `${s.frontiers.revenue} s` }, { label: 'Revenue wall-clock lag', value: `${lagFor(s, 'revenue').wallclock} s` }];
  if (compact) return s.clock === undefined || s.journey ? null : <dl className="progress-metric-strip" aria-label="Progress metrics">
    <div><dt>Clock</dt><dd>{s.clock} s</dd></div>
    {s.queryMs !== undefined && <div><dt>Query</dt><dd>{s.queryMs < 1000 ? `${s.queryMs} ms` : `${s.queryMs / 1000} s`}</dd></div>}
  </dl>;
  return <div className="relation-metrics" aria-label="Progress metrics">{entries.map((entry, index) => {
    const Icon = [Database, Clock3, Gauge][index]!;
    return <WorkspaceMetric key={entry.label} icon={<Icon size={25} aria-hidden="true" />} label={<>{entry.label}<RelationHelp label={entry.label}
      text={s.clock === undefined ? 'A write frontier F guarantees all changes at logical timestamps strictly below F are complete. Time F remains open.' : index === 0 ? 'This fixture aligns logical timestamps with a simulated wall clock, displayed in seconds. Values are illustrative.' : index === 1 ? 'Revenue is complete strictly before its write frontier. The boundary itself remains open.' : 'The difference between the simulated wall clock and Revenue’s write frontier. This is separate from query duration.'} /></>}
      value={<span className="progress-data-value" data-column={s.clock === undefined || index === 1 ? 'frontier' : index === 0 ? 'logicalTime' : 'lag'} data-testid={`progress-metric-${index}`}>{entry.value}</span>} />;
  })}</div>;
}
const laneSql: Record<LaneId, string> = { orders: 'Input relation', payments: 'Input relation', join: 'Orders JOIN Payments', revenue: 'SUM(amount)' };
const position = (value: number, max: number): CSSProperties => ({ '--position': `${value / max * 100}%` } as CSSProperties);
export function ProgressLanes({ snapshot: s, selected, onSelect, refs, showLimit, caption, upcoming = false, revealTiming = true, previous, activity, onInspect, caseLabel, compact = false }: {
  snapshot: ProgressSnapshot; selected: LaneId; onSelect: (id: LaneId) => void;
  refs?: Partial<Record<Target, RefObject<HTMLElement | null>>>; showLimit: boolean; caption: string; upcoming?: boolean; revealTiming?: boolean;
  previous?: ProgressSnapshot; activity?: { lane: LaneId; text: string };
  onInspect?: () => void;
  caseLabel?: string;
  compact?: boolean;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const lanes: LaneId[] = s.showRevenue ? ['orders', 'payments', 'join', 'revenue'] : ['orders', 'payments', 'join'];
  useLayoutEffect(() => {
    const panel = panelRef.current!;
    const row = panel.querySelector<HTMLElement>('.progress-lane')!;
    // Keep surrounding content anchored while the visible box loses its empty row.
    const measure = () => panel.style.setProperty('--progress-unused-row', `${s.showRevenue ? 0 : row.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [s.showRevenue]);
  // A fixed scale per fixture family prevents changes from moving every other marker.
  const max = 24;
  const unit = s.clock === undefined ? '' : ' s';
  const f = s.frontiers[selected];
  const observation = s.observed[selected]?.at(-1);
  const lag = selected === 'join' || selected === 'revenue' ? lagFor(s, selected) : undefined;
  const timing = s.journey && reactionTime(s.journey);
  // The lanes and metrics already show frontiers, clock and query duration.
  const compactEvidence = s.journey
    ? s.journey.ready === s.journey.requested
      ? `Update ${s.journey.changed} s → ready/query ${s.journey.ready} s → reply ${s.journey.returned} s.`
      : `Update ${s.journey.changed} s · ready ${s.journey.ready} s · query starts ${s.journey.requested} s · response ${s.journey.returned} s.`
    : s.backlog ? `Join backlog: ${s.backlog.join(' → ')} changes.`
      : s.sourceStatus === 'stalled' ? 'Payments source status: stalled.'
        : s.queryTarget !== undefined ? `Query target: ${s.queryTarget}.` : caption;
  const detail = activity?.lane === selected ? activity.text : timing
    ? `Update at ${s.journey!.changed} s → ready / query starts at ${s.journey!.ready} s → response at ${s.journey!.returned} s.${revealTiming ? ` Freshness ${timing.freshness} s + query ${timing.query} s = reaction ${timing.total} s.` : ''}`
    : s.evidence ?? (observation
      ? `Order ${observation.orderId}: observed logical time ${observation.logicalTime}${observation.eventTime !== undefined ? `; business event time ${observation.eventTime}` : ''}. Only times below frontier ${f} are guaranteed complete.`
      : showLimit && (selected === 'join' || selected === 'revenue')
        ? `Inputs permit ${inputLimit(s, selected)}; actual ${f}. ${inputLimit(s, selected) > f ? 'Processing still needed.' : 'Caught up to inputs.'}${selected === 'join' ? ` Limit: ${limitingInputs(s).map(id => laneNames[id]).join(' and ')}.` : ''}`
        : `Progress reports: ${s.reports[selected].join(' → ')}. All changes before ${f} are complete; time ${f} itself remains open.`);
  return <div className="progress-workspace" data-testid="progress-workspace">
    {!compact && <div className="progress-stage-row"><nav className="progress-stages" aria-label="Progress details">{lanes.map((lane, index) => <Button key={lane} aria-label={`${index + 1}. ${laneNames[lane]}`} aria-pressed={selected === lane} onClick={() => onSelect(lane)}>
      <strong className="progress-stage-full">{index + 1}. {laneNames[lane]}</strong><strong className="progress-stage-short">{lane === 'join' ? 'Join' : laneNames[lane]}</strong><span>{laneSql[lane]}</span>
    </Button>)}</nav><Button className="progress-metrics-button" onClick={() => { onInspect?.(); setMetricsOpen(true); }}>Metrics</Button></div>}
    <div ref={panelRef} className="progress-lane-panel" aria-label="Aligned progress lanes">
      <section ref={refs?.axis} className="progress-axis" aria-label={s.clock === undefined ? 'Logical time axis' : 'Clock-aligned logical time axis'}>
        <span>{s.clock === undefined ? 'Logical time' : 'Logical time (s)'}</span><div>{[0, 4, 8, 12, 16, 20, 24].map(t => <span key={t} style={position(t, max)}>{t}</span>)}</div>
      </section>
      <div className="progress-lane-rows">{lanes.map(lane => {
        const actual = s.frontiers[lane];
        const derived = showLimit && (lane === 'join' || lane === 'revenue') ? inputLimit(s, lane) : undefined;
        const caughtUp = derived === actual;
        const changes = s.observed[lane] ?? [];
        const times = [...new Set(changes.map(change => change.logicalTime))];
        const changed = previous && (previous.frontiers[lane] !== actual || (previous.observed[lane]?.length ?? 0) !== changes.length);
        return <section key={lane} ref={refs?.[lane]} className="progress-lane" data-selected={selected === lane} data-changed={Boolean(changed)} data-testid={`lane-${lane}`} aria-label={`${laneNames[lane]}: frontier ${actual}; complete before ${actual}${derived !== undefined ? `; input limit ${derived}` : ''}`}>
          <div className="progress-lane-name"><strong data-column={lane}>{laneNames[lane]}</strong><span>Complete &lt; {actual}</span></div>
          <div className="progress-track">
            {[0, 4, 8, 12, 16, 20, 24].map(t => <i key={t} className="progress-gridline" style={position(t, max)} />)}
            <div className="progress-complete" style={{ width: `${actual / max * 100}%` }} />
            {derived !== undefined && derived > actual && <div className="progress-pending" style={{ left: `${actual / max * 100}%`, width: `${(derived - actual) / max * 100}%` }} />}
            {derived !== undefined && !caughtUp && <span className="progress-limit" style={position(derived, max)} aria-label={`Inputs permit frontier up to ${derived}`}><span>{derived}</span></span>}
            <span className="progress-frontier" data-caught-up={caughtUp} style={position(actual, max)}
              aria-label={caughtUp ? `Frontier and input limit both ${actual}; caught up to inputs` : `Actual frontier ${actual}`}>
              <span>{actual}</span>
            </span>
            {times.map(time => {
              const atTime = changes.filter(change => change.logicalTime === time);
              return <span key={time} role="img" className="progress-observed" style={position(time, max)} data-testid="observed-change" aria-label={`${atTime.length} ${atTime.length === 1 ? 'change' : 'changes'} observed at logical time ${time}`}
                title={`Order IDs ${atTime.map(change => change.orderId).join(', ')}: changes seen at logical time ${time}. This is not a completeness guarantee.`}><i className="progress-observed-diamond" aria-hidden="true" /><span>{time}{atTime.length > 1 ? ` ×${atTime.length}` : ''}</span></span>;
            })}
            {s.clock !== undefined && <span className="progress-wallclock" style={position(s.clock, max)} aria-label={`Wall clock ${s.clock}`} />}
          </div>
        </section>;
      })}</div>
      <button type="button" className="progress-legend" aria-label="Explain diagram symbols" title="Click to read the diagram key" onClick={() => { onInspect?.(); setKeyOpen(true); }}>
        <span><i className="progress-key-solid" /><span className="progress-legend-full">Purple: frontier</span><span className="progress-legend-short">Frontier</span></span>
        <span><i className="progress-key-complete" /><span className="progress-legend-full">Green: completed time</span><span className="progress-legend-short">Complete</span></span>
        {showLimit && <span><i className="progress-key-limit" /><span className="progress-legend-full">Orange: pending work / input limit</span><span className="progress-legend-short">Pending</span></span>}
        <span><span className="progress-legend-full">◇ Changes seen</span><span className="progress-legend-short">◇ Seen</span></span>
        {s.clock !== undefined && <span><i className="progress-key-clock" /><span className="progress-legend-full">Wall clock</span><span className="progress-legend-short">Clock</span></span>}<span><CircleHelp size={13} aria-hidden="true" />Key</span>
      </button>
    </div>
    {compact ? <section className="progress-detail progress-exercise-evidence" aria-label="Current evidence" data-testid="progress-detail"><ProgressMetrics snapshot={s} compact /><p><LessonText content={progressText(compactEvidence)} /></p></section> : <section ref={refs?.detail} className="progress-detail" aria-labelledby={`${id}-detail`} data-testid="progress-detail">
      <div className="progress-detail-heading"><strong id={`${id}-detail`} data-testid={caseLabel ? 'progress-case-label' : undefined}><LessonText content={progressText(caseLabel ?? `${laneNames[selected]} · frontier ${f}${unit}`)} /></strong>
        {s.queryMs !== undefined && <span>Query: <strong className="progress-data-value" data-column="queryLatency">{s.queryMs < 1000 ? `${s.queryMs} ms` : `${s.queryMs / 1000} s`}</strong></span>}</div>
      <p><LessonText content={progressText(detail)} /></p>
      {lag && s.clock !== undefined && !s.journey && !s.evidence && <p className="progress-lag-breakdown"><LessonText content={[
        { kind: 'term', text: `Local ${lag.local} s`, column: 'localLag' }, ' · ', { kind: 'term', text: `inherited ${lag.inherited} s`, column: 'inheritedLag' }, ' · ', { kind: 'term', text: `source ${lag.source} s`, column: 'lag' },
      ]} /></p>}
    </section>}
    {!compact && (caseLabel ? <LagLegend snapshot={s} /> : <p className="progress-caption" aria-live="polite" data-upcoming={upcoming}><LessonText content={progressText(caption)} /></p>)}
    <Dialog open={metricsOpen} onClose={() => setMetricsOpen(false)} title="Current progress">
      <dl className="progress-metrics-list">{lanes.map(lane => <div key={lane}><dt>{laneNames[lane]} frontier</dt><dd>{s.frontiers[lane]}{unit}</dd></div>)}
        {s.clock !== undefined && <><div><dt>Simulated wall clock</dt><dd>{s.clock} s</dd></div><div><dt>Revenue wall-clock lag</dt><dd>{lagFor(s, 'revenue').wallclock} s</dd></div></>}
      </dl>
    </Dialog>
    <Dialog open={keyOpen} onClose={() => setKeyOpen(false)} title="Diagram key" eyebrow="How to read the lanes">
      <dl className="progress-symbol-definitions">
        <div><dt><i className="progress-key-solid" />Purple circle · actual frontier</dt><dd>At frontier 12, all changes before 12 are complete. Time 12 itself is still open. The circle is a boundary, not a row count.</dd></div>
        <div><dt><i className="progress-key-complete" />Green band · completed time</dt><dd>The green part of a lane covers times strictly before its purple circle. It grows when completion advances, even if no new business rows arrive.</dd></div>
        <div><dt>◇ Diamond · an observed change</dt><dd>One change was seen at this logical timestamp. Seeing 18 does not prove that earlier changes are complete. Diamonds remain as history, including after the frontier passes them; ×2 means two changes at the same time.</dd></div>
        <div><dt><i className="progress-key-limit" />Orange dashed line and hollow circle · input limit</dt><dd>Inputs permit the output frontier to reach this time. This is a permission boundary, not actual completed processing. When it catches up, the purple circle sits inside the orange outline.</dd></div>
        <div><dt><i className="progress-key-pending" />Orange horizontal band · processing still needed</dt><dd>The gap between the actual frontier and its input limit. Inputs have progressed enough, but the maintained computation has not caught up. The gap closes when processing finishes.</dd></div>
        {s.clock !== undefined && <div><dt><i className="progress-key-clock" />Dotted line · simulated wall clock</dt><dd>Compare this time with a frontier to measure wall-clock lag in this clock-aligned fixture.</dd></div>}
        {caseLabel && <>
          <div><dt>Source lag</dt><dd>Clock minus the slower source frontier. This delay starts before maintained computation.</dd></div>
          <div><dt>Inherited lag</dt><dd>Slower source frontier minus Paid orders frontier. Revenue inherits this delay from earlier computation.</dd></div>
          <div><dt>Local lag</dt><dd>Paid orders frontier minus Revenue frontier. This is delay added at Revenue itself.</dd></div>
          <div><dt>Global materialization lag</dt><dd>Inherited + local lag. This is total computation delay; source delay is separate.</dd></div>
          <div><dt>Wall-clock lag</dt><dd>Source + global lag, equal to clock minus Revenue frontier. For example, source 2 s + inherited 4 s + local 2 s = wall-clock lag 8 s. Query duration is separate.</dd></div>
        </>}
      </dl>
      <p className="progress-key-note">Diamonds disappear only when you reset, start a new fixture, or step back to before their arrival. They are a history of changes, not the current rows in a table.</p>
    </Dialog>
  </div>;
}
