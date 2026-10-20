import { useEffect } from 'react';
import { animateMotion, moveLayout, reducedMotion, reveal } from './motion';
import '../styles/motion.css';

export function UiMotion() {
  useEffect(() => {
    const pending = new Map<HTMLDetailsElement, { open: boolean; animations: Animation[] }>();
    const toggle = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const summary = event.target instanceof Element ? event.target.closest('summary') : null;
      const details = summary?.parentElement;
      if (!(details instanceof HTMLDetailsElement) || details.closest('[inert]')) return;
      event.preventDefault();
      const previous = pending.get(details);
      const open = !(previous?.open ?? details.open);
      const content = [...details.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child !== summary);
      const states = content.map((child) => ({ opacity: getComputedStyle(child).opacity, transform: getComputedStyle(child).transform }));
      const wasOpen = details.open;
      for (const child of content) for (const animation of child.getAnimations()) {
        if (animation.id.startsWith('ui-motion-disclosure')) animation.cancel();
      }
      const entry = { open, animations: [] as Animation[] };
      pending.set(details, entry);
      const finish = () => {
        if (pending.get(details) !== entry || !details.isConnected) return;
        moveLayout(details, () => { details.open = open; });
        for (const [index, child] of content.entries()) {
          child.inert = false;
          if (open) {
            if (wasOpen) animateMotion(child, 'disclosure-open', [states[index]!, { opacity: 1, transform: 'translateY(0)' }]);
            else reveal(child, 'disclosure-open');
          }
        }
        pending.delete(details);
      };
      if (open || reducedMotion()) finish();
      else {
        for (const [index, child] of content.entries()) {
          child.inert = true;
          const animation = animateMotion(child, 'disclosure-close', [states[index]!, { opacity: 0, transform: 'translateY(0)' }], 120);
          if (animation) entry.animations.push(animation);
        }
        void Promise.all(entry.animations.map((animation) => animation.finished)).then(finish, finish);
      }
    };
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (preference.matches) for (const animation of document.getAnimations()) {
        if (animation.id.startsWith('ui-motion-') || animation.id.startsWith('lab-return-')) animation.finish();
      }
    };
    document.addEventListener('click', toggle);
    preference.addEventListener('change', stop);
    return () => {
      document.removeEventListener('click', toggle);
      preference.removeEventListener('change', stop);
      for (const entry of pending.values()) for (const animation of entry.animations) animation.cancel();
      pending.clear();
    };
  }, []);
  return null;
}
