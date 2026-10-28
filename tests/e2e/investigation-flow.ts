import type { Page } from '@playwright/test';
import { expect } from './fixtures';
export const predicate = "o.status = 'paid' AND mz_now() >= o.event_at AND mz_now() < o.event_at + INTERVAL '5 minutes'";
export async function workspace(page: Page, name: string) { await page.getByRole('navigation', { name: 'Investigation workspaces' }).getByRole('button', { name, exact: true }).click(); }
export async function start(page: Page) { await page.getByRole('button', { name: 'Start investigation', exact: true }).click(); }
export async function repairQuery(page: Page, sql = predicate) {
  await workspace(page, 'SQL');
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill(sql);
  await page.getByRole('button', { name: 'Run SQL', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Deploy query', exact: true })).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: 'Deploy query', exact: true }).click();
}
export async function restoreServing(page: Page) {
  await workspace(page, 'System');
  const resume = page.getByRole('button', { name: 'Resume customer connection', exact: true });
  if (await resume.count()) await resume.click();
  const next = page.getByRole('button', { name: 'Next event', exact: true });
  if (await next.isEnabled()) await next.click();
  await page.getByRole('button', { name: 'Request normal read', exact: true }).click();
  await expect(page.getByText('Normal read available', { exact: true })).toBeVisible();
}
export async function repairClient(page: Page) {
  await workspace(page, 'Client');
  await page.getByRole('combobox', { name: 'Publish application updates', exact: true }).selectOption('complete');
}
export async function handover(page: Page) {
  await page.getByRole('button', { name: 'Submit handover', exact: true }).click();
  await page.getByRole('button', { name: 'Run acceptance checks', exact: true }).click();
  await expect(page.getByText(/^Passed ·/)).toHaveCount(5, { timeout: 45000 });
  await page.getByRole('textbox', { name: 'Explain what caused the discrepancy and how you repaired it', exact: true }).fill('The query expired orders by arrival time. I corrected it using event time, restored customer progress, and buffered complete subscription timestamps.');
  await page.getByRole('button', { name: 'Complete handover', exact: true }).click();
}
export async function completeInvestigation(page: Page, reverse = false) {
  await start(page);
  if (reverse) { await repairClient(page); await restoreServing(page); }
  await repairQuery(page);
  if (!reverse) await repairClient(page);
  await restoreServing(page);
  await workspace(page, 'Client');
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Next delivery', exact: true }).click();
  await expect(page.getByTestId('subscribe-application')).toContainText('90');
  await handover(page);
}
