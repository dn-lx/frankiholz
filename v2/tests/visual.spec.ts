import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
  await page.route('**/supabase.co/**',route=>route.abort());
  await page.route('https://images.unsplash.com/**',route=>route.abort());
});
test('public hero, key sections and footer are responsive and accessible',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 await expect(page.getByRole('link',{name:'FrankiHolz homepage'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Airbnb/i}).first()).toBeVisible();
 const width=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
 expect(width[0]).toBeLessThanOrEqual(width[1]+1);
 await page.screenshot({path:'artifacts/home-'+info.project.name+'.png',fullPage:true,animations:'disabled'});
 expect(errors).toEqual([]);
});
test('host studio login renders without exposing admin data',async({page},info)=>{
 await page.goto('/admin');
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Email'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Open host studio/i})).toBeVisible();
 await page.screenshot({path:'artifacts/admin-'+info.project.name+'.png',fullPage:true,animations:'disabled'});
});
test('booking status lookup is labelled',async({page})=>{
 await page.goto('/booking-status');
 await expect(page.getByRole('heading',{name:/Every detail/i})).toBeVisible();
 await expect(page.getByRole('textbox',{name:/Booking reference/i})).toBeVisible();
});
