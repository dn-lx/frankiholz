import { test, expect } from '@playwright/test';
import { blockExternalNetwork } from './helpers.mjs';

test.beforeEach(async ({ page }) => blockExternalNetwork(page));

test('premium homepage has clear hospitality navigation and working room call to action', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.fh-hero-grid')).toBeVisible();
  await expect(page.locator('.fh-stay-note')).toHaveCount(0);
  await expect(page.locator('#fhHeroReviews')).toBeVisible();
  await expect(page.locator('#fhReviewQuote')).toContainText('Very friendly and understanding.');
  await expect(page.locator('#fhReviewsBand')).toBeVisible();
  await expect(page.locator('#fhReviewsBand')).toContainText('4.74');
  await expect(page.locator('#fhAirbnbCount')).toHaveText('35 reviews');
  await expect(page.locator('#fhReviewListingLink')).toHaveAttribute('href', 'https://www.airbnb.com/rooms/1621684668409633226');
  await expect(page.locator('#fhHeroReviews')).toHaveCount(1);
  await expect(page.locator('.fh-hero-grid #fhHeroReviews')).toHaveCount(0);
  await expect(page.locator('.fh-section-nav')).toBeVisible();
  await expect(page.locator('a[href="#facilities"]')).toHaveCount(2);
  await expect(page.locator('#heroRoomsBtn')).toBeVisible();
  await expect(page.locator('#fhMapTarget iframe')).toHaveCount(1);
  const template = await page.locator('.fh-hero-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns);
  expect(template.trim().split(/\s+/).length).toBe(1);
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('[data-fh-label="heroAbout"]')).toHaveText('Unsere Unterkunft entdecken');
  await expect(page.locator('[data-fh-label="quickFacilities"]')).toHaveText('Ausstattung');
  await expect(page.locator('#fhReviewListingLink')).toHaveText('Bewertungen auf Airbnb ansehen ↗');
  await expect(page.locator('#fhAirbnbCount')).toHaveText('35 Bewertungen');
});

test('premium homepage remains usable at narrow phone widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#heroRoomsBtn')).toBeVisible();
  await expect(page.locator('.fh-stay-note')).toHaveCount(0);
  await expect(page.locator('#fhHeroReviews')).toBeVisible();
  await expect(page.locator('#guestInfoPublic')).toBeVisible();
  const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,screen:innerWidth}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.screen+1);
});

test('attributed Airbnb review slides render only from content, with source links and controls', async ({ page }) => {
  // Mock public CMS reads; never create bookings or publish synthetic testimonials.
  await page.addInitScript(() => {
    const testReviews=[
      {copy_key:'fhHeroReviews',text_en:
        'Test Guest A | Sample review for a browser test only. | https://www.airbnb.com/rooms/123456789\nTest Guest B | Another synthetic test quotation. | https://www.airbnb.com/rooms/123456789',
        text_de:'Testgast A | Nur ein Testzitat. | https://www.airbnb.com/rooms/123456789'},
      {copy_key:'fhAirbnbReviewsUrl',text_en:'https://www.airbnb.com/rooms/123456789',text_de:'https://www.airbnb.com/rooms/123456789'}
    ];
    window.supabase={createClient:()=>({
      from:(table)=>{
        const data=table==='frankiholz_copy'?testReviews:[];
        const q={select(){return this},eq(){return this},in(){return this},order(){return this},
          maybeSingle(){return Promise.resolve({data:null,error:null})},
          single(){return Promise.resolve({data:null,error:null})},
          then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject)}};
        return q;
      },
      rpc:async()=>({data:[],error:null}),
      auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}
    })};
  });
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#fhHeroReviews')).toBeVisible();
  await expect(page.locator('#fhReviewsBand #fhHeroReviews')).toHaveCount(1);
  await expect(page.locator('#fhReviewListingLink')).toHaveAttribute('href','https://www.airbnb.com/rooms/123456789');
  await expect(page.locator('#fhReviewQuote')).toContainText('Sample review for a browser test only.');
  await expect(page.locator('#fhReviewAuthor')).toHaveText('Test Guest A');
  await expect(page.locator('#fhReviewSource')).toHaveAttribute('href','https://www.airbnb.com/rooms/123456789');
  await expect(page.locator('#fhReviewSource')).toHaveAttribute('href', /airbnb.com\/rooms\/1621684668409633226|airbnb.com\/rooms\/123456789/);
  await page.locator('#fhReviewNext').click();
  await expect(page.locator('#fhReviewQuote')).toContainText('Another synthetic test quotation.');
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('#fhReviewQuote')).toHaveText('Nur ein Testzitat.');
  await expect(page.locator('#fhReviewNext')).toBeDisabled();
});

test('Admin has a desktop sidebar and preserves protected section controls', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/admin.html#integrations', { waitUntil: 'domcontentloaded' });
  // Expose the static visual shell only; this does not authenticate or call protected data.
  await page.evaluate(()=>{
    document.getElementById('dashboard').hidden=false;
    document.getElementById('loginView').hidden=true;
    document.querySelector('[data-admin-panel="integrations"]').hidden=false;
  });
  await expect(page.locator('.admin-tabs')).toBeVisible();
  await expect(page.locator('[data-admin-tab]')).toHaveCount(5);
  await expect(page.locator('.fh-admin-overline')).toHaveText(/HOST WORKSPACE/);
  await expect(page.locator('#stripeEnvironmentToggle')).toHaveCount(1);
  const layout=await page.locator('#dashboard>.wrap').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(layout.trim().split(/\s+/).length).toBeGreaterThan(1);
});

test('Admin navigation becomes horizontal on mobile without losing any tabs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(()=>{
    document.getElementById('dashboard').hidden=false;
    document.getElementById('loginView').hidden=true;
  });
  await expect(page.locator('.admin-tabs')).toBeVisible();
  await expect(page.locator('[data-admin-tab]')).toHaveCount(5);
  const style = await page.locator('.admin-tabs').evaluate(el=>({
    direction:getComputedStyle(el).flexDirection, overflow:getComputedStyle(el).overflowX
  }));
  expect(style.direction).toBe('row');
  expect(['auto','scroll']).toContain(style.overflow);
  const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,screen:innerWidth}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.screen+1);
});
