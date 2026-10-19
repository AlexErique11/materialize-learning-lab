import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useBlocker, useLocation, type BlockerFunction } from 'react-router';
import { useWalkthrough } from '../components/walkthrough/WalkthroughProvider';
import { isLabIntroEntry } from '../components/lab/LabEntryTransition';
import '../styles/lab-return.css';

interface AreaRun {
  fromKey: string;
  toPath: string;
  committedKey?: string;
  direction: number;
  snapshot: HTMLElement;
  animations: Animation[];
  finish: () => void;
}

function captureArea() {
  const main = document.getElementById('main-content')!;
  const bounds = main.getBoundingClientRect();
  const headerBottom = document.querySelector('header')!.getBoundingClientRect().bottom;
  const snapshot = document.createElement('div');
  snapshot.className = `${main.closest('.app-shell')!.className} lab-return-snapshot`;
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.inert = true;
  snapshot.style.top = `${headerBottom}px`;
  const copy = main.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  Object.assign(copy.style, {
    position: 'absolute', top: `${bounds.top - headerBottom}px`, left: `${bounds.left}px`,
    width: `${bounds.width}px`, height: `${bounds.height}px`, margin: '0',
  });
  for (const element of copy.querySelectorAll<HTMLElement>('[id], [data-walkthrough]')) {
    if (element instanceof HTMLElement) element.removeAttribute('id');
    element.removeAttribute('data-walkthrough');
  }
  const sidebar = main.querySelector<HTMLElement>('.chapter-sidebar');
  const sidebarCopy = copy.querySelector<HTMLElement>('.chapter-sidebar');
  if (sidebar && sidebarCopy) {
    // Freeze the sticky sidebar at its current viewport position in the snapshot.
    Object.assign(sidebarCopy.style, {
      position: 'relative', top: '0',
      transform: `translateY(${sidebar.getBoundingClientRect().top - bounds.top}px)`,
    });
  }
  const view = document.createElement('div');
  view.className = 'lab-return-view';
  const backgrounds = [main, main.closest('.app-shell')!, document.documentElement];
  view.style.background = backgrounds.map((element) => getComputedStyle(element).backgroundColor)
    .find((color) => color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') ?? 'var(--background)';
  view.append(copy);
  const footer = document.querySelector<HTMLElement>('.app-footer');
  if (footer) {
    const footerBounds = footer.getBoundingClientRect();
    const footerCopy = footer.cloneNode(true) as HTMLElement;
    Object.assign(footerCopy.style, {
      position: 'absolute', top: `${footerBounds.top - headerBottom}px`, left: `${footerBounds.left}px`,
      width: `${footerBounds.width}px`, height: `${footerBounds.height}px`, margin: '0',
    });
    view.append(footerCopy);
  }
  snapshot.append(view);
  document.body.append(snapshot);
  const originals = [main, ...main.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  originals.forEach((element, index) => {
    copies[index]!.scrollTop = element.scrollTop;
    copies[index]!.scrollLeft = element.scrollLeft;
  });
  return snapshot;
}

function area(path: string) {
  if (path === '/') return 'path';
  if (path === '/labs' || path.startsWith('/labs/')) return 'labs';
  if (path === '/challenges' || path.startsWith('/challenges/')) return 'challenges';
  return null;
}

export function AreaTransition() {
  const location = useLocation();
  const { open: tourOpen } = useWalkthrough();
  const runRef = useRef<AreaRun | null>(null);
  const blocker = useBlocker(useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => (
    Boolean(area(currentLocation.pathname) && area(nextLocation.pathname))
    && area(currentLocation.pathname) !== area(nextLocation.pathname)
    && !tourOpen
    && !isLabIntroEntry(nextLocation)
    && !document.querySelector('.lab-intro-screen')
  ), [tourOpen]));

  useEffect(() => () => runRef.current?.finish(), []);

  useLayoutEffect(() => {
    const run = runRef.current;
    if (!run) return;
    if (run.committedKey) {
      if (location.key !== run.committedKey) run.finish();
      return;
    }
    if (location.key === run.fromKey) return;
    if (location.pathname !== run.toPath) {
      run.finish();
      return;
    }
    run.committedKey = location.key;
    const main = document.getElementById('main-content')!;
    // An opaque outgoing sheet reveals the destination without overlapping its text.
    run.animations = [
      run.snapshot.querySelector('.lab-return-view')!.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${run.direction * 100}%)` }], {
        id: 'lab-return-out', duration: 360, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both',
      }),
      main.animate([{ transform: `translateX(${-run.direction * 24}px)` }, { transform: 'translateX(0)' }], {
        id: 'lab-return-in', duration: 360, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both',
      }),
    ];
    void Promise.all(run.animations.map((animation) => animation.finished)).then(run.finish, run.finish);
  }, [location.key, location.pathname]);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    runRef.current?.finish();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      blocker.proceed();
      return;
    }

    const run: AreaRun = {
      fromKey: location.key,
      toPath: blocker.location.pathname,
      direction: area(blocker.location.pathname) === 'path' ? 1 : -1,
      snapshot: captureArea(),
      animations: [],
      finish: () => {
        if (runRef.current !== run) return;
        runRef.current = null;
        run.snapshot.remove();
        for (const animation of run.animations) animation.cancel();
      },
    };
    runRef.current = run;
    blocker.proceed();
  }, [blocker, location.key]);

  return null;
}
