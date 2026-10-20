import { advanceGuidedLesson } from './guided-run';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { recordLectures } from '../../src/chapters/getting-data-in/record-scenarios';
import { chapterFourFrame, chapterFourUsesTabs, expectIngestionLayoutToFit } from './chapter-four-layout';
import { PLAYBACK_INTERVAL_MS } from '../../src/labs/useLectureRun';

const path = (number: number) => '/labs/getting-data-in/tutorial/lecture-' + number;
const relation = (page: Page) => page.getByRole('table', { name: 'Current products', exact: true, includeHidden: true });
const rows = (page: Page) => relation(page).locator('tbody tr:not([aria-hidden="true"])');
const next = (page: Page) => page.getByRole('button', { name: 'Next change', exact: true }).click();
async function advance(page: Page, from: number, to: number) { for (let checkpoint = from; checkpoint < to; checkpoint++) await next(page); }
async function select(page: Page, isMobile: boolean, stage: string) {
  if (isMobile) await page.getByRole('button', { name: stage, exact: true }).click();
}

test('overview and sidebar register the three record lectures', async ({ page }) => {
  await page.goto('/labs/getting-data-in');
  for (const lecture of recordLectures) {
    await expect(page.getByRole('link', { name: 'Start tutorial: Lecture ' + lecture.number + ': ' + lecture.title, exact: true })).toHaveAttribute('href', path(lecture.number));
  }
  await page.getByRole('link', { name: 'Start tutorial: Lecture 2: Events and current values', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lecture 2', exact: true })).toBeVisible();
});

test('events retain copies while a separate keyed fixture replaces and consolidates', async ({ page, isMobile }) => {
  await page.goto(path(2));
  await expect(page.getByTestId('incoming-record')).toHaveAttribute('data-upcoming', 'true');
  await expect(page.getByTestId('records-read')).toHaveText('0');
  await advance(page, 0, 3);
  await expect(page.getByTestId('record-envelope')).toHaveText('NONE');
  await expect(page.getByTestId('record-table-rows')).toHaveText('3');
  await expect(rows(page)).toHaveCount(3);
  await expect(relation(page)).toContainText('$8');
  await next(page);
  await expect(page.getByTestId('record-envelope')).toHaveText('UPSERT');
  await expect(page.getByTestId('records-read')).toHaveText('0');
  await expect(rows(page)).toHaveCount(0);
  await advance(page, 4, 6);
  await select(page, isMobile, '2. Changes');
  const changes = page.getByRole('table', { name: 'Interpreted changes', exact: true });
  await expect(changes.locator('[data-field="price"][data-changed="true"]')).toHaveText(['$8', '$10']);
  await expect(changes.locator('[data-field="name"][data-changed="false"]')).toHaveCount(2);
  await expect(rows(page)).toHaveCount(1);
  await next(page);
  await expect(page.getByRole('status', { name: 'Record interpretation' })).toContainText('No net changes');
  await expect(page.getByTestId('records-read')).toHaveText('3');
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await expect(changes).toContainText('$8');
  await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Record interpretation' })).toContainText('No net changes');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('record-envelope')).toHaveText('NONE');
  await expect(page.getByTestId('records-read')).toHaveText('0');
});

test('stable keys, nullable fields, tombstones and persistent input errors stay distinct', async ({ page, isMobile }) => {
  await page.goto(path(3));
  await advance(page, 0, 2);
  await expect(rows(page)).toHaveCount(2);
  await expect(relation(page)).toContainText('Coffee');
  await expect(relation(page)).toContainText('Roast');
  await advance(page, 2, 5);
  await expect(rows(page)).toHaveCount(1);
  await expect(relation(page)).not.toContainText('Coffee');
  await next(page);
  await expect(relation(page)).toContainText('NULL');
  await expect(rows(page)).toHaveCount(1);
  await next(page);
  await expect(rows(page)).toHaveCount(0);
  await select(page, isMobile, '1. Record');
  await expect(page.getByTestId('incoming-record')).toContainText('Tombstone: null whole value');
  await advance(page, 7, 10);
  await expect(rows(page)).toHaveCount(1);
  await expect(relation(page)).toContainText('Roast');
  await advance(page, 10, 12);
  await expect(page.getByTestId('record-key')).toHaveText('NULL');
  await expect(page.getByTestId('record-table-rows')).toHaveText('—');
  await select(page, isMobile, '3. Table');
  await expect(page.getByRole('status', { name: 'Relation unavailable' })).toBeVisible();
  await expect(relation(page).locator('tbody tr')).toHaveCount(4);
  await next(page);
  await expect(page.getByTestId('record-table-rows')).toHaveText('—');
  await expect(page.getByRole('status', { name: 'Relation unavailable' })).toBeVisible();
  await advance(page, 13, 15);
  await select(page, isMobile, '1. Record');
  await expect(page.getByTestId('incoming-record')).toContainText('not-an-avro-record');
  await expect(page.getByTestId('record-key')).toHaveText('101');
  await expect(page.getByTestId('record-table-rows')).toHaveText('—');
});

test('Debezium before and after produce complete signed insert, update and delete rows', async ({ page, isMobile }) => {
  await page.goto(path(4));
  await expect(page.getByTestId('record-envelope')).toHaveText('DEBEZIUM');
  await expect(page.getByRole('table', { name: 'Decoded Debezium record', includeHidden: true })).toContainText('BeforeNULL');
  await advance(page, 0, 3);
  await expect(rows(page)).toHaveCount(2);
  await expect(relation(page)).toContainText('$10');
  await select(page, isMobile, '2. Changes');
  const changes = page.getByRole('table', { name: 'Interpreted changes', exact: true });
  await expect(changes.locator('[aria-label="Retract 1 copy"]')).toHaveCount(1);
  await expect(changes.locator('[aria-label="Add 1 copy"]')).toHaveCount(1);
  await expect(changes.locator('[data-field="price"][data-changed="true"]')).toHaveText(['$8', '$10']);
  await next(page);
  await expect(rows(page)).toHaveCount(1);
  await expect(changes).toContainText('Tea');
  await expect(changes.locator('[aria-label="Add 1 copy"]')).toHaveCount(0);
  await next(page);
  await expect(relation(page)).toContainText('Cocoa');
  await expect(page.getByTestId('records-read')).toHaveText('5');
});

for (const lecture of recordLectures) {
  test('Lecture ' + lecture.number + ' guided run, SQL and keyboard workflow', async ({ page, isMobile }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(isMobile ? { width: 390, height: 664 } : { width: 1280, height: 650 });
    await page.goto(path(lecture.number));
    await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
    const reference = page.getByRole('dialog', { name: 'SQL & Objectives' });
    await expect(reference).toContainText('CREATE TABLE');
    await expect(reference).toContainText('FROM KAFKA CONNECTION');
    await expect(reference).toContainText('ENVELOPE ' + (lecture.number === 4 ? 'DEBEZIUM' : 'UPSERT'));
    await expect(reference.getByRole('link', { name: 'Kafka tables: formats and envelopes', exact: true })).toHaveAttribute('href', 'https://materialize.com/docs/sql/create-table/kafka/');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    for (let index = 0; index < lecture.lessons.length; index++) {
      const lesson = lecture.lessons[index]!;
      const dialog = page.locator('dialog[open]');
      await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(lesson.title);
      await expect(page.locator('.ingestion-layout')).toHaveAttribute('data-selected-stage', lesson.stage);
      if (lesson.before) {
        await expect(page.getByTestId('incoming-record')).toHaveAttribute('data-upcoming', 'true');
        await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expect(page.getByTestId('incoming-record')).toHaveAttribute('data-upcoming', 'false');
      }
      const card = (await dialog.locator('.relation-guide-card').boundingBox())!;
      const viewport = page.viewportSize()!;
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(viewport.width);
      expect(card.y + card.height).toBeLessThanOrEqual(viewport.height);
      const target = (await page.locator('.ingestion-layout [data-stage="' + lesson.stage + '"]').boundingBox())!;
      if (target.y - card.height - 20 >= 12 && await dialog.locator('.relation-guide-hole').count() === 1) expect(card.y + card.height).toBeLessThanOrEqual(target.y);
      await advanceGuidedLesson(page, index === lecture.lessons.length - 1);
    }
    await expect(page.locator('.maintenance-complete')).toHaveText('Tutorial completed');
    await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
  });

  test('Lecture ' + lecture.number + ' uses the record inspector and fits every state', async ({ page, isMobile }) => {
    test.setTimeout(120_000);
    const viewports = isMobile ? [[390, 664], [610, 668]] : [[1440, 1000], [1366, 768], [1280, 650], [1024, 768], [1100, 740], [1024, 650], [900, 650], [768, 768]];
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width: width!, height: height! });
      await page.goto(path(lecture.number));
      const tabs = chapterFourUsesTabs(width!, height!);
      const original = await Promise.all(chapterFourFrame.map((selector) => page.locator(selector).boundingBox()));
      if (!tabs) {
        const record = (await page.locator('[data-stage="record"]').boundingBox())!;
        const changes = (await page.locator('[data-stage="changes"]').boundingBox())!;
        const table = (await page.locator('[data-stage="relation"]').boundingBox())!;
        expect(changes.x).toEqual(table.x);
        expect(changes.x).toBeGreaterThanOrEqual(record.x + record.width);
        expect(table.y).toBeGreaterThanOrEqual(changes.y + changes.height);
        expect(record.height).toBeGreaterThan(table.height);
      }
      for (let checkpoint = 0; checkpoint <= lecture.actions.length; checkpoint++) {
        const actual = await Promise.all(chapterFourFrame.map((selector) => page.locator(selector).boundingBox()));
        for (let index = 0; index < chapterFourFrame.length; index++) expect(actual[index], chapterFourFrame[index]).toEqual(original[index]);
        for (const stage of tabs ? ['1. Record', '2. Changes', '3. Table'] : ['']) {
          await select(page, tabs, stage);
          await expectIngestionLayoutToFit(page);
        }
        if (checkpoint < lecture.actions.length) await next(page);
      }
      await page.screenshot({ path: test.info().outputPath('lecture-' + lecture.number + '-' + width + '.png') });
    }
  });
}

test('record playback pauses for help, replays, and resets when navigating lectures', async ({ page, isMobile }) => {
  await page.goto(path(2));
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(PLAYBACK_INTERVAL_MS);
  await expect(page.getByTestId('records-read')).toHaveText('1');
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  await page.clock.fastForward(PLAYBACK_INTERVAL_MS * 3);
  await expect(page.getByTestId('records-read')).toHaveText('1');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (let checkpoint = 1; checkpoint < recordLectures[0]!.actions.length; checkpoint++) await page.clock.fastForward(PLAYBACK_INTERVAL_MS);
  await expect(page.getByTestId('record-envelope')).toHaveText('UPSERT');
  await expect(page.getByTestId('records-read')).toHaveText('3');
  await expect(page.locator('.maintenance-complete')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByTestId('record-envelope')).toHaveText('NONE');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  if (!isMobile) {
    await page.getByRole('link', { name: 'Lecture 3: Keys, renames, and deletions', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lecture 3', exact: true })).toBeVisible();
    await expect(page.getByTestId('records-read')).toHaveText('0');
    await expect(page.getByTestId('record-key')).toHaveText('Coffee');
  }
});
