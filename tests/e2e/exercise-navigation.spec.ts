import { expect, test } from './fixtures';

const activities = [
  ['changing-relations', 1], ['incremental-maintenance', 2],
  ['views-indexes-materialized-views', 2], ['getting-data-in', 3],
  ['time-in-materialize', 3], ['progress-and-freshness', 3],
] as const;

test('measurement lectures cannot replace exercise document titles on entry or resize', async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  for (const [chapter, count] of [['views-indexes-materialized-views', 2], ['progress-and-freshness', 3]] as const) {
    for (let exercise = 1; exercise <= count; exercise++) {
      await page.goto(`/labs/${chapter}/exercises/exercise-${exercise}`);
      const title = `Exercise ${exercise} | Materialize Learning Lab`;
      await expect(page).toHaveTitle(title);
      for (const viewport of [{ width: 1366, height: 768 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await expect(page.locator(chapter === 'progress-and-freshness' ? '.progress-exercise-layout' : '.object-exercise-workspace')).toHaveAttribute('data-aligned', 'true');
        await expect(page).toHaveTitle(title);
      }
      if (!isMobile) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByRole('button', { name: 'Collapse chapter navigation', exact: true }).click();
        await expect(page).toHaveTitle(title);
        await page.getByRole('button', { name: 'Expand chapter navigation', exact: true }).click();
      }
    }
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1536, height: 714 }]) {
  test(`Exercise navigation restores October 10 clearance at ${viewport.width}x${viewport.height}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop spacing; phones retain their existing question flow.');
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const inset = viewport.height >= 850 ? 24 : viewport.height >= 741 ? 16 : 12;
    for (const [chapter, count] of activities) for (let exercise = 1; exercise <= count; exercise++) {
      await page.goto(`/labs/${chapter}/exercises/exercise-${exercise}`);
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      const next = page.locator('.exercise-next-question');
      await expect(next).toBeVisible();
      const button = (await next.boundingBox())!;
      expect(viewport.height - button.y - button.height, `${chapter}, exercise ${exercise}`).toBeCloseTo(inset, 0);
      expect(button.height).toBe(40);
      const answers = (await page.locator('.exercise-answers').boundingBox())!;
      expect(answers.x + answers.width <= button.x || answers.y + answers.height <= button.y,
        `${chapter}: navigation must not cover the answers`).toBe(true);
      if (chapter === 'views-indexes-materialized-views' || chapter === 'progress-and-freshness') {
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && scrollY === 0)).toBe(true);
      }
    }
  });
}
