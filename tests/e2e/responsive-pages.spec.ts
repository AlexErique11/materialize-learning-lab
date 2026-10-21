import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chapters } from '../../src/chapters/chapterRegistry';
import { chapterContentPath, getChapterPages } from '../../src/chapters/chapterOutline';

test.use({ reducedMotion: 'reduce' });
const activities = chapters.flatMap(chapter => getChapterPages(chapter).map(activity => chapterContentPath(chapter, activity)));

async function expectReadableHeader(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  if (page.viewportSize()!.width >= 640) {
    await expect.poll(() => page.locator('#main-content .guided-lab-controls').first().evaluate(element => {
      const centers = Array.from(element.querySelectorAll('button')).map(button => {
        const box = button.getBoundingClientRect();
        return box.top + box.height / 2;
      });
      return Math.max(...centers) - Math.min(...centers);
    }), { message: 'Action buttons must stay together instead of stranding the primary action' }).toBeLessThan(1);
  }
  const geometry = await page.locator('#main-content .guided-lab-page').first().evaluate(element => {
    const title = element.querySelector('h1')!;
    const box = title.getBoundingClientRect();
    const textRange = document.createRange();
    textRange.selectNodeContents(title);
    const text = textRange.getBoundingClientRect();
    const help = element.querySelector('.guided-lab-help')!.getBoundingClientRect();
    const controls = Array.from(element.querySelectorAll<HTMLElement>('.guided-lab-controls button')).map(button => button.getBoundingClientRect());
    return {
      title: { x: box.x, y: box.y, right: box.right, bottom: box.bottom, height: box.height },
      lineHeight: parseFloat(getComputedStyle(title).lineHeight),
      controls: controls.map(r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom })),
      compact: element.hasAttribute('data-compact-header'),
      titleTextRight: text.right,
      help: { left: help.left, top: help.top, right: help.right, bottom: help.bottom },
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry.title.height).toBeLessThanOrEqual(geometry.lineHeight + 2);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
  if (geometry.width >= 640) {
    const centers = geometry.controls.map(button => (button.y + button.bottom) / 2);
    expect(Math.max(...centers) - Math.min(...centers), 'Action buttons must stay together instead of stranding the primary action').toBeLessThan(1);
  }
  if (geometry.compact) {
    expect((geometry.help.top + geometry.help.bottom) / 2).toBeCloseTo((geometry.title.y + geometry.title.bottom) / 2, 0);
    expect(geometry.help.left).toBeGreaterThanOrEqual(geometry.titleTextRight + 8);
    expect(geometry.help.right).toBeLessThanOrEqual(geometry.width);
  }
  for (const button of geometry.controls) {
    expect(button.x).toBeGreaterThanOrEqual(0);
    expect(button.right).toBeLessThanOrEqual(geometry.width + 1);
    const title = geometry.title;
    expect(title.x < button.right && title.right > button.x && title.y < button.bottom && title.bottom > button.y).toBe(false);
  }
}

for (const viewport of [{ width: 320, height: 740 }, { width: 375, height: 740 }, { width: 760, height: 740 }, { width: 640, height: 700 }, { width: 933, height: 900 }, { width: 1280, height: 650 }]) {
  test(`all activity headers remain readable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.addInitScript(paths => localStorage.setItem('materialize-learning-lab-progress-v1', JSON.stringify({ version: 1, completed: paths })), activities);
    for (const path of activities) {
      await page.goto(path);
      await expect(page.locator('#main-content .guided-lab-title h1')).toBeVisible();
      await expectReadableHeader(page);
      if (viewport.width === 1280) {
        await expect(page.locator('#main-content .guided-lab-page')).not.toHaveAttribute('data-narrow-panels');
        await expect(page.locator('#main-content .guided-lab-page')).not.toHaveAttribute('data-responsive-flow');
      }
    }
  });
}

test('toolbar actions stay together through intermediate widths', async ({ page }) => {
  for (const width of [640, 660, 700, 740, 780]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/labs/changing-relations/exercises/exercise-1', '/labs/incremental-maintenance/tutorial/lecture-4']) {
      await page.goto(path);
      await expectReadableHeader(page);
    }
  }
});

test('scrolling compact chapter navigation never paints over the navbar', async ({ page }) => {
  for (const width of [390, 760, 933]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/labs/changing-relations');
    for (const theme of ['light', 'dark']) {
      await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
      for (const expanded of [false, true]) {
        await page.evaluate(() => scrollTo(0, 0));
        const menu = page.locator('.mobile-sidebar');
        if (await menu.evaluate(el => el.hasAttribute('open')) !== expanded) await menu.locator(':scope > summary').click();
        await page.evaluate(() => scrollTo(0, 36));
        const overlap = await page.evaluate(() => {
          const header = document.querySelector('.app-header')!;
          const headerBox = header.getBoundingClientRect();
          const summary = document.querySelector('.mobile-sidebar > summary')!.getBoundingClientRect();
          const top = Math.max(headerBox.top, summary.top);
          const bottom = Math.min(headerBox.bottom, summary.bottom);
          return { height: bottom - top, headerOnTop: header.contains(document.elementFromPoint(summary.left + 32, (top + bottom) / 2)) };
        });
        expect(overlap.height).toBeGreaterThan(0);
        expect(overlap.headerOnTop).toBe(true);
      }
    }
  }
});

test('compact landing cards and overviews switch before their copy becomes crowded', async ({ page }) => {
  for (const width of [800, 933, 1023, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const cards = await page.locator('.learning-path-card').all();
    const first = (await cards[0]!.boundingBox())!;
    const second = (await cards[1]!.boundingBox())!;
    expect(second.x).toBe(first.x);
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    for (const heading of await page.locator('.learning-path-challenges h3').all()) {
      const box = (await heading.boundingBox())!;
      expect(box.width).toBeGreaterThan(300);
    }
    for (const chapter of ['changing-relations', 'incremental-maintenance', 'getting-data-in', 'time-in-materialize']) {
      await page.goto(`/labs/${chapter}`);
      const compact = await page.locator('.chapter-overview').evaluate(el => {
        const style = getComputedStyle(el);
        return el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) < 900;
      });
      if (!compact) {
        await expect(page.locator('.chapter-overview-illustration')).toBeVisible();
        continue;
      }
      await expect(page.locator('.chapter-overview-illustration')).not.toBeVisible();
      const widths = await page.locator('.chapter-overview-hero').evaluate(hero => ({ hero: hero.getBoundingClientRect().width, copy: hero.querySelector('div')!.getBoundingClientRect().width }));
      expect(widths.copy).toBe(widths.hero);
      const art = (await page.locator('.chapter-learn-more-art').boundingBox())!;
      const copy = (await page.locator('.chapter-learn-more-copy').boundingBox())!;
      expect(art.x + art.width).toBeLessThan(copy.x);
    }
  }
});

test('short exercise windows keep questions and answers reachable without covering diagrams', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 450 }, { width: 800, height: 500 }]) {
    await page.setViewportSize(viewport);
    for (const chapter of ['views-indexes-materialized-views', 'progress-and-freshness']) {
      await page.goto(`/labs/${chapter}/exercises/exercise-${chapter === 'progress-and-freshness' ? 3 : 2}`);
      await expect(page.locator('#main-content .guided-lab-page')).toHaveAttribute('data-responsive-flow');
      for (const action of ['ready', 'hint', 'wrong', 'accepted']) {
        if (action === 'hint') await page.locator('[data-walkthrough="hint"]').click();
        if (action === 'wrong') await page.locator('[data-walkthrough="check"]').click();
        if (action === 'accepted') await page.locator('[data-walkthrough="answer"]').click();
        const question = page.locator('#main-content .exercise-question');
        const answers = page.locator('#main-content .exercise-answers');
        await expect(question).toBeVisible();
        await expect.poll(async () => {
          await answers.scrollIntoViewIfNeeded();
          const bounds = (await answers.boundingBox())!;
          return bounds.y >= 54 && bounds.y + bounds.height <= viewport.height + 1;
        }, { message: 'Scrolling must reveal every answer control' }).toBe(true);
        const answerBox = (await answers.boundingBox())!;
        expect(answerBox.y).toBeGreaterThanOrEqual(54);
        expect(answerBox.y + answerBox.height).toBeLessThanOrEqual(viewport.height + 1);
        const diagram = await page.locator('#main-content .progress-lane-panel, #main-content .flow-canvas').boundingBox();
        expect(diagram!.y + diagram!.height).toBeLessThanOrEqual(answerBox.y);
      }
    }
  }
});

test('tablet tables use complete selected panels and lifetime labels remain distinct', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 740 });
  for (const chapter of ['incremental-maintenance', 'time-in-materialize']) {
    await page.goto(`/labs/${chapter}/exercises/exercise-${chapter === 'time-in-materialize' ? 2 : 1}`);
    const tabs = page.locator(chapter === 'time-in-materialize' ? '.temporal-panel-tabs' : '.maintenance-flow');
    for (const button of await tabs.getByRole('button').all()) {
      await button.click();
      const clipped = await page.locator('#main-content table :is(th, td)').evaluateAll(cells => cells.filter(cell => {
        const box = cell.getBoundingClientRect();
        return box.width && box.height && cell.scrollWidth > cell.clientWidth + 2;
      }).map(cell => cell.textContent));
      expect(clipped).toEqual([]);
    }
    if (chapter === 'time-in-materialize') {
      await tabs.getByRole('button', { name: 'Timeline', exact: true }).click();
      const labels = await page.locator('.temporal-axis > div > span').evaluateAll(elements => elements
        .filter(el => el.getBoundingClientRect().width > 0)
        .map(el => { const box = el.getBoundingClientRect(); return { left: box.left, right: box.right }; }));
      for (let index = 1; index < labels.length; index++) expect(labels[index]!.left).toBeGreaterThanOrEqual(labels[index - 1]!.right);
    }
  }
});

test('guided runs keep their explanations on screen with selected tablet panels', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 740 });
  for (const chapter of ['incremental-maintenance', 'time-in-materialize']) {
    await page.goto(`/labs/${chapter}/tutorial/lecture-2`);
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    for (let step = 0; step < 100 && await page.locator('.relation-guide[open]').count(); step++) {
      const card = (await page.locator('.relation-guide-card').boundingBox())!;
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(760);
      expect(card.y + card.height).toBeLessThanOrEqual(740);
      await page.keyboard.press('ArrowRight');
    }
    await expect(page.locator('.relation-guide[open]')).toHaveCount(0);
    await expect(page.locator('#main-content .activity-title-check')).toBeVisible();
  }
});

test('compact navigation overlays the activity and the smallest navbar retains its actions', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 740 });
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  const heading = page.locator('#main-content .guided-lab-heading');
  const before = await heading.boundingBox();
  await page.locator('#main-content .mobile-sidebar > summary').click();
  expect(await heading.boundingBox()).toEqual(before);
  const menu = page.locator('#main-content .mobile-sidebar .sidebar-content');
  const menuBounds = (await menu.boundingBox())!;
  expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(740);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const actions = page.locator('.app-header .header-actions');
  const actionBounds = (await actions.boundingBox())!;
  expect(actionBounds.x + actionBounds.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
});

test('resizing and sidebar changes restore the regular exercise frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const chapter of ['views-indexes-materialized-views', 'progress-and-freshness']) {
    await page.goto(`/labs/${chapter}/exercises/exercise-1`);
    const diagram = page.locator('#main-content .progress-lane-panel, #main-content .flow-canvas');
    const original = await diagram.boundingBox();
    await page.setViewportSize({ width: 760, height: 740 });
    await expectReadableHeader(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => diagram.boundingBox()).toEqual(original);
    await page.getByRole('button', { name: 'Collapse chapter navigation', exact: true }).click();
    await page.getByRole('button', { name: 'Expand chapter navigation', exact: true }).click();
    await expect.poll(() => diagram.boundingBox()).toEqual(original);
  }
});
