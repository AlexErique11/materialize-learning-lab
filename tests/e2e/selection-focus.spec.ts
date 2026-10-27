import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ reducedMotion: 'reduce' });

const chapters = ['changing-relations', 'incremental-maintenance', 'views-indexes-materialized-views',
  'getting-data-in', 'time-in-materialize', 'progress-and-freshness', 'consistent-reads', 'live-applications-subscribe'];

async function expectNeutralFocus(page: Page) {
  expect(await page.evaluate(() => {
    const modal = Array.from(document.querySelectorAll('dialog:modal')).at(-1);
    return document.activeElement === (modal ?? document.getElementById('main-content'));
  })).toBe(true);
  const outlines = await page.locator('.app-shell :focus-visible:not(input, textarea, select)').evaluateAll(elements =>
    elements.filter(element => getComputedStyle(element).outlineStyle !== 'none').map(element => element.tagName));
  expect(outlines).toEqual([]);
}

for (const chapter of chapters) {
  test(`${chapter}: shortcuts ignore incidental button focus and keep the layout fixed`, async ({ page }) => {
    await page.clock.install();
    await page.goto(`/labs/${chapter}/tutorial/lecture-1`);
    const geometry = () => page.locator('h1, .guided-lab-controls, .relation-playback-controls').evaluateAll(elements => elements.map(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return [x, y + scrollY, width, height];
    }));
    const original = await geometry();
    await page.getByRole('button', { name: 'Next change', exact: true }).click();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expectNeutralFocus(page);
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
    await page.keyboard.press('s');
    await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toBeVisible();
    await expectNeutralFocus(page);
    await page.keyboard.press('Escape');
    await expectNeutralFocus(page);
    await page.keyboard.press('Enter');
    const guide = page.locator('.relation-guide[open]');
    await expect(guide).toBeVisible();
    await expectNeutralFocus(page);
    await page.keyboard.press('ArrowRight');
    await expectNeutralFocus(page);
    // A pointer click must not make unbound Enter/Space activate the guide button.
    await guide.locator('[data-guide-action="forward"]').click();
    const checkpoint = () => guide.evaluate(dialog => [dialog.querySelector('.relation-guide-step')!.textContent,
      dialog.querySelector('.relation-guide-phase')!.textContent, dialog.getAttribute('data-focus-index')]);
    const state = await checkpoint();
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      expect(await checkpoint()).toEqual(state);
      await expectNeutralFocus(page);
    }
    await page.keyboard.press('Escape');
    await expect(guide).toHaveCount(0);
    await expectNeutralFocus(page);
    const current = await geometry();
    current.forEach((box, index) => box.forEach((value, field) => expect(value).toBeCloseTo(original[index]![field]!, 1)));
  });
}

for (const theme of ['light', 'dark']) {
  test(`table and inspector arrow shortcuts leave no selection outline in ${theme} theme`, async ({ page }) => {
    for (const chapter of ['changing-relations', 'progress-and-freshness']) {
      await page.goto(`/labs/${chapter}/tutorial/lecture-1`);
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
      await page.getByRole('button', { name: 'Next change', exact: true }).click();
      const relationTab = page.getByRole('navigation', { name: 'Workspace panels', exact: true }).getByRole('button', { name: 'Current relation', exact: true });
      if (chapter === 'changing-relations' && await relationTab.isVisible()) await relationTab.click();
      const panel = chapter === 'changing-relations' ? page.getByRole('region', { name: 'Current relation', exact: true }) : page.getByTestId('progress-detail');
      await panel.locator(chapter === 'changing-relations' ? 'td' : 'strong').first().click();
      await expect(panel).toBeFocused();
      const progress = page.locator('.guided-lab-progress strong');
      const previous = await progress.textContent();
      await page.keyboard.press('ArrowRight');
      await expect(progress).not.toHaveText(previous!);
      await expectNeutralFocus(page);
      expect(await panel.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('none');
    }
  });
}

test('exercise Enter checks after a pointer Hint click and advances after Show Answer', async ({ page }) => {
  await page.goto('/labs/changing-relations/exercises/exercise-1');
  const question = page.locator('.exercise-question');
  const hint = page.getByRole('button', { name: 'Hint', exact: true });
  await hint.click();
  await expect(hint).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('data-result', 'incorrect');
  await expectNeutralFocus(page);
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(question).toHaveAttribute('data-result', 'correct');
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('data-result', 'ready');
  await expect(question.locator('h2')).toContainText('Question 2');
  await expectNeutralFocus(page);
});

test('deliberate Tab navigation retains focus outlines, native button actions and dialog return focus', async ({ page }) => {
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  const next = page.getByRole('button', { name: 'Next change', exact: true });
  await next.click();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(next).toBeFocused();
  expect(await next.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Space');
  await expect(page.locator('.guided-lab-progress strong')).toHaveText('2 / 4');
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  const sql = page.getByRole('dialog', { name: 'SQL & Objectives', exact: true });
  await page.keyboard.press('Enter');
  await expect(sql).toBeVisible();
  await expectNeutralFocus(page);
  await page.keyboard.press('Tab');
  await expect(sql.getByRole('button', { name: 'Close SQL & Objectives', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(sql).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toBeFocused();
});

test('pointer focus in the sidebar does not block page shortcuts', async ({ page, isMobile }) => {
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  if (isMobile) await page.getByText('Chapter navigation', { exact: true }).click();
  await page.getByRole('button', { name: 'Expand Time in Materialize chapter', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.guided-lab-progress strong')).toHaveText('1 / 4');
  await expectNeutralFocus(page);
});
