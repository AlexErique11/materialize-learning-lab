import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, Clock3, Flag, Lightbulb, Pause, Play, RotateCcw, Undo2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { publicAsset } from '../../app/publicAsset';
import { ActivityHeading } from '../../components/lab/ActivityHeading';
import { ShortcutHelp } from '../../components/lab/ShortcutHelp';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useLabShortcuts } from '../../hooks/useLabShortcuts';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useChangeMotion } from '../../motion/useChangeMotion';
import { useWorkspaceMotion } from '../../motion/useWorkspaceMotion';
import { businessRequirements, initialPredicate, incidentMessage, traceTimes, workspaces, workspaceHints, type TraceFrame } from './incident';
import { useChallengeRun } from './useChallengeRun';
import { EvidenceCard } from './ChallengeEvidence';
import { ChallengeHelp } from './ChallengeHelp';
import { ChallengeReport } from './ChallengeReport';
import { ClientPanel, DashboardPanel, DataPanel, SystemPanel } from './InvestigationPanels';
import { InvestigationSql, previewKey, type QueryPreview } from './InvestigationSql';
import { aggregateSql } from './predicate';
import { SqlClient } from './sqlClient';
import { validateIncident } from './grading';
import { documentationLinks } from './scenario';
import '../../styles/lesson.css';
import './challenge.css';

const shortcuts = { 'Control+Enter': '[data-incident-action="run-sql"]', ArrowRight: '[data-incident-action="advance"]', h: '[data-incident-action="hint"]', r: '[data-incident-action="restart"]', s: '.incident-reference [data-dialog-close], [data-incident-action="reference"]' };
const briefingWatermark = (
  <svg className="incident-brief-logo" viewBox="27 39 146 122" aria-hidden="true" focusable="false">
    <image href={publicAsset('materialize-logo-transparent.png')} width="200" height="200" />
  </svg>
);
export function LiveOrderOperationsPage() {
  const [dialog, setDialog] = useState<'reference' | 'brief' | 'restart' | 'help' | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const controller = useChallengeRun(Boolean(dialog) || shortcutsOpen);
  const { run, progress, isPaused, dispatch } = controller;
  const [client] = useState(() => new SqlClient());
  const [retry, setRetry] = useState(0);
  const [traceState, setTrace] = useState<{ key: string; frames: TraceFrame[] | null; error: string }>({ key: '', frames: null, error: '' });
  const [mode, setMode] = useState<'repair' | 'diagnostic'>('repair');
  const [preview, setPreview] = useState<QueryPreview | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const operationId = useRef(0);
  const latest = useRef({ run, mode }); latest.current = { run, mode };
  const pageRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const queryKey = JSON.stringify([run.id, run.config.predicate, run.config.source, retry]);
  const trace = traceState.key === queryKey ? traceState.frames : null;
  const traceError = traceState.key === queryKey ? traceState.error : '';
  const active = run.phase === 'investigating';
  usePageTitle('Save the Flash Sale');
  useLabShortcuts(pageRef, shortcuts, active && !isPaused && !shortcutsOpen);
  useWorkspaceMotion(pageRef, `${run.phase}-${run.workspace}`);
  useChangeMotion(contentRef, `${run.phase}-${run.workspace}-${isPaused}`, true, 'workspace');
  useEffect(() => {
    operationId.current++; setOperation(null); setPreview(null); setError('');
    return () => { operationId.current++; client.cancel(); };
  }, [client, run.id]);
  useEffect(() => {
    if (run.phase === 'briefing') return;
    let current = true;
    setTrace({ key: queryKey, frames: null, error: '' });
    void client.request({ kind: 'trace', predicate: run.config.predicate, source: run.config.source }).then(response => {
      if (current) setTrace({ key: queryKey, frames: response.trace!, error: '' });
    }, failure => { if (current) setTrace({ key: queryKey, frames: null, error: failure.message }); });
    return () => { current = false; };
  }, [client, queryKey, run.phase === 'briefing']);
  useEffect(() => { setNotice(''); setError(''); }, [run.workspace, run.id]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [run.workspace, run.phase]);
  const runSql = async () => {
    if (operation) return;
    const id = ++operationId.current;
    const key = previewKey(run, mode);
    setOperation('Executing SQL…'); setError(''); setNotice('');
    try {
      const sql = mode === 'repair' ? aggregateSql(run.draft) : run.diagnostic;
      const output = (await client.request({ kind: 'query', sql, source: run.config.source, time: traceTimes[run.frame]! })).output!;
      const inherited = mode === 'repair' ? (await client.request({ kind: 'query', sql: aggregateSql(initialPredicate), source: { envelope: 'UPSERT', key: 'order_id' }, time: traceTimes[run.frame]! })).output : undefined;
      if (id === operationId.current && previewKey(latest.current.run, latest.current.mode) === key) setPreview({ key, output, inherited });
    } catch (failure) { if (id === operationId.current && previewKey(latest.current.run, latest.current.mode) === key) setError(failure instanceof Error ? failure.message : 'SQL execution failed.'); }
    finally { if (id === operationId.current) setOperation(null); }
  };
  const validate = async () => {
    if (operation) return;
    const id = ++operationId.current;
    const validationKey = (r: typeof run) => JSON.stringify([r.id, r.configurationRevision, r.time, r.processed, r.read]);
    const key = validationKey(run);
    setOperation('Replaying acceptance scenarios…'); setError('');
    try {
      const checks = await validateIncident(run, client);
      if (id === operationId.current && validationKey(latest.current.run) === key) dispatch({ type: 'validation', runId: run.id, configuration: run.configurationRevision, checks });
      else if (id === operationId.current) setNotice('The incident changed during validation. Run the checks again against the current deployment.');
    } catch (failure) { if (id === operationId.current) setError(failure instanceof Error ? failure.message : 'Validation failed to execute.'); }
    finally { if (id === operationId.current) setOperation(null); }
  };
  const cancel = () => { operationId.current++; client.cancel(); setOperation(null); setPreview(null); setError('Execution cancelled. Drafts and applied changes are preserved.'); setRetry(value => value + 1); };
  const props = { run, trace, dispatch };
  const brief = <><p className="incident-quotation">“{incidentMessage}”</p><p>You have inherited Northstar Shop’s dashboard. Investigate the system, make reversible changes, and verify that it meets the operating contract. Choose where to look and what to test.</p><div className="incident-section-heading"><h3 className="incident-subheading">Operating contract</h3><ChallengeHelp topic="contract" /></div><ul className="incident-requirements">{businessRequirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul></>;
  const hintCount = run.hints[run.workspace] ?? 0;
  return <section ref={pageRef} className="guided-lab-page incident-page" data-phase={run.phase}>
    <div className="guided-lab-top-row"><Breadcrumbs items={[{ label: 'Learning path', to: '/' }, { label: 'Challenge' }]} />{run.phase !== 'briefing' && <ShortcutHelp lecture={false} challenge showReference onOpenChange={setShortcutsOpen} />}</div>
    <ActivityHeading title="Save the Flash Sale" description="Investigate the discrepancy. Repair the system. Prove it is ready for the next sale wave." controlsLabel="Challenge controls" controls={run.phase === 'briefing' ? <span className="incident-duration"><Clock3 size={15} aria-hidden="true" />10–20 minutes · Chapters 1–8</span> : <><span className="incident-status">{run.phase === 'completed' ? 'Handed over' : run.phase === 'handover' ? 'Handover' : 'Investigating'}</span><Button data-incident-action="reference" onClick={() => setDialog('reference')} aria-keyshortcuts="S">Reference</Button>{active && <span className="incident-control-help"><Button onClick={() => controller.setIsPaused(!isPaused)}>{isPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{isPaused ? 'Resume' : 'Pause'}</Button><ChallengeHelp topic="pause" /></span>}{active && <Button variant="primary" onClick={() => dispatch({ type: 'handover' })}>Submit handover<ArrowRight size={14} aria-hidden="true" /></Button>}</>} />
    {progress.recovery && <p role="status" className="incident-notice">The saved investigation is incompatible or incomplete. A new attempt is available; valid historical achievements are preserved.</p>}
    {progress.memoryOnly && <p role="status" className="incident-notice">Storage is unavailable. You can continue for this session, but closing the tab will lose its progress.</p>}
    <div ref={contentRef} className="incident-content">
      {run.phase === 'briefing' ? <div className="incident-brief-grid"><EvidenceCard title="An incident from operations" help="brief" trailing={briefingWatermark} icon={<Flag size={18} aria-hidden="true" />}>{brief}<div className="incident-actions"><Button variant="primary" onClick={() => dispatch({ type: 'start' })}>Start investigation<ArrowRight size={16} aria-hidden="true" /></Button><Link className="text-link" to="/">Back to main page</Link></div></EvidenceCard><EvidenceCard title="Your working environment" help="environment" trailing={briefingWatermark} icon={<BookOpen size={18} aria-hidden="true" />}><p>Explore the data, deployed SQL, system observations, and application in any order. Test your changes and verify the system against the operating contract.</p><p>SQL queries execute locally. Streaming, connection progress, and cluster behavior use the lab simulation. No database credentials or infrastructure setup are needed.</p><p>Pause at any time. Drafts and applied changes resume automatically. Hints and worked repairs are optional and recorded honestly.</p>{progress.achievements.some(a => a.scenarioVersion === 1) && <p className="incident-notice">First version · historical completion preserved. This investigation is a separate attempt.</p>}{progress.achievements.some(a => a.scenarioVersion === 2) && <p className="incident-notice">Previous investigation completion saved. Replaying preserves it and all chapter progress.</p>}</EvidenceCard></div> : <>
        {active && <nav className="incident-tabs" aria-label="Investigation workspaces">{workspaces.map(workspace => <button key={workspace} type="button" aria-current={run.workspace === workspace ? 'page' : undefined} onClick={() => dispatch({ type: 'workspace', workspace })}>{workspace}</button>)}</nav>}
        {active && <div className="incident-workspace-bar"><div><span className="eyebrow">Northstar Shop · Operations incident</span><p>{incidentMessage}</p></div><Button size="compact" onClick={() => setDialog('brief')}>Incident brief</Button></div>}
        {isPaused && active ? <div className="incident-paused" role="status"><Pause size={28} aria-hidden="true" /><h2>Investigation paused</h2><p>The incident clock does not advance while you read or edit. Your work is preserved.</p><Button variant="primary" onClick={() => controller.setIsPaused(false)}>Resume investigation</Button></div> : <>
          {operation && <div className="incident-runtime" role="status"><span className="incident-spinner" aria-hidden="true" />{operation}<Button size="compact" onClick={cancel}>Cancel execution</Button></div>}
          {!trace && <div className="incident-runtime" role="status">{traceError ? <><span>{traceError}</span><Button onClick={() => { client.cancel(); setRetry(n => n + 1); }}>Retry SQL engine</Button></> : <><span className="incident-spinner" aria-hidden="true" />Preparing the local SQL workspace… You can inspect data and configuration while it starts.</>}</div>}
          {notice && <p role="status" className="incident-notice">{notice}</p>}
          {error && run.workspace !== 'SQL' && <p role="alert" className="incident-notice" data-tone="warning">{error}</p>}
          {active ? <div className="incident-workspace" aria-label={`${run.workspace} workspace`}>
            {run.workspace === 'Dashboard' && <DashboardPanel {...props} />}
            {run.workspace === 'Data' && <DataPanel {...props} />}
            {run.workspace === 'SQL' && <InvestigationSql {...props} mode={mode} setMode={next => { setMode(next); setError(''); }} preview={preview} busy={Boolean(operation)} error={error} onRun={() => void runSql()} onDeploy={() => { if (preview?.key === previewKey(run, 'repair') && !operation) { dispatch({ type: 'deploy', runId: run.id, configuration: run.configurationRevision, predicate: run.draft }); setNotice('Query deployed. Dependent snapshots and the subscription baseline were invalidated.'); } }} />}
            {run.workspace === 'System' && <SystemPanel {...props} />}
            {run.workspace === 'Client' && <ClientPanel {...props} />}
          </div> : <ChallengeReport run={run} dispatch={dispatch} busy={Boolean(operation)} onValidate={() => void validate()} />}
        </>}
        {active && <><div className="incident-details-with-help incident-change-history"><details className="incident-details"><summary>Applied change history</summary><ol className="incident-change-log">{run.changes.map((change, index) => <li key={index}>{(change.time / 1000).toFixed(3)} s · {change.label}</li>)}</ol></details><ChallengeHelp topic="history" /></div><div className="incident-actions incident-footer"><Link className="text-link" to="/"><ArrowLeft size={14} aria-hidden="true" />Back to main page</Link><Button data-incident-action="hint" aria-keyshortcuts="H" variant="ghost" onClick={() => setDialog('help')}><Lightbulb size={14} aria-hidden="true" />Investigation help</Button><Button variant="ghost" disabled={!run.undo.length} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={14} aria-hidden="true" />Undo last change</Button></div></>}
        <div className="incident-reset"><Button data-incident-action="restart" aria-keyshortcuts="R" variant="ghost" onClick={() => setDialog('restart')}><RotateCcw size={14} aria-hidden="true" />Restart challenge</Button></div>
      </>}
    </div>
    <Dialog open={dialog === 'brief'} onClose={() => setDialog(null)} title="Incident brief">{brief}</Dialog>
    <Dialog open={dialog === 'reference'} onClose={() => setDialog(null)} title="Incident reference" className="incident-reference"><h3 className="incident-subheading">Schemas and time</h3><pre className="incident-code">{'orders(order_id, customer_id, status, amount, event_at, arrived_at)\ncustomers(customer_id, region)'}</pre><p>Event time records when the business event occurred. Arrival time records ingestion. SQL timestamps use UTC on 1 January 2026; displays show seconds from that same origin. The local mz_now() compatibility function freezes logical time at the selected replay snapshot.</p><p>Materialize supports mz_now() directly compared with a row timestamp expression, combining temporal comparisons with AND. Place interval arithmetic on the row expression.</p><h3 className="incident-subheading">Operating contract</h3><ul className="incident-requirements">{businessRequirements.map(text => <li key={text}>{text}</li>)}</ul><p className="incident-caption">SQL results execute in local PostgreSQL (PGlite). The clock compatibility function models supported timestamp comparisons, not Materialize's full mz_timestamp type. Sources, maintained progress, read policies, state units, and subscriptions are explicitly simulated. Quiet external sources and unsent business changes are separate from a complete ingested snapshot.</p><ul className="incident-reference-links">{documentationLinks.map(link => <li key={link.href}><a href={link.href} target="_blank" rel="noopener noreferrer" className="text-link">{link.label}</a></li>)}</ul><Link className="text-link" to="/labs" target="_blank" rel="noopener noreferrer">Review the lectures (opens a new tab)</Link></Dialog>
    <Dialog open={dialog === 'help'} onClose={() => setDialog(null)} title="Investigation help" eyebrow={run.workspace}><p>Help is optional. Hints are recorded; a worked repair marks the eventual completion as assisted.</p><ol className="incident-requirements">{workspaceHints[run.workspace].slice(0, hintCount).map(hint => <li key={hint}>{hint}</li>)}</ol><div className="incident-actions"><Button disabled={hintCount >= 3} onClick={() => dispatch({ type: 'hint', workspace: run.workspace })}>Get next hint</Button>{['SQL', 'System', 'Client'].includes(run.workspace) && <Button onClick={() => { dispatch({ type: 'worked', workspace: run.workspace }); setDialog(null); setNotice(run.workspace === 'SQL' ? 'Worked SQL repair placed in the editor. Run and deploy it to change the system.' : 'Worked intervention applied. Verify its consequences in the incident.'); }}>Show worked repair</Button>}</div></Dialog>
    <Dialog open={dialog === 'restart'} onClose={() => setDialog(null)} title="Restart this investigation?"><p>This replaces your active investigation and drafts. Prior achievements, the first version's saved run, and chapter completions stay preserved.</p><div className="incident-actions"><Button onClick={() => setDialog(null)}>Keep this run</Button><Button variant="primary" onClick={() => { client.cancel(); controller.restart(); setDialog(null); setNotice(''); }}>Restart investigation</Button></div></Dialog>
  </section>;
}
