import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blockExternalNetwork } from './helpers.mjs';

const pages = [
  ['accommodation page', '/'],
  ['booking status', '/booking-status.html']
];

for (const [name, path] of pages) {
  test(`${name} has no critical automated accessibility violations`, async ({ page }) => {
    await blockExternalNetwork(page);
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const result = await new AxeBuilder({ page }).analyze();
    const blocking = result.violations.filter(({ impact }) => impact === 'critical');
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
