import { expect, test } from './fixtures';

test('lecture layouts preserve the header and share the playback baseline', async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  for (const viewport of isMobile ? [{ width: 390, height: 664 }, { width: 610, height: 668 }] : [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }, { width: 820, height: 1000 }, { width: 680, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/labs/changing-relations/tutorial/lecture-1');
    const titleTop = (await page.locator('h1').boundingBox())!.y;
    const controlsTop = (await page.locator('.guided-lab-controls').boundingBox())!.y;
    const metricsTop = (await page.locator('.relation-metrics').boundingBox())!.y;
    await expect(page.locator('.lecture-workspace')).toHaveAttribute('data-lecture-layout', 'with-tip');
    let playbackBaseline: number | undefined;
    let chapterControlsTop: number | undefined;
    for (const lecture of [1, 2, 3, 4]) {
      await page.goto(`/labs/incremental-maintenance/tutorial/lecture-${lecture}`);
      await expect(page.locator('.lecture-workspace')).toHaveAttribute('data-lecture-layout', 'without-tip');
      await expect(page.getByRole('button', { name: 'Next change', exact: true })).toBeVisible();
      await expect(page.locator('.guided-lab-tip')).toHaveCount(0);
      expect((await page.locator('h1').boundingBox())!.y).toBe(titleTop);
      const currentControlsTop = (await page.locator('.guided-lab-controls').boundingBox())!.y;
      if (chapterControlsTop === undefined) chapterControlsTop = currentControlsTop;
      expect(currentControlsTop).toBe(chapterControlsTop);
      if (viewport.width > 1150 || isMobile) expect(currentControlsTop).toBe(controlsTop);
      const playback = (await page.locator('.relation-playback-controls').boundingBox())!;
      const bottom = playback.y + playback.height;
      if (playbackBaseline === undefined) playbackBaseline = bottom;
      expect(bottom).toBeCloseTo(playbackBaseline, 0);
      expect(bottom).toBeLessThanOrEqual(viewport.height);
      if (viewport.width === 1440) {
        expect(bottom).toBe(viewport.height - 16);
        if (lecture !== 4) expect((await page.locator('.relation-metrics').boundingBox())!.y).toBe(metricsTop);
      }
      await page.screenshot({ path: test.info().outputPath(`${viewport.width}-lecture-${lecture}.png`) });
    }
  }
});
