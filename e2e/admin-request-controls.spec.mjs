import {test,expect} from '@playwright/test';
import {blockExternalNetwork} from './helpers.mjs';
test.beforeEach(async({page})=>{
 await blockExternalNetwork(page);
 await page.addInitScript(()=>{
  window.__requests=['not_started','awaiting_payment','paid','processing','scheduled_charge','refunded'].map((payment_status,i)=>({created_at:'2026-10-18T'+String(15-i).padStart(2,'0')+':00:00Z',message:'a'.repeat(600)+'\nSecond line',guest_phone:'+491700000000',id:'request-'+i,reference:'FH-FIXTURE-'+i,status:i<2?'pending':'confirmed',payment_status,payment_mode:'live',payment_schedule_version:'v2_14_day',total_price:0.5,guests:1,check_in:'2026-10-21',check_out:'2026-10-22',guest_name:'Fixture',guest_email:'fixture@example.invalid',frankiholz_rooms:{name:'Room 1'}}));
  window.__calls=[];
  window.supabase={createClient:()=>({
   from(table){return {select(){return this},order(){return this},eq(){return this},gte(){return this},lte(){return this},in(){return this},maybeSingle:async()=>({data:null}),then(resolve,reject){return Promise.resolve({data:table==='frankiholz_bookings'?window.__requests:table==='frankiholz_calendar'?(window.__calendar||[]):table==='frankiholz_ical_blocks'?(window.__icalBlocks||[]):[],error:null}).then(resolve,reject)}}},
   rpc:async(name,args)=>{window.__calls.push({name,args});if(name==='frankiholz_admin_remove_requests'){window.__requests.forEach(b=>{if(args.p_booking_ids.includes(b.id))b.admin_deleted_at=args.p_restore?null:'2026-10-18T17:00:00Z'});return {data:args.p_booking_ids.length,error:null}}return {data:false,error:null}},
   auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}
  })};
 });
});
for(const width of [390,1280])test(`every request is selectable, removed and restorable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/admin.html#bookings',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{document.getElementById('loginView').hidden=true;document.getElementById('dashboard').hidden=false;await loadBookings()});
 await expect(page.locator('.booking-delete-check')).toHaveCount(6);
 const geometry=await page.locator('label').filter({has:page.locator('#selectAllDeletableBookings')}).evaluate(label=>({label:label.getBoundingClientRect().toJSON(),check:label.querySelector('input').getBoundingClientRect().toJSON()}));
 expect(geometry.check.width).toBe(18);expect(Math.abs(geometry.label.y+geometry.label.height/2-geometry.check.y-geometry.check.height/2)).toBeLessThan(1);
 await page.locator('#selectAllDeletableBookings').check();await expect(page.locator('#bookingDeleteSelection')).toHaveText('6 selected');
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('financial records remain active');return dialog.accept()});
 await page.locator('#deleteSelectedBookings').click();await expect(page.locator('.booking-row')).toHaveCount(0);
 await page.locator('#showRemovedBookings').check();await expect(page.locator('.booking-row')).toHaveCount(6);
 await page.getByRole('button',{name:'Restore to bookings'}).first().click();await expect(page.locator('.booking-row')).toHaveCount(5);
 await page.locator('#showRemovedBookings').uncheck();await expect(page.locator('.booking-row')).toHaveCount(1);
 expect(await page.evaluate(()=>window.__requests[0].status)).toBe('pending');
 expect(await page.evaluate(()=>window.__requests[2].payment_status)).toBe('paid');
 expect(await page.evaluate(()=>window.__calls.filter(c=>c.name==='frankiholz_admin_remove_requests'))).toHaveLength(2);
});
test('Admin calendar displays an explicit available override above booking and imported blocks',async({page})=>{
 await page.goto('/admin.html#rooms',{waitUntil:'domcontentloaded'});
 const statuses=await page.evaluate(async()=>{calState('fixture-room').cursor=new Date(2026,9,1);window.__calendar=[{date:'2026-10-21',is_available:true,availability_status:'available',admin_available_override:true},{date:'2026-10-22',is_available:false,availability_status:'booked',booking_id:'old-booking'}];window.__icalBlocks=[{date:'2026-10-21',provider:'airbnb'}];await loadRoomCalendar('fixture-room');return [statusFor('fixture-room','2026-10-21'),statusFor('fixture-room','2026-10-22')]});
 expect(statuses).toEqual(['available','booked']);
});
test('received timestamps determine stable newest-first order regardless of payment updates',async({page})=>{
 await page.goto('/admin.html#bookings');
 await page.evaluate(async()=>{document.getElementById('loginView').hidden=true;document.getElementById('dashboard').hidden=false;window.__requests.reverse();window.__requests.find(b=>b.id==='request-5').updated_at='2099-01-01T00:00:00Z';await loadBookings()});
 await expect(page.locator('.booking-identity b')).toHaveText(['FH-FIXTURE-0','FH-FIXTURE-1','FH-FIXTURE-2','FH-FIXTURE-3','FH-FIXTURE-4','FH-FIXTURE-5']);
 await expect(page.locator('.booking-received time').first()).toHaveAttribute('datetime','2026-10-18T15:00:00Z');
 await expect(page.locator('.booking-received').first()).toContainText('17:00:00');
 await page.locator('#refreshBookings').click();await expect(page.locator('.booking-identity b').first()).toHaveText('FH-FIXTURE-0');
});
test('refresh recovers from the first request failing',async({page})=>{
 await page.goto('/admin.html#bookings');
 await page.evaluate(async()=>{document.getElementById('dashboard').hidden=false;const original=sb.from.bind(sb);let fail=true;sb.from=table=>{if(table==='frankiholz_bookings'&&fail){fail=false;return {select(){return this},order(){return this},then(resolve){return Promise.resolve({data:null,error:{message:'Temporary fixture failure'}}).then(resolve)}}}return original(table)};await loadBookings()});
 await expect(page.locator('#bookings')).toContainText('Temporary fixture failure');await page.locator('#refreshBookings').click();await expect(page.locator('.booking-row')).toHaveCount(6);
});

test('complimentary request can be confirmed without a payment schedule prompt',async({page})=>{
 await page.goto('/admin.html#bookings');
 await page.evaluate(async()=>{
   document.getElementById('loginView').hidden=true;document.getElementById('dashboard').hidden=false;
   window.__requests.push({...window.__requests[0],id:'free-request',reference:'FH-FREE',payment_status:'not_required',payment_collection_mode:'complimentary',total_price:0});
   sb.auth.getSession=async()=>({data:{session:{access_token:'fixture-admin-token'}}});await loadBookings();
 });
 await page.route('**/functions/v1/frankiholz-booking-decision',async route=>{
   expect(route.request().postDataJSON()).toEqual({booking_id:'free-request',action:'accept'});
   await page.evaluate(()=>{window.__requests.find(b=>b.id==='free-request').status='confirmed'});
   await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,status:'confirmed',payment_status:'not_required'})});
 });
 page.on('dialog',dialog=>{if(dialog.type()==='confirm'){expect(dialog.message()).toContain('No payment will be collected');expect(dialog.message()).not.toContain('14 days')}return dialog.accept()});
 const row=page.locator('.booking-row').filter({hasText:'FH-FREE'});
 await row.getByRole('button',{name:'Confirm booking',exact:true}).click();await expect(row).toContainText('Confirmed · no payment required');
});
for(const width of [360,768,1280])test(`all Admin sections contain long content at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/admin.html#bookings');
 await page.evaluate(async()=>{document.getElementById('loginView').hidden=true;document.getElementById('dashboard').hidden=false;rooms=[{id:'fixture-room',name:'Room '+ 'longword'.repeat(15),description:'Description '+ 'longword'.repeat(30),active:true,base_price:40,max_guests:2}];renderRooms();renderRoomCalendar('fixture-room');await loadBookings();});
 for(const name of ['Bookings','Rooms & availability','Pricing','Website content','Integrations']){
  await page.getByRole('tab',{name,exact:true}).click();
  const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));expect(metrics.scroll,`${name} overflow`).toBeLessThanOrEqual(metrics.width+1);
 }
 await page.getByRole('tab',{name:'Bookings',exact:true}).click();
 const wrapped=await page.locator('.booking-message').first().evaluate(node=>({scroll:node.scrollWidth,width:node.clientWidth,lines:node.getBoundingClientRect().height/parseFloat(getComputedStyle(node).lineHeight)}));
 expect(wrapped.scroll).toBeLessThanOrEqual(wrapped.width+1);expect(wrapped.lines).toBeGreaterThan(2);
});
