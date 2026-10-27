import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, Flag, Pause, Play, RotateCcw } from 'lucide-react';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { ActivityHeading } from '../../components/lab/ActivityHeading';
import { ShortcutHelp } from '../../components/lab/ShortcutHelp';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { SqlObjectivesPanel } from '../../components/lab/SqlObjectivesPanel';
import { documentationLinks, referenceSql, requirements, stages, STAGE_IDS, stageDefinition } from './scenario';
import { gradeRepair } from './grading';
import { assessmentAt, type RunAction } from './run';
import { useChallengeRun } from './useChallengeRun';
import { ChallengeEvidence, EvidenceCard, PipelineStrip } from './ChallengeEvidence';
import { ChallengeDecisions } from './ChallengeDecisions';
import { ChallengeReport } from './ChallengeReport';
import { useLabShortcuts } from '../../hooks/useLabShortcuts';
import { useChangeMotion } from '../../motion/useChangeMotion';
import { useWorkspaceMotion } from '../../motion/useWorkspaceMotion';
import '../../styles/lesson.css';
import './challenge.css';

const shortcuts = {
  Enter: '[data-challenge-action="test"]',
  ArrowRight: '[data-challenge-action="apply"]',
  h: '[data-challenge-action="hint"]',
  r: '[data-challenge-action="retry"]',
  s: '.sql-objectives-panel [data-dialog-close], [data-challenge-action="sql"]',
  'Control+Enter': '[data-challenge-action="worked"]',
};

export function LiveOrderOperationsPage() {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const controller = useChallengeRun(referenceOpen || briefOpen || restartOpen || overviewOpen || shortcutsOpen);
  const { run, progress, isPaused } = controller;
  const stageId = STAGE_IDS[run.stage]!;
  const definition = stageDefinition(stageId);
  const signature = JSON.stringify(run.drafts[stageId] ?? {});
  const [tested, setTested] = useState<{ runId: string; stage: string; signature: string } | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'evidence' | 'task'>('task');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const grade = (tested?.runId === run.id && tested.stage === stageId && tested.signature === signature) || assessmentAt(run, stageId).workedRepair || run.commits.length > run.stage
    ? gradeRepair(stageId, run.drafts[stageId] ?? {}) : null;
  const active = run.phase === 'active';
  useLabShortcuts(pageRef, shortcuts, active && !isPaused && !shortcutsOpen);
  useWorkspaceMotion(pageRef, `${run.phase}-${stageId}-${isPaused}`);
  useChangeMotion(workspaceRef, `${run.phase}-${stageId}-${isPaused}`, true, 'checkpoint');
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMobilePanel('task');
  }, [run.stage, run.phase]);
  const dispatch = (action: RunAction) => {
    if (action.type === 'edit' || action.type === 'retry' || action.type === 'review') setTested(null);
    controller.dispatch(action);
  };
  const testRepair = () => { controller.dispatch({ type: 'test' }); setTested({ runId: run.id, stage: stageId, signature }); };
  const showWorkedRepair = () => { controller.dispatch({ type: 'worked' }); setMobilePanel('task'); };
  const brief = <div className="capstone-brief-copy"><p>You are supporting Northstar Shop’s flash sale. Operations uses a live dashboard to decide where to assign staff. Some orders are counted twice, cancelled orders remain visible, and a region occasionally flashes empty. Support reports that fast responses can still contain old data.</p><p><strong>Your job:</strong> inspect the evidence, test repairs, and hand over a system the team can trust.</p><h3>Definition of success</h3><ul>{requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul><p>Snapshot age measures logical-time freshness. It cannot establish that every external business change has already arrived.</p></div>;

  return <section ref={pageRef} className="guided-lab-page capstone-page">
    <div className="guided-lab-top-row">
      <Breadcrumbs items={[{ label: 'Learning path', to: '/' }, { label: 'Challenge' }]} />
      {active && <div className="capstone-page-tools"><ShortcutHelp lecture={false} challenge showReference onOpenChange={setShortcutsOpen} /></div>}
    </div>
    <ActivityHeading title="Save the Flash Sale" description="Restore a trustworthy live-orders dashboard, from incoming records to the application."
      controlsLabel="Challenge controls" controls={<>
        <div className="guided-lab-progress"><div><span>Repairs</span><strong>{run.commits.length} / {stages.length}</strong></div><ProgressBar value={run.commits.length} total={stages.length} label="Incident repairs applied" /></div>
        {active ? <><Button data-challenge-action="sql" aria-keyshortcuts="S" onClick={() => setReferenceOpen(true)}>SQL &amp; Objectives</Button><Button onClick={() => setBriefOpen(true)}>Mission brief</Button><Button onClick={() => controller.setIsPaused(!isPaused)}>{isPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{isPaused ? 'Resume' : 'Pause'}</Button></> : <span className="capstone-duration"><Clock3 size={15} aria-hidden="true" />10–20 minutes</span>}
      </>} />
    {progress.recovery && <div className="capstone-notice" data-tone="warning" role="status">The saved run is incompatible or incomplete. Start a fresh run; valid historical achievements are preserved.</div>}
    {progress.memoryOnly && <p className="capstone-notice" data-tone="warning" role="status">Storage is unavailable. You can continue, but this session’s progress will not survive closing the tab.</p>}
    <div ref={workspaceRef} className="capstone-content">
      {run.phase === 'briefing' ? <>
        <div className="capstone-brief-grid"><EvidenceCard title="Your incident ticket" icon={<Flag size={19} />}>{brief}<div className="capstone-brief-actions"><Button variant="primary" onClick={() => dispatch({ type: 'start' })}>Start incident<ArrowRight size={17} aria-hidden="true" /></Button><Link to="/" className="text-link">Back to main page</Link></div></EvidenceCard><div className="capstone-brief-aside"><EvidenceCard title="A complete working session" icon={<Clock3 size={18} />}><p>About 16 minutes. No countdown. Pause and resume whenever you need.</p><ol className="capstone-agenda">{stages.map(stage => <li key={stage.id}><span>{stage.title}</span><strong>{stage.minutes} min</strong></li>)}</ol></EvidenceCard><EvidenceCard title="Bring what you learned" icon={<BookOpen size={18} />}><p>Recommended after Chapters 1–8. Every required concept is taught there; source setup and production administration are supplied by the simulation.</p><p>Hints point to evidence. Worked repairs are available and recorded honestly in your handover.</p><p className="capstone-caption">All data, state units, and processing times are illustrative. The simulation runs in your browser without a database connection.</p></EvidenceCard>{progress.achievements.length > 0 && <p className="capstone-notice" data-tone="success">Previous completion saved. Replaying this incident does not erase it or any chapter progress.</p>}</div></div>
      </> : active ? <>
        <nav className="capstone-stage-nav" aria-label="Incident checkpoints"><ol>{stages.map((stage, index) => <li key={stage.id}><button type="button" aria-current={run.stage === index ? 'step' : undefined} aria-label={`${index + 1}. ${stage.label}${index < run.commits.length ? ' · Applied' : ''}`} disabled={index > run.commits.length} onClick={() => dispatch({ type: 'review', stage: index })}><span>{index < run.commits.length ? <CheckCircle2 size={16} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span><strong>{stage.label}</strong></button></li>)}</ol></nav>
        <div className="capstone-stage-heading"><div><span className="eyebrow">Northstar Shop · Checkpoint {run.stage + 1} of {stages.length}</span><h2 ref={headingRef} tabIndex={-1}>{definition.title}</h2><p>{definition.ticket}</p></div><Button size="compact" onClick={() => setOverviewOpen(true)}>System overview<ArrowRight size={14} aria-hidden="true" /></Button></div>
        {isPaused ? <div className="capstone-paused" role="status"><Pause size={28} aria-hidden="true" /><h3>Incident paused</h3><p>Your decisions are saved. The simulation and active-time counter are paused.</p><Button variant="primary" onClick={() => controller.setIsPaused(false)}>Resume incident</Button></div> : <>
          <div className="capstone-mobile-tabs" role="group" aria-label="Challenge workspace panels"><Button aria-pressed={mobilePanel === 'task'} onClick={() => setMobilePanel('task')}>Task</Button><Button aria-pressed={mobilePanel === 'evidence'} onClick={() => setMobilePanel('evidence')}>Evidence &amp; dashboard</Button></div>
          <div className="capstone-workspace" data-mobile-panel={mobilePanel}><section className="capstone-evidence" aria-label="Incident evidence"><ChallengeEvidence run={run} preview={Boolean(grade)} accepted={Boolean(grade?.correct)} dispatch={dispatch} /></section><section className="capstone-decisions" aria-label="Your repair"><ChallengeDecisions run={run} grade={grade} dispatch={dispatch} onTest={testRepair} onWorked={showWorkedRepair} /></section></div>
          {grade && <div className="capstone-mobile-next"><Button onClick={() => setMobilePanel(mobilePanel === 'task' ? 'evidence' : 'task')}>{mobilePanel === 'task' ? 'Inspect consequence preview' : 'Return to your repair'}<ArrowRight size={14} aria-hidden="true" /></Button></div>}
        </>}
        <details className="capstone-inspector capstone-incident-log"><summary>Incident log · {run.commits.length} of 6 repairs applied</summary><ol>{run.commits.map(commit => <li key={commit.stage}><CheckCircle2 size={14} aria-hidden="true" />{stageDefinition(commit.stage).title}: verified and applied.</li>)}{!run.commits.length && <li>No repairs applied yet. A tested preview does not change the committed system.</li>}</ol></details>
        <div className="capstone-bottom-nav"><Link to="/" className="text-link"><ArrowLeft size={14} aria-hidden="true" />Back to main page</Link>{run.commits.length === 6 && <Button onClick={() => dispatch({ type: 'handover' })}>Return to handover</Button>}<Button size="compact" variant="ghost" onClick={() => setRestartOpen(true)}><RotateCcw size={14} aria-hidden="true" />Restart challenge</Button></div>
      </> : <ChallengeReport run={run} dispatch={dispatch} onRestart={() => setRestartOpen(true)} />}
    </div>
    <Dialog open={briefOpen} onClose={() => setBriefOpen(false)} title="Mission brief" eyebrow="Northstar Shop · Flash sale">{brief}</Dialog>
    <SqlObjectivesPanel open={referenceOpen} onClose={() => setReferenceOpen(false)} objective={<><p>{definition.goal}</p><p>The SQL below is a worked reference for the complete design. Opening it is optional and does not apply a repair.</p></>} sql={referenceSql} documentationLinks={documentationLinks} />
    <Dialog open={overviewOpen} onClose={() => setOverviewOpen(false)} title="System overview"><PipelineStrip verified={run.commits.length} /><p className="capstone-overview-copy">Kafka order messages and a snapshotted PostgreSQL customer relation feed the recent-orders query. One maintained regional aggregate is shared through indexes in operations and support. The live client receives signed result changes and progress.</p><p>Verified means that the relevant decisions in this replay have been applied. Other stages remain unverified, even if their current rows happen to look correct.</p></Dialog>
    <Dialog open={restartOpen} onClose={() => setRestartOpen(false)} title="Restart this incident?"><p>This replaces your active challenge run and its drafts. Previously earned challenge achievements and chapter completions stay saved.</p><div className="capstone-dialog-actions"><Button onClick={() => setRestartOpen(false)}>Keep this run</Button><Button variant="primary" onClick={() => { controller.restart(); setRestartOpen(false); setTested(null); }}>Restart incident</Button></div></Dialog>
  </section>;
}
