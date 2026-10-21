import { expect, test } from './fixtures';

test.use({ reducedMotion: 'reduce' });

const chapters = ['changing-relations', 'incremental-maintenance', 'views-indexes-materialized-views',
  'getting-data-in', 'time-in-materialize', 'progress-and-freshness'];

test('the first shortcut opening is positioned before its first visible frame', async ({ page }) => {
  for (const section of ['tutorial/lecture-2', 'exercises/exercise-1']) {
    await page.goto(`/labs/changing-relations/${section}`);
    await page.evaluate(() => {
      const frames: { x: number; y: number }[] = [];
      (window as typeof window & { shortcutOpeningFrames: typeof frames }).shortcutOpeningFrames = frames;
      document.addEventListener('beforetoggle', event => {
        const panel = event.target as HTMLElement;
        if ((event as ToggleEvent).newState !== 'open' || !panel.matches('.shortcut-help-panel')) return;
        const sample = () => {
          if (!panel.matches(':popover-open')) return;
          if (getComputedStyle(panel).visibility !== 'hidden') {
            const { x, y } = panel.getBoundingClientRect();
            frames.push({ x, y });
          }
          if (frames.length < 3) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, true);
    });
    await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
    await expect(panel).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as typeof window & { shortcutOpeningFrames: unknown[] }).shortcutOpeningFrames.length)).toBe(3);
    const finalBounds = (await panel.boundingBox())!;
    const frames = await page.evaluate(() => (window as typeof window & { shortcutOpeningFrames: { x: number; y: number }[] }).shortcutOpeningFrames);
    for (const frame of frames) {
      expect(frame.x).toBe(finalBounds.x);
      expect(frame.y).toBe(finalBounds.y);
    }
  }
});

for (const chapter of chapters) {
  test(`${chapter}: shortcut reference is contextual and does not move the workspace`, async ({ page, isMobile }) => {
    for (const section of ['tutorial/lecture-1', 'exercises/exercise-1']) {
      await page.goto(`/labs/${chapter}/${section}`);
      const trigger = page.getByRole('button', { name: 'Keyboard shortcuts', exact: true });
      await expect(trigger.getByText('Shortcuts', { exact: true })).toBeVisible();
      await expect(trigger.locator('svg')).toBeVisible();
      if (!isMobile) {
        const lecture = section.startsWith('tutorial');
        if (!lecture) await expect.poll(async () => {
          const button = (await trigger.boundingBox())!;
          const target = await page.locator('.guided-lab-controls').first().locator('[data-walkthrough="check"]').evaluateAll(elements => {
              const bounds = elements.map(element => element.getBoundingClientRect());
              return (Math.min(...bounds.map(bounds => bounds.left)) + Math.max(...bounds.map(bounds => bounds.right))) / 2;
            });
          return Math.abs(button.x + button.width / 2 - target);
        }).toBeLessThan(1);
        if (lecture) {
          await expect.poll(async () => {
            const tour = (await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).boundingBox())!;
            const guided = (await page.getByRole('button', { name: 'Start guided run', exact: true }).boundingBox())!;
            return Math.abs(tour.x + tour.width / 2 - guided.x - guided.width / 2);
          }).toBeLessThan(1);
        }
      }
      const panel = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
      const bounds = async () => page.locator('.guided-lab-page:not([inert])').first().evaluate(element =>
        ['.guided-lab-heading', '.guided-lab-controls', '.guided-lab-canvas', '.exercise-question'].map(selector => {
          const r = element.querySelector(selector)?.getBoundingClientRect();
          return r ? [r.x, r.y, r.width, r.height] : null;
        }));
      // Let the viewport-fit observers settle before recording the baseline.
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const before = await bounds();
      const progress = page.locator('.guided-lab-progress strong').first();
      const initialProgress = await progress.textContent();
      await trigger.click();
      await expect(panel).toBeVisible();
      const firstRow = panel.locator('.shortcut-row').first();
      const labelBounds = (await firstRow.locator('dt').boundingBox())!;
      const keyBounds = (await firstRow.locator('dd').boundingBox())!;
      expect(keyBounds.x).toBeGreaterThanOrEqual(labelBounds.x + labelBounds.width);
      expect(keyBounds.y).toBeLessThan(labelBounds.y + labelBounds.height);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(panel.getByRole('heading', { name: section.startsWith('tutorial') ? 'During a guided run' : 'Chapter complete', exact: true })).toBeVisible();
      await expect(panel.getByText(section.startsWith('tutorial') ? 'Check answer' : 'Run / pause playback', { exact: true })).toHaveCount(0);
      await page.keyboard.press('r');
      await page.keyboard.press('s');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Control+Enter');
      await expect(progress).toHaveText(initialProgress!);
      await expect(page.locator('.sql-objectives-panel[open], .relation-guide[open]')).toHaveCount(0);
      expect(await bounds()).toEqual(before);
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
      expect(await bounds()).toEqual(before);
      await trigger.click();
      await panel.getByRole('button', { name: 'Close keyboard shortcuts', exact: true }).click();
      await expect(panel).not.toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();
      await page.getByRole('heading', { name: /^(Lecture|Exercise) 1$/, exact: true }).click();
      await expect(panel).not.toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await page.locator('#main-content').focus();
      await page.keyboard.press('s');
      await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
}

test('action buttons keep their shortcuts without showing shortcut tooltips', async ({ page, isMobile }) => {
  await page.goto('/labs/incremental-maintenance/tutorial/lecture-1');
  const run = page.getByRole('button', { name: 'Run', exact: true });
  const before = await run.boundingBox();
  await page.keyboard.press('Tab');
  await run.focus();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toHaveCount(0);
  expect(await run.boundingBox()).toEqual(before);
  if (!isMobile) {
    await page.mouse.move(0, 0);
    await run.hover();
    await expect(tooltip).toHaveCount(0);
    await page.mouse.move(0, 0);
    await expect(tooltip).toHaveCount(0);
  }
  await run.click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(tooltip).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.goto('/labs/incremental-maintenance/exercises/exercise-1');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Show Answer', exact: true }).focus();
  await expect(tooltip).toHaveCount(0);
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
  await expect(tooltip).toHaveCount(0);
});

test('reference fits compact windows and both themes without overlapping help controls', async ({ page }) => {
  test.setTimeout(60_000);
  for (const viewport of [{ width: 360, height: 740 }, { width: 800, height: 600 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      await page.addInitScript(value => localStorage.setItem('materialize-learning-lab-theme', value), theme);
      for (const path of ['incremental-maintenance/tutorial/lecture-4', 'progress-and-freshness/exercises/exercise-1']) {
        await page.goto(`/labs/${path}`);
        const trigger = page.getByRole('button', { name: 'Keyboard shortcuts', exact: true });
        const tour = page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true });
        if (await tour.count()) {
          const a = (await trigger.boundingBox())!;
          const b = (await tour.boundingBox())!;
          expect(a.x + a.width <= b.x || b.x + b.width <= a.x).toBe(true);
        }
        await trigger.click();
        const panel = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
        await expect(panel).toBeVisible();
        const bounds = (await panel.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
        expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
    }
  }
});
