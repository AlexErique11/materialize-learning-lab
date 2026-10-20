import { advanceGuidedLesson } from './guided-run';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { PLAYBACK_INTERVAL_MS } from '../../src/labs/useLectureRun';

const path = (lecture: number) => `/labs/time-in-materialize/tutorial/lecture-${lecture}`;
const next = (page: Page) => page.getByRole('button', { name: 'Next change', exact: true }).click();
const source = (page: Page) => page.getByTestId('temporal-source-table');
const result = (page: Page) => page.getByTestId('temporal-result-table');
const diffs = (page: Page) => page.getByTestId('temporal-diffs');
const clock = (page: Page) => page.getByTestId('temporal-logical-time');
const copies = (page: Page, type: 'Add' | 'Retract') => diffs(page).getByLabel(`${type} 1 copy`, { exact: true });
const lectures = [
  { number: 1, changes: 7, lessons: 10, initial: [1, 1], final: [1, 0] },
  { number: 2, changes: 7, lessons: 10, initial: [1, 1], final: [2, 0] },
  { number: 3, changes: 5, lessons: 8, initial: [0, 0], final: [3, 0] },
  { number: 4, changes: 7, lessons: 10, initial: [3, 3], final: [2, 0] },
] as const;

async function counts(page: Page, sourceCount: number, resultCount: number) {
  await expect(page.getByTestId('temporal-source-count')).toHaveText(String(sourceCount));
  await expect(page.getByTestId('temporal-result-count')).toHaveText(String(resultCount));
}

async function selectPanel(page: Page, panel: 'Timeline' | 'Source' | 'Result') {
  const button = page.getByRole('button', { name: panel, exact: true });
  if (await button.isVisible()) {
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
}

async function stateSnapshot(page: Page) {
  return Promise.all([
    page.getByTestId('temporal-source-count').textContent(),
    page.getByTestId('temporal-result-count').textContent(),
    clock(page).textContent(),
    page.getByTestId('temporal-fixture-label').textContent(),
    source(page).textContent(),
    result(page).textContent(),
    diffs(page).textContent(),
  ]);
}

async function expectPageToFit(page: Page) {
  const dimensions = await page.evaluate(() => {
    const visible = (element: Element) => element.getClientRects().length > 0;
    return {
      page: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      },
      tables: Array.from(document.querySelectorAll<HTMLElement>('.temporal-workspace .table-scroll')).filter(visible).map((element) => ({
        label: element.getAttribute('aria-label'),
        height: element.clientHeight,
        contentHeight: element.scrollHeight,
        width: element.clientWidth,
        contentWidth: element.scrollWidth,
      })),
      visibleContent: Array.from(document.querySelectorAll<HTMLElement>('[data-testid="temporal-timeline"], [data-testid="temporal-clocks"], [data-testid="temporal-source-table"], [data-testid="temporal-result-table"], [data-testid="temporal-diffs"]'))
        .filter(visible).map((element) => ({ label: element.dataset.testid, bottom: element.getBoundingClientRect().bottom })),
      panels: Array.from(document.querySelectorAll<HTMLElement>('.temporal-workspace .temporal-panel')).filter(visible).map((panel) => ({
        stage: panel.dataset.stage,
        bottom: panel.getBoundingClientRect().bottom,
        width: panel.clientWidth,
        contentWidth: panel.scrollWidth,
        contentBottom: Math.max(...Array.from(panel.querySelectorAll(':scope > *')).filter(visible).map((child) => child.getBoundingClientRect().bottom)),
      })),
      cells: Array.from(document.querySelectorAll<HTMLElement>('.temporal-workspace .data-table th, .temporal-workspace .data-table td')).filter(visible).map((cell) => ({
        text: cell.textContent,
        width: cell.clientWidth,
        contentWidth: cell.scrollWidth,
      })),
    };
  });
  expect(dimensions.page.width, 'The page has no horizontal overflow').toBeLessThanOrEqual(dimensions.page.viewportWidth + 1);
  expect(dimensions.page.height, 'The lecture fits without vertical scrolling').toBeLessThanOrEqual(dimensions.page.viewportHeight + 1);
  for (const table of dimensions.tables) {
    expect(table.contentHeight, `${table.label}: all rows fit`).toBeLessThanOrEqual(table.height + 1);
    expect(table.contentWidth, `${table.label}: all columns fit`).toBeLessThanOrEqual(table.width + 1);
  }
  for (const cell of dimensions.cells) expect(cell.contentWidth, `${cell.text}: table text is not clipped`).toBeLessThanOrEqual(cell.width + 1);
  const playback = (await page.locator('.relation-playback-controls').boundingBox())!;
  for (const panel of dimensions.panels) {
    expect(panel.contentBottom, `${panel.stage}: contents fit inside their panel`).toBeLessThanOrEqual(panel.bottom + 1);
    expect(panel.contentWidth, `${panel.stage}: contents fit the panel width`).toBeLessThanOrEqual(panel.width + 1);
  }
  for (const content of dimensions.visibleContent) expect(content.bottom, `${content.label}: content stays above playback`).toBeLessThanOrEqual(playback.y + 1);
  expect(playback.y + playback.height).toBeLessThanOrEqual(dimensions.page.viewportHeight);
}

test('Chapter 5 overview links to all four temporal lectures', async ({ page }) => {
  await page.goto('/labs/time-in-materialize');
  for (const lecture of lectures) {
    await expect(page.locator(`.chapter-overview a[href="${path(lecture.number)}"]`)).toHaveCount(1);
  }
  await page.locator(`.chapter-overview a[href="${path(1)}"]`).click();
  await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).toBeVisible();
  await expect(page.locator('.lecture-workspace')).toHaveAttribute('data-lecture-layout', 'without-tip');
  await expect(page.locator('.guided-lab-tip')).toHaveCount(0);
});

test('exclusive and inclusive expiration boundaries retract only the result', async ({ page }) => {
  await page.goto(path(1));
  await counts(page, 1, 1);
  await expect(clock(page)).toHaveText('12.000 s');
  const exclusiveFixture = await page.getByTestId('temporal-fixture-label').textContent();
  await next(page);
  await expect(clock(page)).toHaveText('19.999 s');
  await counts(page, 1, 1);
  await next(page);
  await expect(clock(page)).toHaveText('20.000 s');
  await counts(page, 1, 0);
  await expect(copies(page, 'Retract')).toHaveCount(1);
  await expect(diffs(page)).toContainText('101');
  await expect(source(page)).toContainText('101');
  await next(page);
  await expect(clock(page)).toHaveText('20.001 s');
  await expect(diffs(page)).toContainText('No net changes');
  await next(page);
  await expect(clock(page)).toHaveText('12.000 s');
  await expect(page.getByTestId('temporal-fixture-label')).not.toHaveText(exclusiveFixture!);
  await counts(page, 1, 1);
  await expect(diffs(page)).toContainText('New query fixture');
  await next(page);
  await expect(clock(page)).toHaveText('19.999 s');
  await next(page);
  await expect(clock(page)).toHaveText('20.000 s');
  await counts(page, 1, 1);
  await expect(copies(page, 'Retract')).toHaveCount(0);
  await next(page);
  await expect(clock(page)).toHaveText('20.001 s');
  await counts(page, 1, 0);
  await expect(copies(page, 'Retract')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next change', exact: true })).toBeDisabled();
});

test('future rows wait for entry and independent deadlines expire separately', async ({ page }) => {
  await page.goto(path(2));
  await counts(page, 1, 1);
  await next(page);
  await expect(clock(page)).toHaveText('12.000 s');
  await counts(page, 1, 0);
  await expect(diffs(page)).toContainText('New query fixture');
  await next(page);
  await expect(clock(page)).toHaveText('20.000 s');
  await counts(page, 1, 1);
  await expect(copies(page, 'Add')).toHaveCount(1);
  await next(page);
  await expect(clock(page)).toHaveText('30.000 s');
  await counts(page, 1, 0);
  await expect(copies(page, 'Retract')).toHaveCount(1);
  await next(page);
  await counts(page, 2, 0);
  await expect(source(page)).toContainText('expires_at');
  await expect(diffs(page)).toContainText('New query fixture');
  await next(page);
  await counts(page, 2, 2);
  await expect(copies(page, 'Add')).toHaveCount(2);
  await next(page);
  await counts(page, 2, 1);
  await expect(result(page)).not.toContainText('101');
  await expect(result(page)).toContainText('102');
  await next(page);
  await expect(clock(page)).toHaveText('35.000 s');
  await counts(page, 2, 0);
  await expect(diffs(page)).toContainText('102');
});

test('late input keeps the event-time expiration and expired input never flashes into the result', async ({ page }) => {
  await page.goto(path(3));
  await counts(page, 0, 0);
  await next(page);
  await expect(clock(page)).toHaveText('12.000 s');
  await counts(page, 1, 1);
  await next(page);
  await expect(clock(page)).toHaveText('18.000 s');
  await counts(page, 2, 2);
  await expect(diffs(page)).toContainText('102');
  await next(page);
  await expect(clock(page)).toHaveText('19.999 s');
  await counts(page, 2, 2);
  await next(page);
  await expect(clock(page)).toHaveText('20.000 s');
  await counts(page, 2, 0);
  await expect(copies(page, 'Retract')).toHaveCount(2);
  await next(page);
  await expect(clock(page)).toHaveText('21.000 s');
  await counts(page, 3, 0);
  await expect(source(page)).toContainText('103');
  await expect(result(page)).not.toContainText('103');
  await expect(copies(page, 'Add')).toHaveCount(0);
  await expect(copies(page, 'Retract')).toHaveCount(0);
  await expect(diffs(page)).toContainText('No net changes');
});

test('deadline updates replace rows and obsolete deadlines cannot produce duplicate retractions', async ({ page }) => {
  await page.goto(path(4));
  await counts(page, 3, 3);
  await next(page);
  await expect(clock(page)).toHaveText('15.000 s');
  await counts(page, 3, 3);
  await expect(copies(page, 'Retract')).toHaveCount(1);
  await expect(copies(page, 'Add')).toHaveCount(1);
  await expect(diffs(page)).toContainText('101');
  await next(page);
  await expect(clock(page)).toHaveText('16.000 s');
  await counts(page, 2, 2);
  await expect(source(page)).not.toContainText('102');
  await expect(diffs(page)).toContainText('102');
  await next(page);
  await expect(clock(page)).toHaveText('17.000 s');
  await counts(page, 2, 1);
  await expect(source(page)).toContainText('103');
  await expect(result(page)).not.toContainText('103');
  await expect(diffs(page)).toContainText('103');
  for (const time of ['20.000 s', '25.000 s', '28.000 s']) {
    await next(page);
    await expect(clock(page)).toHaveText(time);
    await counts(page, 2, 1);
    await expect(result(page)).toContainText('101');
    await expect(diffs(page)).toContainText('No net changes');
  }
  await next(page);
  await expect(clock(page)).toHaveText('30.000 s');
  await counts(page, 2, 0);
  await expect(copies(page, 'Retract')).toHaveCount(1);
  await expect(diffs(page)).toContainText('101');
});

for (const lecture of lectures) {
  test(`Lecture ${lecture.number} reveals predictions, restores them with Back, and completes its guided run`, async ({ page, isMobile }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(isMobile ? { width: 390, height: 664 } : { width: 1280, height: 720 });
    await page.goto(path(lecture.number));
    await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
    const reference = page.getByRole('dialog', { name: 'SQL & Objectives' });
    await expect(reference).toContainText('mz_now()');
    await expect(reference).toContainText('WHERE');
    await expect(reference.getByRole('link').first()).toHaveAttribute('href', /^https:\/\/materialize\.com\//);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    let checkedBack = false;
    for (let step = 0; step < lecture.lessons; step++) {
      const dialog = page.locator('dialog[open]');
      const heading = dialog.getByRole('heading', { level: 2 });
      await expect(heading).toBeVisible();
      const reveal = dialog.getByRole('button', { name: 'Show effect', exact: true });
      if (await reveal.isVisible()) {
        const prediction = await stateSnapshot(page);
        if (!checkedBack && lecture.number >= 3) {
          await expect(page.locator('.temporal-workspace')).toHaveAttribute('data-selected-stage', 'source');
          const sourceTab = page.getByRole('button', { name: 'Source', exact: true });
          if (await sourceTab.isVisible()) await expect(sourceTab).toHaveAttribute('aria-pressed', 'true');
        }
        await reveal.click();
        if (!checkedBack) {
          if (lecture.number >= 3) {
            await expect(page.locator('.temporal-workspace')).toHaveAttribute('data-selected-stage', 'result');
            const resultTab = page.getByRole('button', { name: 'Result', exact: true });
            if (await resultTab.isVisible()) await expect(resultTab).toHaveAttribute('aria-pressed', 'true');
          }
          const revealed = await stateSnapshot(page);
          expect(revealed).not.toEqual(prediction);
          await dialog.getByRole('button', { name: 'Back', exact: true }).click();
          await expect(reveal).toBeVisible();
          expect(await stateSnapshot(page)).toEqual(prediction);
          await reveal.click();
          expect(await stateSnapshot(page)).toEqual(revealed);
          checkedBack = true;
        }
      }
      const card = (await dialog.locator('.relation-guide-card').boundingBox())!;
      const viewport = page.viewportSize()!;
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(viewport.width);
      expect(card.y + card.height).toBeLessThanOrEqual(viewport.height);
      if (step === 0) await page.screenshot({ path: test.info().outputPath(`chapter-five-lecture-${lecture.number}-${viewport.width}-guide.png`) });
      await advanceGuidedLesson(page, step === lecture.lessons - 1);
    }
    expect(checkedBack, 'The run includes a reversible prediction').toBe(true);
    await expect(page.locator('.maintenance-complete')).toHaveText('Tutorial completed');
    await counts(page, lecture.final[0], lecture.final[1]);
    await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await counts(page, lecture.initial[0], lecture.initial[1]);
    await expect(page.locator('.maintenance-complete')).toHaveCount(0);
  });

  test(`Lecture ${lecture.number} keeps every checkpoint and panel within the page in both themes`, async ({ page, isMobile }) => {
    test.setTimeout(120_000);
    const viewports = isMobile
      ? [{ width: 390, height: 664 }, { width: 610, height: 668 }]
      : [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1280, height: 650 }, { width: 1024, height: 650 }];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(path(lecture.number));
      const frame = ['h1', '.guided-lab-title > p', '.guided-lab-controls', '.temporal-workspace', '.relation-playback-controls'];
      const original = await Promise.all(frame.map((selector) => page.locator(selector).boundingBox()));
      if (viewport.width >= 1280) {
        const panels = page.locator('.temporal-workspace > .temporal-panel');
        for (const panel of await panels.all()) await expect(panel).toBeVisible();
        const boxes = await Promise.all((await panels.all()).map((panel) => panel.boundingBox()));
        expect(new Set(boxes.map((box) => box!.y)).size, 'All desktop metrics share one row').toBe(1);
        await expect(page.locator('.temporal-panel-tabs')).toBeHidden();
      }
      if (lecture.number === 1) {
        await selectPanel(page, 'Timeline');
        await expect(page.getByTestId('temporal-clocks')).toBeVisible();
        await expect(page.getByTestId('temporal-lifetime-chart')).toBeVisible();
        await expectPageToFit(page);
      }
      await page.screenshot({ path: test.info().outputPath(`chapter-five-lecture-${lecture.number}-${viewport.width}-normal.png`) });
      let timelineGeometry: Awaited<ReturnType<Locator['boundingBox']>>[] | undefined;
      for (let checkpoint = 0; checkpoint <= lecture.changes; checkpoint++) {
        const actual = await Promise.all(frame.map((selector) => page.locator(selector).boundingBox()));
        for (let index = 0; index < frame.length; index++) expect(actual[index], frame[index]).toEqual(original[index]);
        if (lecture.number === 4 && viewport.width === 1366 && checkpoint === 1) {
          await page.screenshot({ path: test.info().outputPath('chapter-five-lecture-4-1366-extended-deadline.png') });
        }
        await expect(source(page).locator('tbody tr')).toHaveCount(3);
        await expect(result(page).locator('tbody tr')).toHaveCount(3);
        for (const panel of ['Timeline', 'Source', 'Result'] as const) {
          await selectPanel(page, panel);
          if (lecture.number === 1 && panel === 'Timeline') {
            await expect(page.getByTestId('temporal-clocks')).toBeVisible();
            await expect(page.getByTestId('temporal-lifetime-chart')).toBeVisible();
          }
          if (panel === 'Timeline') {
            const geometry = await Promise.all(['.temporal-axis', '.temporal-lanes', '.temporal-legend'].map((selector) => page.locator(selector).boundingBox()));
            timelineGeometry ??= geometry;
            expect(geometry, 'Longer predicates preserve the timeline rows and spacing').toEqual(timelineGeometry);
          }
          await expectPageToFit(page);
        }
        if (checkpoint < lecture.changes) await next(page);
      }
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      for (const panel of ['Timeline', 'Source', 'Result'] as const) {
        await selectPanel(page, panel);
        await expectPageToFit(page);
      }
      await page.screenshot({ path: test.info().outputPath(`chapter-five-lecture-${lecture.number}-${viewport.width}-dark.png`) });
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
    }
    if (isMobile) {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(path(lecture.number));
      for (const panel of ['Timeline', 'Source', 'Result'] as const) {
        await selectPanel(page, panel);
        await expectPageToFit(page);
      }
      if (lecture.number === 1) {
        await selectPanel(page, 'Timeline');
        await expect(page.getByTestId('temporal-clocks')).toBeVisible();
        await expect(page.getByTestId('temporal-lifetime-chart')).toBeVisible();
        await expectPageToFit(page);
      }
    }
  });
}

test('Chapter 5 keeps the reference header and playback baseline', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The full desktop header is compared against the existing chapter.');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/labs/getting-data-in/tutorial/lecture-2');
    const selectors = ['h1', '.guided-lab-title > p', '.guided-lab-controls', '.relation-playback-controls'];
    const reference = await Promise.all(selectors.map((selector) => page.locator(selector).boundingBox()));
    let timelineGeometry: Awaited<ReturnType<Locator['boundingBox']>>[] | undefined;
    for (const lecture of lectures) {
      await page.goto(path(lecture.number));
      for (let index = 0; index < selectors.length; index++) {
        const actual = (await page.locator(selectors[index]!).boundingBox())!;
        expect(actual.y, `Lecture ${lecture.number}, ${viewport.width} × ${viewport.height}: ${selectors[index]} uses the existing top position`).toBeCloseTo(reference[index]!.y, 0);
        if (selectors[index] === '.relation-playback-controls') {
          expect(actual.y + actual.height).toBeCloseTo(reference[index]!.y + reference[index]!.height, 0);
        }
      }
      if (lecture.number > 1) {
        const geometry = await Promise.all(['.temporal-predicate', '.temporal-axis', '.temporal-lanes', '.temporal-legend'].map((selector) => page.locator(selector).boundingBox()));
        timelineGeometry ??= geometry;
        expect(geometry, 'Lectures 2–4 use the same internal timeline layout').toEqual(timelineGeometry);
      }
      if (viewport.width === 1366) {
        await page.screenshot({ path: test.info().outputPath(`chapter-five-lecture-${lecture.number}-1366-normal.png`) });
        if (lecture.number === 4) {
          await next(page);
          await page.screenshot({ path: test.info().outputPath('chapter-five-lecture-4-1366-extended-deadline.png') });
        }
      }
    }
  }
});

test('temporal playback pauses for help, replays, and resets independently of tutorial completion', async ({ page }) => {
  await page.goto(path(1));
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(PLAYBACK_INTERVAL_MS);
  await expect(clock(page)).toHaveText('19.999 s');
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  await page.clock.fastForward(PLAYBACK_INTERVAL_MS * 3);
  await expect(clock(page)).toHaveText('19.999 s');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (let checkpoint = 1; checkpoint < lectures[0].changes; checkpoint++) await page.clock.fastForward(PLAYBACK_INTERVAL_MS);
  await counts(page, 1, 0);
  await expect(page.locator('.maintenance-complete')).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await counts(page, 1, 1);
  await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
  await counts(page, 1, 0);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await counts(page, 1, 1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(clock(page)).toHaveText('12.000 s');
  await counts(page, 1, 1);
});
