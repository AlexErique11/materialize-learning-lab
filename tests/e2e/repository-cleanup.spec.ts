import { expect, test } from './fixtures';

test('homepage keeps progress placeholders while missing activities reserve empty space', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto('/');
    await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
    await expect(page.getByRole('progressbar', { name: 'Core chapters completed' })).toHaveAttribute('value', '0');
    await expect(page.getByRole('progressbar', { name: 'Core chapters completed' })).toHaveAttribute('max', '7');
    await expect(page.getByRole('progressbar', { name: 'Featured challenges completed' })).toHaveAttribute('value', '0');
    await expect(page.getByRole('heading', { name: 'Track your progress' })).toBeVisible();
    await expect(page.getByText('Not started', { exact: true })).toHaveCount(2);

    await page.goto('/labs/progress-and-freshness/tutorial');
    await expect(page.getByRole('heading', { name: 'Tutorial', exact: true })).toBeVisible();
    await expect(page.locator('.guided-lab-canvas')).toBeEmpty();
    await expect(page.locator('.reserved-controls')).toHaveAttribute('inert', '');
    await expect(page.locator('.guided-lab-heading').getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Reset|Run|SQL & Objectives/ })).toHaveCount(0);
    const sidebarProgress = page.locator('.sidebar-progress').first();
    await expect(sidebarProgress.locator('progress')).toHaveAttribute('aria-label', 'Core chapters completed');
    await expect(sidebarProgress.locator('progress')).toHaveAttribute('value', '0');
    await expect(sidebarProgress.locator('progress')).toHaveAttribute('max', '7');
    await expect(sidebarProgress).toHaveText('0/7 completed');
    await expect(page.locator('.desktop-sidebar .chapter-links > li')).toHaveCount(7);
    await expect(page.getByText('Optional · advanced', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/To be done|0 \/ 4/)).toHaveCount(0);

    await page.goto('/labs/changing-relations/tutorial/lecture-1');
    const reference = page.getByRole('button', { name: 'SQL & Objectives', exact: true });
    await reference.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'SQL & Objectives' })).toContainText('SUBSCRIBE products;');
    await page.keyboard.press('Escape');
    await expect(reference).toBeFocused();
    await expect(page.getByRole('progressbar', { name: 'Changes progress' })).toBeVisible();
  }
});

test('regional revenue renders customer keys and highlights retained customer matches', async ({ page }) => {
  await page.goto('/labs/incremental-maintenance/exercises/exercise-3');
  const orders = page.getByRole('list', { name: 'Shared input orders' });
  await expect(orders.getByRole('listitem').first()).toHaveAttribute('aria-label', 'order_id 101; customer_id 7; amount $30');
  await expect(orders).toContainText('Customer 7');
  await expect(orders).not.toContainText('Product');
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(orders.locator('[data-affected="true"]')).toHaveCount(2);
  await expect(orders).toContainText('Customer 7 · South');
});
