import { useEffect, type RefObject } from 'react';

type ShortcutKey = 'ArrowLeft' | 'ArrowRight' | ' ' | 'Enter' | 'r' | 's' | 'h' | 'Control+Enter';
type Shortcuts = Partial<Record<ShortcutKey, string>>;

/** Activate existing controls so shortcuts share their validation and disabled state. */
export function useLabShortcuts(scopeRef: RefObject<HTMLElement | null>, shortcuts: Shortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const showAnswer = event.ctrlKey && event.key === 'Enter';
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229
        || event.altKey || (event.ctrlKey && !showAnswer) || event.metaKey || event.shiftKey) return;
      const key = showAnswer ? 'Control+Enter' : event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const selector = shortcuts[key as ShortcutKey];
      const scope = scopeRef.current;
      const target = event.target;
      if (!selector || !scope || !(target instanceof Element)
        || scope.closest('[inert], [aria-hidden="true"], [data-motion-closing="true"]')) return;
      const modal = [...document.querySelectorAll('dialog:modal')].at(-1);
      if (modal ? modal !== scope && !scope.contains(modal) : !scope.contains(target) && !target.matches('body, html, #main-content')) return;
      if (target.closest('textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="listbox"], [role="menu"], [role="tree"], [role="tablist"]')) return;
      const input = target.closest('input');
      if (input && (event.key !== 'Enter' || !['text', 'number', 'email', 'search', 'tel', 'url', 'password', 'checkbox', 'radio'].includes(input.type))) return;
      if (!showAnswer && (event.key === 'Enter' || event.key === ' ')
        && target.closest('button, a[href], summary, [role="button"]')) return;
      if (window.getSelection()?.isCollapsed === false) return;
      // Within a modal, only its own controls can respond to shortcuts.
      const button = (modal ?? scope).querySelector<HTMLButtonElement>(selector);
      if (!button || button.matches(':disabled') || button.closest('[inert], [aria-hidden="true"]')
        || !button.getClientRects().length || getComputedStyle(button).visibility === 'hidden') return;
      event.preventDefault();
      if (!event.repeat) button.click();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [scopeRef, shortcuts, enabled]);
}
