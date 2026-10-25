// Protected admin UI: the RLS policy checks FrankiHolz administrator authorization.
// Never place real bank details in website source or Netlify environment variables.
(()=>{
 const ids={account_holder:'manualBankHolder',bank_name:'manualBankName',iban:'manualBankIban',bic:'manualBankBic',
  enabled:'manualBankEnabled',legal_discount_approved:'manualBankLegal'};
 const status=document.getElementById('manualBankAdminStatus'),save=document.getElementById('manualBankSave');
 if(!status||!save||typeof sb==='undefined')return;
 let loading=false;
 async function load(){
  if(loading)return;loading=true;
  try{
   const {data:{session}}=await sb.auth.getSession();
   if(!session)return;
   const {data,error}=await sb.from('frankiholz_manual_bank_settings').select('account_holder,bank_name,iban,bic,enabled,legal_discount_approved').eq('id',1).maybeSingle();
   if(error)throw error;
   if(!data){status.textContent='Manual bank settings migration has not yet been applied.';return;}
   for(const [name,id] of Object.entries(ids)){
    const el=document.getElementById(id);if(!el)continue;
    if(el.type==='checkbox')el.checked=Boolean(data[name]);else el.value=String(data[name]||'');
   }
   status.textContent='Settings loaded. Discount applies only after explicit legal sign-off.';
  }catch(error){status.textContent=error.message||String(error);}
  finally{loading=false;}
 }
 save.addEventListener('click',async()=>{
  const data={};
  for(const [key,id] of Object.entries(ids)){
   const el=document.getElementById(id);data[key]=el.type==='checkbox'?el.checked:el.value.trim();
  }
  if(data.enabled&&(!data.account_holder||data.iban.replace(/\s/g,'').length<15)){
   status.textContent='Enter the correct account holder and IBAN before enabling.';return;
  }
  if(!confirm('Save the separate bank account settings? These details will be provided to guests who select bank transfer.'))return;
  save.disabled=true;status.textContent='Saving…';
  try{
   const {data:updated,error}=await sb.from('frankiholz_manual_bank_settings').update({...data,updated_at:new Date().toISOString()}).eq('id',1).select('id');
   if(error||!updated?.length)throw error||Error('Not authorized or no settings row updated');
   status.textContent='Saved. Bank transfer '+(data.enabled?'enabled':'disabled')+
     (data.legal_discount_approved?' with 2% discount.':' without a payment-method discount.');
  }catch(error){status.textContent=error.message||String(error)}
  finally{save.disabled=false}
 });
 sb.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(load,0)});
 load();
})();