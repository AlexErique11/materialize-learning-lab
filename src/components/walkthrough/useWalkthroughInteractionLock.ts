import { useLayoutEffect } from 'react';

/** Keep the tour modal between steps too, while allowing its own content to scroll. */
export function useWalkthroughInteractionLock(active: boolean, onClose: () => void) {
  useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previous = root.getAttribute('data-walkthrough-active');
    root.setAttribute('data-walkthrough-active', innerWidth > root.clientWidth ? 'scrollable' : 'fixed');

    const inside = (event: Event, selector: string) => event.target instanceof Element && Boolean(event.target.closest(selector));
    const blockBackgroundScroll = (event: Event) => {
      if (!inside(event, '.walkthrough-dialog.dialog, .walkthrough-dialog .relation-guide-card')) event.preventDefault();
    };
    const blockBackgroundInteraction = (event: Event) => {
      if (!inside(event, '.walkthrough-dialog')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const blockBackgroundKey = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || (event.ctrlKey && event.key !== 'Enter')) return;
      const dialog = document.querySelector<HTMLDialogElement>('.walkthrough-dialog:modal');
      if (event.key === 'Tab' && dialog) {
        const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
          .filter(button => button.getClientRects().length > 0);
        const first = buttons[0];
        const last = buttons.at(-1);
        const current = document.activeElement;
        if (!dialog.contains(current) || current === dialog || current === (event.shiftKey ? first : last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus({ preventScroll: true });
        }
        return;
      }
      if (!inside(event, '.walkthrough-dialog')) {
        blockBackgroundInteraction(event);
        if (event.key === 'Escape') onClose();
      }
    };
    window.addEventListener('wheel', blockBackgroundScroll, { capture: true, passive: false });
    window.addEventListener('touchmove', blockBackgroundScroll, { capture: true, passive: false });
    window.addEventListener('pointerdown', blockBackgroundInteraction, true);
    window.addEventListener('click', blockBackgroundInteraction, true);
    window.addEventListener('keydown', blockBackgroundKey, true);
    return () => {
      if (previous === null) root.removeAttribute('data-walkthrough-active');
      else root.setAttribute('data-walkthrough-active', previous);
      window.removeEventListener('wheel', blockBackgroundScroll, true);
      window.removeEventListener('touchmove', blockBackgroundScroll, true);
      window.removeEventListener('pointerdown', blockBackgroundInteraction, true);
      window.removeEventListener('click', blockBackgroundInteraction, true);
      window.removeEventListener('keydown', blockBackgroundKey, true);
    };
  }, [active, onClose]);
}
