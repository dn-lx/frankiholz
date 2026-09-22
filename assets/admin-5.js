function isBookingDeletable(b){
  const pay=String(b?.payment_status||'');
  return b?.status==='cancelled'&&!['paid','refunded'].includes(pay)&&!b?.stripe_payment_method_id;
}

function selectedBookingCleanupItems(){
  return [...document.querySelectorAll('.booking-delete-check:checked')].map(input=>({
    id:input.dataset.bookingId,
    reference:input.dataset.bookingRef||'',
    mode:input.dataset.bookingMode||'live'
  }));
}

function syncBookingCleanupControls(){
  const checks=[...document.querySelectorAll('.booking-delete-check')];
  const selected=checks.filter(input=>input.checked);
  const master=$('selectAllDeletableBookings');
  const button=$('deleteSelectedBookings');
  const label=$('bookingDeleteSelection');
  if(master){
    master.disabled=!checks.length;
    master.checked=Boolean(checks.length)&&selected.length===checks.length;
    master.indeterminate=selected.length>0&&selected.length<checks.length;
  }
  if(button)button.disabled=!selected.length;
  if(label)label.textContent=selected.length+' selected';
}

function wireBookingCleanupControls(){
  document.querySelectorAll('.booking-delete-check').forEach(input=>input.addEventListener('change',syncBookingCleanupControls));
  const master=$('selectAllDeletableBookings');
  if(master){
    master.onchange=()=>{
      document.querySelectorAll('.booking-delete-check').forEach(input=>{input.checked=master.checked});
      syncBookingCleanupControls();
    };
  }
  const button=$('deleteSelectedBookings');
  if(button)button.onclick=deleteSelectedBookings;
  syncBookingCleanupControls();
}

async function deleteSelectedBookings(){
  const selected=selectedBookingCleanupItems();
  if(!selected.length)return;
  const references=selected.map(item=>item.reference).join(', ');
  const liveCount=selected.filter(item=>item.mode==='live').length;
  const baseQuestion='Permanently delete '+selected.length+' closed booking'+(selected.length===1?'':'s')+'?\n\n'+references+'\n\nThis removes the booking record and its booking email history from FrankiHolz. This cannot be undone.';
  if(!confirm(baseQuestion))return;
  if(liveCount&&!confirm(liveCount+' selected booking'+(liveCount===1?' was':'s were')+' originally marked LIVE, although '+(liveCount===1?'it is':'they are')+' now cancelled and unpaid. Permanently delete '+(liveCount===1?'it':'them')+'?'))return;

  const button=$('deleteSelectedBookings'),status=$('bookingDeleteStatus');
  if(button){button.disabled=true;button.textContent='Deleting…'}
  if(status)status.innerHTML='<div class="notice">Deleting selected closed bookings…</div>';
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error('Admin session expired. Please sign in again.');
    const res=await fetch(CFG.supabaseUrl+'/functions/v1/frankiholz-admin-delete-bookings',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':CFG.supabaseKey},
      body:JSON.stringify({booking_ids:selected.map(item=>item.id)})
    });
    const out=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(out.error||'Could not delete selected bookings');
    if(status)status.innerHTML='<div class="notice success">Deleted '+Number(out.deleted_count||0)+' closed booking'+(Number(out.deleted_count||0)===1?'':'s')+'.</div>';
    await loadBookings();
    await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));
  }catch(e){
    if(status)status.innerHTML='<div class="notice">'+esc(e.message||String(e))+'</div>';
  }finally{
    if(button){button.textContent='Delete selected';syncBookingCleanupControls()}
  }
}
async function loadBookings(){
  const {data,error}=await sb.from('frankiholz_bookings').select('*,frankiholz_rooms(name)').order('created_at',{ascending:false});
  if(error){$('bookings').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
  const labels={not_started:'card setup not started',awaiting_payment:'card setup incomplete',payment_method_saved:'card saved',scheduled_charge:'payment scheduled',paid:'paid',failed:'payment failed',released:'released',refunded:'refunded',expired:'expired',authorized:'authorized'};
  $('bookings').innerHTML=(data||[]).map(b=>{
    const pay=b.payment_status||'not_started',isV2=b.payment_schedule_version==='v2_14_day',mode=b.payment_mode||'live',deletable=isBookingDeletable(b);
    const payClass=pay==='paid'?'confirmed':(['failed','expired'].includes(pay)?'cancelled':'');
    const modeBadge=`<span class="status" style="${mode==='test'?'background:#fff3cd;color:#7a5a00':'background:#e5f4ff;color:#164f73'}">${mode.toUpperCase()}</span>`;
    const cleanup=deletable?`<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;margin-right:8px"><input class="booking-delete-check" type="checkbox" data-booking-id="${attr(b.id)}" data-booking-ref="${attr(b.reference)}" data-booking-mode="${attr(mode)}"> Select for deletion</label>`:'';
    let actions='';
    if(isV2){
      if(b.status==='pending'&&pay==='payment_method_saved'){
        actions+=`<button class="btn small secondary" onclick="decideBooking('${b.id}','accept',this,true)">Confirm booking</button>`;
        actions+=`<button class="btn small danger" onclick="decideBooking('${b.id}','reject',this,true)">Reject request</button>`;
      }else if(b.status==='pending'&&['not_started','awaiting_payment'].includes(pay)){
        actions+=`<span class="status">Waiting for guest card setup</span><button class="btn small danger" onclick="decideBooking('${b.id}','reject',this,true)">Reject request</button>`;
      }else if(b.status==='confirmed'&&pay==='scheduled_charge'){
        actions+=`<span class="status confirmed">Confirmed · payment scheduled</span>`;
      }else if(b.status==='confirmed'&&pay==='paid'){
        actions+=`<span class="status confirmed">Paid & confirmed</span>`;
      }else if(pay==='failed'){
        actions+=`<span class="status cancelled">Payment failed · follow up required</span>`;
      }else if(b.status==='cancelled'){
        actions+=`<span class="status cancelled">Closed</span>`;
      }
    }else{
      if(b.status==='pending'&&pay==='authorized'){
        actions+=`<button class="btn small secondary" onclick="decideBooking('${b.id}','accept',this,false)">Accept & capture legacy authorization</button>`;
        actions+=`<button class="btn small danger" onclick="decideBooking('${b.id}','reject',this,false)">Reject & release</button>`;
      }else if(b.status==='cancelled'){
        actions+=`<span class="status cancelled">Closed · legacy flow</span>`;
      }else{
        actions+=`<span class="status">Legacy payment flow</span>`;
      }
    }
    const due=isV2&&b.charge_due_at?` · scheduled charge ${new Date(b.charge_due_at).toLocaleString()}`:(!isV2&&b.payment_due_at?` · decision/payment deadline ${new Date(b.payment_due_at).toLocaleString()}`:'');
    return `<div class="booking-row">
      <div>${cleanup}<b>${esc(b.reference)}</b> · ${esc(b.frankiholz_rooms?.name||'')} · ${modeBadge} · <span class="status ${b.status}">${esc(b.status)}</span> · <span class="status ${payClass}">${esc(labels[pay]||pay.replaceAll('_',' '))}</span></div>
      <div class="muted">${b.check_in} → ${b.check_out} · ${money(b.total_price)} · ${b.guests} guest${b.guests===1?'':'s'}${due}</div>
      <div style="margin-top:6px"><b>${esc(b.guest_name)}</b> · ${esc(b.guest_email)} ${b.guest_phone?'· '+esc(b.guest_phone):''}</div>
      ${b.message?`<p>${esc(b.message)}</p>`:''}
      <div style="display:flex;gap:7px;flex-wrap:wrap">${actions}</div>
    </div>`;
  }).join('')||'<div class="empty">No bookings yet.</div>';
  wireBookingCleanupControls();
}

window.decideBooking=async(id,action,button,isV2)=>{
  const accept=action==='accept';
  const question=isV2
    ?(accept?'Confirm this booking? Payment will be scheduled for 14 days before check-in, or charged now if the stay begins within 14 days.':'Reject this booking request? The saved card will not be charged.')
    :(accept?'Accept this legacy booking and capture the existing card authorization?':'Reject this legacy booking and release the card authorization?');
  if(!confirm(question))return;
  if(button){button.disabled=true;button.textContent=accept?'Updating booking…':'Closing request…'}
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error('Admin session expired. Please sign in again.');
    const res=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-booking-decision`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':CFG.supabaseKey},
      body:JSON.stringify({booking_id:id,action})
    });
    const out=await res.json();
    if(!res.ok)throw new Error(out.error||'Could not update booking');
    await loadBookings();
    await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));
    if(accept)alert(out.payment_status==='scheduled_charge'?'Booking confirmed. Payment is scheduled.':'Booking confirmed.');
    else alert('Booking request closed.');
  }catch(e){alert(e.message||String(e));await loadBookings()}
  finally{if(button?.isConnected){button.disabled=false;button.textContent=accept?'Confirm booking':'Reject request'}}
};

function safeName(n){return n.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(-100)}function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function attr(v){return esc(v)}function js(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}

function setupAdminTabs(){
  const wrap=document.querySelector('#dashboard .wrap');
  const header=wrap?.querySelector('.admin-header');
  if(!wrap||!header||wrap.querySelector('.admin-tabs'))return;
  const panels=[...wrap.querySelectorAll(':scope > .panel')];
  if(panels.length<6)return;
  const categories=['website','website','pricing','availability','rooms','bookings'];
  panels.forEach((panel,index)=>{panel.classList.add('admin-tab-panel');panel.dataset.adminPanel=categories[index]||'website'});
  const defs=[
    ['website','Website'],
    ['pricing','Pricing'],
    ['availability','Availability'],
    ['rooms','Rooms'],
    ['bookings','Bookings']
  ];
  const tabs=document.createElement('nav');
  tabs.className='admin-tabs';
  tabs.setAttribute('aria-label','FrankiHolz admin sections');
  tabs.innerHTML=defs.map(([key,label])=>`<button type="button" class="admin-tab" data-admin-tab="${key}">${label}</button>`).join('');
  header.insertAdjacentElement('afterend',tabs);
  const valid=new Set(defs.map(([key])=>key));
  const fromHash=location.hash.replace('#','');
  const remembered=localStorage.getItem('frankiholz-admin-tab');
  const initial=valid.has(fromHash)?fromHash:(valid.has(remembered)?remembered:'bookings');
  const activate=key=>{
    if(!valid.has(key))key='bookings';
    tabs.querySelectorAll('.admin-tab').forEach(btn=>{
      const active=btn.dataset.adminTab===key;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',String(active));
    });
    panels.forEach(panel=>{
      const show=panel.dataset.adminPanel===key;
      panel.hidden=!show;
      panel.classList.toggle('tab-visible',show);
    });
    localStorage.setItem('frankiholz-admin-tab',key);
    history.replaceState(null,'',`#${key}`);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  tabs.addEventListener('click',event=>{
    const button=event.target.closest('[data-admin-tab]');
    if(button)activate(button.dataset.adminTab);
  });
  activate(initial);
}

verifyAdmin();
setupAdminTabs();
