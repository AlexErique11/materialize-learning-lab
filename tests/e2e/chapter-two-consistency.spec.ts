import { expect, test } from './fixtures';

test('Chapter 2 lectures keep the same panel geometry and spacing across pages and changes', async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  for (const size of isMobile ? [{ width: 390, height: 664 }] : [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(size);
    let reference: unknown;
    for (const lecture of [1, 2, 3]) {
      await page.goto('/labs/incremental-maintenance/tutorial/lecture-' + lecture);
      for (const time of [0, 1, 2, 3, 4, ...(lecture === 2 ? [] : [5])]) {
        if (time) await page.getByRole('button', { name: 'Next change', exact: true }).click();
        for (let stage = 0; stage < 3; stage++) {
          if (isMobile) await page.locator('.maintenance-flow > div > .button').nth(stage).click();
          const geometry = await page.evaluate(() => {
            const root = document.querySelector('.relation-workspace')!;
            const panel = Array.from(root.querySelectorAll('.relation-panel')).find((element) => element.getBoundingClientRect().height)!;
            const box = panel.getBoundingClientRect();
            const css = getComputedStyle(panel);
            return { width: box.width, height: box.height, padding: css.padding,
              gap: getComputedStyle(root).gap, panelGap: getComputedStyle(root.querySelector('.maintenance-panels')!).gap,
              stageHeight: root.querySelector('.maintenance-flow')!.getBoundingClientRect().height,
              top: box.top,
              metricsGap: root.querySelector('.maintenance-flow')!.getBoundingClientRect().top - root.querySelector('.relation-metrics')!.getBoundingClientRect().bottom,
              tablesGap: box.top - root.querySelector('.maintenance-flow')!.getBoundingClientRect().bottom,
              controlsGap: root.querySelector('.relation-playback-controls')!.getBoundingClientRect().top - box.bottom };
          });
          if (!reference) reference = geometry;
          expect(geometry).toEqual(reference);
          expect(geometry.metricsGap).toBeGreaterThanOrEqual(10);
          expect(geometry.tablesGap).toBeGreaterThanOrEqual(10);
          expect(geometry.controlsGap).toBeGreaterThanOrEqual(14);
          const tablesFit = await page.locator('.maintenance-panels .table-scroll').evaluateAll((elements) => elements.every((element) => {
            if (!element.getBoundingClientRect().height) return true;
            const table = element.querySelector('table')!;
            return element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1
              && table.getBoundingClientRect().height <= element.clientHeight + 1
              && getComputedStyle(element).overflowX === 'clip' && getComputedStyle(element).overflowY === 'clip';
          }));
          expect(tablesFit, 'Tables fit their frame without scrolling or clipped rows').toBe(true);
          const documentSize = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth }));
          expect(documentSize.height, 'Page height fits the viewport').toBeLessThanOrEqual(size.height);
          expect(documentSize.width, 'Page width fits the viewport').toBeLessThanOrEqual(size.width);
        }
      }
    }
  }
});
