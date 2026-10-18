import { test, expect } from '@playwright/test';
import { blockExternalNetwork } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await blockExternalNetwork(page);
  await page.clock.install({time:new Date('2026-10-11T12:00:00+02:00')});
});

async function mockPublicBackend(page, mode='test', stayTotal='0.90'){
  await page.addInitScript(({paymentMode,stayTotal})=>{
    // selectRoom() starts a smooth-scroll animation. Disable only that animation
    // in this isolated calendar fixture so WebKit/iPhone click coordinates stay
    // stable; Playwright still clicks the actual date buttons.
    Element.prototype.scrollIntoView = function() {};
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
        (window.__rpcCalls??=[]).push({name,params});
        if(name==='frankiholz_get_calendar_rates')return Promise.resolve({data:rows,error:null});
        if(name==='frankiholz_get_payment_environment'){
          // Exercise a real asynchronous boundary without contacting the backend.
          return new Promise(resolve=>setTimeout(()=>resolve({data:paymentMode,error:null}),20));
        }
        if(name==='frankiholz_estimate_total'){
          const available=params.p_check_in==='2026-10-13'&&params.p_check_out==='2026-10-14';
          return Promise.resolve({data:[{available,total_price:available?stayTotal:'0',nights:available?1:2}],error:null});
        }
        if(name==='frankiholz_quote_with_promo'){
          const percent=params.p_promo_code.toLowerCase()==='frankiholzguest50'?50:params.p_promo_code.toLowerCase()==='frankiholzguest75'?75:0;
          const total=Number(stayTotal)*(100-percent)/100;
          if(!percent)return Promise.resolve({data:null,error:{message:'Promo code is not valid'}});
          if(total<0.50)return Promise.resolve({data:null,error:{message:'The discounted booking total must be at least EUR 0.50'}});
          return Promise.resolve({data:[{available:true,total_price:total,original_total_price:Number(stayTotal),discount_percent:percent,nights:1}],error:null});
        }
        if(name==='frankiholz_create_booking_with_promo'){
          return Promise.resolve({data:[{reference:'FH-PROMO-UI',total_price:'2.00'}],error:null});
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
  },{paymentMode:mode,stayTotal});
}
const button=(page,date)=>page.locator('#calendar button[onclick="pickDate(\''+date+'\')"]');

test('a blocked October 14 is available only as checkout after a free October 13',async ({page})=>{
  await mockPublicBackend(page);
  await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});
  // Wait for the initial mocked room load before selecting; init() is async in WebKit.
  await expect(page.locator('#rooms')).toContainText('Cozy Holz');
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
  // Wait for the initial mocked room load before selecting; init() is async in WebKit.
  await expect(page.locator('#rooms')).toContainText('Cozy Holz');
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
  // Wait for the initial mocked room load before selecting; init() is async in WebKit.
  await expect(page.locator('#rooms')).toContainText('Cozy Holz');
  await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
  await button(page,'2026-10-13').click();
  await expect(button(page,'2026-10-14')).toContainText('Nur Check-out');
  await expect(page.locator('#paymentEnvironmentNotice')).toContainText('Stripe TEST');
});

test('development still reads LIVE from backend but shows no LIVE warning',async ({page})=>{
  await mockPublicBackend(page,'live');
  await page.goto('/?lang=en&stripe_test=1',{waitUntil:'domcontentloaded'});
  // Wait for the initial mocked room load before selecting; init() is async in WebKit.
  await expect(page.locator('#rooms')).toContainText('Cozy Holz');
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
        const headers={
          'access-control-allow-origin':new URL(page.url()).origin,
          'access-control-allow-headers':'content-type,apikey',
          'access-control-allow-methods':'POST,OPTIONS'
        };
        if(route.request().method()==='OPTIONS'){
          await route.fulfill({status:204,headers,body:''});
          return;
        }
        checkoutRequests.push({url:route.request().url(),body:route.request().postDataJSON()});
        const destination=new URL('/__stripe-checkout-stub__',page.url());
        destination.searchParams.set('mode',mode);
        await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({checkout_url:destination.href})});
      });
      await page.route('**/__stripe-checkout-stub__*',route=>route.fulfill({
        status:200,contentType:'text/html',body:'<!doctype html><title>Mock checkout only</title><p>No payment created.</p>'
      }));
      await page.goto(`/?lang=${language}`,{waitUntil:'domcontentloaded'});
      // Wait for the initial mocked room load before selecting; init() is async in WebKit.
  await expect(page.locator('#rooms')).toContainText('Cozy Holz');
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
  // Wait for the initial mocked room load before selecting; init() is async in WebKit.
  await expect(page.locator('#rooms')).toContainText('Cozy Holz');
  await page.evaluate(async()=>{await window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14')});
  await expect(page.locator('#paymentEnvironmentNotice')).toContainText('Payment environment is not configured correctly.');
  const result=await page.evaluate(async()=>{
    try{await resolvePaymentMode();return 'unexpected success';}catch(error){return error.message;}
  });
  expect(result).toBe('Payment environment is not configured correctly.');
});


async function selectPromoDates(page,total='8.00'){
  await mockPublicBackend(page,'test',total);
  await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#rooms')).toContainText('Cozy Holz');
  await page.evaluate(async()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));
  await button(page,'2026-10-13').click();
  await button(page,'2026-10-14').click();
}

test('promo quotes use the server total, localize, and reset when dates or codes change',async({page})=>{
  await selectPromoDates(page);
  await page.locator('#promoCode').fill('FrankiHolzGuest50');
  await page.locator('#applyPromo').click();
  await expect(page.locator('#sumTotal')).toContainText('4.00');
  await expect(page.locator('#promoStatus')).toContainText('50% off');
  await page.locator('.lang-btn[data-lang="de"]').click();
  await expect(page.locator('#promoStatus')).toContainText('50% Rabatt');
  await expect(page.locator('#promoCode')).toHaveAccessibleName('Gutscheincode (optional)');
  await page.locator('#promoCode').fill('FrankiHolzGuest75');
  await expect(page.locator('#sumTotal')).toHaveText('—');
  await expect(page.locator('#calendarNotice')).not.toContainText('4,00');
  await page.locator('#applyPromo').click();
  await expect(page.locator('#sumTotal')).toContainText('2,00');
  await expect(page.locator('#promoStatus')).toContainText('75% Rabatt');
  await button(page,'2026-10-14').click();
  await expect(page.locator('#promoStatus')).toHaveText('');
  await expect(page.locator('#sumTotal')).toHaveText('—');
  await button(page,'2026-10-14').click();
  await expect(page.locator('#promoStatus')).toContainText('75% Rabatt');
  await page.locator('#promoCode').fill('');
  await page.locator('#applyPromo').click();
  await expect(page.locator('#promoStatus')).toHaveText('');
  await expect(page.locator('#sumTotal')).toContainText('8,00');
});

test('invalid codes and below-minimum discounts show errors without retaining a quoted total',async({page})=>{
  await selectPromoDates(page,'0.50');
  await page.locator('#promoCode').fill('FrankiHolzGuest75');
  await page.locator('#applyPromo').click();
  await expect(page.locator('#promoStatus')).toContainText('at least €0.50');
  await expect(page.locator('#sumTotal')).toHaveText('—');
  await page.locator('#promoCode').fill('unknown');
  await page.locator('#applyPromo').click();
  await expect(page.locator('#promoStatus')).toContainText('not valid');
  await expect(page.locator('#sumTotal')).toHaveText('—');
  expect(await page.evaluate(()=>window.__rpcCalls.some(c=>c.name.includes('create_booking')))).toBe(false);
});

test('promo creation sends only the code, one mocked email, and opens the existing TEST setup flow',async({page})=>{
  const requests=[];
  await selectPromoDates(page);
  // Installed last so it overrides the general external-network blocker.
  await page.route('**/functions/v1/frankiholz-guest-email',async route=>{
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'content-type,apikey,x-frankiholz-source'};
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
    requests.push({path:new URL(route.request().url()).pathname,body:route.request().postDataJSON()});
    return route.fulfill({status:200,headers,contentType:'application/json',body:'{}'});
  });
  await page.route('**/functions/v1/frankiholz-create-authorization-test',async route=>{
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'content-type,apikey'};
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
    requests.push({path:new URL(route.request().url()).pathname,body:route.request().postDataJSON()});
    return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({checkout_url:new URL('/__promo_checkout_stub__',page.url()).href})});
  });
  await page.route('**/__promo_checkout_stub__',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>Mock setup</title>'}));
  await page.locator('#promoCode').fill('FrankiHolzGuest75');
  await page.locator('#applyPromo').click();
  await page.locator('#guestName').fill('Promo UI Test');
  await page.locator('#guestEmail').fill('promo-ui@example.invalid');
  await page.locator('#guestCountry').fill('Germany');
  await page.locator('#guestAge').fill('30');
  await page.locator('#guestSex').selectOption('prefer_not_to_say');
  await page.locator('#guestLanguages').fill('English');
  await page.locator('#guestReturning').selectOption('no');
  await page.locator('#message').fill('An isolated promo booking regression test only.');
  await page.evaluate(()=>{
    const original=sb.rpc;
    sb.rpc=async function(name,args,options){if(name==='frankiholz_create_booking_with_promo')sessionStorage.setItem('promoPayload',JSON.stringify(args));return original.call(this,name,args,options)};
    return true;
  });
  await page.locator('#bookingForm button[type="submit"]').click();
  await expect(page).toHaveURL(/__promo_checkout_stub__$/);
  const sent=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('promoPayload')));
  expect(sent.p_promo_code).toBe('FrankiHolzGuest75');
  expect(sent).not.toHaveProperty('total_price');
  expect(sent).not.toHaveProperty('discount_percent');
  expect(requests.filter(r=>r.path.endsWith('/frankiholz-guest-email'))).toHaveLength(1);
  expect(requests.filter(r=>r.path.endsWith('/frankiholz-create-authorization-test'))).toHaveLength(1);
});


test('a delayed old promo quote cannot overwrite a newer code or room selection',async({page})=>{
  await selectPromoDates(page);
  await page.evaluate(()=>{
    const original=sb.rpc.bind(sb);window.__releaseOldPromo=[];
    sb.rpc=(name,args,options)=>{
      if(name==='frankiholz_quote_with_promo'&&args.p_promo_code==='FrankiHolzGuest50')return new Promise(resolve=>window.__releaseOldPromo.push(()=>resolve({data:[{available:true,total_price:4,original_total_price:8,discount_percent:50,nights:1}],error:null})));
      return original(name,args,options);
    };
  });
  await page.locator('#promoCode').fill('FrankiHolzGuest50');
  await page.locator('#applyPromo').click();
  await page.locator('#promoCode').fill('FrankiHolzGuest75');
  await page.locator('#applyPromo').click();
  await expect(page.locator('#sumTotal')).toContainText('2.00');
  await page.evaluate(()=>window.__releaseOldPromo.forEach(resolve=>resolve()));
  await expect(page.locator('#sumTotal')).toContainText('2.00');
  await expect(page.locator('#promoStatus')).toContainText('75% off');
  await page.evaluate(async()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));
  await expect(page.locator('#sumTotal')).toHaveText('—');
  await expect(page.locator('#promoStatus')).toHaveText('');
});
