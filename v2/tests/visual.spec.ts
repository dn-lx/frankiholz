import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mockPublic,stableRender} from './public-fixture';

test('public content, language, guide, responsive layout and reduced motion remain usable',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await mockPublic(page);
  await page.goto('/?lang=en');
  await expect(page.getByRole('heading',{name:'The Garden Room'})).toBeVisible();
  await expect(page.locator('#hostMessage')).toContainText('Inura');
  await expect(page.locator('#houseRules')).toContainText('17:00');
  for(const width of [390,820,1440]){
    await page.setViewportSize({width,height:950});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  }
  await page.getByRole('button',{name:'DE',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Das Gartenzimmer'})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','de');
  await page.getByRole('button',{name:'Hausregeln lesen',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Ihr Hausguide'})).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Küche');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Hausregeln lesen',exact:true})).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await page.locator('#roomsSection').scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/home-'+info.project.name+'.png',fullPage:true,animations:'disabled'});
  expect(errors).toEqual([]);
});

test('map stays unloaded until consent and resets on reload',async({page})=>{
  const requests=await mockPublic(page);await page.goto('/?lang=en');
  await expect(page.getByRole('heading',{name:'The Garden Room'})).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(requests.some(url=>url.includes('google.'))).toBe(false);
  await page.getByRole('button',{name:'Show map',exact:true}).click();
  await expect(page.locator('iframe')).toHaveAttribute('referrerpolicy','no-referrer');
  await page.reload();await expect(page.getByRole('heading',{name:'The Garden Room'})).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('validated Admin section order and bilingual content are consumed by React',async({page})=>{
  const order=['roomsSection','hostMessage','guestInfoPublic','bookingSection','location','cancellationPolicy','bookingStatusSection','fhReviewsBand'];
  await mockPublic(page,[{copy_key:'fhHomepageOrder',text_en:JSON.stringify(order),text_de:JSON.stringify(order)},{copy_key:'fhHostName',text_en:'Fixture Host',text_de:'Test Gastgeber'},{copy_key:'fhContactPhone',text_en:'invalid',text_de:'invalid'}]);
  await page.goto('/?lang=en');await expect(page.locator('#hostMessage')).toContainText('Fixture Host');
  expect(await page.locator('[data-section-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-section-id')))).toEqual(order);
  await expect(page.locator('#contact a[href^="https://wa.me"]')).toHaveCount(0);
});

for(const path of ['/','/admin','/booking-status','/payment','/payment-success','/impressum','/datenschutz'])test(`no serious or critical accessibility violations: ${path}`,async({page})=>{
  await mockPublic(page);await page.goto(path+'?lang=en');
  if(path==='/')await expect(page.getByRole('heading',{name:'The Garden Room'})).toBeVisible();
  if(path==='/admin')await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
  await stableRender(page);
  const result=await new AxeBuilder({page}).analyze();
  expect(result.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
});

test('legacy links preserve the booking reference and language',async({page,request})=>{
  await mockPublic(page);
  for(const [oldPath,newPath] of [['payment.html','payment'],['booking-status.html','booking-status'],['payment-success.html','payment-success'],['admin.html','admin'],['imprint.html','impressum'],['privacy.html','datenschutz']]){
    const response=await request.get('/'+oldPath+'?reference=FH-FIXTURE&lang=de',{maxRedirects:0});
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe('/'+newPath+'?reference=FH-FIXTURE&lang=de');
  }
});
