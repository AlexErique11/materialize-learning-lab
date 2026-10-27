import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router';
import { EvidenceCard } from './ChallengeEvidence';
import { assistedRun, hasComparison, readyForHandover, type ChallengeRun, type RunAction } from './run';
export function ChallengeReport({ run, dispatch, busy, onValidate }: { run: ChallengeRun; dispatch: (action: RunAction) => void; busy: boolean; onValidate: () => void }) {
  const completed = run.phase === 'completed';
  const ready = readyForHandover(run);
  return <div className="incident-report">
    <div className="incident-report-heading"><ShieldCheck size={30} aria-hidden="true" /><div><span className="eyebrow">Incident handover</span><h2>{completed ? 'Ready for the next sale wave' : 'Demonstrate the repair'}</h2><p>Replay the deployed system against the business contract, then attach your evidence and explanation.</p></div></div>
    <EvidenceCard title="End-to-end acceptance">
      <p>Checks run the deployed query against the incident and an additional order fixture, inspect current serving, and replay the supplied client through split timestamp deliveries.</p>
      <Button variant="primary" disabled={busy} onClick={onValidate}>{busy ? 'Checking deployed system…' : 'Run acceptance checks'}</Button>
      {run.validation && <ul className="incident-checks">{run.validation.checks.map(check => <li key={check.id} data-passed={check.passed}><CheckCircle2 size={18} aria-hidden="true" /><div><strong>{check.passed ? 'Passed' : 'Needs investigation'} · {check.label}</strong><p>{check.detail}</p></div></li>)}</ul>}
    </EvidenceCard>
    <EvidenceCard title="Your investigation evidence">
      {!hasComparison(run) && <p className="incident-notice">Attach observations from before and after a configuration change. Pin real evidence in the workspace; no particular investigation order is required.</p>}
      <ul className="incident-observations">{run.observations.map(o => <li key={o.id}><strong>{o.label}</strong><span>{o.workspace} · {(o.time / 1000).toFixed(3)} s · configuration {o.configuration}</span><pre>{o.detail}</pre></li>)}</ul>
      <label className="incident-label" htmlFor="incident-handover">Explain what caused the discrepancy and how your evidence supports the repair</label><textarea id="incident-handover" rows={5} maxLength={4000} readOnly={completed} value={run.note} onChange={e => dispatch({ type: 'note', value: e.target.value })} />
      <p className="incident-caption">Your explanation is saved as your account of the investigation. Automated checks verify behavior; they do not judge free-text reasoning.</p>
    </EvidenceCard>
    {completed && <div className="incident-notice" data-tone="success" role="status"><strong>{assistedRun(run) ? 'Completed with walkthrough' : 'Completed independently'}</strong><p>Technical behavior verified · {Object.values(run.hints).reduce((sum, n) => sum + (n ?? 0), 0)} hints · {Math.floor(run.activeDurationMs / 60000)} active minutes.</p><p>The inherited query expired orders by arrival time; the customer connection stopped progress; the client published partial timestamps. Your evidence and applied changes document how the system was restored.</p></div>}
    <div className="incident-actions">{!completed && <Button variant="primary" disabled={!ready || !hasComparison(run) || run.note.trim().length < 20 || busy} onClick={() => dispatch({ type: 'complete' })}>Complete handover</Button>}<Button onClick={() => dispatch({ type: 'investigate' })}>Return to investigation</Button><Link className="text-link" to="/">Back to main page</Link></div>
  </div>;
}
