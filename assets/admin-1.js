
const CFG=window.FRANKIHOLZ_CONFIG;const sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey);const $=id=>document.getElementById(id);const fallbackHero="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80";const money=n=>`€${Number(n||0).toFixed(2)}`;const publicUrl=p=>p?`${CFG.supabaseUrl}/storage/v1/object/public/${CFG.mediaBucket}/${encodeURI(p)}`:null;let rooms=[],images=[],settings=null,icalFeeds=[];
async function verifyAdmin(){const {data:{session}}=await sb.auth.getSession();if(!session){showLogin();return false}const {data,error}=await sb.rpc('frankiholz_admin_access_check');if(error||!data){await sb.auth.signOut();$('loginStatus').innerHTML='<div class="notice">This account is not authorized as a FrankiHolz administrator.</div>';showLogin();return false}$('loginView').hidden=true;$('dashboard').hidden=false;await loadAll();return true}
function showLogin(){$('loginView').hidden=false;$('dashboard').hidden=true}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginStatus').innerHTML='';const {error}=await sb.auth.signInWithPassword({email:$('adminEmail').value.trim(),password:$('adminPassword').value});if(error){$('loginStatus').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}await verifyAdmin()});$('logoutBtn').onclick=async()=>{await sb.auth.signOut();showLogin()};
async function loadAll(){const [{data:r},{data:i},{data:s},{data:p}]=await Promise.all([sb.from('frankiholz_rooms').select('*').order('sort_order'),sb.from('frankiholz_room_images').select('*').order('sort_order').order('created_at'),sb.from('frankiholz_site_settings').select('*').eq('id',1).single(),sb.from('frankiholz_pricing_settings').select('*').eq('id',1).single()]);rooms=r||[];images=i||[];settings=s;renderHero();renderPricing(p);await loadIcalFeeds();renderRooms();await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));await loadBookings();}
function renderHero(){$('heroPreview').src=settings?.hero_storage_path?publicUrl(settings.hero_storage_path):fallbackHero;$('heroTitle').value=settings?.hero_title||'';$('heroSubtitle').value=settings?.hero_subtitle||'';$('heroTitleDe').value=settings?.hero_title_de||'';$('heroSubtitleDe').value=settings?.hero_subtitle_de||'';$('seoTitleEn').value=settings?.seo_title_en||'';$('seoDescriptionEn').value=settings?.seo_description_en||'';$('seoTitleDe').value=settings?.seo_title_de||'';$('seoDescriptionDe').value=settings?.seo_description_de||'';}
$('uploadHero').onclick=async()=>{const f=$('heroFile').files[0];if(!f)return heroMsg('Choose an image first.');const path=`hero/${crypto.randomUUID()}-${safeName(f.name)}`;const old=settings?.hero_storage_path;const {error:ue}=await sb.storage.from(CFG.mediaBucket).upload(path,f,{upsert:false,contentType:f.type,cacheControl:'3600'});if(ue)return heroMsg(ue.message);const {error:de}=await sb.from('frankiholz_site_settings').update({hero_storage_path:path,updated_at:new Date().toISOString()}).eq('id',1);if(de){await sb.storage.from(CFG.mediaBucket).remove([path]);return heroMsg(de.message)}if(old)await sb.storage.from(CFG.mediaBucket).remove([old]);settings.hero_storage_path=path;renderHero();heroMsg('Hero photo updated.',true)};
$('deleteHero').onclick=async()=>{const old=settings?.hero_storage_path;if(!old)return heroMsg('No uploaded hero photo to delete.');const {error}=await sb.from('frankiholz_site_settings').update({hero_storage_path:null,updated_at:new Date().toISOString()}).eq('id',1);if(error)return heroMsg(error.message);await sb.storage.from(CFG.mediaBucket).remove([old]);settings.hero_storage_path=null;renderHero();heroMsg('Hero photo deleted.',true)};
$('saveHeroText').onclick=async()=>{const payload={hero_title:$('heroTitle').value.trim(),hero_subtitle:$('heroSubtitle').value.trim(),hero_title_de:$('heroTitleDe').value.trim(),hero_subtitle_de:$('heroSubtitleDe').value.trim(),seo_title_en:$('seoTitleEn').value.trim(),seo_description_en:$('seoDescriptionEn').value.trim(),seo_title_de:$('seoTitleDe').value.trim(),seo_description_de:$('seoDescriptionDe').value.trim(),updated_at:new Date().toISOString()};const {error}=await sb.from('frankiholz_site_settings').update(payload).eq('id',1);if(!error)Object.assign(settings,payload);heroMsg(error?error.message:'English & German website text saved.',!error)};function heroMsg(t,ok=false){$('heroStatus').innerHTML=`<div class="notice ${ok?'success':''}">${esc(t)}</div>`}


function renderPricing(p){
  if(!p)return;
  $('p-weekend').value=p.weekend_markup_pct;
  $('p-hold').value=p.payment_hold_minutes;
  $('p-occ1-level').value=p.occupancy_level_1_pct;
  $('p-occ1-markup').value=p.occupancy_markup_1_pct;
  $('p-occ2-level').value=p.occupancy_level_2_pct;
  $('p-occ2-markup').value=p.occupancy_markup_2_pct;
  $('p-last-days').value=p.last_minute_days;
  $('p-last-discount').value=p.last_minute_discount_pct;
  $('p-long1-nights').value=p.long_stay_nights_1;
  $('p-long1-discount').value=p.long_stay_discount_1_pct;
  $('p-long2-nights').value=p.long_stay_nights_2;
  $('p-long2-discount').value=p.long_stay_discount_2_pct;
}
$('savePricing').onclick=async()=>{
  const payload={
    weekend_markup_pct:Number($('p-weekend').value),
    payment_hold_minutes:Number($('p-hold').value),
    occupancy_level_1_pct:Number($('p-occ1-level').value),
    occupancy_markup_1_pct:Number($('p-occ1-markup').value),
    occupancy_level_2_pct:Number($('p-occ2-level').value),
    occupancy_markup_2_pct:Number($('p-occ2-markup').value),
    last_minute_days:Number($('p-last-days').value),
    last_minute_discount_pct:Number($('p-last-discount').value),
    long_stay_nights_1:Number($('p-long1-nights').value),
    long_stay_discount_1_pct:Number($('p-long1-discount').value),
    long_stay_nights_2:Number($('p-long2-nights').value),
    long_stay_discount_2_pct:Number($('p-long2-discount').value),
    updated_at:new Date().toISOString()
  };
  if(payload.occupancy_level_1_pct>=payload.occupancy_level_2_pct){
    $('pricingStatus').innerHTML='<div class="notice">Occupancy level 1 must be lower than level 2.</div>';return;
  }
  if(payload.long_stay_nights_1>=payload.long_stay_nights_2){
    $('pricingStatus').innerHTML='<div class="notice">Long-stay threshold 1 must be lower than threshold 2.</div>';return;
  }
  const {error}=await sb.from('frankiholz_pricing_settings').update(payload).eq('id',1);
  $('pricingStatus').innerHTML=`<div class="notice ${error?'':'success'}">${esc(error?error.message:'Pricing strategy saved.')}</div>`;
};
