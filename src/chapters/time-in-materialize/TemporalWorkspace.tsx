import { Fragment, type RefObject } from 'react';
import { Clock3, Database, Table2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { EmptyTableRows } from '../../components/ui/EmptyTableRows';
import { DiffBadge } from '../../components/lesson/DiffBadge';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { formatTemporalTime } from './simulation';
import type { TemporalAction, TemporalDiff, TemporalRow, TemporalSnapshot } from './types';
import type { TemporalStage } from './scenarios';

export type { TemporalStage } from './scenarios';

const stages: readonly { id: TemporalStage; title: string }[] = [
  { id: 'source', title: 'Source' }, { id: 'timeline', title: 'Timeline' }, { id: 'result', title: 'Result' },
];

export function temporalPredicate(state: TemporalSnapshot) {
  if (state.predicate === 'explicit-deadline') return 'mz_now() >= event_ts AND mz_now() < expires_at';
  const expiration = `mz_now() ${state.predicate === 'inclusive-window' ? '<=' : '<'} event_ts + INTERVAL '${state.windowMs / 1000} seconds'`;
  return state.predicate === 'bounded-window' ? 'mz_now() >= event_ts AND ' + expiration : expiration;
}

function fields(row: TemporalRow, explicit: boolean) {
  return [
    { key: 'eventId', label: 'event_id', value: String(row.eventId) },
    { key: 'eventTime', label: 'event_ts', value: formatTemporalTime(row.eventTimeMs) },
    ...(explicit ? [{ key: 'expiresAt', label: 'expires_at', value: formatTemporalTime(row.expiresAtMs!) }] : []),
  ];
}

function EventTable({ state, result, highlight }: { state: TemporalSnapshot; result: boolean; highlight: boolean }) {
  const rows = result ? state.resultRows : state.sourceRows;
  const diffs = result ? state.resultDiffs : state.sourceDiffs;
  const explicit = state.predicate === 'explicit-deadline';
  const headers = ['event_id', 'event_ts', ...(explicit ? ['expires_at'] : [])];
  return <Table caption={result ? 'Current temporal result' : 'Source events'} data-testid={result ? 'temporal-result-table' : 'temporal-source-table'}>
    <thead><tr>{headers.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map((row) => {
      const addition = highlight && diffs.some((entry) => entry.diff === 1 && entry.row.eventId === row.eventId);
      const old = diffs.find((entry) => entry.diff === -1 && entry.row.eventId === row.eventId)?.row;
      const previousFields = old && fields(old, explicit);
      return <tr key={row.eventId}>{fields(row, explicit).map((field, index) => <td key={field.key} data-column={field.key}
        data-changed={addition && (!previousFields || previousFields[index]?.value !== field.value)}>{field.value}</td>)}</tr>;
    })}<EmptyTableRows count={3 - rows.length} columns={headers.length} /></tbody>
  </Table>;
}

function ResultChanges({ state, diffRef, initial }: { state: TemporalSnapshot; diffRef: RefObject<HTMLElement | null>; initial: boolean }) {
  const explicit = state.predicate === 'explicit-deadline';
  const status = state.fixtureReset ? 'New query fixture' : initial ? 'Initial state' : 'No net changes';
  return <section ref={diffRef} className="temporal-diffs" data-testid="temporal-diffs" aria-label="Latest result changes">
    <h3>Latest result changes <span>{state.resultDiffs.length > 0 && formatTemporalTime(state.resultDiffs[0]!.timeMs)}</span></h3>
    <ul>{state.resultDiffs.map((entry: TemporalDiff, index: number) => {
      const opposite = state.resultDiffs.find((other) => other.diff !== entry.diff && other.row.eventId === entry.row.eventId);
      const otherFields = opposite && fields(opposite.row, explicit);
      return <li key={index}><DiffBadge diff={entry.diff} /><span className="temporal-tuple">({fields(entry.row, explicit).map((field, i) =>
        <Fragment key={field.key}>{i > 0 && ', '}<span data-column={field.key} data-changed={!otherFields || otherFields[i]?.value !== field.value}>{field.value}</span></Fragment>
      )})</span></li>;
    })}{Array.from({ length: 2 - state.resultDiffs.length }, (_, index) => <li key={'empty-' + index} aria-hidden={state.resultDiffs.length > 0 || index > 0}>{state.resultDiffs.length === 0 && index === 0 ? status : '\u00a0'}</li>)}</ul>
  </section>;
}

function ClockSample({ state, clockRef }: { state: TemporalSnapshot; clockRef: RefObject<HTMLDivElement | null> }) {
  // These are independent ad-hoc query samples, never columns of the maintained view.
  const systemTime = state.logicalTimeMs + 2000;
  return <div ref={clockRef} className="temporal-clocks" data-testid="temporal-clocks">
    <dl>{[
      { label: 'System', value: systemTime, help: 'System clock at query', description: 'Illustrative serializable query sample. now() stays fixed within its transaction; the query can read an earlier logical time. This value samples the system clock when the query runs.' },
      { label: 'now()', value: systemTime, help: 'Transaction start: now()', description: 'The system clock sampled at transaction start. now() stays fixed within its transaction.' },
      { label: 'mz_now()', value: state.logicalTimeMs, help: 'Query time: mz_now()', description: 'The logical timestamp of the query. A serializable query can read an earlier logical time than the system clock.' },
    ].map(({ label, value, help, description }) => <div key={label}><dt>{label}<RelationHelp label={help} text={description} /></dt><dd>{formatTemporalTime(value)}</dd></div>)}</dl>
  </div>;
}

function LifetimeChart({ state, rowSlots }: { state: TemporalSnapshot; rowSlots: number }) {
  const minimum = 0;
  const maximum = 40000;
  const position = (time: number) => Math.max(0, Math.min(100, 100 * (time - minimum) / (maximum - minimum)));
  const currentIds = new Set(state.sourceRows.map((row) => row.eventId));
  const visibleIds = new Set(state.resultRows.map((row) => row.eventId));
  return <div className="temporal-chart" role="group" aria-label="Event lifetime timeline, seconds after the fixed UTC origin" data-testid="temporal-lifetime-chart">
    <div className="temporal-axis"><span>Event</span><div>{[0, 10, 20, 30, 40].map((seconds) => <span key={seconds} style={{ left: `${position(seconds * 1000)}%` }}>{seconds}s</span>)}</div><span>State</span></div>
    <div className="temporal-lanes">{state.timeline.map((entry) => {
      const eligibility = state.eligibility.find((item) => item.eventId === entry.eventId);
      const start = eligibility?.entryAtMs ?? minimum;
      const end = eligibility?.exitAtMs ?? entry.row.expiresAtMs ?? entry.row.eventTimeMs + state.windowMs;
      const status = !currentIds.has(entry.eventId) ? 'Deleted' : visibleIds.has(entry.eventId) ? 'Visible' : state.logicalTimeMs < start ? 'Waiting' : 'Expired';
      const eligibleDescription = eligibility ? `Current eligibility: ${eligibility.entryAtMs === null ? 'no entry bound' : 'from ' + formatTemporalTime(start) + ', inclusive'}; until ${formatTemporalTime(end)}, ${eligibility.exitInclusive ? 'inclusive' : 'exclusive'}.` : 'Deleted from the source.';
      const historyDescription = entry.segments.length ? entry.segments.map((segment) => `Visible from ${formatTemporalTime(segment.startMs)} until ${segment.endMs === null ? 'the displayed time' : formatTemporalTime(segment.endMs)}`).join('; ') : 'No visible history';
      const obsolete = state.canceledDeadlines.filter((marker) => marker.eventId === entry.eventId);
      return <div className="temporal-lane" role="group" key={entry.eventId} aria-label={`Event ${entry.eventId}: ${status}; event time ${formatTemporalTime(entry.row.eventTimeMs)}; applied at ${formatTemporalTime(entry.appliedAtMs)}. ${eligibleDescription} ${historyDescription}. ${obsolete.map((marker) => 'Obsolete deadline: ' + formatTemporalTime(marker.deadlineMs)).join('; ')}`}>
        <strong>{entry.eventId}</strong><div className="temporal-track">
          {eligibility && <span className="temporal-eligible" style={{ left: `${position(start)}%`, width: `${Math.max(0, position(end) - position(start))}%` }} data-inclusive={eligibility.exitInclusive} title={`Eligible until ${formatTemporalTime(end)}${eligibility.exitInclusive ? ', inclusive' : ', exclusive'}`} />}
          {entry.segments.map((segment, index) => <span key={index} className="temporal-visible-band" style={{ left: `${position(segment.startMs)}%`, width: `${Math.max(0, position(Math.min(segment.endMs ?? state.logicalTimeMs, state.logicalTimeMs)) - position(segment.startMs))}%` }} />)}
          <span className="temporal-event-marker" style={{ left: `${position(entry.row.eventTimeMs)}%` }} title={'Event time: ' + formatTemporalTime(entry.row.eventTimeMs)} />
          <span className="temporal-applied-marker" style={{ left: `${position(entry.appliedAtMs)}%` }} title={'Applied at: ' + formatTemporalTime(entry.appliedAtMs)} />
          {state.canceledDeadlines.filter((marker) => marker.eventId === entry.eventId).map((marker, index) => <span key={index} className="temporal-canceled" style={{ left: `${position(marker.deadlineMs)}%` }} title={'Obsolete deadline: ' + formatTemporalTime(marker.deadlineMs)}>×</span>)}
          <span className="temporal-cursor" style={{ left: `${position(state.logicalTimeMs)}%` }} aria-hidden="true" />
        </div><span className="temporal-row-status" data-visible={status === 'Visible'}>{status}</span>
      </div>;
    })}{Array.from({ length: rowSlots - state.timeline.length }, (_, index) => <div key={'empty-' + index} className="temporal-lane temporal-empty-lane" aria-hidden="true"><span>—</span><div className="temporal-track"><span className="temporal-cursor" style={{ left: `${position(state.logicalTimeMs)}%` }} /></div><span /></div>)}
    </div>
    <p className="temporal-legend"><span>○ Event time</span><span>◇ Applied at</span><span>Outline: current eligibility</span><span>Filled: visible history</span></p>
  </div>;
}

export function TemporalWorkspace({ state, activeStage, onSelectStage, guided, highlight, hasClocks, refs, clockRef, diffRef, upcoming, initial, concealPredicate = false }: {
  state: TemporalSnapshot; activeStage: TemporalStage; onSelectStage: (stage: TemporalStage) => void; guided: boolean;
  highlight: boolean; hasClocks: boolean;
  refs: Record<TemporalStage, RefObject<HTMLElement | null>>; clockRef: RefObject<HTMLDivElement | null>; diffRef: RefObject<HTMLElement | null>;
  upcoming: TemporalAction | undefined;
  initial: boolean;
  concealPredicate?: boolean;
}) {
  const nextTime = upcoming && (upcoming.kind === 'switch-fixture' ? upcoming.fixture.logicalTimeMs : upcoming.timeMs);
  return <>
    <nav className="temporal-panel-tabs" aria-label="Workspace panels">{stages.map((stage) =>
      <Button key={stage.id} aria-pressed={activeStage === stage.id} disabled={guided} onClick={() => onSelectStage(stage.id)}>{stage.title}</Button>
    )}</nav>
    <div className="temporal-workspace" data-selected-stage={activeStage} data-guided={guided} data-walkthrough="lecture-workspace">
      <section ref={refs.source} className="temporal-panel temporal-panel-source" data-stage="source" data-active={guided && activeStage === 'source'} aria-label="Source events">
        <header className="temporal-panel-heading"><h2><Database size={18} aria-hidden="true" />Source events<RelationHelp label="Source events" text="The input rows currently present. Expiration changes the filtered result, not this table. Event timestamps are row data; input application times are shown on the timeline." /></h2><code>FROM events</code></header>
        <EventTable state={state} result={false} highlight={highlight && activeStage === 'source'} />
        <p className="temporal-source-note">{upcoming ? `Next: ${upcoming.kind === 'switch-fixture' ? 'new query fixture' : upcoming.kind === 'advance' ? 'advance logical time' : upcoming.kind + ' input'} at ${formatTemporalTime(nextTime!)}` : 'Expiration does not delete source rows.'}</p>
      </section>
      <section ref={refs.timeline} className="temporal-panel temporal-panel-timeline" data-stage="timeline" data-active={guided && activeStage === 'timeline'} data-testid="temporal-timeline" aria-label="Row lifetimes">
        <header className="temporal-panel-heading"><h2><Clock3 size={18} aria-hidden="true" />Row lifetimes<RelationHelp label="Row lifetimes" text="All times are seconds after 2026-01-01 12:00:00 UTC. Outlines show eligibility; filled segments show actual visibility up to the logical-time cursor. Markers are a teaching model, not Materialize's internal timer queue." /></h2>
          <span className="temporal-fixture" data-testid="temporal-fixture-label">{state.fixtureLabel}</span>
        </header>
        {hasClocks && <ClockSample state={state} clockRef={clockRef} />}
        <code className="temporal-predicate">{concealPredicate ? 'Choose a temporal filter to evaluate these events.' : 'WHERE ' + temporalPredicate(state)}</code>
        <LifetimeChart state={state} rowSlots={hasClocks ? 1 : 3} />
      </section>
      <section ref={refs.result} className="temporal-panel temporal-panel-result" data-stage="result" data-active={guided && activeStage === 'result'} aria-label="Current result">
        <header className="temporal-panel-heading"><h2><Table2 size={18} aria-hidden="true" />Current result<RelationHelp label="Current result" text="Rows passing this fixture's temporal predicate at the displayed logical time. The signed changes below are one complete logical timestamp. New query fixtures start a separate result." /></h2><code>SELECT event_id, event_ts{state.predicate === 'explicit-deadline' ? ', expires_at' : ''}</code></header>
        <EventTable state={state} result highlight={highlight && activeStage === 'result'} />
        <ResultChanges state={state} diffRef={diffRef} initial={initial} />
      </section>
    </div>
  </>;
}
