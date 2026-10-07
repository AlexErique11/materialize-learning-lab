import { expect, test } from './fixtures';
import { aggregateLessons } from '../../src/chapters/incremental-maintenance/aggregate-scenario';
const path = '/labs/incremental-maintenance/tutorial/lecture-3';
async function expectFits(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.querySelector('[data-viewport-fit]')!.getBoundingClientRect();
    const visible = Array.from(document.querySelectorAll('.join-panels .relation-panel, .relation-playback-controls'))
      .map((element) => element.getBoundingClientRect()).filter((rect) => rect.height);
    return document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth
      && Array.from(document.querySelectorAll('.aggregate-groups')).every((element) => !element.getBoundingClientRect().height
        || element.getBoundingClientRect().bottom <= element.closest('.relation-panel')!.getBoundingClientRect().bottom)
      && root.bottom <= innerHeight && visible.every((rect) => rect.bottom <= innerHeight)
      && Array.from(document.querySelectorAll('.table-scroll')).every((element) => !element.getBoundingClientRect().height || element.scrollWidth <= element.clientWidth)
      && Array.from(document.querySelectorAll('.maintenance-diffs')).every((element) => !element.getBoundingClientRect().height
        || (element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1));
  })).toBe(true);
}


test('aggregation predictions reveal full result batches and finish with keyboard focus', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives' })).toContainText('GROUP BY product_id');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  for (const [index, lesson] of aggregateLessons.entries()) {
    const dialog = page.locator('dialog[open]');
    await expect(dialog.locator('h2')).toHaveText(lesson.title);
    await expect(page.locator('.join-panels')).toHaveAttribute('data-join-stage', lesson.stage);
    if ('before' in lesson) {
      await expect(page.getByTestId('aggregate-time')).toHaveText('t = ' + (lesson.time - 1));
      await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
    }
    await expect(page.getByTestId('aggregate-time')).toHaveText('t = ' + lesson.time);
    const card = await dialog.locator('.relation-guide-card').boundingBox();
    expect(card!.y + card!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await dialog.getByRole('button', { name: index === aggregateLessons.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
  await expect(page.getByText('Tutorial completed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Result diffs', exact: true, includeHidden: true }).locator('li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await expect(page.getByTestId('aggregate-time')).toHaveText('t = 4');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('aggregate-time')).toHaveText('t = 0');
});

test('aggregation states fit desktop, laptop and mobile in both themes', async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  for (const size of isMobile ? [{ width: 390, height: 664 }] : [{ width: 1440, height: 1000 }, { width: 1280, height: 650 }]) {
    await page.setViewportSize(size);
    await page.goto(path);
    for (let time = 0; time <= 5; time++) {
      if (time) await page.getByRole('button', { name: 'Next change', exact: true }).click();
      for (const stage of ['Orders', 'Group state', 'Revenue result']) {
        if (isMobile) await page.getByRole('navigation', { name: 'Aggregation stages' }).getByRole('button', { name: stage === 'Revenue result' ? 'Revenue' : stage, exact: false }).click();
        await expectFits(page);
        if (isMobile && stage !== 'Group state') {
          await page.getByRole('button', { name: 'Show changes', exact: true }).click();
          await expectFits(page);
          await page.getByRole('button', { name: 'Show rows', exact: true }).click();
        }
      }
    }
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expectFits(page);
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
  }
});
