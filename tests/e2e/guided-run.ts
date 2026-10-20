import type { Page } from '@playwright/test';
import { expect } from './fixtures';

/** Inspect related panels at this checkpoint before advancing the lesson. */
export async function advanceGuidedLesson(page: Page, last = false) {
  const dialog = page.locator('.relation-guide[open]');
  const checkpoint = await dialog.locator('.relation-guide-step').textContent();
  while (await dialog.getAttribute('data-inspection-mode') === 'sequential'
    && Number(await dialog.getAttribute('data-focus-index')) < Number(await dialog.getAttribute('data-focus-count')) - 1) {
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(dialog.locator('.relation-guide-step')).toHaveText(checkpoint!);
  }
  await dialog.getByRole('button', { name: last ? 'Finish tutorial' : 'Next', exact: true }).click();
}

export async function expectGuideClearOfTargets(page: Page) {
  await expect.poll(() => page.locator('.relation-guide[open]').evaluate(dialog => {
    const card = dialog.querySelector('.relation-guide-card')!;
    const bounds = card.getBoundingClientRect();
    const holes = Array.from(dialog.querySelectorAll('.relation-guide-hole')).map(hole => hole.getBoundingClientRect());
    return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight
      && card.scrollHeight <= card.clientHeight && holes.every(hole => bounds.right <= hole.left || bounds.left >= hole.right
        || bounds.bottom <= hole.top || bounds.top >= hole.bottom);
  }), { message: 'The explanation and all highlighted regions remain visible without overlapping' }).toBe(true);
}
