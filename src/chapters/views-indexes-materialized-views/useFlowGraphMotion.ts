import { useLayoutEffect, useRef, type RefObject } from 'react';
import { animateMotion } from '../../motion/motion';
import type { DiagramPanel } from './simulation';

export function useFlowGraphMotion(ref: RefObject<HTMLElement | null>, selectedPanel: DiagramPanel) {
  const previousNodes = useRef<Map<string, string> | null>(null);
  const previousPanel = useRef(selectedPanel);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = new Map<string, string>();
    for (const node of root.querySelectorAll<HTMLElement>('[data-flow-node]')) {
      const id = node.dataset.flowNode!;
      const present = node.dataset.present ?? 'true';
      nodes.set(id, present);
      if (previousNodes.current && previousNodes.current.get(id) !== present) {
        animateMotion(node, 'flow-object', [{ opacity: 0.6 }, { opacity: 1 }], 180);
      }
    }
    previousNodes.current = nodes;
    if (previousPanel.current !== selectedPanel) {
      // The compact graph shows one panel; keep its frame and spotlight geometry fixed.
      const panels = [...root.querySelectorAll<HTMLElement>('.flow-panel')];
      if (panels.some((panel) => !panel.getClientRects().length)) {
        animateMotion(root.querySelector(`[data-panel="${selectedPanel}"]`), 'flow-panel', [{ opacity: 0.6 }, { opacity: 1 }], 180);
      }
    }
    previousPanel.current = selectedPanel;
  });
}

export function useFlowEdgeMotion(ref: RefObject<SVGSVGElement | null>, ready = true) {
  const previous = useRef<Set<string> | null>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !ready) return;
    const edges = new Set<string>();
    for (const path of root.querySelectorAll<SVGPathElement>('[data-flow-edge]')) {
      const id = path.dataset.flowEdge!;
      edges.add(id);
      if (previous.current && !previous.current.has(id)) {
        // A connection appears with the committed state, without implying processing time.
        animateMotion(path, 'flow-edge', [{ opacity: 0.25 }, { opacity: 1 }], 180);
      }
    }
    previous.current = edges;
  });
}
