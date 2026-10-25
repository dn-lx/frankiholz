let frankiholzCopyRows=[];
const homeCopyDefaults=[
 ['heroMinor','Hero: tagline','Thoughtful stays in Frankfurt-Sachsenhausen','Angenehm übernachten in Frankfurt-Sachsenhausen'],
 ['eyebrow','Hero: location badge','Accommodation in Frankfurt am Main','Unterkunft in Frankfurt am Main'],
 ['viewRooms','Hero: rooms button','View rooms','Zimmer ansehen'],
 ['bookNow','Navigation: booking button','Book now','Jetzt buchen'],
 ['liveAvailability','Highlight: availability title','Live availability','Live-Verfügbarkeit'],
 ['approvedBlock','Highlight: availability description','Only confirmed bookings block dates','Nur bestätigte Buchungen blockieren Termine'],
 ['clearPricing','Highlight: pricing title','Clear pricing','Transparente Preise'],
 ['estimatedInstant','Highlight: pricing description','See your estimated stay total instantly','Gesamtpreis für den Aufenthalt sofort sehen'],
 ['directBooking','Highlight: direct booking title','Direct booking','Direktbuchung'],
 ['directHost','Highlight: direct booking description','Save your card securely with Stripe, then wait for host confirmation','Karte sicher bei Stripe hinterlegen und auf die Bestätigung warten']
].map(([copy_key,label,text_en,text_de],i)=>({copy_key,label,text_en,text_de,sort_order:1200+i}));
const homeCopyKeys=new Set(homeCopyDefaults.map(row=>row.copy_key));
const copyEditorRow=r=>`<div class="copy-editor-row"><div class="copy-label"><strong>${esc(r.label)}</strong></div><div class="bilingual-editor compact"><div><label class="language-heading" for="copy-en-${esc(r.copy_key)}">English</label><textarea id="copy-en-${esc(r.copy_key)}" rows="2">${esc(r.text_en||'')}</textarea></div><div><label class="language-heading" for="copy-de-${esc(r.copy_key)}">Deutsch</label><textarea id="copy-de-${esc(r.copy_key)}" rows="2">${esc(r.text_de||'')}</textarea></div></div></div>`;

async function loadPublicCopyEditor(){
  if(!$('copyEditors'))return;
  const {data,error}=await sb.from('frankiholz_copy').select('copy_key,label,text_en,text_de,sort_order').order('sort_order');
  if(error){$('copyEditors').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return;}
  const saved=new Map((data||[]).map(row=>[row.copy_key,row]));
  frankiholzCopyRows=[...homeCopyDefaults.filter(row=>!saved.has(row.copy_key)),...(data||[])].filter(row=>!row.copy_key.startsWith('fh')&&row.copy_key!=='roomsLead');
  $('homeCopyEditors').innerHTML=homeCopyDefaults.map(row=>copyEditorRow(saved.get(row.copy_key)||row)).join('');
  $('copyEditors').innerHTML=frankiholzCopyRows.filter(row=>!homeCopyKeys.has(row.copy_key)).map(copyEditorRow).join('');
}
async function saveCopyGroup(home){
  const status=$(home?'homeCopyStatus':'copyStatus');
  const {data:{session}}=await sb.auth.getSession();
  if(!session){status.textContent='Admin session expired.';return;}
  const {data:allowed,error:authError}=await sb.rpc('frankiholz_admin_access_check');
  if(authError||!allowed){status.textContent='Not authorized to edit website wording.';return;}
  const rows=frankiholzCopyRows.filter(row=>homeCopyKeys.has(row.copy_key)===home).map(r=>({copy_key:r.copy_key,label:r.label,sort_order:r.sort_order,text_en:$(`copy-en-${r.copy_key}`).value.trim(),text_de:$(`copy-de-${r.copy_key}`).value.trim(),updated_at:new Date().toISOString(),...(session.user?.id?{updated_by:session.user.id}:{})}));
  if(!rows.length){status.textContent='No wording is loaded for this section. Please reload and try again.';return;}
  if(rows.some(row=>!row.text_en||!row.text_de)){status.textContent='Please keep both English and German text filled in for every wording item.';return;}
  status.textContent='Saving…';
  const {error}=await sb.from('frankiholz_copy').upsert(rows,{onConflict:'copy_key'});
  if(error){status.textContent='Could not save: '+error.message;return;}
  const {data:stored,error:readError}=await sb.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key',rows.map(row=>row.copy_key));
  const saved=new Map((stored||[]).map(row=>[row.copy_key,row]));
  if(readError||!rows.every(row=>saved.get(row.copy_key)?.text_en===row.text_en&&saved.get(row.copy_key)?.text_de===row.text_de)){status.textContent='Save could not be verified. Please reload and check the fields.';return;}
  status.textContent='English & German wording saved and verified.';
}
$('saveHomeCopy').onclick=()=>saveCopyGroup(true);
$('savePublicCopy').onclick=()=>saveCopyGroup(false);

async function tryLoadCopyEditor(){const {data:{session}}=await sb.auth.getSession();if(!session)return;const {data,error}=await sb.rpc('frankiholz_admin_access_check');if(!error&&data)await loadPublicCopyEditor();}
sb.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(tryLoadCopyEditor,0)});
setTimeout(tryLoadCopyEditor,0);
