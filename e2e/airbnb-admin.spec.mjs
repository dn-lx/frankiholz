import {test,expect} from '@playwright/test';
import {blockExternalNetwork} from './helpers.mjs';

test.beforeEach(async({page})=>{
  await blockExternalNetwork(page);
  await page.clock.install({time:new Date('2026-10-19T10:00:00+02:00')});
  await page.addInitScript(()=>{
    window.__calendar=[{date:'2026-10-21',is_available:true,availability_status:'available',admin_available_override:true}];
    window.__calls=[];
    window.supabase={createClient:()=>({
      from(table){return {select(){return this},eq(){return this},gte(){return this},lte(){return this},order(){return this},then(resolve,reject){return Promise.resolve({data:table==='frankiholz_calendar'?window.__calendar:table==='frankiholz_ical_blocks'?[{date:'2026-10-21',provider:'airbnb'},{date:'2026-10-22',provider:'airbnb'}]:[],error:null}).then(resolve,reject)}}},
      rpc:async(name,args)=>{window.__calls.push({name,args});if(name==='frankiholz_set_airbnb_availability'){window.__calendar[0].admin_available_override=args.p_available_here;return {data:1,error:null}}return {data:false,error:null}},
      auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}
    })};
  });
  await page.goto('/admin.html#rooms');
  await page.evaluate(async()=>{
    document.getElementById('loginView').hidden=true;document.getElementById('dashboard').hidden=false;
    rooms=[{id:'fixture-room',name:'Cozy Holz',name_de:'Gemütliches Holz',description:'English room details',description_de:'Deutsche Zimmerdetails',base_price:40,max_guests:2,active:true}];
    images=Array.from({length:8},(_,i)=>({id:'photo-'+i,room_id:'fixture-room',storage_path:'fixture-'+i+'.jpg'}));
    renderRooms();await loadRoomCalendar('fixture-room');
  });
});

for(const width of [360,768,1280])test(`room details precede full-width photos at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const geometry=await page.locator('.room-editor-top').evaluate(node=>{
    const details=node.querySelector('.room-details-editor').getBoundingClientRect(),photos=node.querySelector('.room-photos-editor').getBoundingClientRect();
    return {details:details.toJSON(),photos:photos.toJSON(),scroll:document.documentElement.scrollWidth,width:innerWidth};
  });
  expect(geometry.photos.y).toBeGreaterThanOrEqual(geometry.details.bottom);
  expect(Math.abs(geometry.photos.width-geometry.details.width)).toBeLessThan(1);
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
  await expect(page.getByLabel('Room name',{exact:true})).toHaveValue('Cozy Holz');
});

test('Airbnb override is visible, removable and explicitly selectable again',async({page})=>{
  const day=page.locator('#rc-fixture-room button').filter({hasText:/^21/});
  await expect(day).toHaveClass(/airbnb-override/);await expect(day).toContainText('Available here');
  await expect(page.locator('#rc-sync-fixture-room')).toContainText('2 Airbnb-blocked nights · 1 available here');
  await day.click();await page.getByRole('button',{name:'Follow Airbnb again',exact:true}).click();
  await expect(day).toHaveClass(/blocked/);await expect(day).not.toHaveClass(/airbnb-override/);
  await expect(page.locator('#rc-status-fixture-room')).toContainText('1 date returned to normal availability rules');
  await day.click();await page.getByRole('button',{name:'Airbnb blocked · make available here',exact:true}).click();
  await expect(day).toHaveClass(/airbnb-override/);
  expect(await page.evaluate(()=>window.__calls.filter(c=>c.name==='frankiholz_set_airbnb_availability').map(c=>c.args.p_available_here))).toEqual([false,true]);
});

test('sync reports imported nights, refreshes calendar and retains explicit overrides',async({page})=>{
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'fixture-admin-token'}}})});
  await page.route('**/functions/v1/frankiholz-sync-airbnb',async route=>{
    expect(route.request().headers().authorization).toBe('Bearer fixture-admin-token');
    expect(route.request().postDataJSON()).toEqual({room_id:'fixture-room'});
    await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,feeds:[{room_id:'fixture-room',ok:true,blocked_dates:39}]})});
  });
  await page.getByRole('button',{name:'Sync this room’s Airbnb calendar'}).click();
  await expect(page.locator('#rc-status-fixture-room')).toContainText('1 feed updated · 39 imported nights');
  await expect(page.locator('.airbnb-override')).toContainText('Available here');
  expect(await page.evaluate(()=>window.__calls.some(c=>c.name==='frankiholz_set_airbnb_availability'))).toBe(false);
});

test('sync failures and no connected calendars cannot appear as successful updates',async({page})=>{
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'fixture-admin-token'}}})});
  let empty=false;
  await page.route('**/functions/v1/frankiholz-sync-airbnb',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:empty,feeds:empty?[]:[{room_id:'fixture-room',ok:false,error:'Calendar server returned HTTP 503'}]})}));
  const sync=page.getByRole('button',{name:'Sync this room’s Airbnb calendar'});
  await sync.click();await expect(page.locator('#rc-status-fixture-room')).toContainText('Cozy Holz: Calendar server returned HTTP 503');
  await expect(page.locator('#rc-status-fixture-room .notice')).not.toHaveClass(/success/);
  empty=true;await sync.click();await expect(page.locator('#rc-status-fixture-room')).toContainText('No enabled Airbnb calendars found');
});

test('reset overrides still displays confirmed bookings whose old calendar link was cleared',async({page})=>{
  const status=await page.evaluate(()=>{const st=calState('fixture-room');st.rows[0].admin_available_override=false;st.reservations=[{check_in:'2026-10-21',check_out:'2026-10-22'}];return statusFor('fixture-room','2026-10-21')});
  expect(status).toBe('booked');
});

test('feed replacement is disabled while sync is running',async({page})=>{
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'fixture-admin-token'}}});renderIcalFeeds()});
  let finish;
  const pending=new Promise(resolve=>{finish=resolve});
  await page.route('**/functions/v1/frankiholz-sync-airbnb',async route=>{await pending;await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,feeds:[{room_id:'fixture-room',ok:true,blocked_dates:2}]})})});
  await page.getByRole('button',{name:'Sync this room’s Airbnb calendar'}).click();
  await page.getByRole('tab',{name:'Integrations',exact:true}).click();
  await expect(page.locator('.sync-feed-button')).toBeDisabled();
  finish();
  await expect(page.locator('.sync-feed-button')).toBeEnabled();
});
