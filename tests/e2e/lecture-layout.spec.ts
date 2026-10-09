import { expect, test } from './fixtures';

test('Chapter 1 ledgers share Lecture 1 presentation and keep history usable in both themes', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(60_000);
  const viewports = isMobile ? [{ width: 390, height: 664 }] : [
    { width: 1440, height: 1000 }, { width: 1366, height: 768 },
    { width: 1280, height: 650 }, { width: 1024, height: 768 },
  ];
  const presentation = () => page.locator('.relation-ledger').evaluate((panel) => {
    const table = panel.querySelector('table')!;
    const styles = (element: Element) => {
      const css = getComputedStyle(element);
      return [css.fontFamily, css.fontSize, css.fontWeight, css.color, css.backgroundColor,
        css.padding, css.borderBottomColor, css.borderRadius, css.textAlign];
    };
    return {
      panel: styles(panel), heading: styles(panel.querySelector('h2')!),
      headers: Array.from(table.querySelectorAll('th')).map(styles),
      cells: Array.from(table.querySelectorAll('tbody tr:first-child td')).map(styles),
      columns: Array.from(table.querySelectorAll('th')).map((cell) => cell.getBoundingClientRect().width),
      rowHeight: table.querySelector('tbody tr')!.getBoundingClientRect().height,
    };
  });
  const workspaceLayout = () => page.evaluate(() => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const tip = document.querySelector('.guided-lab-tip');
    const tipVisible = tip && tip.getAttribute('data-fit-hidden') !== 'true';
    return {
      metrics: Array.from(document.querySelectorAll('.relation-metric')).map(box),
      controls: box(document.querySelector('.relation-playback-controls')!),
      tip: tipVisible ? box(tip) : null,
    };
  });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      await page.goto('/labs/changing-relations/tutorial/lecture-1');
      const toggle = page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true });
      if (await toggle.isVisible()) await toggle.click();
      const description = page.locator('.guided-lab-title > p');
      if (!isMobile) await expect(description).toBeVisible();
      const chapterOneLayout = await workspaceLayout();
      if (!isMobile) {
        const gaps = await page.evaluate(() => {
          const heading = document.querySelector('.guided-lab-heading')!.getBoundingClientRect();
          const metrics = document.querySelector('.relation-metrics')!.getBoundingClientRect();
          const panels = document.querySelector('.relation-panels')!.getBoundingClientRect();
          return { above: metrics.top - heading.bottom, between: panels.top - metrics.bottom };
        });
        expect(gaps.above).toBe(viewport.height <= 740 ? 40 : viewport.width <= 1150 ? 44 : 52);
        expect(gaps.between).toBe(22);
      }
      for (let time = 0; time <= 4; time++) {
        if (time > 0) await page.getByRole('button', { name: 'Next change', exact: true }).click();
        await expect.poll(workspaceLayout).toEqual(chapterOneLayout);
      }
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      const reference = await presentation();
      const referencePanelHeight = (await page.locator('.relation-ledger').boundingBox())!.height;
      const referenceTableHeight = (await page.locator('.relation-ledger table').boundingBox())!.height;
      await page.goto('/labs/changing-relations/tutorial/lecture-2');
      if (!isMobile) await expect(description).toBeVisible();
      const batchPresentation = await presentation();
      expect(batchPresentation.panel).toEqual(reference.panel);
      expect(batchPresentation.heading).toEqual(reference.heading);
      expect(batchPresentation.headers).toEqual(reference.headers.slice(1));
      expect(batchPresentation.cells).toEqual(reference.cells.slice(1));
      expect(batchPresentation.rowHeight).toBeCloseTo(reference.rowHeight, 0);
      expect(batchPresentation.columns[0]).toBeCloseTo(reference.columns[1]!, 0);
      const ledger = page.locator('.relation-ledger');
      const startingHeight = (await ledger.boundingBox())!.height;
      if (!isMobile) {
        expect(startingHeight).toBeCloseTo(referencePanelHeight, 0);
        expect((await ledger.locator('table').boundingBox())!.height).toBeCloseTo(referenceTableHeight, 0);
      }
      await expect(ledger.locator('thead .relation-column-label')).toHaveText([/^Signed diff/, /^Row/]);
      for (let time = 0; time <= 3; time++) {
        if (time > 0) await page.getByRole('button', { name: 'Next timestamp', exact: true }).click();
        await expect.poll(workspaceLayout).toEqual(chapterOneLayout);
        await expect(ledger.locator('tbody tr')).toHaveCount(4);
        expect(Math.abs((await ledger.boundingBox())!.height - startingHeight)).toBeLessThanOrEqual(1);
        const geometry = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, viewportHeight: innerHeight, viewportWidth: innerWidth }));
        expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight);
        expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth);
        await expect(ledger.locator('tbody tr[data-mobile-current="true"]')).toHaveCount(time === 0 ? 3 : time === 3 ? 4 : 2);
      }
      await expect(page.getByRole('button', { name: /^Inspect t =/ })).toHaveCount(0);
      const previous = page.getByRole('button', { name: 'Previous timestamp', exact: true });
      await previous.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
      await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
      await expect(page.getByRole('progressbar', { name: 'Changes progress' })).toHaveAttribute('value', '1');
      await expect(ledger.locator('.relation-ledger-selected')).toHaveCount(0);
      const historyGeometry = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, bottom: document.querySelector('.relation-playback-controls')!.getBoundingClientRect().bottom, viewportHeight: innerHeight }));
      expect(historyGeometry.height).toBeLessThanOrEqual(historyGeometry.viewportHeight);
      expect(historyGeometry.bottom).toBeLessThanOrEqual(historyGeometry.viewportHeight);
      await page.screenshot({ path: testInfo.outputPath(`chapter-1-ledger-${theme}-${viewport.width}-${viewport.height}.png`) });
    }
  }
});

test('Back revisits the prediction after Show effect in every lecture', async ({ page }) => {
  for (const chapter of ['changing-relations', 'incremental-maintenance']) {
    for (const lecture of [1, 2]) {
      await page.goto(`/labs/${chapter}/tutorial/lecture-${lecture}`);
      await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
      const dialog = page.locator('dialog[open]');
      const reveal = dialog.getByRole('button', { name: 'Show effect', exact: true });
      while (!await reveal.count()) await dialog.getByRole('button', { name: 'Next', exact: true }).click();
      const heading = await dialog.locator('h2').textContent();
      const step = await dialog.locator('.relation-guide-step').textContent();
      const time = page.locator('.relation-metrics .relation-time');
      const previousTime = await time.textContent();
      const tables = page.locator('.relation-workspace .data-table');
      const beforeRows = await tables.allTextContents();
      await reveal.click();
      const effectTime = await time.textContent();
      await dialog.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(dialog.locator('h2')).toHaveText(heading!);
      await expect(dialog.locator('.relation-guide-step')).toHaveText(step!);
      await expect(reveal).toBeVisible();
      await expect(time).toHaveText(previousTime!);
      expect(await tables.allTextContents()).toEqual(beforeRows);
      await reveal.click();
      await dialog.getByRole('button', { name: 'Next', exact: true }).click();
      await dialog.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(dialog.locator('h2')).toHaveText(heading!);
      await expect(time).toHaveText(effectTime!);
      await expect(reveal).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(reveal).toBeVisible();
      await expect(time).toHaveText(previousTime!);
      await page.keyboard.press('Escape');
    }
  }
});

test('all lecture trackers follow the displayed change when navigating back', async ({ page }) => {
  for (const chapter of ['changing-relations', 'incremental-maintenance']) {
    for (const lecture of [1, 2]) {
      await page.goto(`/labs/${chapter}/tutorial/lecture-${lecture}`);
      const timestamp = chapter === 'changing-relations' && lecture === 2;
      const next = page.getByRole('button', { name: timestamp ? 'Next timestamp' : 'Next change', exact: true });
      const previous = page.getByRole('button', { name: timestamp ? 'Previous timestamp' : 'Previous change', exact: true });
      const progress = page.getByRole('progressbar', { name: 'Changes progress' });
      await next.click(); await next.click();
      await expect(progress).toHaveAttribute('value', '2');
      await previous.click(); await previous.click();
      await expect(progress).toHaveAttribute('value', '0');
      await expect(page.locator('.guided-lab-progress strong')).toHaveText(`0 / ${chapter === 'incremental-maintenance' && lecture === 1 ? 5 : timestamp ? 3 : 4}`);
      await expect(page.locator('.relation-playback-status')).toHaveCount(0);
      await next.click();
      await expect(progress).toHaveAttribute('value', '1');
    }
  }
});

test('Chapter 2 tables and equal panels keep their dimensions without a tip', async ({ page, isMobile }) => {
  for (const lecture of [1, 2]) {
    await page.goto(`/labs/incremental-maintenance/tutorial/lecture-${lecture}`);
    const selectStage = async (index: number) => {
      if (isMobile) await page.locator(lecture === 1 ? '.maintenance-flow .button' : '.join-flow .button').nth(index).click();
    };
    const tables = page.locator('.maintenance-panels .data-table');
    const panels = page.locator('.maintenance-panels > section');
    const dimensions: { width: number; height: number }[] = [];
    const panelHeights: number[] = [];
    for (let index = 0; index < 3; index++) {
      await selectStage(index);
      const box = await tables.nth(index).boundingBox();
      dimensions.push({ width: box!.width, height: box!.height });
      panelHeights.push((await panels.nth(index).boundingBox())!.height);
    }
    expect(new Set(panelHeights).size).toBe(1);
    for (let time = 1; time <= (lecture === 1 ? 5 : 4); time++) {
      await page.getByRole('button', { name: 'Next change', exact: true }).click();
      for (let index = 0; index < 3; index++) {
        await selectStage(index);
        const box = await tables.nth(index).boundingBox();
        expect({ width: box!.width, height: box!.height }).toEqual(dimensions[index]);
        expect((await panels.nth(index).boundingBox())!.height).toBe(panelHeights[index]);
      }
    }
    await page.getByRole('button', { name: 'Previous change', exact: true }).click();
    await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
    await expect(page.getByTestId(lecture === 1 ? 'maintenance-time' : 'join-time')).toHaveText(`t = ${lecture === 1 ? 5 : 4}`);
    await expect(page.getByRole('button', { name: 'Return to latest', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'About Current logical timestamp', exact: true }).click();
    await expect(page.getByText('These small t values are teaching labels', { exact: false })).toBeVisible();
    await page.keyboard.press('Escape');
    if (!isMobile) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await expect(page.getByRole('complementary', { name: 'Lab tip' })).toHaveCount(0);
      await page.setViewportSize({ width: 1280, height: 650 });
      await expect(page.getByRole('complementary', { name: 'Lab tip' })).toHaveCount(0);
    }
  }
});
