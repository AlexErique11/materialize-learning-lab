import { expect, test } from './fixtures';
import { advanceGuidedLesson, expectGuideClearOfTargets } from './guided-run';
import { readExercises } from '../../src/chapters/consistent-reads/exercise-scenarios';

test('Chapter 7 pauses playback while the diagram key is open', async ({ page }) => {
  await page.goto('/labs/consistent-reads/tutorial/lecture-1');
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(2200);
  const progress = page.locator('#main-content .guided-lab-progress');
  const before = (await progress.textContent())!;
  await page.getByRole('button', { name: 'Diagram key', exact: true }).click();
  await page.clock.fastForward(6600);
  await expect(progress).toHaveText(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(2200);
  await expect(progress).not.toHaveText(before);
});

test('Chapter 7 related effects preserve the prediction and lesson checkpoint', async ({ page }) => {
  await page.goto('/labs/consistent-reads/tutorial/lecture-1');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  for (let step = 0; step < 3; step++) await advanceGuidedLesson(page);
  const guide = page.locator('.relation-guide[open]');
  await expect(guide.getByRole('heading')).toHaveText('Read the same moment');
  await expect(guide).toHaveAttribute('data-focus-count', '1');
  await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
  await expect(guide).toHaveAttribute('data-focus-count', '3');
  const state = await page.getByTestId('read-workspace').innerText();
  const checkpoint = await guide.locator('.relation-guide-step').innerText();
  const effects = guide.getByRole('navigation', { name: 'Inspect related changes' }).getByRole('button');
  for (let index = 0; index < 3; index++) {
    await effects.nth(index).click();
    await expect(effects.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(guide.locator('.relation-guide-step')).toHaveText(checkpoint);
    expect(await page.getByTestId('read-workspace').innerText()).toBe(state);
    await expectGuideClearOfTargets(page);
  }
  await advanceGuidedLesson(page);
  await expect(guide.getByRole('heading')).toHaveText('History is no longer retained');
});

test('Chapter 3 single-answer controls replace the previous selection', async ({ page }) => {
  await page.goto('/labs/views-indexes-materialized-views/exercises/exercise-1');
  const picker = page.getByRole('button', { name: 'Select answers', exact: true });
  if (await picker.isVisible()) await picker.click();
  const choices = page.locator('.object-answer-choices:visible');
  await choices.getByRole('radio', { name: 'Regular view', exact: true }).check();
  await choices.getByRole('radio', { name: 'Index', exact: true }).check();
  await expect(choices.getByRole('radio', { checked: true })).toHaveCount(1);
  await expect(choices.getByRole('radio', { name: 'Regular view', exact: true })).not.toBeChecked();
  await choices.getByRole('radio', { name: 'Regular view', exact: true }).check();
  const dialog = page.getByRole('dialog', { name: 'Select answers', exact: true });
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
});

test('Chapter 7 fields and choice dialogs describe their own errors', async ({ page }) => {
  test.setTimeout(60_000);
  for (const [exerciseIndex, exercise] of readExercises.entries()) {
    await page.goto(`/labs/consistent-reads/exercises/exercise-${exerciseIndex + 1}`);
    for (const [questionIndex, question] of exercise.questions.entries()) {
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      const errors = page.locator('.read-answer-group[data-error="true"]');
      await expect(errors).toHaveCount(question.groups.length);
      for (const group of await errors.all()) {
        const control = group.locator('input, select, button').first();
        await expect(control).toHaveAttribute('aria-invalid', 'true');
        await expect(control).toHaveAccessibleDescription(/\S/);
        if (await control.getAttribute('aria-haspopup') === 'dialog') {
          await control.click();
          const choices = page.locator('dialog[open] input');
          for (const choice of await choices.all()) {
            await expect(choice).toHaveAttribute('aria-invalid', 'true');
            await expect(choice).toHaveAccessibleDescription(/\S/);
          }
          await page.getByRole('button', { name: 'Done', exact: true }).click();
        }
      }
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      await expect(page.locator('.read-answer-group[aria-invalid="true"]')).toHaveCount(0);
      if (questionIndex < exercise.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
    }
  }
});

test('help describes the actual navigation actions', async ({ page }) => {
  await page.goto('/labs/changing-relations/tutorial/lecture-2');
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  for (let step = 0; step < 3; step++) await page.locator('dialog[open]').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('dialog[open]').getByRole('heading')).toHaveText('Next change');
  await page.keyboard.press('Escape');
  await page.goto('/labs/consistent-reads/exercises/exercise-1');
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
  await expect(shortcuts).toContainText('Go to the next chapter');
  await page.keyboard.press('Escape');
  await page.goto('/labs/live-applications-subscribe/exercises/exercise-1');
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  await expect(shortcuts).toContainText('Return to learning path');
  await expect(shortcuts).not.toContainText('Go to the next chapter');
});

test('completed exercises keep their final action on a short laptop screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The reported case is a short desktop viewport.');
  await page.setViewportSize({ width: 1280, height: 650 });
  for (const chapter of ['changing-relations', 'incremental-maintenance']) {
    await page.goto(`/labs/${chapter}/exercises/exercise-1`);
    for (let question = 0; question < 3; question++) {
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      await expect.poll(() => page.evaluate(() => {
        const question = document.querySelector('.exercise-question')!.getBoundingClientRect();
        const next = document.querySelector('[data-shortcut="exercise-forward"]')!.getBoundingClientRect();
        return document.documentElement.scrollHeight <= innerHeight && question.bottom <= innerHeight && next.bottom <= innerHeight;
      })).toBe(true);
      if (question < 2) await page.getByRole('button', { name: 'Next question', exact: true }).click();
    }
    await page.reload();
    await expect(page.locator('h1 .activity-title-check')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  }
});

test('compact lecture playback remains clickable after changing panels', async ({ page }) => {
  for (const chapter of ['getting-data-in', 'time-in-materialize']) {
    for (const viewport of [{ width: 340, height: 667 }, { width: 375, height: 667 }, { width: 390, height: 664 }, { width: 610, height: 668 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/labs/${chapter}/tutorial/lecture-1`);
      const panels = page.locator('.temporal-panel-tabs, .ingestion-panel-tabs').getByRole('button');
      for (const panel of await panels.all()) await panel.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        'Help controls must not widen the mobile viewport').toBe(true);
      const subtitle = page.locator('.guided-lab-title > p');
      if (await subtitle.isVisible()) {
        const description = (await subtitle.boundingBox())!;
        const controls = (await page.locator('.guided-lab-controls').boundingBox())!;
        expect(description.y, 'The description stays below the compact toolbar').toBeGreaterThanOrEqual(controls.y + controls.height);
      }
      const progress = page.locator('#main-content .guided-lab-progress');
      const before = await progress.textContent();
      await page.getByRole('button', { name: 'Next change', exact: true }).click({ timeout: 5000 });
      await expect(progress).not.toHaveText(before!);
    }
  }
});
