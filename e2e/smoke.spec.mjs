import { test, expect } from '@playwright/test';
import { blockExternalNetwork } from './helpers.mjs';

test.beforeEach(async ({ page }) => blockExternalNetwork(page));

test('public accommodation page renders core booking information', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/FrankiHolz/);
  await expect(page.locator('body')).toContainText('FrankiHolz');
  await expect(page.locator('#bookingStatusSection')).toBeVisible();
});

test('booking status page renders without submitting a lookup', async ({ page }) => {
  await page.goto('/booking-status.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#ref')).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.getByRole('button', { name: /Check status/ })).toBeVisible();
});
