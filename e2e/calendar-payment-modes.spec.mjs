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
        if(name==='frankiholz_booking_status_v3'&&sessionStorage.getItem('free-promo-fixture'))return Promise.resolve({data:[{reference:params.p_reference,room_name:'Cozy Holz',check_in:'2026-10-13',check_out:'2026-10-14',total_price:0,booking_status:'pending',payment_status:'not_required',payment_collection_mode:'complimentary',payment_mode:paymentMode}],error:null});
        if(name==='frankiholz_payment_details')return Promise.resolve({data:{reference:params.p_reference,room_name:'Cozy Holz',check_in:'2026-10-13',check_out:'2026-10-14',total_price:params.p_reference==='FH-PROMO-UI'?'2.00':stayTotal,booking_status:'pending',payment_status:'not_started',payment_mode:paymentMode,payment_collection_mode:'saved_method'},error:null});
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
          const match=params.p_promo_code.trim().match(/^(?:FrankFlowGuest(25|50|75|100)|FrankiHolzGuest(50|75))$/i);const percent=match?Number(match[1]||match[2]):0;
          const total=Number(stayTotal)*(100-percent)/100;
          if(!percent)return Promise.resolve({data:null,error:{message:'Promo code is not valid'}});
          if(percent!==100&&total<0.50)return Promise.resolve({data:null,error:{message:'The discounted booking total must be at least EUR 0.50'}});
          return Promise.resolve({data:[{available:true,total_price:total,original_total_price:Number(stayTotal),discount_percent:percent,nights:1}],error:null});
        }
        if(name==='frankiholz_create_booking_with_promo'){
          const free=params.p_promo_code.toLowerCase()==='frankflowguest100';if(free)sessionStorage.setItem('free-promo-fixture','1');
          return Promise.resolve({data:[{reference:'FH-PROMO-UI',total_price:free?'0.00':'2.00'}],error:null});
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

for(const lang of ['en','de'])test(`booking dropdowns preserve keyboard selection in ${lang}`,async({page})=>{
 await mockPublicBackend(page);await page.goto('/?lang='+lang);await expect(page.locator('#rooms')).toContainText('Cozy Holz');
 await page.evaluate(()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));
 const sex=page.locator('#guestSexChoice'),returning=page.locator('#guestReturningChoice');
 await expect(sex).toHaveAttribute('aria-required','true');await sex.click();await expect(page.locator('#guestSexOptions')).toBeVisible();
 await sex.press('End');await sex.press('Enter');await expect(page.locator('#guestSex')).toHaveValue('prefer_not_to_say');
 await expect(sex).toContainText(lang==='de'?'Keine Angabe':'Prefer not to say');await expect(sex).toHaveAttribute('aria-expanded','false');
 await returning.click();await returning.press('Home');await returning.press('Enter');await expect(page.locator('#guestReturning')).toHaveValue('yes');
 await sex.click();await sex.press('Escape');await expect(sex).toBeFocused();await expect(sex).toHaveAttribute('aria-expanded','false');

});

for(const lang of ['en','de'])test(`booking dropdowns validate, reset and keep the footer contact in ${lang}`,async({page})=>{
 await mockPublicBackend(page);await page.goto('/?lang='+lang);await expect(page.locator('#rooms')).toContainText('Cozy Holz');
 await page.evaluate(()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));
 const sex=page.locator('#guestSexChoice');await page.locator('#guestSex').selectOption('male');
 await page.evaluate(()=>document.getElementById('bookingForm').reset());await expect(page.locator('#guestSex')).toHaveValue('');
 await page.evaluate(()=>document.getElementById('guestSex').reportValidity());await expect(sex).toHaveAttribute('aria-invalid','true');
 await sex.click();await page.locator('#guestSexOptions [role=option]').first().click();await expect(sex).not.toHaveAttribute('aria-invalid','true');
 await expect(page.locator('.footer-website a')).toHaveAttribute('href','mailto:info@frankiflow.de?subject=Website%20enquiry');
 await expect(page.locator('.footer-website')).toContainText(lang==='de'?'Ihre eigene Website':'Create your own website');
});

test('booking dropdown labels update on language switch and stay within a mobile viewport',async({page})=>{
 await mockPublicBackend(page);await page.setViewportSize({width:390,height:844});await page.goto('/?lang=en');await expect(page.locator('#rooms')).toContainText('Cozy Holz');
 await page.evaluate(()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));await page.locator('#guestSex').selectOption('male');
 await page.locator('.lang-btn[data-lang=de]').click();await expect(page.locator('#guestSexChoice')).toContainText('Männlich');await expect(page.locator('#guestReturningLabel')).toHaveText('Waren Sie schon einmal bei uns?');
 await page.locator('#guestSexChoice').click();const box=await page.locator('#guestSexOptions').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(391);
 await page.locator('#guestSexChoice').press('Tab');await expect(page.locator('#guestSexOptions')).toBeHidden();
 await page.locator('#guestReturningChoice').click();await expect(page.locator('#guestReturningOptions')).toBeVisible();
});

for(const height of [430,844])test(`booking dropdown fits the available screen height at ${height}px`,async({page})=>{
 await mockPublicBackend(page);await page.setViewportSize({width:390,height});await page.goto('/?lang=en');await expect(page.locator('#rooms')).toContainText('Cozy Holz');
 await page.evaluate(()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));await page.locator('#guestSexChoice').click();
 const box=await page.locator('#guestSexOptions').boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height);
});

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
        const destination=new URL('https://checkout.stripe.com/__stripe-checkout-stub__');
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
      await expect(page.locator('#paymentSetupNote')).toContainText(language==='de'?'nächsten Seite':'next page');
      await expect(page.locator('#paymentCollection')).toHaveCount(0);
      await page.locator('#bookingForm button[type="submit"]').click();
      await expect(page).toHaveURL(/payment.html\?reference=FH-UI-ONLY/);
      expect(checkoutRequests).toHaveLength(0);
      expect(page.url()).not.toContain('checkout-ui');
      await page.locator('#savedPayment').click();
      await expect(page).toHaveURL(new RegExp(`/__stripe-checkout-stub__\\?mode=${mode}$`));
      expect(dialogs).toEqual([]);
      expect(errors).toEqual([]);
      expect(checkoutRequests).toHaveLength(1);
      const expectedEndpoint=mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test';
      expect(new URL(checkoutRequests[0].url).pathname).toBe('/functions/v1/'+expectedEndpoint);
      expect(checkoutRequests[0].body).toEqual({reference:'FH-UI-ONLY',email:'checkout-ui@example.invalid',payment_collection_mode:'saved_method'});
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

for(const percent of [25,50,75,100])for(const language of ['en','de'])test(`FrankFlowGuest${percent} displays ${percent}% off in ${language}`,async({page})=>{
  await selectPromoDates(page,'8.00');
  if(language==='de')await page.locator('.lang-btn[data-lang="de"]').click();
  await page.locator('#promoCode').fill('FrankFlowGuest'+percent);await page.locator('#applyPromo').click();
  await expect(page.locator('#sumTotal')).toContainText(language==='de'?((8*(100-percent)/100).toFixed(2).replace('.',',')):(8*(100-percent)/100).toFixed(2));
  await expect(page.locator('#promoStatus')).toContainText(percent+(language==='de'?'% Rabatt':'% off'));
  if(percent===100){await expect(page.locator('#paymentSetupNote')).toContainText(language==='de'?'Keine Zahlung erforderlich':'No payment required');await expect(page.locator('#bookingForm button[type=submit]')).toHaveText(language==='de'?'Buchungsanfrage senden':'Send booking request');}
});

test('100% booking goes directly to pending status without Stripe or a payment page',async({page})=>{
  const stripeCalls=[];await selectPromoDates(page,'8.00');
  await page.route('**/functions/v1/frankiholz-create-authorization-*',route=>{stripeCalls.push(route.request().url());return route.abort()});
  await page.locator('#promoCode').fill('FrankFlowGuest100');await page.locator('#applyPromo').click();
  await page.locator('#guestName').fill('Complimentary fixture');await page.locator('#guestEmail').fill('fixture@example.invalid');await page.locator('#guestCountry').fill('Germany');await page.locator('#guestAge').fill('30');await page.locator('#guestSex').selectOption('prefer_not_to_say');await page.locator('#guestLanguages').fill('English');await page.locator('#guestReturning').selectOption('no');await page.locator('#message').fill('An isolated complimentary booking regression fixture.');
  await page.locator('#bookingForm button[type=submit]').click();
  await expect(page).toHaveURL(/booking-status.html\?reference=FH-PROMO-UI/);
  await expect(page.locator('#out')).toContainText('No payment required (100% promo)');await expect(page.locator('#out')).toContainText('pending');await expect(page.locator('#retryCardBtn')).toHaveCount(0);expect(stripeCalls).toEqual([]);
});

for(const width of [360,1280])test(`styled room picker supports keyboard selection and closes cleanly at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await selectPromoDates(page);
  await page.evaluate(()=>{rooms.push({...rooms[0],id:'room-two',name:'Castle Holz',name_de:'Schloss Holz'},{...rooms[0],id:'room-three',name:'Comfy Holz',name_de:'Gemütliches Holz'});renderRooms()});
  const picker=page.locator('#roomPickerButton');await expect(picker).toHaveAccessibleName(/Room .*Cozy Holz/);
  await picker.click();await expect(page.getByRole('listbox')).toBeVisible();await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(3);
  await picker.press('ArrowDown');await picker.press('Enter');await expect(picker).toContainText('Castle Holz');await expect(page.locator('#selectedRoomName')).toHaveText('Castle Holz');
  await picker.click();await page.getByRole('listbox').getByRole('option',{name:/Comfy Holz/}).click();await expect(picker).toContainText('Comfy Holz');await expect(page.locator('#selectedRoomName')).toHaveText('Comfy Holz');
  await picker.click();await picker.press('Escape');await expect(page.getByRole('listbox')).toBeHidden();
  await picker.click();await page.locator('#guestName').click();await expect(page.getByRole('listbox')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.lang-btn[data-lang="de"]').click();await expect(page.getByRole('combobox',{name:/Zimmer .*Gemütliches Holz/})).toBeVisible();
});

test('room choices can be selected with touch',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try{
    const page=await context.newPage();await blockExternalNetwork(page);await page.clock.install({time:new Date('2026-10-11T12:00:00+02:00')});await mockPublicBackend(page);
    await page.goto('/?lang=en');await expect(page.locator('#rooms')).toContainText('Cozy Holz');
    await page.evaluate(async()=>{rooms.push({...rooms[0],id:'room-two',name:'Castle Holz'});renderRooms();await window.selectRoom(rooms[0].id)});
    await page.locator('#roomPickerButton').tap();await page.getByRole('listbox').getByRole('option',{name:/Castle Holz/}).tap();
    await expect(page.locator('#roomPickerButton')).toContainText('Castle Holz');await expect(page.getByRole('listbox')).toBeHidden();
  }finally{await context.close();}
});

test('saved-method selection and promo send no browser amount and one mocked request email',async({page})=>{
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
    return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({checkout_url:'https://checkout.stripe.com/__promo_checkout_stub__'})});
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
  await expect(page).toHaveURL(/payment.html\?reference=FH-PROMO-UI/);
  await expect(page.locator('#bankPayment')).toBeHidden();
  await expect(page.locator('#savedPayment')).toBeVisible();
  const sent=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('promoPayload')));
  await page.locator('#savedPayment').click();
  await expect(page).toHaveURL(/__promo_checkout_stub__$/);
  expect(sent.p_promo_code).toBe('FrankiHolzGuest75');
  expect(sent).not.toHaveProperty('total_price');
  expect(sent).not.toHaveProperty('discount_percent');
  expect(requests.filter(r=>r.path.endsWith('/frankiholz-guest-email'))).toHaveLength(1);
  expect(requests.filter(r=>r.path.endsWith('/frankiholz-create-authorization-test'))).toHaveLength(1);
  expect(requests.find(r=>r.path.endsWith('/frankiholz-create-authorization-test')).body).toEqual({reference:'FH-PROMO-UI',email:'promo-ui@example.invalid',payment_collection_mode:'saved_method'});
});

for(const width of [360,390,1280]){
  for(const language of ['en','de']){
    test(`promo apply button stays beside and aligned with its input at ${width}px in ${language}`,async({page})=>{
      await page.setViewportSize({width,height:900});
      await mockPublicBackend(page);
      await page.goto('/?lang='+language,{waitUntil:'domcontentloaded'});
      await expect(page.locator('#rooms')).toContainText('Cozy Holz');
      await page.evaluate(async()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));
      // Measure in one frame: selectRoom starts a smooth scroll, so separate viewport reads can differ.
      const {input,button}=await page.locator('.promo-code-row').evaluate(row=>({input:row.querySelector('input').getBoundingClientRect().toJSON(),button:row.querySelector('button').getBoundingClientRect().toJSON()}));
      expect(input.width).toBeGreaterThan(80);
      expect(Math.abs(input.y-button.y)).toBeLessThan(1);
      expect(Math.abs(input.height-button.height)).toBeLessThan(1);
      expect(button.x).toBeGreaterThan(input.x+input.width);
      expect(button.x+button.width).toBeLessThanOrEqual(width);
      await expect(page.locator('#paymentCollection')).toHaveCount(0);
    });
  }
}


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
for(const width of [360,768,1280])for(const language of ['en','de'])test(`homepage and booking form stay contained and labelled at ${width}px in ${language}`,async({page})=>{
 await page.setViewportSize({width,height:900});await mockPublicBackend(page,'live');await page.goto('/?lang='+language,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#rooms')).toContainText('Cozy Holz');await page.evaluate(async()=>window.selectRoom('2facc875-9470-4b12-9b28-cd65b7360b14'));
 const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,unlabelled:['guestName','guestEmail','guestPhone','guestCountry','guestAge','guestSex','guestLanguages','guestHobbies','guestReturning','guestCount','message'].filter(id=>!document.getElementById(id).labels.length)}));
 expect(metrics.scroll).toBeLessThanOrEqual(metrics.width+1);expect(metrics.unlabelled).toEqual([]);
});
test('photo and missing-photo room cards keep matching covers and aligned actions',async({page})=>{
 await mockPublicBackend(page,'live');await page.setViewportSize({width:1280,height:900});
 await page.route('**/fixture-photo.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#dce8e5"/></svg>'}));
 await page.goto('/?lang=en');await expect(page.locator('#rooms')).toContainText('Cozy Holz');
 await page.evaluate(()=>{const base=rooms[0];rooms=[{...base,id:'fixture-a',name:'First room',description:'Short description.'},{...base,id:'fixture-b',name:'Second room',description:'A longer description with more useful guest information about this room and the shared apartment.'},{...base,id:'fixture-c',name:'Third room',description:'Another room.'}];images=[{room_id:'fixture-a',storage_path:'fixture-photo.svg'},{room_id:'fixture-c',storage_path:'fixture-photo.svg'}];renderRooms();});
 await expect(page.locator('#rooms .room-cover-placeholder')).toHaveCount(1);await expect(page.locator('#rooms .room-card img')).toHaveCount(2);
 const cards=await page.locator('#rooms').evaluate(root=>[...root.querySelectorAll('.room-card')].map(card=>({cover:card.firstElementChild.getBoundingClientRect().height,button:card.querySelector('button').getBoundingClientRect().bottom})));
 expect(Math.max(...cards.map(c=>c.cover))-Math.min(...cards.map(c=>c.cover))).toBeLessThan(1);
 expect(Math.max(...cards.map(c=>c.button))-Math.min(...cards.map(c=>c.button))).toBeLessThan(1);
});
