import { useLayoutEffect, type RefObject } from 'react';

/** Adapt to the workspace width, including changes made by the chapter sidebar. */
export function useResponsiveLabLayout(pageRef: RefObject<HTMLElement | null>, enabled: boolean, pageKey: string) {
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !enabled) return;
    const heading = page.querySelector<HTMLElement>('.guided-lab-heading')!;
    const title = heading.querySelector<HTMLElement>('h1')!;
    const controls = heading.querySelector<HTMLElement>('.guided-lab-controls')!;
    const context = document.createElement('canvas').getContext('2d')!;
    const measure = () => {
      // Inspect the original frame before deciding whether it needs reflow.
      // Removing/restoring this attribute happens synchronously before paint.
      page.removeAttribute('data-compact-header');
      page.removeAttribute('data-wrap-toolbar');
      const style = getComputedStyle(page);
      const width = page.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const titleStyle = getComputedStyle(title);
      context.font = titleStyle.font;
      const text = title.textContent ?? '';
      const titleIcon = title.querySelector('svg');
      const inlineIcon = titleIcon && getComputedStyle(titleIcon).position !== 'absolute';
      const titleWidth = context.measureText(text).width + (parseFloat(titleStyle.letterSpacing) || 0) * text.length
        + (inlineIcon ? 32 : 0);
      const subtitle = heading.querySelector('p');
      const titleBox = title.getBoundingClientRect();
      const toolbar = controls.getBoundingClientRect();
      const titleGroup = title.parentElement!;
      const titleGroupVisible = getComputedStyle(titleGroup).display !== 'contents';
      const crampedSubtitle = subtitle && getComputedStyle(subtitle).display !== 'none'
        && titleGroupVisible && titleGroup.getBoundingClientRect().width < 360
        && titleBox.top < toolbar.bottom && titleBox.bottom > toolbar.top;
      const wrappedControls = titleGroupVisible && toolbar.top >= titleBox.bottom;
      const tablet = innerWidth >= 640;
      page.toggleAttribute('data-compact-header', tablet && (width < 760 || Boolean(crampedSubtitle) || wrappedControls
        || titleBox.width + 1 < titleWidth || titleBox.height > parseFloat(titleStyle.lineHeight) + 1
        || toolbar.right > page.getBoundingClientRect().right - parseFloat(style.paddingRight) + 1));
      page.toggleAttribute('data-narrow-panels', tablet && width < 900);
      // Absolute exercise anchors cannot safely preserve a desktop frame here.
      const anchoredExercise = page.matches('.object-exercise-page, .progress-exercise-page');
      const compactAnchoredExercise = anchoredExercise && !tablet && innerHeight <= 740;
      page.toggleAttribute('data-responsive-flow', innerHeight < 600 || compactAnchoredExercise || (anchoredExercise && tablet && width < 900));
      const progress = controls.querySelector<HTMLElement>('.guided-lab-progress');
      if (progress) {
        const actions = Array.from(controls.querySelectorAll<HTMLElement>(':scope > button'));
        const centers = actions.map(action => action.offsetTop + action.offsetHeight / 2);
        page.style.setProperty('--toolbar-progress-width', `${progress.offsetWidth}px`);
        page.toggleAttribute('data-wrap-toolbar', tablet && Math.max(...centers) - Math.min(...centers) > 1);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [page, heading, controls, title]) observer.observe(element);
    const titleObserver = new MutationObserver(measure);
    titleObserver.observe(title, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      titleObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pageRef, enabled, pageKey]);
}
