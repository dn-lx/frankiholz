import {test,expect} from '@playwright/test';
import {blockExternalNetwork} from './helpers.mjs';
async function fixture(page,overrides={}){
 await blockExternalNetwork(page);
 await page.addInitScript(overrides=>{
  const booking={reference:'FH-PAYMENT',room_name:'Room 1',check_in:'2026-10-26',check_out:'2026-10-27',total_price:'0.50',booking_status:'pending',payment_status:'not_started',payment_collection_mode:'saved_method',payment_mode:'live',...overrides};
  sessionStorage.setItem('frankiholz-payment-email:FH-PAYMENT','fixture@example.invalid');
  window.__calls=[];window.supabase={createClient:()=>({rpc:async(name,args)=>{window.__calls.push({name,args});return {data:name==='frankiholz_payment_details'?(args.p_email==='fixture@example.invalid'?booking:null):(overrides.environment||'live'),error:null}}})};
 },overrides);
}
for(const lang of ['en','de'])for(const width of [390,1280])test(`payment choice is readable and translated in ${lang} at ${width}px`,async({page})=>{
 await fixture(page);await page.setViewportSize({width,height:900});await page.goto('/payment.html?reference=FH-PAYMENT&lang='+lang);
 await expect(page.locator('#paymentContent')).toBeVisible();await expect(page.locator('#paymentSummary')).toContainText(lang==='de'?'0,50':'0.50');
 await expect(page.locator('#savedPayment')).toHaveText(lang==='de'?'Methode bei Stripe wählen':'Choose a method on Stripe');
 await expect(page.locator('#bankPayment')).toBeHidden();await expect(page.locator('#paymentChoices')).toContainText('SEPA');
 await expect(page.locator('#paymentChoices')).toContainText('14');await expect(page.locator('#modeNotice')).toBeHidden();
 const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));expect(size.scroll).toBeLessThanOrEqual(size.width+1);
 await page.locator('#paymentLookupPanel summary').click();await page.locator('#email').fill('wrong@example.invalid');await expect(page.locator('#paymentContent')).toBeHidden();
 await page.locator('#lookupButton').click();await expect(page.locator('#paymentMessage')).toContainText(lang==='de'?'Keine passende':'No matching');
});
for(const state of ['payment_method_saved','scheduled_charge','processing','paid'])test(`no new payment offered for ${state}`,async({page})=>{
 await fixture(page,{payment_status:state});await page.goto('/payment.html?reference=FH-PAYMENT');
 await expect(page.locator('#paymentContent')).toBeVisible();await expect(page.locator('#paymentChoices')).toBeHidden();
 await expect(page.locator('#paymentState')).toContainText('already');
});

for(const language of ['en','de'])for(const state of ['pending','confirmed','cancelled'])test(`complimentary ${state} payment page has no payment actions in ${language}`,async({page})=>{
 await fixture(page,{total_price:0,payment_status:'not_required',payment_collection_mode:'complimentary',booking_status:state});await page.goto('/payment.html?reference=FH-PAYMENT&lang='+language);
 await expect(page.locator('#paymentContent')).toBeVisible();await expect(page.locator('#paymentChoices')).toBeHidden();
 await expect(page.locator('h1')).toHaveText(language==='de'?'Keine Zahlung erforderlich':'No payment required');
 await expect(page.locator('[data-copy=lead]')).toContainText(state==='confirmed'?(language==='de'?'bestätigt':'confirmed'):state==='cancelled'?(language==='de'?'geschlossen':'closed'):(language==='de'?'Bestätigung':'approval'));
});
test('cancelled request and existing bank instructions cannot offer a new saved method',async({page})=>{
 await fixture(page,{booking_status:'cancelled'});await page.goto('/payment.html?reference=FH-PAYMENT');await expect(page.locator('#paymentChoices')).toBeHidden();await expect(page.locator('#paymentState')).toContainText('closed');
 await fixture(page,{payment_collection_mode:'bank_transfer',payment_status:'awaiting_payment'});await page.reload();
 await expect(page.locator('#savedPayment')).toBeHidden();await expect(page.locator('#bankPayment')).toBeVisible();await expect(page.locator('#existingTransfer')).toContainText('transfer in progress');
});
test('environment changes are blocked and test bookings remain explicitly labelled',async({page})=>{
 let requests=0;await fixture(page,{payment_mode:'test'});await page.route('**/functions/v1/**',route=>{requests++;return route.abort()});await page.goto('/payment.html?reference=FH-PAYMENT');
 await expect(page.locator('#modeNotice')).toContainText('Stripe TEST');await page.locator('#savedPayment').click();await expect(page.locator('#paymentMessage')).toContainText('environment has changed');expect(requests).toBe(0);
});
test('setup failure permits retry and rejects an unexpected redirect origin',async({page})=>{
 await fixture(page);let requests=0;await page.route('**/functions/v1/**',async route=>{const headers={'access-control-allow-origin':'*','access-control-allow-headers':'content-type,apikey'};if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});requests++;expect(route.request().postDataJSON()).toEqual({reference:'FH-PAYMENT',email:'fixture@example.invalid',payment_collection_mode:'saved_method'});return route.fulfill({headers,status:200,contentType:'application/json',body:JSON.stringify({checkout_url:'https://untrusted.example/redirect'})})});
 await page.goto('/payment.html?reference=FH-PAYMENT');await page.locator('#savedPayment').click();await expect(page.locator('#paymentMessage')).toContainText('Unable to open');await expect(page.locator('#savedPayment')).toBeEnabled();expect(requests).toBe(1);expect(page.url()).toContain('/payment.html');
});
test('Back restoration refreshes server state and unlocks the page',async({page})=>{
 await fixture(page);await page.goto('/payment.html?reference=FH-PAYMENT');await expect(page.locator('#paymentContent')).toBeVisible();
 await page.evaluate(()=>{setBusy(true);window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await expect(page.locator('#paymentContent')).toBeVisible();await expect(page.locator('#savedPayment')).toBeEnabled();await expect(page.locator('#email')).toBeEnabled();
 expect(await page.evaluate(()=>window.__calls.filter(c=>c.name==='frankiholz_payment_details').length)).toBe(2);
});
test('status link follows the booking returned by a fresh lookup',async({page})=>{
 await fixture(page,{reference:'FH-OTHER'});await page.goto('/payment.html?reference=FH-PAYMENT');
 await expect(page.locator('#statusLink')).toHaveAttribute('href','/booking-status.html?lang=en&reference=FH-OTHER');
});
