import { expect, test } from './fixtures';

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
      const progress = page.getByRole('progressbar', { name: timestamp ? 'Timestamps progress' : 'Changes progress' });
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

test('Chapter 2 tables and equal panels keep their dimensions and tips appear only with room', async ({ page, isMobile }) => {
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
      await expect(page.getByRole('complementary', { name: 'Lab tip' })).toBeVisible();
      await page.setViewportSize({ width: 1280, height: 650 });
      await expect(page.getByRole('complementary', { name: 'Lab tip' })).toBeHidden();
    }
  }
});
