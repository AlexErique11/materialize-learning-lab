import { expect, test } from './fixtures';
import { playbackFrames, progressLectures } from '../../src/chapters/progress-and-freshness/lecture-scenarios';
import { progressExercises } from '../../src/chapters/progress-and-freshness/exercise-scenarios';
import { getLectureWalkthrough } from '../../src/components/walkthrough/walkthroughContent';

const base = '/labs/progress-and-freshness';
test('Chapter 6 overview exposes every activity and the controls tour pauses playback', async ({ page }) => {
  await page.clock.install();
  await page.goto(base);
  for (const [index, lecture] of progressLectures.entries()) await expect(page.getByRole('link', { name: `Start tutorial: Lecture ${index + 1}: ${lecture.title}`, exact: true })).toHaveAttribute('href', `${base}/tutorial/lecture-${index + 1}`);
  const path = `${base}/tutorial/lecture-2`;
  await page.goto(path);
  const run = page.getByRole('button', { name: 'Run', exact: true });
  await run.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  const help = page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true });
  await help.click();
  const before = await page.getByTestId('lane-orders').getAttribute('aria-label');
  for (const [index, step] of getLectureWalkthrough(path)!.entries()) {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(step.description);
    await dialog.getByRole('button', { name: index === 3 ? 'Finish' : 'Next', exact: true }).click();
  }
  await expect(help).toBeFocused();
  await page.clock.fastForward(10_000);
  expect(await page.getByTestId('lane-orders').getAttribute('aria-label')).toBe(before);
  await expect(run).toBeVisible();
});
for (const [index, lecture] of progressLectures.entries()) {
  test(`Chapter 6 lecture ${index + 1}: guided predictions, back, reset and reference`, async ({ page }) => {
    await page.goto(`${base}/tutorial/lecture-${index + 1}`);
    await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'SQL & Objectives' })).toContainText('mz_internal.mz_frontiers');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    for (const [step, lesson] of lecture.lessons.entries()) {
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
      if (lesson.before) {
        await expect(dialog).toContainText(lesson.before);
        const before = await page.getByTestId('progress-workspace').innerText();
        await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expect(dialog).toContainText(lesson.explanation);
        await dialog.getByRole('button', { name: 'Back', exact: true }).click();
        await expect(dialog).toContainText(lesson.before);
        expect(await page.getByTestId('progress-workspace').innerText()).toBe(before);
        await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
      }
      await expect(dialog).toContainText(lesson.explanation);
      await expect.poll(async () => {
        const card = await page.locator('.relation-guide[open] .relation-guide-card').boundingBox();
        const size = page.viewportSize()!;
        return Boolean(card && card.x >= 0 && card.y >= 0 && card.x + card.width <= size.width + 1 && card.y + card.height <= size.height + 1);
      }, { message: 'Every guided explanation must fit within the viewport' }).toBe(true);
      await dialog.getByRole('button', { name: step === lecture.lessons.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Tutorial completed', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByTestId('lane-orders')).toHaveAttribute('aria-label', new RegExp(`frontier ${lecture.initial.frontiers.orders};`));
  });
}

for (const [index, exercise] of progressExercises.entries()) {
  test(`Chapter 6 exercise ${index + 1}: all questions, wrong answers, hints, solutions and completion`, async ({ page }) => {
    await page.goto(`${base}/exercises/${exercise.slug}`);
    await page.getByRole('button', { name: 'View question', exact: true }).click();
    for (const [step, question] of exercise.questions.entries()) {
      const workspace = page.getByTestId('progress-workspace');
      const before = await workspace.innerText();
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
      expect(await workspace.innerText()).toBe(before);
      await page.getByRole('button', { name: 'Hint', exact: true }).click();
      await expect(page.locator('.exercise-question')).toContainText(question.hint);
      // Solve through actual inputs, rather than only exercising Show Answer.
      for (const group of question.groups) {
        const fieldset = page.getByRole('group', { name: group.label, exact: true });
        if (group.kind === 'integer') await fieldset.getByRole('textbox').fill(group.solution[0]!);
        else for (const answer of group.solution) {
          const choice = group.choices!.find(c => c.id === answer)!;
          await fieldset.getByRole(group.kind === 'single' ? 'radio' : 'checkbox', { name: choice.label, exact: true }).check();
        }
      }
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
      await expect(page.locator('.exercise-question')).toContainText(question.explanation);
      const last = step === exercise.questions.length - 1;
      await page.getByRole('button', { name: last ? index === 2 ? 'Finish chapter' : `Exercise ${index + 2}` : 'Next question', exact: true }).click();
    }
    if (index === 2) {
      await expect(page.getByRole('dialog', { name: 'You finished Chapter 6' })).toBeVisible();
      await page.getByRole('button', { name: 'Go to next chapter', exact: true }).click();
      await expect(page).toHaveURL(/consistent-reads$/);
    } else await expect(page).toHaveURL(`${base}/exercises/exercise-${index + 2}`);
    await page.goto(`${base}/exercises/${exercise.slug}`);
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
    await expect(page.locator('.progress-answer-group input:checked')).toHaveCount(0);
  });
}

test('Chapter 6 controls match reference geometry and all lecture checkpoints fit', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  for (const viewport of isMobile ? [{ width: 390, height: 844 }, { width: 610, height: 668 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/labs/incremental-maintenance/tutorial/lecture-1');
    const title = (await page.locator('h1').boundingBox())!;
    const controls = (await page.locator('.guided-lab-controls').boundingBox())!;
    const baseline = (await page.locator('.relation-playback-controls').boundingBox())!;
    for (let index = 0; index < progressLectures.length; index++) {
      await page.goto(`${base}/tutorial/lecture-${index + 1}`);
      expect((await page.locator('h1').boundingBox())!.y).toBeCloseTo(title.y, 0);
      expect((await page.locator('.guided-lab-controls').boundingBox())!.y).toBeCloseTo(controls.y, 0);
      const frames = playbackFrames(progressLectures[index]!);
      for (let step = 0; step <= frames.length; step++) {
        await expect.poll(async () => { const footer = (await page.locator('.relation-playback-controls').boundingBox())!; return footer.y + footer.height; }).toBeLessThanOrEqual(viewport.height + 1);
        await expect.poll(async () => { const footer = (await page.locator('.relation-playback-controls').boundingBox())!; return footer.y + footer.height; }).toBeCloseTo(baseline.y + baseline.height, 0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (step < frames.length) await page.getByRole('button', { name: index === 2 ? 'Next case' : 'Next change', exact: true }).click();
      }
      await page.screenshot({ path: test.info().outputPath(`chapter-six-${index + 1}-${viewport.width}.png`) });
    }
  }
});

test('Chapter 6 lectures keep matching panel bounds', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  const differences: unknown[] = [];
  const selectors = ['.relation-metrics', '.progress-stage-row', '.progress-lane-panel', '.progress-axis', '[data-testid="lane-orders"]', '[data-testid="lane-payments"]', '[data-testid="lane-join"]', '.progress-detail', '.progress-caption'];
  for (const viewport of isMobile ? [{ width: 390, height: 844 }, { width: 610, height: 668 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    let reference: Record<string, { x: number; y: number; width: number; height: number } | null> | undefined;
    for (let index = 0; index < 3; index++) {
      await page.goto(`${base}/tutorial/lecture-${index + 1}`);
      await expect(page.getByTestId('progress-workspace')).toBeVisible();
      const bounds: Record<string, { x: number; y: number; width: number; height: number } | null> = {};
      for (const selector of selectors) bounds[selector] = await page.locator(selector).boundingBox();
      if (!reference) reference = bounds;
      else for (const selector of selectors) {
        const expected = reference[selector];
        const actual = bounds[selector];
        if (expected && actual && (Math.abs(expected.y - actual.y) > .5 || Math.abs(expected.height - actual.height) > .5)) differences.push({ viewport, lecture: index + 1, selector, expected, actual });
      }
    }
  }
  expect(differences).toEqual([]);
});

test('normal playback shows real actions, keeps diamonds, and explains the symbols', async ({ page }) => {
  await page.goto(`${base}/tutorial/lecture-1`);
  const next = page.getByRole('button', { name: 'Next change', exact: true });
  await next.click();
  await expect(page.getByTestId('lane-orders')).toHaveAttribute('aria-label', /frontier 12;/);
  await expect(page.getByTestId('progress-detail')).toContainText('Green covers times before 12');
  await next.click();
  await expect(page.getByTestId('observed-change')).toHaveCount(1);
  await expect(page.getByTestId('progress-detail')).toContainText('seeing 18 does not complete earlier times');
  await next.click();
  await expect(page.getByTestId('observed-change')).toHaveCount(2);
  await expect(page.getByTestId('observed-change').filter({ hasText: '18' })).toBeVisible();
  await next.click();
  await next.click();
  await expect(page.getByTestId('observed-change')).toHaveCount(2);
  await next.click();
  await expect(page.getByTestId('observed-change')).toHaveCount(2);
  await expect(page.getByTestId('observed-change').filter({ hasText: '18' })).toContainText('×2');
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Explain diagram symbols', exact: true }).click();
  const key = page.getByRole('dialog', { name: 'Diagram key', exact: true });
  await expect(key).toContainText('Green band · completed time');
  await expect(key).toContainText('Orange horizontal band · processing still needed');
  await expect(key).toContainText('Diamonds remain as history');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('observed-change')).toHaveCount(0);
});

test('autoplay skips static introductions, pauses for the diagram key, and replays from the end', async ({ page }) => {
  await page.clock.install();
  await page.goto(`${base}/tutorial/lecture-1`);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.runFor(2500);
  await expect(page.getByTestId('lane-orders')).toHaveAttribute('aria-label', /frontier 12;/);
  await page.getByRole('button', { name: 'Explain diagram symbols', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.getByTestId('observed-change')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  const next = page.getByRole('button', { name: 'Next change', exact: true });
  for (let step = 1; step < playbackFrames(progressLectures[0]!).length; step++) await next.click();
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByTestId('observed-change')).toHaveCount(0);
  await page.clock.runFor(2500);
  await expect(page.getByTestId('lane-orders')).toHaveAttribute('aria-label', /frontier 12;/);
});

test('Lecture 3 starts at step 1 and shows all Revenue lags inline', async ({ page }) => {
  await page.clock.install();
  await page.goto(`${base}/tutorial/lecture-3`);
  const label = page.getByTestId('progress-case-label');
  const progress = page.getByRole('progressbar', { name: 'Steps progress' });
  const legend = page.getByRole('region', { name: 'Revenue lag breakdown' });
  const expectLags = async (values: number[]) => {
    await expect(legend).toBeVisible();
    expect(await legend.locator('dt').allTextContents()).toEqual(['Source', 'Inherited', 'Local', 'Global', 'Wall-clock']);
    expect(await legend.locator('dd').allTextContents()).toEqual(values.map(String));
  };
  await expect(label).toHaveText('Step 1 · Stalled source');
  await expect(progress).toHaveAttribute('value', '1');
  await expect(progress).toHaveAttribute('max', '4');
  await expect(page.getByRole('button', { name: 'Previous case', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Lag guide', exact: true })).toHaveCount(0);
  await expectLags([12, 0, 0, 0, 12]);
  const cases = [
    { name: 'Computation delay', lags: [2, 6, 0, 6, 8] },
    { name: 'Slow query', lags: [0, 0, 0, 0, 0] },
    { name: 'Reaction time', lags: [0, 0, 0, 0, 0] },
  ];
  for (const [index, entry] of cases.entries()) {
    await page.getByRole('button', { name: 'Next case', exact: true }).click();
    await expect(label).toHaveText(`Step ${index + 2} · ${entry.name}`);
    await expect(progress).toHaveAttribute('value', `${index + 2}`);
    await expectLags(entry.lags);
    await expect(page.locator('.progress-lane[data-changed="true"]')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Previous case', exact: true }).click();
  await expect(label).toHaveText('Step 3 · Slow query');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(label).toHaveText('Step 1 · Stalled source');
  await expectLags([12, 0, 0, 0, 12]);
  await page.screenshot({ path: test.info().outputPath('lecture-three-inline-lags.png') });
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.runFor(2500);
  await expect(label).toHaveText('Step 2 · Computation delay');
  await expectLags([2, 6, 0, 6, 8]);
  await page.getByRole('button', { name: 'Explain diagram symbols', exact: true }).click();
  const key = page.getByRole('dialog', { name: 'Diagram key' });
  await expect(key).toContainText('Inherited + local lag');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  await expectLags([12, 0, 0, 0, 12]);
});

test('progress boundaries stay aligned during load, catch-up, rewind and reset', async ({ page }) => {
  await page.goto(`${base}/tutorial/lecture-2`);
  const checkBoundaries = async () => {
    // Sample successive painted frames: the bands must never trail their markers.
    const errors = await page.locator('.progress-lane-panel').evaluate(async panel => {
      const errors: string[] = [];
      for (let frame = 0; frame < 18; frame++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        for (const lane of Array.from(panel.querySelectorAll('.progress-lane'))) {
          const frontier = lane.querySelector('.progress-frontier')!.getBoundingClientRect();
          const complete = lane.querySelector('.progress-complete')!.getBoundingClientRect();
          if (Math.abs(complete.right - (frontier.x + frontier.width / 2)) > .6) errors.push('Completed band detached from frontier');
          const pending = lane.querySelector('.progress-pending')?.getBoundingClientRect();
          const limit = lane.querySelector('.progress-limit')?.getBoundingClientRect();
          if (pending && limit && (Math.abs(pending.left - complete.right) > .6 || Math.abs(pending.right - (limit.x + limit.width / 2)) > .6)) errors.push('Pending gap detached from boundaries');
        }
      }
      return errors;
    });
    expect(errors).toEqual([]);
  };
  await checkBoundaries();
  for (let step = 1; step <= 8; step++) {
    await page.getByRole('button', { name: 'Next change', exact: true }).click();
    await checkBoundaries();
    if (step === 5 || step === 8) {
      const join = page.getByTestId('lane-join');
      await expect(join.locator('.progress-frontier')).toHaveAttribute('aria-label', `Frontier and input limit both ${step === 5 ? 14 : 18}; caught up to inputs`);
      await expect(join.locator('.progress-frontier[data-caught-up="true"]')).toHaveCount(1);
      await expect(join.locator('.progress-limit, .progress-pending')).toHaveCount(0);
      if (step === 5) await page.screenshot({ path: test.info().outputPath('lecture-two-caught-up.png') });
    }
  }
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await checkBoundaries();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await checkBoundaries();
});

test('exercise pages reject wheel and keyboard scrolling without clipping their controls', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  for (const viewport of isMobile ? [{ width: 360, height: 740 }, { width: 610, height: 668 }] : [{ width: 1280, height: 720 }, { width: 1440, height: 800 }, { width: 1536, height: 864 }, { width: 800, height: 600 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/tutorial/lecture-3`);
    const lectureDiagram = (await page.locator('.progress-lane-panel').boundingBox())!;
    await page.goto(`${base}/exercises/exercise-3`);
    const exerciseDiagram = (await page.locator('.progress-lane-panel').boundingBox())!;
    expect(exerciseDiagram.y).toBeCloseTo(lectureDiagram.y, 0);
    expect(exerciseDiagram.height).toBeCloseTo(lectureDiagram.height, 0);
    for (const question of [false, true]) {
      if (question) await page.getByRole('button', { name: 'View question', exact: true }).click();
      const pageBounds = (await page.locator('.guided-lab-page').boundingBox())!;
      await page.mouse.move(pageBounds.x + pageBounds.width / 2, Math.min(viewport.height - 50, pageBounds.y + 300));
      await page.mouse.wheel(0, 900);
      await page.locator('h1').click();
      await page.keyboard.press('PageDown');
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      expect(await page.evaluate(() => Array.from(document.querySelectorAll('.guided-lab-page, .guided-lab-page *')).some(el => el.scrollTop > 0))).toBe(false);
      const footer = (await page.locator('.relation-playback-controls').boundingBox())!;
      expect(footer.y + footer.height).toBeLessThanOrEqual(viewport.height);
      const content = (await page.locator(question ? '.progress-exercise-question-view' : '[data-testid="progress-workspace"]').boundingBox())!;
      expect(content.y + content.height).toBeLessThanOrEqual(footer.y);
    }
    await page.goto(base);
    expect(await page.locator('html').evaluate(el => getComputedStyle(el).overflowY)).not.toBe('clip');
  }
});

test('Chapter 6 exercise layouts preserve evidence and answers across screen sizes and themes', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  for (const viewport of isMobile ? [{ width: 390, height: 844 }, { width: 610, height: 668 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const [index, exercise] of progressExercises.entries()) {
      await page.goto(`${base}/tutorial/lecture-${index + 1}`);
      const lectureDiagram = (await page.locator('.progress-lane-panel').boundingBox())!;
      await page.goto(`${base}/exercises/${exercise.slug}`);
      const diagram = (await page.locator('.progress-lane-panel').boundingBox())!;
      expect(diagram.x).toBeCloseTo(lectureDiagram.x, 0);
      expect(diagram.y).toBeCloseTo(lectureDiagram.y, 0);
      expect(diagram.width).toBeCloseTo(lectureDiagram.width, 0);
      expect(diagram.height).toBeCloseTo(lectureDiagram.height, 0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await page.getByRole('button', { name: 'View question', exact: true }).click();
      for (let step = 0; step < exercise.questions.length; step++) {
        await expect(page.locator('.exercise-question')).toBeVisible();
        for (const accepted of [false, true]) {
          if (accepted) await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
          const bottom = (await page.locator('.relation-playback-controls').boundingBox())!;
          expect(bottom.y + bottom.height).toBeLessThanOrEqual(viewport.height + 1);
          await page.getByRole('button', { name: 'View diagram', exact: true }).click();
          await expect(page.getByTestId('progress-workspace')).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
          const currentDiagram = (await page.locator('.progress-lane-panel').boundingBox())!;
          expect(currentDiagram.y).toBeCloseTo(diagram.y, 0);
          expect(currentDiagram.width).toBeCloseTo(diagram.width, 0);
          expect(currentDiagram.height).toBeCloseTo(diagram.height, 0);
          await page.getByRole('button', { name: 'View question', exact: true }).click();
        }
        if (step < exercise.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
      }
      await page.screenshot({ path: test.info().outputPath(`exercise-${index + 1}-${viewport.width}.png`) });
      if (index === 2) {
        await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
        await page.screenshot({ path: test.info().outputPath(`exercise-dark-${viewport.width}.png`) });
        await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
      }
    }
  }
});
