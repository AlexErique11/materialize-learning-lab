import { expect, test } from './fixtures';

test('all Chapter 2 exercises support retries, hints, reveal, advancement and reset', async ({ page, isMobile }) => {
 test.setTimeout(60_000);
 for (const [exercise, total] of [[1, 3], [3, 3]]) {
  await page.goto(`/labs/incremental-maintenance/exercises/exercise-${exercise}`);
  await expect(page.locator('.exercise-time')).toContainText('t = 0');
  await expect(page.locator('.maintenance-panels [data-affected="true"]')).toHaveCount(0);
  await expect(page.locator('.comparison-arrows [data-active="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
  await expect(page.locator('.exercise-time')).toContainText('t = 0');
  await expect(page.getByRole('button', { name: 'Next question', exact: true })).toHaveCount(0);
  await expect(page.locator('.guided-lab-progress strong')).toHaveText('0 / 3');
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  for (let stage = 0; stage < total!; stage++) {
   await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
   await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
   if (isMobile && exercise === 1) {
    await page.getByRole('button', { name: 'View tables', exact: true }).click();
    await page.locator('.maintenance-flow > div > .button').last().click();
    await expect(page.locator('.maintenance-panels > section').last()).toBeVisible();
    await page.getByRole('button', { name: 'Question', exact: true }).click();
   }
   if (stage < total! - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Next question', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.exercise-time')).toContainText('t = 0');
  await expect(page.locator('.maintenance-panels [data-affected="true"]')).toHaveCount(0);
 }
});

test('exercise references, keyboard controls, themes and viewports fit', async ({ page, isMobile }) => {
 test.setTimeout(60_000);
 for (const size of isMobile ? [{ width: 390, height: 844 }] : [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }]) {
  await page.setViewportSize(size);
  for (const theme of ['light', 'dark']) for (const exercise of [1, 3]) {
   await page.goto(`/labs/incremental-maintenance/exercises/exercise-${exercise}`);
   await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
   await page.getByRole('button', { name: 'Hint', exact: true }).focus();
   await page.keyboard.press('Enter');
   await expect(page.getByRole('button', { name: 'Hint', exact: true })).toHaveAttribute('aria-expanded', 'true');
   await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
   const bounds = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
   expect(bounds.width).toBeLessThanOrEqual(size.width);
   expect(bounds.height).toBeLessThanOrEqual(size.height);
  }
 }
});
import { maintenanceExercises, solutionFor } from '../../src/chapters/incremental-maintenance/exercise-scenarios';

test('first exercise keeps the checked spacing before answering', async ({ page, isMobile }) => {
 test.setTimeout(60_000);
 for (const size of isMobile ? [{ width: 390, height: 750 }] : [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }]) {
  await page.setViewportSize(size);
  for (const theme of ['light', 'dark']) {
   await page.goto('/labs/incremental-maintenance/exercises/exercise-1');
   await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
   const layout = () => page.locator('.exercise-time, .maintenance-stage-workspace, .exercise-question, .exercise-question-navigation').evaluateAll(elements => elements.map(element => {
    const { top, height } = element.getBoundingClientRect();
    return { top, height };
   }));
   for (let question = 0; question < 3; question++) {
    const before = await layout();
    await expect(page.getByRole('button', { name: 'Next question', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
    expect(await layout()).toEqual(before);
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    expect(await layout()).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (question < 2) await page.getByRole('button', { name: 'Next question', exact: true }).click();
   }
  }
 }
});

test('learners independently predict every combined exercise checkpoint', async ({ page, isMobile }) => {
 test.setTimeout(90_000);
 await page.setViewportSize(isMobile ? { width: 390, height: 750 } : { width: 1366, height: 768 });
 for (const [exerciseIndex, exercise] of maintenanceExercises.entries()) {
  await page.goto(`/labs/incremental-maintenance/exercises/${exercise.slug}`);
  for (const [stage, checkpoint] of exercise.checkpoints.entries()) {
   const solution = solutionFor(exercise, stage);
   for (const [i, _choice] of (checkpoint.choices ?? []).entries()) for (const option of solution.selections[i]!) await page.locator('.exercise-choice').nth(i).getByRole('checkbox', { name: option, exact: true }).check();
   const fit = await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth);
   expect(fit, `Exercise ${exerciseIndex + 1}, checkpoint ${stage + 1}: answer form fits`).toBe(true);

   await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
   await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
   if (stage < exercise.checkpoints.length - 1) {
    await page.getByRole('button', { name: 'Next question', exact: true }).click();
    await expect(page.locator('.maintenance-panels [data-affected="true"]')).toHaveCount(0);
   }
  }
 }
});

test('combined revenue exercise keeps reference panels and question visible', async ({ page, isMobile }) => {
 for (const size of isMobile ? [{ width: 390, height: 750 }] : [{ width: 1536, height: 639 }, { width: 1280, height: 650 }, { width: 1366, height: 768 }, { width: 1440, height: 1000 }]) {
  await page.setViewportSize(size);
  await page.goto('/labs/incremental-maintenance/exercises/exercise-4');
  await expect(page).toHaveURL(/exercise-3$/);
  await expect(page.getByRole('button', { name: 'Add signed row', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /contributions/i })).toHaveCount(0);
  await expect(page.locator('.exercise-question')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View tables', exact: true })).toHaveCount(0);
  const next = page.getByRole('button', { name: 'Next question', exact: true });
  for (let index = 0; index < 3; index++) {
   const groups = page.locator('.maintenance-panels [data-affected="true"]');
   await expect(groups).toHaveCount(0);
   if (!isMobile) {
    for (const stage of ['orders', 'recompute', 'incremental']) await expect(page.locator(`.maintenance-panels [data-stage="${stage}"]`)).toBeVisible();
    const boxes = await page.locator('.maintenance-panels > section').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
    expect(boxes[0]!.bottom).toBeLessThanOrEqual(boxes[1]!.top);
    expect(boxes[1]!.top).toEqual(boxes[2]!.top);
   } else {
    await page.locator('.maintenance-flow .button').last().click();
    await expect(page.locator('.maintenance-panels [data-stage="incremental"]')).toBeVisible();
    await expect(page.locator('.exercise-question')).toBeVisible();
   }
   await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
   await expect(page.locator('.exercise-choice label[data-answer="correct"]')).not.toHaveCount(0);
   expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), `Checkpoint ${index + 1} fits at ${size.width} x ${size.height}`).toBe(true);
   expect(await page.locator('.maintenance-panels .table-scroll').evaluateAll(elements => elements.filter(e => e.getClientRects().length).every(e => e.querySelector('table')!.getBoundingClientRect().height <= e.clientHeight + 1)), 'Every displayed result row fits').toBe(true);
   await expect(page.locator('[data-stage="recompute"] tr[data-affected="true"]')).toHaveCount([3, 2, 1][index]!);
   await expect(page.locator('[data-stage="incremental"] tr[data-affected="true"]')).toHaveCount([1, 1, 0][index]!);
   if (index < 2) await next.click();
  }
 }
});

test('combined JOIN and WHERE keeps tables, question and highlighted tick boxes', async ({ page, isMobile }) => {
 test.setTimeout(60_000);
 await page.setViewportSize(isMobile ? { width: 390, height: 750 } : { width: 1280, height: 650 });
 await page.goto('/labs/incremental-maintenance/exercises/exercise-2');
 await expect(page).toHaveURL(/exercise-1$/);
 const exercise = maintenanceExercises[0]!;
 for (const [index, checkpoint] of exercise.checkpoints.entries()) {
  const question = page.locator('.exercise-question-copy > p').first();
  await expect(question).toHaveText(checkpoint.question);
  const boxes = page.locator('.exercise-choice input');
  const count = await boxes.count();
  if (!isMobile) {
   await expect(page.locator('.maintenance-panels')).toBeVisible();
   expect(await page.locator('.maintenance-panels .table-scroll').evaluateAll(elements => elements.every(element => element.querySelector('table')!.getBoundingClientRect().height <= element.clientHeight + 1)), 'All input and result rows fit').toBe(true);
  }
  if (index === 0) {
   await boxes.nth(1).check();
  }
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
  await expect(question).toContainText('Recheck');
  await expect(boxes).toHaveCount(count);
  if (index === 0) {
   await expect(page.locator('.exercise-choice [data-answer="incorrect"]')).toHaveCount(1);
   await boxes.nth(1).uncheck();
   await expect(page.locator('.exercise-choice [data-answer]')).toHaveCount(0);
   await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  }
  await expect(page.locator('.exercise-choice [data-answer="correct"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(page.locator('.exercise-choice [data-answer="correct"]')).toHaveCount(checkpoint.choices!.reduce((sum, choice) => sum + choice.expected.length, 0));
  await expect(question).toHaveText(checkpoint.question);
  await expect(boxes).toHaveCount(count);
  await expect(boxes.first()).toBeDisabled();
  if (isMobile) await page.getByRole('button', { name: 'View tables', exact: true }).click();
  expect(await page.locator('.maintenance-panels .table-scroll').evaluateAll(elements => elements.every(element => element.querySelector('table')!.getBoundingClientRect().height <= element.clientHeight + 1)), 'Accepted rows fit their frames').toBe(true);
  if (isMobile) await page.getByRole('button', { name: 'Question', exact: true }).click();
  const fit = await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth);
  expect(fit, `Combined checkpoint ${index + 1} fits`).toBe(true);
  if (index < exercise.checkpoints.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
 }
});

test('Next requires a correct answer or reveal, supports retries and opens the next exercise', async ({ page, isMobile }) => {
 test.setTimeout(60_000);
 for (const exercise of maintenanceExercises) {
  await page.goto(`/labs/incremental-maintenance/exercises/${exercise.slug}`);
  const next = page.getByRole('button', { name: 'Next question', exact: true });
  await expect(page.getByRole('button', { name: 'Previous question', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Question', exact: true })).toHaveCount(0);
  await expect(next).toHaveCount(0);
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(next).toHaveCount(0);
  await page.locator('.exercise-choice').first().locator('input').last().check();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
  await expect(next).toHaveCount(0);
  await expect(page.locator('.guided-lab-progress strong')).toHaveText('0 / 3');
  await expect(page.locator('.exercise-time')).toContainText('t = 0');
  await expect(page.locator('.exercise-choice [data-answer="correct"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(next).toHaveCount(0);
  for (const [index, choice] of exercise.checkpoints[0]!.choices.entries()) {
   for (const option of choice.options) await page.locator('.exercise-choice').nth(index).getByRole('checkbox', { name: option, exact: true }).setChecked(choice.expected.includes(option));
  }
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.exercise-time')).toContainText('t = 1');
  await expect(page.locator('.guided-lab-progress strong')).toHaveText(`1 / ${exercise.checkpoints.length}`);
  await expect(page.locator('.guided-lab-progress span').first()).toHaveText('Questions');
  await expect(page.locator('.exercise-question h2')).toContainText('Question 2 of 3');
  await expect(next).toHaveCount(0);
  for (let index = 1; index < exercise.checkpoints.length - 1; index++) {
   await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
   await next.click();
   await expect(next).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  const exerciseIndex = maintenanceExercises.indexOf(exercise);
  const following = maintenanceExercises[exerciseIndex + 1];
  await expect(page.getByRole('button', { name: following ? `Exercise ${exerciseIndex + 2}` : 'Finish chapter', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  if (following) {
   await page.getByRole('button', { name: `Exercise ${exerciseIndex + 2}`, exact: true }).click();
   await expect(page).toHaveURL(`/labs/incremental-maintenance/exercises/${following.slug}`);
   await expect(page.locator('.exercise-time')).toContainText('t = 0');
   await page.goto(`/labs/incremental-maintenance/exercises/${exercise.slug}`);
  } else {
   await page.getByRole('button', { name: 'Finish chapter', exact: true }).click();
   await page.getByRole('dialog', { name: 'You finished Chapter 2', exact: true }).getByRole('button', { name: 'Go to next chapter', exact: true }).click();
   await expect(page).toHaveURL('/labs/views-indexes-materialized-views');
   await page.goto(`/labs/incremental-maintenance/exercises/${exercise.slug}`);
  }
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.exercise-time')).toContainText('t = 0');
 }
 for (const size of isMobile ? [{ width: 390, height: 750 }] : [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1536, height: 639 }]) {
  await page.setViewportSize(size);
  await page.goto('/labs/incremental-maintenance/exercises/exercise-1');
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  if (!isMobile) {
   const bottom = await page.locator('.exercise-question-navigation').evaluate(element => element.getBoundingClientRect().bottom);
   expect(size.height - bottom).toBeLessThanOrEqual(25);
   const gap = await page.locator('.maintenance-stage-workspace').evaluate(element => parseFloat(getComputedStyle(element).rowGap));
   expect(gap).toBeGreaterThanOrEqual(size.height >= 741 ? 14 : 4);
   expect(gap).toBeLessThanOrEqual(22);
  }
  for (let index = 0; index < 2; index++) {
   await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
   await page.getByRole('button', { name: 'Next question', exact: true }).click();
  }
  for (const index of [2]) {
   const groups = await page.locator('.exercise-choice').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left };
   }));
   expect(groups[1]!.top).toBeGreaterThanOrEqual(groups[0]!.bottom);
   expect(groups[1]!.left).toEqual(groups[0]!.left);
   const fit = await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth);
   expect(fit, `Question ${index + 1} fits at ${size.width} x ${size.height}`).toBe(true);

  }
 }
});

for (const action of ['Check Answer', 'Show Answer']) {
 test(`second exercise opens the completion popup after ${action} on the final question`, async ({ page }, testInfo) => {
  await page.goto('/labs/incremental-maintenance/exercises/exercise-3');
  for (let stage = 0; stage < 3; stage++) {
   const next = page.getByRole('button', { name: stage === 2 ? 'Finish chapter' : 'Next question', exact: true });
   await expect(next).toHaveCount(0);
   if (action === 'Check Answer') {
    for (const [index, choice] of maintenanceExercises[1]!.checkpoints[stage]!.choices.entries()) for (const option of choice.expected) await page.locator('.exercise-choice').nth(index).getByRole('checkbox', { name: option, exact: true }).check();
   }
   await page.getByRole('button', { name: action, exact: true }).click();
   await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
   await expect(page.locator('.guided-lab-progress strong')).toHaveText(`${stage + 1} / 3`);
   await next.click();
  }
  await expect(page).toHaveURL('/labs/incremental-maintenance/exercises/exercise-3');
  const dialog = page.getByRole('dialog', { name: 'You finished Chapter 2', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('filters, joins, and grouped aggregates');
  for (const theme of ['light', 'dark']) {
   await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
   const box = await dialog.boundingBox();
   const viewport = page.viewportSize()!;
   expect(box!.x).toBeGreaterThanOrEqual(0);
   expect(box!.y).toBeGreaterThanOrEqual(0);
   expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
   expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
   expect(await dialog.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
   const buttonBox = await dialog.getByRole('button', { name: 'Go to next chapter', exact: true }).boundingBox();
   expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(box!.y + box!.height);
   await page.screenshot({ path: testInfo.outputPath(`completion-${theme}.png`) });
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.guided-lab-progress strong')).toHaveText('3 / 3');
  await expect(page.getByRole('button', { name: 'Finish chapter', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Go to next chapter', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/labs/views-indexes-materialized-views');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Views, Indexes');
 });
}
