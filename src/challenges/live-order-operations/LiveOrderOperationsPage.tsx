import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, Flag, Lightbulb, RotateCcw, Undo2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { publicAsset } from '../../app/publicAsset';
import { ActivityHeading } from '../../components/lab/ActivityHeading';
import { ShortcutHelp } from '../../components/lab/ShortcutHelp';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Dialog } from '../../components/ui/Dialog';
import { focusLabContext, isShortcutInteraction } from '../../components/ui/keyboardFocus';
import { useLabShortcuts } from '../../hooks/useLabShortcuts';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useChangeMotion } from '../../motion/useChangeMotion';
import { useWorkspaceMotion } from '../../motion/useWorkspaceMotion';
import { businessRequirements, initialPredicate, incidentMessage, traceTimes, workspaces, workspaceHints, type TraceFrame } from './incident';
import { useChallengeRun } from './useChallengeRun';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { useChallengeWalkthrough } from './useChallengeWalkthrough';
import type { ChallengeRun, RunAction } from './run';
import { SharedIncidentState } from './InvestigationWorkspace';
import { EvidenceCard } from './ChallengeEvidence';
import { ChallengeHelp } from './ChallengeHelp';
import { ChallengeReport } from './ChallengeReport';
import { ChallengeCompletion } from './ChallengeCompletion';
import { ClientPanel, DashboardPanel, DataPanel, SystemPanel } from './InvestigationPanels';
import { InvestigationSql, previewKey, type QueryPreview } from './InvestigationSql';
import { aggregateSql } from './predicate';
import { SqlClient } from './sqlClient';
import { validateIncident } from './grading';
import { documentationLinks } from './scenario';
import { WorkedRepairGuide } from './WorkedRepairGuide';
import { workedRepairReplays } from './workedRepairReplay';
import { workedRepairSteps, type WorkedRepairStep } from './workedRepairSteps';
import '../../styles/lesson.css';
import './challenge.css';

const shortcuts = { 'Control+Enter': '[data-incident-action="run-sql"]', ArrowRight: '[data-incident-action="advance"]', h: '[data-incident-action="hint"]', r: '[data-incident-action="restart"]', s: '.incident-reference [data-dialog-close], [data-incident-action="reference"]' };
const briefingWatermark = (
  <svg className="incident-brief-logo" viewBox="27 39 146 122" aria-hidden="true" focusable="false">
    <image href={publicAsset('materialize-logo-transparent.png')} width="200" height="200" />
  </svg>
);
const ignoreTourAction = (_action: RunAction) => {};


const environmentArtwork = (
  <svg viewBox="0 0 548 84" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
    {/* Source tables */}
    <g fill="var(--lab-surface)" stroke="currentColor" strokeWidth="1.3">
      <rect x="17" y="4" width="90" height="59" rx="8" />
      <rect x="10" y="12" width="90" height="59" rx="8" />
      <rect x="3" y="20" width="90" height="59" rx="8" />
    </g>
    <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
      <path d="M13 31h15m12 0h15m12 0h15M13 42h15m12 0h15m12 0h15M13 64h15m12 0h15m12 0h15" opacity=".5" />
      <path d="M13 53h15m12 0h15m12 0h15" />
    </g>

    {/* SQL editor */}
    <g transform="translate(146 5)">
      <rect width="103" height="73" rx="8" fill="var(--lab-surface)" stroke="currentColor" strokeWidth="1.3" />
      <path d="M0 13h103" fill="none" stroke="currentColor" opacity=".7" />
      <path d="M10 6.5h.1m6 0h.1m6 0h.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <path d="M11 23h52M25 51h39" />
        <path d="M18 32h24M25 42h29m8 0h25M18 60h22" opacity=".58" />
      </g>
    </g>

    {/* Maintained results */}
    <g transform="translate(285 7)">
      <g fill="var(--lab-surface)" stroke="currentColor" strokeWidth="1.3">
        <rect width="76" height="55" rx="8" />
        <rect x="16" y="19" width="76" height="55" rx="8" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity=".5">
        <path d="M10 11h12m7 0h12m7 0h12M9 27h1M9 37h1" />
        <path d="M25 29h12m7 0h12m7 0h12M25 39h12m7 0h12m7 0h12M25 49h12m7 0h12m7 0h12M25 59h12m7 0h12" />
      </g>
      <circle cx="82" cy="63" r="14" fill="var(--lab-surface)" stroke="currentColor" strokeWidth="1.3" />
      <path d="M75 62a7 7 0 0 1 12-3l2 2m0-4v4h-4m4 3a7 7 0 0 1-12 3l-2-2m0 4v-4h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Dashboard */}
    <g transform="translate(420 7)">
      <rect width="124" height="71" rx="8" fill="var(--lab-surface)" stroke="currentColor" strokeWidth="1.3" />
      <path d="M0 13h124M69 23v37" fill="none" stroke="currentColor" opacity=".7" />
      <path d="M10 6.5h.1m6 0h.1m6 0h.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g fill="currentColor">
        <rect x="9" y="49" width="10" height="11" rx="3" opacity=".5" />
        <rect x="23" y="41" width="10" height="19" rx="3" opacity=".55" />
        <rect x="37" y="33" width="10" height="27" rx="3" opacity=".64" />
        <rect x="51" y="25" width="10" height="35" rx="3" />
      </g>
      <path d="M81 30h32" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M81 44h28m-28 9h21" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".53" />
    </g>
    <path d="M117 43h20m-5-5 5 5-5 5M257 43h20m-5-5 5 5-5 5M391 43h20m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export function LiveOrderOperationsPage() {
  const walkthrough = useWalkthrough();
  const [searchParams, setSearchParams] = useSearchParams();
  const overviewRequested = searchParams.get('view') === 'overview';
  const [dialog, setDialog] = useState<'reference' | 'restart' | 'help' | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [repair, setRepair] = useState<{ applied: ChallengeRun; beforeTrace: TraceFrame[] | null; steps: WorkedRepairStep[]; replays: ReturnType<typeof workedRepairReplays> } | null>(null);
  const [repairDisplay, setRepairDisplay] = useState<ChallengeRun | null>(null);
  const controller = useChallengeRun(Boolean(dialog) || shortcutsOpen || overviewRequested || walkthrough.challengeOpen || Boolean(repair));
  const { run, progress, dispatch } = controller;
  const [client] = useState(() => new SqlClient());
  const [retry, setRetry] = useState(0);
  const [traceState, setTrace] = useState<{ key: string; frames: TraceFrame[] | null; error: string }>({ key: '', frames: null, error: '' });
  const [mode, setMode] = useState<'repair' | 'diagnostic'>('repair');
  const [preview, setPreview] = useState<QueryPreview | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const tour = useChallengeWalkthrough(run);
  const operationId = useRef(0);
  const latest = useRef({ run, mode }); latest.current = { run, mode };
  const pageRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const queryKey = JSON.stringify([run.id, run.config.predicate, run.config.source, retry]);
  const trace = traceState.key === queryKey ? traceState.frames : null;
  const traceError = traceState.key === queryKey ? traceState.error : '';
  const showOverview = run.phase === 'briefing' || overviewRequested;
  const active = run.phase === 'investigating' && !showOverview;
  const currentRepair = repair && active && !tour.open && repair.applied.id === run.id
    && repair.applied.workspace === run.workspace && repair.applied.configurationRevision === run.configurationRevision
    && (run.workspace !== 'SQL' || repair.applied.draft === run.draft) ? repair : null;
  const view = showOverview ? 'overview' : `${run.phase}-${run.workspace}`;
  useEffect(() => {
    if (repair && !currentRepair) {
      setRepair(null);
      setRepairDisplay(null);
    }
  }, [repair, currentRepair]);
  const closeRepair = useCallback(() => {
    setRepair(null);
    setRepairDisplay(null);
    requestAnimationFrame(() => {
      const help = pageRef.current?.querySelector<HTMLButtonElement>('[data-incident-action="hint"]');
      if (help?.getClientRects().length && !isShortcutInteraction(help)) help.focus({ preventScroll: true });
      else focusLabContext();
    });
  }, []);
  const applyWorkedRepair = () => {
    // Save the actual repair once. The guide only renders snapshots of its actions.
    const { before, after } = dispatch({ type: 'worked', workspace: run.workspace });
    if (run.workspace === 'SQL') {
      setMode('repair');
      setPreview(null);
      setError('');
    }
    setDialog(null);
    setNotice('Worked intervention applied. Review the changes in the walkthrough.');
    setRepairDisplay(null);
    setRepair({ applied: after, beforeTrace: trace, steps: workedRepairSteps(before, after), replays: workedRepairReplays(before, after) });
  };
  const continueChallenge = () => {
    if (run.phase === 'briefing') dispatch({ type: 'start' });
    if (overviewRequested) setSearchParams(current => { const next = new URLSearchParams(current); next.delete('view'); return next; });
  };
  usePageTitle('Save the Flash Sale');
  useLabShortcuts(pageRef, active ? shortcuts : { r: shortcuts.r, s: shortcuts.s }, !showOverview && !shortcutsOpen && !tour.open && !currentRepair, true);
  useWorkspaceMotion(pageRef, view);
  useChangeMotion(contentRef, view, true, 'workspace');
  useEffect(() => {
    operationId.current++; setOperation(null); setPreview(null); setError('');
    return () => { operationId.current++; client.cancel(); };
  }, [client, run.id]);
  useEffect(() => {
    if (run.phase === 'briefing' && !tour.open) return;
    let current = true;
    setTrace({ key: queryKey, frames: null, error: '' });
    void client.request({ kind: 'trace', predicate: run.config.predicate, source: run.config.source }).then(response => {
      if (current) setTrace({ key: queryKey, frames: response.trace!, error: '' });
    }, failure => { if (current) setTrace({ key: queryKey, frames: null, error: failure.message }); });
    return () => { current = false; };
  }, [client, queryKey, run.phase === 'briefing' && !tour.open]);
  useEffect(() => { setNotice(''); setError(''); }, [run.workspace, run.id]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [run.workspace, run.phase, showOverview]);
  const runSql = async () => {
    if (operation || run.frame === null) return;
    const id = ++operationId.current;
    const key = previewKey(run, mode);
    setOperation('Executing SQL…'); setError(''); setNotice('');
    try {
      const sql = mode === 'repair' ? aggregateSql(run.draft) : run.diagnostic;
      const output = (await client.request({ kind: 'query', sql, source: run.config.source, time: traceTimes[run.frame]! })).output!;
      const inherited = mode === 'repair' ? (await client.request({ kind: 'query', sql: aggregateSql(initialPredicate), source: run.config.source, time: traceTimes[run.frame]! })).output : undefined;
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
  const hintCount = run.hints[run.workspace] ?? 0;
  // Reuse the panels for the tour while keeping the live tree's local selections mounted.
  const renderSurface = (run: ChallengeRun, touring = false, repairing = false, displayedTrace = trace) => {
    const showOverview = touring ? tour.step?.surface === 'overview' : run.phase === 'briefing' || overviewRequested;
    const active = touring ? tour.step?.surface === 'workspace' : run.phase === 'investigating' && !showOverview;
    const tourButton = <IconButton label="Explain this page" className="incident-walkthrough-button" disabled={Boolean(operation)} onClick={() => { setDialog(null); tour.start(showOverview ? 'overview' : active ? run.workspace : 'handover'); }}><CircleHelp size={18} aria-hidden="true" /></IconButton>;
    const restartButton = (
      <Button
        className="incident-restart"
        data-walkthrough={showOverview ? undefined : 'challenge-restart'}
        data-incident-action="restart"
        aria-keyshortcuts={showOverview ? undefined : 'R'}
        disabled={showOverview && run.phase === 'briefing'}
        onClick={() => setDialog('restart')}
      >
        <RotateCcw size={14} aria-hidden="true" />Restart challenge
      </Button>
    );
    const dispatch = touring || repairing ? ignoreTourAction : controller.dispatch;
    const props = { run, trace: displayedTrace, dispatch };
    const brief = <><p className="incident-quotation">“{incidentMessage}”</p><p>You have inherited Northstar Shop’s dashboard. Investigate the system, make reversible changes, and verify that it meets the operating contract. Choose where to look and what to test.</p><div className="incident-section-heading" data-walkthrough="challenge-contract"><h3 className="incident-subheading">Operating contract</h3><ChallengeHelp topic="contract" /></div><ul className="incident-requirements">{businessRequirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul></>;
    return <>
      <div className="guided-lab-top-row"><Breadcrumbs items={[{ label: 'Learning path', to: '/' }, { label: 'Challenge' }]} />{!showOverview && <div className="incident-page-help">{tourButton}<ShortcutHelp lecture={false} challenge challengeInvestigating={active} showReference onOpenChange={setShortcutsOpen} /></div>}</div>
      <ActivityHeading title="Save the Flash Sale" description={showOverview ? 'Investigate the discrepancy. Repair the system. Prove it is ready for the next sale wave.' : 'Repair the system and verify the operating contract.'} controlsLabel="Challenge controls" controls={showOverview ? <><Button variant="primary" disabled={Boolean(operation)} onClick={() => { setDialog(null); tour.start(); }}>Full walkthrough</Button></> : <>
        {run.phase === 'completed' && <span className="incident-status">Handed over</span>}
        <Button className="incident-tools-toggle" aria-expanded={toolsOpen || touring} onClick={() => setToolsOpen(value => !value)}>Tools</Button>
        <div className="incident-tool-actions" data-open={toolsOpen || touring}>
          {active ? <Button data-walkthrough="challenge-overview-link" onClick={() => setSearchParams(current => { const next = new URLSearchParams(current); next.set('view', 'overview'); return next; })}><ArrowLeft size={14} aria-hidden="true" />Challenge overview</Button> : <Button onClick={() => dispatch({ type: 'investigate' })}><ArrowLeft size={14} aria-hidden="true" />Return to investigation</Button>}
          <Button data-walkthrough="challenge-reference" data-incident-action="reference" onClick={() => setDialog('reference')} aria-keyshortcuts="S">Reference</Button>
          {active && <><Button disabled={!run.undo.length} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={14} aria-hidden="true" />Undo last change</Button><Button data-incident-action="hint" aria-keyshortcuts="H" onClick={() => setDialog('help')}><Lightbulb size={14} aria-hidden="true" />Investigation help</Button></>}
        </div>
        {active && <Button data-walkthrough="challenge-handover-link" variant="primary" onClick={() => dispatch({ type: 'handover' })}>Review handover<ArrowRight size={14} aria-hidden="true" /></Button>}
      </>} />
      {progress.recovery && <p role="status" className="incident-notice">The saved investigation is incompatible or incomplete. A new attempt is available; valid historical achievements are preserved.</p>}
      {progress.memoryOnly && <p role="status" className="incident-notice">Storage is unavailable. You can continue for this session, but closing the tab will lose its progress.</p>}
      <div ref={touring ? undefined : contentRef} className="incident-content">
        {showOverview ? <div className="incident-brief-grid">
          <EvidenceCard title="An incident from operations" help="brief" trailing={briefingWatermark} icon={<Flag size={18} aria-hidden="true" />}>
            {brief}
            <div className="incident-actions incident-brief-actions">
              <Link className="button button-secondary button-normal" to="/"><ArrowLeft size={14} aria-hidden="true" />Back to main page</Link>
              <Button data-walkthrough="challenge-start" variant="primary" onClick={continueChallenge}>
                {run.phase === 'briefing' ? 'Start investigation' : run.phase === 'investigating' ? 'Continue investigation' : 'Return to handover'}<ArrowRight size={16} aria-hidden="true" />
              </Button>
              {restartButton}
            </div>
          </EvidenceCard>
          <EvidenceCard walkthrough="challenge-environment" title="Your working environment" help="environment" trailing={briefingWatermark} icon={<BookOpen size={18} aria-hidden="true" />}>
            <p>Explore the data, deployed SQL, system observations, and application in any order. Test your changes and verify the system against the operating contract.</p>
            <p>SQL queries execute locally. Streaming, connection progress, and cluster behavior use the lab simulation. No database credentials or infrastructure setup are needed.</p>
            <p>Leave and return at any time. Drafts and applied changes save automatically. Hints and worked repairs are optional and recorded honestly.</p>
            {!touring && tour.showInvitation && <p className="incident-tour-invitation">New to the challenge? The walkthrough explains each workspace and its controls.<Button size="compact" variant="ghost" onClick={tour.dismissInvitation}>Dismiss invitation</Button></p>}
            {progress.achievements.some(a => a.scenarioVersion === 1) && <p className="incident-notice">First version · historical completion preserved. This investigation is a separate attempt.</p>}
            {progress.achievements.some(a => a.scenarioVersion === 2) && <p className="incident-notice">Previous investigation completion saved. Replaying preserves it and all chapter progress.</p>}
            <div className="incident-environment-art">{environmentArtwork}</div>
          </EvidenceCard>
        </div> : <>
          {active && <SharedIncidentState run={run} dispatch={dispatch} touring={touring} />}
          {active && <nav data-walkthrough="challenge-workspaces" className="incident-tabs" aria-label="Investigation workspaces">{workspaces.map(workspace => <button data-walkthrough={`challenge-${workspace.toLowerCase()}-page`} key={workspace} type="button" aria-current={run.workspace === workspace ? 'page' : undefined} onClick={() => dispatch({ type: 'workspace', workspace })}>{workspace}</button>)}</nav>}
          {active && <div className="incident-workspace-bar"><span className="eyebrow">{run.workspace} workspace</span><span>Apply drafts to update the shared system.</span></div>}
          <>
            {operation && <div className="incident-runtime" role="status"><span className="incident-spinner" aria-hidden="true" />{operation}<Button size="compact" onClick={cancel}>Cancel execution</Button></div>}
            {!displayedTrace && <div className="incident-runtime" role="status">{traceError ? <><span>{traceError}</span><Button onClick={() => { client.cancel(); setRetry(n => n + 1); }}>Retry SQL engine</Button></> : <><span className="incident-spinner" aria-hidden="true" />Preparing the local SQL workspace… You can inspect data and configuration while it starts.</>}</div>}
            {run.feedback && <div role="status" className="incident-feedback"><details data-repair-target="feedback"><summary>Last action · {run.feedback.split('. ')[0]}</summary><p>{run.feedback}</p></details></div>}
            {notice && <p role="status" className="incident-notice" data-repair-target="repair-notice">{notice}</p>}
            {error && (!active || run.workspace !== 'SQL') && <p role="alert" className="incident-notice" data-tone="warning">{error}</p>}
            {active ? <div className="incident-workspace" aria-label={`${run.workspace} workspace`}>
              {run.workspace === 'Dashboard' && <DashboardPanel {...props} />}
              {run.workspace === 'Data' && <DataPanel {...props} showRebuiltOrders={!touring && Boolean(currentRepair)} />}
              {run.workspace === 'SQL' && <InvestigationSql {...props} touring={touring} showWorkedApply={repairing && run.draft === currentRepair?.applied.config.predicate} mode={touring ? 'repair' : mode} setMode={next => { if (!touring && !repairing) { setMode(next); setError(''); } }} preview={preview} busy={Boolean(operation)} error={error} onRun={() => { if (!touring && !repairing) void runSql(); }} onDeploy={() => { if (!touring && !repairing && preview?.key === previewKey(run, 'repair') && !operation) { dispatch({ type: 'deploy', runId: run.id, configuration: run.configurationRevision, predicate: run.draft }); } }} />}
              {run.workspace === 'System' && <SystemPanel {...props} />}
              {run.workspace === 'Client' && <ClientPanel {...props} />}
            </div> : <ChallengeReport run={run} dispatch={dispatch} busy={Boolean(operation)} touring={touring} onValidate={() => { if (!touring) void validate(); }} />}
          </>
          {active && <div className="incident-details-with-help incident-change-history"><details className="incident-details" open={touring || undefined}><summary data-walkthrough="challenge-history">Applied change history</summary><ol className="incident-change-log">{run.changes.map((change, index) => <li key={index}>{(change.time / 1000).toFixed(3)} s · {change.label}</li>)}</ol></details><ChallengeHelp topic="history" /></div>}
          <div className="incident-actions incident-footer"><Link className="button button-secondary button-normal" to="/"><ArrowLeft size={14} aria-hidden="true" />Back to main page</Link>{restartButton}</div>
        </>}
      </div>
    </>;
  };
  const displayed = currentRepair ? repairDisplay ?? currentRepair.applied : run;
  const displayingEarlierQuery = displayed.config.predicate !== run.config.predicate || displayed.config.source !== run.config.source
    && JSON.stringify(displayed.config.source) !== JSON.stringify(run.config.source);
  const displayedTrace = displayingEarlierQuery ? currentRepair?.beforeTrace ?? null : trace;
  return <section ref={pageRef} className="guided-lab-page incident-page" data-phase={tour.step?.surface === 'overview' || (!tour.step && showOverview) ? 'briefing' : tour.step?.surface === 'workspace' ? 'investigating' : run.phase}>
    {tour.interrupted && <p role="status" className="incident-notice">The investigation changed in another tab. The walkthrough closed to show the current saved system.</p>}
    <div hidden={Boolean(tour.step)} inert={tour.open || Boolean(currentRepair) || undefined} data-challenge-live>{renderSurface(displayed, false, Boolean(currentRepair && displayed !== currentRepair.applied), displayedTrace)}</div>
    {tour.step && <div data-challenge-tour>{renderSurface(tour.displayRun, true)}</div>}
    <Dialog open={dialog === 'reference'} onClose={() => setDialog(null)} title="Incident reference" className="incident-reference"><h3 className="incident-subheading">Schemas and time</h3><pre className="incident-code">{'orders(order_id, customer_id, status, amount, event_at, arrived_at)\ncustomers(customer_id, region)'}</pre><p>Event time records when the business event occurred. Arrival time records ingestion. SQL timestamps use UTC on 1 January 2026; displays show seconds from that same origin. The local mz_now() compatibility function freezes logical time at the selected replay snapshot.</p><p>Materialize supports mz_now() directly compared with a row timestamp expression, combining temporal comparisons with AND. Place interval arithmetic on the row expression.</p><h3 className="incident-subheading">Operating contract</h3><ul className="incident-requirements">{businessRequirements.map(text => <li key={text}>{text}</li>)}</ul><p className="incident-caption">SQL results execute in local PostgreSQL (PGlite). The clock compatibility function models supported timestamp comparisons, not Materialize's full mz_timestamp type. Sources, maintained progress, read policies, state units, and subscriptions are explicitly simulated. Quiet external sources and unsent business changes are separate from a complete ingested snapshot.</p><ul className="incident-reference-links">{documentationLinks.map(link => <li key={link.href}><a href={link.href} target="_blank" rel="noopener noreferrer" className="text-link">{link.label}</a></li>)}</ul><Link className="text-link" to="/labs" target="_blank" rel="noopener noreferrer">Review the lectures (opens a new tab)</Link></Dialog>
    <Dialog open={dialog === 'help'} onClose={() => setDialog(null)} title="Investigation help" eyebrow={run.workspace}>
      <p>Hints are recorded. Apply worked repair makes the fixes for this workspace and shows you what changed. It marks completion as assisted.</p>
      <ol className="incident-requirements">{workspaceHints[run.workspace].slice(0, hintCount).map(hint => <li key={hint}>{hint}</li>)}</ol>
      <div className="incident-actions">
        <Button disabled={hintCount >= 3} onClick={() => dispatch({ type: 'hint', workspace: run.workspace })}>Get next hint</Button>
        {run.workspace !== 'Dashboard' && <Button disabled={Boolean(operation)} onClick={applyWorkedRepair}>Apply worked repair</Button>}
      </div>
    </Dialog>
    {currentRepair && <WorkedRepairGuide steps={currentRepair.steps} replays={currentRepair.replays} applied={currentRepair.applied} displayed={displayed} onDisplay={setRepairDisplay} pageRef={pageRef} onClose={closeRepair} />}
    <Dialog open={dialog === 'restart'} onClose={() => setDialog(null)} title="Restart this investigation?"><p>This replaces your active investigation and drafts. Prior achievements, the first version's saved run, and chapter completions stay preserved.</p><div className="incident-actions"><Button onClick={() => setDialog(null)}>Keep this run</Button><Button variant="primary" className="incident-restart" onClick={() => { client.cancel(); controller.restart(); setDialog(null); setNotice(''); }}>Restart investigation</Button></div></Dialog>
    <ChallengeCompletion key={run.id} complete={run.phase === 'completed'} />
  </section>;
}
