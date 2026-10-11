import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { snapshotLessons, snapshotRunDefinition } from '../../src/chapters/getting-data-in/scenario';
import { chapterFourFrame, chapterFourUsesTabs, expectIngestionLayoutToFit } from './chapter-four-layout';
import { PLAYBACK_INTERVAL_MS } from '../../src/labs/useLectureRun';

const path = '/labs/getting-data-in/tutorial/lecture-1';
const relation = (page: Page) => page.getByRole('table', { name: 'Materialize products', exact: true, includeHidden: true });
const dataRows = (page: Page) => relation(page).locator('tbody tr:not([aria-hidden="true"])');
const next = (page: Page) => page.getByRole('button', { name: 'Next change', exact: true }).click();
const select = async (page: Page, isMobile: boolean, stage: string) => {
  if (isMobile) await page.getByRole('button', { name: stage, exact: true }).click();
};

test('Chapter 4 snapshot lecture is reachable from its overview', async ({ page }) => {
  await page.goto('/labs/getting-data-in');
  await page.getByRole('link', { name: 'Start tutorial: Lecture 1: From snapshot to live changes', exact: true }).click();
  await expect(page).toHaveURL(path);
  await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true })).toBeVisible();
  await expect(page.locator('.guided-lab-tip')).toHaveCount(0);
  await expect(page.locator('.ingestion-status-metrics > .relation-metric')).toHaveCount(3);
});

test('snapshot commits atomically, catches up queued changes and continues live', async ({ page, isMobile }) => {
  await page.goto(path);
  await select(page, isMobile, '3. Table');
  await expect(page.getByRole('status', { name: 'Table availability' })).toContainText('Queries waiting');
  await expect(dataRows(page)).toHaveCount(0);
  await expect(page.getByTestId('snapshot-rows-read')).toHaveText('0 / 3');

  await next(page);
  await expect(page.getByTestId('snapshot-rows-read')).toHaveText('1 / 3');
  await expect(dataRows(page)).toHaveCount(0);
  await next(page);
  await expect(page.getByTestId('snapshot-pending-count')).toHaveText('1');
  await next(page);
  await expect(page.getByTestId('snapshot-pending-count')).toHaveText('2');
  await select(page, isMobile, '2. Ingestion');
  const queue = page.getByRole('table', { name: 'CDC operations', exact: true });
  await expect(queue).toContainText('Update');
  await expect(queue).toContainText('Delete');
  await expect(queue.locator('[data-applied="false"]')).toHaveCount(2);

  await next(page);
  await expect(page.getByTestId('snapshot-rows-read')).toHaveText('3 / 3');
  await select(page, isMobile, '3. Table');
  await expect(page.getByRole('status', { name: 'Table availability' })).toBeVisible();
  await expect(dataRows(page)).toHaveCount(0);
  await next(page);
  await expect(dataRows(page)).toHaveCount(3);
  await expect(relation(page)).toContainText('$8');
  await expect(relation(page)).toContainText('Mug');
  await expect(page.getByTestId('snapshot-phase')).toHaveAttribute('data-phase', 'Catch-up');
  await expect(page.getByRole('status', { name: 'Table availability' })).toHaveCount(0);

  await next(page);
  await expect(dataRows(page)).toHaveCount(3);
  await expect(relation(page)).toContainText('$10');
  await expect(page.getByTestId('snapshot-pending-count')).toHaveText('1');
  const changes = page.getByRole('region', { name: 'Applied changes', exact: true });
  await expect(changes.locator('[data-field="price"][data-changed="true"]')).toHaveText(['$8', '$10']);
  await expect(changes.locator('[data-field="name"][data-changed="false"]')).toHaveCount(2);

  await next(page);
  await expect(dataRows(page)).toHaveCount(2);
  await expect(relation(page)).not.toContainText('Mug');
  await expect(page.getByTestId('snapshot-pending-count')).toHaveText('0');
  await expect(page.getByTestId('snapshot-phase')).toHaveAttribute('data-phase', 'Live');
  await next(page);
  await expect(dataRows(page)).toHaveCount(3);
  await expect(relation(page)).toContainText('Cocoa');
  await expect(page.getByTestId('snapshot-rows-read')).toHaveText('3 / 3');
  await expect(page.getByRole('button', { name: 'Next change', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await expect(relation(page)).not.toContainText('Cocoa');
  await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
  await expect(relation(page)).toContainText('Cocoa');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('snapshot-rows-read')).toHaveText('0 / 3');
  await expect(page.getByTestId('snapshot-pending-count')).toHaveText('0');
  await expect(page.getByTestId('snapshot-phase')).toHaveAttribute('data-phase', 'Snapshotting');
});

test('guided predictions reveal the relevant state, fit the viewport and restore focus', async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 664 } : { width: 1280, height: 650 });
  await page.goto(path);
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  const reference = page.getByRole('dialog', { name: 'SQL & Objectives' });
  await expect(reference).toContainText('FROM POSTGRES CONNECTION pg_connection');
  await expect(reference).toContainText('FROM SOURCE catalog_source (REFERENCE public.products)');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  for (let index = 0; index < snapshotLessons.length; index++) {
    const lesson = snapshotLessons[index]!;
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(lesson.title);
    await expect(page.locator('.ingestion-layout')).toHaveAttribute('data-selected-stage', lesson.stage);
    if (lesson.before) {
      await expect(dialog).toContainText('Predict the effect');
      await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
    }
    await expect(dialog).toContainText('Explanation');
    const card = await dialog.locator('.relation-guide-card').boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.y).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(card!.y + card!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const target = lesson.focus === 'snapshot-progress'
      ? page.getByTestId('snapshot-read-metric') : page.locator('.ingestion-layout [data-stage="' + lesson.stage + '"]');
    const bounds = (await target.boundingBox())!;
    const aboveFits = bounds.y - card!.height - 20 >= 12;
    if (aboveFits) expect(card!.y + card!.height).toBeLessThanOrEqual(bounds.y);
    await dialog.getByRole('button', { name: index === snapshotLessons.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
  await expect(page.locator('.maintenance-complete')).toHaveText('Tutorial completed');
  await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
  await expect(relation(page)).toContainText('Cocoa');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
});

test('guided snapshot steps keep their progress target on compact screens', async ({ page, isMobile }) => {
  test.skip(isMobile, 'This is the compact desktop reference layout.');
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.goto(path);
  await expect(page.getByTestId('snapshot-read-metric')).toBeVisible();
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Read the first snapshot row');
  const panel = (await page.getByTestId('snapshot-read-metric').boundingBox())!;
  const hole = (await dialog.locator('.relation-guide-hole').boundingBox())!;
  expect(hole.x).toBeLessThan(panel.x);
  expect(hole.y).toBeLessThan(panel.y);
  expect(hole.width).toBeGreaterThan(panel.width);
  await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
  await expect(page.locator('[aria-label="Snapshot and CDC status"]')).toContainText('1 / 3 starting rows read');
  const card = (await dialog.locator('.relation-guide-card').boundingBox())!;
  expect(card.y + card.height).toBeLessThanOrEqual(740);
});

test('autoplay pauses for the shared controls tour and stays separate from tutorial completion', async ({ page }) => {
  await page.goto(path);
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(PLAYBACK_INTERVAL_MS);
  await expect(page.getByTestId('snapshot-rows-read')).toHaveText('1 / 3');
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  await expect(page.locator('dialog[open]')).toContainText('Run and Pause');
  await page.clock.fastForward(PLAYBACK_INTERVAL_MS * 3);
  await expect(page.getByTestId('snapshot-pending-count')).toHaveText('0');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (let checkpoint = 2; checkpoint <= snapshotRunDefinition.totalChanges; checkpoint++) {
    await page.clock.fastForward(PLAYBACK_INTERVAL_MS);
  }
  await expect(relation(page)).toContainText('Cocoa');
  await expect(page.locator('.maintenance-complete')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
});

test('snapshot bridge fits every checkpoint with stable controls and panel bounds', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  const viewports = isMobile ? [[390, 664], [610, 668]] : [[1440, 1000], [1366, 768], [1280, 650], [1024, 768], [1100, 740], [1024, 650], [900, 650], [768, 768]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto(path);
    const tabs = chapterFourUsesTabs(width!, height!);
    const original = await Promise.all(chapterFourFrame.map((selector) => page.locator(selector).boundingBox()));
    if (!tabs) {
      const source = (await page.locator('[data-stage="source"]').boundingBox())!;
      const relation = (await page.locator('[data-stage="relation"]').boundingBox())!;
      const queue = (await page.locator('[data-stage="ingestion"]').boundingBox())!;
      expect(relation.y).toEqual(source.y);
      expect(relation.x).toBeGreaterThan(source.x + source.width);
      expect(queue.y).toBeGreaterThanOrEqual(source.y + source.height);
      expect(queue.width).toBeGreaterThan(source.width + relation.width);
    }
    for (let checkpoint = 0; checkpoint <= snapshotRunDefinition.totalChanges; checkpoint++) {
      const actual = await Promise.all(chapterFourFrame.map((selector) => page.locator(selector).boundingBox()));
      for (let index = 0; index < chapterFourFrame.length; index++) expect(actual[index], chapterFourFrame[index]).toEqual(original[index]);
      for (const stage of tabs ? ['1. Upstream', '2. Ingestion', '3. Table'] : ['']) {
        await select(page, tabs, stage);
        await expectIngestionLayoutToFit(page);
      }
      if (checkpoint < snapshotRunDefinition.totalChanges) await next(page);
    }
    await page.screenshot({ path: test.info().outputPath('chapter-four-' + width + '.png') });
  }
});
