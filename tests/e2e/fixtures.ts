import { expect, test as base, type Page } from '@playwright/test';
import { TOUR_SEEN_KEY } from '../../src/components/walkthrough/walkthroughStorage';
import { findChapter } from '../../src/chapters/chapterRegistry';
import { chapterContentPath, getChapterPages } from '../../src/chapters/chapterOutline';
import { LAB_PROGRESS_KEY } from '../../src/progress/labProgress';

export async function seedChapterPrerequisites(page: Page, activityPath: string) {
  const chapter = findChapter(activityPath.split('/')[2]);
  if (!chapter) throw new Error(`Unknown chapter for ${activityPath}`);
  const completed = getChapterPages(chapter).map(activity => chapterContentPath(chapter, activity)).filter(path => path !== activityPath);
  await page.addInitScript(({ key, completed }) => localStorage.setItem(key, JSON.stringify({ version: 1, completed })), { key: LAB_PROGRESS_KEY, completed });
}

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
