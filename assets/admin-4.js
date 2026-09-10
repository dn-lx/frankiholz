async function loadRoomCalendar(id){
  const st=calState(id);
  const from=dateKey(new Date(st.cursor.getFullYear(),st.cursor.getMonth(),1));
  const to=dateKey(new Date(st.cursor.getFullYear(),st.cursor.getMonth()+1,0));
  const [{data,error},{data:ib,error:ibError}]=await Promise.all([
    sb.from('frankiholz_calendar').select('id,date,is_available,availability_status,price_override,note,booking_id').eq('room_id',id).gte('date',from).lte('date',to),
    sb.from('frankiholz_ical_blocks').select('date,provider').eq('room_id',id).gte('date',from).lte('date',to)
  ]);
  if(error||ibError){
    $(`rc-status-${id}`).innerHTML=`<div class="notice">${esc((error||ibError).message)}</div>`;
    return;
  }
  st.rows=data||[];st.icalBlocks=ib||[];
  renderRoomCalendar(id);
}

function rowFor(id,key){
  return calState(id).rows.find(x=>x.date===key);
}
function isAirbnbBlocked(id,key){return calState(id).icalBlocks.some(x=>x.date===key)}
function statusFor(id,key){
  const row=rowFor(id,key);
  if(row?.booking_id)return 'booked';
  if(row && (row.availability_status==='blocked'||row.availability_status==='booked'||row.is_available===false))return row.availability_status||'blocked';
  if(isAirbnbBlocked(id,key))return 'blocked';
  return 'available';
}
function renderRoomCalendar(id){
  const st=calState(id),y=st.cursor.getFullYear(),m=st.cursor.getMonth();
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
    html+=`<button type="button" class="day admin-day ${status} ${rangeStart?'range-start':''} ${rangeEnd?'range-end':''} ${rangeMid?'range-mid':''}" onclick="pickRoomDate('${id}','${key}')"><strong>${n}</strong><small>${status==='booked'?'Booked':isAirbnbBlocked(id,key)?'Airbnb':status==='blocked'?'Blocked':price}</small></button>`;
  }
  $(`rc-${id}`).innerHTML=html;
  $(`rc-range-${id}`).textContent=st.start ? `${st.start}${st.end?' → '+st.end:''}` : 'Select a start date and an end date';
}

window.pickRoomDate=(id,key)=>{
  const st=calState(id);
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
  const st=calState(id);
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
  $(`rc-status-${id}`).innerHTML=`<div class="notice success">${data} date${Number(data)===1?'':'s'} updated as <b>${label}</b>. Real guest bookings remain protected.</div>`;
  st.start=null;st.end=null;
  await loadRoomCalendar(id);
};

