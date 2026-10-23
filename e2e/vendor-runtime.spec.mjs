import {test,expect} from '@playwright/test';

test('pinned browser SDK reads a mocked public resource with the expected API',async({page})=>{
  const calls=[];
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='127.0.0.1')return route.continue();
    if(url.hostname==='runtime.fixture.invalid'&&url.pathname==='/rest/v1/rooms'){
      calls.push({method:request.method(),key:request.headers().apikey});
      return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify([{id:'sdk-fixture'}])});
    }
    return route.abort();
  });
  await page.goto('/imprint.html');
  await page.addScriptTag({url:'/assets/vendor/supabase-js-2.118.0.js'});
  const result=await page.evaluate(async()=>{
    const client=window.supabase.createClient('https://runtime.fixture.invalid','sb_publishable_fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await client.from('rooms').select('id');
    return {data,error};
  });
  expect(result).toEqual({data:[{id:'sdk-fixture'}],error:null});
  expect(calls.some(call=>call.method==='GET'&&call.key==='sb_publishable_fixture')).toBe(true);
});
