import { test, expect } from '@playwright/test';
import { blockExternalNetwork } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await blockExternalNetwork(page);
  await page.clock.install({time:new Date('2026-10-11T12:00:00+02:00')});
});

async function mockPublicBackend(page, mode='test'){
  await page.addInitScript(({paymentMode})=>{
    const roomId='2facc875-9470-4b12-9b28-cd65b7360b14';
    const rows=[
      {date:'2026-10-12',is_available:false,availability_status:'booked',nightly_price:null},
      {date:'2026-10-13',is_available:true,availability_status:'available',nightly_price:'0.90'},
      {date:'2026-10-14',is_available:false,availability_status:'blocked',nightly_price:null},
      {date:'2026-10-15',is_available:false,availability_status:'blocked',nightly_price:null}
    ];
    const output=table=>table==='frankiholz_rooms'?[{
      id:roomId,name:'Cozy Holz',name_de:'Cozy Holz',description:'Private room',
      description_de:'Privates Zimmer',max_guests:1,base_price:39,active:true
    }]:[];
    window.supabase={createClient:()=>({
      from(table){
        const q={
          select(){return this},eq(){return this},order(){return this},in(){return this},
          maybeSingle(){return Promise.resolve({data:table==='frankiholz_site_settings'?{id:1,hero_title:'Private rooms',hero_title_de:'Private Zimmer',hero_subtitle:'Stay',hero_subtitle_de:'Übernachten'}:null,error:null})},
          then(resolve,reject){return Promise.resolve({data:output(table),error:null}).then(resolve,reject);}
        };
        return q;
      },
      rpc(name,params){
        if(name==='frankiholz_get_calendar_rates')return Promise.resolve({data:rows,error:null});
        if(name==='frankiholz_get_payment_environment'){
          // Exercise a real asynchronous boundary without contacting the backend.
          return new Promise(resolve=>setTimeout(()=>resolve({data:paymentMode,error:null}),20));
        }
        if(name==='frankiholz_estimate_total'){
          const available=params.p_check_in==='2026-10-13'&&params.p_check_out==='2026-10-14';
          return Promise.resolve({data:[{available,total_price:available?'0.90':'0',nights:available?1:2}],error:null});
        }
        if(name==='frankiholz_create_booking_v2'){
          return Promise.resolve({data:[{reference:'FH-UI-ONLY',total_price:'0.90'}],error:null});
        }
        return Promise.resolve({data:[],error:null});
      },
      auth:{
        getSession:async()=>({data:{session:null}}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      }
    })};
  },{paymentMode:mode});
}
const button=(page,date)=>page.locator('#calendar button[onclick="pickDate(\''+date+'\')"]');

test('a blocked October 14 is available only as checkout after a free October 13',async ({page})=>{
  await mockPublicBackend(page);
  await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
  await expect(button(page,'2026-10-14')).toBeDisabled();
  await expect(button(page,'2026-10-12')).toBeDisabled();
  await button(page,'2026-10-13').click();
  await expect(page.locator('#sumIn')).toHaveText('2026-10-13');
  await expect(button(page,'2026-10-14')).toBeEnabled();
  await expect(button(page,'2026-10-14')).toHaveClass(/checkout-only/);
  await expect(button(page,'2026-10-14')).toContainText('Check-out only');
  await expect(button(page,'2026-10-15')).toBeDisabled();
  await button(page,'2026-10-14').click();
  await expect(page.locator('#sumOut')).toHaveText('2026-10-14');
  await expect(page.locator('#sumTotal')).toContainText('0.90');
  await expect(button(page,'2026-10-14')).toHaveAttribute('aria-pressed','true');
  await expect(button(page,'2026-10-15')).toBeDisabled();
  await page.evaluate(()=>window.pickDate('2026-10-15'));
  await expect(page.locator('#sumOut')).toHaveText('2026-10-14');
});

test('clicking already selected checkout or checkin toggles that date off',async ({page})=>{
  await mockPublicBackend(page);
  await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
  await button(page,'2026-10-13').click();
  await button(page,'2026-10-14').click();
  await button(page,'2026-10-14').click();
  await expect(page.locator('#sumIn')).toHaveText('2026-10-13');
  await expect(page.locator('#sumOut')).toHaveText('—');
  await expect(page.locator('#sumTotal')).toHaveText('—');
  await button(page,'2026-10-13').click();
  await expect(page.locator('#sumIn')).toHaveText('—');
  await expect(page.locator('#sumOut')).toHaveText('—');
  await expect(button(page,'2026-10-14')).toBeDisabled();
});

test('German checkout boundary label is visible and actual TEST mode is displayed',async ({page})=>{
  await mockPublicBackend(page,'test');
  await page.goto('/?lang=de',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
  await button(page,'2026-10-13').click();
  await expect(button(page,'2026-10-14')).toContainText('Nur Check-out');
  await expect(page.locator('#paymentEnvironmentNotice')).toContainText('Stripe TEST');
});

test('development still reads LIVE from backend but shows no LIVE warning',async ({page})=>{
  await mockPublicBackend(page,'live');
  await page.goto('/?lang=en&stripe_test=1',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
  const selected=await page.evaluate(async()=>await resolvePaymentMode());
  expect(selected).toBe('live');
  await expect(page.locator('#paymentEnvironmentNotice')).toBeHidden();
  await expect(page.locator('#paymentEnvironmentNotice')).toHaveText('');
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('#paymentEnvironmentNotice')).toBeHidden();
  await expect(page.locator('#paymentEnvironmentNotice')).toHaveText('');
});

for(const mode of ['live','test']){
  for(const language of ['en','de']){
    test(`${mode.toUpperCase()} ${language} guest submission reaches correct checkout without a browser prompt`,async ({page})=>{
      await mockPublicBackend(page,mode);
      const dialogs=[];
      const checkoutRequests=[];
      const errors=[];
      page.on('dialog',async dialog=>{dialogs.push(dialog.type());await dialog.dismiss();});
      page.on('pageerror',error=>errors.push(error.message));
      // Intercept before the external-network blocker; never send to Supabase or Stripe.
      await page.route('**/functions/v1/frankiholz-create-authorization-*',async route=>{
        checkoutRequests.push({url:route.request().url(),body:route.request().postDataJSON()});
        const destination=new URL('/__stripe-checkout-stub__',page.url());
        destination.searchParams.set('mode',mode);
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({checkout_url:destination.href})});
      });
      await page.route('**/__stripe-checkout-stub__*',route=>route.fulfill({
        status:200,contentType:'text/html',body:'<!doctype html><title>Mock checkout only</title><p>No payment created.</p>'
      }));
      await page.goto(`/?lang=${language}`,{waitUntil:'domcontentloaded'});
      await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
      await button(page,'2026-10-13').click();
      await button(page,'2026-10-14').click();
      await page.locator('#guestName').fill('Frontend Test Guest');
      await page.locator('#guestEmail').fill('checkout-ui@example.invalid');
      await page.locator('#guestPhone').fill('+491700000000');
      await page.locator('#guestCountry').fill('Germany');
      await page.locator('#guestAge').fill('21');
      await page.locator('#guestSex').selectOption('prefer_not_to_say');
      await page.locator('#guestLanguages').fill('English, German');
      await page.locator('#guestHobbies').fill('Test fixture');
      await page.locator('#guestReturning').selectOption('no');
      await page.locator('#message').fill('This is an isolated browser regression test with no real reservation.');
      if(mode==='live')await expect(page.locator('#paymentEnvironmentNotice')).toBeHidden();
      else await expect(page.locator('#paymentEnvironmentNotice')).toContainText('Stripe TEST');
      // Keep the ordinary charge-timing disclosure, not the removed development warning.
      await expect(page.locator('[data-i18n="pendingNote"]')).toContainText('14');
      await expect(page.locator('[data-i18n="pendingNote"]')).toContainText(language==='de'?/keine Belastung|nicht belastet/:/not charged/);
      await page.locator('#bookingForm button[type="submit"]').click();
      await expect(page).toHaveURL(new RegExp(`/__stripe-checkout-stub__\\?mode=${mode}$`));
      expect(dialogs).toEqual([]);
      expect(errors).toEqual([]);
      expect(checkoutRequests).toHaveLength(1);
      const expectedEndpoint=mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test';
      expect(new URL(checkoutRequests[0].url).pathname).toBe('/functions/v1/'+expectedEndpoint);
      expect(checkoutRequests[0].body).toEqual({reference:'FH-UI-ONLY',email:'checkout-ui@example.invalid'});
    });
  }
}

test('unavailable payment configuration is reported instead of silently defaulting to LIVE',async ({page})=>{
  await mockPublicBackend(page,null);
  await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
  await expect(page.locator('#paymentEnvironmentNotice')).toContainText('Payment environment is not configured correctly.');
  const result=await page.evaluate(async()=>{
    try{await resolvePaymentMode();return 'unexpected success';}catch(error){return error.message;}
  });
  expect(result).toBe('Payment environment is not configured correctly.');
});
