import { useMemo, useState, type ReactNode } from 'react';
import type { ChapterDefinition } from '../../chapters/chapterRegistry';
import { ChapterCompletionPanel } from '../../chapters/ChapterCompletionPanel';
import { ChapterCompletionContext } from './chapterCompletionContext';

export function ChapterCompletionProvider({ chapter, children }: { chapter: ChapterDefinition; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const controls = useMemo(() => ({
    open: () => {
      // Keep an enabled activity control as the modal's native return-focus target.
      document.querySelector<HTMLElement>('#main-content .guided-lab-page [data-shortcut="exercise-forward"], #main-content .guided-lab-page [data-walkthrough="guided"]')?.focus({ preventScroll: true });
      setOpen(true);
    },
    close: () => setOpen(false),
  }), []);
  return <ChapterCompletionContext.Provider value={controls}>
    {children}
    {open && <ChapterCompletionPanel chapter={chapter} open={open} onClose={controls.close} />}
  </ChapterCompletionContext.Provider>;
}
