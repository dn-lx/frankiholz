import {test,expect} from '@playwright/test';
import {blockExternalNetwork} from './helpers.mjs';

async function fixture(page,{admin=false}={}){
 await blockExternalNetwork(page);
 await page.clock.install({time:new Date('2026-10-11T12:00:00Z')});
 await page.addInitScript(({admin})=>{
  if(location.hostname!=='127.0.0.1'&&location.hostname!=='localhost')return;
  Element.prototype.scrollIntoView=function(){};
  const rooms=['A','B'].map(id=>({id,name:'Room '+id,name_de:'Zimmer '+id,description:'A fixture room',description_de:'Ein Testzimmer',max_guests:2,base_price:50,active:true,slug:id}));
  const settings={id:1,hero_title:'Fixture stay',hero_title_de:'Testunterkunft',hero_subtitle:'Mocked only',hero_subtitle_de:'Nur Testdaten'};
  const booking=reference=>({reference,room_name:'Room A',booking_status:'pending',payment_status:'not_started',total_price:100,check_in:'2026-10-13',check_out:'2026-10-14',cancel_refund_eligible:true});
  window.__calendarCalls=[];window.__pendingCalendar=[];window.__adminReads=[];window.__pendingAdmin=[];window.__pendingStatus=[];window.__created=[];window.__quoteCalls=[];
  window.__holdCalendar=false;window.__holdAdmin=false;window.__holdStatus=false;
  window.__calendarData=args=>[{date:'2026-10-14',is_available:false,availability_status:'blocked'},{date:'2026-11-02',is_available:false,availability_status:'blocked'}].filter(row=>row.date>=args.p_from&&row.date<=args.p_to);
  window.supabase={createClient:()=>({
   from(table){
    const filters={};const q={select(){return q},order(){return q},eq(key,value){filters[key]=value;return q},in(){return q},gte(key,value){filters.from=value;return q},lte(key,value){filters.to=value;return q},
     single:async()=>({data:table==='frankiholz_site_settings'?settings:null,error:null}),maybeSingle:async()=>({data:table==='frankiholz_site_settings'?settings:null,error:null}),
     then(resolve,reject){
      if(admin&&filters.from&&['frankiholz_calendar','frankiholz_ical_blocks','frankiholz_bookings'].includes(table)){
       window.__adminReads.push({table,...filters});
       if(window.__holdAdmin)return new Promise(done=>window.__pendingAdmin.push({table,filters,resolve:done})).then(resolve,reject);
      }
      return Promise.resolve({data:table==='frankiholz_rooms'?rooms:[],error:null}).then(resolve,reject);
     }};return q;
   },
   rpc:async(name,args)=>{
    if(name==='frankiholz_admin_access_check')return{data:admin,error:null};
    if(name==='frankiholz_get_payment_environment')return{data:'test',error:null};
    if(name==='frankiholz_get_calendar_rates'){
     window.__calendarCalls.push(args);
     if(window.__holdCalendar)return new Promise(resolve=>window.__pendingCalendar.push({args,resolve}));
     return{data:window.__calendarData(args),error:null};
    }
    if(name==='frankiholz_estimate_total'||name==='frankiholz_quote_with_promo'){window.__quoteCalls.push(args);return{data:[{available:true,total_price:100,nights:1}],error:null};}
    if(name==='frankiholz_create_booking_v2'){window.__created.push(args);sessionStorage.setItem('audit-created-booking',JSON.stringify(args));return{data:[{reference:'FH-AUDIT',total_price:100}],error:null};}
    if(name==='frankiholz_booking_status_v3'){
     if(window.__holdStatus)return new Promise(resolve=>window.__pendingStatus.push({args,resolve}));
     return{data:[booking(args.p_reference)],error:null};
    }
    return{data:[],error:null};
   },
   auth:{getSession:async()=>({data:{session:admin?{access_token:'fixture',user:{id:'fixture-admin'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})}
  })};
  window.__bookingFixture=booking;
 },{admin});
}
const day=(page,date)=>page.locator(`#calendar button[data-date="${date}"]`);
async function openRoom(page,id='A'){
 await page.goto('/?lang=en');await expect(page.locator('#rooms')).toContainText('Room A');
 await page.evaluate(id=>window.selectRoom(id),id);await expect(day(page,'2026-10-13')).toBeEnabled();
}
async function fillBooking(page){
 await page.locator('#guestName').fill('Offline audit guest');await page.locator('#guestEmail').fill('fixture@example.invalid');
 await page.locator('#guestCountry').fill('New Zealand');await page.locator('#guestAge').fill('30');await page.locator('#guestSex').selectOption('prefer_not_to_say');
 await page.locator('#guestLanguages').fill('English');await page.locator('#guestReturning').selectOption('no');await page.locator('#message').fill('This is an isolated calendar regression fixture.');
}

test.describe('civil dates in a UTC+13 browser',()=>{
 test.use({timezoneId:'Pacific/Auckland'});
 test('visible dates are the selected and submitted booking dates',async({page})=>{
  await fixture(page);await openRoom(page);
  await expect(day(page,'2026-10-13').locator('strong')).toHaveText('13');
  await day(page,'2026-10-13').click();await day(page,'2026-10-14').click();
  await expect(page.locator('#sumIn')).toHaveText('2026-10-13');await expect(page.locator('#sumOut')).toHaveText('2026-10-14');
  await fillBooking(page);await page.locator('#bookingForm button[type=submit]').click();
  await expect(page).toHaveURL(/payment.html\?reference=FH-AUDIT/);
  const payload=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('audit-created-booking')));
  expect(payload.p_check_in).toBe('2026-10-13');expect(payload.p_check_out).toBe('2026-10-14');
 });
 test('Admin calendar date labels and selected range use civil dates',async({page})=>{
  await fixture(page,{admin:true});await page.goto('/admin.html#rooms');
  const date=page.locator('#rc-A button[data-date="2026-10-13"]');await expect(date).toBeEnabled();await expect(date.locator('strong')).toHaveText('13');
  await date.focus();await page.keyboard.press('Enter');await expect(date).toBeFocused();await expect(page.locator('#rc-range-A')).toHaveText('2026-10-13');
 });
});

test('late availability from an earlier room cannot overwrite the selected room',async({page})=>{
 await fixture(page);await openRoom(page);
 await page.evaluate(()=>{window.__holdCalendar=true;void window.selectRoom('A');});
 await expect.poll(()=>page.evaluate(()=>window.__pendingCalendar.length)).toBe(1);
 await page.evaluate(()=>void window.selectRoom('B'));
 await expect.poll(()=>page.evaluate(()=>window.__pendingCalendar.length)).toBe(2);
 await expect(day(page,'2026-10-13')).toBeDisabled();
 await page.evaluate(()=>window.__pendingCalendar[1].resolve({data:[{date:'2026-10-13',is_available:false,availability_status:'blocked'}],error:null}));
 await expect(page.locator('#selectedRoomName')).toHaveText('Room B');await expect(day(page,'2026-10-13')).toBeDisabled();
 await page.evaluate(()=>window.__pendingCalendar[0].resolve({data:[],error:null}));
 await expect(day(page,'2026-10-13')).toBeDisabled();expect(await page.evaluate(()=>calendarContext.roomId)).toBe('B');
});

test('failed availability stays disabled, localizes the error and retries safely',async({page})=>{
 await fixture(page);await openRoom(page);
 await page.evaluate(()=>{window.__holdCalendar=true;void loadCalendar();});
 await expect(day(page,'2026-10-13')).toBeDisabled();await expect(page.locator('#calendarNotice')).toContainText('Loading availability');
 await page.evaluate(()=>window.__pendingCalendar[0].resolve({data:null,error:{message:'Fixture read failure'}}));
 await expect(day(page,'2026-10-13')).toBeDisabled();await expect(page.locator('#retryCalendar')).toBeVisible();
 await page.locator('.lang-btn[data-lang=de]').click();await expect(page.locator('#calendarNotice')).toContainText('konnte nicht geladen');
 await page.locator('#retryCalendar').click();await expect.poll(()=>page.evaluate(()=>window.__pendingCalendar.length)).toBe(2);
 await page.evaluate(()=>window.__pendingCalendar[1].resolve({data:[],error:null}));
 await expect(day(page,'2026-10-13')).toBeEnabled();await expect(page.locator('#retryCalendar')).toHaveCount(0);
});

test('later months load every intervening night before a cross-month checkout',async({page})=>{
 await fixture(page);await openRoom(page);await day(page,'2026-10-30').click();
 for(let i=0;i<3;i++)await page.locator('#nextMonth').click();
 await expect(day(page,'2027-01-04')).toBeEnabled();
 const request=await page.evaluate(()=>window.__calendarCalls.at(-1));expect(request.p_from).toBe('2026-10-30');expect(request.p_to).toBe('2027-02-28');
 await day(page,'2027-01-04').click();await expect(page.locator('#sumOut')).toHaveText('—');await expect(page.locator('#calendarNotice')).toContainText('unavailable night');
 expect(await page.evaluate(()=>window.__quoteCalls.length)).toBe(0);
});

test('keyboard date selection preserves focus for the checkout step',async({page})=>{
 await fixture(page);await openRoom(page);
 await day(page,'2026-10-13').focus();await page.keyboard.press('Enter');await expect(day(page,'2026-10-13')).toBeFocused();
 await page.keyboard.press('Tab');await expect(day(page,'2026-10-14')).toBeFocused();await page.keyboard.press('Enter');
 await expect(day(page,'2026-10-14')).toBeFocused();await expect(page.locator('#sumOut')).toHaveText('2026-10-14');
});

test('Admin ignores earlier month reads and blocks edits until a failed read is retried',async({page})=>{
 await fixture(page,{admin:true});await page.goto('/admin.html#rooms');await expect(page.locator('#rc-A button[data-date="2026-10-13"]')).toBeEnabled();
 await page.evaluate(()=>{window.__holdAdmin=true;void window.moveRoomMonth('A',1);});
 await expect.poll(()=>page.evaluate(()=>window.__pendingAdmin.length)).toBe(3);
 await page.evaluate(()=>void window.moveRoomMonth('A',1));await expect.poll(()=>page.evaluate(()=>window.__pendingAdmin.length)).toBe(6);
 await page.evaluate(()=>{for(const read of window.__pendingAdmin.slice(3,6))read.resolve({data:read.table==='frankiholz_calendar'?[{date:'2026-12-05',is_available:false,availability_status:'blocked'}]:[],error:null});});
 await expect(page.locator('#rc-A button[data-date="2026-12-05"]')).toHaveClass(/blocked/);
 await page.evaluate(()=>{for(const read of window.__pendingAdmin.slice(0,3))read.resolve({data:[],error:null});});
 await expect(page.locator('#rc-A button[data-date="2026-12-05"]')).toHaveClass(/blocked/);
 await page.evaluate(()=>void loadRoomCalendar('A'));await expect.poll(()=>page.evaluate(()=>window.__pendingAdmin.length)).toBe(9);
 await page.evaluate(()=>{for(const read of window.__pendingAdmin.slice(6,9))read.resolve({data:[],error:read.table==='frankiholz_calendar'?{message:'Fixture read failure'}:null});});
 await expect(page.locator('#rc-A button').first()).toBeDisabled();await page.locator('#rc-read-status-A').getByRole('button',{name:'Retry availability'}).click();
 await expect.poll(()=>page.evaluate(()=>window.__pendingAdmin.length)).toBe(12);
 await page.evaluate(()=>{for(const read of window.__pendingAdmin.slice(9,12))read.resolve({data:[],error:null});});
 await expect(page.locator('#rc-A button[data-date="2026-12-05"]')).toBeEnabled();
});

test('inline status discards earlier lookup results and invalidates actions on input edits',async({page})=>{
 await fixture(page);await openRoom(page);await page.evaluate(()=>window.__holdStatus=true);
 await page.locator('#statusReference').fill('FH-A');await page.locator('#statusEmail').fill('a@example.invalid');await page.locator('#checkStatusBtn').click();
 await page.locator('#statusReference').fill('FH-B');await page.locator('#statusEmail').fill('b@example.invalid');await page.locator('#checkStatusBtn').click();
 await expect.poll(()=>page.evaluate(()=>window.__pendingStatus.length)).toBe(2);
 await page.evaluate(()=>window.__pendingStatus[1].resolve({data:[window.__bookingFixture('FH-B')],error:null}));await expect(page.locator('#statusResult')).toContainText('FH-B');
 await page.evaluate(()=>window.__pendingStatus[0].resolve({data:[window.__bookingFixture('FH-A')],error:null}));await expect(page.locator('#statusResult')).not.toContainText('FH-A');
 await page.locator('#statusReference').fill('FH-C');await expect(page.locator('#statusResult')).toHaveText('');await expect(page.locator('#cancelBookingBtn')).toHaveCount(0);
});

test('inline cancellation confirms its reference, rejects duplicate clicks and recovers from failure',async({page})=>{
 await fixture(page);await openRoom(page);await page.locator('#statusReference').fill('FH-A');await page.locator('#statusEmail').fill('a@example.invalid');await page.locator('#checkStatusBtn').click();
 await expect(page.locator('#statusResult')).toContainText('FH-A');
 const prompts=[],requests=[];let finish;
 page.on('dialog',async dialog=>{prompts.push(dialog.message());await dialog.accept();});
 await page.route('**/functions/v1/frankiholz-cancel-booking-v2',async route=>{
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'content-type,apikey'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  requests.push(route.request().postDataJSON());await new Promise(resolve=>finish=resolve);
  return route.fulfill({status:requests.length===1?500:200,headers,contentType:'application/json',body:JSON.stringify(requests.length===1?{error:'Fixture cancellation failure'}:{policy:'no_payment'})});
 });
 await page.locator('#cancelBookingBtn').click();await expect.poll(()=>requests.length).toBe(1);await expect(page.locator('#cancelBookingBtn')).toBeDisabled();await expect(page.locator('#statusReference')).toBeDisabled();
 await page.evaluate(()=>document.getElementById('cancelBookingBtn').dispatchEvent(new Event('click')));expect(prompts).toHaveLength(1);expect(prompts[0]).toContain('FH-A');
 finish();await expect(page.locator('#inlineCancelError')).toContainText('Fixture cancellation failure');await expect(page.locator('#cancelBookingBtn')).toBeEnabled();
 await page.locator('#cancelBookingBtn').click();await expect.poll(()=>requests.length).toBe(2);finish();
 await expect(page.locator('#statusResult')).toContainText('Booking cancelled');await expect(page.locator('#cancelBookingBtn')).toHaveCount(0);
 expect(requests).toEqual([{reference:'FH-A',email:'a@example.invalid'},{reference:'FH-A',email:'a@example.invalid'}]);
});
