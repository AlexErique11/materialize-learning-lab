import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { expectGuideClearOfTargets } from './guided-run';

async function reachExplanation(page: Page, title: string) {
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  const dialog = page.locator('.relation-guide[open]');
  for (let i = 0; i < 100; i++) {
    if (await dialog.getByRole('heading', { name: title, exact: true }).count()) {
      const reveal = dialog.getByRole('button', { name: 'Show effect', exact: true });
      if (await reveal.isVisible()) {
        await expect(dialog.locator('.relation-guide-hole')).toHaveCount(1);
        await expect(dialog.getByRole('navigation', { name: 'Inspect related changes' })).toHaveCount(0);
        await reveal.click();
      }
      await expect(dialog.locator('.relation-guide-phase')).toHaveText('Explanation');
      return dialog;
    }
    await dialog.locator('.relation-guide-actions button').last().click();
  }
  throw new Error(`Guided checkpoint not reached: ${title}`);
}

const cases = [
  { chapter: 'changing-relations', lecture: 1, title: 'Total copies and distinct rows differ', targets: ['metrics', 'relation'] },
  { chapter: 'views-indexes-materialized-views', lecture: 2, title: 'Remove only the index', targets: ['b', 'durable'] },
  { chapter: 'views-indexes-materialized-views', lecture: 3, title: 'Follow one update through the design', targets: ['input', 'durable', 'a', 'b'] },
  { chapter: 'getting-data-in', lecture: 1, title: 'Catch up the deletion', targets: ['relation', 'metrics', 'ingestion'] },
  { chapter: 'time-in-materialize', lecture: 4, title: 'Extend an active lifetime', targets: ['result', 'source', 'timeline'] },
  { chapter: 'progress-and-freshness', lecture: 2, title: 'Permission is not completed processing', targets: ['payments', 'join'] },
  { chapter: 'progress-and-freshness', lecture: 3, title: 'Introduce the simulated wall clock', targets: ['axis', 'metrics'] },
  { chapter: 'progress-and-freshness', lecture: 3, title: 'New incident: a stalled source', targets: ['lanes', 'detail', 'lag'] },
  { chapter: 'progress-and-freshness', lecture: 3, title: 'New incident: maintained computation', targets: ['lanes', 'detail', 'lag'] },
  { chapter: 'progress-and-freshness', lecture: 3, title: 'New incident: current data, slow query', targets: ['detail', 'lanes', 'metrics'] },
];

for (const item of cases) {
  test(`${item.chapter}: ${item.title} exposes related changes without replaying the event`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(isMobile ? { width: 390, height: 664 } : { width: 1280, height: 650 });
    await page.goto(`/labs/${item.chapter}/tutorial/lecture-${item.lecture}`);
    const dialog = await reachExplanation(page, item.title);
    if (item.title === 'Permission is not completed processing') {
      await expect(page.getByTestId('lane-join')).toHaveAttribute('aria-label', /frontier 8;.*input limit 14/);
      await expect(page.getByTestId('lane-join')).toHaveAttribute('data-changed', 'true');
    }
    if (item.title === 'New incident: maintained computation') {
      await expect(page.locator('.progress-lane[data-changed="true"]')).toHaveCount(0);
    }
    const signature = () => page.locator('main').evaluate(main => JSON.stringify({
      tables: Array.from(main.querySelectorAll('tbody')).map(table => table.textContent),
      metrics: Array.from(main.querySelectorAll('.relation-metric')).map(metric => metric.textContent),
      frontiers: Array.from(main.querySelectorAll('.progress-lane')).map(lane => lane.getAttribute('aria-label')),
    }));
    const original = await signature();
    const step = await dialog.locator('.relation-guide-step').textContent();
    await expect(dialog).toHaveAttribute('data-focus-count', String(item.targets.length));
    for (let index = 0; index < item.targets.length; index++) {
      const target = item.targets[index]!;
      const control = dialog.getByRole('navigation', { name: 'Inspect related changes' }).getByRole('button').nth(index);
      await control.click();
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      await expect(dialog.locator('.relation-guide-hole').first()).toHaveAttribute('data-focus', target);
      const opening = await dialog.locator('.relation-guide-hole').first().boundingBox();
      expect(opening!.width).toBeGreaterThan(100);
      expect(opening!.height).toBeGreaterThan(20);
      await expectGuideClearOfTargets(page);
      await expect(dialog.locator('.relation-guide-step')).toHaveText(step!);
      expect(await signature()).toBe(original);
    }
    if (await dialog.getAttribute('data-inspection-mode') === 'sequential') {
      await dialog.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(dialog).toHaveAttribute('data-focus-index', String(item.targets.length - 2));
      expect(await signature()).toBe(original);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
  });
}

test('desktop guide opens separate regions and keeps the card clear of both', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/labs/views-indexes-materialized-views/tutorial/lecture-2');
  const dialog = await reachExplanation(page, 'Remove only the index');
  await expect(dialog).toHaveAttribute('data-inspection-mode', 'grouped');
  await expect(dialog.locator('.relation-guide-hole')).toHaveCount(2);
  await expect(dialog.locator('.relation-guide-hole[data-focus="b"]')).toBeVisible();
  await expect(dialog.locator('.relation-guide-hole[data-focus="durable"]')).toBeVisible();
  await expectGuideClearOfTargets(page);
  expect(await dialog.locator('.relation-guide-shade').evaluate(shade => getComputedStyle(shade).clipPath)).toContain('evenodd');
});
