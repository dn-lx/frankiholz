import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {blockExternalNetwork} from './helpers.mjs';

const defaults=['fhReviewsBand','roomsSection','hostMessage','guestInfoPublic','bookingSection','location','cancellationPolicy','bookingStatusSection'];
const reversed=[...defaults].reverse();
test.beforeEach(async({page})=>{
 await blockExternalNetwork(page);
 await page.addInitScript(()=>{
  window.__copy=JSON.parse(sessionStorage.getItem('layout-fixture-copy')||'[]');window.__writes=[];window.__allowed=true;window.__session=true;window.__authCallbacks=[];window.__readError=Boolean(sessionStorage.getItem('layout-read-failure'));
  const room={id:'room-fixture',name:'Cozy room',name_de:'Gemütliches Zimmer',description:'A comfortable room',description_de:'Ein gemütliches Zimmer',base_price:50,max_guests:1,active:true};
  window.supabase={createClient:()=>({
   from(table){let filters=[];const result=()=>{const data=table==='frankiholz_copy'?window.__copy:table==='frankiholz_rooms'?[room]:[];return {data:data.filter(row=>filters.every(fn=>fn(row))),error:window.__readError?{message:'Read failed'}:null}};return {
    select(){return this},order(){return this},eq(key,value){filters.push(row=>row[key]===value);return this},in(key,values){filters.push(row=>values.includes(row[key]));return this},
    single:async()=>({data:null,error:null}),maybeSingle:async()=>{const r=result();return {data:window.__mismatch&&window.__writes.length?{text_en:'wrong',text_de:'wrong'}:r.data[0]||null,error:r.error}},
    upsert(rows){window.__writes.push({table,rows});if(window.__saveError)return Promise.resolve({error:{message:'Save failed'}});window.__copy=[...window.__copy.filter(old=>!rows.some(row=>row.copy_key===old.copy_key)),...rows];sessionStorage.setItem('layout-fixture-copy',JSON.stringify(window.__copy));return Promise.resolve({error:null})},
    then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}
   }},
   rpc:async name=>({data:name==='frankiholz_admin_access_check'?window.__allowed:[],error:null}),
   auth:{getSession:async()=>({data:{session:window.__session?{access_token:'fixture',user:{id:'fixture'}}:null}}),onAuthStateChange:callback=>{window.__authCallbacks.push(callback);return {}},signOut:async()=>({})}
  })};
 });
});
const ids=page=>page.locator('#homepageSectionOrder li').evaluateAll(rows=>rows.map(row=>row.dataset.sectionId));
async function seed(page,value){await page.goto('/?lang=en');await page.evaluate(value=>sessionStorage.setItem('layout-fixture-copy',JSON.stringify([{copy_key:'fhHomepageOrder',text_en:value,text_de:value}])),value);}

for(const language of ['en','de'])test(`saved homepage order applies in ${language} and preserves booking controls`,async({page})=>{
 await seed(page,JSON.stringify(reversed));await page.goto('/?lang='+language);
 await expect.poll(()=>page.locator('main>section').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(reversed);
 await page.locator('.room-card button').click();await expect(page.locator('#bookingSection')).toBeVisible();
 await page.locator('#guestName').fill('Guest draft');
 const state=await page.evaluate(order=>{
  const input=document.getElementById('guestName');let clicked=0;document.getElementById('jumpToCalendar').addEventListener('click',()=>clicked++);
  window.FrankiHolzLayout.applyOrder(JSON.stringify(order));document.getElementById('jumpToCalendar').click();
  return {sameNode:input===document.getElementById('guestName'),value:input.value,focused:document.activeElement===input,clicked,hidden:document.getElementById('bookingSection').hidden};
 },defaults);
 expect(state).toEqual({sameNode:true,value:'Guest draft',focused:true,clicked:1,hidden:false});
 await page.locator('#openHouseGuide').click();await expect(page.getByRole('dialog')).toBeVisible();
});

test('arrow controls save only section order, preserve unsaved wording, and persist after reload',async({page})=>{
 await page.goto('/admin.html#website');await expect(page.locator('#homepageSectionOrder li')).toHaveCount(8);
 await expect(page.getByRole('button',{name:'Move Guest reviews up',exact:true})).toBeDisabled();
 await page.locator('#copy-en-heroMinor').fill('Unsaved wording');
 await page.getByRole('button',{name:'Move Rooms up',exact:true}).click();
 await expect(page.locator('[data-section-id="roomsSection"]')).toBeFocused();
 expect((await ids(page))[0]).toBe('roomsSection');
 await page.evaluate(()=>window.__authCallbacks.at(-1)('TOKEN_REFRESHED',{access_token:'fixture'}));
 await page.getByRole('button',{name:'Save order',exact:true}).click();await expect(page.locator('#homepageLayoutStatus')).toContainText('saved and verified');
 await expect(page.locator('#copy-en-heroMinor')).toHaveValue('Unsaved wording');
 const write=await page.evaluate(()=>window.__writes);expect(write).toHaveLength(1);expect(write[0].rows).toHaveLength(1);
 expect(write[0].rows[0].copy_key).toBe('fhHomepageOrder');expect(write[0].rows[0].text_en).toBe(write[0].rows[0].text_de);
 await page.reload();await expect.poll(async()=>(await ids(page))[0]).toBe('roomsSection');
 await page.goto('/?lang=de');await expect.poll(()=>page.locator('main>section').first().getAttribute('id')).toBe('roomsSection');
});

test('drag and drop changes position, and default restoration remains unsaved until saved',async({page})=>{
 await page.goto('/admin.html#website');await expect(page.locator('#homepageSectionOrder li')).toHaveCount(8);
 await page.locator('[data-section-id="hostMessage"]').dragTo(page.locator('[data-section-id="fhReviewsBand"]'));
 expect((await ids(page))[0]).toBe('hostMessage');await expect(page.locator('#homepageLayoutStatus')).toContainText('Unsaved changes');
 expect(await page.evaluate(()=>window.__writes.length)).toBe(0);
 await page.getByRole('button',{name:'Save order',exact:true}).click();await expect(page.locator('#homepageLayoutStatus')).toContainText('saved and verified');
 await page.getByRole('button',{name:'Restore default',exact:true}).click();expect(await ids(page)).toEqual(defaults);
 await expect(page.locator('#homepageLayoutStatus')).toContainText('Save order to publish');
 await page.getByRole('button',{name:'Reload saved order',exact:true}).click();await expect.poll(async()=>(await ids(page))[0]).toBe('hostMessage');
});

test('invalid saved data falls back safely and can be repaired in Admin',async({page})=>{
 await seed(page,'["roomsSection","roomsSection","<img src=x onerror=alert(1)>"]');await page.goto('/?lang=en');
 expect(await page.locator('main>section').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(defaults);
 await page.goto('/admin.html#website');await expect(page.locator('#homepageLayoutStatus')).toContainText('needs updating');
 expect(await ids(page)).toEqual(defaults);await page.locator('#saveHomepageLayout').click();await expect(page.locator('#homepageLayoutStatus')).toContainText('saved and verified');
});

test('denied access, failed saves and readback mismatches never show success',async({page})=>{
 await page.goto('/admin.html#website');await expect(page.locator('#homepageSectionOrder li')).toHaveCount(8);
 await page.getByRole('button',{name:'Move Rooms up',exact:true}).click();await page.evaluate(()=>window.__allowed=false);
 await page.locator('#saveHomepageLayout').click();await expect(page.locator('#homepageLayoutStatus')).toContainText('Not authorized');expect(await page.evaluate(()=>window.__writes.length)).toBe(0);
 await page.evaluate(()=>{window.__allowed=true;window.__saveError=true;});
 await page.locator('#saveHomepageLayout').click();await expect(page.locator('#homepageLayoutStatus')).toContainText('Save failed');
 await page.evaluate(()=>{window.__saveError=false;window.__mismatch=true;});
 await page.locator('#saveHomepageLayout').click();await expect(page.locator('#homepageLayoutStatus')).toContainText('could not be verified');
 await expect(page.locator('#saveHomepageLayout')).toBeEnabled();
});

test('load failure is recoverable and does not allow saving an unloaded order',async({page})=>{
 await page.goto('/?lang=en');await page.evaluate(()=>sessionStorage.setItem('layout-read-failure','true'));
 await page.goto('/admin.html#website');await expect(page.locator('#homepageLayoutStatus')).toContainText('Read failed');
 await expect(page.locator('#saveHomepageLayout')).toBeDisabled();await expect(page.getByRole('button',{name:'Move Rooms up',exact:true})).toBeDisabled();
 await page.evaluate(()=>{window.__readError=false;sessionStorage.removeItem('layout-read-failure');});await page.locator('#reloadHomepageLayout').click();await expect(page.locator('#homepageLayoutStatus')).toContainText('Order loaded');
});

for(const width of [360,1280])test(`section editor fits and remains accessible at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/admin.html#website');await expect(page.locator('#homepageSectionOrder li')).toHaveCount(8);
 await page.getByRole('button',{name:'Move Rooms up',exact:true}).focus();await page.keyboard.press('Enter');expect((await ids(page))[0]).toBe('roomsSection');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 const results=await new AxeBuilder({page}).include('#homepageLayoutSettings').analyze();expect(results.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
});
