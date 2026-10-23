import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blockExternalNetwork } from './helpers.mjs';

// Exercise rendered guest content without shared backend writes.
async function mockGuestData(page) {
  await page.addInitScript(() => {
    if (location.hostname !== '127.0.0.1') return;
    const booking = { reference:'FH-A11Y', room_name:'Accessible room', check_in:'2026-11-20', check_out:'2026-11-22', total_price:100, booking_status:'pending', payment_status:'not_started', payment_collection_mode:'saved_method', payment_mode:'test', cancel_refund_eligible:true };
    sessionStorage.setItem('frankiholz-payment-email:FH-A11Y', 'fixture@example.invalid');
    window.supabase = { createClient: () => ({
      from(table) {
        const data = table === 'frankiholz_rooms' ? [{ id:'a11y-room', name:'Accessible room', max_guests:2, base_price:50, active:true }] : [];
        const q = {
          select(){return q;}, eq(){return q;}, order(){return q;}, in(){return q;},
          maybeSingle:async()=>({data:table==='frankiholz_site_settings'?{hero_title:'Private rooms in Frankfurt',hero_subtitle:'Your stay at FrankiHolz'}:null,error:null}),
          then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject);}
        };
        return q;
      },
      rpc:async name => ({data:name==='frankiholz_get_payment_environment'?'test':name==='frankiholz_payment_details'?booking:name==='frankiholz_booking_status_v3'?[booking]:[],error:null}),
      auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}
    })};
  });
}

const pages = [
  ['accommodation', '/?lang=en'],
  ['booking status', '/booking-status.html?reference=FH-A11Y&lang=en'],
  ['payment', '/payment.html?reference=FH-A11Y&lang=en'],
  ['admin sign-in', '/admin.html'],
  ['legal notice', '/imprint.html'],
  ['privacy notice', '/privacy.html']
];

for (const width of [390,1280]) for (const [name,path] of pages) {
  test(`${name} has no serious or critical accessibility violations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await blockExternalNetwork(page);
    await mockGuestData(page);
    await page.goto(path, {waitUntil:'domcontentloaded'});
    if (name === 'accommodation') {
      await expect(page.locator('#rooms')).toContainText('Accessible room');
      await page.evaluate(()=>window.selectRoom('a11y-room'));
    }
    if (name === 'booking status') await expect(page.locator('#out .notice')).toBeVisible();
    if (name === 'payment') await expect(page.locator('#paymentContent')).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    const blocking = result.violations.filter(({impact}) => impact === 'critical' || impact === 'serious');
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
