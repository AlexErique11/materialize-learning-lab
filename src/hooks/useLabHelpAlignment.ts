import { useLayoutEffect, type RefObject } from 'react';

/** Align page help to its toolbar controls without changing the header's footprint. */
export function useLabHelpAlignment(pageRef: RefObject<HTMLElement | null>, lecture: boolean, tourAvailable: boolean, pageKey: string) {
  useLayoutEffect(() => {
    const page = pageRef.current;
    const helpRow = page?.querySelector(':scope > .guided-lab-top-row');
    const shortcuts = helpRow?.querySelector<HTMLElement>('.shortcut-help-trigger');
    if (!page || !shortcuts) return;
    const tour = helpRow?.querySelector<HTMLElement>('.chapter-walkthrough-button');
    const toolbar = page.querySelector(':scope > .guided-lab-heading > .guided-lab-controls');
    const targets = lecture ? [] : [...(toolbar?.querySelectorAll<HTMLElement>('[data-walkthrough="check"]') ?? [])];
    const guidedRun = toolbar?.querySelector<HTMLElement>('[data-walkthrough="guided"]');
    const title = page.querySelector(':scope > .guided-lab-heading h1');
    const help = shortcuts.parentElement;
    const align = () => {
      if (page.hasAttribute('data-compact-header') && title && help) {
        const titleBounds = title.getBoundingClientRect();
        const pageBounds = page.getBoundingClientRect();
        page.style.setProperty('--compact-help-reserve', `${help.getBoundingClientRect().width + 16}px`);
        page.style.setProperty('--compact-help-top', `${titleBounds.top + titleBounds.height / 2 - pageBounds.top}px`);
        return;
      }
      if (lecture) shortcuts.style.removeProperty('--shortcut-offset');
      const bounds = shortcuts.getBoundingClientRect();
      if (!bounds.width) return;
      const pageBounds = page.getBoundingClientRect();
      const style = getComputedStyle(page);
      const left = pageBounds.left + parseFloat(style.paddingLeft);
      const right = pageBounds.right - parseFloat(style.paddingRight);
      const titleRange = document.createRange();
      if (title) titleRange.selectNodeContents(title);
      const titleBounds = title ? titleRange.getBoundingClientRect() : null;
      const clearTitle = (button: DOMRect) => titleBounds && titleBounds.top < button.bottom && titleBounds.bottom > button.top
        ? Math.max(left, titleBounds.right + 8) : left;
      const tourBounds = tour?.getBoundingClientRect();
      const targetBounds = targets.map(target => target.getBoundingClientRect()).filter(target => target.width > 0);
      if (targetBounds.length) {
        const center = (Math.min(...targetBounds.map(target => target.left)) + Math.max(...targetBounds.map(target => target.right))) / 2;
        const minimum = clearTitle(bounds) + bounds.width / 2;
        const maximum = right - (tourBounds ? tourBounds.width + 4 : 0) - bounds.width / 2;
        const desired = Math.max(minimum, Math.min(center, maximum));
        const offset = parseFloat(shortcuts.style.getPropertyValue('--shortcut-offset')) || 0;
        shortcuts.style.setProperty('--shortcut-offset', `${offset + desired - bounds.left - bounds.width / 2}px`);
      }
      if (tour && tourBounds && guidedRun && tour.parentElement) {
        const target = guidedRun.getBoundingClientRect();
        const shortcutBounds = shortcuts.getBoundingClientRect();
        const minimum = Math.max(clearTitle(tourBounds), shortcutBounds.right + 4) + tourBounds.width / 2;
        const center = Math.max(minimum, Math.min(target.left + target.width / 2, right - tourBounds.width / 2));
        tour.style.setProperty('--lecture-tour-center', `${center - tour.parentElement.getBoundingClientRect().left}px`);
      }
    };
    align();
    const observer = new ResizeObserver(align);
    for (const element of [page, shortcuts, help, title, tour, guidedRun, ...targets]) if (element) observer.observe(element);
    const modeObserver = new MutationObserver(align);
    modeObserver.observe(page, { attributes: true, attributeFilter: ['data-compact-header'] });
    window.addEventListener('resize', align);
    return () => { observer.disconnect(); modeObserver.disconnect(); window.removeEventListener('resize', align); };
  }, [pageRef, lecture, tourAvailable, pageKey]);
}
