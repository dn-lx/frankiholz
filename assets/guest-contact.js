// Match the homepage's Admin-managed contact number on guest support screens.
window.loadFrankiHolzContactNumbers=async client=>{
 let row;
 try{
  const {data,error}=await client.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key',['fhContactPhone']);
  row=!error&&data?.find(item=>item.copy_key==='fhContactPhone');
 }catch(error){/* Keep the homepage defaults if the content read fails. */}
 return Object.fromEntries(['en','de'].map(lang=>{
  const saved=row?.['text_'+lang],phone=typeof saved==='string'&&saved.trim()?saved.trim():'+49 176 62493 041';
  const international=phone.replace(/[^+0-9]/g,'');
  return [lang,/^\+[1-9][0-9]{6,14}$/.test(international)?international.slice(1):null];
 }));
};
