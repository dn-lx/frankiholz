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


test('admin includes safe closed-booking cleanup controls', async ({ page }) => {
  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#selectAllDeletableBookings')).toHaveCount(1);
  await expect(page.locator('#deleteSelectedBookings')).toHaveCount(1);
  await expect(page.locator('#deleteSelectedBookings')).toBeDisabled();
});


test('guest rules, amenities, contact and privacy-aware map are available', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#houseRules')).toBeVisible();
  await expect(page.locator('#facilities')).toBeVisible();
  await expect(page.locator('#about')).toBeVisible();
  await expect(page.locator('#contact')).toBeVisible();
  await expect(page.locator('#fhContactPhoneLink')).toHaveAttribute('href', 'tel:+4917662493041');
  await expect(page.locator('#fhAmenitiesList')).toContainText('Wi-Fi');
  await expect(page.locator('#fhAmenitiesList')).toContainText('Laundry (additional charge)');
  await expect(page.locator('#fhMapTarget iframe')).toHaveCount(0);
  await page.locator('#fhLoadMap').click();
  await expect(page.locator('#fhMapTarget iframe')).toHaveCount(1);
  await expect(page.locator('#fhMapTarget iframe')).toHaveAttribute('src', /google\.com\/maps/);
});

test('new guest information sections follow the German language switch', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('#houseRules h3')).toHaveText('Hausregeln & wichtige Informationen');
  await expect(page.locator('#facilities h3')).toHaveText('Ausstattung & Einrichtungen');
  await expect(page.locator('#fhAmenitiesList')).toContainText('WLAN');
});

test('admin contains bilingual guest-information editor shell', async ({ page }) => {
  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#guestInfoEditor')).toHaveCount(1);
  await expect(page.locator('#saveGuestInfo')).toHaveCount(1);
});
