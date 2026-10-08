import { CircleHelp } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useWalkthrough } from './WalkthroughProvider';

export function LectureControlsTourButton() {
  const { startLectureHelp } = useWalkthrough();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const slot = button?.parentElement;
    const page = button?.closest('.guided-lab-page');
    const guidedRun = page?.querySelector<HTMLElement>('[data-walkthrough="guided"]');
    if (!button || !slot || !page || !guidedRun) return;

    const align = () => {
      const target = guidedRun.getBoundingClientRect();
      const slotBounds = slot.getBoundingClientRect();
      const titleElement = page.querySelector('h1');
      const titleRange = document.createRange();
      if (titleElement) titleRange.selectNodeContents(titleElement);
      const title = titleElement ? titleRange.getBoundingClientRect() : undefined;
      const buttonBounds = button.getBoundingClientRect();
      let center = target.left + target.width / 2;
      // Keep the title readable when the guided-run control wraps left on small screens.
      if (title && title.top < buttonBounds.bottom && title.bottom > buttonBounds.top) {
        center = Math.max(center, title.right + 8 + buttonBounds.width / 2);
      }
      button.style.setProperty('--lecture-tour-center', `${center - slotBounds.left}px`);
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(page);
    observer.observe(guidedRun);
    observer.observe(slot);
    window.addEventListener('resize', align);
    return () => { observer.disconnect(); window.removeEventListener('resize', align); };
  }, [pathname]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="chapter-walkthrough-button"
      aria-label="Lecture controls walkthrough"
      onClick={startLectureHelp}
    >
      <CircleHelp size={16} aria-hidden="true" />
      <span>Controls tour</span>
    </button>
  );
}
