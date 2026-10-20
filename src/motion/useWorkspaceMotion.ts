import { useLayoutEffect, type RefObject } from 'react';
import { animateMotion, reducedMotion } from './motion';

const valueSelector = 'tbody td, .relation-metric strong, .temporal-clocks dd, .ingestion-checkpoint, [data-motion-value]';

export function useWorkspaceMotion(ref: RefObject<HTMLElement | null>, route: string) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const values = new WeakMap<Element, string>();
    const rowPositions = new Map<HTMLTableRowElement, number>();
    const remember = (scope: Element) => {
      for (const value of scope.querySelectorAll(valueSelector)) values.set(value, value.textContent ?? '');
    };
    remember(root);
    for (const row of root.querySelectorAll<HTMLTableRowElement>('tbody tr')) rowPositions.set(row, row.offsetTop);
    const observer = new MutationObserver((records) => {
      const changed = new Set<Element>();
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        const value = target?.closest(valueSelector);
        if (value) changed.add(value);
        for (const node of record.addedNodes) if (node instanceof Element) {
          if (node.matches(valueSelector)) changed.add(node);
          for (const child of node.querySelectorAll(valueSelector)) changed.add(child);
        }
      }
      for (const value of changed) {
        const next = value.textContent ?? '';
        const previous = values.get(value);
        values.set(value, next);
        if (!value.isConnected || value.closest('.exercise-question') || next === previous || !next.trim() || reducedMotion()) continue;
        // Update the actual value at once; soften only the visual change, preserving all colors.
        animateMotion(value, 'value', [{ opacity: 0.4 }, { opacity: 1 }], 180);
      }
      // Surviving rows settle into vacated slots; deleted data is never kept on screen.
      for (const row of root.querySelectorAll<HTMLTableRowElement>('tbody tr')) {
        const previous = rowPositions.get(row);
        const next = row.offsetTop;
        rowPositions.set(row, next);
        if (previous !== undefined && Math.abs(previous - next) > 1) animateMotion(row, 'row', [
          { transform: `translateY(${previous - next}px)` }, { transform: 'translateY(0)' },
        ], 180);
      }
      for (const row of rowPositions.keys()) if (!root.contains(row)) rowPositions.delete(row);
    });
    observer.observe(root, { subtree: true, characterData: true, childList: true });
    return () => observer.disconnect();
  }, [ref, route]);
}
