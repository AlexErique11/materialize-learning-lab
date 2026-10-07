import { expect, test } from './fixtures';

const paths = [
  '/labs/changing-relations/tutorial/lecture-1',
  '/labs/changing-relations/tutorial/lecture-2',
  '/labs/changing-relations/exercises/exercise-1',
  '/labs/incremental-maintenance/tutorial/lecture-1',
];

async function expectFits(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => {
    const viewport = document.documentElement;
    const page = document.querySelector('[data-viewport-fit]')!.getBoundingClientRect();
    return viewport.scrollHeight <= innerHeight && viewport.scrollWidth <= innerWidth
      && page.top >= 0 && page.bottom <= innerHeight
      && Array.from(document.querySelectorAll('.table-scroll')).every((table) =>
        !table.getBoundingClientRect().height || table.scrollWidth <= table.clientWidth);
  }), { message: 'The entire lecture or exercise must fit without scrolling or clipping' }).toBe(true);
}

test('lectures and exercises keep active information and controls on screen', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(90_000);
  const sizes = isMobile ? [{ width: 390, height: 844 }, { width: 390, height: 664 }] : [
    { width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 },
  ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const path of paths) {
      await page.goto(path);
      await expectFits(page);
      if (path.includes('incremental-maintenance')) {
        for (let time = 0; time <= 5; time++) {
          if (time) await page.getByRole('button', { name: 'Next change', exact: true }).click();
          for (const stage of ['1. Orders', '2. Filter', '3. Projection']) {
            await page.getByRole('navigation', { name: 'Query stages' }).getByRole('button', { name: stage, exact: false }).click();
            await expectFits(page);
          }
        }
        await expect(page.getByRole('table', { name: 'Maintained output', exact: true })).toBeVisible();
      } else if (path.includes('exercises')) {
        for (let phase = 0; phase < 3; phase++) {
          await page.getByRole('button', { name: 'Hint', exact: true }).click();
          await expectFits(page);
          await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
          await expectFits(page);
          if (phase < 2) await page.getByRole('button', { name: 'Next question', exact: true }).click();
        }
      } else {
        const next = page.getByRole('button', { name: path.endsWith('lecture-2') ? 'Next timestamp' : 'Next change', exact: true });
        while (await next.isEnabled()) { await next.click(); await expectFits(page); }
      }
      if (isMobile && !path.includes('incremental-maintenance')) {
        for (const panel of path.includes('exercises') ? ['Current relation', 'Change ledger', 'Question'] : ['Current relation', 'Change ledger']) {
          await page.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: panel, exact: true }).click();
          await expectFits(page);
        }
      }
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      await expectFits(page);
      await page.screenshot({ path: testInfo.outputPath(`${path.split('/')[2]}-${path.split('/').at(-1)}-${size.width}-${size.height}.png`) });
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
    }
  }
});
