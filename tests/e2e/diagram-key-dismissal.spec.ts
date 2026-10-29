import { expect, test } from './fixtures';

test.use({ reducedMotion: 'reduce' });

const activities = [
  ['progress-and-freshness', 'tutorial/lecture-1', 'Diagram key'],
  ['progress-and-freshness', 'exercises/exercise-1', 'Diagram key'],
  ['consistent-reads', 'tutorial/lecture-1', 'Diagram key'],
  ['consistent-reads', 'exercises/exercise-1', 'Diagram key'],
  ['live-applications-subscribe', 'tutorial/lecture-1', 'Timestamp-tray diagram key'],
] as const;

for (const [chapter, activity, title] of activities) {
  test(`${chapter}/${activity}: diagram key closes only on a deliberate outside click`, async ({ page, isMobile }) => {
    const path = `/labs/${chapter}/${activity}`;
    await page.goto(path);
    const progress = page.locator('#main-content .guided-lab-progress');
    if (activity.startsWith('tutorial')) {
      await page.clock.install();
      await page.getByRole('button', { name: 'Run', exact: true }).click();
      await page.clock.fastForward(2200);
    }
    const key = page.getByRole('button', { name: 'Diagram key', exact: true });
    await key.click();
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toBeVisible();
    const before = await progress.textContent();
    if (activity.startsWith('tutorial')) {
      await page.clock.fastForward(6600);
      await expect(progress).toHaveText(before!);
    }

    await dialog.getByRole('heading', { name: title, exact: true }).click();
    await expect(dialog).toBeVisible();
    const bounds = (await dialog.boundingBox())!;
    await page.mouse.move(bounds.x + 30, bounds.y + 30);
    await page.mouse.down();
    await page.mouse.move(3, 3);
    await page.mouse.up();
    await expect(dialog).toBeVisible();

    if (isMobile) await page.touchscreen.tap(3, 3);
    else await page.mouse.click(3, 3);
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole('tooltip')).not.toBeVisible();
    await expect(progress).toHaveText(before!);
    if (activity.startsWith('tutorial')) {
      await page.clock.fastForward(4400);
      await expect(progress).toHaveText(before!);
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
    }

    await key.click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await key.click();
    await dialog.getByRole('button', { name: `Close ${title}`, exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });
}
