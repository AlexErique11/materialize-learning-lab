/** Tab navigation deliberately gives controls their native keyboard actions. */
export function isTabNavigation(element: Element) {
  return element.closest('.app-shell')?.getAttribute('data-focus-input') === 'tab';
}

export function isShortcutInteraction(element: Element) {
  return element.closest('.app-shell')?.getAttribute('data-focus-input') === 'shortcut';
}

/** Keep shortcut focus in the current modal, or on the page when none is open. */
export function focusLabContext() {
  const modal = [...document.querySelectorAll<HTMLDialogElement>('dialog:modal')].at(-1);
  (modal ?? document.getElementById('main-content'))?.focus({ preventScroll: true });
}
