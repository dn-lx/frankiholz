import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {blockExternalNetwork} from './helpers.mjs';

test.beforeEach(async({page})=>{
 await blockExternalNetwork(page);
 await page.addInitScript(()=>{
  window.__copy=JSON.parse(sessionStorage.getItem('fixture-copy')||'null')||[{copy_key:'fhFacilities',text_en:'Wi-Fi\nKitchen',text_de:'WLAN\nKüche'}];window.__writes=[];window.__allowed=true;
  window.__guest={id:'fixture',reference:'FH-PREVIEW',created_at:'2026-10-20T18:00:00Z',guest_name:'Alex Guest',guest_email:'guest@example.invalid',guest_phone:'+49 170 0000000',guest_country:'Germany',guest_age:32,guest_sex:'prefer_not_to_say',guest_languages:['English','Deutsch'],guest_returning:false,guest_hobbies:'Photography & hiking',message:'Arriving at 18:00. Thank you! '+ '<img src=x onerror="window.__xss=true">',language:'en',check_in:'2026-11-10',check_out:'2026-11-12',guests:1,total_price:90,status:'pending',payment_mode:'live',payment_status:'payment_method_saved',payment_schedule_version:'v2_14_day',frankiholz_rooms:{name:'Cozy Holz'}};
  window.supabase={createClient:()=>({
   from(table){return {select(){return this},order(){return this},eq(){return this},in(){return this},gte(){return this},lte(){return this},single:async()=>({data:null,error:null}),maybeSingle:async()=>({data:null,error:null}),upsert(rows){window.__writes.push({table,rows});if(window.__saveError)return Promise.resolve({error:{message:'Save failed'}});window.__copy=[...window.__copy.filter(old=>!rows.some(row=>row.copy_key===old.copy_key)),...rows];sessionStorage.setItem('fixture-copy',JSON.stringify(window.__copy));return Promise.resolve({error:null})},then(resolve,reject){return Promise.resolve({data:table==='frankiholz_copy'?window.__copy:table==='frankiholz_bookings'?[window.__guest]:[],error:null}).then(resolve,reject)}}},
   storage:{from:()=>({upload:async(path,file)=>{(window.__uploads||=[]).push({path,type:file.type});return {error:null}},remove:async paths=>{window.__removed=paths;return {error:null}}})},
   rpc:async name=>({data:name==='frankiholz_admin_access_check'?window.__allowed:[],error:null}),
   auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}}),signOut:async()=>({}),onAuthStateChange:()=>({})}
  })};
 });
});

for(const language of ['en','de'])test(`house guide opens inline, scrolls, switches language and restores focus in ${language}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?lang='+language);
 await expect(page.locator('#houseRules .fh-rules p')).toHaveText(['17:00','11:00']);
 await expect(page.locator('#houseRules')).not.toContainText('Only registered guests');
 const tabs=page.context().pages().length;
 await page.locator('#openHouseGuide').click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect(page.locator('#houseGuideContent')).toContainText(language==='en'?'Kitchen & food':'Küche & Lebensmittel');
 const scroll=await page.locator('.house-guide-scroll').evaluate(node=>({scroll:node.scrollHeight,height:node.clientHeight,width:node.scrollWidth,client:node.clientWidth}));
 expect(scroll.scroll).toBeGreaterThan(scroll.height);expect(scroll.width).toBeLessThanOrEqual(scroll.client+1);
 await page.locator('.house-guide-scroll').focus();await page.keyboard.press('End');
 await expect.poll(()=>page.locator('.house-guide-scroll').evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
 await page.locator('[data-guide-lang="en"]').click();await expect(page.locator('#houseGuideContent')).toContainText('22:00 to 07:00');await expect(page.locator('#houseGuideContent')).toContainText('Additional guests or visitors');
 await page.locator('[data-guide-lang="de"]').click();await expect(page.locator('#houseGuideContent')).toContainText('Badezimmer & Toilette');await expect(page.locator('#closeHouseGuide')).toHaveText('Schließen');await expect(dialog).toHaveAttribute('lang','de');
 expect(page.context().pages().length).toBe(tabs);
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.locator('#openHouseGuide')).toBeFocused();
});

test('expanded guide has no serious or critical automated accessibility issues',async({page})=>{
 await page.goto('/');await page.locator('#openHouseGuide').click();
 const audit=await new AxeBuilder({page}).include('#houseGuideDialog').analyze();
 expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
});

for(const width of [360,1280])test(`Admin shows complete, escaped guest profile and wraps at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/admin.html#bookings');
 const card=page.locator('.booking-row');await expect(card).toContainText('Alex Guest');
 for(const value of ['Germany','32','Prefer not to say','English, Deutsch','No · first stay','Photography & hiking','Arriving at 18:00.'])await expect(card).toContainText(value);
 await expect(card.locator('.booking-message img')).toHaveCount(0);expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 await page.evaluate(async()=>{Object.assign(window.__guest,{guest_country:null,guest_age:null,guest_returning:true,guest_languages:[],guest_hobbies:null,guest_sex:null});await loadBookings()});
 await expect(card).toContainText('Yes · welcome back');await expect(card).toContainText('Not provided');
});

test('Admin can add and remove bilingual amenities, validate and verify saved copy',async({page})=>{
 await page.goto('/admin.html#website');const rows=page.locator('.amenity-editor-row');await expect(rows).toHaveCount(2);
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
 await page.getByRole('button',{name:'+ Add amenity',exact:true}).click();await expect(rows).toHaveCount(3);
 await rows.last().getByRole('textbox',{name:'English',exact:true}).fill('Workspace <b>quiet</b>');
 await page.locator('#saveGuestInfo').click();await expect(page.locator('#guestInfoStatus')).toContainText('both English and German');
 expect(await page.evaluate(()=>window.__writes.length)).toBe(0);
 await rows.last().getByRole('textbox',{name:'Deutsch',exact:true}).fill('Arbeitsplatz');
 await rows.nth(1).getByRole('button',{name:'Remove amenity',exact:true}).click();await expect(rows).toHaveCount(2);
 await page.locator('#saveGuestInfo').click();await expect(page.locator('#guestInfoStatus')).toContainText('saved and verified');
 const result=await page.evaluate(()=>window.__copy.find(r=>r.copy_key==='fhFacilities'));expect(result.text_en).toBe('Wi-Fi\nWorkspace <b>quiet</b>');expect(result.text_de).toBe('WLAN\nArbeitsplatz');
 await page.reload();await expect(rows).toHaveCount(2);await expect(rows.last().getByRole('textbox',{name:'Deutsch',exact:true})).toHaveValue('Arbeitsplatz');
 await page.evaluate(()=>window.__allowed=false);await page.locator('#saveGuestInfo').click();await expect(page.locator('#guestInfoStatus')).toContainText('Not authorized');expect(await page.evaluate(()=>window.__writes.length)).toBe(0);
});
test('public times follow editable legacy copy while keeping concise formatting',async({page})=>{
 await page.addInitScript(()=>window.__copy.push({copy_key:'fhCheckIn',text_en:'Check-in: From 18:30 on your arrival date.',text_de:'Check-in: Ab 18:30 Uhr.'},{copy_key:'fhCheckOut',text_en:'Check-out: By 10:00 on departure.',text_de:'Check-out: Bis 10:00 Uhr.'}));
 await page.goto('/');await expect(page.locator('#houseRules .fh-rules p')).toHaveText(['18:30','10:00']);
 await page.locator('#openHouseGuide').click();await expect(page.locator('#houseGuideContent')).toContainText('Check-in: 18:30 · Check-out: 10:00');await expect(page.locator('#houseGuideContent')).toContainText('check out by 10:00');
});
for(const width of [360,768,1280])test(`larger logo stays separate from navigation at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 const bounds=await page.evaluate(()=>{const logo=document.querySelector('.brand-logo-drive').getBoundingClientRect(),actions=document.querySelector('.nav-actions').getBoundingClientRect();return {height:logo.height,right:logo.right,left:actions.left,scroll:document.documentElement.scrollWidth}});
 expect(bounds.height).toBeCloseTo(width<=600?117:162,0);expect(bounds.right).toBeLessThanOrEqual(bounds.left);expect(bounds.scroll).toBeLessThanOrEqual(width+1);
});

for(const language of ['en','de'])test(`host welcome and editable heating rule render safely in ${language}`,async({page})=>{
 await page.addInitScript(()=>window.__copy.push({copy_key:'fhHeatingRule',text_en:'Keep heating on, no higher than 3. If too cold, contact us.',text_de:'Heizung eingeschaltet lassen, höchstens Stufe 3. Bei Kälte bitte melden.'}));
 await page.goto('/?lang='+language);
 await expect(page.locator('#roomsSection [data-i18n="roomsLead"]')).toHaveCount(0);
 await expect(page.locator('#fhHostName')).toHaveText('Inura');
 await expect(page.locator('#fhHostBody p')).toHaveCount(3);
 await expect(page.locator('#fhHostBody')).toContainText(language==='en'?"Everyone is welcome.":'Alle sind willkommen.');
 await expect(page.locator('#fhHostBody')).toContainText(language==='en'?"We value our guests' privacy":'Wir schätzen die Privatsphäre');
 await page.locator('#openHouseGuide').click();
 await expect(page.locator('#houseGuideContent')).toContainText(language==='en'?'Keep heating on, no higher than 3.':'höchstens Stufe 3');
 await page.keyboard.press('Escape');
 await page.locator('.lang-btn[data-lang="'+(language==='en'?'de':'en')+'"]').click();
 await expect(page.locator('#fhHostBody')).toContainText(language==='en'?'Alle sind willkommen.':'Everyone is welcome.');
});

test('Admin saves homepage and host text in both languages; public rendering treats it as text',async({page})=>{
 await page.goto('/admin.html#website');
 await expect(page.locator('#homeCopyEditors .copy-editor-row')).toHaveCount(10);
 await page.locator('#copy-en-heroMinor').fill('A personal welcome <b>to Frankfurt</b>');
 await page.locator('#copy-de-heroMinor').fill('');
 await page.locator('#saveHomeCopy').click();await expect(page.locator('#homeCopyStatus')).toContainText('both English and German');
 expect(await page.evaluate(()=>window.__writes.length)).toBe(0);
 await page.locator('#copy-de-heroMinor').fill('Persönlich willkommen');
 await page.locator('#saveHomeCopy').click();await expect(page.locator('#homeCopyStatus')).toContainText('saved and verified');
 await page.reload();await expect(page.locator('#copy-en-heroMinor')).toHaveValue('A personal welcome <b>to Frankfurt</b>');
 await page.goto('/?lang=en');await expect(page.locator('[data-i18n="heroMinor"]')).toHaveText('A personal welcome <b>to Frankfurt</b>');
 await expect(page.locator('[data-i18n="heroMinor"] b')).toHaveCount(0);
 await page.goto('/admin.html#website');
 await page.locator('#fh-edit-fhHostBody-en').fill('A warm hello.\n\nEveryone is welcome.');
 await page.locator('#fh-edit-fhHostBody-de').fill('Herzlich willkommen.\n\nAlle sind willkommen.');
 await page.locator('#saveGuestInfo').click();await expect(page.locator('#guestInfoStatus')).toContainText('saved and verified');
 await page.goto('/?lang=de');await expect(page.locator('#fhHostBody p')).toHaveText(['Herzlich willkommen.','Alle sind willkommen.']);
 await page.goto('/admin.html#website');await page.evaluate(()=>window.__allowed=false);
 await page.locator('#saveHomeCopy').click();await expect(page.locator('#homeCopyStatus')).toContainText('Not authorized');
 expect(await page.evaluate(()=>window.__writes.length)).toBe(0);
});

for(const width of [360,660,900,1280])test(`hero badge clears navigation and host message fits at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>window.__copy.push({copy_key:'eyebrow',text_en:'A comfortable and welcoming stay in Frankfurt am Main',text_de:'Ein gemütlicher und herzlicher Aufenthalt in Frankfurt am Main'}));
 await page.goto('/?lang=de');
 const nav=await page.locator('.site-nav').boundingBox(),badge=await page.locator('.fh-hero-rail .eyebrow').boundingBox();
 expect(badge.y).toBeGreaterThanOrEqual(nav.y+nav.height+20);
 await expect(page.locator('#hostMessage')).toContainText('Alle sind willkommen.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
});

for(const width of [360,1280])test(`guide switch and booking stay summary fit at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/?lang=en');
 await expect(page.locator('#fhHostPhoto')).toHaveAttribute('src','/assets/host-inura.jpg');
 await page.locator('#openHouseGuide').click();
 const logo=await page.locator('.house-guide-logo').boundingBox(),switcher=await page.locator('.house-guide-languages').boundingBox();
 expect(switcher.x).toBeGreaterThan(logo.x+logo.width);
 await expect(page.locator('[data-guide-lang="en"]')).toHaveText('EN');await expect(page.locator('[data-guide-lang="en"]')).toHaveClass(/active/);
 await page.locator('[data-guide-lang="de"]').click();await expect(page.locator('[data-guide-lang="de"]')).toHaveClass(/active/);
 expect(await page.evaluate(()=>({language:document.documentElement.lang,saved:localStorage.getItem('frankiholz-lang'),url:new URL(location.href).searchParams.get('lang')}))).toEqual({language:'en',saved:'en',url:'en'});
 await expect(page.locator('#houseGuideContent')).toContainText('Heizung');
 await page.goto('/admin.html#bookings');
 await expect(page.locator('.booking-stay dt')).toHaveText(['Check-in','Check-out','Guests','Stay total']);
 await expect(page.locator('.booking-stay dd')).toHaveText(['10 Nov 2026','12 Nov 2026','1','€90.00']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
});

test('room cards keep name, price and action without duplicate guest and description text',async({page})=>{
 await page.goto('/?lang=en');
 await page.evaluate(()=>{rooms=[{id:'fixture-room',name:'Cozy room',description:'Duplicate description',max_guests:2,base_price:50}];renderRooms();});
 await expect(page.locator('.room-card')).toContainText('Cozy room');await expect(page.locator('.room-card')).toContainText('€50.00');
 await expect(page.locator('.room-card')).not.toContainText('Duplicate description');await expect(page.locator('.room-card')).not.toContainText('Up to');
 await expect(page.locator('.room-card button')).toHaveText('View room & availability');
});

const avatarFile={name:'portrait.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVZkAAAAASUVORK5CYII=','base64')};
test('Admin avatar upload authorizes, publishes only photo, retains unsaved text and survives reload',async({page})=>{
 await page.goto('/admin.html#website');await expect(page.locator('#fhUploadHostPhoto')).toBeVisible();
 await page.locator('#fh-edit-fhHostName-en').fill('Unsaved host name');
 await page.locator('#fhHostPhotoFile').setInputFiles(avatarFile);await page.locator('#fhUploadHostPhoto').click();
 await expect(page.locator('#fhHostPhotoStatus')).toContainText('saved and verified');
 await expect(page.locator('#fh-edit-fhHostName-en')).toHaveValue('Unsaved host name');
 const state=await page.evaluate(()=>({uploads:window.__uploads,writes:window.__writes,photo:window.__copy.find(row=>row.copy_key==='fhHostPhoto')}));
 expect(state.uploads).toHaveLength(1);expect(state.writes).toHaveLength(1);expect(state.writes[0].rows).toHaveLength(1);
 expect(state.photo.text_en).toMatch(/^host\/[a-f0-9-]+\.png$/);expect(state.photo.text_de).toBe(state.photo.text_en);
 await page.reload();await expect(page.locator('#fhHostPhotoPreview')).toHaveAttribute('src',new RegExp(state.photo.text_en+'$'));
 await page.goto('/?lang=de');await expect(page.locator('#fhHostPhoto')).toHaveAttribute('src',new RegExp(state.photo.text_en+'$'));
});

test('avatar rejects unsafe files and unauthorized uploads, and cleans failed copy save',async({page})=>{
 await page.goto('/admin.html#website');await expect(page.locator('#fhUploadHostPhoto')).toBeVisible();
 await page.locator('#fhHostPhotoFile').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
 await page.locator('#fhUploadHostPhoto').click();await expect(page.locator('#fhHostPhotoStatus')).toContainText('JPG, PNG or WebP');
 await page.locator('#fhHostPhotoFile').setInputFiles({...avatarFile,buffer:Buffer.alloc(5*1024*1024+1)});
 await page.locator('#fhUploadHostPhoto').click();await expect(page.locator('#fhHostPhotoStatus')).toContainText('up to 5 MB');
 await page.locator('#fhHostPhotoFile').setInputFiles(avatarFile);await page.evaluate(()=>window.__allowed=false);
 await page.locator('#fhUploadHostPhoto').click();await expect(page.locator('#fhHostPhotoStatus')).toContainText('Not authorized');
 expect(await page.evaluate(()=>window.__uploads||[])).toHaveLength(0);
 await page.evaluate(()=>{window.__allowed=true;window.__saveError=true;});
 await page.locator('#fhUploadHostPhoto').click();await expect(page.locator('#fhHostPhotoStatus')).toContainText('Save failed');
 expect(await page.evaluate(()=>window.__removed)).toHaveLength(1);await expect(page.locator('#fhHostPhotoPreview')).toHaveAttribute('src','/assets/host-inura.jpg');
});
