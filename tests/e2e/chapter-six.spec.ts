import { advanceGuidedLesson } from './guided-run';
import { expect, test } from './fixtures';
import { playbackFrames, progressLectures } from '../../src/chapters/progress-and-freshness/lecture-scenarios';
import { progressExercises } from '../../src/chapters/progress-and-freshness/exercise-scenarios';
import { getLectureWalkthrough } from '../../src/components/walkthrough/walkthroughContent';

const base = '/labs/progress-and-freshness';

test('Chapter 6 lecture headers expose relation-specific evidence without changing the scenario', async ({ page }) => {
  for (let index = 1; index <= 3; index++) {
    await page.goto(`${base}/tutorial/lecture-${index}`);
    const headers = page.getByRole('navigation', { name: 'Progress details' });
    const detail = page.getByTestId('progress-detail');
    const snapshot = () => page.locator('.progress-lane').evaluateAll(lanes => lanes.map(lane => lane.getAttribute('aria-label')));
    const initial = await snapshot();
    const counter = await page.getByRole('progressbar', { name: 'Changes progress', exact: true }).getAttribute('value');
    const texts: string[] = [];
    for (const [laneIndex, lane] of (index === 3 ? ['orders', 'payments', 'join', 'revenue'] : ['orders', 'payments', 'join']).entries()) {
      await headers.getByRole('button').nth(laneIndex).click();
      await expect(detail).toHaveAttribute('data-relation', lane);
      await expect(detail.locator('dt')).toHaveCount(3);
      texts.push(await detail.innerText());
      expect(await snapshot()).toEqual(initial);
      await expect(page.getByRole('progressbar', { name: 'Changes progress', exact: true })).toHaveAttribute('value', counter!);
    }
    expect(new Set(texts).size).toBe(texts.length);
    if (index === 2) {
      await expect(detail).toContainText('Processing gap');
      await expect(detail).toContainText('Paid orders is at 6, while its inputs permit 8');
    }
  }
});

test('Chapter 6 diagnostic selections distinguish source, local, inherited and retrieval delay', async ({ page }) => {
  await page.goto(`${base}/tutorial/lecture-3`);
  const headers = page.getByRole('navigation', { name: 'Progress details' });
  const detail = page.getByTestId('progress-detail');
  const select = async (name: string) => headers.getByRole('button', { name: new RegExp(`\\. ${name}$`) }).click();
  const fact = (label: string) => detail.locator('.progress-inspector-facts > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
  await select('Orders');
  await expect(fact('Wall-clock lag')).toHaveText('2 s');
  await expect(detail).not.toContainText('status: stalled');
  await select('Payments');
  await expect(fact('Wall-clock lag')).toHaveText('12 s');
  await expect(detail).toContainText('Payments status: stalled');
  await select('Paid orders');
  await expect(fact('Processing gap')).toHaveText('0 s');
  await expect(detail).toContainText('caught up to its inputs');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await select('Paid orders');
  await expect(fact('Processing gap')).toHaveText('6 s');
  await expect(detail).toContainText('40 → 90 changes');
  await select('Revenue');
  await expect(fact('Local lag')).toHaveText('0 s');
  await expect(fact('Inherited computation lag')).toHaveText('6 s');
  await expect(detail).toContainText('wall-clock lag: 8 s');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await select('Revenue');
  await expect(detail).toContainText('3 s response measures retrieval time');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await select('Orders');
  await expect(detail).toContainText('source-only ingestion duration is not sampled');
  await select('Revenue');
  await expect(detail).toContainText('freshness delay 4 s + query latency 3 s = reaction time 7 s');
  await detail.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await select('Payments');
  expect(await detail.evaluate(element => element.scrollTop)).toBe(0);
});

test('Chapter 6 exercise 3 keeps questions and feedback below the visualization', async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  for (const viewport of isMobile ? [{ width: 390, height: 844 }, { width: 390, height: 664 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/exercises/exercise-3`);
    await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-aligned', 'true');
    const assertQuestionBelow = async () => {
      await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-split-question', 'false');
      const position = await page.locator('.progress-exercise-layout').evaluate(root => {
        const diagram = root.querySelector('.progress-lane-panel')!.getBoundingClientRect();
        const evidence = root.querySelector('.progress-exercise-evidence')!.getBoundingClientRect();
        const question = root.querySelector('.exercise-question')!.getBoundingClientRect();
        return { diagramBottom: diagram.bottom, evidenceTop: evidence.top, evidenceBottom: evidence.bottom, questionTop: question.top };
      });
      expect(position.evidenceTop).toBeGreaterThanOrEqual(position.diagramBottom);
      expect(position.questionTop).toBeGreaterThanOrEqual(position.evidenceBottom);
    };
    for (let step = 0; step < progressExercises[2]!.questions.length; step++) {
      await assertQuestionBelow();
      await page.getByRole('button', { name: 'Hint', exact: true }).click();
      await assertQuestionBelow();
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await assertQuestionBelow();
      const lastAnswer = page.locator('.exercise-answers :is(input, select, button):visible').last();
      await lastAnswer.scrollIntoViewIfNeeded();
      await expect(lastAnswer).toBeInViewport();
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      await assertQuestionBelow();
      if (step < progressExercises[2]!.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
    }
  }
});

test('Chapter 6 exercise headers are static and follow each question while lecture headers remain interactive', async ({ page }) => {
  test.setTimeout(60_000);
  for (const [index, exercise] of progressExercises.entries()) {
    await page.goto(`${base}/tutorial/lecture-${index + 1}`);
    const lectureHeaders = (await page.locator('.progress-stage-row').boundingBox())!;
    await page.goto(`${base}/exercises/${exercise.slug}`);
    await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-aligned', 'true');
    const responsiveFlow = await page.locator('.progress-exercise-page').evaluate(element => element.hasAttribute('data-responsive-flow'));
    await expect.poll(() => page.locator('.progress-stage-row').boundingBox()).toEqual(
      responsiveFlow ? { ...lectureHeaders, y: expect.any(Number) } : lectureHeaders,
    );
    const headers = page.getByRole('group', { name: 'Question relations', exact: true });
    const highlighted = () => headers.locator('[data-highlighted="true"]').evaluateAll(elements => elements.map(element => element.getAttribute('data-lane')));
    for (const [step, question] of exercise.questions.entries()) {
      await expect(headers.locator('button, a, input, select, textarea, [tabindex]')).toHaveCount(0);
      expect(await highlighted()).toEqual(question.focusLanes);
      for (const lane of ['orders', 'payments', 'join', 'revenue'] as const) {
        if (lane === 'revenue' && index !== 2) continue;
        await expect(page.getByTestId(`lane-${lane}`)).toHaveAttribute('data-selected', String(question.focusLanes.includes(lane)));
      }
      const otherHeader = headers.locator('[data-highlighted="false"]').first();
      if (await otherHeader.count()) {
        await otherHeader.click();
        expect(await highlighted()).toEqual(question.focusLanes);
      }
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      expect(await highlighted()).toEqual(question.focusLanes);
      if (step < exercise.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    expect(await highlighted()).toEqual(exercise.questions[0]!.focusLanes);
  }
  await page.goto(`${base}/tutorial/lecture-1`);
  const lectureHeaders = page.getByRole('navigation', { name: 'Progress details' });
  await lectureHeaders.getByRole('button', { name: '2. Payments', exact: true }).click();
  await expect(lectureHeaders.getByRole('button', { name: '2. Payments', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('progress-detail')).toContainText('Payments');
});

test('Chapter 6 associates every incorrect answer with its explanation without moving the diagram', async ({ page }) => {
  await page.goto(`${base}/exercises/exercise-2`);
  await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-aligned', 'true');
  const diagramGeometry = () => page.locator('.progress-lane-panel').evaluate(panel => {
    const { x, y, width, height } = panel.getBoundingClientRect();
    return { x, y: y + scrollY, width, height };
  });
  const diagram = await diagramGeometry();
  for (const label of ['Input limit', 'Actual join frontier']) await page.getByRole('textbox', { name: label, exact: true }).fill('0');
  const select = page.getByRole('combobox', { name: 'Limiting input', exact: true });
  if (await select.isVisible()) await select.selectOption('orders');
  else await page.getByRole('radio', { name: 'Orders', exact: true }).check();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  const feedback = page.locator('.exercise-question-copy');
  for (const label of ['Input limit', 'Actual join frontier', 'Limiting input']) {
    const group = page.getByRole('group', { name: label, exact: true });
    await expect(group).toHaveAttribute('aria-invalid', 'true');
    await expect(group).toHaveAccessibleDescription(/\S+/);
    await expect(feedback).toContainText(label);
  }
  await expect(page.getByRole('textbox', { name: 'Input limit', exact: true })).toHaveAccessibleDescription(/Input limit is not 0/);
  const choice = await select.isVisible() ? select : page.getByRole('radio', { name: 'Orders', exact: true });
  await expect(choice).toHaveAttribute('aria-invalid', 'true');
  await expect(choice).toHaveAccessibleDescription(/Payments is the smaller input/);
  expect(await diagramGeometry()).toEqual(diagram);
  await page.getByRole('textbox', { name: 'Input limit', exact: true }).fill('abc');
  await expect(choice).toHaveAttribute('aria-invalid', 'false');
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Input limit', exact: true })).toHaveAccessibleDescription(/Enter a whole number/);
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(page.locator('.progress-answer-group[aria-invalid="true"]')).toHaveCount(0);
});
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
    test.setTimeout(60_000);
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
      await advanceGuidedLesson(page, step === lecture.lessons.length - 1);
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
    await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-aligned', 'true');
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
        else if (group.kind === 'single' && await fieldset.getByRole('combobox').isVisible()) await fieldset.getByRole('combobox').selectOption(group.solution[0]!);
        else if (group.kind === 'multiple' && await fieldset.getByRole('button', { name: `Choose ${group.label}`, exact: true }).isVisible()) {
          await fieldset.getByRole('button').click();
          const dialog = page.getByRole('dialog', { name: group.label, exact: true });
          for (const answer of group.solution) await dialog.getByRole('checkbox', { name: group.choices!.find(c => c.id === answer)!.label, exact: true }).check();
          await dialog.getByRole('button', { name: 'Done', exact: true }).click();
        } else for (const answer of group.solution) {
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
      await expect(page.getByRole('dialog', { name: 'Exercise completed', exact: true })).toBeVisible();
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
  for (const viewport of isMobile ? [{ width: 390, height: 844 }, { width: 390, height: 664 }, { width: 610, height: 668 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 870, height: 668 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/labs/incremental-maintenance/tutorial/lecture-1');
    const title = (await page.locator('h1').boundingBox())!;
    const controls = (await page.locator('.guided-lab-controls').boundingBox())!;
    const baseline = (await page.locator('.relation-playback-controls').boundingBox())!;
    // The reference chapter's tour can expand an emulated phone viewport.
    // Compare its footer against the physical screen, without copying that overflow.
    const viewportCorrection = Math.max(0, await page.evaluate(() => innerHeight) - viewport.height);
    const buttonGeometry = () => page.locator('.relation-playback-controls .button[aria-keyshortcuts]').evaluateAll(buttons => buttons.map(button => {
      const box = button.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height];
    }));
    const referenceButtons = (await buttonGeometry()).map(([x, y, width, height]) => [x, y! - viewportCorrection, width, height]);
    for (let index = 0; index < progressLectures.length; index++) {
      await page.goto(`${base}/tutorial/lecture-${index + 1}`);
      if (viewport.width >= 1024 || isMobile) {
        expect((await page.locator('h1').boundingBox())!.y).toBeCloseTo(title.y, 0);
        expect((await page.locator('.guided-lab-controls').boundingBox())!.y).toBeCloseTo(controls.y, 0);
      }
      const frames = playbackFrames(progressLectures[index]!);
      for (let step = 0; step <= frames.length; step++) {
        await expect.poll(async () => { const footer = (await page.locator('.relation-playback-controls').boundingBox())!; return footer.y + footer.height; }).toBeLessThanOrEqual(viewport.height + 1);
        await expect.poll(async () => { const footer = (await page.locator('.relation-playback-controls').boundingBox())!; return footer.y + footer.height; }).toBeCloseTo(baseline.y + baseline.height - viewportCorrection, 0);
        await expect.poll(buttonGeometry).toEqual(referenceButtons);
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (step < frames.length) await page.getByRole('button', { name: 'Next change', exact: true }).click();
      }
      await page.screenshot({ path: test.info().outputPath(`chapter-six-${index + 1}-${viewport.width}.png`) });
    }
  }
});

test('Chapter 6 small phones keep aligned diagrams and every change on screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  let reference: unknown;
  for (let index = 0; index < progressLectures.length; index++) {
    await page.goto(`${base}/tutorial/lecture-${index + 1}`);
    const next = page.locator('.relation-playback-controls [data-walkthrough="next-change"]');
    await expect(next).toBeVisible();
    const diagram = await page.locator('.progress-stage-row, .progress-axis, [data-testid="lane-orders"], [data-testid="lane-payments"], [data-testid="lane-join"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
    reference ??= diagram;
    expect(diagram).toEqual(reference);
    for (let step = 0; step <= playbackFrames(progressLectures[index]!).length; step++) {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(568);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      if (!await next.isDisabled()) await next.click();
    }
  }
});

test('Chapter 6 lectures keep matching positions while three-row boxes are shorter', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  const differences: unknown[] = [];
  const selectors = ['.progress-stage-row', '.progress-lane-panel', '.progress-axis', '[data-testid="lane-orders"]', '[data-testid="lane-payments"]', '[data-testid="lane-join"]', '.progress-detail', '.progress-caption'];
  for (const viewport of isMobile ? [{ width: 390, height: 844 }, { width: 610, height: 668 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    let reference: Record<string, { x: number; y: number; width: number; height: number } | null> | undefined;
    for (let index = 0; index < 3; index++) {
      await page.goto(`${base}/tutorial/lecture-${index + 1}`);
      await expect(page.getByTestId('progress-workspace')).toBeVisible();
      await expect(page.locator('.relation-metrics')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Metrics', exact: true })).toHaveCount(0);
      const bounds: Record<string, { x: number; y: number; width: number; height: number } | null> = {};
      for (const selector of selectors) bounds[selector] = await page.locator(selector).boundingBox();
      if (!reference) reference = bounds;
      else for (const selector of selectors) {
        const expected = reference[selector];
        const actual = bounds[selector];
        const addedRow = selector === '.progress-lane-panel' && index === 2 ? bounds['[data-testid="lane-orders"]']!.height : 0;
        if (expected && actual && (Math.abs(expected.y - actual.y) > .5 || Math.abs(expected.height + addedRow - actual.height) > .5)) differences.push({ viewport, lecture: index + 1, selector, expected, actual });
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
  const progress = page.getByRole('progressbar', { name: 'Changes progress' });
  const legend = page.getByRole('region', { name: 'Revenue lag breakdown' });
  const expectLags = async (values: number[]) => {
    await expect(legend).toBeVisible();
    expect(await legend.locator('dt').allTextContents()).toEqual(['Source', 'Inherited', 'Local', 'Global', 'Wall-clock']);
    expect(await legend.locator('dd').allTextContents()).toEqual(values.map(String));
  };
  await expect(label).toHaveText('Step 1 · Stalled source');
  await expect(progress).toHaveAttribute('value', '1');
  await expect(progress).toHaveAttribute('max', '4');
  await expect(page.getByRole('button', { name: 'Previous change', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Lag guide', exact: true })).toHaveCount(0);
  await expectLags([12, 0, 0, 0, 12]);
  const cases = [
    { name: 'Computation delay', lags: [2, 6, 0, 6, 8] },
    { name: 'Slow query', lags: [0, 0, 0, 0, 0] },
    { name: 'Reaction time', lags: [0, 0, 0, 0, 0] },
  ];
  for (const [index, entry] of cases.entries()) {
    await page.getByRole('button', { name: 'Next change', exact: true }).click();
    await expect(label).toHaveText(`Step ${index + 2} · ${entry.name}`);
    await expect(progress).toHaveAttribute('value', `${index + 2}`);
    await expectLags(entry.lags);
    await expect(page.locator('.progress-lane[data-changed="true"]')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
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

test('exercise pages show diagram and question together without wheel or keyboard scrolling', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  for (const viewport of isMobile ? [{ width: 360, height: 740 }, { width: 610, height: 668 }] : [{ width: 1280, height: 720 }, { width: 1440, height: 800 }, { width: 1536, height: 864 }, { width: 800, height: 600 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/exercises/exercise-3`);
    await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-aligned', 'true');
    await expect(page.getByRole('button', { name: /^View (question|diagram)$/ })).toHaveCount(0);
    await expect(page.locator('.exercise-question-copy')).toBeVisible();
    await expect(page.locator('.exercise-answers')).toBeVisible();
    await expect(page.locator('.progress-lane-panel')).toBeVisible();
    await expect(page.locator('.progress-lane:visible')).toHaveCount(4);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 900);
    await page.locator('h1').click();
    await page.keyboard.press('PageDown');
    const responsiveFlow = await page.locator('.progress-exercise-page').evaluate(el => el.hasAttribute('data-responsive-flow'));
    if (!responsiveFlow) await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => Array.from(document.querySelectorAll('.guided-lab-page, .guided-lab-page *')).some(el => el.scrollTop > 0))).toBe(false);
    // Read both regions in the same frame while native PageDown scrolling settles.
    const bounds = await page.evaluate(() => {
      const answers = document.querySelector('.exercise-answers')!.getBoundingClientRect();
      const footer = document.querySelector('.progress-exercise-playback')!.getBoundingClientRect();
      const docked = document.querySelector('.progress-exercise-layout')!.getAttribute('data-dock-answers') === 'true';
      const flow = document.querySelector('.progress-exercise-page')!.hasAttribute('data-responsive-flow');
      return { answerBottom: answers.bottom, footerTop: footer.top, footerBottom: footer.bottom, footerHeight: docked ? footer.height : 0, boundary: flow ? document.documentElement.scrollHeight - scrollY : innerHeight };
    });
    expect(bounds.answerBottom).toBeLessThanOrEqual(bounds.footerTop + bounds.footerHeight);
    expect(bounds.footerBottom).toBeLessThanOrEqual(bounds.boundary + 1);
    await page.goto(base);
    expect(await page.locator('html').evaluate(el => getComputedStyle(el).overflowY)).not.toBe('clip');
  }
});

test('Chapter 6 exercises separate groups while keeping related rows close', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The phone frame retains its compact spacing.');
  for (const viewport of [{ width: 1500, height: 740 }, { width: 1920, height: 800 }]) {
    await page.setViewportSize(viewport);
    const gaps: number[] = [];
    for (const [index, exercise] of progressExercises.entries()) {
      await page.goto(`${base}/exercises/${exercise.slug}`);
      await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-fits', 'true');
      const heading = (await page.locator('.guided-lab-heading').boundingBox())!;
      const headers = (await page.locator('.progress-stage-row').boundingBox())!;
      const panel = (await page.locator('.progress-lane-panel').boundingBox())!;
      const evidence = (await page.locator('.progress-exercise-evidence').boundingBox())!;
      const question = (await page.locator('.exercise-question').boundingBox())!;
      const footer = (await page.locator('.progress-exercise-playback').boundingBox())!;
      const gap = question.y - evidence.y - evidence.height;
      gaps.push(gap);
      expect(headers.y - heading.y - heading.height).toBeGreaterThanOrEqual(47.5);
      expect(panel.y - headers.y - headers.height).toBeGreaterThanOrEqual(7.5);
      expect(panel.y - headers.y - headers.height).toBeLessThanOrEqual(10.5);
      expect(evidence.y - panel.y - panel.height).toBeCloseTo(index < 2 ? 36 : 24, 0);
      expect(gap).toBeCloseTo(8, 0);
      expect(question.y + question.height).toBeLessThanOrEqual(footer.y);
    }
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1.5);
  }
});

test('Chapter 6 combined exercise layouts fit every question and feedback without moving lanes', async ({ page, isMobile }) => {
  test.setTimeout(240_000);
  const viewports = isMobile ? [{ width: 390, height: 664 }, { width: 390, height: 844 }, { width: 360, height: 740 }, { width: 610, height: 668 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1500, height: 740 }, { width: 1920, height: 800 }, { width: 800, height: 600 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const [index, exercise] of progressExercises.entries()) {
      await page.goto(`${base}/tutorial/lecture-${index + 1}`);
      const lectureDiagram = (await page.locator('.progress-lane-panel').boundingBox())!;
      const lectureHeaders = (await page.locator('.progress-stage-row').boundingBox())!;
      const geometry = async () => page.locator('.progress-lane-panel').evaluate(panel => {
        const origin = panel.getBoundingClientRect();
        return Array.from(panel.querySelectorAll('.progress-axis, .progress-lane, .progress-track')).map(element => {
          const box = element.getBoundingClientRect();
          return { x: box.x - origin.x, y: box.y - origin.y, width: box.width, height: box.height };
        });
      });
      const lectureGeometry = await geometry();
      await page.goto(`${base}/exercises/${exercise.slug}`);
      await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-aligned', 'true');
      const responsiveFlow = await page.locator('.progress-exercise-page').evaluate(el => el.hasAttribute('data-responsive-flow'));
      // Read the box and scroll offset in one frame while focus can scroll the page.
      const diagramPosition = () => page.locator('.progress-lane-panel').evaluate((panel, flow) => {
        const { x, y, width, height } = panel.getBoundingClientRect();
        return { viewport: { x, y, width, height }, documentTop: y + (flow ? scrollY : 0) };
      }, responsiveFlow);
      for (let step = 0; step < exercise.questions.length; step++) {
        const { viewport: diagram, documentTop: diagramTop } = await diagramPosition();
        const diagramOffset = Number(await page.locator('.progress-exercise-layout').getAttribute('data-diagram-offset'));
        expect(diagram.x).toBeCloseTo(lectureDiagram.x, 1);
        if (!responsiveFlow) expect(diagram.y).toBeCloseTo(lectureDiagram.y + diagramOffset, 1);
        expect(diagram.width).toBeCloseTo(lectureDiagram.width, 1);
        expect(diagram.height).toBeCloseTo(lectureDiagram.height, 1);
        expect(await geometry()).toEqual(lectureGeometry);
        const fit = async () => {
          await expect(page.locator('.progress-lane-panel')).toBeVisible();
          await expect(page.locator('.exercise-question-copy')).toBeVisible();
          await expect(page.locator('.exercise-answers')).toBeVisible();
          await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-fits', 'true');
          const { viewport: currentDiagram, documentTop: currentDiagramTop } = await diagramPosition();
          expect({ ...currentDiagram, y: currentDiagramTop }).toEqual({ ...diagram, y: diagramTop });
          const footer = (await page.locator('.progress-exercise-playback').boundingBox())!;
          const docked = await page.locator('.progress-exercise-layout').getAttribute('data-dock-answers') === 'true';
          const inLegend = await page.locator('.progress-exercise-layout').getAttribute('data-legend-evidence') === 'true';
          const regions = await Promise.all(['.progress-lane-panel', '.progress-exercise-evidence', '.exercise-question-copy', '.exercise-answers'].map(selector => page.locator(selector).boundingBox()));
          const questionBox = (await page.locator('.exercise-question').boundingBox())!;
          if (index === 2) {
            expect(questionBox.y).toBeGreaterThanOrEqual(regions[1]!.y + regions[1]!.height);
            expect(questionBox.y + questionBox.height).toBeLessThanOrEqual(footer.y);
          }
          const headers = page.getByRole('group', { name: 'Question relations', exact: true });
          await expect(headers.locator('.progress-stage-static')).toHaveCount(index === 2 ? 4 : 3);
          const headerBox = (await headers.boundingBox())!;
          expect(headerBox.x).toBeCloseTo(lectureHeaders.x, 1);
          expect(headerBox.width).toBeCloseTo(lectureHeaders.width, 1);
          expect(headerBox.height).toBeCloseTo(lectureHeaders.height, 1);
          if (!responsiveFlow) expect(headerBox.y).toBeCloseTo(lectureHeaders.y + diagramOffset, 1);
          expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(currentDiagram.y);
          for (const region of regions) {
            const overlap = Math.min(headerBox.y + headerBox.height, region!.y + region!.height) - Math.max(headerBox.y, region!.y);
            expect(overlap).toBeLessThanOrEqual(1);
          }
          for (const [i, region] of regions.entries()) {
            const visibleBottom = index === 2 && !responsiveFlow && i >= 2 ? Math.min(region!.y + region!.height, questionBox.y + questionBox.height) : region!.y + region!.height;
            expect(visibleBottom, `${viewport.width}x${viewport.height}: exercise ${index + 1}, question ${step + 1}`).toBeLessThanOrEqual(footer.y + (docked && i === 3 ? footer.height : 0));
            for (const [offset, other] of regions.slice(i + 1).entries()) {
              if (inLegend && i === 0 && offset === 0) continue;
              const overlapX = Math.min(region!.x + region!.width, other!.x + other!.width) - Math.max(region!.x, other!.x);
              const overlapY = Math.min(region!.y + region!.height, other!.y + other!.height) - Math.max(region!.y, other!.y);
              expect(overlapX <= 1 || overlapY <= 1, 'Diagram, evidence, prompt and answers must not overlap').toBe(true);
            }
          }
          if (docked) {
            const button = await page.locator('.progress-exercise-playback').evaluate(footer => footer.querySelector('button')?.getBoundingClientRect().toJSON());
            if (button && regions[3]!.y + regions[3]!.height > button.y) expect(regions[3]!.x + regions[3]!.width).toBeLessThanOrEqual(button.x);
          }
          if (inLegend) {
            const evidence = regions[1]!;
            const key = (await page.locator('.progress-legend > span').first().boundingBox())!;
            expect(evidence.x + evidence.width).toBeLessThanOrEqual(key.x);
          }
          expect(footer.y + footer.height).toBeLessThanOrEqual(responsiveFlow ? await page.evaluate(() => document.documentElement.scrollHeight - scrollY) : viewport.height);
          for (const element of await page.locator('.exercise-question-copy, .exercise-answers, .progress-lane-panel, .progress-detail').all()) {
            expect(await element.evaluate(node => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1)).toBe(true);
          }
          expect(await page.evaluate(flow => document.documentElement.scrollWidth <= innerWidth && (flow || scrollY === 0), responsiveFlow)).toBe(true);
        };
        await fit();
        await page.getByRole('button', { name: 'Hint', exact: true }).click();
        await fit();
        await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
        await fit();
        await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
        await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
        await fit();
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        await fit();
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
        if (step < exercise.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
      }
      await page.screenshot({ path: test.info().outputPath(`combined-exercise-${index + 1}-${viewport.width}.png`) });
    }
  }
});
