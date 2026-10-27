import { expect, test } from './fixtures';
import { advanceGuidedLesson, expectGuideClearOfTargets } from './guided-run';
import { readLectures, readPlaybackFrames } from '../../src/chapters/consistent-reads/lecture-scenarios';
import { readExercises } from '../../src/chapters/consistent-reads/exercise-scenarios';
import { chapterContentPath, getChapterPages } from '../../src/chapters/chapterOutline';
import { coreChapters } from '../../src/chapters/chapterRegistry';
import { LAB_PROGRESS_KEY } from '../../src/progress/labProgress';

const base = '/labs/consistent-reads';
for (const [index, lecture] of readLectures.entries()) {
  test(`Chapter 7 lecture ${index + 1}: predictions, rewind and completion`, async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${base}/tutorial/lecture-${index + 1}`);
    await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'SQL & Objectives' })).toContainText('EXPLAIN TIMESTAMP');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    for (const [step, lesson] of lecture.lessons.entries()) {
      const dialog = page.locator('.relation-guide[open]');
      await expect(dialog.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
      if (lesson.before) {
        await expect(dialog).toContainText(lesson.before);
        const before = await page.getByTestId('read-workspace').innerText();
        await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expect(dialog).toContainText(lesson.explanation);
        await dialog.getByRole('button', { name: 'Back', exact: true }).click();
        await expect(dialog).toContainText(lesson.before);
        expect(await page.getByTestId('read-workspace').innerText()).toBe(before);
        await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
      }
      await expect(dialog).toContainText(lesson.explanation);
      await expectGuideClearOfTargets(page);
      expect(await page.locator('.read-result').evaluate(element => element.scrollHeight <= element.clientHeight + 1), 'Outcome fits its reserved slot').toBe(true);
      await advanceGuidedLesson(page, step === lecture.lessons.length - 1);
    }
    await expect(page.locator('.relation-guide[open]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `Lecture ${index + 1}`, exact: true })).toHaveAttribute('aria-description', 'Tutorial completed');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.read-query')).toContainText('Not requested');
  });
}

test('Chapter 7 lecture snapshot ages stay visible in the existing result slot', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const viewports = isMobile ? [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]
    : [{ width: 1920, height: 1080 }, { width: 1280, height: 640 }, { width: 1024, height: 768 }];
  for (const viewport of viewports) for (const theme of ['light', 'dark']) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/tutorial/lecture-3`);
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
    const result = page.locator('.read-result');
    const geometry = () => result.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y + scrollY, rect.width, rect.height];
    });
    const original = await geometry();
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    await advanceGuidedLesson(page);
    const dialog = page.locator('.relation-guide[open]');
    for (const age of [2, 5, 8]) {
      await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
      await dialog.getByRole('button', { name: 'Query outcome', exact: true }).click();
      const ageLabel = result.locator('.read-snapshot-age');
      await expect(ageLabel).toBeVisible();
      await expect(ageLabel).toHaveText(`Snapshot age: ${age} s`);
      const headingFits = await result.locator('.read-result-heading').evaluate(heading => {
        const status = heading.querySelector('strong')!.getBoundingClientRect();
        const age = heading.querySelector('.read-snapshot-age')!.getBoundingClientRect();
        const panel = heading.closest('.read-result')!.getBoundingClientRect();
        return status.right <= age.left && age.right <= panel.right && age.bottom <= panel.bottom;
      });
      expect(headingFits, 'The age and status remain readable without overlapping').toBe(true);
      const current = await geometry();
      current.forEach((value, index) => expect(value).toBeCloseTo(original[index]!, 1));
      expect(await result.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      await expectGuideClearOfTargets(page);
      if (age < 8) await advanceGuidedLesson(page);
    }
    await dialog.getByRole('button', { name: 'Close guided run', exact: true }).click();
  }
});

test('Chapter 7 cursor boundaries, diagram key, tour pause and normal playback', async ({ page }) => {
  const total = readPlaybackFrames(readLectures[0]!).length;
  await page.clock.install();
  await page.goto(`${base}/tutorial/lecture-1`);
  const slider = page.getByRole('slider', { name: 'Requested logical timestamp' });
  for (const [time, outcome] of [['4', 'Too old'], ['7', 'Available'], ['8', 'Waiting']] as const) {
    await slider.fill(time);
    await expect(page.locator('.read-result-heading')).toContainText(outcome);
  }
  await page.getByRole('button', { name: 'Diagram key', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Readable-window diagram key' })).toContainText('right boundary is excluded');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('button', { name: 'Lecture controls walkthrough' }).click();
  await page.clock.fastForward(10000);
  await expect(page.locator('.guided-lab-progress strong')).toHaveText(`0 / ${total}`);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (let step = 1; step <= total; step++) {
    await page.clock.fastForward(2200);
    await expect(page.locator('.guided-lab-progress strong')).toHaveText(`${step} / ${total}`);
  }
  await expect(page.locator('.guided-lab-progress strong')).toHaveText(`${total} / ${total}`);
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).not.toHaveAttribute('aria-description', 'Tutorial completed');
});

test('Chapter 7 keeps native keyboard controls and diagram structure in both themes and sidebar modes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/tutorial/lecture-1`);
  const slider = page.getByRole('slider', { name: 'Requested logical timestamp' });
  for (const theme of ['dark', 'light']) {
    await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
    for (const collapsed of [true, false]) {
      await page.getByRole('button', { name: collapsed ? 'Collapse chapter navigation' : 'Expand chapter navigation', exact: true }).click();
      await slider.fill('7');
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('.read-result-heading')).toContainText('Waiting');
      await expect(page.getByTestId('read-input-payments')).toHaveAttribute('aria-label', /retained from 5; complete before 8/);
      const reference = await page.getByTestId('read-diagram').boundingBox();
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      expect(await page.getByTestId('read-diagram').boundingBox()).toEqual(reference);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
  }
});

test('Chapter 7 manual playback only visits visible changes and restores them backwards', async ({ page }) => {
  test.setTimeout(90000);
  await page.clock.install();
  for (const [index, lecture] of readLectures.entries()) {
    const total = readPlaybackFrames(lecture).length;
    await page.goto(`${base}/tutorial/lecture-${index + 1}`);
    const workspace = page.getByTestId('read-workspace');
    const tracker = page.locator('.guided-lab-progress strong');
    const states = [await workspace.innerText()];
    for (let step = 1; step <= total; step++) {
      await page.getByRole('button', { name: 'Next change', exact: true }).click();
      await expect(tracker).toHaveText(`${step} / ${total}`);
      const visible = await workspace.innerText();
      expect(visible, 'Each manual step changes the visible workspace').not.toBe(states.at(-1));
      states.push(visible);
    }
    await expect(page.getByRole('button', { name: 'Next change', exact: true })).toBeDisabled();
    for (let step = total - 1; step >= 0; step--) {
      await page.getByRole('button', { name: 'Previous change', exact: true }).click();
      await expect(tracker).toHaveText(`${step} / ${total}`);
      expect(await workspace.innerText()).toBe(states[step]);
    }
    await expect(page.getByRole('button', { name: 'Previous change', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    for (let step = 1; step <= total; step++) {
      await page.clock.fastForward(2200);
      await expect(tracker).toHaveText(`${step} / ${total}`);
      expect(await workspace.innerText()).toBe(states[step]);
    }
    // Trailing guided explanations must not keep autoplay running at its final state.
    await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(tracker).toHaveText(`0 / ${total}`);
    await page.clock.fastForward(2200);
    await expect(tracker).toHaveText(`1 / ${total}`);
  }
});

for (const [index, exercise] of readExercises.entries()) {
  test(`Chapter 7 exercise ${index + 1}: assessment, hints, reset and completion`, async ({ page }) => {
    if (index === 2) {
      const chapter = coreChapters.find(item => item.slug === 'consistent-reads')!;
      await page.addInitScript(({ key, completed }) => localStorage.setItem(key, JSON.stringify({ version: 1, completed })), {
        key: LAB_PROGRESS_KEY,
        completed: getChapterPages(chapter).map(activity => chapterContentPath(chapter, activity)).filter(path => path !== `${base}/exercises/${exercise.slug}`),
      });
    }
    await page.goto(`${base}/exercises/${exercise.slug}`);
    const diagram = await page.getByTestId('read-diagram').boundingBox();
    await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
    await expect(page.locator('.read-result')).toHaveAttribute('data-status', 'prediction');
    await page.getByRole('button', { name: 'Hint', exact: true }).click();
    await expect(page.locator('.exercise-question-copy')).toContainText(exercise.questions[0]!.hint);
    expect(await page.getByTestId('read-diagram').boundingBox()).toEqual(diagram);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    if (index === 0) {
      await page.getByRole('textbox', { name: 'Logical timestamp' }).fill('8');
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.read-query')).toContainText('8');
      await expect(page.locator('.read-result-heading')).toContainText('Available');
    }
    for (const [step] of exercise.questions.entries()) {
      if (!(index === 0 && step === 0)) await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
      expect(await page.locator('.exercise-question').evaluate(element => element.scrollHeight <= element.clientHeight + 1), 'Question and feedback fit the reserved region').toBe(true);
      expect(await page.getByTestId('read-diagram').boundingBox()).toEqual(diagram);
      if (index !== 2 || step !== exercise.questions.length - 1) await page.getByRole('button', { name: step === exercise.questions.length - 1 ? `Exercise ${index + 2}` : 'Next question', exact: true }).click();
    }
    if (index < 2) await expect(page).toHaveURL(`${base}/exercises/exercise-${index + 2}`);
    else {
      await expect(page.getByRole('dialog', { name: 'You finished Chapter 7' })).toBeVisible();
      await page.getByRole('button', { name: 'Go to next chapter' }).click();
      await expect(page).toHaveURL('/labs/live-applications-subscribe');
    }
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1280, height: 640 }]) {
  test(`Chapter 7 laptop exercises stay visible without scrolling at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let reference: number[][] | undefined;
    const checkFit = async () => {
      const regions = page.locator('.read-query, .read-diagram, .read-result, .exercise-question, .relation-playback-controls');
      const boxes = await regions.evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect();
        return [rect.x, rect.y, rect.width, rect.height];
      }));
      expect(boxes).toHaveLength(5);
      for (const [x, y, width, height] of boxes) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x! + width!).toBeLessThanOrEqual(viewport.width + 1);
        expect(y! + height!).toBeLessThanOrEqual(viewport.height + 1);
      }
      if (reference) boxes.forEach((box, i) => box.forEach((value, j) => expect(Math.abs(value - reference![i]![j]!)).toBeLessThanOrEqual(1)));
      else reference = boxes;
      expect(await regions.evaluateAll(elements => elements.every(element => element.scrollHeight <= element.clientHeight + 1)), 'All text fits without internal scrolling').toBe(true);
      await expect(page.getByRole('button', { name: /^(Show diagram|Show question|View tables|View question)$/i })).toHaveCount(0);
      const answers = page.locator('.exercise-answers :is(input,select,button)');
      for (const answer of await answers.all()) await expect(answer).toBeInViewport({ ratio: 1 });
    };
    for (const [index, exercise] of readExercises.entries()) {
      await page.goto(`${base}/exercises/${exercise.slug}`);
      await page.getByTestId('read-diagram').waitFor();
      await page.evaluate(() => document.fonts.ready);
      for (const [step] of exercise.questions.entries()) {
        await checkFit();
        await page.getByRole('button', { name: 'Hint', exact: true }).click();
        await checkFit();
        await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
        await checkFit();
        await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
        await checkFit();
        const next = page.getByRole('button', { name: step === exercise.questions.length - 1 ? index === 2 ? 'Finish chapter' : `Exercise ${index + 2}` : 'Next question', exact: true });
        await expect(next).toBeInViewport({ ratio: 1 });
        const nextBox = (await next.boundingBox())!;
        const questionBox = (await page.locator('.exercise-question').boundingBox())!;
        expect(nextBox.y - questionBox.y - questionBox.height, 'Navigation stays below the question').toBeGreaterThanOrEqual(5);
        await page.locator('.read-diagram').hover();
        await page.mouse.wheel(0, 600);
        await page.locator('h1').click();
        await page.keyboard.press('PageDown');
        expect(await page.evaluate(() => scrollY)).toBe(0);
        if (step < exercise.questions.length - 1) await next.click();
      }
    }
  });
}

test('Chapter 7 timeline marks match Chapter 6 in both themes and screen sizes', async ({ page }) => {
  const styles = async (selectors: readonly string[]) => Promise.all(selectors.map(selector => page.locator(selector).first().evaluate(element => {
    const css = getComputedStyle(element);
    const properties = ['height', 'background-color', 'border-top-color', 'border-top-width', 'border-radius', 'font-size', 'font-weight', 'color'];
    if (element.classList.contains('timeline-frontier') || element.classList.contains('timeline-gridline')) properties.push('width');
    return Object.fromEntries(properties.map(property => [property, css.getPropertyValue(property)]));
  })));
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      await page.goto('/labs/progress-and-freshness/tutorial/lecture-1');
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
      const reference = await styles(['.progress-track', '.progress-complete', '.progress-frontier', '.progress-gridline', '.progress-frontier .timeline-value']);
      for (const activity of ['tutorial/lecture-1', 'exercises/exercise-1']) {
        await page.goto(`${base}/${activity}`);
        await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
        expect(await styles(['.read-track', '.read-complete', '.read-write-marker', '.read-track .timeline-gridline', '.read-write-marker .timeline-value'])).toEqual(reference);
        await expect(page.locator('.read-write-marker .timeline-value')).toHaveText(activity.startsWith('tutorial') ? ['10', '8'] : ['13', '11']);
        await expect(page.locator('.read-track').first().locator('.timeline-gridline')).toHaveCount(6);
      }
    }
  }
});

test('Chapter 7 reuses diagram geometry across all six activities and feedback states', async ({ page }) => {
  test.setTimeout(120000);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 390, height: 664 }]) {
    await page.setViewportSize(viewport);
    let lectureGeometry: number[] | undefined;
    let exerciseGeometry: number[] | undefined;
    for (const section of ['tutorial', 'exercises']) for (let index = 1; index <= 3; index++) {
      await page.goto(`${base}/${section}/${section === 'tutorial' ? 'lecture' : 'exercise'}-${index}`);
      await page.getByTestId('read-diagram').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.locator('.read-diagram').evaluate(element => {
        const r = element.getBoundingClientRect();
        const axis = element.querySelector('.read-axis')!.getBoundingClientRect();
        const lane = element.querySelector('.read-lane')!.getBoundingClientRect();
        return [r.x, r.y + scrollY, r.width, r.height, axis.x, lane.height];
      });
      const reference = section === 'tutorial' ? lectureGeometry : exerciseGeometry;
      if (reference) geometry.forEach((value, i) => expect(Math.abs(value - reference[i]!)).toBeLessThanOrEqual(1));
      if (section === 'tutorial') lectureGeometry ??= geometry;
      else {
        exerciseGeometry ??= geometry;
        // The same component supplies all diagram dimensions in both frames.
        for (const i of [0, 2, 3, 4, 5]) expect(Math.abs(geometry[i]! - lectureGeometry![i]!)).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      const fit = await page.locator('.read-result').evaluate(element => element.scrollHeight <= element.clientHeight + 1);
      expect(fit, 'Outcome text fits its reserved slot').toBe(true);
    }
  }
});
