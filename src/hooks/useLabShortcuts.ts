import { useEffect, type RefObject } from 'react';
import { focusLabContext, isTabNavigation } from '../components/ui/keyboardFocus';

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
      if (!scope || !(target instanceof Element)
        || scope.closest('[inert], [aria-hidden="true"], [data-motion-closing="true"]')) return;
      const modal = [...document.querySelectorAll('dialog:modal')].at(-1);
      const inPage = scope.contains(target) || target.matches('body, html, #main-content');
      const inMain = scope.closest('main')?.contains(target);
      if (modal ? modal !== scope && !scope.contains(modal) : !inPage && (isTabNavigation(scope) || !inMain)) return;
      if (target.closest('textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="listbox"], [role="menu"], [role="tree"], [role="tablist"]')) return;
      const input = target.closest('input');
      if (input && (event.key !== 'Enter' || !['text', 'number', 'email', 'search', 'tel', 'url', 'password', 'checkbox', 'radio'].includes(input.type))) return;
      if (window.getSelection()?.isCollapsed === false) return;
      const nativeActivation = !showAnswer && (event.key === 'Enter' || event.key === ' ')
        && target.closest('button, a[href], summary, [role="button"]');
      if (nativeActivation && isTabNavigation(scope)) return;
      if (!selector) {
        if (nativeActivation) {
          event.preventDefault();
          focusLabContext();
        }
        return;
      }
      // Within a modal, only its own controls can respond to shortcuts.
      const button = (modal ?? scope).querySelector<HTMLButtonElement>(selector);
      if (!button || button.matches(':disabled') || button.closest('[inert], [aria-hidden="true"]')
        || !button.getClientRects().length || getComputedStyle(button).visibility === 'hidden') {
        if (nativeActivation) {
          event.preventDefault();
          focusLabContext();
        }
        return;
      }
      event.preventDefault();
      if (!event.repeat) {
        const shell = scope.closest<HTMLElement>('.app-shell');
        if (shell) shell.dataset.focusInput = 'shortcut';
        if (!input) focusLabContext();
        button.click();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [scopeRef, shortcuts, enabled]);
}
