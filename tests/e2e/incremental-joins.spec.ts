import { expect, test } from './fixtures';
import { joinLessons } from '../../src/chapters/incremental-maintenance/join-scenario';

const path = '/labs/incremental-maintenance/tutorial/lecture-2';
const result = (page: import('@playwright/test').Page) => page.getByRole('table', { name: 'Joined result', exact: true, includeHidden: true });

async function expectFits(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.querySelector('[data-viewport-fit]')!.getBoundingClientRect();
    const visible = Array.from(document.querySelectorAll('.join-panels .relation-panel, .relation-playback-controls'))
      .map((element) => element.getBoundingClientRect()).filter((rect) => rect.height);
    return document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth
      && root.bottom <= innerHeight && visible.every((rect) => rect.bottom <= innerHeight)
      && Array.from(document.querySelectorAll('.table-scroll')).every((element) => !element.getBoundingClientRect().height || element.scrollWidth <= element.clientWidth)
      && Array.from(document.querySelectorAll('.maintenance-diffs')).every((element) => !element.getBoundingClientRect().height
        || (element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1));
  })).toBe(true);
}

test('join changes retain unmatched orders, fan out product edits and retract deleted matches', async ({ page, isMobile }) => {
  await page.goto('/labs/incremental-maintenance');
  await page.getByRole('link', { name: 'Start tutorial: Lecture 2: Joins', exact: true }).click();
  await expect(page).toHaveURL(path);
  const stages = page.getByRole('navigation', { name: 'Join inputs and result' });
  if (isMobile) await stages.getByRole('button', { name: 'Joined result', exact: false }).click();
  await expect(result(page).locator('tbody tr:not([data-placeholder])')).toHaveCount(3);
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(result(page).locator('tbody tr:not([data-placeholder])')).toHaveCount(3);
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(result(page)).toContainText('Mug');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(result(page).locator('tbody tr[data-affected="true"]')).toHaveCount(2);
  await expect(result(page)).not.toContainText('Notebook');
  if (isMobile) await page.getByRole('button', { name: 'Show changes', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Result diffs', exact: true }).locator('li')).toHaveCount(4);
  const diffs = page.getByRole('region', { name: 'Result diffs', exact: true });
  await expect(diffs.locator('[data-field="name"][data-changed="true"]')).toHaveCount(4);
  await expect(diffs.locator('[data-field="amount"][data-changed="false"]')).toHaveText(['$30', '$50', '$30', '$50']);
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(result(page)).not.toContainText('104');
  if (isMobile) await stages.getByRole('button', { name: 'Orders', exact: false }).click();
  if (isMobile) await page.getByRole('button', { name: 'Show rows', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Orders', exact: true })).toContainText('104');
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await expect(result(page)).toContainText('Mug');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('join-time')).toHaveText('t = 0');
});

test('guided join lecture predicts each effect, finishes, restores focus and pauses for help', async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 664 } : { width: 1280, height: 650 });
  await page.goto(path);
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives' })).toContainText('ON o.product_id = p.product_id');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  for (const [index, lesson] of joinLessons.entries()) {
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(lesson.title);
    await expect(page.locator('.join-panels')).toHaveAttribute('data-join-stage', lesson.stage);
    await expect(page.locator(`.join-panels > section:nth-child(${lesson.stage === 'orders' ? 1 : lesson.stage === 'products' ? 2 : 3})`)).toBeVisible();
    if (lesson.before) {
      await expect(page.getByTestId('join-time')).toHaveText(`t = ${lesson.time - 1}`);
      await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
    }
    await expect(page.getByTestId('join-time')).toHaveText(`t = ${lesson.time}`);
    const target = await page.locator(`.join-panels > section:nth-child(${lesson.stage === 'orders' ? 1 : lesson.stage === 'products' ? 2 : 3})`).boundingBox();
    const hole = await dialog.locator('.relation-guide-hole').boundingBox();
    expect(hole!.x).toBeLessThanOrEqual(target!.x);
    expect(hole!.x + hole!.width).toBeGreaterThanOrEqual(target!.x + target!.width);
    const card = await dialog.locator('.relation-guide-card').boundingBox();
    expect(card!.y).toBeGreaterThanOrEqual(0);
    expect(card!.y + card!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await dialog.getByRole('button', { name: index === joinLessons.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
  await expect(page.getByText('Tutorial completed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(2200);
  await expect(page.getByTestId('join-time')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  await page.clock.fastForward(6600);
  await expect(page.getByTestId('join-time')).toHaveText('t = 1');
  await page.keyboard.press('Escape');
  await page.clock.fastForward(4400);
  await expect(page.getByTestId('join-time')).toHaveText('t = 1');
});

test('all join states fit desktop, laptop and mobile screens in both themes', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(60_000);
  for (const size of isMobile ? [{ width: 390, height: 664 }] : [{ width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(size);
    await page.goto(path);
    for (let time = 0; time <= 4; time++) {
      if (time) await page.getByRole('button', { name: 'Next change', exact: true }).click();
      for (const stage of ['Orders', 'Products', 'Joined result']) {
        if (isMobile) await page.getByRole('navigation', { name: 'Join inputs and result' }).getByRole('button', { name: stage, exact: false }).click();
        await expectFits(page);
        if (isMobile) {
          await page.getByRole('button', { name: 'Show changes', exact: true }).click();
          await expectFits(page);
          await page.getByRole('button', { name: 'Show rows', exact: true }).click();
        }
      }
      if (time === 3) await page.screenshot({ path: testInfo.outputPath(`join-update-${size.width}.png`) });
    }
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expectFits(page);
    await page.screenshot({ path: testInfo.outputPath(`join-dark-${size.width}.png`) });
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
  }
});
