import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ArrowRight, Lightbulb, Pause, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { materializeDocumentation } from '../../app/resources';
import { chapterSectionPath, getChapterSections } from '../../chapters/chapterOutline';
import { chapterPath, type ChapterDefinition } from '../../chapters/chapterRegistry';
import { SqlObjectivesPanel } from '../../components/lab/SqlObjectivesPanel';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { usePageTitle } from '../../hooks/usePageTitle';

// Preserve the reference's four checkpoints until real lab content supplies progress.
const PLACEHOLDER_CHECKPOINT_TOTAL = 4;

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
  className?: string;
  showTip?: boolean | 'when-space';
  showReference?: boolean;
  simulation?: SimulationControls;
  controls?: { progress: ReactNode; actions: ReactNode };
  description?: string;
  tip?: string;
  reference?: Pick<ComponentProps<typeof SqlObjectivesPanel>, 'objective' | 'sql' | 'documentationLinks'>;
}

export function GuidedLabScreen({
  chapter,
  title = chapter.shortTitle,
  regionLabel = 'Lab workspace',
  navigation,
  children,
  workspace,
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
  const pageRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLElement>(null);
  const [tipFits, setTipFits] = useState(false);
  const fitViewport = Boolean(simulation || controls);
  const { open: helpOpen } = useWalkthrough();
  useEffect(() => { if (helpOpen) setReferenceOpen(false); }, [helpOpen]);
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (showTip !== 'when-space') return;
    const page = pageRef.current;
    const tipElement = tipRef.current;
    if (!page || !tipElement) return;
    const measure = () => {
      const style = getComputedStyle(page);
      tipElement.style.width = `${page.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px`;
      const contentBottom = Math.max(...Array.from(page.children)
        .filter((child) => child !== tipElement && child.tagName !== 'DIALOG')
        .map((child) => child.getBoundingClientRect().bottom));
      const gap = parseFloat(style.rowGap) || 0;
      setTipFits(contentBottom + gap + tipElement.offsetHeight + parseFloat(style.paddingBottom) <= innerHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const child of Array.from(page.children)) observer.observe(child);
    observer.observe(page);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [showTip, pathname]);
  useEffect(() => {
    setReferenceOpen(false);
  }, [pathname]);
  usePageTitle(title);

  return (
    <section ref={pageRef} data-viewport-fit={fitViewport || undefined} className={`guided-lab-page ${className}`}>
      <div className="guided-lab-top-row">
        <Breadcrumbs items={[
          { label: 'Guided labs', to: '/labs' },
          { label: chapter.shortTitle, ...(title !== chapter.shortTitle ? { to: chapterPath(chapter) } : {}) },
          ...(title !== chapter.shortTitle ? [{ label: title }] : []),
        ]} />
        {navigation}
      </div>
      <div className="guided-lab-heading">
        <div className="guided-lab-title">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="guided-lab-controls" aria-label="Lab controls">
          {controls?.progress ?? <div className="guided-lab-progress">
            <div><span>{simulation?.progressLabel ?? 'Progress'}</span><strong>{`${simulation?.completed ?? 0} / ${simulation?.total ?? PLACEHOLDER_CHECKPOINT_TOTAL}`}</strong></div>
            <ProgressBar value={simulation?.completed ?? 0} total={simulation?.total ?? PLACEHOLDER_CHECKPOINT_TOTAL} label={simulation?.progressLabel ? `${simulation.progressLabel} progress` : 'Lab checkpoints completed'} />
          </div>}
          {showReference && <Button data-walkthrough="sql" onClick={() => setReferenceOpen(true)}>SQL &amp; Objectives</Button>}
          {controls ? controls.actions : <>
          <Button disabled={!simulation} onClick={simulation?.onReset} title={!simulation ? 'This lab is to be done' : undefined}>Reset</Button>
          <Button data-walkthrough="run" disabled={!simulation} onClick={simulation?.onRun} title={!simulation ? 'This lab is to be done' : undefined}>
            {simulation?.playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} fill="currentColor" aria-hidden="true" />}
            {simulation?.playing ? 'Pause' : 'Run'}
          </Button>
          <Button data-walkthrough="guided" variant="primary" disabled={!simulation} onClick={simulation?.onStartGuidedRun} title={!simulation ? 'This lab is to be done' : undefined}>
            <Play size={13} fill="currentColor" aria-hidden="true" />Start guided run
          </Button>
          </>}
        </div>
      </div>
      <section className="guided-lab-canvas" aria-label={regionLabel}>{workspace ?? <p>To be done</p>}</section>
      {children && <div className="guided-lab-page-navigation">{children}</div>}
      {showTip && <aside ref={tipRef} className="guided-lab-tip" aria-label="Lab tip"
        data-auto-fit={showTip === 'when-space' || undefined}
        data-fit-hidden={showTip === 'when-space' && !tipFits || undefined} aria-hidden={showTip === 'when-space' && !tipFits || undefined}
        inert={showTip === 'when-space' && !tipFits || undefined}>
        <Lightbulb size={27} aria-hidden="true" />
        <strong>Tip</strong>
        <p>{tip}</p>
        <button type="button" onClick={() => setReferenceOpen(true)}>
          Open SQL &amp; Objectives<ArrowRight size={16} aria-hidden="true" />
        </button>
      </aside>}
      {showReference && <SqlObjectivesPanel
        open={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        sql={reference?.sql}
        objective={
          <>
            <p>{reference?.objective ?? chapter.description}</p>
            <nav className="guided-lab-reference-links" aria-label="Lab sections">
              {getChapterSections(chapter).map((section) => (
                <Link key={section.slug} to={chapterSectionPath(chapter, section.slug)}>
                  {section.title}<ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </>
        }
        documentationLinks={reference?.documentationLinks ?? [{ label: materializeDocumentation.title, href: materializeDocumentation.href }]}
      />}
    </section>
  );
}
