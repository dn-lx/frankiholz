(()=>{
  const cfg=window.FRANKIHOLZ_CONFIG;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const byId=id=>document.getElementById(id);
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||min));

  const desktopRange=byId('heroTitleSizeDesktop');
  const desktopNumber=byId('heroTitleSizeDesktopNumber');
  const mobileRange=byId('heroTitleSizeMobile');
  const mobileNumber=byId('heroTitleSizeMobileNumber');
  const previewDesktop=byId('heroTitleSizePreviewDesktop');
  const previewMobile=byId('heroTitleSizePreviewMobile');
  const status=byId('heroTitleSizeStatus');
  const saveButton=byId('saveHeroText');
  if(!desktopRange||!desktopNumber||!mobileRange||!mobileNumber||!saveButton)return;

  const currentTitle=()=>byId('heroTitleDe')?.value.trim()||byId('heroTitle')?.value.trim()||'Private Zimmer & Unterkunft in Frankfurt am Main';
  const updatePreview=()=>{
    const desktop=clamp(desktopRange.value,40,72);
    const mobile=clamp(mobileRange.value,30,54);
    desktopRange.value=desktop;desktopNumber.value=desktop;
    mobileRange.value=mobile;mobileNumber.value=mobile;
    if(previewDesktop){previewDesktop.textContent=currentTitle();previewDesktop.style.fontSize=`${desktop}px`;}
    if(previewMobile){previewMobile.textContent=currentTitle();previewMobile.style.fontSize=`${mobile}px`;}
    if(status)status.textContent='Not saved';
  };
  const pair=(range,number,min,max)=>{
    range.addEventListener('input',()=>{number.value=range.value;updatePreview();});
    number.addEventListener('input',()=>{range.value=clamp(number.value,min,max);updatePreview();});
  };
  pair(desktopRange,desktopNumber,40,72);
  pair(mobileRange,mobileNumber,30,54);
  byId('heroTitleDe')?.addEventListener('input',updatePreview);
  byId('heroTitle')?.addEventListener('input',updatePreview);

  client.from('frankiholz_site_settings')
    .select('hero_title_size_desktop_px,hero_title_size_mobile_px')
    .eq('id',1)
    .maybeSingle()
    .then(({data,error})=>{
      if(error){if(status)status.textContent='Could not load size settings';return;}
      desktopRange.value=clamp(data?.hero_title_size_desktop_px??56,40,72);
      mobileRange.value=clamp(data?.hero_title_size_mobile_px??38,30,54);
      updatePreview();
      if(status)status.textContent='Saved';
    });

  saveButton.addEventListener('click',async()=>{
    const payload={
      hero_title_size_desktop_px:clamp(desktopRange.value,40,72),
      hero_title_size_mobile_px:clamp(mobileRange.value,30,54),
      updated_at:new Date().toISOString()
    };
    if(status)status.textContent='Saving…';
    const {error}=await client.from('frankiholz_site_settings').update(payload).eq('id',1);
    if(status)status.textContent=error?`Error: ${error.message}`:`Saved · ${payload.hero_title_size_desktop_px}px desktop / ${payload.hero_title_size_mobile_px}px mobile`;
  });
})();
