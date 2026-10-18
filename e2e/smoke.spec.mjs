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


test('guest rules, amenities, contact and visible location map are available', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#houseRules')).toBeVisible();
  await expect(page.locator('#facilities')).toBeVisible();
  await expect(page.locator('#about')).toBeVisible();
  await expect(page.locator('#contact')).toBeVisible();
  await expect(page.locator('#fhContactPhoneLink')).toHaveAttribute('href', 'tel:+4917662493041');
  await expect(page.locator('#fhWhatsappLink')).toBeVisible();
  await expect(page.locator('#fhWhatsappLink')).toHaveText('');
  await expect(page.locator('#fhWhatsappLink img')).toHaveCount(1);
  await expect(page.locator('#fhWhatsappLink img')).toHaveAttribute('src','/assets/whatsapp.svg?v=20261011b');
  await expect(page.locator('#fhWhatsappLink img')).toHaveAttribute('alt','');
  await expect(page.locator('#fhWhatsappLink')).toHaveAttribute('aria-label','Message FrankiHolz on WhatsApp');
  await expect(page.locator('#fhWhatsappLink')).toHaveAttribute('href','https://wa.me/4917662493041');
  await expect(page.locator('#fhWhatsappLink')).toHaveAttribute('target','_blank');
  await expect(page.locator('#guestLanguages')).toHaveAttribute('placeholder','English, German');
  await expect(page.locator('#fhAmenitiesList')).toContainText('Wi-Fi');
  await expect(page.locator('#fhAmenitiesList')).toContainText('Laundry (additional charge)');
  await expect(page.locator('#fhMapTarget iframe')).toHaveCount(1);
  await expect(page.locator('#fhMapTarget iframe')).toHaveAttribute('loading', 'lazy');
  await expect(page.locator('#fhMapTarget iframe')).toHaveAttribute('src', /google\.com\/maps/);
  await expect(page.locator('#fhLoadMap')).toHaveCount(0);
  await expect(page.locator('.fh-directions-link')).toHaveAttribute('href', /maps\/search/);
});

test('new guest information sections follow the German language switch', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('#houseRules h3')).toHaveText('Hausregeln & wichtige Informationen');
  await expect(page.locator('#facilities h3')).toHaveText('Ausstattung & Einrichtungen');
  await expect(page.locator('#fhAmenitiesList')).toContainText('WLAN');
  await expect(page.locator('#fhWhatsappLink')).toHaveAttribute('aria-label','FrankiHolz über WhatsApp kontaktieren');
});

test('admin contains bilingual guest-information editor shell', async ({ page }) => {
  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#guestInfoEditor')).toHaveCount(1);
  await expect(page.locator('#saveGuestInfo')).toHaveCount(1);
});

test('Stripe environment control renders only once even if the script loads again', async ({ page }) => {
  await page.goto('/admin.html#integrations', { waitUntil: 'domcontentloaded' });
  const panels = page.locator('[data-admin-panel="integrations"] [data-stripe-environment-panel]');
  await expect(panels).toHaveCount(1);
  await expect(page.locator('#stripeEnvironmentToggle')).toHaveCount(1);
  await page.addScriptTag({ url: '/assets/payment-environment-admin.js?duplicate-check=1' });
  await expect(panels).toHaveCount(1);
  await expect(page.locator('#stripeEnvironmentToggle')).toHaveCount(1);
  await expect(page.locator('script[src*="/assets/payment-environment-admin.js"]')).toHaveCount(2);
});

test('location map and section headings are bilingual', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('.fh-location-map-heading h3')).toHaveText('Unser Standort auf der Karte');
  await expect(page.locator('.fh-map-disclosure')).toContainText('Google Maps');
});

test('WhatsApp contact uses the Admin-managed international number', async ({ page }) => {
  await page.addInitScript(() => {
    const data = [{copy_key:'fhContactPhone',text_en:'+49 170 1234 567',text_de:'+49 170 1234 567'}];
    window.supabase = {createClient:()=>({
      from(table){
        const result=table==='frankiholz_copy'?data:[];
        const q={
          select(){return this},eq(){return this},order(){return this},
          maybeSingle(){return Promise.resolve({data:null,error:null})},
          in(){return Promise.resolve({data:result,error:null})},
          then(resolve,reject){return Promise.resolve({data:result,error:null}).then(resolve,reject)}
        };
        return q;
      },
      rpc:async()=>({data:[],error:null}),
      auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}
    })};
  });
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#fhContactPhoneLink')).toHaveText('+49 170 1234 567');
  await expect(page.locator('#fhWhatsappLink')).toHaveAttribute('href','https://wa.me/491701234567');
});


test('removed payment-gateway notice stays absent across pages and languages', async ({ page }) => {
  // The global external-network blocker also blocks the Supabase CDN. Mock it
  // so site.js initializes and its DE/EN switch can run without backend writes.
  await page.addInitScript(() => {
    window.supabase = {createClient:()=>({
      from(){return {
        select(){return this},eq(){return this},order(){return this},in(){return this},
        maybeSingle:async()=>({data:null,error:null}),
        then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}
      }},
      rpc:async()=>({data:[],error:null}),
      auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}
    })};
  });
  await page.goto('/?lang=en', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-i18n="gatewayNoticeTitle"], #gatewayNoticeTitle')).toHaveCount(0);
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('[data-i18n="gatewayNoticeTitle"], #gatewayNoticeTitle')).toHaveCount(0);

  await page.goto('/booking-status.html?lang=en', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#gatewayNoticeTitle, #gatewayNoticeText, #gatewayContactLink')).toHaveCount(0);
  await page.locator('.lang-btn[data-lang="de"]').click();
});
