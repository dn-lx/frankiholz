import {test,expect} from '@playwright/test';
import {blockExternalNetwork} from './helpers.mjs';

test('approved PNG logo fallback still loads if responsive WebP files fail', async({page})=>{
  await blockExternalNetwork(page);
  await page.route('**/assets/images/frankiholz-logo-dark-*.webp',route=>route.fulfill({status:404,body:'Not found'}));
  await page.goto('/');
  const image=page.locator('.brand-logo-image');
  await expect(image).toHaveAttribute('src',/\/assets\/frankiholz-logo-for-dark\.png/);
  await expect(image).not.toHaveAttribute('srcset',/.+/);
  await expect.poll(()=>image.evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
});

test('map connects to Google only after the visitor loads it, then resets on reload', async({page})=>{
  await blockExternalNetwork(page);
  const google=[];
  page.on('request',request=>{if(new URL(request.url()).hostname.endsWith('google.com'))google.push(request.url());});
  await page.goto('/?lang=en');
  await page.locator('#location').scrollIntoViewIfNeeded();
  await expect(page.locator('#fhLoadMap')).toBeVisible();
  await expect(page.locator('#fhMapTarget iframe')).toHaveCount(0);
  expect(google).toHaveLength(0);
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('#fhLoadMap')).toHaveText('Google Maps laden');
  await page.locator('#fhLoadMap').click();
  await expect(page.locator('#fhMapTarget iframe')).toHaveAttribute('src',/https:\/\/www\.google\.com\/maps/);
  await expect.poll(()=>google.length).toBe(1);
  await page.reload();
  await expect(page.locator('#fhMapTarget iframe')).toHaveCount(0);
  await expect(page.locator('#fhLoadMap')).toBeVisible();
  expect(google).toHaveLength(1);
});

test('public legal links identify the operator and describe the booking data flow in both languages', async({page})=>{
  await blockExternalNetwork(page);
  await page.goto('/');
  await page.getByRole('link',{name:'Impressum / Legal notice',exact:true}).click();
  for(const lang of ['en','de']) {
    await expect(page.locator(`section[lang="${lang}"]`)).toContainText('Inura Devasurendra');
    await expect(page.locator(`section[lang="${lang}"]`)).toContainText('Seehofstraße 20');
  }
  await page.goto('/privacy.html');
  for(const lang of ['en','de']) {
    const section=page.locator(`section[lang="${lang}"]`);
    for(const provider of ['Supabase','Stripe','Resend','Google','Netlify'])await expect(section).toContainText(provider);
    await expect(section).not.toContainText('jsDelivr');
    await expect(section).toContainText(lang==='en'?'served locally':'lokal');
    await expect(section.getByRole('link',{name:'info@frankiflow.de',exact:true})).toHaveAttribute('href','mailto:info@frankiflow.de');
  }
});
