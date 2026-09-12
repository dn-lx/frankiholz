(()=>{
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||min));
  const apply=(desktop,mobile)=>{
    document.documentElement.style.setProperty('--frankiholz-hero-title-desktop',`${clamp(desktop,40,72)}px`);
    document.documentElement.style.setProperty('--frankiholz-hero-title-mobile',`${clamp(mobile,30,54)}px`);
  };
  apply(56,38);
  const cfg=window.FRANKIHOLZ_CONFIG;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  client.from('frankiholz_site_settings')
    .select('hero_title_size_desktop_px,hero_title_size_mobile_px')
    .eq('id',1)
    .maybeSingle()
    .then(({data,error})=>{
      if(error){console.warn('Hero title size could not be loaded',error);return;}
      if(data)apply(data.hero_title_size_desktop_px??56,data.hero_title_size_mobile_px??38);
    });
})();
