import { useState, type CSSProperties, type RefObject } from 'react';
import { CheckCircle2, CircleHelp, Clock3, History, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { LessonText } from '../../components/lesson/LessonText';
import { classifyTimestamp, formatReadTime, policyNames, sharedWindow, statusNames, type ReadSnapshot, type ReadStatus } from './simulation';
import type { ReadTarget } from './lecture-scenarios';
import { readText } from './lessonText';
import '../../styles/timeline.css';

const statusIcons = { available: CheckCircle2, waiting: Clock3, 'too-old': History, stale: XCircle };
const percent = (value: number, snapshot: ReadSnapshot) => `${Math.max(0, Math.min(100, (value - snapshot.axis[0]) / (snapshot.axis[1] - snapshot.axis[0]) * 100))}%`;
const position = (value: number, snapshot: ReadSnapshot): CSSProperties => ({ left: percent(value, snapshot) });
export type ReadRefs = Record<ReadTarget, RefObject<HTMLElement | null>>;

export function ReadableWindow({ snapshot: s, refs, caption, revealOutcome = true, onSelectTime, onInspect, disabled = false, assessment = false }: {
  snapshot: ReadSnapshot; refs?: ReadRefs; caption: string; revealOutcome?: boolean;
  onSelectTime?: (timestamp: number) => void; onInspect?: () => void; disabled?: boolean; assessment?: boolean;
}) {
  const [keyOpen, setKeyOpen] = useState(false);
  const window = sharedWindow(s);
  const time = s.attempt?.timestamp;
  const status: ReadStatus | undefined = revealOutcome ? s.attempt?.status : undefined;
  const Icon = status ? statusIcons[status] : CircleHelp;
  const cursorState = time === undefined ? undefined : classifyTimestamp(s, time);
  const ticks = Array.from({ length: 6 }, (_, i) => s.axis[0] + (s.axis[1] - s.axis[0]) * i / 5);
  const detail = !revealOutcome ? caption
    : s.attempt?.status === 'available' ? `Both inputs retain and complete snapshot time ${formatReadTime(s, s.attempt.timestamp)}.${s.row ? ` Order ${s.row.id}: ${s.attempt.rowVisible ? 'present' : 'absent'} in this read.` : ''}`
      : s.attempt?.status === 'too-old' ? 'At least one input no longer retains this snapshot. Waiting for progress cannot restore discarded history.'
        : s.attempt?.status === 'waiting' ? 'The selected snapshot is not complete across all inputs. The cursor stays here while the read waits.'
          : s.attempt?.status === 'stale' ? 'No shared snapshot meets the freshness bound. This request errors without waiting for input progress.'
            : s.observed ? `T1 completed first at time ${formatReadTime(s, s.observed.timestamp)}; order 42 was present. T2 starts afterwards.` : 'Each input has a retained boundary and a write frontier. One read uses one logical moment across both.';
  return <div className="read-workspace" data-testid="read-workspace" data-assessment={assessment || undefined}>
    <section ref={refs?.query} className="read-query" aria-label="Query settings">
      <div><span>Read policy</span><strong>{s.attempt ? policyNames[s.attempt.policy] : 'Timestamp selection'}{s.attempt?.bound ? ` · ${s.attempt.bound / 1000} s` : ''}</strong></div>
      <div><span>{status === 'available' ? 'Returned snapshot' : 'Selected target'}</span><strong>{time === undefined ? 'Not requested' : formatReadTime(s, time)}</strong></div>
      <div><span>{s.clock === undefined ? 'Queried inputs' : 'Current logical time'}</span><strong>{s.clock === undefined ? s.inputs.map(input => input.name).join(' + ') : formatReadTime(s, s.clock)}</strong></div>
    </section>
    <section className="read-diagram" aria-label="Retained and complete input windows" data-testid="read-diagram">
      <section ref={refs?.axis} className="read-axis"><span>{s.clock === undefined ? 'Logical time' : 'Logical time (s)'}</span><div>{ticks.map((tick, i) => <span key={tick} style={position(tick, s)} data-edge={i === 0 ? 'first' : i === 5 ? 'last' : undefined}>{s.clock === undefined ? tick : tick / 1000}</span>)}</div></section>
      <section ref={refs?.windows} className="read-lanes" aria-label="Input snapshot windows">
        <div className="read-window-field" aria-hidden="true">
          {window.retained < window.write && <div className="read-shared-window" style={{ left: percent(window.retained, s), width: `${(window.write - window.retained) / (s.axis[1] - s.axis[0]) * 100}%` }} />}
          {time !== undefined && <div className="read-query-cursor" data-state={cursorState} style={position(time, s)} />}
          {s.clock !== undefined && <div className="read-clock" style={position(s.clock, s)} />}
        </div>
        {s.inputs.map(input => <section key={input.id} className="read-lane" data-testid={`read-input-${input.id}`} aria-label={`${input.name}: retained from ${formatReadTime(s, input.retained)}; complete before ${formatReadTime(s, input.write)}`}>
          <div className="read-input-label"><strong data-column={input.id}>{input.name}</strong><span>Retained ≥ {formatReadTime(s, input.retained)}</span><span>Complete &lt; {formatReadTime(s, input.write)}</span></div>
          <div className="read-track timeline-track" aria-hidden="true">
            {ticks.map(tick => <i key={tick} className="timeline-gridline" style={position(tick, s)} />)}
            <div className="read-compacted" style={{ width: percent(input.retained, s) }} /><div className="read-complete timeline-complete" style={{ left: percent(input.retained, s), width: `${(input.write - input.retained) / (s.axis[1] - s.axis[0]) * 100}%` }} />
            <span className="read-retained-marker" style={position(input.retained, s)}>{input.retained !== input.write && <span className="timeline-value">{formatReadTime(s, input.retained)}</span>}</span>
            <span className="read-write-marker timeline-frontier" style={position(input.write, s)}><span className="timeline-value">{formatReadTime(s, input.write)}</span></span>
          </div>
        </section>)}
      </section>
      <div className="read-diagram-bottom"><span className="read-interval" aria-label="Shared complete interval">{revealOutcome ? window.retained < window.write ? `Shared: [${formatReadTime(s, window.retained)}, ${formatReadTime(s, window.write)})` : 'Shared window is empty' : 'Compare the retained and complete boundaries'}</span>
        <div className="read-legend" aria-hidden="true"><span><i className="read-key-frontier" />Frontier</span><span><i className="read-key-complete" />Complete</span><span><i className="read-key-retained" />Retained</span></div>
        <Button variant="ghost" className="read-key" aria-haspopup="dialog" onClick={() => { onInspect?.(); setKeyOpen(true); }}><CircleHelp size={13} aria-hidden="true" />Diagram key</Button>
      </div>
    </section>
    <section ref={refs?.result} className="read-result" data-status={status ?? 'prediction'} aria-label="Query outcome" aria-live="polite">
      <div className="read-result-heading"><strong><Icon size={14} aria-hidden="true" />{status ? statusNames[status] : revealOutcome ? 'Choose a snapshot' : 'Predict the outcome'}</strong><span className={revealOutcome && s.attempt?.age !== undefined ? 'read-snapshot-age' : undefined}>{!revealOutcome ? 'Predict before applying the action' : s.attempt?.age !== undefined ? `Snapshot age: ${s.attempt.age / 1000} s` : s.label}</span></div>
      <p><LessonText content={readText(detail)} /></p>
      {!assessment && <div className="read-support">{s.row && !s.row.ingested ? `Upstream order ${s.row.id} committed · not ingested${s.ingestionPaused ? ' · ingestion paused' : ''}` : s.row?.ingested && !s.row.processed ? `Order ${s.row.id} ingested · processing pending` : s.observed && s.row && revealOutcome ? `Last completed read: ${formatReadTime(s, s.observed.timestamp)} · order ${s.row.id} ${s.observed.rowVisible ? 'present' : 'absent'}` : 'Illustrative timestamp-selection model'}{s.queryMs !== undefined && revealOutcome ? ` · execution ${s.queryMs / 1000} s` : ''}</div>}
    </section>
    {onSelectTime && <div className="read-exploration"><label>Explore a requested time<input aria-label="Requested logical timestamp" type="range" min={s.axis[0]} max={s.axis[1]} step={s.clock === undefined ? 1 : 1000} value={time ?? window.retained} disabled={disabled} onChange={event => onSelectTime(Number(event.target.value))} /></label></div>}
    <Dialog open={keyOpen} onClose={() => setKeyOpen(false)} title="Readable-window diagram key">
      <dl className="read-key-definitions"><div><dt>Retained boundary · square cap</dt><dd>The earliest retained snapshot, inclusive. Earlier history is compacted; this does not delete current business rows.</dd></div><div><dt>Write frontier · solid purple dot</dt><dd>Times strictly below this boundary are complete. The frontier time itself remains open.</dd></div><div><dt>Shared window · vertical shading</dt><dd>The overlap every queried input retains and completes. Its left boundary is included; its right boundary is excluded.</dd></div><div><dt>Query cursor · vertical line</dt><dd>One selected timestamp across all inputs. A waiting cursor is not a returned result. On clock-aligned examples, the dotted line is current logical time.</dd></div></dl>
      <p className="read-key-note">Purple dots mark write frontiers and green bands show retained, complete time. Gray square caps mark retained boundaries; the blue cursor selects one query timestamp. Shapes and text carry meaning in both themes. The simulation does not execute SQL.</p>
    </Dialog>
  </div>;
}
