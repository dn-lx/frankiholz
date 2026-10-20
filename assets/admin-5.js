function isBookingDeletable(b){return Boolean(b?.id)}

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
  const question='Remove '+selected.length+' request'+(selected.length===1?'':'s')+' from this list?\n\n'+references+'\n\nYou can restore them using Show removed requests. Reservations, scheduled charges, payments and financial records remain active and unchanged. To cancel a booking or refund payment, use the booking/payment actions separately.';
  if(!confirm(question))return;
  const button=$('deleteSelectedBookings'),status=$('bookingDeleteStatus');
  if(button){button.disabled=true;button.textContent='Deleting…'}
  if(status)status.innerHTML='<div class="notice">Removing selected requests from the list…</div>';
  try{
    const {data:count,error}=await sb.rpc('frankiholz_admin_remove_requests',{p_booking_ids:selected.map(item=>item.id),p_restore:false});
    if(error)throw error;
    if(status)status.textContent=Number(count)+' request(s) removed from the list. Financial records retained.';
    await loadBookings();
    await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));
  }catch(e){
    if(status)status.innerHTML='<div class="notice">'+esc(e.message||String(e))+'</div>';
  }finally{
    if(button){button.textContent='Delete selected';syncBookingCleanupControls()}
  }
}
function bookingGuestProfile(b){
  const sex={female:'Female',male:'Male',non_binary:'Non-binary',other:'Other',prefer_not_to_say:'Prefer not to say'};
  const detail=(label,value)=>`<div><dt>${esc(label)}</dt><dd>${esc(value===null||value===undefined||value===''?'Not provided':value)}</dd></div>`;
  const languages=Array.isArray(b.guest_languages)?b.guest_languages.join(', '):b.guest_languages;
  const returning=b.guest_returning===true?'Yes · welcome back':b.guest_returning===false?'No · first stay':'Not provided';
  return `<div class="booking-profile"><div class="booking-profile-heading"><span class="booking-profile-kicker">Your guest</span><h3>${esc(b.guest_name||'Guest name unavailable')}</h3><div class="booking-contact"><span>${esc(b.guest_email||'Email not provided')}</span><span>${esc(b.guest_phone||'Phone not provided')}</span></div></div>
    <dl class="booking-profile-facts">${detail('Country',b.guest_country)}${detail('Age',b.guest_age)}${detail('Sex',sex[b.guest_sex]||b.guest_sex)}${detail('Languages',languages)}${detail('Stayed with us before?',returning)}${detail('Booking language',b.language==='de'?'Deutsch':b.language==='en'?'English':b.language)}<div class="booking-profile-wide"><dt>Hobbies & interests</dt><dd>${esc(b.guest_hobbies||'Not provided')}</dd></div></dl>
    <div class="booking-message-block"><h4>Message & arrival notes</h4><p class="booking-message">${esc(b.message||'No message provided.')}</p></div></div>`;
}
let bookingListVersion=0;
async function loadBookings(){
  const version=++bookingListVersion;if($('refreshBookings')){$('refreshBookings').onclick=loadBookings;$('refreshBookings').disabled=true;}
  const {data,error}=await sb.from('frankiholz_bookings').select('*,frankiholz_rooms(name)').order('created_at',{ascending:false}).order('id',{ascending:false});
  if(version!==bookingListVersion)return;
  if($('refreshBookings'))$('refreshBookings').disabled=false;
  if(error){$('bookings').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
  const labels={not_required:'no payment required (100% promo)',not_started:'payment setup not started',awaiting_payment:'payment setup outstanding',payment_method_saved:'payment method saved',processing:'payment processing',scheduled_charge:'payment scheduled',paid:'paid',failed:'payment failed',released:'released',refunded:'refunded',expired:'expired',authorized:'authorized'};
  $('bookings').innerHTML=(data||[]).slice().sort((a,b)=>(Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0)||String(b.id).localeCompare(String(a.id))).filter(b=>$('showRemovedBookings')?.checked?Boolean(b.admin_deleted_at):!b.admin_deleted_at).map(b=>{
    const pay=b.payment_status||'not_started',isV2=b.payment_schedule_version==='v2_14_day',mode=b.payment_mode||'live';
    const payClass=pay==='paid'?'confirmed':(['failed','expired'].includes(pay)?'cancelled':'');
    const modeBadge=`<span class="status" style="${mode==='test'?'background:#fff3cd;color:#7a5a00':'background:#e5f4ff;color:#164f73'}">${mode.toUpperCase()}</span>`;
    const deletable=isBookingDeletable(b);
    const cleanup=deletable&&!b.admin_deleted_at?`<label class="booking-check-label"><input class="booking-delete-check" type="checkbox" aria-label="Select request ${attr(b.reference)}" data-booking-id="${attr(b.id)}" data-booking-ref="${attr(b.reference)}" data-booking-mode="${attr(mode)}"> Select request</label>`:'';
    let actions='';
    if(isV2){
      if(b.status==='pending'&&['payment_method_saved','paid','not_required'].includes(pay)){
        actions+=`<button class="btn small secondary" onclick="decideBooking('${b.id}','accept',this,true,'${b.payment_collection_mode==='complimentary'?'complimentary':b.payment_collection_mode==='bank_transfer'?'bank_transfer':'saved_method'}')">Confirm booking</button>`;
        actions+=`<button class="btn small danger" onclick="decideBooking('${b.id}','reject',this,true,'${b.payment_collection_mode==='complimentary'?'complimentary':b.payment_collection_mode==='bank_transfer'?'bank_transfer':'saved_method'}')">Reject request</button>`;
      }else if(b.status==='pending'&&['not_started','awaiting_payment'].includes(pay)){
        actions+=`<span class="status">Waiting for guest payment</span><button class="btn small danger" onclick="decideBooking('${b.id}','reject',this,true,'${b.payment_collection_mode==='complimentary'?'complimentary':b.payment_collection_mode==='bank_transfer'?'bank_transfer':'saved_method'}')">Reject request</button>`;
      }else if(pay==='processing'){actions+=`<span class="status">Payment processing · awaiting settlement</span>`;}else if(b.status==='confirmed'&&pay==='scheduled_charge'){
        actions+=`<span class="status confirmed">Confirmed · payment scheduled</span>`;
      }else if(b.status==='confirmed'&&pay==='not_required'){actions+=`<span class="status confirmed">Confirmed · no payment required</span>`;}else if(b.status==='confirmed'&&pay==='paid'){
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
    if(b.admin_deleted_at)actions+=`<button class="btn small secondary" data-restore-booking="${attr(b.id)}">Restore to bookings</button>`;
    if(b.refund_review_required)actions+=`<span class="status cancelled">Refund pending / requires review in Stripe</span>`;
    if(b.bank_transfer_review_required)actions+=`<span class="status cancelled">Bank-transfer funds review required in Stripe (partial, excess or late receipts)</span>`;
    if(b.payment_operation_token)actions+=`<span class="status cancelled">Payment operation locked · reconcile Stripe before retrying</span>`;
    const received=Number.isFinite(Date.parse(b.created_at))?`<time datetime="${attr(b.created_at)}">${esc(new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Berlin',timeZoneName:'short'}).format(new Date(b.created_at)))}</time>`:'Time unavailable';
    const due=isV2&&['payment_method_saved','scheduled_charge','processing','failed'].includes(pay)&&b.charge_due_at?` · scheduled charge ${new Date(b.charge_due_at).toLocaleString()}`:(!isV2&&b.payment_due_at?` · decision/payment deadline ${new Date(b.payment_due_at).toLocaleString()}`:'');
    return `<article class="booking-row" aria-label="${attr(b.reference)}">
      <div class="booking-row-top"><div class="booking-identity"><b>${esc(b.reference)}</b><span>${esc(b.frankiholz_rooms?.name||'')}</span></div>${cleanup}</div>
      <div class="booking-received">Received ${received}</div>
      <div class="booking-badges">${modeBadge}<span class="status ${attr(b.status)}">${esc(b.status)}</span><span class="status ${payClass}">${esc(b.payment_collection_mode==='bank_transfer'&&pay==='awaiting_payment'?'existing bank transfer outstanding':labels[pay]||pay.replaceAll('_',' '))}</span></div>
      <div class="booking-stay muted">${esc(b.check_in)} → ${esc(b.check_out)} · ${money(b.total_price)} · ${b.guests} guest${b.guests===1?'':'s'}${due}</div>
      ${bookingGuestProfile(b)}
      <div class="booking-actions">${actions}</div>
    </article>`;
  }).join('')||'<div class="empty">No bookings yet.</div>';
  document.querySelectorAll('[data-restore-booking]').forEach(button=>button.onclick=async()=>{button.disabled=true;const {error}=await sb.rpc('frankiholz_admin_remove_requests',{p_booking_ids:[button.dataset.restoreBooking],p_restore:true});if(error){$('bookingDeleteStatus').textContent=error.message;button.disabled=false;return}await loadBookings();});
  if($('showRemovedBookings'))$('showRemovedBookings').onchange=loadBookings;
  wireBookingCleanupControls();
}

window.decideBooking=async(id,action,button,isV2,collectionMode)=>{
  const accept=action==='accept';
  const question=collectionMode==='complimentary'?(accept?'Confirm this complimentary booking? No payment will be collected.':'Reject this complimentary request? No payment or refund is required.'):isV2&&collectionMode==='bank_transfer'?(accept?'Confirm this booking? The bank payment has already been received.':'Reject this bank-transfer request? Received payment will be refunded. Review any partial, excess or late funds in Stripe.'):isV2
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
