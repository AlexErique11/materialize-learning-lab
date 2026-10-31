import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EvidenceCard } from './ChallengeEvidence';
import { assistedRun, pendingSettings, readyForHandover, type ChallengeRun, type RunAction } from './run';
export function ChallengeReport({ run, dispatch, busy, onValidate }: { run: ChallengeRun; dispatch: (action: RunAction) => void; busy: boolean; onValidate: () => void }) {
  const completed = run.phase === 'completed';
  const ready = readyForHandover(run);
  const completionMessage = busy ? 'Wait for the current execution to finish.'
    : !ready ? 'Run acceptance checks and get all five checks to pass before completing the handover.'
      : 'All five checks passed. You can complete the handover.';
  const hints = Object.values(run.hints).reduce((sum, n) => sum + (n ?? 0), 0);
  const minutes = Math.floor(run.activeDurationMs / 60000);
  const pending = (['source', 'serving', 'client'] as const).filter(group => pendingSettings(run, group));
  return <div className="incident-report">
    <div className="incident-report-heading"><ShieldCheck size={30} aria-hidden="true" /><div><span className="eyebrow">Incident handover</span><h2>{completed ? 'Ready for the next sale wave' : 'Demonstrate the repair'}</h2><p>{completed ? 'The deployed system passed all five checks and the handover is complete.' : 'Run the acceptance checks. When all five pass, complete the handover.'}</p></div></div>
    <EvidenceCard title="End-to-end acceptance" help="acceptance">
      <p>Checks run the deployed query against the incident and an additional order fixture, inspect current serving, and replay the supplied client through split timestamp deliveries.</p>
      {(pending.length > 0 || run.draft !== run.config.predicate) && <p className="incident-notice">You have unapplied edits: {[...(run.draft !== run.config.predicate ? ['SQL query'] : []), ...pending.map(group => `${group} settings`)].join(', ')}. Checks use the applied system. Return to the investigation to apply or discard those edits.</p>}
      <Button variant="primary" disabled={busy} onClick={onValidate}>{busy ? 'Checking deployed system…' : 'Run acceptance checks'}</Button>
      {run.validation && <ul className="incident-checks">{run.validation.checks.map(check => <li key={check.id} data-passed={check.passed}>{check.passed ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}<div><strong>{check.passed ? 'Passed' : 'Needs investigation'} · {check.label}</strong><p>{check.detail}</p></div></li>)}</ul>}
    </EvidenceCard>
    {completed && <div className="incident-notice" data-tone="success" role="status"><strong>{assistedRun(run) ? 'Completed with walkthrough' : 'Completed independently'}</strong><p>Technical behavior verified · {hints} {hints === 1 ? 'hint' : 'hints'} · {minutes} active {minutes === 1 ? 'minute' : 'minutes'}.</p><p>Your deployed system preserves keyed order replacements, expires orders by event time, serves fresh results to both teams within budget, and publishes complete application timestamps.</p></div>}
    {!completed && <p id="incident-completion-requirements" role="status" className="incident-caption">{completionMessage}</p>}
    <div className="incident-actions incident-footer">{!completed && <Button variant="primary" aria-describedby="incident-completion-requirements" disabled={!ready || busy} onClick={() => dispatch({ type: 'complete' })}>Complete handover</Button>}</div>
  </div>;
}
