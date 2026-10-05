import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Spotlight } from '../ui/Spotlight';
import { chapterTourSteps, chapterTourWelcome, getLectureWalkthrough, type WalkthroughStep } from './walkthroughContent';
import { rememberChapterTour } from './walkthroughStorage';

interface WalkthroughSession { kind: 'chapter' | 'lecture'; steps: readonly WalkthroughStep[]; index: number; phase: 'welcome' | 'steps' }
const WalkthroughContext = createContext({ open: false, lectureHelpAvailable: false, startLectureHelp: () => {}, startChapterTour: (_replace = false) => {} });
export const useWalkthrough = () => useContext(WalkthroughContext);

function findTarget(step: WalkthroughStep): HTMLElement | null {
  if (!step.target) return null;
  return [...document.querySelectorAll<HTMLElement>(`[data-walkthrough="${step.target}"]`)].find((target) => target.getClientRects().length > 0 && getComputedStyle(target).visibility !== 'hidden') ?? null;
}

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<WalkthroughSession | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pendingRoute = useRef<string | null>(null);
  const step = session?.steps[session.index];
  const welcoming = session?.phase === 'welcome';
  const lectureSteps = getLectureWalkthrough(pathname);

  const close = () => {
    pendingRoute.current = null;
    setSession(null);
    requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
      else document.getElementById('main-content')?.focus({ preventScroll: true });
    });
  };
  const startChapterTour = useCallback((replace = false) => {
    rememberChapterTour();
    triggerRef.current = document.activeElement as HTMLElement;
    setSession({ kind: 'chapter', steps: chapterTourSteps, index: 0, phase: 'welcome' });
    pendingRoute.current = chapterTourSteps[0]!.path;
    navigate(chapterTourSteps[0]!.path, { replace });
  }, [navigate]);
  const startLectureHelp = () => {
    if (!lectureSteps) return;
    const steps = lectureSteps.filter((item) => findTarget(item));
    if (!steps.length) return;
    triggerRef.current = document.activeElement as HTMLElement;
    setSession({ kind: 'lecture', steps, index: 0, phase: 'steps' });
  };
  const move = (index: number) => {
    if (!session) return;
    const next = session.steps[index];
    if (!next) { close(); return; }
    setSession({ ...session, index });
    if (pathname !== next.path) {
      pendingRoute.current = next.path;
      navigate(next.path);
    }
  };

  useEffect(() => {
    // React Router may commit the new page after the session update. Wait for tour navigation.
    if (pendingRoute.current) {
      if (pathname !== pendingRoute.current) return;
      pendingRoute.current = null;
    }
    // Browser navigation leaves the tour rather than taking the learner back to its route.
    if (step && pathname !== step.path) setSession(null);
  }, [pathname, step]);
  useLayoutEffect(() => {
    if (welcoming || !step || pathname !== step.path) { setTarget(null); return; }
    const resolve = () => setTarget(findTarget(step));
    resolve();
    window.addEventListener('resize', resolve);
    return () => window.removeEventListener('resize', resolve);
  }, [pathname, step, welcoming]);
  targetRef.current = target;
  const ready = Boolean(!welcoming && step && pathname === step.path && target);
  const description = step && target?.matches(':disabled') && step.unavailable
    ? step.description + ' ' + step.unavailable : step?.description;

  const actions = session && <>
    {session.kind === 'chapter' && <Button variant="ghost" onClick={close}>Exit tour</Button>}
    <Button disabled={session.index === 0} onClick={() => move(session.index - 1)}>Back</Button>
    <Button variant="primary" onClick={() => move(session.index + 1)}>{session.index === session.steps.length - 1 ? 'Finish' : 'Next'}</Button>
  </>;

  return <WalkthroughContext value={{ open: session !== null, lectureHelpAvailable: lectureSteps !== null, startChapterTour, startLectureHelp }}>
    {children}
    {welcoming && session && pathname === step?.path && <Dialog open onClose={close} title={chapterTourWelcome.title} eyebrow="Chapter walkthrough">
      <p className="text-sm leading-relaxed text-text-muted">{chapterTourWelcome.description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={close}>Exit</Button>
        <Button variant="primary" onClick={() => setSession({ ...session, phase: 'steps' })}>Start walkthrough</Button>
      </div>
    </Dialog>}
    {!welcoming && session && step && !step.target && pathname === step.path && <Dialog open onClose={close} title={step.title} eyebrow="Chapter 1 tour" className="[&_h2]:text-4xl">
      <p className="text-sm leading-relaxed text-text-muted">{step.description}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div>
    </Dialog>}
    {ready && session && step && <Spotlight open targetRef={targetRef} step={session.index + 1} total={session.steps.length}
      title={step.title} description={description} phaseLabel={session.kind === 'chapter' ? 'Chapter 1 tour' : 'Lecture controls'}
      visual={null} closeLabel="Close walkthrough" onClose={close}>
      {actions}
    </Spotlight>}
  </WalkthroughContext>;
}
