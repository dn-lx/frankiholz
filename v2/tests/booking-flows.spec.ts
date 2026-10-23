import {test,expect,type Page,type Route} from '@playwright/test';
type Call={name:string;args:Record<string,unknown>};
type Options={blocked?:string[];calendarFailure?:boolean;payment?:string;booking?:string;collection?:string;mode?:string;snapshot?:string;phone?:string;emailFailure?:boolean;checkout?:string;rpc?:(name:string,args:Record<string,unknown>)=>unknown|Promise<unknown>};
async function fixture(page:Page,options:Options={}){
  const calls:Call[]=[],functions:Call[]=[];
  let cancelled=false,calendarFailure=!!options.calendarFailure,emailFailure=!!options.emailFailure;
  const booking=()=>({reference:'FH-FIXTURE',room_name:'Quiet room',check_in:'2032-03-12',check_out:'2032-03-14',total_price:options.payment==='not_required'?0:100,booking_status:cancelled?'cancelled':options.booking||'pending',payment_status:cancelled?'released':options.payment||'not_started',payment_collection_mode:options.collection||'saved_method',payment_mode:options.snapshot||'test',cancel_refund_eligible:true});
  const reply=(route:Route,data:unknown,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'},contentType:'application/json',body:status===204?'':JSON.stringify(data)});
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.setFixedTime(new Date('2032-03-10T12:00:00Z'));
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
    if(!url.hostname.endsWith('.supabase.co'))return route.abort();
    if(request.method()==='OPTIONS')return reply(route,null,204);
    const name=url.pathname.split('/').at(-1)||'';
    if(url.pathname.includes('/rest/v1/rpc/')){
      const args=request.postDataJSON()||{};calls.push({name,args});
      if(options.rpc){const value=await options.rpc(name,args);if(value!==undefined)return reply(route,value)}
      if(name==='frankiholz_get_payment_environment')return reply(route,options.mode||'test');
      if(name==='frankiholz_get_calendar_rates'){
        if(calendarFailure)return reply(route,{message:'Calendar temporarily unavailable',code:'XX000'},500);
        const rows=[];for(let day=String(args.p_from);day<=String(args.p_to);){rows.push({date:day,is_available:!options.blocked?.includes(day),availability_status:options.blocked?.includes(day)?'booked':'available',nightly_price:50});const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);day=date.toISOString().slice(0,10)}
        return reply(route,rows);
      }
      if(['frankiholz_estimate_total','frankiholz_quote_with_promo'].includes(name)){
        const code=String(args.p_promo_code||''),percent=code.endsWith('100')?100:code.endsWith('75')?75:code.endsWith('50')?50:0;
        if(code&&!percent)return reply(route,{message:'Promo code is not valid',code:'P0001'},400);
        return reply(route,[{available:true,total_price:100*(1-percent/100),original_total_price:100,discount_percent:percent,nights:2}]);
      }
      if(['frankiholz_create_booking_v2','frankiholz_create_booking_with_promo'].includes(name))return reply(route,[{reference:'FH-FIXTURE',total_price:String(args.p_promo_code||'').endsWith('100')?0:100}]);
      if(name==='frankiholz_payment_details')return reply(route,booking());
      if(name==='frankiholz_booking_status_v3')return reply(route,[booking()]);
      return reply(route,[]);
    }
    if(url.pathname.includes('/functions/v1/')){
      const args=request.postDataJSON()||{};functions.push({name,args});
      if(name==='frankiholz-guest-email')return reply(route,emailFailure?{error:'Email temporarily unavailable'}:{ok:true},emailFailure?500:200);
      if(name==='frankiholz-cancel-booking-v2'){cancelled=true;return reply(route,{ok:true,refundable:true})}
      if(name.startsWith('frankiholz-create-authorization'))return reply(route,{checkout_url:options.checkout||'https://checkout.stripe.com/c/pay/fixture'});
      return reply(route,{ok:true});
    }
    if(name==='frankiholz_rooms')return reply(route,[{id:'room-fixture',slug:'quiet-room',name:'Quiet room',name_de:'Ruhiges Zimmer',description:'A comfortable private room.',description_de:'Ein gemütliches Privatzimmer.',base_price:50,max_guests:2,active:true,sort_order:0}]);
    if(name==='frankiholz_room_images')return reply(route,[]);
    if(name==='frankiholz_copy')return reply(route,[{copy_key:'fhContactPhone',text_en:options.phone||'+49 176 12345678',text_de:options.phone||'+49 176 87654321'}]);
    if(name==='frankiholz_site_settings')return reply(route,{id:1,hero_title:'A thoughtful stay in Frankfurt',hero_subtitle:'A private room, personally hosted.'});
    return reply(route,[]);
  });
  return {calls,functions,setCalendarFailure:(value:boolean)=>{calendarFailure=value},setEmailFailure:(value:boolean)=>{emailFailure=value}};
}
async function openBooking(page:Page){
  await page.goto('/?lang=en');await page.getByRole('button',{name:'Book Quiet room',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Plan your stay'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'2032-03-12',exact:true})).toBeEnabled();return dialog;
}
async function dates(page:Page,end='2032-03-14'){
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'2032-03-12',exact:true}).click();await expect(dialog.getByRole('button',{name:new RegExp('^'+end)})).toBeEnabled();await dialog.getByRole('button',{name:new RegExp('^'+end)}).click();await expect(dialog.locator('.date-result')).toContainText('100');
}
async function profile(page:Page){
  const dialog=page.getByRole('dialog');
  for(const [label,value] of [['Full name','Fixture Guest'],['Email','fixture@example.invalid'],['Country','Germany'],['Age','30'],['Languages','English, German'],['A little about your visit (minimum 20 characters)','A synthetic booking for a quiet work trip.']])await dialog.getByLabel(label,{exact:true}).fill(value);
  await dialog.getByLabel('Guests',{exact:true}).selectOption('2');await dialog.getByLabel('Sex',{exact:true}).selectOption('prefer_not_to_say');await dialog.getByLabel('Have you stayed with us before?',{exact:true}).selectOption('no');
}
async function payment(page:Page){
  await page.addInitScript(()=>sessionStorage.setItem('frankiholz-payment-email:FH-FIXTURE','fixture@example.invalid'));await page.goto('/payment?reference=FH-FIXTURE&lang=en');await expect(page.getByRole('region',{name:'Booking summary'})).toBeVisible();
}

test('booking modal traps focus, closes on Escape and restores the room action',async({page})=>{
  await fixture(page);await openBooking(page);await expect(page.getByRole('button',{name:'Close booking',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('dialog').getByRole('link',{name:'Privacy notice'})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close booking',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Book Quiet room',exact:true})).toBeFocused();
});
test('the first blocked morning permits checkout and one submit snapshots the guest profile',async({page})=>{
  let release:()=>void=()=>{},modeCalls=0;const barrier=new Promise<void>(resolve=>{release=resolve});
  const f=await fixture(page,{blocked:['2032-03-14'],rpc:async name=>{if(name==='frankiholz_get_payment_environment'&&++modeCalls>1){await barrier;return 'test'}}});
  await openBooking(page);await dates(page);await profile(page);await page.getByRole('dialog').getByRole('button',{name:'Continue to payment',exact:true}).dblclick();release();await expect(page).toHaveURL(/\/payment\?reference=FH-FIXTURE&lang=en/);
  const created=f.calls.filter(call=>call.name==='frankiholz_create_booking_v2');expect(created).toHaveLength(1);expect(created[0].args).toMatchObject({p_check_in:'2032-03-12',p_check_out:'2032-03-14',p_guests:2,p_guest_age:30,p_guest_sex:'prefer_not_to_say',p_guest_languages:['English','German'],p_guest_returning:false,p_language:'en'});expect(f.functions.filter(call=>call.name==='frankiholz-guest-email')).toEqual([{name:'frankiholz-guest-email',args:{event_type:'request_received',reference:'FH-FIXTURE',email:'fixture@example.invalid'}}]);expect(f.functions.some(call=>call.name.startsWith('frankiholz-create-authorization'))).toBe(false);
});
test('calendar read failure disables dates until a successful retry',async({page})=>{
  const f=await fixture(page,{calendarFailure:true});await page.goto('/?lang=en');await page.getByRole('button',{name:'Book Quiet room',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('alert')).toContainText('Calendar temporarily unavailable');await expect(dialog.getByRole('button',{name:'2032-03-12',exact:true})).toBeDisabled();f.setCalendarFailure(false);await dialog.getByRole('button',{name:'Retry calendar'}).click();await expect(dialog.getByRole('button',{name:'2032-03-12',exact:true})).toBeEnabled();
});
test('cross-month selection loads the whole range and rejects an intervening blocked night',async({page})=>{
  const f=await fixture(page,{blocked:['2032-03-20']});const dialog=await openBooking(page);await dialog.getByRole('button',{name:'2032-03-12',exact:true}).click();await dialog.getByRole('button',{name:'Next month'}).click();await expect(dialog.getByRole('button',{name:'2032-04-05',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'2032-04-05',exact:true}).click();await expect(dialog.locator('.booking-promo-status')).toContainText('unavailable night');expect(f.calls.filter(call=>call.name==='frankiholz_get_calendar_rates').at(-1)?.args).toMatchObject({p_from:'2032-03-12',p_to:'2032-04-30'});expect(f.calls.some(call=>call.name==='frankiholz_estimate_total')).toBe(false);
});
test('language switching preserves selected guests and dates inside the booking drawer',async({page})=>{
  await fixture(page);const dialog=await openBooking(page);await dates(page);await dialog.getByLabel('Guests',{exact:true}).selectOption('2');await dialog.getByRole('button',{name:'DE',exact:true}).click();await expect(dialog.getByLabel('Gäste',{exact:true})).toHaveValue('2');await expect(dialog.locator('.date-result')).toContainText('2032-03-12');await expect(dialog.locator('.date-result')).toContainText('2032-03-14');
});
test('100% promo creates a complimentary request without Stripe',async({page})=>{
  const f=await fixture(page,{payment:'not_required'});const dialog=await openBooking(page);await dates(page);await profile(page);await dialog.getByLabel('Promo code (optional)',{exact:true}).fill('FrankFlowGuest100');await dialog.getByRole('button',{name:'Apply code',exact:true}).click();await expect(dialog.locator('.booking-promo-status')).toContainText('100% off');await dialog.getByRole('button',{name:'Send booking request',exact:true}).click();await expect(page).toHaveURL(/\/booking-status\?reference=FH-FIXTURE&lang=en/);expect(f.calls.filter(call=>call.name==='frankiholz_create_booking_with_promo')).toHaveLength(1);expect(f.calls.find(call=>call.name==='frankiholz_create_booking_with_promo')?.args.p_promo_code).toBe('FrankFlowGuest100');expect(f.functions.some(call=>call.name.startsWith('frankiholz-create-authorization'))).toBe(false);
});
test('an edited promo discards a late older server quote',async({page})=>{
  let release:(value:unknown)=>void=()=>{};const held=new Promise<unknown>(resolve=>{release=resolve});await fixture(page,{rpc:(name,args)=>name==='frankiholz_quote_with_promo'&&args.p_promo_code==='FrankFlowGuest50'?held:undefined});const dialog=await openBooking(page);await dates(page);const promo=dialog.getByLabel('Promo code (optional)',{exact:true});await promo.fill('FrankFlowGuest50');await dialog.getByRole('button',{name:'Apply code',exact:true}).click();await promo.fill('FrankFlowGuest75');await dialog.getByRole('button',{name:'Apply code',exact:true}).click();await expect(dialog.locator('.booking-promo-status')).toContainText('75% off');release([{available:true,total_price:50,original_total_price:100,discount_percent:50,nights:2}]);await expect(dialog.locator('.date-result')).toContainText('25');await expect(dialog.locator('.booking-promo-status')).toContainText('75% off');
});
test('failed email handoff preserves the reference and retries no booking RPC',async({page})=>{
  const f=await fixture(page,{emailFailure:true});const dialog=await openBooking(page);await dates(page);await profile(page);await dialog.getByRole('button',{name:'Continue to payment',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Booking request saved'})).toBeVisible();await expect(dialog.getByRole('link',{name:'Continue to payment',exact:true})).toHaveAttribute('href','/payment?reference=FH-FIXTURE&lang=en');f.setEmailFailure(false);await dialog.getByRole('button',{name:'Retry confirmation email'}).click();await expect(page).toHaveURL(/\/payment\?reference=FH-FIXTURE/);expect(f.calls.filter(call=>call.name==='frankiholz_create_booking_v2')).toHaveLength(1);expect(f.functions.filter(call=>call.name==='frankiholz-guest-email')).toHaveLength(2);
});
test('payment rejects an untrusted Stripe redirect',async({page})=>{
  const f=await fixture(page,{checkout:'https://checkout.stripe.com.evil.example/steal'});await payment(page);await page.getByRole('button',{name:'Choose a method on Stripe'}).click();await expect(page.getByRole('alert')).toContainText('payment address could not be verified');await expect(page).toHaveURL(/127\.0\.0\.1:3042\/payment/);expect(f.functions.find(call=>call.name==='frankiholz-create-authorization-test')?.args).toEqual({reference:'FH-FIXTURE',email:'fixture@example.invalid',payment_collection_mode:'saved_method'});
});
test('payment mode mismatch blocks setup before any endpoint call',async({page})=>{
  const f=await fixture(page,{snapshot:'test',mode:'live'});await payment(page);await page.getByRole('button',{name:'Choose a method on Stripe'}).click();await expect(page.getByRole('alert')).toContainText('payment environment has changed');expect(f.functions.filter(call=>call.name.startsWith('frankiholz-create-authorization'))).toHaveLength(0);
});
for(const state of ['not_required','payment_method_saved','processing','scheduled_charge','paid'])test(`${state} does not offer another payment`,async({page})=>{
  await fixture(page,{payment:state});await payment(page);await expect(page.getByRole('button',{name:'Choose a method on Stripe'})).toHaveCount(0);await expect(page.getByRole('region',{name:'Payment status'})).toBeVisible();if(state==='processing')await expect(page.getByRole('region',{name:'Payment status'})).toContainText('Payment processing');if(state==='not_required')await expect(page.getByRole('heading',{level:1})).toHaveText('No payment required');
});
test('closed requests never offer new payment and existing bank transfers only offer their instructions',async({page})=>{
  await fixture(page,{booking:'cancelled',payment:'awaiting_payment'});await payment(page);await expect(page.getByRole('heading',{level:1})).toHaveText('Your request is closed');await expect(page.getByRole('button',{name:'Choose a method on Stripe'})).toHaveCount(0);
});
test('existing bank-transfer instructions use only the server-owned collection mode',async({page})=>{
  const f=await fixture(page,{collection:'bank_transfer',payment:'awaiting_payment',checkout:'https://evil.example/invalid'});await payment(page);await expect(page.getByRole('button',{name:'Choose a method on Stripe'})).toHaveCount(0);await page.getByRole('button',{name:'View existing transfer instructions'}).click();await expect(page.getByRole('alert')).toBeVisible();expect(f.functions.find(call=>call.name==='frankiholz-create-authorization-test')?.args.payment_collection_mode).toBe('bank_transfer');
});
test('editing credentials rejects a stale status response and clears old details',async({page})=>{
  let release:(value:unknown)=>void=()=>{};const held=new Promise<unknown>(resolve=>{release=resolve});await fixture(page,{rpc:name=>name==='frankiholz_booking_status_v3'?held:undefined});await page.goto('/booking-status?lang=en');await page.getByRole('textbox',{name:'Booking reference',exact:true}).fill('FH-OLD');await page.getByRole('textbox',{name:'Email address',exact:true}).fill('fixture@example.invalid');await page.getByRole('button',{name:'Check status',exact:true}).click();await page.getByRole('textbox',{name:'Booking reference',exact:true}).fill('FH-NEW');release([{reference:'FH-OLD',room_name:'Private old details',booking_status:'pending',payment_status:'not_started',total_price:100,check_in:'2032-03-12',check_out:'2032-03-14'}]);await expect(page.getByRole('region',{name:'Booking details'})).toHaveCount(0);await expect(page.getByText('Private old details')).toHaveCount(0);
});
test('cancellation follows server policy and authenticates with the loaded credentials',async({page})=>{
  const f=await fixture(page);await page.addInitScript(()=>sessionStorage.setItem('frankiholz-payment-email:FH-FIXTURE','fixture@example.invalid'));await page.goto('/booking-status?reference=FH-FIXTURE&lang=en');await expect(page.getByRole('region',{name:'Booking details'})).toBeVisible();page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Cancel booking',exact:true}).click();await expect(page.getByRole('region',{name:'Booking details'})).toContainText('Request closed');await expect(page.getByRole('button',{name:'Cancel booking',exact:true})).toHaveCount(0);expect(f.functions.filter(call=>call.name==='frankiholz-cancel-booking-v2')).toEqual([{name:'frankiholz-cancel-booking-v2',args:{reference:'FH-FIXTURE',email:'fixture@example.invalid'}}]);
});
test('saved contact follows the selected language',async({page})=>{
  await fixture(page);await payment(page);await expect(page.getByRole('link',{name:'Chat with your hosts'})).toHaveAttribute('href',/^https:\/\/wa\.me\/4917612345678/);await page.getByRole('button',{name:'DE',exact:true}).click();await expect(page.getByRole('link',{name:'Über WhatsApp schreiben'})).toHaveAttribute('href',/^https:\/\/wa\.me\/4917687654321/);
});
test('invalid saved contact never creates a WhatsApp destination',async({page})=>{
  await fixture(page,{phone:'not a telephone number'});await payment(page);await expect(page.getByRole('link',{name:'Chat with your hosts'})).toHaveCount(0);
});
test('Stripe return keeps reference and language without claiming settlement',async({page})=>{
  await fixture(page);await page.goto('/payment-success?reference=FH-FIXTURE&lang=de');await expect(page.getByRole('link',{name:'Buchungsstatus prüfen'})).toHaveAttribute('href','/booking-status?reference=FH-FIXTURE&lang=de');await expect(page.locator('main')).toContainText('Dies bedeutet nicht, dass eine Zahlung eingegangen ist');
});
