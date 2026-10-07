import type { Page } from '@playwright/test';
import { expect } from './fixtures';

export async function expectChapterOneGuideLayout(page: Page) {
  await expect.poll(() => page.locator('dialog[open]').evaluate((dialog) => {
    const card = dialog.querySelector('.relation-guide-card')!;
    const bounds = card.getBoundingClientRect();
    const hole = dialog.querySelector('.relation-guide-hole')!.getBoundingClientRect();
    const roomAbove = hole.top - 14 - bounds.height >= 12;
    return {
      fits: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight,
      unclipped: card.scrollHeight <= card.clientHeight,
      preferredPlacement: roomAbove ? bounds.bottom <= hole.top - 13 : bounds.top >= hole.bottom + 13,
      pageFits: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth,
    };
  }), { message: 'The compact guide should fit above its target, or below when there is no room above' })
    .toEqual({ fits: true, unclipped: true, preferredPlacement: true, pageFits: true });
}
