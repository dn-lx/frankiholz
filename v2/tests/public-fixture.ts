import type { Page } from '@playwright/test';
export const sampleRooms=[{id:'room-one',slug:'garden-room',name:'The Garden Room',name_de:'Das Gartenzimmer',description:'A calm, private room with space to unwind. Shared kitchen and garden access.',description_de:'Ein ruhiges Privatzimmer zum Ankommen. Gemeinschaftsküche und Gartenzugang.',base_price:65,max_guests:2,active:true,sort_order:1},{id:'room-two',slug:'city-room',name:'The City Room',name_de:'Das Stadtzimmer',description:'Your own peaceful corner in the heart of Sachsenhausen.',description_de:'Ihr eigener ruhiger Rückzugsort im Herzen Sachsenhausens.',base_price:55,max_guests:1,active:true,sort_order:2},{id:'room-three',slug:'cosy-room',name:'The Cosy Room',name_de:'Das gemütliche Zimmer',description:'Simple comforts, warm lighting, a personal welcome.',description_de:'Praktischer Komfort, warmes Licht und ein persönlicher Empfang.',base_price:50,max_guests:2,active:true,sort_order:3}];
export async function mockPublic(page:Page,copy:unknown[]=[]){
  const requests:string[]=[];
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
    requests.push(url.href);
    if(url.hostname.endsWith('.supabase.co')){
      const table=url.pathname.split('/').pop();
      let data:unknown=[];
      if(table==='frankiholz_rooms')data=sampleRooms;
      if(table==='frankiholz_room_images')data=[];
      if(table==='frankiholz_site_settings')data={hero_title:'A little more room to feel at home.',hero_title_de:'Ein Ort zum Ankommen.',hero_subtitle:'Personally hosted private rooms in Frankfurt-Sachsenhausen.',hero_subtitle_de:'Persönlich betreute Privatzimmer in Frankfurt-Sachsenhausen.'};
      if(table==='frankiholz_copy')data=copy;
      if(table==='frankiholz_get_payment_environment')data='test';
      if(table==='frankiholz_get_calendar_rates'){
        const body=route.request().postDataJSON(),days=[];
        for(let date=new Date(body.p_from+'T12:00:00');date<=new Date(body.p_to+'T12:00:00');date.setDate(date.getDate()+1))days.push({date:date.toISOString().slice(0,10),is_available:true,availability_status:'available',nightly_price:65});
        data=days;
      }
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    }
    if(route.request().resourceType()==='image')return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#617268"/><path d="M0 900L1600 300V1000H0" fill="#b4b7a2"/><path d="M850 230L1250 230V810H850" fill="#d5c6b1"/></svg>'});
    return route.abort();
  });
  return requests;
}
export async function stableRender(page:Page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});}
