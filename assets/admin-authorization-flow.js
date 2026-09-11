(()=>{
  function payLabel(b){
    const map={not_started:'Not started',awaiting_payment:'Waiting for card authorization',authorized:'Card authorized · awaiting your decision',paid:'Paid & confirmed',released:'Authorization released',expired:'Expired / authorization released',failed:'Payment failed',refunded:'Refunded'};
    return map[b.payment_status]||String(b.payment_status||'').replaceAll('_',' ');
  }
  function modeBadge(b){return b.payment_mode==='test'?'<span class="status" style="background:#fff3cd;color:#7a5a00">TEST</span>':''}
  const bookingsLead=document.querySelector('[data-admin-panel="bookings"] .lead');
  if(bookingsLead)bookingsLead.textContent='Guests authorize their cards first. Accept a held booking to capture the payment, or reject it to release the authorization. You have 48 hours to decide.';

  window.loadBookings=async function(){
    const {data,error}=await sb.from('frankiholz_bookings').select('*,frankiholz_rooms(name)').order('created_at',{ascending:false});
    if(error){$('bookings').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
    $('bookings').innerHTML=(data||[]).map(b=>{
      let actions='';
      if(b.payment_status==='authorized'&&b.status==='pending'){
        actions=`<button class="btn small secondary" onclick="decideAuthorizedBooking('${b.id}','accept',this)">Accept & capture payment</button><button class="btn small danger" onclick="decideAuthorizedBooking('${b.id}','reject',this)">Reject & release authorization</button>`;
      }else if(b.payment_status==='awaiting_payment'){
        actions='<span class="status">Guest has not completed card authorization yet</span>';
      }else if(b.payment_status==='paid'){
        actions='<span class="status confirmed">Paid & confirmed</span>';
      }else if(['released','expired','failed'].includes(b.payment_status)||b.status==='cancelled'){
        actions='<span class="status cancelled">Closed</span>';
      }else{
        actions='<span class="status">Waiting for guest</span>';
      }
      const due=b.payment_status==='authorized'&&b.payment_due_at?` · <b>decide by ${new Date(b.payment_due_at).toLocaleString()}</b>`:'';
      const authorized=b.authorized_at?` · authorized ${new Date(b.authorized_at).toLocaleString()}`:'';
      return `<div class="booking-row">
        <div>${modeBadge(b)} <b>${esc(b.reference)}</b> · ${esc(b.frankiholz_rooms?.name||'')} · <span class="status ${b.status}">${esc(b.status)}</span> · <span class="status ${b.payment_status==='paid'?'confirmed':b.payment_status==='authorized'?'confirmed':''}">${esc(payLabel(b))}</span></div>
        <div class="muted">${b.check_in} → ${b.check_out} · ${money(b.total_price)} · ${b.guests} guest${b.guests===1?'':'s'}${authorized}${due}</div>
        <div style="margin-top:6px"><b>${esc(b.guest_name)}</b> · ${esc(b.guest_email)} ${b.guest_phone?'· '+esc(b.guest_phone):''}</div>
        ${b.message?`<p>${esc(b.message)}</p>`:''}
        <div style="display:flex;gap:7px;flex-wrap:wrap">${actions}</div>
      </div>`;
    }).join('')||'<div class="empty">No bookings yet.</div>';
  };

  window.decideAuthorizedBooking=async function(id,action,button){
    const accept=action==='accept';
    const question=accept?'Accept this booking and capture the authorized payment now?':'Reject this booking and release the card authorization?';
    if(!confirm(question))return;
    if(button){button.disabled=true;button.textContent=accept?'Capturing payment…':'Releasing authorization…'}
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session)throw new Error('Admin session expired. Please sign in again.');
      const res=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-booking-decision`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':CFG.supabaseKey},body:JSON.stringify({booking_id:id,action})});
      const out=await res.json();
      if(!res.ok)throw new Error(out.error||'Could not update booking');
      await loadBookings();
      await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));
      alert(accept?'Booking confirmed and payment captured.':'Booking rejected and card authorization released.');
    }catch(e){alert(e.message||String(e));await loadBookings()}
    finally{if(button&&!button.isConnected){return}else if(button){button.disabled=false;button.textContent=accept?'Accept & capture payment':'Reject & release authorization'}}
  };

  setTimeout(()=>{if(!$('dashboard').hidden)loadBookings()},0);
})();
