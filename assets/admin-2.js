async function loadIcalFeeds(){
  const {data,error}=await sb.from('frankiholz_ical_feeds').select('id,room_id,provider,enabled,last_synced_at,last_status,last_error').eq('provider','airbnb');
  icalFeeds=error?[]:(data||[]);
  renderIcalFeeds(error?.message||'');
}
function renderIcalFeeds(loadError=''){
  if(loadError){$('icalFeeds').innerHTML=`<div class="notice">${esc(loadError)}</div>`;return;}
  $('icalFeeds').innerHTML=rooms.map(r=>{
    const f=icalFeeds.find(x=>x.room_id===r.id);
    const state=f?.last_status==='ok'?'Synced':f?.last_status==='error'?'Sync error':f?'Connected':'Not connected';
    const when=f?.last_synced_at?new Date(f.last_synced_at).toLocaleString():'Not synced yet';
    return `<div class="sync-row">
      <div><strong>${esc(r.name)}</strong><div class="muted">${esc(state)} · ${esc(when)}</div>${f?.last_error?`<div class="sync-error">${esc(f.last_error)}</div>`:''}</div>
      <div class="sync-feed-actions">
        <input id="ical-url-${r.id}" type="password" autocomplete="off" placeholder="${f?'Connected — paste only to replace':'Paste Airbnb .ics URL'}">
        <button class="btn ghost small" onclick="saveIcalFeed('${r.id}')">${f?'Replace link':'Connect'}</button>
      </div>
    </div>`;
  }).join('');
}
window.saveIcalFeed=async roomId=>{
  const input=$(`ical-url-${roomId}`);
  const url=(input?.value||'').trim();
  if(!url)return alert('Paste the Airbnb .ics calendar URL first.');
  if(!/^https:\/\/www\.airbnb\.[^/]+\/calendar\/ical\/.+\.ics/i.test(url))return alert('This does not look like an Airbnb .ics calendar URL.');
  const {error}=await sb.from('frankiholz_ical_feeds').upsert({room_id:roomId,provider:'airbnb',feed_url:url,enabled:true,updated_at:new Date().toISOString()},{onConflict:'room_id,provider'});
  if(error)return alert(error.message);
  input.value='';
  await loadIcalFeeds();
  await syncAirbnb(roomId);
};
async function syncAirbnb(roomId=null){
  const btn=$('syncAirbnbBtn');if(btn){btn.disabled=true;btn.textContent='Syncing…'}
  $('icalStatus').innerHTML='<div class="notice">Refreshing Airbnb availability…</div>';
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error('Admin session expired. Please sign in again.');
    const res=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-sync-airbnb`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':CFG.supabaseKey},body:JSON.stringify(roomId?{room_id:roomId}:{})});
    const out=await res.json();
    if(!res.ok)throw new Error(out.error||'Calendar sync failed');
    const ok=(out.feeds||[]).filter(x=>x.ok).length, bad=(out.feeds||[]).filter(x=>!x.ok).length;
    $('icalStatus').innerHTML=`<div class="notice ${bad?'':'success'}">Airbnb sync finished: ${ok} feed${ok===1?'':'s'} updated${bad?`, ${bad} failed`:''}.</div>`;
    await loadIcalFeeds();
    await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));
  }catch(e){$('icalStatus').innerHTML=`<div class="notice">${esc(e.message||String(e))}</div>`;}
  finally{if(btn){btn.disabled=false;btn.textContent='Sync Airbnb calendars now'}}
}
$('syncAirbnbBtn').onclick=()=>syncAirbnb();

function roomImages(id){return images.filter(x=>x.room_id===id)}
const roomCalState={};
function calState(id){
  if(!roomCalState[id]){
    const now=new Date();
    roomCalState[id]={cursor:new Date(now.getFullYear(),now.getMonth(),1),rows:[],icalBlocks:[],start:null,end:null};
  }
  return roomCalState[id];
}
function dateKey(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12).toISOString().slice(0,10)}

