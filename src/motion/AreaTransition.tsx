import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useBlocker, useLocation, type BlockerFunction } from 'react-router';
import { useWalkthrough } from '../components/walkthrough/WalkthroughProvider';
import { isLabIntroEntry } from '../components/lab/LabEntryTransition';
import { motion, reducedMotion } from './motion';
import { challenge } from '../challenges/challengeRegistry';

interface AreaRun {
  fromKey: string;
  toPath: string;
  toKey: string;
  committedKey?: string;
  introEntry: boolean;
  page: boolean;
  direction: number;
  viewport: HTMLElement;
  snapshot: HTMLElement;
  animations: Animation[];
  content?: HTMLElement;
  frame?: number;
  timer?: number;
  finish: () => void;
}

function area(path: string) {
  if (path === '/') return 'path';
  if (path === '/labs' || path.startsWith('/labs/')) return 'labs';
  if (path === challenge.path || challenge.legacyPaths.some(legacy => path === legacy)) return 'challenge';
  return null;
}

let snapshotSequence = 0;
const areaOrder = ['path', 'labs', 'challenge'];

function captureArea(previous?: HTMLElement) {
  const main = document.getElementById('main-content')!;
  const bounds = main.getBoundingClientRect();
  const headerBottom = document.querySelector('header')!.getBoundingClientRect().bottom;
  const viewport = document.createElement('div');
  viewport.className = 'area-transition-viewport';
  viewport.style.top = `${headerBottom}px`;
  viewport.setAttribute('aria-hidden', 'true');
  viewport.inert = true;
  const snapshot = document.createElement('div');
  snapshot.className = `${main.closest('.app-shell')!.className} area-transition-layer`;
  snapshot.dataset.areaTransitionView = 'outgoing';
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.inert = true;
  snapshot.style.backgroundColor = [main, main.closest('.app-shell')!, document.documentElement]
    .map(element => getComputedStyle(element).backgroundColor)
    .find(color => color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') ?? 'var(--background)';
  const copy = main.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  Object.assign(copy.style, {
    position: 'absolute', top: `${bounds.top - headerBottom}px`, left: `${bounds.left}px`,
    width: `${bounds.width}px`, height: `${bounds.height}px`, margin: '0',
  });
  // Keep SVG gradients and connector arrowheads local to the frozen view.
  const prefix = `area-transition-${++snapshotSequence}-`;
  const svgIds = new Map<string, string>();
  for (const element of copy.querySelectorAll('[id], [data-walkthrough]')) {
    if (element.id && element instanceof SVGElement) {
      svgIds.set(element.id, `${prefix}${element.id}`);
      element.id = `${prefix}${element.id}`;
    } else element.removeAttribute('id');
    element.removeAttribute('data-walkthrough');
  }
  for (const element of copy.querySelectorAll('svg *')) for (const attribute of Array.from(element.attributes)) {
    attribute.value = attribute.value.replace(/url\(#([^)]+)\)/g, (reference, id: string) => svgIds.has(id) ? `url(#${svgIds.get(id)})` : reference);
  }
  const sidebar = main.querySelector<HTMLElement>('.chapter-sidebar');
  const sidebarCopy = copy.querySelector<HTMLElement>('.chapter-sidebar');
  if (sidebar && sidebarCopy) Object.assign(sidebarCopy.style, {
    position: 'relative', top: '0',
    transform: `translateY(${sidebar.getBoundingClientRect().top - bounds.top}px)`,
  });
  snapshot.append(copy);
  const footer = document.querySelector<HTMLElement>('.app-footer');
  if (footer) {
    const footerBounds = footer.getBoundingClientRect();
    const footerCopy = footer.cloneNode(true) as HTMLElement;
    Object.assign(footerCopy.style, {
      position: 'absolute', top: `${footerBounds.top - headerBottom}px`, left: `${footerBounds.left}px`,
      width: `${footerBounds.width}px`, height: `${footerBounds.height}px`, margin: '0',
    });
    snapshot.append(footerCopy);
  }
  // Preserve the visible frame when another navigation interrupts the transition.
  const previousLayers = previous?.dataset.transitionKind === 'page' ? [previous] : previous?.children ?? [];
  for (const layer of previousLayers) {
    const blend = layer.cloneNode(true) as HTMLElement;
    Object.assign(blend.style, {
      position: 'absolute', top: '0', width: '100%', height: '100%',
      transform: getComputedStyle(layer).transform, opacity: getComputedStyle(layer).opacity,
    });
    if (layer === previous) Array.from(layer.children).forEach((child, index) => {
      const copy = blend.children[index] as HTMLElement;
      copy.style.opacity = getComputedStyle(child).opacity;
      copy.style.transform = getComputedStyle(child).transform;
    });
    snapshot.append(blend);
  }
  viewport.append(snapshot);
  document.body.append(viewport);
  const originals = [main, ...main.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  originals.forEach((element, index) => {
    copies[index]!.scrollTop = element.scrollTop;
    copies[index]!.scrollLeft = element.scrollLeft;
    if (element.getAnimations().length) {
      const current = getComputedStyle(element);
      copies[index]!.style.opacity = current.opacity;
      copies[index]!.style.transform = current.transform;
    }
  });
  return { viewport, snapshot };
}

function clipToContent(viewport: HTMLElement, content: HTMLElement) {
  const bounds = content.getBoundingClientRect();
  const top = parseFloat(viewport.style.top);
  viewport.style.clipPath = `inset(${Math.max(0, bounds.top - top)}px ${Math.max(0, innerWidth - bounds.right)}px 0 ${Math.max(0, bounds.left)}px)`;
}

export function AreaTransition() {
  const location = useLocation();
  const { open: tourOpen } = useWalkthrough();
  const runRef = useRef<AreaRun | null>(null);
  const blocker = useBlocker(useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => (
    Boolean(area(currentLocation.pathname) && area(nextLocation.pathname))
    && (area(currentLocation.pathname) !== area(nextLocation.pathname)
      || (currentLocation.pathname.startsWith('/labs/') && nextLocation.pathname.startsWith('/labs/')
        && currentLocation.pathname !== nextLocation.pathname))
    && !tourOpen
    && !document.querySelector('.lab-intro-screen')
  ), [tourOpen]));

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => { if (preference.matches) runRef.current?.finish(); };
    preference.addEventListener('change', stop);
    return () => { preference.removeEventListener('change', stop); runRef.current?.finish(); };
  }, []);

  useLayoutEffect(() => {
    const run = runRef.current;
    if (!run) return;
    if (run.committedKey) {
      if (location.key !== run.committedKey) run.finish();
      return;
    }
    if (location.key === run.fromKey) return;
    if (location.pathname !== run.toPath || reducedMotion()) {
      run.finish();
      return;
    }
    run.committedKey = location.key;
    if (run.introEntry) {
      // Keep the source page behind the loading screen until its entrance is opaque.
      run.timer = window.setTimeout(run.finish, motion.introEnterDuration);
      return;
    }
    document.getElementById('main-content')!.dataset.areaTransition = 'entering';
    if (run.page) {
      const content = document.querySelector<HTMLElement>('#main-content .learning-area-content');
      if (!content) { run.finish(); return; }
      run.content = content;
      content.inert = true;
      content.setAttribute('aria-busy', 'true');
      clipToContent(run.viewport, content);
      const images = Array.from(content.querySelectorAll('img')).filter(image => image.getBoundingClientRect().top < innerHeight);
      // Decorative assets may stall; reveal the reserved layout after a bounded wait.
      const assetsReady = Promise.race([
        Promise.all([document.fonts.ready, ...images.map(image => image.decode().catch(() => {}))]),
        new Promise<void>(resolve => { run.timer = window.setTimeout(resolve, 1500); }),
      ]);
      void Promise.all([run.animations[0]!.finished, assetsReady]).then(() => {
        window.clearTimeout(run.timer);
        if (runRef.current !== run) return;
        run.frame = requestAnimationFrame(() => {
          run.frame = requestAnimationFrame(() => {
            if (runRef.current !== run) return;
            const reveal = run.viewport.animate([{ opacity: 1 }, { opacity: 0 }], {
              id: 'ui-motion-route-enter', duration: motion.pageEnterDuration, easing: motion.ease, fill: 'both',
            });
            run.animations.push(reveal);
            void reveal.finished.then(run.finish, run.finish);
          });
        });
      }, () => {});
      return;
    }
    run.frame = requestAnimationFrame(() => {
      if (runRef.current !== run) return;
      if (reducedMotion()) { run.finish(); return; }
      const coversCurrentPage = run.toPath === '/';
      let movingView = run.snapshot;
      if (coversCurrentPage) {
        // Move a frozen Learning path over the lab; keep the live page untransformed.
        const incoming = captureArea();
        incoming.snapshot.dataset.areaTransitionView = 'incoming';
        run.viewport.append(incoming.snapshot);
        incoming.viewport.remove();
        movingView = incoming.snapshot;
      }
      const animation = movingView.animate(coversCurrentPage
        ? [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }]
        : [{ transform: 'translateX(0)' }, { transform: `translateX(${run.direction * 100}%)` }], {
        id: coversCurrentPage ? 'lab-return-in' : 'lab-return-out',
        duration: motion.areaDuration, easing: motion.areaEase, fill: 'both',
      });
      run.animations.push(animation);
      void animation.finished.then(run.finish, run.finish);
    });
  }, [location.key, location.pathname]);

  useEffect(() => {
    if (blocker.state !== 'blocked' || runRef.current?.toKey === blocker.location.key) return;
    if (reducedMotion()) {
      runRef.current?.finish();
      blocker.proceed();
      return;
    }
    const captured = captureArea(runRef.current?.viewport);
    runRef.current?.finish();
    const run: AreaRun = {
      fromKey: location.key,
      toPath: blocker.location.pathname,
      toKey: blocker.location.key,
      introEntry: isLabIntroEntry(blocker.location),
      page: area(location.pathname) === 'labs' && area(blocker.location.pathname) === 'labs',
      animations: [],
      direction: areaOrder.indexOf(area(blocker.location.pathname)!) > areaOrder.indexOf(area(location.pathname)!) ? -1 : 1,
      ...captured,
      finish: () => {
        if (runRef.current !== run) return;
        runRef.current = null;
        if (run.frame !== undefined) cancelAnimationFrame(run.frame);
        window.clearTimeout(run.timer);
        for (const animation of run.animations) animation.cancel();
        if (run.content) {
          run.content.inert = false;
          run.content.removeAttribute('aria-busy');
        }
        run.viewport.remove();
        delete document.getElementById('main-content')?.dataset.areaTransition;
      },
    };
    runRef.current = run;
    if (run.page) {
      const content = document.querySelector<HTMLElement>('#main-content .learning-area-content')!;
      clipToContent(run.viewport, content);
      run.viewport.dataset.transitionKind = 'page';
      run.viewport.style.backgroundColor = run.snapshot.style.backgroundColor;
      const sidebar = run.snapshot.querySelector<HTMLElement>('.chapter-sidebar');
      if (sidebar) sidebar.style.visibility = 'hidden';
      run.animations.push(run.snapshot.animate([{ opacity: 1 }, { opacity: 0 }], {
        id: 'ui-motion-route-exit', duration: motion.pageExitDuration, easing: motion.ease, fill: 'both',
      }));
    }
    blocker.proceed();
  }, [blocker, location.key]);

  return null;
}
