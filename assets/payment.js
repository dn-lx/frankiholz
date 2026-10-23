'use strict';
const config=window.FRANKIHOLZ_CONFIG,client=window.supabase.createClient(config.supabaseUrl,config.supabaseKey),el=id=>document.getElementById(id);
let storedLanguage='';try{storedLanguage=localStorage.getItem('frankiholz-lang')||''}catch(storageError){}
let language=new URLSearchParams(location.search).get('lang')||storedLanguage||'en';
if(!['en','de'].includes(language))language='en';
const copy={
 en:{lookupDetails:'Booking details',step:'Your booking request',title:'Choose how to pay',lead:'Thank you for choosing FrankiHolz. We have received your request and look forward to getting to know you. Choose your preferred method securely with Stripe; your host will confirm your stay separately.',reference:'Booking reference',email:'Booking email',load:'Show payment options',savedTitle:'Card, wallets & bank debit',savedMethods:'Cards, Apple Pay, Google Pay, SEPA Direct Debit and other eligible methods are offered on Stripe.',savedTiming:'Save your payment details now without a charge. If the host confirms, payment is initiated 14 days before check-in, or after confirmation for stays within 14 days. Bank debits can take several business days.',savedAction:'Choose a method on Stripe',bankAction:'View existing transfer instructions',eligibility:'Stripe shows the methods eligible for your country, currency, device and this payment flow.',status:'Booking & payment status',back:'Back to FrankiHolz',loading:'Loading your booking…',opening:'Opening Stripe…',missing:'No matching booking found. Check your reference and email.',error:'Unable to open payment. Please try again or contact FrankiHolz.',changed:'The payment environment has changed. Contact FrankiHolz before continuing.',test:'Stripe TEST — no real payment. This booking remains in the test environment.',closed:'This request is closed. No new payment can be started.',ready:'Payment is already saved, scheduled, processing or completed. Check your booking status for details.',bankExisting:'Bank transfers are no longer offered for new requests. This request already has a transfer in progress. View its existing instructions; do not send the payment again if you have already transferred it.'},
 de:{lookupDetails:'Buchungsdaten',step:'Ihre Buchungsanfrage',title:'Wie möchten Sie bezahlen?',lead:'Vielen Dank, dass Sie sich für FrankiHolz entschieden haben. Ihre Anfrage ist bei uns angekommen und wir freuen uns darauf, Sie kennenzulernen. Wählen Sie Ihre Methode sicher bei Stripe; Ihr Gastgeber bestätigt den Aufenthalt anschließend separat.',reference:'Buchungsreferenz',email:'E-Mail der Buchung',load:'Zahlungsoptionen anzeigen',savedTitle:'Karte, Wallets & Banklastschrift',savedMethods:'Karten, Apple Pay, Google Pay, SEPA-Lastschrift und weitere geeignete Methoden werden bei Stripe angeboten.',savedTiming:'Speichern Sie Ihre Zahlungsdaten jetzt ohne Belastung. Bei Zustimmung wird die Zahlung 14 Tage vor Check-in ausgelöst, bei Aufenthalten innerhalb von 14 Tagen nach Bestätigung. Banklastschriften können mehrere Werktage dauern.',savedAction:'Methode bei Stripe wählen',bankAction:'Bestehende Überweisungsdaten ansehen',eligibility:'Stripe zeigt die für Ihr Land, Ihre Währung, Ihr Gerät und diesen Zahlungsablauf verfügbaren Methoden.',status:'Buchungs- & Zahlungsstatus',back:'Zurück zu FrankiHolz',loading:'Buchung wird geladen …',opening:'Stripe wird geöffnet …',missing:'Keine passende Buchung gefunden. Prüfen Sie Referenz und E-Mail.',error:'Zahlung konnte nicht geöffnet werden. Versuchen Sie es erneut oder kontaktieren Sie FrankiHolz.',changed:'Die Zahlungsumgebung wurde geändert. Kontaktieren Sie FrankiHolz, bevor Sie fortfahren.',test:'Stripe TEST — keine echte Zahlung. Diese Buchung bleibt in der Testumgebung.',closed:'Diese Anfrage ist geschlossen. Es kann keine neue Zahlung gestartet werden.',ready:'Die Zahlung ist bereits gespeichert, geplant, in Verarbeitung oder abgeschlossen. Details finden Sie im Buchungsstatus.',bankExisting:'Überweisungen werden für neue Anfragen nicht mehr angeboten. Für diese Anfrage läuft bereits eine Überweisung. Die bestehenden Bankdaten bleiben einsehbar. Überweisen Sie nicht erneut, wenn Sie bereits bezahlt haben.'}
};
let booking=null,credentials=null,lookupVersion=0,checkoutVersion=0,busy=false,hostNumbers=null,pageActive=true;
let hostTimes=window.FrankiHolzGuest.defaultStayTimes();
window.FrankiHolzGuest.loadStayTimes(client).then(times=>{hostTimes=times;if(pageActive&&booking)paintSummary();});
window.loadFrankiHolzContactNumbers(client).then(numbers=>{hostNumbers=numbers;if(pageActive&&booking)paintSummary();});
const text=key=>copy[language][key];
const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stayDate=value=>{const date=new Date(value+'T12:00:00Z');return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(language==='de'?'de-DE':'en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Berlin'}).format(date)};
function paintSummary(){
 const de=language==='de',nights=Math.round((Date.parse(booking.check_out)-Date.parse(booking.check_in))/86400000);
 el('paymentSummary').setAttribute('aria-label',de?'Buchungsübersicht':'Booking summary');
 el('paymentLookupPanel').querySelector('summary').textContent=de?'Andere Buchung aufrufen':'Look up another booking';
 const status=({pending:de?'Wartet auf Bestätigung':'Awaiting host approval',confirmed:de?'Aufenthalt bestätigt':'Stay confirmed',cancelled:de?'Anfrage geschlossen':'Request closed'})[booking.booking_status]||booking.booking_status;
 const total=new Intl.NumberFormat(de?'de-DE':'en-DE',{style:'currency',currency:'EUR'}).format(Number(booking.total_price));
 el('paymentSummary').innerHTML=`<div class="stay-summary-heading"><div><span class="eyebrow">${de?'IHR AUFENTHALT':'YOUR STAY'}</span><h2>${safe(booking.room_name)}</h2></div><span class="status">${safe(status)}</span></div><dl class="stay-facts"><div><dt>Check-in</dt><dd>${safe(stayDate(booking.check_in))}<small>${safe(de?'ab '+hostTimes[language].checkIn+' Uhr':'from '+hostTimes[language].checkIn)}</small></dd></div><div><dt>Check-out</dt><dd>${safe(stayDate(booking.check_out))}<small>${safe(de?'bis '+hostTimes[language].checkOut+' Uhr':'by '+hostTimes[language].checkOut)}</small></dd></div></dl><div class="stay-total"><span>${de?'Gesamtpreis':'Stay total'}${Number.isFinite(nights)&&nights>0?' · '+nights+' '+(de?(nights===1?'Nacht':'Nächte'):(nights===1?'night':'nights')):''}</span><strong>${safe(total)}</strong></div><p class="stay-reference">${de?'Buchungsreferenz':'Booking reference'} <b>${safe(booking.reference)}</b></p>`;
 const confirmed=booking.booking_status==='confirmed';
 el('guestSupportTitle').textContent=confirmed?(de?'Wir freuen uns auf Sie!':'We look forward to welcoming you!'):(de?'Wir helfen Ihnen gerne':'Your hosts are here to help');
 el('guestSupportText').textContent=confirmed?(de?'Wann kommen Sie voraussichtlich an? Antworten Sie auf Ihre Bestätigungs-E-Mail oder schreiben Sie uns über WhatsApp, damit wir Ihre Ankunft abstimmen können.':'What time do you expect to arrive? Reply to your confirmation email or message us on WhatsApp so we can arrange a smooth welcome.'):(de?'Fragen zu Ihrer Anfrage oder Ihrem Aufenthalt? Schreiben Sie uns gerne. Wir helfen Ihnen dabei, sich bei FrankiHolz wohlzufühlen.':'Have a question about your request or stay? Please get in touch. We are happy to help you feel at home at FrankiHolz.');
 el('guestWhatsappText').textContent=de?'Über WhatsApp schreiben':'Chat with your hosts';
 el('guestRulesText').textContent=de?'Hausregeln ansehen (PDF · EN/DE)':'Read our house guide (PDF · EN/DE)';
 const hostNumber=hostNumbers?.[language];
 el('guestWhatsapp').hidden=!hostNumber;
 if(hostNumber)el('guestWhatsapp').href='https://wa.me/'+hostNumber+'?text='+encodeURIComponent((de?'Hallo FrankiHolz, meine Buchungsreferenz ist ':'Hello FrankiHolz, my booking reference is ')+booking.reference+'. '+(confirmed?(de?'Meine voraussichtliche Ankunftszeit ist …':'My estimated arrival time is …'):''));
}
function message(value){el('paymentMessage').textContent=value;el('paymentMessage').hidden=!value;}
function translate(){document.documentElement.lang=language;document.querySelectorAll('[data-copy]').forEach(node=>{node.textContent=text(node.dataset.copy)});document.querySelectorAll('.lang-btn').forEach(node=>node.classList.toggle('active',node.dataset.lang===language));el('backLink').href='/?lang='+language;el('statusLink').href='/booking-status.html?lang='+language+'&reference='+encodeURIComponent(booking?.reference||el('reference').value);if(booking)paint();}
function setBusy(value){busy=value;['reference','email','lookupButton','savedPayment','bankPayment'].forEach(id=>{el(id).disabled=value});}
function paint(){
 el('statusLink').href='/booking-status.html?lang='+language+'&reference='+encodeURIComponent(booking.reference);
 paintSummary();
 const closed=booking.booking_status==='cancelled',free=booking.payment_status==='not_required';
 document.querySelector('[data-copy=title]').textContent=free?(language==='de'?'Keine Zahlung erforderlich':'No payment required'):text('title');
 document.querySelector('[data-copy=lead]').textContent=free&&closed?(language==='de'?'Ihre Anfrage ist geschlossen. Es ist keine Zahlung erforderlich.':'Your request is closed. No payment is required.'):free&&booking.booking_status==='confirmed'?(language==='de'?'Ihr kostenloser Aufenthalt ist bestätigt.':'Your complimentary stay is confirmed.'):free?(language==='de'?'Ihr 100%-Gutschein deckt den gesamten Aufenthalt ab. Die Buchung erfordert weiterhin die Bestätigung des Gastgebers.':'Your 100% promo covers the full stay. Your booking still requires host approval.'):text('lead');
 const payable=booking.booking_status==='pending'&&['not_started','awaiting_payment','expired','failed'].includes(booking.payment_status);
 if(!free&&!payable){
  document.querySelector('[data-copy=title]').textContent=closed?(language==='de'?'Ihre Anfrage ist geschlossen':'Your request is closed'):booking.booking_status==='confirmed'?(language==='de'?'Ihr Aufenthalt ist bestätigt':'Your stay is confirmed'):(language==='de'?'Ihre Anfrage ist bei uns angekommen':'Your request is with us');
  document.querySelector('[data-copy=lead]').textContent=closed?(language==='de'?'Wenn wir bei Fragen oder einer neuen Reiseplanung helfen können, schreiben Sie uns gerne.':'If we can help with a question or another travel date, please get in touch.'):booking.booking_status==='confirmed'?(language==='de'?'Wir freuen uns darauf, Sie bei FrankiHolz willkommen zu heißen. Hier finden Sie die Details zu Ihrem Aufenthalt und Ihrer Zahlung.':'We look forward to welcoming you to FrankiHolz. Your stay and payment details are below.'):(language==='de'?'Vielen Dank für Ihr Vertrauen. Ihr Gastgeber prüft Ihre Anfrage. Sie erhalten eine E-Mail, sobald Ihr Aufenthalt bestätigt ist.':'Thank you for your trust. Your host is reviewing your request. We will email you as soon as your stay is confirmed.');
 }
 const bank=booking.payment_collection_mode==='bank_transfer';
 el('paymentChoices').hidden=!payable;el('savedPayment').closest('.payment-option').hidden=bank;el('existingTransfer').hidden=!bank;
 el('paymentState').textContent=closed?text('closed'):free?(language==='de'?'Keine Zahlungsdaten oder Belastung erforderlich. Prüfen Sie den Buchungsstatus.':'No payment details or charge required. Check your booking status.'):!payable?text('ready'):'';
 el('modeNotice').hidden=booking.payment_mode!=='test';el('modeNotice').textContent=booking.payment_mode==='test'?text('test'):'';
}
const inputIdentity=()=>({reference:el('reference').value.trim(),email:el('email').value.trim()});
const sameInput=identity=>identity.reference===el('reference').value.trim()&&identity.email===el('email').value.trim();
async function lookup(event){
 event?.preventDefault();if(busy||!pageActive)return;
 const version=++lookupVersion,identity=inputIdentity();booking=null;credentials=null;el('paymentContent').hidden=true;
 if(!identity.reference||!identity.email){message('');return;}
 el('lookupButton').disabled=true;message(text('loading'));
 try{
  const {data,error}=await client.rpc('frankiholz_payment_details',{p_reference:identity.reference,p_email:identity.email});
  if(!pageActive||version!==lookupVersion||!sameInput(identity))return;
  if(error||!data?.reference)throw Error(error?.message||text('missing'));
  booking=data;credentials={reference:data.reference,email:identity.email};window.FrankiHolzGuest.rememberCredentials(credentials);
  paint();el('paymentLookupPanel').open=false;el('paymentContent').hidden=false;message('');
 }catch(error){if(pageActive&&version===lookupVersion&&sameInput(identity))message(error.message||text('error'));}
 finally{if(pageActive&&version===lookupVersion&&!busy)el('lookupButton').disabled=false;}
}
async function openPayment(collection){
 const payable=booking?.booking_status==='pending'&&['not_started','awaiting_payment','expired','failed'].includes(booking.payment_status);
 if(busy||!pageActive||!payable||!credentials||collection==='bank_transfer'&&booking.payment_collection_mode!=='bank_transfer')return;
 const selected=booking,access={...credentials},identity=inputIdentity(),lookup=lookupVersion,attempt=++checkoutVersion;
 const current=()=>pageActive&&attempt===checkoutVersion&&lookup===lookupVersion&&booking===selected&&sameInput(identity);
 setBusy(true);message(text('opening'));
 try{
  const {data:mode,error}=await client.rpc('frankiholz_get_payment_environment');
  if(!current())return;
  if(error||!['live','test'].includes(mode)||selected.payment_mode&&selected.payment_mode!==mode)throw Error(text('changed'));
  const endpoint=mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test';
  const result=await fetch(config.supabaseUrl+'/functions/v1/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.supabaseKey},body:JSON.stringify({...access,payment_collection_mode:collection})});
  const json=await result.json().catch(()=>({}));if(!current())return;
  if(!result.ok||!json.checkout_url)throw Error(json.error||text('error'));
  let target;try{target=window.FrankiHolzGuest.verifiedCheckoutUrl(json.checkout_url)}catch(error){throw Error(text('error'))}
  if(!current())return;
  window.FrankiHolzGuest.rememberCheckout(access,target);
  location.assign(target);
 }catch(error){if(current()){message(error.message||text('error'));setBusy(false);}}
}
function invalidateLookup(){
 lookupVersion++;checkoutVersion++;booking=null;credentials=null;setBusy(false);el('paymentContent').hidden=true;el('paymentLookupPanel').open=true;message('');
}
el('paymentLookup').addEventListener('submit',lookup);
el('paymentLookup').addEventListener('input',invalidateLookup);
el('savedPayment').onclick=()=>openPayment('saved_method');el('bankPayment').onclick=()=>openPayment('bank_transfer');
document.querySelectorAll('.lang-btn').forEach(node=>node.onclick=()=>{language=node.dataset.lang;try{localStorage.setItem('frankiholz-lang',language)}catch(storageError){}translate();});
const restored=window.FrankiHolzGuest.restoreCredentials();el('reference').value=restored.reference;el('email').value=restored.email;
translate();lookup();
window.addEventListener('pagehide',()=>{pageActive=false;lookupVersion++;checkoutVersion++;});
window.addEventListener('pageshow',event=>{pageActive=true;if(event.persisted){setBusy(false);lookup();}});
