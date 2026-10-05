import { expect, test as base } from '@playwright/test';
import { TOUR_SEEN_KEY } from '../../src/components/walkthrough/walkthroughStorage';

export const test = base.extend<{ auditBrowser: void; tourSeen: boolean }>({
  tourSeen: [true, { option: true }],
  auditBrowser: [
    async ({ page, tourSeen }, use) => {
      if (tourSeen) await page.addInitScript((key) => localStorage.setItem(key, 'true'), TOUR_SEEN_KEY);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await use();
      expect(errors, 'The learner journey should not produce browser errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
