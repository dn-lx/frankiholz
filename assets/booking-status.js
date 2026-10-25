'use strict';
const C=window.FRANKIHOLZ_CONFIG,s=window.supabase.createClient(C.supabaseUrl,C.supabaseKey),$=id=>document.getElementById(id);
const guest=window.FrankiHolzGuest,hostContact=window.loadFrankiHolzContactNumbers(s);
let savedLanguage='';try{savedLanguage=localStorage.getItem('frankiholz-lang')||''}catch(storageError){}
let lang=new URLSearchParams(location.search).get('lang')||savedLanguage||'en';if(!['en','de'].includes(lang))lang='en';
const tx={
  en:{gatewayNoticeTitle:'Secure payments with Stripe',gatewayNoticeText:'Available payment options are shown by Stripe. A payment does not confirm your stay; the host must approve your booking.',contactHost:'Contact the host',k:'FrankiHolz booking',t:'Booking & payment status',l:'Enter your booking reference and email.',r:'Booking reference',g:'Check status',b:'← Back to FrankiHolz',n:'No matching booking found.',book:'Booking',pay:'Payment',charge:'Scheduled charge',retry:'Continue to payment',retrying:'Opening secure payment…',retryError:'Could not reopen payment.',environmentChanged:'Stripe environment has changed. Contact FrankiHolz before retrying.',cancel:'Cancel booking',confirmCancel:'Do you really want to cancel this booking?',full:'Full refund available',nonref:'Non-refundable within 14 days',states:{not_required:'No payment required (100% promo)',not_started:'Payment not started',awaiting_payment:'Waiting for payment details or bank transfer',payment_method_saved:'Payment method saved securely',processing:'Payment processing — please wait for settlement',scheduled_charge:'Payment scheduled',paid:'Paid',failed:'Payment failed',released:'Payment released',refunded:'Refunded',expired:'Expired'}},
  de:{gatewayNoticeTitle:'Sichere Zahlungen mit Stripe',gatewayNoticeText:'Stripe zeigt die verfügbaren Zahlungsoptionen. Eine Zahlung bestätigt Ihren Aufenthalt nicht; der Gastgeber muss Ihre Buchung genehmigen.',contactHost:'Gastgeber kontaktieren',k:'FrankiHolz Buchung',t:'Buchungs- & Zahlungsstatus',l:'Geben Sie Ihre Buchungsreferenz und E-Mail-Adresse ein.',r:'Buchungsreferenz',g:'Status prüfen',b:'← Zurück zu FrankiHolz',n:'Keine passende Buchung gefunden.',book:'Buchung',pay:'Zahlung',charge:'Geplante Belastung',retry:'Weiter zur Zahlung',retrying:'Sichere Zahlung wird geöffnet …',retryError:'Zahlung konnte nicht erneut geöffnet werden.',environmentChanged:'Stripe-Zahlungsumgebung wurde geändert. Bitte FrankiHolz kontaktieren.',cancel:'Buchung stornieren',confirmCancel:'Möchten Sie diese Buchung wirklich stornieren?',full:'Volle Erstattung möglich',nonref:'Innerhalb von 14 Tagen nicht erstattungsfähig',states:{not_required:'Keine Zahlung erforderlich (100%-Gutschein)',not_started:'Zahlung noch nicht gestartet',awaiting_payment:'Zahlungsdaten oder Überweisung ausstehend',payment_method_saved:'Zahlungsmethode sicher gespeichert',processing:'Zahlung wird verarbeitet — bitte Eingang abwarten',scheduled_charge:'Zahlung geplant',paid:'Bezahlt',failed:'Zahlung fehlgeschlagen',released:'Zahlung freigegeben',refunded:'Erstattet',expired:'Abgelaufen'}}
};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=n=>new Intl.NumberFormat(lang==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR'}).format(Number(n||0));
let lookupVersion=0,actionVersion=0,loaded=null,statusBusy=false,pageActive=true,hostTimes=guest.defaultStayTimes();
const inputIdentity=()=>({reference:$('ref').value.trim(),email:$('email').value.trim()});
const sameInput=identity=>identity.reference===$('ref').value.trim()&&identity.email===$('email').value.trim();
const isCurrent=snapshot=>pageActive&&loaded===snapshot&&snapshot.version===lookupVersion&&sameInput(snapshot.identity);
function setStatusBusy(value){
 statusBusy=value;['ref','email','go','retryCardBtn','cancelBookingBtn'].forEach(id=>{if($(id))$(id).disabled=value});
 document.querySelectorAll('.lang-btn').forEach(button=>{button.disabled=value});
}
function apply(){
 document.documentElement.lang=lang;try{localStorage.setItem('frankiholz-lang',lang)}catch(storageError){}
 $('kicker').textContent=tx[lang].k;$('title').textContent=tx[lang].t;$('lead').textContent=tx[lang].l;$('refLabel').textContent=tx[lang].r;$('go').textContent=tx[lang].g;$('back').textContent=tx[lang].b;$('back').href='/?lang='+lang;
 document.querySelectorAll('.lang-btn').forEach(button=>{button.classList.toggle('active',button.dataset.lang===lang);button.setAttribute('aria-pressed',String(button.dataset.lang===lang))});
}
function invalidateStatus(){lookupVersion++;actionVersion++;loaded=null;setStatusBusy(false);$('out').innerHTML='';$('out').removeAttribute('aria-busy');}
function showError(message){const node=document.createElement('div');node.className='notice';node.setAttribute('role','alert');node.textContent=message;$('out').append(node);}
function renderLoaded(){
 const snapshot=loaded;if(!snapshot||!isCurrent(snapshot))return;
 const b=snapshot.booking,out=$('out'),de=lang==='de',focused=document.activeElement?.id;
 const manual=b.payment_collection_mode==='manual_bank';
 const state=manual&&b.payment_status==='awaiting_payment'?(de?'Direkte Überweisung · Geldeingang ausstehend':'Direct transfer · awaiting bank credit'):(tx[lang].states[b.payment_status]||String(b.payment_status||'not_started').replaceAll('_',' '));
 const test=b.payment_mode==='test'?'<span class="status" style="background:#fff3cd;color:#7a5a00;margin-left:6px">TEST</span>':'';
 const canRetry=b.booking_status==='pending'&&['not_started','expired','failed','awaiting_payment'].includes(b.payment_status);
 const pay=canRetry?'<button class="btn secondary" id="retryCardBtn" type="button" style="margin-top:12px">'+tx[lang].retry+'</button>':'';
 const due=b.charge_due_at?'<br>'+tx[lang].charge+': <b>'+esc(new Date(b.charge_due_at).toLocaleString(de?'de-DE':'en-GB',{timeZone:'Europe/Berlin'}))+'</b>':'';
 const policy=manual&&b.booking_status==='pending'?(de?'Ein Überweisungsbeleg ist keine Zahlungsbestätigung. Die Buchung ist erst nach geprüftem Geldeingang und Verfügbarkeit bestätigt.':'A transfer receipt is not proof of cleared funds. Your booking is confirmed only after credited payment and availability checks.'):b.payment_status==='not_required'?(de?'Keine Zahlung oder Erstattung erforderlich.':'No payment or refund required.'):b.cancel_refund_eligible?tx[lang].full:tx[lang].nonref;
 const cancel=b.booking_status!=='cancelled'?'<button class="btn ghost" id="cancelBookingBtn" type="button" style="margin-top:12px">'+tx[lang].cancel+'</button>':'';
 out.innerHTML='<div class="notice '+(b.payment_status==='paid'?'success':'')+'"><b>'+esc(b.reference)+'</b>'+test+' · '+esc(b.room_name)+'<br>'+esc(b.check_in)+' → '+esc(b.check_out)+' · '+money(b.total_price)+'<br>'+tx[lang].book+': <b>'+esc(b.booking_status)+'</b> · '+tx[lang].pay+': <b>'+esc(state)+'</b>'+due+'<div class="muted" style="margin-top:8px">'+esc(policy)+'</div>'+pay+cancel+'</div>';
 const confirmed=b.booking_status==='confirmed',closed=b.booking_status==='cancelled';
 const welcome=confirmed?(de?'Wir freuen uns auf Sie!':'We look forward to welcoming you!'):closed?(de?'Wir sind weiterhin gerne für Sie da':'We are still here to help'):(de?'Vielen Dank für Ihre Anfrage':'Thank you for your request');
 const checkIn=hostTimes[lang].checkIn;
 const note=confirmed?(de?'Wann kommen Sie voraussichtlich an? Antworten Sie auf Ihre Bestätigungs-E-Mail oder schreiben Sie uns über WhatsApp. So können wir Ihre Ankunft ab '+checkIn+' Uhr gemeinsam abstimmen.':'What time do you expect to arrive? Reply to your confirmation email or message us on WhatsApp so we can arrange your welcome from '+checkIn+'.'):closed?(de?'Wenn Sie Fragen haben oder einen anderen Aufenthalt planen, melden Sie sich gerne bei uns.':'If you have any questions or would like to plan another stay, please get in touch.'):(de?'Schön, dass Sie bei uns übernachten möchten. Ihr Gastgeber prüft die Anfrage. Sie erhalten eine E-Mail, sobald Ihr Aufenthalt bestätigt ist.':'We are happy you would like to stay with us. Your host is reviewing the request. We will email you as soon as your stay is confirmed.');
 const whatsappMessage=encodeURIComponent((de?'Hallo FrankiHolz, meine Buchungsreferenz ist ':'Hello FrankiHolz, my booking reference is ')+b.reference+'. '+(confirmed?(de?'Meine voraussichtliche Ankunftszeit ist …':'My estimated arrival time is …'):''));
 out.insertAdjacentHTML('beforeend','<aside class="guest-support"><h3>'+welcome+'</h3><p>'+esc(note)+'</p><p class="muted guest-stay-times">'+(de?'Check-in ab ':'Check-in from ')+esc(hostTimes[lang].checkIn)+' · '+(de?'Check-out bis ':'Check-out by ')+esc(hostTimes[lang].checkOut)+'</p><div class="guest-support-links"><a class="whatsapp-contact" id="guestStatusWhatsapp" hidden target="_blank" rel="noopener noreferrer"><img src="/assets/whatsapp.svg" width="22" height="22" alt="">'+(de?'Über WhatsApp schreiben':'Chat with your hosts')+'</a><a href="/assets/documents/frankiholz-house-guide.pdf" target="_blank" rel="noopener">'+(de?'Hausregeln ansehen (PDF · EN/DE)':'Read our house guide (PDF · EN/DE)')+'</a></div></aside>');
 const whatsappLink=$('guestStatusWhatsapp');
 hostContact.then(numbers=>{if(!isCurrent(snapshot)||!whatsappLink.isConnected)return;const number=numbers[de?'de':'en'];whatsappLink.hidden=!number;if(number)whatsappLink.href='https://wa.me/'+number+'?text='+whatsappMessage;});
 $('retryCardBtn')?.addEventListener('click',()=>{
  if(statusBusy||!isCurrent(snapshot))return;
  const attempt=++actionVersion;setStatusBusy(true);
  try{guest.rememberCredentials(snapshot.credentials);if(!isCurrent(snapshot)||attempt!==actionVersion)return;location.assign('/payment.html?reference='+encodeURIComponent(b.reference)+'&lang='+lang);}
  catch(error){if(isCurrent(snapshot)){setStatusBusy(false);showError(tx[lang].retryError);}}
 });
 if(['retryCardBtn','cancelBookingBtn'].includes(focused))$(focused)?.focus({preventScroll:true});
 $('cancelBookingBtn')?.addEventListener('click',async()=>{
  if(statusBusy||!isCurrent(snapshot))return;
  const attempt=++actionVersion;setStatusBusy(true);
  const current=()=>attempt===actionVersion&&isCurrent(snapshot);
  try{
   const question=de?'Möchten Sie die Buchung '+b.reference+' wirklich stornieren?':'Do you really want to cancel booking '+b.reference+'?';
   if(!confirm(question)||!current())return;
   const response=await fetch(C.supabaseUrl+'/functions/v1/frankiholz-cancel-booking-v2',{method:'POST',headers:{'Content-Type':'application/json','apikey':C.supabaseKey},body:JSON.stringify(snapshot.credentials)});
   const result=await response.json().catch(()=>({}));if(!current())return;
   if(!response.ok)throw new Error(result.error||(de?'Stornierung fehlgeschlagen.':'Cancellation failed.'));
   setStatusBusy(false);await loadStatus();
  }catch(error){if(current())showError(error.message||(de?'Stornierung fehlgeschlagen.':'Cancellation failed.'));}
  finally{if(pageActive&&attempt===actionVersion)setStatusBusy(false);}
 });
}
async function loadStatus(){
 if(statusBusy||!pageActive)return;
 const identity=inputIdentity(),version=++lookupVersion;loaded=null;$('out').innerHTML='';
 if(!identity.reference||!identity.email){$('go').disabled=false;return;}
 $('go').disabled=true;$('out').setAttribute('aria-busy','true');
 try{
  const {data,error}=await s.rpc('frankiholz_booking_status_v3',{p_reference:identity.reference,p_email:identity.email});
  if(!pageActive||version!==lookupVersion||!sameInput(identity))return;
  const base=data?.[0];if(error||!base?.reference)throw new Error(error?.message||tx[lang].n);
  const extra=await s.rpc('frankiholz_payment_details',{p_reference:base.reference,p_email:identity.email});
  if(!pageActive||version!==lookupVersion||!sameInput(identity))return;
  const b={...base,...(extra.error?{}:extra.data||{})};
  const credentials={reference:b.reference,email:identity.email};guest.rememberCredentials(credentials);
  loaded={booking:b,credentials,identity,version};renderLoaded();
 }catch(error){if(pageActive&&version===lookupVersion&&sameInput(identity))showError(error.message||tx[lang].n);}
 finally{if(pageActive&&version===lookupVersion){$('out').removeAttribute('aria-busy');if(!statusBusy)$('go').disabled=false;}}
}
document.querySelectorAll('.lang-btn').forEach(button=>button.onclick=()=>{
 if(statusBusy)return;lang=button.dataset.lang;apply();const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState({},'',url.pathname+url.search+url.hash);renderLoaded();
});
['ref','email'].forEach(id=>$(id).addEventListener('input',invalidateStatus));
$('go').onclick=loadStatus;apply();
const restored=guest.restoreCredentials({checkoutFallback:true});$('ref').value=restored.reference;$('email').value=restored.email;
guest.loadStayTimes(s).then(times=>{hostTimes=times;if(pageActive&&loaded&&!statusBusy)renderLoaded();});
if($('ref').value&&$('email').value)loadStatus();
window.addEventListener('pagehide',()=>{pageActive=false;lookupVersion++;actionVersion++;});
window.addEventListener('pageshow',event=>{pageActive=true;if(event.persisted){setStatusBusy(false);loadStatus();}});
