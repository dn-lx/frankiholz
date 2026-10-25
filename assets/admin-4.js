function roomCalendarReady(id){const st=calState(id);return st.loadState==='ready'&&st.loadedView===dateKey(new Date(st.cursor.getFullYear(),st.cursor.getMonth(),1));}
function paintRoomCalendarState(id){
 const st=calState(id),anchor=$(`rc-status-${id}`);if(!anchor)return;
 let out=$(`rc-read-status-${id}`);
 if(!out){out=document.createElement('div');out.id=`rc-read-status-${id}`;out.className='notice';out.setAttribute('role','status');out.setAttribute('aria-live','polite');anchor.before(out);}
 out.hidden=roomCalendarReady(id);if(out.hidden){out.textContent='';return;}
 out.textContent=st.loadState==='error'?'Availability could not be loaded. Retry before editing dates.':'Loading availability…';
 if(st.loadState==='error'){const retry=document.createElement('button');retry.type='button';retry.className='btn secondary small';retry.textContent='Retry availability';retry.onclick=()=>loadRoomCalendar(id);out.append(' ',retry);}
}
async function loadRoomCalendar(id){
 const st=calState(id),view=dateKey(new Date(st.cursor.getFullYear(),st.cursor.getMonth(),1)),viewEnd=dateKey(new Date(st.cursor.getFullYear(),st.cursor.getMonth()+1,0));
 const from=st.start&&st.start<view?st.start:view,to=st.end&&st.end>viewEnd?st.end:viewEnd,version=(st.requestVersion||0)+1;
 st.requestVersion=version;st.loadState='loading';renderRoomCalendar(id);paintRoomCalendarState(id);
 try{
  const results=await Promise.all([
   sb.from('frankiholz_calendar').select('id,date,is_available,availability_status,price_override,note,booking_id,admin_available_override').eq('room_id',id).gte('date',from).lte('date',to),
   sb.from('frankiholz_ical_blocks').select('date,provider').eq('room_id',id).gte('date',from).lte('date',to),
   sb.from('frankiholz_bookings').select('check_in,check_out').eq('room_id',id).eq('status','confirmed').gte('check_out',from).lte('check_in',to)
  ]);
  if(version!==st.requestVersion||view!==dateKey(new Date(st.cursor.getFullYear(),st.cursor.getMonth(),1)))return;
  const error=results.find(result=>result.error)?.error;if(error)throw error;
  st.rows=results[0].data||[];st.icalBlocks=results[1].data||[];st.reservations=results[2].data||[];
  st.loadState='ready';st.loadedView=view;st.loadedFrom=from;st.loadedTo=to;
 }catch(error){if(version===st.requestVersion){st.loadState='error';}}
 finally{if(version===st.requestVersion){renderRoomCalendar(id);paintRoomCalendarState(id);}}
}

function rowFor(id,key){
  return calState(id).rows.find(x=>x.date===key);
}
function isAirbnbBlocked(id,key){return calState(id).icalBlocks.some(x=>x.date===key)}
function statusFor(id,key){
  const state=calState(id);if(!roomCalendarReady(id)||key<state.loadedFrom||key>state.loadedTo)return 'unknown';
  const row=rowFor(id,key);
  if(row?.admin_available_override&&row.is_available)return 'available';
  if(calState(id).reservations?.some(b=>key>=b.check_in&&key<b.check_out))return 'booked';
  if(row?.booking_id)return 'booked';
  if(row && (row.availability_status==='blocked'||row.availability_status==='booked'||row.is_available===false))return row.availability_status||'blocked';
  if(isAirbnbBlocked(id,key))return 'blocked';
  return 'available';
}
function renderRoomCalendar(id){
  const st=calState(id),y=st.cursor.getFullYear(),m=st.cursor.getMonth(),calendar=$(`rc-${id}`);
  const focused=calendar?.contains(document.activeElement)?document.activeElement.dataset.date:null;
  const title=$(`rc-title-${id}`);
  if(!title)return;
  title.textContent=st.cursor.toLocaleString('en',{month:'long',year:'numeric'});
  let html=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="dow">${x}</div>`).join('');
  const first=new Date(y,m,1,12),days=new Date(y,m+1,0).getDate(),pad=(first.getDay()+6)%7;
  for(let i=0;i<pad;i++)html+='<div></div>';
  for(let n=1;n<=days;n++){
    const d=new Date(y,m,n,12),key=dateKey(d),row=rowFor(id,key),status=statusFor(id,key);
    const s=st.start,e=st.end;
    const rangeStart=s===key,rangeEnd=e===key,rangeMid=s&&e&&key>s&&key<e;
    const price=row?.price_override?money(row.price_override):'';
    const airbnbOverride=status==='available'&&row?.admin_available_override&&isAirbnbBlocked(id,key);
    const label=status==='unknown'?'Availability not loaded':airbnbOverride?'Available here':status==='booked'?'Booked':status==='blocked'&&isAirbnbBlocked(id,key)?'Airbnb':status==='blocked'?'Blocked':price;
    html+=`<button type="button" data-date="${key}" ${status==='unknown'?'disabled':''} aria-label="${key}: ${airbnbOverride?'Airbnb blocked, available here':label||'Available'}" class="day admin-day ${status} ${airbnbOverride?'airbnb-override':''} ${rangeStart?'range-start':''} ${rangeEnd?'range-end':''} ${rangeMid?'range-mid':''}" onclick="pickRoomDate('${id}','${key}')"><strong>${n}</strong><small>${label}</small></button>`;
  }
  calendar.innerHTML=html;calendar.setAttribute('aria-busy',String(st.loadState==='loading'));
  if(focused){const replacement=calendar.querySelector(`[data-date="${focused}"]`);if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});}
  $(`rc-range-${id}`).textContent=st.start ? `${st.start}${st.end?' → '+st.end:''}` : 'Select a start date and an end date';
  const visibleFrom=dateKey(new Date(y,m,1)),visibleTo=dateKey(new Date(y,m+1,0)),visibleBlocks=st.icalBlocks.filter(b=>b.date>=visibleFrom&&b.date<=visibleTo);
  const overrides=visibleBlocks.filter(b=>rowFor(id,b.date)?.admin_available_override&&rowFor(id,b.date)?.is_available).length;
  $(`rc-sync-${id}`).textContent=`This month: ${visibleBlocks.length} Airbnb-blocked night${visibleBlocks.length===1?'':'s'} · ${overrides} available here by admin override. Sync preserves these overrides.`;
}

window.applyAirbnbRange=async(id,availableHere)=>{
  const st=calState(id),out=$(`rc-status-${id}`);
  if(!roomCalendarReady(id)){paintRoomCalendarState(id);return;}
  if(!st.start){out.innerHTML='<div class="notice">Select at least one date first.</div>';return;}
  if(st.saving)return;
  st.saving=true;
  out.innerHTML='<div class="notice">Updating Airbnb availability…</div>';
  try{
    const {data,error}=await sb.rpc('frankiholz_set_airbnb_availability',{
      p_room_id:id,p_start_date:st.start,p_end_date:st.end||st.start,p_available_here:availableHere
    });
    if(error)throw error;
    out.innerHTML=`<div class="notice success">${Number(data)} date${Number(data)===1?'':'s'} ${availableHere?'made available here (Airbnb-blocked dates only; confirmed reservations skipped)':'returned to normal availability rules'}. Reservations, payments and Airbnb are unchanged.</div>`;
    st.start=null;st.end=null;
    await loadRoomCalendar(id);
  }catch(error){out.innerHTML=`<div class="notice">${esc(error.message||String(error))}</div>`;}
  finally{st.saving=false;}
};

window.pickRoomDate=(id,key)=>{
  const st=calState(id);if(!roomCalendarReady(id)||key<st.loadedFrom||key>st.loadedTo)return;
  if(!st.start || st.end){
    st.start=key;st.end=null;
  }else if(key<st.start){
    st.start=key;st.end=null;
  }else{
    st.end=key;
  }
  renderRoomCalendar(id);
};

window.moveRoomMonth=async(id,delta)=>{
  const st=calState(id);
  st.cursor=new Date(st.cursor.getFullYear(),st.cursor.getMonth()+delta,1);
  await loadRoomCalendar(id);
};

window.applyRoomRange=async(id,status)=>{
  const st=calState(id);if(!roomCalendarReady(id)){paintRoomCalendarState(id);return;}
  if(!st.start){
    $(`rc-status-${id}`).innerHTML='<div class="notice">Select at least one date first.</div>';
    return;
  }
  const start=st.start,end=st.end||st.start;
  const price=$(`rc-price-${id}`).value ? Number($(`rc-price-${id}`).value) : null;
  const note=$(`rc-note-${id}`).value.trim()||null;
  const {data,error}=await sb.rpc('frankiholz_set_calendar_range',{
    p_room_id:id,
    p_start_date:start,
    p_end_date:end,
    p_status:status,
    p_price_override:price,
    p_note:note
  });
  if(error){
    $(`rc-status-${id}`).innerHTML=`<div class="notice">${esc(error.message)}</div>`;
    return;
  }
  const label=status==='available'?'available':status==='blocked'?'blocked':'booked';
  $(`rc-status-${id}`).innerHTML=`<div class="notice success">${data} date${Number(data)===1?'':'s'} updated as <b>${label}</b>. Existing reservations and payments are unchanged.</div>`;
  st.start=null;st.end=null;
  await loadRoomCalendar(id);
};

