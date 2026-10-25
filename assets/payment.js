'use strict';
const config=window.FRANKIHOLZ_CONFIG,client=window.supabase.createClient(config.supabaseUrl,config.supabaseKey),el=id=>document.getElementById(id);
let storedLanguage='';try{storedLanguage=localStorage.getItem('frankiholz-lang')||''}catch(storageError){}
let language=new URLSearchParams(location.search).get('lang')||storedLanguage||'en';
if(!['en','de'].includes(language))language='en';
const copy={
 en:{lookupDetails:'Booking details',step:'Your booking request',title:'Choose how to pay',lead:'Choose direct bank transfer or secure Stripe Checkout. Your host confirms the stay separately.',reference:'Booking reference',email:'Booking email',load:'Show payment options',savedTitle:'Card, wallets & bank debit',savedMethods:'Cards, Apple Pay, Google Pay, SEPA Direct Debit and other eligible methods are offered on Stripe.',savedTiming:'Save your payment details now without a charge. If the host confirms, payment is initiated 14 days before check-in, or after confirmation for stays within 14 days. Bank debits can take several business days.',savedAction:'Choose a method on Stripe',bankAction:'View existing transfer instructions',eligibility:'Stripe shows the methods eligible for your country, currency, device and this payment flow.',status:'Booking & payment status',back:'Back to FrankiHolz',loading:'Loading your booking…',opening:'Opening Stripe…',missing:'No matching booking found. Check your reference and email.',error:'Unable to open payment. Please try again or contact FrankiHolz.',changed:'The payment environment has changed. Contact FrankiHolz before continuing.',test:'Stripe TEST — no real payment. This booking remains in the test environment.',closed:'This request is closed. No new payment can be started.',ready:'Payment is already saved, scheduled, processing or completed. Check your booking status for details.',bankExisting:'Bank transfers are no longer offered for new requests. This request already has a transfer in progress. View its existing instructions; do not send the payment again if you have already transferred it.'},
 de:{lookupDetails:'Buchungsdaten',step:'Ihre Buchungsanfrage',title:'Wie möchten Sie bezahlen?',lead:'Wählen Sie eine direkte Banküberweisung oder die sichere Stripe-Zahlung. Der Gastgeber bestätigt den Aufenthalt separat.',reference:'Buchungsreferenz',email:'E-Mail der Buchung',load:'Zahlungsoptionen anzeigen',savedTitle:'Karte, Wallets & Banklastschrift',savedMethods:'Karten, Apple Pay, Google Pay, SEPA-Lastschrift und weitere geeignete Methoden werden bei Stripe angeboten.',savedTiming:'Speichern Sie Ihre Zahlungsdaten jetzt ohne Belastung. Bei Zustimmung wird die Zahlung 14 Tage vor Check-in ausgelöst, bei Aufenthalten innerhalb von 14 Tagen nach Bestätigung. Banklastschriften können mehrere Werktage dauern.',savedAction:'Methode bei Stripe wählen',bankAction:'Bestehende Überweisungsdaten ansehen',eligibility:'Stripe zeigt die für Ihr Land, Ihre Währung, Ihr Gerät und diesen Zahlungsablauf verfügbaren Methoden.',status:'Buchungs- & Zahlungsstatus',back:'Zurück zu FrankiHolz',loading:'Buchung wird geladen …',opening:'Stripe wird geöffnet …',missing:'Keine passende Buchung gefunden. Prüfen Sie Referenz und E-Mail.',error:'Zahlung konnte nicht geöffnet werden. Versuchen Sie es erneut oder kontaktieren Sie FrankiHolz.',changed:'Die Zahlungsumgebung wurde geändert. Kontaktieren Sie FrankiHolz, bevor Sie fortfahren.',test:'Stripe TEST — keine echte Zahlung. Diese Buchung bleibt in der Testumgebung.',closed:'Diese Anfrage ist geschlossen. Es kann keine neue Zahlung gestartet werden.',ready:'Die Zahlung ist bereits gespeichert, geplant, in Verarbeitung oder abgeschlossen. Details finden Sie im Buchungsstatus.',bankExisting:'Überweisungen werden für neue Anfragen nicht mehr angeboten. Für diese Anfrage läuft bereits eine Überweisung. Die bestehenden Bankdaten bleiben einsehbar. Überweisen Sie nicht erneut, wenn Sie bereits bezahlt haben.'}
};
Object.assign(copy.en,{
 manualPreferred:'Preferred · 3% bank-transfer discount',manualTitle:'Direct bank transfer',
 manualDescription:'Transfer to our separate business bank account and send Inura your transfer receipt by email. We confirm your stay only after funds arrive and the room is still available.',
 manualChoose:'Choose direct bank transfer',manualInstructionsTitle:'Your bank transfer details',
 manualInstructionsText:'Include the booking reference in the transfer. Email the receipt to Inura at info@frankiflow.de as an attachment. Sending the receipt does not reserve the room or confirm payment.',
 manualSendProof:'Email transfer receipt to Inura',manualPending:'We will verify the actual credited amount and availability before confirming your booking.',
 manualTotal:'Bank transfer price',manualDiscount:'Bank-transfer discount',
 manualAccount:'Account holder',manualBank:'Bank',manualIban:'IBAN',manualBic:'BIC',manualAmount:'Amount',manualRef:'Payment reference',
 manualEmailSubject:'FrankiHolz bank transfer confirmation'
});
Object.assign(copy.de,{
 manualPreferred:'Empfohlen · 3 % Rabatt bei Überweisung',manualTitle:'Direkte Banküberweisung',
 manualDescription:'Überweisen Sie auf unser separates Geschäftskonto und senden Sie Inura den Überweisungsbeleg per E-Mail. Wir bestätigen den Aufenthalt erst nach Geldeingang und erneuter Verfügbarkeitsprüfung.',
 manualChoose:'Banküberweisung auswählen',manualInstructionsTitle:'Ihre Überweisungsdaten',
 manualInstructionsText:'Bitte die Buchungsreferenz als Verwendungszweck angeben und den Beleg per E-Mail an Inura (info@frankiflow.de) senden. Ein Beleg ist noch keine Zahlungs- oder Buchungsbestätigung.',
 manualSendProof:'Überweisungsbeleg an Inura senden',manualPending:'Wir prüfen den tatsächlichen Geldeingang und die Verfügbarkeit, bevor wir Ihre Buchung bestätigen.',
 manualTotal:'Überweisungspreis',manualDiscount:'Überweisungsrabatt',
 manualAccount:'Kontoinhaber',manualBank:'Bank',manualIban:'IBAN',manualBic:'BIC',manualAmount:'Betrag',manualRef:'Verwendungszweck',
 manualEmailSubject:'FrankiHolz Überweisungsbestätigung'
});
let manualBankOffer=null,manualBankDetails=null;
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
function setBusy(value){busy=value;['reference','email','lookupButton','savedPayment','bankPayment','selectManualBank'].forEach(id=>{el(id).disabled=value});}
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
 const manual=booking.payment_collection_mode==='manual_bank';
 const available=Boolean(manualBankOffer?.available)&&!manual&&!bank&&payable&&booking.payment_status==='not_started';
 const discount=Number(manualBankOffer?.discount_percent||0);
 const estimatedManual=Math.round((Number(booking.total_price)*(100-discount)/100+Number.EPSILON)*100)/100;
 const badge=el('manualBankChoice').querySelector('[data-copy="manualPreferred"]');
 if(badge)badge.textContent=discount>0?text('manualPreferred'):(language==='de'?'Empfohlen · Ohne Aufpreis':'Preferred · No additional fee');
 const formatted=new Intl.NumberFormat(language==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR'});
 el('manualBankPrice').textContent=available?text('manualTotal')+': '+formatted.format(estimatedManual):'';
 el('manualBankChoice').hidden=!available;
 el('manualBankInstructions').hidden=!manual||!manualBankDetails;
 if(manualBankDetails)renderManualBankDetails();
 el('paymentChoices').hidden=!payable&&!manual;
 el('savedPayment').closest('.payment-option').hidden=bank||manual;
 el('existingTransfer').hidden=!bank;
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
  manualBankOffer=null;manualBankDetails=null;
  const offer=await client.rpc('frankiholz_manual_bank_offer');
  if(!pageActive||version!==lookupVersion||!sameInput(identity))return;
  if(!offer.error)manualBankOffer=offer.data;
  if(booking.payment_collection_mode==='manual_bank'){
    const info=await client.rpc('frankiholz_get_manual_bank_instructions',{p_reference:booking.reference,p_email:identity.email});
    if(!pageActive||version!==lookupVersion||!sameInput(identity))return;
    if(!info.error)manualBankDetails=info.data;else message(info.error.message||text('error'));
  }
  paint();el('paymentLookupPanel').open=false;el('paymentContent').hidden=false;message('');
 }catch(error){if(pageActive&&version===lookupVersion&&sameInput(identity))message(error.message||text('error'));}
 finally{if(pageActive&&version===lookupVersion&&!busy)el('lookupButton').disabled=false;}
}
async function openPayment(collection){
 const payable=booking?.booking_status==='pending'&&['not_started','awaiting_payment','expired','failed'].includes(booking.payment_status);
 if(busy||!pageActive||!payable||!credentials||booking.payment_collection_mode==='manual_bank'||collection==='bank_transfer'&&booking.payment_collection_mode!=='bank_transfer')return;
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
 lookupVersion++;checkoutVersion++;booking=null;credentials=null;manualBankOffer=null;manualBankDetails=null;setBusy(false);el('paymentContent').hidden=true;el('paymentLookupPanel').open=true;message('');
}
el('paymentLookup').addEventListener('submit',lookup);
el('paymentLookup').addEventListener('input',invalidateLookup);
function renderManualBankDetails(){
 if(!manualBankDetails)return;
 const d=manualBankDetails,fields=[
  ['manualAccount',d.account_holder],['manualBank',d.bank_name],
  ['manualIban',d.iban],['manualBic',d.bic],
  ['manualAmount',new Intl.NumberFormat(language==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR'}).format(Number(d.amount))],
  ['manualRef',d.payment_reference]
 ];
 el('manualBankFields').innerHTML=fields.map(([key,value])=>'<dt>'+safe(text(key))+'</dt><dd>'+safe(value||'—')+'</dd>').join('');
 const email=String(d.proof_email||'info@frankiflow.de');
 if(email!=='info@frankiflow.de')throw new Error('Unexpected transfer contact');
 el('manualBankEmail').href='mailto:'+email+'?subject='+encodeURIComponent(text('manualEmailSubject')+' '+d.reference)
    +'&body='+encodeURIComponent((language==='de'?'Buchungsreferenz: ':'Booking reference: ')+d.reference+'\n'+
        (language==='de'?'Überweisungsbetrag: ':'Transfer amount: ')+d.amount+' EUR\n'+
        (language==='de'?'Ich füge meinen Überweisungsbeleg dieser E-Mail bei.':'I have attached my transfer receipt to this email.'));
}
async function selectManualBank(){
 if(busy||!pageActive||!booking||!credentials||!manualBankOffer?.available)return;
 const identity={...credentials},version=lookupVersion;
 setBusy(true);message(language==='de'?'Überweisung wird vorbereitet …':'Preparing bank transfer…');
 try{
  const result=await client.rpc('frankiholz_start_manual_bank_transfer',{p_reference:identity.reference,p_email:identity.email});
  if(!pageActive||lookupVersion!==version)return;
  if(result.error||!result.data)throw Error(result.error?.message||text('error'));
  manualBankDetails=result.data;
  booking={...booking,payment_collection_mode:'manual_bank',payment_status:'awaiting_payment',total_price:result.data.amount,
    manual_bank_discount_percent:result.data.discount_percent};
  paint();message('');el('paymentContent').hidden=false;
 }catch(error){if(pageActive&&version===lookupVersion)message(error.message||text('error'));}
 finally{if(pageActive&&version===lookupVersion)setBusy(false);}
}
el('selectManualBank').onclick=selectManualBank;
el('savedPayment').onclick=()=>openPayment('saved_method');el('bankPayment').onclick=()=>openPayment('bank_transfer');
document.querySelectorAll('.lang-btn').forEach(node=>node.onclick=()=>{language=node.dataset.lang;try{localStorage.setItem('frankiholz-lang',language)}catch(storageError){}translate();});
const restored=window.FrankiHolzGuest.restoreCredentials();el('reference').value=restored.reference;el('email').value=restored.email;
translate();lookup();
window.addEventListener('pagehide',()=>{pageActive=false;lookupVersion++;checkoutVersion++;});
window.addEventListener('pageshow',event=>{pageActive=true;if(event.persisted){setBusy(false);lookup();}});
