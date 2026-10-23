import {test,expect,type Page,type Route} from '@playwright/test';

const room={id:'00000000-0000-4000-8000-000000000011',slug:'room-one',name:'Garden room',name_de:'Gartenzimmer',description:'A calm room',description_de:'Ein ruhiges Zimmer',base_price:50,max_guests:2,active:true,sort_order:0};
const pending={id:'00000000-0000-4000-8000-000000000021',reference:'FH-PENDING',room_id:room.id,status:'pending',payment_status:'payment_method_saved',payment_mode:'test',payment_schedule_version:'v2_14_day',payment_collection_mode:'saved_method',total_price:100,check_in:'2034-06-10',check_out:'2034-06-12',created_at:'2026-10-23T10:00:00Z',guest_name:'Fixture Guest',guest_email:'guest@example.invalid',guest_languages:['English'],guests:1,frankiholz_rooms:{name:room.name}};
type Fixture=Awaited<ReturnType<typeof setup>>;
async function setup(page:Page,options:{allowed?:boolean;roomMismatch?:boolean;roomDenied?:boolean;bookings?:Record<string,unknown>[]}={}){
 const writes:{path:string;method:string;body:Record<string,unknown>|Record<string,unknown>[]}[]=[],reads:string[]=[],tables:Record<string,Record<string,unknown>[]|Record<string,unknown>>={
  frankiholz_rooms:[{...room}],frankiholz_room_images:[],frankiholz_bookings:options.bookings||[{...pending}],frankiholz_site_settings:{id:1,hero_title:'A home in Frankfurt',hero_title_de:'Ein Zuhause in Frankfurt',hero_subtitle:'Welcome',hero_subtitle_de:'Willkommen',hero_title_size_desktop_px:56,hero_title_size_mobile_px:38},
  frankiholz_pricing_settings:{id:1,weekend_markup_pct:10,occupancy_level_1_pct:50,occupancy_markup_1_pct:5,occupancy_level_2_pct:80,occupancy_markup_2_pct:10,last_minute_days:7,last_minute_discount_pct:5,long_stay_nights_1:7,long_stay_discount_1_pct:5,long_stay_nights_2:14,long_stay_discount_2_pct:10},
  frankiholz_copy:[],frankiholz_ical_feeds:[],frankiholz_calendar:[],frankiholz_ical_blocks:[]
 };
 await page.addInitScript(()=>{
  const expires=Math.floor(Date.now()/1000)+86400;
  const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:'00000000-0000-4000-8000-000000000001',role:'authenticated',exp:expires}))+'.fixture-signature';
  localStorage.setItem('sb-bdeajozhylypiidrldka-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:86400,expires_at:expires,user:{id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'host@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
 });
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.protocol!=='https:')return route.continue();
  if(url.hostname!=='bdeajozhylypiidrldka.supabase.co')return route.abort();
  const path=url.pathname,method=route.request().method();let body:any={};try{if(route.request().headers()['content-type']?.includes('application/json'))body=route.request().postDataJSON()||{};}catch{body={};}
  const json=(value:unknown,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(value)});
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'*'}});
  if(path.startsWith('/auth/'))return json({});
  if(method==='GET')reads.push(path);else writes.push({path,method,body});
  const rpc=path.split('/rpc/')[1];
  if(rpc){
   if(rpc==='frankiholz_admin_access_check')return json(options.allowed!==false);
   if(rpc==='frankiholz_get_payment_environment_state')return json([{environment:'test',live_ready:true,test_ready:true}]);
   if(rpc==='frankiholz_admin_remove_requests'){const ids=body.p_booking_ids as string[];for(const row of tables.frankiholz_bookings as Record<string,unknown>[]){if(ids.includes(String(row.id)))row.admin_deleted_at=body.p_restore?null:'2026-10-23T12:00:00Z';}return json(ids.length);}
   if(rpc==='frankiholz_set_calendar_range'||rpc==='frankiholz_set_airbnb_availability')return json(1);
   return json(null);
  }
  if(path.startsWith('/functions/'))return json({feeds:[{room_id:room.id,ok:true,blocked_dates:3}]});
  if(path.startsWith('/storage/'))return json({Key:'fixture'});
  const name=path.split('/rest/v1/')[1];if(!name)return json({});
  const current=tables[name];
  if(method==='GET'){
   let value=current||[];
   if(Array.isArray(value)&&url.searchParams.get('copy_key')?.startsWith('eq.'))value=value.filter(row=>row.copy_key===url.searchParams.get('copy_key')!.slice(3));
   if(Array.isArray(value)&&url.searchParams.get('copy_key')?.startsWith('in.')){const keys=url.searchParams.get('copy_key')!.slice(4,-1).split(',');value=value.filter(row=>keys.includes(String(row.copy_key)));}
   return json(value);
  }
  if(name==='frankiholz_rooms'&&method==='PATCH'){
   if(options.roomDenied)return json({message:'Room update denied by server',code:'42501'},403);
   const stored={...room,...body,...(options.roomMismatch?{description:'Different server value'}:{})};tables[name]=[stored];return json(stored);
  }
  if(name==='frankiholz_copy'&&method==='POST'){
   const rows=Array.isArray(body)?body:[body],currentRows=tables[name] as Record<string,unknown>[];
   tables[name]=[...currentRows.filter(row=>!rows.some(update=>update.copy_key===row.copy_key)),...rows];return json(rows,201);
  }
  if(method==='PATCH'&&!Array.isArray(current)){tables[name]={...current,...body};return json(tables[name]);}
  if(name==='frankiholz_ical_feeds'&&method==='POST'){tables[name]=[{id:'fixture-feed',room_id:room.id,provider:'airbnb',enabled:true,last_status:'ok'}];return json(tables[name],201);}
  return json(body);
 });
 page.on('dialog',dialog=>void dialog.accept());
 return {writes,reads,tables};
}
async function tab(page:Page,name:string){const button=page.getByRole('navigation',{name:'Admin workspace'}).getByRole('button',{name,exact:true});if(!await button.isVisible())await page.getByRole('button',{name:'Toggle admin menu'}).click();await button.click();}
async function open(page:Page){await page.goto('/admin');await expect(page.getByRole('heading',{name:'Overview.',exact:true})).toBeVisible();}
function rpcWrites(fixture:Fixture,name:string){return fixture.writes.filter(write=>write.path.endsWith('/rpc/'+name));}

test('an unauthorized account never fetches private host data',async({page})=>{
 const f=await setup(page,{allowed:false});await page.goto('/admin');await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();await expect(page.getByRole('alert')).toContainText('not authorized');expect(f.reads.filter(path=>path.startsWith('/rest/'))).toEqual([]);await expect(page.getByText('guest@example.invalid')).toHaveCount(0);
});
test('paid requests are removed reversibly without changing financial state',async({page})=>{
 const paid={...pending,status:'confirmed',payment_status:'paid'};const f=await setup(page,{bookings:[paid]});await open(page);await tab(page,'Bookings');await page.getByRole('checkbox',{name:'Select request FH-PENDING',exact:true}).check();await page.getByRole('button',{name:'Remove selected (1)'}).click();await expect(page.getByRole('article',{name:'FH-PENDING',exact:true})).toHaveCount(0);expect(rpcWrites(f,'frankiholz_admin_remove_requests')[0].body).toEqual({p_booking_ids:[paid.id],p_restore:false});expect(f.writes.filter(write=>write.path.includes('/functions/'))).toEqual([]);expect(paid.status).toBe('confirmed');expect(paid.payment_status).toBe('paid');await page.getByRole('checkbox',{name:'Show removed requests'}).check();await page.getByRole('button',{name:'Restore to bookings'}).click();expect(rpcWrites(f,'frankiholz_admin_remove_requests')[1].body).toEqual({p_booking_ids:[paid.id],p_restore:true});
});
test('processing and operation-locked payments cannot be retried from Admin',async({page})=>{
 const f=await setup(page,{bookings:[{...pending,payment_operation_token:'fixture-lock'},{...pending,id:'processing-booking',reference:'FH-PROCESSING',payment_status:'processing'}]});await open(page);await tab(page,'Bookings');const locked=page.getByRole('article',{name:'FH-PENDING',exact:true});await expect(locked.getByRole('button',{name:'Confirm booking'})).toBeDisabled();await expect(locked).toContainText('Payment operation locked');const processing=page.getByRole('article',{name:'FH-PROCESSING',exact:true});await expect(processing).toContainText('Wait for settlement');await expect(processing.getByRole('button',{name:'Confirm booking'})).toHaveCount(0);expect(f.writes.filter(write=>write.path.includes('/functions/'))).toEqual([]);
});
test('calendar writes use the existing RPC contract and preserve zero price overrides',async({page})=>{
 const f=await setup(page);await open(page);await tab(page,'Availability');await expect(page.getByRole('button',{name:'2034-06-10: Available'})).toHaveCount(0);await page.getByLabel('From',{exact:true}).fill('2034-06-10');await page.getByLabel('Through (inclusive)').fill('2034-06-12');await page.getByLabel('Price override (optional)').fill('0');await page.getByLabel('Admin note (optional)').fill('Fixture maintenance');await page.getByRole('button',{name:'Block range',exact:true}).click();await expect.poll(()=>rpcWrites(f,'frankiholz_set_calendar_range').length).toBe(1);expect(rpcWrites(f,'frankiholz_set_calendar_range')[0].body).toEqual({p_room_id:room.id,p_start_date:'2034-06-10',p_end_date:'2034-06-12',p_status:'blocked',p_price_override:0,p_note:'Fixture maintenance'});
});
for(const failure of ['denied','mismatch'] as const)test(`room ${failure} does not report a successful save`,async({page})=>{
 await setup(page,{roomDenied:failure==='denied',roomMismatch:failure==='mismatch'});await open(page);await tab(page,'Rooms');await page.getByLabel('English room description',{exact:true}).fill('An updated room description');await page.getByRole('button',{name:'Save room details'}).click();await expect(page.getByRole('alert')).toContainText(failure==='denied'?'Room update denied':'did not match');await expect(page.getByLabel('English room description',{exact:true})).toHaveValue('An updated room description');await expect(page.getByText('Room details saved and verified.',{exact:true})).toHaveCount(0);
});
test('homepage order save does not publish unsaved wording',async({page})=>{
 const f=await setup(page);await open(page);await tab(page,'Website studio');await page.getByLabel('Hero title · English',{exact:true}).fill('Unsaved hero wording');await page.getByRole('button',{name:'Move Guest reviews down'}).click();await page.getByRole('button',{name:'Save section order'}).click();await expect(page.getByRole('status')).toContainText('Homepage order saved and verified');const copyWrites=f.writes.filter(write=>write.path==='/rest/v1/frankiholz_copy');expect(copyWrites).toHaveLength(1);const rows=copyWrites[0].body as Record<string,unknown>[];expect(rows.map(row=>row.copy_key)).toEqual(['fhHomepageOrder']);expect(rows[0].text_en).toBe(rows[0].text_de);await expect(page.getByLabel('Hero title · English',{exact:true})).toHaveValue('Unsaved hero wording');expect(f.writes.filter(write=>write.path==='/rest/v1/frankiholz_site_settings')).toEqual([]);
});
test('publishing an avatar writes only the shared photo and preserves unsaved text',async({page})=>{
 const f=await setup(page);await open(page);await tab(page,'Website studio');await page.getByLabel('Hero title · English',{exact:true}).fill('Unsaved hero wording');await page.getByLabel('Choose a new host photo').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});await page.getByRole('button',{name:'Publish host photo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Host photo published for both languages');const writes=f.writes.filter(write=>write.path==='/rest/v1/frankiholz_copy');expect(writes).toHaveLength(1);const rows=writes[0].body as Record<string,unknown>[];expect(rows).toHaveLength(1);expect(rows[0].copy_key).toBe('fhHostPhoto');expect(rows[0].text_en).toBe(rows[0].text_de);expect(rows[0].text_en).toMatch(/^host\/[a-z0-9-]+\.png$/);await expect(page.getByLabel('Hero title · English',{exact:true})).toHaveValue('Unsaved hero wording');
});
