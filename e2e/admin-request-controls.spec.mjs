import {test,expect} from '@playwright/test';
import {blockExternalNetwork} from './helpers.mjs';
test.beforeEach(async({page})=>{
 await blockExternalNetwork(page);
 await page.addInitScript(()=>{
  window.__requests=['not_started','awaiting_payment','paid','processing','scheduled_charge','refunded'].map((payment_status,i)=>({id:'request-'+i,reference:'FH-FIXTURE-'+i,status:i<2?'pending':'confirmed',payment_status,payment_mode:'live',payment_schedule_version:'v2_14_day',total_price:0.5,guests:1,check_in:'2026-10-21',check_out:'2026-10-22',guest_name:'Fixture',guest_email:'fixture@example.invalid',frankiholz_rooms:{name:'Room 1'}}));
  window.__calls=[];
  window.supabase={createClient:()=>({
   from(table){return {select(){return this},order(){return this},eq(){return this},in(){return this},maybeSingle:async()=>({data:null}),then(resolve,reject){return Promise.resolve({data:table==='frankiholz_bookings'?window.__requests:[],error:null}).then(resolve,reject)}}},
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
 const statuses=await page.evaluate(()=>{const st=calState('fixture-room');st.rows=[{date:'2026-10-21',is_available:true,availability_status:'available',admin_available_override:true},{date:'2026-10-22',is_available:false,availability_status:'booked',booking_id:'old-booking'}];st.icalBlocks=[{date:'2026-10-21',provider:'airbnb'}];return [statusFor('fixture-room','2026-10-21'),statusFor('fixture-room','2026-10-22')]});
 expect(statuses).toEqual(['available','booked']);
});
