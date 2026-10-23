import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chapterContentPath, getChapterPages } from '../../src/chapters/chapterOutline';
import { chapterPath, coreChapters } from '../../src/chapters/chapterRegistry';
import { LAB_PROGRESS_KEY } from '../../src/progress/labProgress';

test.use({ reducedMotion: 'reduce' });

const toolbarProgress = (page: Page) => page.locator('#main-content .guided-lab-progress').first();
async function readProgress(page: Page) {
  return toolbarProgress(page).evaluate(element => {
    const progress = element.querySelector('progress')!;
    return { text: element.textContent, value: progress.value, max: progress.max, label: progress.getAttribute('aria-label'), fill: element.querySelector('i')?.getAttribute('style') };
  });
}

for (const chapter of coreChapters) {
  test(`${chapter.slug}: completed overview numbers match sidebar colors without moving rows`, async ({ page }) => {
    const activities = getChapterPages(chapter);
    const finished = [activities.find(item => item.sectionSlug === 'tutorial')!, activities.find(item => item.sectionSlug === 'exercises')!];
    const referenceChapter = coreChapters.find(item => item.slug !== chapter.slug)!;
    const completed = [...finished.map(item => chapterContentPath(chapter, item)), ...getChapterPages(referenceChapter).map(item => chapterContentPath(referenceChapter, item))];
    const rows = page.locator('.chapter-overview-row');
    const geometry = () => rows.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height];
    }));
    for (const theme of ['light', 'dark']) {
      await page.goto(chapterPath(chapter));
      await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
      await page.evaluate(key => localStorage.removeItem(key), LAB_PROGRESS_KEY);
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await expect(rows.filter({ has: page.locator('.chapter-overview-number') }).locator('.chapter-overview-number')).toHaveCount(activities.length);
      await expect(page.locator('.chapter-overview-row[data-completed="true"]')).toHaveCount(0);
      const before = await geometry();
      const neutral = await rows.locator('.chapter-overview-number').first().evaluate(element => {
        const style = getComputedStyle(element);
        return { color: style.color, border: style.borderColor, fill: style.backgroundColor };
      });
      await page.evaluate(({ key, completed }) => localStorage.setItem(key, JSON.stringify({ version: 1, completed })), { key: LAB_PROGRESS_KEY, completed });
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      expect(await geometry()).toEqual(before);
      const reference = await page.locator(`#main-content .chapter-link-row > a[href="${chapterPath(referenceChapter)}"] .chapter-link-number`).first().evaluate(element => {
        const style = getComputedStyle(element);
        return { color: style.color, border: style.borderColor, fill: style.backgroundColor };
      });
      expect(reference).not.toEqual(neutral);
      for (const activity of activities) {
        const row = rows.filter({ has: page.getByRole('heading', { name: activity.title, exact: true }) });
        const done = finished.includes(activity);
        if (done) await expect(row).toHaveAccessibleDescription('Completed');
        else await expect(row).not.toHaveAttribute('data-completed', 'true');
        const colors = await row.locator('.chapter-overview-number').evaluate(element => {
          const style = getComputedStyle(element);
          return { color: style.color, border: style.borderColor, fill: style.backgroundColor };
        });
        expect(colors).toEqual(done ? reference : neutral);
      }
    }
  });

  for (const lecture of getChapterPages(chapter).filter(item => item.sectionSlug === 'tutorial')) {
    test(`${chapter.slug}/${lecture.slug}: guided run holds toolbar progress until it finishes`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto(chapterContentPath(chapter, lecture));
      const initial = await readProgress(page);
      await page.getByRole('button', { name: /^(Next change|Next case)$/, exact: true }).click();
      const before = await readProgress(page);
      expect(before.value).toBeGreaterThan(initial.value);
      await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
      const guide = page.locator('.relation-guide[open]');
      await expect(guide).toBeVisible();
      expect(await readProgress(page)).toEqual(before);
      await page.keyboard.press('ArrowRight');
      await expect(guide).toBeVisible();
      await page.keyboard.press('ArrowLeft');
      await expect(guide).toBeVisible();
      expect(await readProgress(page)).toEqual(before);
      for (let step = 0; step < 150 && await guide.count(); step++) {
        expect(await readProgress(page)).toEqual(before);
        await page.keyboard.press('ArrowRight');
      }
      await expect(guide).toHaveCount(0);
      await expect(page.locator('.guided-lab-title > h1')).toHaveAttribute('aria-description', 'Tutorial completed');
      const after = await readProgress(page);
      expect(after.value).toBe(after.max);
      expect(after.label).toBe(before.label);
      await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
      await expect(guide).toBeVisible();
      expect(await readProgress(page)).toEqual(after);
      await page.keyboard.press('Escape');
      await expect(guide).toHaveCount(0);
      expect(await readProgress(page)).toEqual(initial);
      await page.getByRole('button', { name: 'Next change', exact: true }).or(page.getByRole('button', { name: 'Next case', exact: true })).click();
      expect((await readProgress(page)).value).toBeGreaterThan(initial.value);
    });
  }
}
