import { expect, seedChapterPrerequisites, test } from './fixtures';

test.use({ reducedMotion: 'reduce' });

const chapters = [
  ['changing-relations', 2], ['incremental-maintenance', 4], ['views-indexes-materialized-views', 3],
  ['getting-data-in', 4], ['time-in-materialize', 4], ['progress-and-freshness', 3],
] as const;

for (const [chapter, total] of chapters) {
  test(`${chapter}: lecture arrows, Space, R and Enter use the existing controls`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install();
    for (let lecture = 1; lecture <= total; lecture++) {
      await page.goto(`/labs/${chapter}/tutorial/lecture-${lecture}`);
      const progress = page.locator('.guided-lab-progress strong');
      const initial = await progress.textContent();
      const focusPage = () => page.locator('#main-content').focus();
      await focusPage();
      await page.keyboard.press('ArrowLeft');
      await expect(progress).toHaveText(initial!);
      await page.keyboard.press('ArrowRight');
      await expect(progress).not.toHaveText(initial!);
      await page.keyboard.press('ArrowLeft');
      await expect(progress).toHaveText(initial!);
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
      await focusPage();
      await page.keyboard.press('ArrowRight');
      await expect(progress).not.toHaveText(initial!);
      const stepped = await progress.textContent();
      await page.keyboard.press('s');
      await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toBeVisible();
      await page.keyboard.press('r');
      await page.keyboard.press('ArrowRight');
      await expect(progress).toHaveText(stepped!);
      await page.keyboard.press('s');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.keyboard.press('s');
      await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.keyboard.press('r');
      await expect(progress).toHaveText(initial!);
      await page.keyboard.press('Enter');
      await expect(page.locator('.relation-guide[open]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.relation-guide[open]')).toHaveCount(0);
      // A focused button keeps native Space activation; it must toggle only once.
      await page.getByRole('button', { name: 'Run', exact: true }).focus();
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
    }
  });

  test(`${chapter}: Enter checks once, Ctrl+Enter reveals and forward keys require acceptance`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { submissions: number }).submissions = 0;
      document.addEventListener('submit', () => { (window as unknown as { submissions: number }).submissions++; }, true);
    });
    await page.goto(`/labs/${chapter}/exercises/exercise-1`);
    const question = page.locator('.exercise-question');
    const progress = page.locator('.guided-lab-progress strong');
    const initial = await progress.textContent();
    await page.locator('#main-content').focus();
    const hint = page.getByRole('button', { name: 'Hint', exact: true });
    await page.keyboard.press('h');
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('h');
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('s');
    await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toBeVisible();
    await page.keyboard.press('h');
    await page.keyboard.press('Control+Enter');
    await page.keyboard.press('s');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(question).toHaveAttribute('data-result', 'ready');
    await page.keyboard.press('ArrowRight');
    await expect(progress).toHaveText(initial!);
    await page.getByRole('button', { name: 'Check Answer', exact: true }).focus();
    await page.keyboard.press('Control+Enter');
    await expect(question).toHaveAttribute('data-result', 'correct');
    expect(await page.evaluate(() => (window as unknown as { submissions: number }).submissions)).toBe(0);
    await page.locator('#main-content').focus();
    await page.keyboard.press('r');
    await expect(question).toHaveAttribute('data-result', 'ready');
    await expect(progress).toHaveText(initial!);
    await page.keyboard.press('Enter');
    await expect(question).toHaveAttribute('data-result', 'incorrect');
    expect(await page.evaluate(() => (window as unknown as { submissions: number }).submissions)).toBe(1);
    await page.keyboard.press('ArrowRight');
    await expect(progress).toHaveText(initial!);
    // Enter on another focused button keeps that button's own action.
    await page.getByRole('button', { name: 'Show Answer', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(question).toHaveAttribute('data-result', 'correct');
    expect(await page.evaluate(() => (window as unknown as { submissions: number }).submissions)).toBe(1);
    await page.locator('#main-content').focus();
    await page.keyboard.press('ArrowRight');
    await expect(question).toHaveAttribute('data-result', 'ready');
    await expect(question.locator('h2')).toContainText(/(?:Question|Phase|Checkpoint) 2/);
    await page.keyboard.press('Control+Enter');
    await expect(question).toHaveAttribute('data-result', 'correct');
    await page.keyboard.press('Enter');
    await expect(question).toHaveAttribute('data-result', 'ready');
    await expect(question.locator('h2')).toContainText(/(?:Question|Phase|Checkpoint) 3/);
  });
}

test('guide arrows preserve predictions, related inspections and the simulation timestamp', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/labs/getting-data-in/tutorial/lecture-1');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  const guide = page.locator('.relation-guide[open]');
  await page.keyboard.press('ArrowLeft');
  await expect(guide.locator('.relation-guide-step')).toHaveText('1 of 11');
  for (let index = 0; index < 50; index++) {
    if (await guide.getByRole('heading', { name: 'Catch up the deletion', exact: true }).count()
      && await guide.locator('.relation-guide-phase').textContent() === 'Explanation') break;
    await page.keyboard.press('ArrowRight');
  }
  await expect(guide.getByRole('heading')).toHaveText('Catch up the deletion');
  await expect(guide).toHaveAttribute('data-focus-index', '0');
  await expect(page.getByTestId('snapshot-checkpoint')).toHaveText('t = 7');
  await page.keyboard.press('ArrowRight');
  await expect(guide).toHaveAttribute('data-focus-index', '1');
  await expect(page.getByTestId('snapshot-checkpoint')).toHaveText('t = 7');
  await page.keyboard.press('ArrowLeft');
  await expect(guide).toHaveAttribute('data-focus-index', '0');
  await expect(guide.locator('.relation-guide-phase')).toHaveText('Explanation');
  await page.keyboard.press('ArrowLeft');
  await expect(guide.locator('.relation-guide-phase')).toHaveText('Predict the effect');
  await expect(page.getByTestId('snapshot-checkpoint')).toHaveText('t = 6');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('snapshot-checkpoint')).toHaveText('t = 7');
  await page.keyboard.press('Escape');
  await expect(guide).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('snapshot-checkpoint')).toHaveText('t = 6');
});

test('held keys do not skip guided phases and arrows can finish the tutorial', async ({ page }) => {
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  const guide = page.locator('.relation-guide[open]');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await expect(guide.locator('.relation-guide-step')).toHaveText('2 of 6');
  await expect(guide.locator('.relation-guide-phase')).toHaveText('Predict the effect');
  for (let step = 0; step < 20 && await guide.count(); step++) await page.keyboard.press('ArrowRight');
  await expect(guide).not.toBeVisible();
  await expect(page.getByText('Tutorial completed', { exact: true })).toBeVisible();
});

test('answer inputs keep editing keys and Enter submits one correct prediction', async ({ page }) => {
  await page.goto('/labs/changing-relations/exercises/exercise-1');
  const fields = page.getByRole('textbox');
  await fields.first().focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
  await page.locator('#main-content').focus();
  await page.keyboard.press('r');
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
  await fields.first().fill('30');
  await fields.first().press('Home');
  await page.keyboard.press('ArrowRight');
  expect(await fields.first().evaluate(input => (input as HTMLInputElement).selectionStart)).toBe(1);
  await page.keyboard.press('r');
  await expect(fields.first()).toHaveValue('3r0');
  await page.keyboard.type('sh');
  await expect(fields.first()).toHaveValue('3rsh0');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hint', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await fields.first().fill('3');
  await fields.nth(1).fill('1');
  await fields.nth(2).fill('3');
  await fields.last().dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
  await fields.last().press('Enter');
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
  await page.locator('#main-content').focus();
  await page.keyboard.press('ArrowRight');
  for (let question = 1; question < 3; question++) {
    await page.keyboard.press('Control+Enter');
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
    await page.locator('#main-content').focus();
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByRole('dialog', { name: 'Exercise completed', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#main-content').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Exercise completed', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/labs/changing-relations/exercises/exercise-1');
});

test('Enter follows the final forward action into the next exercise', async ({ page }) => {
  await page.goto('/labs/getting-data-in/exercises/exercise-1');
  await page.locator('#main-content').focus();
  for (let question = 0; question < 10; question++) {
    await page.keyboard.press('Control+Enter');
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
    const lastQuestion = await page.getByRole('button', { name: 'Exercise 2', exact: true }).count() > 0;
    await page.keyboard.press('Enter');
    if (lastQuestion) break;
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
  }
  await expect(page).toHaveURL('/labs/getting-data-in/exercises/exercise-2');
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
});

const chapterCompletions = [
  ['changing-relations', 1, 'incremental-maintenance'],
  ['incremental-maintenance', 3, 'views-indexes-materialized-views'],
  ['views-indexes-materialized-views', 2, 'getting-data-in'],
  ['getting-data-in', 3, 'time-in-materialize'],
  ['time-in-materialize', 3, 'progress-and-freshness'],
  ['progress-and-freshness', 3, 'consistent-reads'],
] as const;

for (const [index, [chapter, exercise, nextChapter]] of chapterCompletions.entries()) {
  test(`${chapter}: chapter completion supports Enter and Escape`, async ({ page }) => {
    await seedChapterPrerequisites(page, `/labs/${chapter}/exercises/exercise-${exercise}`);
    await page.goto(`/labs/${chapter}/exercises/exercise-${exercise}`);
    await page.locator('#main-content').focus();
    const finish = page.getByRole('button', { name: 'Finish chapter', exact: true });
    for (let question = 0; question < 10; question++) {
      await page.keyboard.press('Control+Enter');
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
      const lastQuestion = await finish.count() > 0;
      if (lastQuestion) break;
      await page.keyboard.press('Enter');
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
    }
    const completion = page.getByRole('dialog', { name: `You finished Chapter ${index + 1}`, exact: true });
    await expect(completion).toBeVisible();
    await expect(completion.getByRole('button', { name: 'Go to next chapter', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(completion).not.toBeVisible();
    await expect(finish).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(completion).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/labs/${nextChapter}`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('selects, modifiers, dialogs and focused help retain their native keys', async ({ page }) => {
  await page.goto('/labs/views-indexes-materialized-views/tutorial/lecture-2');
  const progress = page.locator('.guided-lab-progress strong');
  const initial = await progress.textContent();
  const select = page.getByRole('combobox', { name: 'Query object', exact: true });
  await select.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await expect(progress).toHaveText(initial!);
  await page.locator('#main-content').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Control+ArrowRight');
  await expect(progress).toHaveText(initial!);
  for (const key of ['h', 'g', '?']) await page.keyboard.press(key);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  for (const key of ['ArrowRight', 'ArrowLeft', 'Space']) await page.keyboard.press(key);
  await expect(progress).toHaveText(initial!);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  const help = page.getByRole('button', { name: 'About Total row copies', exact: true });
  await help.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).not.toBeVisible();
});
