import { useLayoutEffect, type RefObject } from 'react';

/** Fit the inspector beneath the aligned diagrams without moving the playback footer. */
export function useProgressLectureLayout(detailRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const detail = detailRef.current!;
    const workspace = detail.closest<HTMLElement>('.lecture-workspace')!;
    const content = workspace.querySelector<HTMLElement>('.lecture-visualization-content')!;
    const footer = workspace.querySelector<HTMLElement>('.relation-playback-controls')!;
    const measure = () => {
      const frame = getComputedStyle(workspace);
      const preferred = parseFloat(getComputedStyle(detail).getPropertyValue('--progress-inspector-preferred-height'));
      const otherContent = content.getBoundingClientRect().height - detail.getBoundingClientRect().height;
      const available = parseFloat(frame.getPropertyValue('--lecture-frame-height')) - parseFloat(frame.paddingTop)
        - parseFloat(frame.getPropertyValue('--lecture-applied-footer-gap')) - footer.getBoundingClientRect().height - otherContent;
      const height = Math.max(36, Math.min(preferred, available));
      detail.style.setProperty('--progress-inspector-height', `${height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [workspace, content, footer]) observer.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [detailRef]);
}
