import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { chapterPath, coreChapters } from '../../chapters/chapterRegistry';
import { useWalkthrough } from '../walkthrough/WalkthroughProvider';
import { shouldStartChapterTour } from '../walkthrough/walkthroughStorage';
import { LabIntroScreen } from './LabIntroScreen';
import { motion } from '../../motion/motion';

type IntroPhase = 'reacting' | 'revealing';

interface IntroRun {
  entryKey: string;
  targetPath: string;
  showTour: boolean;
  reducedMotion: boolean;
  awaitingDestination: boolean;
  revealing: boolean;
  finished: boolean;
  timer?: number;
  frame?: number;
}

export function isLabIntroEntry(location: { pathname: string; state: unknown }) {
  return location.pathname === '/labs'
    && typeof location.state === 'object'
    && location.state !== null
    && 'labIntro' in location.state
    && location.state.labIntro === true;
}

function cancelRun(run: IntroRun | null) {
  if (!run) return;
  window.clearTimeout(run.timer);
  if (run.frame !== undefined) window.cancelAnimationFrame(run.frame);
}

export function LabEntryTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { startChapterTour } = useWalkthrough();
  const requested = isLabIntroEntry(location);
  const runRef = useRef<IntroRun | null>(null);
  const wasActive = useRef(false);
  const [phase, setPhase] = useState<IntroPhase | null>(null);

  useEffect(() => () => {
    cancelRun(runRef.current);
    runRef.current = null;
  }, []);

  useEffect(() => {
    if (requested) {
      if (runRef.current?.entryKey === location.key) return;
      cancelRun(runRef.current);
      const firstChapter = coreChapters[0];
      if (!firstChapter) throw new Error('The guided labs need a first core chapter.');
      const run: IntroRun = {
        entryKey: location.key,
        targetPath: chapterPath(firstChapter),
        showTour: shouldStartChapterTour(),
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        awaitingDestination: false,
        revealing: false,
        finished: false,
      };
      runRef.current = run;
      setPhase('reacting');
      run.timer = window.setTimeout(() => {
        if (runRef.current !== run) return;
        run.awaitingDestination = true;
        navigate(run.targetPath, { replace: true, state: null });
      }, run.reducedMotion ? 0 : 1400);
      return;
    }

    const run = runRef.current;
    if (!run) return;
    if (!run.awaitingDestination || location.pathname !== run.targetPath) {
      cancelRun(run);
      runRef.current = null;
      setPhase(null);
      return;
    }
    if (run.revealing) return;
    run.revealing = true;

    // Render the destination underneath the opaque screen before revealing it.
    run.frame = window.requestAnimationFrame(() => {
      if (runRef.current !== run) return;
      setPhase('revealing');
      run.timer = window.setTimeout(() => {
        if (runRef.current !== run) return;
        run.finished = true;
        setPhase(null);
      }, run.reducedMotion ? 0 : motion.areaDuration);
    });
  }, [location.key, location.pathname, requested, navigate, startChapterTour]);

  const active = requested || phase !== null;
  useLayoutEffect(() => {
    if (active) {
      wasActive.current = true;
      return;
    }
    if (!wasActive.current) return;
    wasActive.current = false;
    const run = runRef.current;
    runRef.current = null;
    // The committed render has removed inert, so focus and the tour can resume.
    document.getElementById('main-content')?.focus({ preventScroll: true });
    if (run?.finished && run.showTour) startChapterTour(true);
  }, [active, startChapterTour]);

  return (
    <>
      <div
        className="lab-entry-background"
        data-lab-entry-phase={active ? phase ?? 'reacting' : undefined}
        style={{ display: 'contents' }}
        inert={active}
        aria-hidden={active || undefined}
      >
        {children}
      </div>
      {active && <LabIntroScreen phase={phase ?? 'reacting'} />}
    </>
  );
}
