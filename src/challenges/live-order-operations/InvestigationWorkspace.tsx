import { useState, type ReactNode } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ChallengeHelp } from './ChallengeHelp';
import { pendingSettings, type ChallengeRun, type RunAction, type SettingsGroup } from './run';
import { formatTime } from './simulation';

export function Scope({ children }: { children: ReactNode }) {
  return <span className="incident-scope">{children}</span>;
}

export function WorkspacePair({ controls, secondaryControls, children }: { controls: ReactNode; secondaryControls?: ReactNode; children: ReactNode }) {
  return <div className="incident-workspace-pair">
    <div className="incident-controls" aria-label="Controls and selections">{controls}{secondaryControls && <div className="incident-secondary-controls">{secondaryControls}</div>}</div>
    <div className="incident-results" aria-label="Read-only results">{children}</div>
  </div>;
}

export function SettingsActions({ run, dispatch, group }: { run: ChallengeRun; dispatch: (action: RunAction) => void; group: SettingsGroup }) {
  const pending = pendingSettings(run, group);
  return <>
    <p className="incident-draft-status" data-pending={pending}>{pending ? 'Not applied · your edits are saved as a draft.' : 'Settings match the applied system.'}</p>
    <div className="incident-actions">
      <Button variant="primary" disabled={!pending} onClick={() => dispatch({ type: 'apply-settings', group })}>Apply changes</Button>
      <Button disabled={!pending} onClick={() => dispatch({ type: 'discard-settings', group })}>Discard edits</Button>
    </div>
  </>;
}

export function SharedIncidentState({ run, dispatch }: { run: ChallengeRun; dispatch: (action: RunAction) => void }) {
  const [expanded, setExpanded] = useState(false);
  const next = run.time < 631000 ? '631 s · subscription baseline; order values unchanged' : run.time < 632000 ? '632 s · order 101 amount changes from 70 to 90' : null;
  return <section className="incident-shared" aria-label="Shared incident state" data-expanded={expanded}>
    <div className="incident-shared-heading"><strong>Shared system</strong><ChallengeHelp topic="sharedState" /><span className="incident-shared-description">Applied values across all workspaces</span><Button className="incident-state-toggle" size="compact" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide details' : 'Show details'}</Button></div>
    <p className="incident-state-compact">{formatTime(run.time)} · {run.config.connected ? 'Running' : 'Paused'} · {run.processed ? 'Caught up' : run.config.connected ? 'Updates pending' : 'Waiting for connection'}</p>
    <dl className="incident-state-values">
      <div><dt>Incident time</dt><dd data-motion-value>{formatTime(run.time)}</dd></div>
      <div><dt>Applied query</dt><dd>Version {run.queryRevision + 1}</dd></div>
      <div><dt>Customer connection</dt><dd>{run.config.connected ? 'Running' : 'Paused'}</dd></div>
      <div><dt>Processing</dt><dd>{run.processed ? 'Caught up' : run.config.connected ? 'Updates pending' : 'Waiting for connection'}</dd></div>
      <div><dt>Client position</dt><dd>{run.deliveries} {run.deliveries === 1 ? 'delivery' : 'deliveries'} received</dd></div>
    </dl>
    <div className="incident-replay-controls">
      <div><Clock3 size={16} aria-hidden="true" /><span><strong>{next ? `Next: ${next}` : 'All incident events are available.'}</strong><small>Manual replay · time moves forward only. Reading and editing do not advance it.</small></span></div>
      <Button size="compact" data-incident-action="advance" disabled={!next} onClick={() => dispatch({ type: 'advance' })}>Advance incident<ArrowRight size={14} aria-hidden="true" /></Button>
    </div>
  </section>;
}
