import { expect, seedChapterPrerequisites, test } from './fixtures';
import { advanceGuidedLesson, expectGuideClearOfTargets } from './guided-run';
import { subscriptionFrames, subscriptionLectures } from '../../src/chapters/live-applications-subscribe/lecture-scenarios';
import { solutionFor, subscriptionExercises } from '../../src/chapters/live-applications-subscribe/exercise-scenarios';

const base = '/labs/live-applications-subscribe';
test('Chapter 8 guided references have distinct variable colors in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto(`${base}/tutorial/lecture-2`);
    const themeToggle = page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true });
    if (await themeToggle.count()) await themeToggle.click();
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    const guide = page.locator('.relation-guide[open]');
    const colors = await guide.locator('.subscribe-lesson-text [data-column]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-column'), getComputedStyle(element).color])));
    expect(new Set([colors.region, colors.orders, colors.total]).size).toBe(3);
    expect([colors.region, colors.orders, colors.total]).not.toContain(undefined);
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
    const negative = guide.locator('.relation-inline-negative').first();
    await expect(negative).toHaveText('−1');
    expect(await negative.evaluate(element => getComputedStyle(element).color)).toBe(await page.locator('.subscribe-table [data-sign="negative"]').evaluate(element => getComputedStyle(element).color));
    await page.keyboard.press('Escape');
  }
});

for (const [index, lecture] of subscriptionLectures.entries()) {
  test(`Chapter 8 lecture ${index + 1}: predict, reveal, rewind, and complete`, async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${base}/tutorial/lecture-${index + 1}`);
    await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toContainText('SUBSCRIBE open_order_totals');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
    for (const [step, lesson] of lecture.lessons.entries()) {
      const dialog = page.locator('.relation-guide[open]');
      await expect(dialog.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
      if (lesson.before) {
        const before = await page.getByTestId('subscribe-workspace').innerText();
        await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expect(dialog).toContainText(lesson.explanation);
        await dialog.getByRole('button', { name: 'Back', exact: true }).click();
        expect(await page.getByTestId('subscribe-workspace').innerText()).toBe(before);
        await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
      }
      await expectGuideClearOfTargets(page);
      await advanceGuidedLesson(page, step === lecture.lessons.length - 1);
    }
    await expect(page.locator('.relation-guide[open]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `Lecture ${index + 1}`, exact: true })).toHaveAttribute('aria-description', 'Tutorial completed');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.guided-lab-progress strong')).toContainText('0 /');
  });
}

for (const [index, exercise] of subscriptionExercises.entries()) {
  test(`Chapter 8 exercise ${index + 1}: assessment, hints, real solutions, and completion`, async ({ page }) => {
    if (index === 2) await seedChapterPrerequisites(page, `${base}/exercises/${exercise.slug}`);
    await page.goto(`${base}/exercises/${exercise.slug}`);
    await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
    await page.getByRole('button', { name: 'Hint', exact: true }).click();
    await expect(page.locator('.exercise-question-copy')).toContainText(exercise.questions[0]!.hint);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    for (const [step, question] of exercise.questions.entries()) {
      const solution = solutionFor(question);
      for (const group of question.groups) {
        const input = page.getByRole(group.kind === 'integer' ? 'textbox' : 'combobox', { name: group.label, exact: true });
        if (group.kind === 'integer') await input.fill(solution[group.id]!);
        else await input.selectOption(solution[group.id]!);
      }
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
      await expect(page.locator('.exercise-question-copy')).toContainText(question.explanation);
      if (step < exercise.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
      else if (index < 2) {
        await page.getByRole('button', { name: `Exercise ${index + 2}`, exact: true }).click();
        await expect(page).toHaveURL(`${base}/exercises/exercise-${index + 2}`);
      }
    }
    if (index === 2) {
      const completion = page.getByRole('dialog', { name: 'You finished Chapter 8', exact: true });
      await expect(completion).toBeVisible();
      await expect(completion).toHaveClass(/chapter-completion-dialog/);
      await expect(completion.locator('.chapter-completion-topics section')).toHaveCount(3);
      await expect(completion.locator('.chapter-completion-art')).toHaveJSProperty('naturalWidth', 1200);
      const dialogBox = await completion.boundingBox();
      const returnButton = await completion.getByRole('button', { name: 'Return to learning path', exact: true }).boundingBox();
      expect(returnButton!.y + returnButton!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height);
      expect(returnButton!.y + returnButton!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await page.screenshot({ path: test.info().outputPath('chapter-eight-completion.png') });
      await page.getByRole('button', { name: 'Return to learning path', exact: true }).click();
      await expect(page).toHaveURL('/');
    }
  });
}

test('Chapter 8 playback, keyboard, help, history, and reset', async ({ page }) => {
  await page.clock.install();
  await page.goto(`${base}/tutorial/lecture-3`);
  const original = await page.getByTestId('subscribe-application').innerText();
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Completeness boundary', exact: true })).toContainText('Complete before 12');
  await expect(page.getByTestId('subscribe-application')).toContainText('100');
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect(await page.getByTestId('subscribe-application').innerText()).toBe(original);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  const referenceStep = await page.locator('.guided-lab-progress strong').innerText();
  await page.clock.fastForward(10000);
  await expect(page.locator('.guided-lab-progress strong')).toHaveText(referenceStep);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('button', { name: 'Diagram key', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Timestamp-tray diagram key' })).toContainText('Timestamp T itself stays open');
  const paused = await page.locator('.guided-lab-progress strong').innerText();
  await page.clock.fastForward(10000);
  await expect(page.locator('.guided-lab-progress strong')).toHaveText(paused);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (let step = 1; step <= subscriptionFrames(subscriptionLectures[2]!).length; step++) {
    await page.clock.fastForward(2200);
    await expect(page.locator('.guided-lab-progress strong')).toHaveText(`${step} / ${subscriptionFrames(subscriptionLectures[2]!).length}`);
  }
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  const picker = page.getByRole('combobox', { name: 'Completed timestamp group', exact: true });
  await picker.selectOption('10');
  await expect(page.getByRole('region', { name: 'Complete timestamp tray', exact: true })).toContainText('t = 10');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Next change', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('region', { name: 'Pending timestamp tray', exact: true })).toContainText('t = 12');
});

test('Chapter 8 SQL and baseline messages follow the selected example', async ({ page }) => {
  await page.goto(`${base}/exercises/exercise-1`);
  for (let question = 0; question < 3; question++) {
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    await page.getByRole('button', { name: 'Next question', exact: true }).click();
  }
  await expect(page.getByRole('region', { name: 'Completeness boundary', exact: true })).toContainText('The initial snapshot is disabled');
  await expect(page.getByRole('region', { name: 'Pending timestamp tray', exact: true })).not.toContainText('Snapshot starts');
  await expect(page.getByTestId('subscribe-application')).toContainText('No initial baseline');
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toContainText('SNAPSHOT = false, PROGRESS = true');
  await page.keyboard.press('Escape');

  await page.goto(`${base}/tutorial/lecture-2`);
  for (const _frame of subscriptionFrames(subscriptionLectures[1]!)) await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Subscription settings', exact: true })).toContainText('row_copies');
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  const reference = page.getByRole('dialog', { name: 'SQL & Objectives', exact: true });
  await expect(reference).toContainText('CREATE TABLE row_copies');
  await expect(reference).toContainText('SUBSCRIBE row_copies');
  await expect(reference).not.toContainText('GROUP BY region');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 640 }]) {
  test(`Chapter 8 uses the shared chapter frame at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const activity of ['tutorial/lecture-1', 'exercises/exercise-1']) {
      let reference: number[] | undefined;
      for (const chapter of ['consistent-reads', 'live-applications-subscribe']) {
        await page.goto(`/labs/${chapter}/${activity}`);
        const geometry = await page.locator('.guided-lab-page').evaluate(element => {
          const title = element.querySelector('h1')!.getBoundingClientRect();
          const sql = element.querySelector('[data-walkthrough="sql"]')!;
          const button = sql.getBoundingClientRect();
          const playback = element.querySelector('.lecture-workspace > .relation-playback-controls')!.getBoundingClientRect();
          return [title.x, title.y, title.height, parseFloat(getComputedStyle(element.querySelector('h1')!).fontSize), button.y, button.height, parseFloat(getComputedStyle(sql).fontSize), playback.right, playback.bottom];
        });
        if (reference) for (const [index, value] of geometry.entries()) expect(value).toBeCloseTo(reference[index]!, 0);
        reference = geometry;
      }
    }
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1477, height: 691 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1280, height: 640 }, { width: 870, height: 668 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
  test(`Chapter 8 shared tray layout at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const theme of ['dark', 'light']) {
      for (const section of ['tutorial', 'exercises']) {
        let geometry: number[] | undefined;
        for (let index = 1; index <= 3; index++) {
          await page.goto(`${base}/${section}/${section === 'tutorial' ? 'lecture' : 'exercise'}-${index}`);
          const toggle = page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true });
          if (await toggle.count()) await toggle.click();
          const diagram = page.getByTestId('subscribe-diagram');
          const showsFlow = section === 'tutorial' || (viewport.width >= 768 && !(viewport.width <= 1000 && viewport.height <= 740));
          await expect(page.locator('.subscribe-flow-arrow')).toHaveCount(2);
          if (showsFlow) await expect(page.locator('.subscribe-strip')).toBeVisible();
          else await expect(page.locator('.subscribe-strip')).toBeHidden();
          if (section === 'exercises') {
            await expect(page.getByRole('button', { name: /diagram|view tables/i })).toHaveCount(0);
            if (!showsFlow) await expect(page.locator('.subscribe-assessment-source')).toBeVisible();
            else await expect(page.locator('.subscribe-assessment-source')).toBeHidden();
          }
          await expect(page.getByRole('img', { name: 'Completed changes flow into the application on progress' })).toBeVisible();
          const flow = await page.locator('.subscribe-strip:visible > *').evaluateAll(elements => elements.map(element => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          }));
          for (const node of showsFlow ? [flow[2]!, flow[4]!] : []) {
            expect(node.width).toBeCloseTo(flow[0]!.width, 0);
            expect(node.height).toBe(flow[0]!.height);
          }
          for (const arrow of showsFlow ? [flow[1]!, flow[3]!] : []) {
            if (viewport.width >= 768) expect(arrow.y + arrow.height / 2).toBeCloseTo(flow[0]!.y + flow[0]!.height / 2, 0);
            else expect(arrow.x + arrow.width / 2).toBeCloseTo(flow[0]!.x + flow[0]!.width / 2, 0);
          }
          const tables = await page.locator('.subscribe-tray .subscribe-table').evaluateAll(elements => elements.map(element => {
            const { y, width, height } = element.getBoundingClientRect();
            return { y, width, height };
          }));
          expect(tables[0]!.width).toBeCloseTo(tables[1]!.width, 0);
          expect(tables[0]!.height).toBe(tables[1]!.height);
          if (viewport.width >= 768) expect(tables[0]!.y).toBe(tables[1]!.y);
          const bounds = await diagram.boundingBox();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          const current = [bounds!.x, bounds!.y, bounds!.width, bounds!.height];
          if (geometry) expect(current).toEqual(geometry);
          geometry = current;
          if (index === 3) await page.screenshot({ path: testInfo.outputPath(`${section}-${theme}.png`), fullPage: true });
          if (viewport.width === 870 && section === 'tutorial') {
            expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
            await expect(page.getByRole('button', { name: 'Next change', exact: true })).toBeInViewport();
          }
          if (viewport.width >= 768) {
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
            if (section === 'exercises') {
              await expect(page.getByRole('button', { name: 'Check Answer', exact: true })).toBeInViewport();
              for (let step = 0; step < subscriptionExercises[index - 1]!.questions.length; step++) {
                const question = await page.locator('.exercise-question').boundingBox();
                expect(question!.y + question!.height).toBeLessThanOrEqual(viewport.height);
                expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
                expect(await page.locator('.exercise-question').evaluate(element => Array.from(element.children).every(child => child.getBoundingClientRect().top >= element.getBoundingClientRect().top && child.getBoundingClientRect().bottom <= element.getBoundingClientRect().bottom))).toBe(true);
                const fields = await page.locator('.subscribe-answer-group input').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().bottom));
                if (fields.length > 1) expect(fields[1]).toBeCloseTo(fields[0]!, 0);
                const panel = await page.locator('.exercise-question').boundingBox();
                expect(panel!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
                expect(panel!.x).toBeCloseTo(bounds!.x, 0);
                expect(panel!.width).toBeCloseTo(bounds!.width, 0);
                await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
                expect(await diagram.boundingBox()).toEqual(bounds);
                const accepted = await page.locator('.exercise-question').boundingBox();
                expect(accepted!.y + accepted!.height).toBeLessThanOrEqual(viewport.height);
                expect(await page.locator('.exercise-question').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
                expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
                const next = page.locator('[data-shortcut="exercise-forward"]');
                await expect(next).toBeInViewport();
                if (step < subscriptionExercises[index - 1]!.questions.length - 1) await next.click();
              }
            }
          }
        }
      }
    }
  });
}
