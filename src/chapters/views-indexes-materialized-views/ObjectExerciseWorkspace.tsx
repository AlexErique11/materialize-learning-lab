import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ChapterDefinition } from '../chapterRegistry';
import { ObjectChapterLecture } from './ChapterLecture';

/** Use the actual lecture frame, including its responsive centering. */
export function ObjectExerciseWorkspace({ chapter, navigation, visualization, question, footer, copyVariants, inlineAnswers = false }: {
  chapter: ChapterDefinition; navigation: ReactNode; visualization: ReactNode; question: ReactNode; footer: ReactNode;
  copyVariants: readonly { title: string; text: string; result: string }[];
  inlineAnswers?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const referenceRef = useRef<HTMLDivElement>(null);
  const [reference, setReference] = useState<{ parent: HTMLElement; left: number; top: number; width: number; height: number } | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current!;
    const page = root.closest<HTMLElement>('.object-exercise-page')!;
    let previous = '';
    let fitSize = '';
    const measure = () => {
      const size = `${innerWidth},${innerHeight},${page.getBoundingClientRect().left}`;
      if (size !== fitSize) {
        page.removeAttribute('data-inline-answer-flow');
        fitSize = size;
      }
      if (page.matches('[data-responsive-flow], [data-inline-answer-flow]')) {
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
    modeObserver.observe(page, { attributes: true, attributeFilter: ['data-responsive-flow', 'data-inline-answer-flow'] });
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); modeObserver.disconnect(); window.removeEventListener('resize', measure); page.removeAttribute('data-inline-answer-flow'); };
  }, [inlineAnswers]);

  useLayoutEffect(() => {
    if (!reference) return;
    const canvas = referenceRef.current?.querySelector('.flow-canvas');
    if (canvas) setAnchor(canvas.getBoundingClientRect().top - rootRef.current!.getBoundingClientRect().top);
    setReference(null);
  }, [reference]);

  useLayoutEffect(() => {
    if (anchor === null) return;
    const root = rootRef.current!;
    const canvas = root.querySelector<HTMLElement>('.flow-canvas')!;
    const questionPanel = root.querySelector<HTMLElement>('.exercise-question')!;
    const footerPanel = root.closest('.object-exercise-page')!.querySelector<HTMLElement>('.object-exercise-footer')!;
    const reserveCopy = () => {
      const clone = questionPanel.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      // Measurement copies must not join and uncheck the learner's radio group.
      clone.querySelectorAll('[name]').forEach(element => element.removeAttribute('name'));
      Object.assign(clone.style, { visibility: 'hidden', pointerEvents: 'none', top: '0px' });
      const copy = clone.querySelector<HTMLElement>('.exercise-question-copy')!;
      copy.style.minHeight = '0px';
      root.appendChild(clone);
      let height = 0;
      for (const variant of copyVariants) {
        clone.dataset.result = variant.result;
        copy.querySelector('h2 > span')!.textContent = variant.title;
        copy.querySelector('p')!.textContent = variant.text;
        height = Math.max(height, copy.getBoundingClientRect().height);
      }
      clone.remove();
      root.style.setProperty('--object-copy-height', `${height}px`);
    };
    const place = () => {
      const page = root.closest('.guided-lab-page')!;
      if (page.matches('[data-responsive-flow], [data-inline-answer-flow]')) {
        root.dataset.compactQuestion = 'false';
        root.dataset.fits = 'true';
        return;
      }
      const gap = 5;
      root.style.setProperty('--object-diagram-top', `${anchor}px`);
      const questionTop = anchor + canvas.getBoundingClientRect().height + gap;
      root.style.setProperty('--object-question-top', `${questionTop}px`);
      const limit = footerPanel.getBoundingClientRect().top - root.getBoundingClientRect().top - 1;
      root.dataset.compactQuestion = 'false';
      reserveCopy();
      if (!inlineAnswers && questionTop + questionPanel.getBoundingClientRect().height > limit) {
        root.dataset.compactQuestion = 'true';
        reserveCopy();
      }
      root.dataset.fits = String(questionTop + questionPanel.getBoundingClientRect().height <= limit);
      if (inlineAnswers && root.dataset.fits === 'false') {
        page.setAttribute('data-inline-answer-flow', '');
        return;
      }
      const query = root.querySelector<HTMLElement>('.object-query-result');
      const picker = root.querySelector<HTMLElement>('.flow-panel-picker')!;
      const legend = root.querySelector<HTMLElement>('.flow-legend')!;
      const pickerHeight = picker.getBoundingClientRect().height;
      const legendHeight = legend.getBoundingClientRect().height;
      const legendTop = -legendHeight - (pickerHeight ? pickerHeight + 14 : 9);
      root.style.setProperty('--object-legend-top', `${legendTop}px`);
      const queryBottom = legendHeight ? legendTop - 7 : -pickerHeight - 12;
      if (query) {
        root.style.setProperty('--object-query-top', `${queryBottom - query.getBoundingClientRect().height}px`);
      }
      // Lift the whole diagram while preserving the existing assessment anchor.
      // Reserve query space even before a query appears, so feedback cannot move it.
      const queryHeight = innerWidth <= 1150 ? 56 : 38;
      const heading = root.closest('.object-exercise-page')!.querySelector('.guided-lab-heading')!;
      const headingBottom = heading.getBoundingClientRect().bottom - root.getBoundingClientRect().top;
      const lift = Math.min(55, Math.max(0, anchor + queryBottom - queryHeight - headingBottom - 12));
      root.style.setProperty('--object-diagram-top', `${anchor - lift}px`);
      root.dataset.diagramLift = String(lift);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(questionPanel);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [anchor, question, visualization, copyVariants, inlineAnswers]);

  return <><div ref={rootRef} className="object-exercise-workspace" data-aligned={anchor !== null} data-inline-answers={inlineAnswers || undefined}>
    {visualization}{question}
    {reference && createPortal(<div ref={referenceRef} aria-hidden="true" inert style={{ position: 'fixed', left: reference.left, top: reference.top, width: reference.width, height: reference.height, visibility: 'hidden', pointerEvents: 'none' }}>
      <ObjectChapterLecture chapter={chapter} navigation={navigation} lectureIndex={1} manageDocumentTitle={false} />
    </div>, reference.parent)}
  </div><div className="object-exercise-footer">{footer}</div></>;
}
