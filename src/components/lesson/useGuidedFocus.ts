import { useEffect, useState, type RefObject } from 'react';

export function useGuidedFocus<T extends string>(
  key: string,
  ids: readonly T[],
  refs: Record<T, RefObject<HTMLElement | null>>,
  labels: Record<T, string>,
  revealWhenHidden: readonly T[] = [],
) {
  const targets: { id: T; label: string; ref: RefObject<HTMLElement | null>; revealWhenHidden: boolean }[] = [...new Set(ids)]
    .map(id => ({ id, label: labels[id]!, ref: refs[id]!, revealWhenHidden: revealWhenHidden.includes(id) }));
  const [selection, setSelection] = useState({ key, index: 0 });
  const index = selection.key === key ? Math.min(selection.index, targets.length - 1) : 0;
  useEffect(() => { setSelection({ key, index: 0 }); }, [key]);
  return {
    id: targets[index]!.id,
    props: {
      targetRef: targets[index]!.ref,
      focusTargets: targets,
      focusIndex: index,
      onFocusChange: (index: number) => setSelection({ key, index }),
    },
  };
}
