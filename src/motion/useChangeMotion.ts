import { useLayoutEffect, useRef, type RefObject } from 'react';
import { reveal } from './motion';

export function useChangeMotion(ref: RefObject<HTMLElement | null>, key: unknown, enabled = true, name = 'content', distance = 4) {
  const previous = useRef(key);
  useLayoutEffect(() => {
    const changed = !Object.is(previous.current, key);
    previous.current = key;
    if (!changed || !enabled) return;
    const element = ref.current;
    if (!element) return;
    // Split exercise layouts use display: contents to place the copy and answers.
    // Animate their existing boxes without introducing a layout wrapper.
    const targets = getComputedStyle(element).display === 'contents'
      ? Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
      : [element];
    const animations = targets.map(target => reveal(target, name, distance));
    return () => animations.forEach(animation => animation?.cancel());
  }, [ref, key, enabled, name, distance]);
}
