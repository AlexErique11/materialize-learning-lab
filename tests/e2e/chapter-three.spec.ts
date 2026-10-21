import { advanceGuidedLesson } from './guided-run';
import { expect, test } from './fixtures';
import { objectExercises } from '../../src/chapters/views-indexes-materialized-views/exercise-scenarios';
import { objectLectures } from '../../src/chapters/views-indexes-materialized-views/scenario';

const chapterPath = '/labs/views-indexes-materialized-views';

test('shared controls, reference dialog and playback match the previous chapter', async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  const geometry = async () => {
    const title = (await page.locator('h1').boundingBox())!;
    const controls = (await page.locator('.guided-lab-controls').boundingBox())!;
    const playback = (await page.getByRole('button', { name: 'Next change', exact: true }).boundingBox())!;
    return { title: title.y, controls: controls.y, playbackTop: playback.y, playbackHeight: playback.height, bottom: playback.y + playback.height };
  };
  const sizes = isMobile ? [{ width: 390, height: 844 }, { width: 390, height: 750 }] : [{ width: 1440, height: 900 }, { width: 1366, height: 820 }, { width: 1280, height: 720 }, { width: 1280, height: 650 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto('/labs/incremental-maintenance/tutorial/lecture-4');
    const reference = await geometry();
    let graphReference: { top: number; height: number; inputTop: number } | undefined;
    for (const lecture of [1, 2, 3]) {
      await page.goto(`${chapterPath}/tutorial/lecture-${lecture}`);
      await expect(page.locator('.lecture-workspace')).toHaveAttribute('data-lecture-layout', 'without-tip');
      const current = await geometry();
      expect(current.title).toBe(reference.title);
      expect(current.controls).toBe(reference.controls);
      expect(current.playbackTop).toBeCloseTo(reference.playbackTop, 1);
      expect(current.playbackHeight).toBe(reference.playbackHeight);
      expect(current.bottom).toBeCloseTo(reference.bottom, 1);
      const canvas = (await page.locator('.flow-canvas').boundingBox())!;
      const input = (await page.locator('.flow-input').boundingBox())!;
      const graph = { top: canvas.y, height: canvas.height, inputTop: input.y };
      graphReference ??= graph;
      expect(graph, 'Query controls reserve the same graph spacing in every lecture').toEqual(graphReference);
      if (lecture === 1) {
        await expect(page.locator('.object-query-controls')).toHaveAttribute('inert', '');
        await expect(page.getByRole('combobox', { name: 'Query object', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Run query', exact: true })).toHaveCount(0);
      } else await expect(page.getByRole('button', { name: 'Run query', exact: true })).toBeVisible();
    }
  }
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('CREATE MATERIALIZED VIEW');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.locator('.guided-lab-progress strong')).toHaveText('1 / 6');
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close walkthrough', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true })).toBeFocused();
});

test('tables and questions stay visible together without scrolling and match Chapter 2 navigation', async ({ page, isMobile }) => {
  test.setTimeout(240_000);
  const sizes = isMobile ? [[390, 844], [375, 667], [610, 668]] : [[1536, 714], [1917, 893], [1440, 900], [1366, 768], [1280, 720], [1280, 650], [1024, 768], [1024, 700], [900, 800]];
  const graphGeometry = () => page.locator('.flow-canvas, .flow-input').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, width: box.width };
  }));
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto(`${chapterPath}/tutorial/lecture-2`);
    const reference = await graphGeometry();
    const diagramBounds = () => page.locator('.flow-canvas, .flow-panel:visible, .flow-input table').evaluateAll(elements => elements.map(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }));
    const lectureDiagram = await diagramBounds();
    await page.goto('/labs/incremental-maintenance/exercises/exercise-1');
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    const referenceNext = (await page.getByRole('button', { name: 'Next question', exact: true }).boundingBox())!;
    for (const exercise of [1, 2]) {
      await page.goto(`${chapterPath}/exercises/exercise-${exercise}`);
      await expect(page.locator('.object-exercise-workspace')).toHaveAttribute('data-aligned', 'true');
      const responsiveFlow = await page.locator('.object-exercise-page').evaluate(el => el.hasAttribute('data-responsive-flow'));
      const lift = Number(await page.locator('.object-exercise-workspace').getAttribute('data-diagram-lift'));
      if (responsiveFlow) {
        await expect.poll(async () => (await diagramBounds()).map(({ y: _y, ...box }) => box)).toEqual(lectureDiagram.map(({ y: _y, ...box }) => box));
      } else await expect.poll(diagramBounds, 'Panels retain lecture spacing and move upward together').toEqual(lectureDiagram.map(box => ({ ...box, y: box.y - lift })));
      await expect(page.getByRole('button', { name: /^(View tables|Show tables|Question)$/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Run query', exact: true })).toHaveCount(0);
      const fit = async () => {
        await expect(page.locator('.object-exercise-workspace')).toHaveAttribute('data-fits', 'true');
        await expect(page.locator('.flow-canvas')).toBeVisible();
        await expect(page.locator('.exercise-question')).toBeVisible();
        const graph = (await page.locator('.flow-graph').boundingBox())!;
        const question = (await page.locator('.exercise-question').boundingBox())!;
        const footer = (await page.locator('.object-exercise-footer').boundingBox())!;
        expect(graph.y + graph.height).toBeLessThanOrEqual(question.y);
        expect(question.y + question.height, `${width}×${height}, exercise ${exercise}`).toBeLessThanOrEqual(footer.y);
        for (const element of await page.locator('.flow-panel:visible, .flow-graph .table-scroll:visible, .exercise-question').all()) {
          expect(await element.evaluate(node => node.scrollHeight <= node.clientHeight + 1), (await element.getAttribute('class')) ?? 'Table content').toBe(true);
        }
      };
      for (let stage = 0; stage < 4; stage++) {
        await fit();
        const footer = (await page.locator('.object-exercise-footer').boundingBox())!;
        await expect.poll(graphGeometry).toEqual(reference);
        if (!responsiveFlow) {
          await page.mouse.move(width! - 35, height! / 2);
          await page.mouse.wheel(0, 900);
          await page.keyboard.press('PageDown');
          expect(await page.evaluate(() => scrollY)).toBe(0);
        }
        await expect.poll(graphGeometry).toEqual(reference);
        const tablePositions = () => page.locator('.flow-canvas, .flow-panel:visible, .flow-input table').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          const flow = document.querySelector('.object-exercise-page')!.hasAttribute('data-responsive-flow');
          return { left: box.left, top: box.top + (flow ? scrollY : 0), width: box.width, height: box.height };
        }));
        const beforeReveal = await tablePositions();
        await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
        await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
        await expect.poll(tablePositions, 'Revealing an answer must not move the diagram or its input table').toEqual(beforeReveal);
        await expect(page.locator('.exercise-question')).toBeVisible();
        await fit();
        if (width! <= 1150) {
          for (const panel of ['a', 'b', 'durable', 'transform', 'definitions']) {
            await page.getByLabel('Diagram panel', { exact: true }).selectOption(panel);
            await fit();
          }
          await page.getByLabel('Diagram panel', { exact: true }).selectOption('input');
        }
        const next = (await page.getByRole('button', { name: stage < 3 ? 'Next question' : exercise === 1 ? 'Exercise 2' : 'Finish chapter', exact: true }).boundingBox())!;
        if (!isMobile && !responsiveFlow) {
          const inset = height! >= 850 ? 24 : height! >= 741 ? 16 : 12;
          expect(height! - next.y - next.height, `${width}×${height}`).toBeCloseTo(inset, 0);
        }
        else if (!responsiveFlow) expect(next.y).toBe(footer.y + (footer.height - next.height) / 2);
        expect(next.x + next.width).toBeCloseTo(referenceNext.x + referenceNext.width, 0);
        expect(next.height).toBeCloseTo(referenceNext.height, 2);
        await expect.poll(graphGeometry).toEqual(reference);
        if ((width === 1366 || (width === 1280 && height === 650)) && exercise === 2 && stage === 3) await page.screenshot({ path: test.info().outputPath(`combined-exercise-${width}x${height}.png`) });
        if (stage < 3) await page.getByRole('button', { name: 'Next question', exact: true }).click();
      }
      await page.goto(`${chapterPath}/tutorial/lecture-2`);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('clip');
    }
  }
});

test('each lecture gates effects behind predictions and completes its guided flow', async ({ page }) => {
  test.setTimeout(90_000);
  for (const [lecture, total] of [[1, 5], [2, 5], [3, 6]]) {
    await page.goto(`${chapterPath}/tutorial/lecture-${lecture}`);
    await expect(page.getByRole('navigation', { name: 'Page navigation', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    const initial = await page.locator('.flow-canvas .flow-panel').allTextContents();
    for (const [index, introduction] of objectLectures[lecture! - 1]!.introductions.entries()) {
      await expect(page.locator('.relation-guide-phase')).toHaveText('Learn the concept');
      await expect(page.getByRole('heading', { name: introduction.title, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Show effect', exact: true })).toHaveCount(0);
      await expect(page.locator('.relation-guide-card p .relation-inline[data-column]').first()).toBeVisible();
      expect(await page.locator('.flow-canvas .flow-panel').allTextContents()).toEqual(initial);
      await page.getByRole('button', { name: index === objectLectures[lecture! - 1]!.introductions.length - 1 ? 'Try the changes' : 'Next', exact: true }).click();
    }
    for (let step = 0; step < total!; step++) {
      await expect(page.locator('.relation-guide-phase')).toHaveText('Predict the effect');
      await expect(page.locator('.relation-guide-card p .relation-inline[data-column]').first()).toBeVisible();
      const before = await page.locator('.object-diagram').innerText();
      await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Show effect', exact: true }).click();
      await expect(page.locator('.relation-guide-phase')).toHaveText('Explanation');
      await expect(page.locator('.relation-guide-card p .relation-inline[data-column]').first()).toBeVisible();
      expect(await page.locator('.object-diagram').innerText()).not.toBe(before);
      await advanceGuidedLesson(page, step === total! - 1);
    }
    await expect(page.getByText('Tutorial completed', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.guided-lab-progress strong')).toHaveText(`0 / ${total}`);
  }
});

test('concept pages support back, close and restart before any changes', async ({ page }) => {
  await page.goto(`${chapterPath}/tutorial/lecture-1`);
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is a regular view?', exact: true })).toBeVisible();
  await expect(page.locator('.object-concept-example')).toContainText('CREATE VIEW revenue_v');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Start with orders and a question', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.guided-lab-progress strong')).toHaveText('0 / 5');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  for (let index = 0; index < objectLectures[0]!.introductions.length; index++) {
    await page.getByRole('button', { name: index === objectLectures[0]!.introductions.length - 1 ? 'Try the changes' : 'Next', exact: true }).click();
  }
  await expect(page.locator('.relation-guide-phase')).toHaveText('Predict the effect');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is the durable-output panel for?', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Try the changes', exact: true }).click();
  await expect(page.locator('.relation-guide-phase')).toHaveText('Predict the effect');
});

test('guided variable colors match the graph fields in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto(`${chapterPath}/tutorial/lecture-1`);
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    const colors: string[] = [];
    for (const column of ['view', 'region', 'amount']) {
      const reference = page.locator(`.relation-guide-card p .object-lesson-text [data-column="${column}"]`).first();
      await expect(reference).toBeVisible();
      colors.push(await reference.evaluate(element => getComputedStyle(element).color));
    }
    expect(new Set(colors).size).toBe(3);
    for (const column of ['region', 'amount']) {
      const referenceColor = await page.locator(`.relation-guide-card p [data-column="${column}"]`).first().evaluate(element => getComputedStyle(element).color);
      const cellColor = await page.locator(`.flow-input td[data-column="${column}"]`).first().evaluate(element => getComputedStyle(element).color);
      expect(referenceColor).toBe(cellColor);
    }
    await expect(page.locator('.object-concept-example [data-column="region"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Close guided run', exact: true }).click();
  }
});

test('query exploration distinguishes local, remote and durable access', async ({ page }) => {
  await page.goto(`${chapterPath}/tutorial/lecture-2`);
  const result = page.getByTestId('object-query-result');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Local memory');
  await page.getByLabel('Query cluster', { exact: true }).selectOption('b');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Compute query');
  await page.getByLabel('Query object', { exact: true }).selectOption('revenue_mv');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Durable storage');
  await expect(result).toContainText('North $150');
  await page.goto(`${chapterPath}/tutorial/lecture-3`);
  await page.getByLabel('Query object', { exact: true }).selectOption('revenue_mv');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Object not created · query cannot run');
  await expect(page.locator('.flow-connectors [data-kind="query"]')).toHaveCount(0);
});

test('graph connects each query to its actual source and preserves past answers', async ({ page, isMobile }) => {
  await page.goto(`${chapterPath}/tutorial/lecture-2`);
  const result = page.getByTestId('object-query-result');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  if (!isMobile) await expect(page.locator('.flow-connectors [data-source="a-view-index"][data-target="a-query"]')).toHaveCount(1);
  await page.getByLabel('Query cluster', { exact: true }).selectOption('b');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  if (!isMobile) {
    await expect(page.locator('.flow-connectors [data-source="b-compute"][data-target="b-query"]')).toHaveCount(1);
    await expect(page.locator('.flow-connectors [data-source="a-view-index"][data-target="b-query"]')).toHaveCount(0);
  }
  await page.getByLabel('Query object', { exact: true }).selectOption('revenue_mv');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Durable storage');
  if (!isMobile) {
    await expect(page.locator('.flow-connectors [data-source="durable"][data-target="b-query"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Inspect Transform', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.flow-inspector')).toContainText('intermediate state in memory');
  } else {
    await page.locator('.flow-overview').getByRole('button', { name: 'Transform', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.flow-transform')).toBeVisible();
    await expect(page.locator('.flow-connectors')).toBeHidden();
  }
  await page.goto(`${chapterPath}/tutorial/lecture-1`);
  for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Next change', exact: true }).click();
  if (isMobile) await page.locator('.flow-overview').getByRole('button', { name: 'Cluster A', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Cluster A view index result', exact: true })).toContainText('$170');
  await expect(result).toContainText('North $150');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(result).toContainText('North $170');
});

test('manual answers, incorrect retries, hints and the final design work', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  if (!isMobile) await page.setViewportSize({ width: 1366, height: 768 });
  for (const [exerciseIndex, exercise] of objectExercises.entries()) {
    await page.goto(`${chapterPath}/exercises/exercise-${exerciseIndex + 1}`);
    for (const [stage, checkpoint] of exercise.checkpoints.entries()) {
      const before = await page.getByTestId('object-diagram').innerText();
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
      expect(await page.getByTestId('object-diagram').innerText()).toBe(before);
      await expect(page.getByRole('button', { name: 'Next question', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Hint', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: 'Hint', exact: true })).toHaveAttribute('aria-expanded', 'true');
      const picker = page.getByRole('button', { name: 'Select answers', exact: true });
      const compact = await picker.isVisible();
      if (compact) await picker.click();
      const choices = compact ? page.getByRole('dialog', { name: 'Select answers', exact: true }) : page;
      for (const id of checkpoint.solution) await choices.getByRole('checkbox', { name: checkpoint.choices.find(choice => choice.id === id)!.label, exact: true }).check();
      if (compact) await choices.getByRole('button', { name: 'Done', exact: true }).click();
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
      if (await picker.isVisible()) {
        await picker.click();
        const review = page.getByRole('dialog', { name: 'Select answers', exact: true });
        await expect(review.getByRole('checkbox', { checked: true })).toHaveCount(checkpoint.solution.length);
        await expect(review.getByRole('checkbox').first()).toBeDisabled();
        await review.getByRole('button', { name: 'Done', exact: true }).click();
      }
      if (exerciseIndex === 1) await expect(page.locator('.flow-definitions code')).toHaveText(stage === 0
        ? 'order_base → order_enriched' : 'order_base → order_enriched → revenue_mv');
      if (stage < exercise.checkpoints.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
    }
    if (isMobile) {
      await page.getByLabel('Diagram panel', { exact: true }).selectOption('b');
      await expect(page.locator('.flow-cluster-b')).toBeVisible();
    }
    if (exerciseIndex === 1) {
      await expect(page.getByTestId('object-query-result')).toContainText('North $170');
      if (!isMobile) await page.screenshot({ path: test.info().outputPath('combined-exercise-final.png') });
      await page.getByRole('button', { name: 'Finish chapter', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Exercise completed', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Finish chapter', exact: true })).toBeFocused();
    }
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.guided-lab-progress strong')).toHaveText('0 / 4');
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);
  }
});

test('answer reveal follows acceptance and reset clears all progress', async ({ page }) => {
  for (const exercise of [1, 2]) {
    await page.goto(`${chapterPath}/exercises/exercise-${exercise}`);
    for (let stage = 0; stage < 4; stage++) {
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
      if (stage < 3) await page.getByRole('button', { name: 'Next question', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.guided-lab-progress strong')).toHaveText('0 / 4');
  }
});

test('the first query result keeps Lecture 2 graph and table positions fixed', async ({ page, isMobile }) => {
  const sizes = isMobile ? [[390, 844], [375, 667]] : [[1440, 900], [1366, 820], [1280, 720]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto(`${chapterPath}/tutorial/lecture-2`);
    const positions = async () => page.locator(isMobile ? '.flow-canvas, .object-query-result, .relation-playback-controls' : '.flow-canvas, .flow-graph .table-scroll:visible, .object-query-result, .relation-playback-controls').evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect();
      return { top: bounds.top, height: bounds.height };
    }));
    const checkStable = async (before: Awaited<ReturnType<typeof positions>>) => {
      await expect.poll(positions).toEqual(before);
    };
    const initial = await positions();
    await page.getByRole('button', { name: 'Next change', exact: true }).click();
    await expect(page.getByTestId('object-query-result')).toContainText('North $150');
    await checkStable(initial);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await checkStable(initial);
    await page.getByRole('button', { name: 'Run query', exact: true }).click();
    await checkStable(initial);
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    for (let step = 0; step < objectLectures[1]!.introductions.length; step++) await page.getByRole('button', { name: step === objectLectures[1]!.introductions.length - 1 ? 'Try the changes' : 'Next', exact: true }).click();
    const prediction = await positions();
    await page.getByRole('button', { name: 'Show effect', exact: true }).click();
    await checkStable(prediction);
  }
});

test('lectures fit intermediate and short window sizes without scrolling or clipping', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  const sizes = isMobile ? [[375, 667], [390, 700]] : [[1440, 850], [1366, 820], [1280, 810], [1366, 700], [1280, 650], [1024, 700], [900, 800], [768, 700], [640, 800]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const lecture of [1, 2, 3]) {
      await page.goto(`${chapterPath}/tutorial/lecture-${lecture}`);
      for (let step = 0; step <= objectLectures[lecture - 1]!.lessons.length; step++) {
        const bounds = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, scroll: scrollY }));
        expect(bounds.height, `Lecture ${lecture}, step ${step}, ${width}×${height}`).toBeLessThanOrEqual(height!);
        expect(bounds.width).toBeLessThanOrEqual(width!);
        expect(bounds.scroll).toBe(0);
        const footer = (await page.locator('.relation-playback-controls').boundingBox())!;
        expect(footer.y + footer.height).toBeLessThanOrEqual(height!);
        for (const element of await page.locator('.flow-panel:visible, .flow-graph .table-scroll:visible').all()) {
          expect(await element.evaluate(node => node.scrollHeight <= node.clientHeight + 1), 'Graph contents must remain readable').toBe(true);
        }
        if (step < objectLectures[lecture - 1]!.lessons.length) await page.getByRole('button', { name: 'Next change', exact: true }).click();
      }
    }
  }
});

test('all pages preserve shared graph dimensions and readable content in both themes', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  for (const size of isMobile ? [{ width: 390, height: 844 }, { width: 390, height: 750 }] : [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(size);
    for (const theme of ['light', 'dark']) for (const section of ['tutorial', 'exercises']) for (const number of section === 'tutorial' ? [1, 2, 3] : [1, 2]) {
      await page.goto(`${chapterPath}/${section}/${section === 'tutorial' ? 'lecture' : 'exercise'}-${number}`);
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
      const fit = async () => {
        const bounds = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
        expect(bounds.width, `${section} ${number}, ${theme}, ${size.width} width`).toBeLessThanOrEqual(size.width);
        if (section === 'tutorial') expect(bounds.height, `${section} ${number}, ${theme}, ${size.width} height`).toBeLessThanOrEqual(size.height);
        for (const panel of await page.locator('.flow-panel:visible').all()) {
          expect(await panel.evaluate(element => element.scrollHeight <= element.clientHeight + 1), 'Node content must stay inside its boundary').toBe(true);
        }
        for (const table of await page.locator('.flow-graph .table-scroll:visible').all()) {
          expect(await table.evaluate(element => element.scrollHeight <= element.clientHeight + 1), 'Result rows must not be clipped').toBe(true);
        }
      };
      await fit();
      if (section === 'tutorial') {
        await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
        for (const [index] of objectLectures[number - 1]!.introductions.entries()) {
          const card = (await page.locator('.relation-guide-card').boundingBox())!;
          expect(card.y).toBeGreaterThanOrEqual(0);
          expect(card.y + card.height).toBeLessThanOrEqual(size.height);
          expect(card.x + card.width).toBeLessThanOrEqual(size.width);
          if (index < objectLectures[number - 1]!.introductions.length - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
        }
        await page.getByRole('button', { name: 'Close guided run', exact: true }).click();
        const initialHeight = (await page.locator('.flow-canvas').boundingBox())!.height;
        for (let step = 0; step < (number === 3 ? 6 : 5); step++) {
          await page.getByRole('button', { name: 'Next change', exact: true }).click();
          await fit();
          expect((await page.locator('.flow-canvas').boundingBox())!.height).toBe(initialHeight);
        }
        await page.getByRole('button', { name: 'Previous change', exact: true }).click();
        await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
        if (isMobile) for (const panel of ['Cluster A', 'Durable output', ...(number > 1 ? ['Cluster B'] : [])]) {
          await page.locator('.flow-overview').getByRole('button', { name: panel, exact: true }).click();
          await fit();
        }
      } else {
        for (let step = 0; step < 4; step++) {
          await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
          await fit();
          if (step < 3) await page.getByRole('button', { name: 'Next question', exact: true }).click();
        }
      }
      await page.screenshot({ path: test.info().outputPath(`${size.width}-${theme}-${section}-${number}.png`) });
    }
  }
});

test('question text and answer controls stay anchored through feedback', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  const sizes = isMobile ? [{ width: 390, height: 844 }, { width: 390, height: 664 }, { width: 375, height: 667 }]
    : [{ width: 1917, height: 893 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }];
  const positions = () => page.locator('.flow-canvas, .exercise-question, .exercise-question-copy, .exercise-question-copy h2, .exercise-question-copy p, .exercise-answers, .object-exercise-footer').evaluateAll(elements => elements.map(element => {
    const { x, y } = element.getBoundingClientRect();
    return { x, y };
  }));
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const exercise of [1, 2]) {
      await page.goto(`${chapterPath}/exercises/exercise-${exercise}`);
      await expect(page.locator('.object-exercise-workspace')).toHaveAttribute('data-aligned', 'true');
      for (let question = 0; question < 4; question++) {
        const before = await positions();
        for (const action of ['Hint', 'Check Answer', 'Show Answer']) {
          await page.getByRole('button', { name: action, exact: true }).click();
          await expect.poll(positions, `${size.width}x${size.height}, exercise ${exercise}, question ${question + 1}: ${action}`).toEqual(before);
          await expect(page.locator('.object-exercise-workspace')).toHaveAttribute('data-fits', 'true');
        }
        if (question < 3) await page.getByRole('button', { name: 'Next question', exact: true }).click();
      }
    }
  }
});
