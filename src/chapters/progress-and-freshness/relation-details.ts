import { inputLimit, lagFor, laneNames, limitingInputs, reactionTime, type LaneId, type ProgressSnapshot } from './simulation';

export interface RelationFact { readonly label: string; readonly value: string }
export interface RelationDetails { readonly facts: readonly RelationFact[]; readonly explanation: string }

/** Interpret only the displayed snapshot; selecting a lane never applies an action. */
export function relationDetails(snapshot: ProgressSnapshot, lane: LaneId, revealTiming = true): RelationDetails {
  const frontier = snapshot.frontiers[lane];
  const unit = snapshot.clock === undefined ? '' : ' s';
  const limiters = limitingInputs(snapshot).map(input => laneNames[input]).join(' and ');
  const queryComplete = snapshot.queryTarget !== undefined && Object.values(snapshot.frontiers).every(value => snapshot.queryTarget! < value);
  const queryEvidence = snapshot.queryTarget === undefined ? ''
    : ` Query target ${snapshot.queryTarget} is ${snapshot.queryTarget < frontier ? 'complete' : 'still open'} at ${laneNames[lane]}.${queryComplete && snapshot.queryMs !== undefined ? ` The ${snapshot.queryMs < 1000 ? `${snapshot.queryMs} ms` : `${snapshot.queryMs / 1000} s`} response measures retrieval time for an already-complete snapshot.` : ''}`;

  if (lane === 'orders' || lane === 'payments') {
    const observed = snapshot.observed[lane] ?? [];
    const latest = observed.at(-1);
    const facts = [
      { label: 'Progress reports', value: snapshot.reports[lane].join(' → ') },
      { label: 'Latest observed change', value: latest ? `${latest.logicalTime}${unit}` : 'None observed' },
      snapshot.clock === undefined
        ? { label: 'Observed changes', value: String(observed.length) }
        : { label: 'Wall-clock lag', value: `${snapshot.clock - frontier} s` },
    ];
    // The authored source-status sample describes Payments, not Orders.
    const status = lane === 'payments' && snapshot.sourceStatus ? `${laneNames[lane]} status: ${snapshot.sourceStatus}. ` : '';
    const role = limitingInputs(snapshot).length === 2
      ? `${laneNames[lane]} shares the input limit with the other source.`
      : limitingInputs(snapshot).includes(lane)
        ? `${laneNames[lane]} limits Paid orders input progress at ${frontier}${unit}.`
        : `${laneNames[lane]} is ahead of ${limiters}; advancing this source alone cannot raise the join's input limit.`;
    const observation = latest
      ? ` Seeing ${latest.logicalTime} does not complete earlier times.${latest.eventTime === undefined ? '' : ` Business event time ${latest.eventTime} is separate from logical time ${latest.logicalTime}.`}`
      : ` Only times below ${frontier} are guaranteed complete.`;
    const timing = snapshot.journey ? ' The timing sample measures the whole update journey; source-only ingestion duration is not sampled.' : '';
    return { facts, explanation: `${status}${role}${observation}${queryEvidence}${timing}` };
  }

  const limit = inputLimit(snapshot, lane);
  const gap = limit - frontier;
  if (lane === 'join') {
    const facts = [
      { label: 'Input limit', value: `${limit}${unit}` },
      { label: 'Limiting input', value: limiters },
      { label: 'Processing gap', value: `${gap}${unit}` },
    ];
    const role = gap === 0
      ? 'Paid orders is caught up to its inputs and adds no computation delay.'
      : snapshot.clock === undefined
        ? `Processing still needed: Paid orders is at ${frontier}, while its inputs permit ${limit}. This logical-time gap is not a row count.`
        : `Paid orders adds ${gap} s of computation delay behind its input limit.`;
    const backlog = snapshot.backlog ? ` Join backlog: ${snapshot.backlog.join(' → ')} changes; inspect join processing and resources.` : '';
    const upstream = gap === 0 && snapshot.clock !== undefined && snapshot.clock > limit
      ? ` Its ${snapshot.clock - frontier} s wall-clock lag comes from source progress at ${limiters}.` : '';
    const timing = snapshot.journey ? ' The timing sample does not split computation duration between Paid orders and Revenue.' : '';
    return { facts, explanation: `${role}${upstream}${backlog}${queryEvidence}${timing}` };
  }

  const lag = lagFor(snapshot, 'revenue');
  const facts = [
    { label: 'Paid orders input limit', value: `${limit}${unit}` },
    { label: 'Local lag', value: `${lag.local}${unit}` },
    { label: 'Inherited computation lag', value: `${lag.inherited}${unit}` },
  ];
  const role = gap === 0
    ? 'Revenue is caught up to Paid orders and adds no local delay.'
    : `Revenue adds ${gap}${unit || ' logical-time units'} of local delay after Paid orders.`;
  const inherited = lag.inherited > 0 ? ` It inherits ${lag.inherited}${unit || ' logical-time units'} of upstream computation delay.` : '';
  const totals = snapshot.clock === undefined ? ''
    : ` Source lag: ${lag.source} s; total computation lag: ${lag.global} s; wall-clock lag: ${lag.wallclock} s.`;
  const timing = revealTiming && snapshot.journey && reactionTime(snapshot.journey);
  const journey = timing ? ` End-to-end freshness delay ${timing.freshness} s + query latency ${timing.query} s = reaction time ${timing.total} s.` : '';
  return { facts, explanation: `${role}${inherited}${totals}${queryEvidence}${journey}` };
}
