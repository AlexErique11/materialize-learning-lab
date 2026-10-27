import { useEffect, useRef } from 'react';
import { CheckCircle2, Clock3, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { acceptanceChecks } from './grading';
import { assistedRun, assessmentAt, type ChallengeRun, type RunAction } from './run';
import { EvidenceCard, PipelineStrip, TotalsTable } from './ChallengeEvidence';
import { boundedRead, clientAt, formatTime, stateCost } from './simulation';
import { incidentRules, STAGE_IDS, stageDefinition } from './scenario';

export function ChallengeReport({ run, dispatch, onRestart }: { run: ChallengeRun; dispatch: (action: RunAction) => void; onRestart: () => void }) {
  const checks = acceptanceChecks(run.commits);
  const completed = run.phase === 'completed';
  const hints = Object.values(run.assessments).reduce((total, item) => total + (item?.hints ?? 0), 0);
  const objects = run.commits.find(commit => commit.stage === 'objects')?.answers ?? {};
  const reads = run.commits.find(commit => commit.stage === 'reads')?.answers;
  const finalClient = clientAt(8);
  const lastRead = boundedRead(incidentRules.normalAgeMs, true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }, [completed]);
  return <div className="capstone-report">
    <div className="capstone-report-heading"><ShieldCheck size={34} aria-hidden="true" /><div><span className="eyebrow">Incident handover</span><h2 ref={heading} tabIndex={-1}>{completed ? 'Ready for the next sale wave' : 'Verify the complete system'}</h2><p>{completed ? 'Your repairs passed all six acceptance checks.' : 'Run the final checks against the same order history and committed decisions.'}</p></div></div>
    <PipelineStrip verified={completed ? 6 : run.commits.length} />
    <div className="capstone-report-grid"><EvidenceCard title="Live regional orders"><TotalsTable rows={finalClient.published.map(entry => entry.row)} /><p className="capstone-notice" data-tone="success">Complete changes published through 632.000 s. No changes at that timestamp remain pending.</p></EvidenceCard><EvidenceCard title="Final system metrics" icon={<Clock3 size={17} />}><dl className="capstone-report-metrics"><div><dt>Illustrative state budget</dt><dd>{stateCost(objects)} / {incidentRules.stateBudget} units</dd></div><div><dt>Last read snapshot age</dt><dd>{formatTime(finalClient.publishedBefore! - lastRead.timestamp)}</dd></div><div><dt>Normal snapshot-age limit</dt><dd>{incidentRules.normalAgeMs / 1000} seconds</dd></div></dl><p className="capstone-caption">Last SELECT: 630.000 s. Final wall-clock offset: 632.001 s. Subscription publication and external-source freshness are separate evidence.</p></EvidenceCard></div>
    <EvidenceCard title="Acceptance checks" icon={<ShieldCheck size={17} />}><ul className="capstone-checks">{checks.map(check => <li key={check.id}><CheckCircle2 size={19} aria-hidden="true" data-passed={check.passed} /><div><strong>{check.label}</strong><p>{completed ? check.detail : 'Ready for the final acceptance run.'}</p><span className="capstone-caption">{assessmentAt(run, check.id).workedRepair ? 'Worked repair used' : assessmentAt(run, check.id).hints ? `${assessmentAt(run, check.id).hints} hint(s) used` : 'Solved without assistance'}</span></div><Button size="compact" onClick={() => dispatch({ type: 'review', stage: STAGE_IDS.indexOf(check.id) })}>Review checkpoint</Button></li>)}</ul></EvidenceCard>
    <EvidenceCard title="Your incident summary"><dl className="capstone-handover"><div><dt>Source identity</dt><dd>UPSERT with the stable order-ID key; full values replace prior versions.</dd></div><div><dt>Object design</dt><dd>Regular helper view → final materialized view on transform → local indexes in operations and support.</dd></div><div><dt>Window</dt><dd>Paid orders with event_at ≤ logical time &lt; event_at + five minutes.</dd></div><div><dt>Root cause and evidence</dt><dd>The customer connection was paused at frontier 623.000 s. Its stopped progress limited the aggregate and serving index; the query itself took 40 ms.</dd></div><div><dt>Incident read response</dt><dd>{reads?.failure === 'fallback' ? 'Explicitly labeled ten-second fallback at 622.999 s, aged 7.001 s.' : 'Explicit unavailable response until the normal three-second age bound could be met.'} After catch-up, a new normal read succeeded at 630.000 s.</dd></div><div><dt>Client publication</dt><dd>Initialize from a complete snapshot. Consolidate signed full rows; publish the 632.000 s replacement at P(632.001).</dd></div></dl></EvidenceCard>
    {completed && <div role="status" className="capstone-completion"><CheckCircle2 size={22} aria-hidden="true" /><div><strong>{assistedRun(run) ? 'Completed with walkthrough' : 'Completed independently'}</strong><p>{hints} hint(s) used · {Math.floor(run.activeDurationMs / 60000)} active minutes · saved separately from chapter progress.</p></div></div>}
    <div className="capstone-report-actions">{!completed && <Button variant="primary" onClick={() => dispatch({ type: 'complete' })} disabled={!checks.every(check => check.passed)}><ShieldCheck size={16} aria-hidden="true" />Run acceptance checks</Button>}<Button onClick={onRestart}><RotateCcw size={15} aria-hidden="true" />Replay challenge</Button><Link to="/" className="text-link">Back to main page</Link></div>
    <details className="capstone-inspector"><summary>Review the relevant lectures</summary><ul>{STAGE_IDS.map(id => <li key={id}><Link className="text-link" to={stageDefinition(id).lessonPath} target="_blank" rel="noopener noreferrer">{stageDefinition(id).lesson} (opens a new tab)</Link></li>)}</ul></details>
  </div>;
}
