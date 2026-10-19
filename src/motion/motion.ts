export const motion = {
  quick: 120,
  normal: 200,
  ease: 'cubic-bezier(0.25, 1, 0.5, 1)',
};

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateMotion(element: Element | null, name: string, keyframes: Keyframe[], duration = motion.normal) {
  if (!element || reducedMotion() || !element.getClientRects().length) return null;
  const id = `ui-motion-${name}`;
  for (const animation of element.getAnimations()) if (animation.id === id) animation.cancel();
  const animation = element.animate(keyframes, { id, duration, easing: motion.ease });
  // Cancellation is normal when a learner changes direction or leaves the page.
  void animation.finished.catch(() => {});
  return animation;
}

export function reveal(element: Element | null, name = 'reveal', distance = 4) {
  return animateMotion(element, name, [
    { opacity: 0.55, transform: `translateY(${distance}px)` },
    { opacity: 1, transform: 'translateY(0)' },
  ]);
}

// Measure once on either side of a layout change; animate only transforms.
export function moveLayout(element: HTMLElement, update: () => void) {
  if (reducedMotion()) { update(); return; }
  const siblings = new Set<HTMLElement>();
  let current: HTMLElement | null = element;
  for (let depth = 0; current?.parentElement && depth < 4; depth += 1) {
    for (const sibling of current.parentElement.children) {
      if (sibling instanceof HTMLElement && sibling !== current && !sibling.contains(element)) siblings.add(sibling);
    }
    current = current.parentElement;
    if (current.matches('main, .learning-area')) break;
  }
  const before = new Map([...siblings].map((sibling) => [sibling, sibling.getBoundingClientRect()]));
  update();
  for (const [sibling, bounds] of before) {
    if (!sibling.isConnected) continue;
    for (const animation of sibling.getAnimations()) if (animation.id === 'ui-motion-layout') animation.cancel();
    const next = sibling.getBoundingClientRect();
    const x = bounds.left - next.left;
    const y = bounds.top - next.top;
    if (Math.abs(x) + Math.abs(y) > 1) animateMotion(sibling, 'layout', [
      { transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' },
    ]);
  }
}
