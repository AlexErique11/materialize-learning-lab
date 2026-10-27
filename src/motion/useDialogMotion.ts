import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { animateMotion, reveal } from './motion';
import { focusLabContext, isShortcutInteraction } from '../components/ui/keyboardFocus';

export function useDialogMotion(
  ref: RefObject<HTMLDialogElement | null>, open: boolean, onClose: () => void,
  targetRef?: RefObject<HTMLElement | null>,
) {
  const generation = useRef(0);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = useCallback((notify: boolean) => {
    const dialog = ref.current;
    if (!dialog || closing.current) return;
    closing.current = true;
    const token = ++generation.current;
    dialog.dataset.motionClosing = 'true';
    const target = targetRef?.current ?? dialog;
    const opacity = getComputedStyle(target).opacity;
    for (const animation of target.getAnimations()) if (animation.id.startsWith('ui-motion-dialog')) animation.cancel();
    const animation = animateMotion(target, 'dialog-exit', [
      { opacity, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(4px)' },
    ], 120);
    const finish = () => {
      if (generation.current !== token) return;
      dialog.close();
      if (isShortcutInteraction(dialog)) focusLabContext();
      delete dialog.dataset.motionClosing;
      closing.current = false;
      if (notify) onCloseRef.current();
    };
    if (animation) void animation.finished.then(finish, finish);
    else finish();
  }, [ref, targetRef]);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      generation.current += 1;
      closing.current = false;
      delete dialog.dataset.motionClosing;
      if (!dialog.open) {
        dialog.showModal();
        if (isShortcutInteraction(dialog)) focusLabContext();
        reveal(targetRef?.current ?? dialog, 'dialog-enter', 8);
      }
    } else if (dialog.open) close(false);
  }, [open, ref, targetRef, close]);

  useLayoutEffect(() => () => {
    generation.current += 1;
    const dialog = ref.current;
    if (dialog?.open) dialog.close();
  }, [ref]);
  return useCallback(() => close(true), [close]);
}
