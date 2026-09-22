const C=window.FRANKIHOLZ_CONFIG,s=window.supabase.createClient(C.supabaseUrl,C.supabaseKey),$=id=>document.getElementById(id);
let lang=(new URLSearchParams(location.search).get('lang')||localStorage.getItem('frankiholz-lang')||'en');if(!['en','de'].includes(lang))lang='en';
const tx={
  en:{k:'FrankiHolz booking',t:'Booking & payment status',l:'Enter the booking reference and the same email address used for your request.',r:'Booking reference',g:'Check status',b:'← Back to FrankiHolz',n:'No matching booking found.',book:'Booking',pay:'Payment',charge:'Scheduled charge',retry:'Save card securely',cancel:'Cancel booking',confirmCancel:'Do you really want to cancel this booking?',full:'Full refund available',nonref:'Non-refundable within 14 days',states:{not_started:'Card setup not started',awaiting_payment:'Card setup not completed',payment_method_saved:'Card saved securely',scheduled_charge:'Payment scheduled',paid:'Paid',failed:'Payment failed',released:'Payment released',refunded:'Refunded',expired:'Expired'}},
  de:{k:'FrankiHolz Buchung',t:'Buchungs- & Zahlungsstatus',l:'Geben Sie die Buchungsreferenz und dieselbe E-Mail-Adresse wie bei Ihrer Anfrage ein.',r:'Buchungsreferenz',g:'Status prüfen',b:'← Zurück zu FrankiHolz',n:'Keine passende Buchung gefunden.',book:'Buchung',pay:'Zahlung',charge:'Geplante Belastung',retry:'Karte sicher speichern',cancel:'Buchung stornieren',confirmCancel:'Möchten Sie diese Buchung wirklich stornieren?',full:'Volle Erstattung möglich',nonref:'Innerhalb von 14 Tagen nicht erstattungsfähig',states:{not_started:'Karteneinrichtung noch nicht gestartet',awaiting_payment:'Karteneinrichtung noch nicht abgeschlossen',payment_method_saved:'Karte sicher gespeichert',scheduled_charge:'Zahlung geplant',paid:'Bezahlt',failed:'Zahlung fehlgeschlagen',released:'Zahlung freigegeben',refunded:'Erstattet',expired:'Abgelaufen'}}
};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=n=>new Intl.NumberFormat(lang==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR'}).format(Number(n||0));
function apply(){document.documentElement.lang=lang;localStorage.setItem('frankiholz-lang',lang);$('kicker').textContent=tx[lang].k;$('title').textContent=tx[lang].t;$('lead').textContent=tx[lang].l;$('refLabel').textContent=tx[lang].r;$('go').textContent=tx[lang].g;$('back').textContent=tx[lang].b;$('back').href='/?lang='+lang;document.querySelectorAll('.lang-btn').forEach(x=>x.classList.toggle('active',x.dataset.lang===lang))}
document.querySelectorAll('.lang-btn').forEach(x=>x.onclick=()=>{lang=x.dataset.lang;apply()});
async function loadStatus(){
  const ref=$('ref').value.trim(),email=$('email').value.trim(),out=$('out');
  const {data,error}=await s.rpc('frankiholz_booking_status_v3',{p_reference:ref,p_email:email});
  const b=data?.[0];
  if(error||!b){out.innerHTML='<div class="notice">'+esc(error?.message||tx[lang].n)+'</div>';return}
  const state=tx[lang].states[b.payment_status]||String(b.payment_status||'not_started').replaceAll('_',' ');
  const test=b.payment_mode==='test'?'<span class="status" style="background:#fff3cd;color:#7a5a00;margin-left:6px">TEST</span>':'';
  const pay=b.payment_url&&b.payment_status==='awaiting_payment'?'<a class="btn secondary" href="'+esc(b.payment_url)+'" style="display:inline-block;text-decoration:none;margin-top:12px">'+tx[lang].retry+'</a>':'';
  const due=b.charge_due_at?'<br>'+tx[lang].charge+': <b>'+new Date(b.charge_due_at).toLocaleString(lang==='de'?'de-DE':'en-GB')+'</b>':'';
  const policy=b.cancel_refund_eligible?tx[lang].full:tx[lang].nonref;
  const cancel=b.booking_status!=='cancelled'?'<button class="btn ghost" id="cancelBookingBtn" type="button" style="margin-top:12px">'+tx[lang].cancel+'</button>':'';
  out.innerHTML='<div class="notice '+(b.payment_status==='paid'?'success':'')+'"><b>'+esc(b.reference)+'</b>'+test+' · '+esc(b.room_name)+'<br>'+b.check_in+' → '+b.check_out+' · '+money(b.total_price)+'<br>'+tx[lang].book+': <b>'+esc(b.booking_status)+'</b> · '+tx[lang].pay+': <b>'+esc(state)+'</b>'+due+'<div class="muted" style="margin-top:8px">'+esc(policy)+'</div>'+pay+cancel+'</div>';
  $('cancelBookingBtn')?.addEventListener('click',async()=>{
    if(!confirm(tx[lang].confirmCancel))return;
    const r=await fetch(C.supabaseUrl+'/functions/v1/frankiholz-cancel-booking-v2',{method:'POST',headers:{'Content-Type':'application/json','apikey':C.supabaseKey},body:JSON.stringify({reference:ref,email})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){out.innerHTML+='<div class="notice">'+esc(j.error||'Cancellation failed')+'</div>';return}
    await loadStatus();
  });
}
$('go').onclick=loadStatus;apply();
