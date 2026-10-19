import { useLayoutEffect, useRef, type RefObject } from 'react';
import { reveal } from './motion';

export function useChangeMotion(ref: RefObject<HTMLElement | null>, key: unknown, enabled = true, name = 'content', distance = 4) {
  const previous = useRef(key);
  useLayoutEffect(() => {
    const changed = !Object.is(previous.current, key);
    previous.current = key;
    if (!changed || !enabled) return;
    const animation = reveal(ref.current, name, distance);
    return () => animation?.cancel();
  }, [ref, key, enabled, name, distance]);
}
