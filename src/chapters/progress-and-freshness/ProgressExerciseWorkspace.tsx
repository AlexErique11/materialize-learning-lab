import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ChapterDefinition } from '../chapterRegistry';
import { ProgressLecture } from './ProgressLecture';

/** Measure the real lecture frame rather than approximating its responsive offsets. */
export function ProgressExerciseWorkspace({ chapter, lectureIndex, navigation, visualization, question }: {
  chapter: ChapterDefinition; lectureIndex: number; navigation: ReactNode; visualization: ReactNode; question: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const referenceRef = useRef<HTMLDivElement>(null);
  const [reference, setReference] = useState<{ parent: HTMLElement; left: number; top: number; width: number; height: number } | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current!;
    const page = root.closest<HTMLElement>('.progress-exercise-page')!;
    let previous = '';
    const measure = () => {
      if (page.hasAttribute('data-responsive-flow')) {
        previous = '';
        setAnchor(0);
        return;
      }
      const box = page.getBoundingClientRect();
      const dimensions = `${box.left},${box.top},${box.width},${box.height},${page.querySelector('.guided-lab-heading')!.getBoundingClientRect().height}`;
      if (dimensions === previous) return;
      previous = dimensions;
      setReference({ parent: page.parentElement!, left: box.left, top: box.top, width: box.width, height: box.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    observer.observe(page.querySelector('.guided-lab-heading')!);
    const modeObserver = new MutationObserver(measure);
    modeObserver.observe(page, { attributes: true, attributeFilter: ['data-responsive-flow'] });
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); modeObserver.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useLayoutEffect(() => {
    if (!reference) return;
    const panel = referenceRef.current?.querySelector('.progress-lane-panel');
    if (panel) setAnchor(panel.getBoundingClientRect().top - rootRef.current!.getBoundingClientRect().top);
    setReference(null);
  }, [reference]);

  useLayoutEffect(() => {
    if (anchor === null) return;
    const root = rootRef.current!;
    const panel = root.querySelector<HTMLElement>('.progress-lane-panel')!;
    const evidence = root.querySelector<HTMLElement>('.progress-exercise-evidence')!;
    const questionPanel = root.querySelector<HTMLElement>('.exercise-question')!;
    const copy = root.querySelector<HTMLElement>('.exercise-question-copy')!;
    const answers = root.querySelector<HTMLElement>('.exercise-answers')!;
    const footer = root.closest('.progress-exercise-page')!.querySelector('.progress-exercise-playback')!;
    const place = () => {
      if (root.closest('.guided-lab-page')!.hasAttribute('data-responsive-flow')) {
        root.dataset.splitQuestion = 'false';
        root.dataset.dockAnswers = 'false';
        root.dataset.legendEvidence = 'false';
        root.dataset.fits = 'true';
        return;
      }
      root.dataset.dockAnswers = 'false';
      root.dataset.legendEvidence = 'false';
      const gap = innerHeight <= 740 ? 2 : 4;
      const controls = root.closest('.progress-exercise-page')!.querySelector('.guided-lab-controls')!;
      const promptLimit = Math.min(0, controls.getBoundingClientRect().bottom - root.getBoundingClientRect().top + gap);
      const limit = footer.getBoundingClientRect().top - root.getBoundingClientRect().top - gap;
      const outsideSpace = parseFloat(getComputedStyle(panel).marginBottom) || 0;
      const panelHeight = panel.getBoundingClientRect().height + outsideSpace;
      const evidenceHeight = evidence.getBoundingClientRect().height;
      const headerTop = anchor - root.querySelector<HTMLElement>('.progress-stage-row')!.getBoundingClientRect().height - (innerHeight <= 740 ? 4 : 8);
      root.style.setProperty('--exercise-diagram-top', `${anchor}px`);
      let placed = false;
      for (const split of [false, true]) {
        root.dataset.splitQuestion = String(split);
        const questionHeight = questionPanel.getBoundingClientRect().height;
        const copyHeight = copy.getBoundingClientRect().height;
        const answerHeight = answers.getBoundingClientRect().height;
        for (const evidenceAbove of [false, true]) {
          const evidenceTop = evidenceAbove ? headerTop - evidenceHeight - gap : anchor + panelHeight + gap;
          const questionTop = anchor + panelHeight + gap + (evidenceAbove ? 0 : evidenceHeight + gap);
          const copyTop = split ? headerTop - copyHeight - gap - (evidenceAbove ? evidenceHeight + gap : 0) : questionTop;
          const bottom = questionTop + (split ? answerHeight : questionHeight);
          if (copyTop < promptLimit || evidenceTop < 0 || bottom > limit) continue;
          root.style.setProperty('--exercise-evidence-top', `${evidenceTop}px`);
          root.style.setProperty('--exercise-question-top', `${questionTop}px`);
          root.style.setProperty('--exercise-prompt-top', `${copyTop}px`);
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (!placed) {
        root.dataset.splitQuestion = 'true';
        root.dataset.dockAnswers = 'true';
        const evidenceHeight = evidence.getBoundingClientRect().height;
        const origin = root.getBoundingClientRect();
        const footerBox = footer.getBoundingClientRect();
        const next = footer.querySelector('button')?.getBoundingClientRect();
        const completed = root.closest('.progress-exercise-page')!.getAttribute('data-exercise-completed') === 'true';
        // Keep compact answers above the completion message, including after it fades.
        root.style.setProperty('--exercise-answer-width', `${completed ? origin.width : origin.width - Math.max(144, next?.width ?? 0) - 8}px`);
        const answerBottom = completed ? footerBox.top - 1 : footerBox.bottom;
        const answerTop = answerBottom - origin.top - answers.getBoundingClientRect().height;
        const copyHeight = copy.getBoundingClientRect().height;
        let copyTop = headerTop - copyHeight - gap;
        if (copyTop < promptLimit && copyHeight <= headerTop - promptLimit) copyTop = promptLimit;
        root.style.setProperty('--exercise-question-top', `${answerTop}px`);
        root.style.setProperty('--exercise-prompt-top', `${copyTop}px`);
        let evidenceTop = anchor + panelHeight + gap;
        // The omitted fourth lane leaves usable space below a three-lane box.
        // Keep longer feedback there when the new headers fill the upper gap.
        const belowPanel = anchor + panel.getBoundingClientRect().height + gap;
        const aboveHeaders = headerTop - evidenceHeight - gap;
        if (completed && evidenceTop + evidenceHeight + gap > answerTop && belowPanel + evidenceHeight + gap <= answerTop) evidenceTop = belowPanel;
        if (copyTop < promptLimit && belowPanel + copyHeight + gap <= answerTop) {
          copyTop = belowPanel;
          if (aboveHeaders >= promptLimit) evidenceTop = aboveHeaders;
          root.style.setProperty('--exercise-prompt-top', `${copyTop}px`);
        }
        if (copyTop < promptLimit && evidenceTop + evidenceHeight + gap + copyHeight + gap <= answerTop) {
          copyTop = evidenceTop + evidenceHeight + gap;
          root.style.setProperty('--exercise-prompt-top', `${copyTop}px`);
        }
        root.style.setProperty('--exercise-evidence-top', `${evidenceTop}px`);
        placed = copyTop >= promptLimit && evidenceTop + evidenceHeight + gap <= answerTop;
        if (!placed && copyTop >= promptLimit) {
          // Wide, short windows have spare room before the right-aligned key.
          const legend = panel.querySelector<HTMLElement>('.progress-legend')!;
          const firstKey = legend.firstElementChild!.getBoundingClientRect();
          const legendBox = legend.getBoundingClientRect();
          const width = firstKey.left - legendBox.left - 8;
          if (width > 180) {
            root.dataset.legendEvidence = 'true';
            root.style.setProperty('--exercise-evidence-left', `${legendBox.left - origin.left}px`);
            root.style.setProperty('--exercise-evidence-width', `${width}px`);
            const height = evidence.getBoundingClientRect().height;
            root.style.setProperty('--exercise-evidence-top', `${legendBox.bottom + (completed ? 0 : outsideSpace) - origin.top - height}px`);
            placed = height <= legendBox.height && anchor + (completed ? panel.getBoundingClientRect().height : panelHeight) + gap <= answerTop;
          }
        }
      }
      root.dataset.fits = String(placed);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(copy);
    observer.observe(answers);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [anchor, question]);

  return <div ref={rootRef} className="progress-exercise-layout" data-aligned={anchor !== null}>
    {visualization}{question}
    {reference && createPortal(<div ref={referenceRef} className="progress-exercise-reference" aria-hidden="true" inert style={{ position: 'fixed', left: reference.left, top: reference.top, width: reference.width, height: reference.height, visibility: 'hidden', pointerEvents: 'none' }}>
      <ProgressLecture chapter={chapter} navigation={navigation} lectureIndex={lectureIndex} />
    </div>, reference.parent)}
  </div>;
}
