async function loadBookings(){
  const {data,error}=await sb.from('frankiholz_bookings').select('*,frankiholz_rooms(name)').order('created_at',{ascending:false});
  if(error){$('bookings').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
  $('bookings').innerHTML=(data||[]).map(b=>{
    const pay=b.payment_status||'not_started';
    const payClass=pay==='paid'?'confirmed':(pay==='failed'||pay==='expired'?'cancelled':'');
    let actions='';
    if(b.status==='pending'){
      actions+=`<button class="btn small secondary" onclick="approveAndPay('${b.id}')">Approve & create payment</button>`;
      actions+=`<button class="btn small danger" onclick="cancelBooking('${b.id}')">Reject</button>`;
    }else if(b.status==='confirmed' && pay==='awaiting_payment'){
      actions+=`<button class="btn small secondary" onclick="approveAndPay('${b.id}')">Open payment link</button>`;
      actions+=`<button class="btn small danger" onclick="cancelBooking('${b.id}')">Cancel hold</button>`;
    }else if(pay==='paid'){
      actions+=`<span class="status confirmed">Paid & confirmed</span>`;
    }else if(b.status==='cancelled'){
      actions+=`<span class="status cancelled">Closed</span>`;
    }
    const due=b.payment_due_at?` · payment due ${new Date(b.payment_due_at).toLocaleString()}`:'';
    return `<div class="booking-row">
      <div><b>${esc(b.reference)}</b> · ${esc(b.frankiholz_rooms?.name||'')} · <span class="status ${b.status}">${esc(b.status)}</span> · <span class="status ${payClass}">${esc(pay.replaceAll('_',' '))}</span></div>
      <div class="muted">${b.check_in} → ${b.check_out} · ${money(b.total_price)} · ${b.guests} guest${b.guests===1?'':'s'}${due}</div>
      <div style="margin-top:6px"><b>${esc(b.guest_name)}</b> · ${esc(b.guest_email)} ${b.guest_phone?'· '+esc(b.guest_phone):''}</div>
      ${b.message?`<p>${esc(b.message)}</p>`:''}
      <div style="display:flex;gap:7px;flex-wrap:wrap">${actions}</div>
    </div>`;
  }).join('')||'<div class="empty">No bookings yet.</div>'
}
window.approveAndPay=async id=>{
  const btn=event?.target;
  if(btn){btn.disabled=true;btn.textContent='Creating payment…'}
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session) throw new Error('Admin session expired. Please sign in again.');
    const res=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-create-payment`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':CFG.supabaseKey},
      body:JSON.stringify({booking_id:id})
    });
    const out=await res.json();
    if(!res.ok)throw new Error(out.error||'Could not create payment');
    await loadBookings();
    await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));
    if(out.checkout_url)window.open(out.checkout_url,'_blank','noopener');
  }catch(e){alert(e.message||String(e));}
  finally{if(btn){btn.disabled=false;btn.textContent='Approve & create payment'}}
};
window.cancelBooking=async id=>{
  if(!confirm('Cancel this booking request / payment hold?'))return;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error('Admin session expired.');
    const res=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-cancel-payment`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':CFG.supabaseKey},
      body:JSON.stringify({booking_id:id})
    });
    const out=await res.json();
    if(!res.ok)throw new Error(out.error||'Could not cancel booking');
    await loadBookings();
    await Promise.all(rooms.map(r=>loadRoomCalendar(r.id)));
  }catch(e){alert(e.message||String(e));}
};
function safeName(n){return n.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(-100)}function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function attr(v){return esc(v)}function js(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
verifyAdmin();
