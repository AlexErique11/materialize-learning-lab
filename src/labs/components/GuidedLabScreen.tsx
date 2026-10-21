import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { ArrowRight, CheckCircle2, Lightbulb, Pause, Play } from 'lucide-react';
import { useLocation } from 'react-router';
import { materializeDocumentation } from '../../app/resources';
import { chapterPath, guidedLabsHomePath, type ChapterDefinition } from '../../chapters/chapterRegistry';
import { SqlObjectivesPanel } from '../../components/lab/SqlObjectivesPanel';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLabShortcuts } from '../../hooks/useLabShortcuts';
import { useLabHelpAlignment } from '../../hooks/useLabHelpAlignment';
import { useResponsiveLabLayout } from '../../hooks/useResponsiveLabLayout';
import { useWorkspaceMotion } from '../../motion/useWorkspaceMotion';
import { ShortcutHelp } from '../../components/lab/ShortcutHelp';
import '../../styles/activity-completion.css';
import '../../styles/responsive-labs.css';

const lectureShortcuts = {
  ArrowRight: '[data-walkthrough="next-change"]',
  // The playback pair shares this order for changes, timestamps, and cases.
  ArrowLeft: '.relation-playback-controls button:has(+ button[data-walkthrough="next-change"])',
  ' ': '[data-walkthrough="run"]',
  r: '[data-shortcut="reset"]',
  s: '.sql-objectives-panel [data-dialog-close], [data-walkthrough="sql"]',
  Enter: '[data-walkthrough="guided"]',
};
const exerciseShortcuts = {
  Enter: '[data-walkthrough="check"]:not(:disabled), [data-shortcut="exercise-forward"]',
  ArrowRight: '[data-shortcut="exercise-forward"]',
  r: '[data-shortcut="reset"]',
  s: '.sql-objectives-panel [data-dialog-close], [data-walkthrough="sql"]',
  h: '[data-walkthrough="hint"]',
  'Control+Enter': '[data-walkthrough="answer"]',
};

interface SimulationControls {
  completed: number;

  total: number;

  playing: boolean;

  progressLabel?: string;

  onReset: () => void;

  onRun: () => void;

  onStartGuidedRun: () => void;
}

interface GuidedLabScreenProps {
  chapter: ChapterDefinition;

  title?: string;

  regionLabel?: string;

  navigation?: ReactNode;

  children?: ReactNode;

  workspace?: ReactNode;
  completion?: ReactNode;
  activityCompleted?: boolean;

  className?: string;

  showTip?: boolean | 'when-space';

  showReference?: boolean;

  simulation?: SimulationControls;

  controls?: {
    progress: ReactNode;
    actions: ReactNode;
  };

  description?: string;

  tip?: string;

  reference?: Pick<
    ComponentProps<typeof SqlObjectivesPanel>,
    'objective' | 'sql' | 'documentationLinks'
  >;
}

export function GuidedLabScreen({
  chapter,
  title = chapter.shortTitle,
  regionLabel = 'Lab workspace',
  navigation,
  children,
  workspace,
  completion,
  activityCompleted = false,
  className = '',
  showTip = true,
  showReference = true,
  simulation,
  controls,
  description = chapter.description,
  tip = 'Use the SQL & Objectives panel to see what to build, or start a guided run to step through the scenario.',
  reference,
}: GuidedLabScreenProps) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLElement>(null);
  const [tipFits, setTipFits] = useState(false);
  const fitViewport = Boolean(simulation || controls);
  const available = Boolean(simulation || controls);
  useLabShortcuts(pageRef, simulation ? lectureShortcuts : exerciseShortcuts, available && !shortcutHelpOpen);
  const { open: helpOpen, lectureHelpAvailable } = useWalkthrough();
  useEffect(() => {
    if (helpOpen) setReferenceOpen(false);
  }, [helpOpen]);
  const { pathname } = useLocation();
  useResponsiveLabLayout(pageRef, available, pathname);
  useLabHelpAlignment(pageRef, Boolean(simulation), lectureHelpAvailable, pathname);
  useWorkspaceMotion(pageRef, pathname);
  useLayoutEffect(() => {
    if (showTip !== 'when-space') return;
    const page = pageRef.current;
    const tipElement = tipRef.current;
    if (!page || !tipElement) return;
    const measure = () => {
      const style = getComputedStyle(page);
      tipElement.style.width = `${page.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px`;
      const contentBottom = Math.max(
        ...Array.from(page.children)
          .filter((child) => child !== tipElement && child.tagName !== 'DIALOG')
          .map((child) => child.getBoundingClientRect().bottom)
      );
      const gap = parseFloat(style.rowGap) || 0;
      setTipFits(
        contentBottom + gap + tipElement.offsetHeight + parseFloat(style.paddingBottom) <=
          innerHeight
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const child of Array.from(page.children)) observer.observe(child);
    observer.observe(page);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [showTip, pathname]);
  useEffect(() => {
    setReferenceOpen(false);
    setShortcutHelpOpen(false);
  }, [pathname]);
  usePageTitle(title);

  return (
    <section
      ref={pageRef}
      data-viewport-fit={fitViewport || undefined}
      data-exercise-completed={Boolean(controls && activityCompleted) || undefined}
      className={`guided-lab-page ${className}`}
    >
      <div className="guided-lab-top-row">
        <Breadcrumbs
          items={[
            { label: 'Guided labs', to: guidedLabsHomePath },
            {
              label: chapter.shortTitle,
              ...(title !== chapter.shortTitle ? { to: chapterPath(chapter) } : {}),
            },
            ...(title !== chapter.shortTitle ? [{ label: title }] : []),
          ]}
        />
        <div className="guided-lab-help">
          {!simulation && navigation}
          {available && <ShortcutHelp key={pathname} lecture={Boolean(simulation)} showReference={showReference} onOpenChange={setShortcutHelpOpen} />}
          {simulation && navigation}
        </div>
      </div>

      <div className="guided-lab-heading">
        <div className="guided-lab-title">
          <h1 aria-description={activityCompleted ? `${simulation ? 'Tutorial' : 'Exercise'} completed` : undefined}>
            {title}{activityCompleted && <CheckCircle2 className="activity-title-check" aria-hidden="true" />}
          </h1>

          <p>{description}</p>
        </div>

        <div
          className={`guided-lab-controls${available ? '' : ' reserved-controls'}`}
          aria-label={available ? 'Lab controls' : undefined}
          aria-hidden={!available || undefined}
          inert={!available || undefined}
        >
          {controls?.progress ??
            (simulation ? (
              <div className="guided-lab-progress">
                <div>
                  <span>{simulation.progressLabel ?? 'Progress'}</span>
                  <strong>
                    {simulation.completed} / {simulation.total}
                  </strong>
                </div>

                <ProgressBar
                  value={simulation.completed}
                  total={simulation.total}
                  label={
                    simulation.progressLabel
                      ? `${simulation.progressLabel} progress`
                      : 'Lab checkpoints completed'
                  }
                />
              </div>
            ) : (
              <div className="guided-lab-progress reserved-lab-progress" aria-hidden="true" />
            ))}
          {showReference && (
            <Button data-walkthrough="sql" aria-keyshortcuts="S" onClick={() => setReferenceOpen(true)}>
              SQL &amp; Objectives
            </Button>
          )}
          {controls ? (
            controls.actions
          ) : (
            <>
              <Button data-shortcut="reset" aria-keyshortcuts="R" disabled={!simulation} onClick={simulation?.onReset}>
                Reset
              </Button>

              <Button data-walkthrough="run" aria-keyshortcuts="Space" disabled={!simulation} onClick={simulation?.onRun}>
                {simulation?.playing ? (
                  <Pause size={13} aria-hidden="true" />
                ) : (
                  <Play size={13} fill="currentColor" aria-hidden="true" />
                )}
                {simulation?.playing ? 'Pause' : 'Run'}
              </Button>

              <Button
                data-walkthrough="guided"
                aria-keyshortcuts="Enter"
                variant="primary"
                disabled={!simulation}
                onClick={simulation?.onStartGuidedRun}
              >
                <Play size={13} fill="currentColor" aria-hidden="true" />
                Start guided run
              </Button>
            </>
          )}
        </div>
      </div>

      <section
        className="guided-lab-canvas"
        aria-label={workspace ? regionLabel : undefined}
        aria-hidden={!workspace || undefined}
      >
        {workspace}
      </section>
      {completion}
      {children && <div className="guided-lab-page-navigation">{children}</div>}
      {showTip && (
        <aside
          ref={tipRef}
          className={`guided-lab-tip${available ? '' : ' reserved-tip'}`}
          aria-label={available ? 'Lab tip' : undefined}
          data-auto-fit={showTip === 'when-space' || undefined}
          data-fit-hidden={(showTip === 'when-space' && !tipFits) || undefined}
          aria-hidden={!available || (showTip === 'when-space' && !tipFits) || undefined}
          inert={!available || (showTip === 'when-space' && !tipFits) || undefined}
        >
          <Lightbulb size={27} aria-hidden="true" />

          <strong>Tip</strong>

          <p>{tip}</p>

          <button type="button" onClick={() => setReferenceOpen(true)}>
            Open SQL &amp; Objectives
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </aside>
      )}
      {showReference && (
        <SqlObjectivesPanel
          open={referenceOpen}
          onClose={() => setReferenceOpen(false)}
          sql={reference?.sql}
          objective={<p>{reference?.objective ?? chapter.description}</p>}
          documentationLinks={
            reference?.documentationLinks ?? [
              { label: materializeDocumentation.title, href: materializeDocumentation.href },
            ]
          }
        />
      )}
    </section>
  );
}
