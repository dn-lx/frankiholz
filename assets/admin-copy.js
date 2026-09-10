let frankiholzCopyRows=[];
async function loadPublicCopyEditor(){
  if(!$('copyEditors'))return;
  const {data,error}=await sb.from('frankiholz_copy').select('copy_key,label,text_en,text_de,sort_order').order('sort_order');
  if(error){$('copyEditors').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return;}
  frankiholzCopyRows=data||[];
  $('copyEditors').innerHTML=frankiholzCopyRows.map(r=>`<div class="copy-editor-row"><div class="copy-label"><strong>${esc(r.label)}</strong><span>${esc(r.copy_key)}</span></div><div class="bilingual-editor compact"><div><span class="language-heading">English</span><textarea id="copy-en-${r.copy_key}" rows="2">${esc(r.text_en||'')}</textarea></div><div><span class="language-heading">Deutsch</span><textarea id="copy-de-${r.copy_key}" rows="2">${esc(r.text_de||'')}</textarea></div></div></div>`).join('');
}
$('savePublicCopy').onclick=async()=>{
  const {data:{session}}=await sb.auth.getSession();
  if(!session){$('copyStatus').innerHTML='<div class="notice">Admin session expired.</div>';return;}
  const rows=frankiholzCopyRows.map(r=>({copy_key:r.copy_key,label:r.label,sort_order:r.sort_order,text_en:$(`copy-en-${r.copy_key}`).value.trim(),text_de:$(`copy-de-${r.copy_key}`).value.trim(),updated_at:new Date().toISOString(),updated_by:session.user.id}));
  if(rows.some(r=>!r.text_en||!r.text_de)){$('copyStatus').innerHTML='<div class="notice">Please keep both English and German text filled in for every wording item.</div>';return;}
  const {error}=await sb.from('frankiholz_copy').upsert(rows,{onConflict:'copy_key'});
  $('copyStatus').innerHTML=`<div class="notice ${error?'':'success'}">${esc(error?error.message:'English & German public wording saved.')}</div>`;
  if(!error)await loadPublicCopyEditor();
};
async function tryLoadCopyEditor(){const {data:{session}}=await sb.auth.getSession();if(!session)return;const {data,error}=await sb.rpc('frankiholz_admin_access_check');if(!error&&data)await loadPublicCopyEditor();}
sb.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(tryLoadCopyEditor,0)});
setTimeout(tryLoadCopyEditor,0);
