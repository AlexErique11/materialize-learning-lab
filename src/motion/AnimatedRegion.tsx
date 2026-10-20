import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import { animateMotion, moveLayout, reveal } from './motion';

export function AnimatedRegion({ open, ...props }: ComponentPropsWithoutRef<'div'> & { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef(open);
  const generation = useRef(0);
  useLayoutEffect(() => {
    const element = ref.current!;
    const token = ++generation.current;
    const { opacity, transform } = getComputedStyle(element);
    for (const animation of element.getAnimations()) if (animation.id.startsWith('ui-motion-disclosure')) animation.cancel();
    element.inert = !open;
    if (open && element.hidden) {
      moveLayout(element, () => { element.hidden = false; });
      reveal(element, 'disclosure-open');
    } else if (open && (opacity !== '1' || transform !== 'none')) {
      animateMotion(element, 'disclosure-open', [{ opacity, transform }, { opacity: 1, transform: 'translateY(0)' }]);
    } else if (!open && !element.hidden) {
      const animation = animateMotion(element, 'disclosure-close', [{ opacity, transform }, { opacity: 0, transform: 'translateY(0)' }], 120);
      const finish = () => {
        if (generation.current === token) moveLayout(element, () => { element.hidden = true; });
      };
      if (animation) void animation.finished.then(finish, finish);
      else finish();
    }
    return () => { generation.current += 1; };
  }, [open]);
  return <div {...props} ref={ref} hidden={!initial.current} />;
}
