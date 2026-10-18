'use strict';
const config=window.FRANKIHOLZ_CONFIG,client=window.supabase.createClient(config.supabaseUrl,config.supabaseKey),el=id=>document.getElementById(id);
let language=new URLSearchParams(location.search).get('lang')||localStorage.getItem('frankiholz-lang')||'en';
if(!['en','de'].includes(language))language='en';
const copy={
 en:{lookupDetails:'Booking details',step:'Your booking request',title:'Choose how to pay',lead:'Secure payments through Stripe. Your stay is confirmed only after the host approves your request.',reference:'Booking reference',email:'Booking email',load:'Show payment options',savedTitle:'Card, wallets & bank debit',savedMethods:'Cards, Link, Apple Pay, Google Pay, SEPA Direct Debit and other eligible methods are offered on Stripe.',savedTiming:'Save your payment details now without a charge. If the host confirms, payment is initiated 14 days before check-in, or after confirmation for stays within 14 days. Bank debits can take several business days.',savedAction:'Choose a method on Stripe',bankTitle:'EUR / SEPA bank transfer',bankMethods:'Get Stripe’s bank details immediately and send a real EUR transfer from your bank, before host approval.',bankTiming:'Use the exact amount and reference shown. Receipt may take several business days. Dates are reserved only after host approval. Received funds are refunded if the request is rejected; partial, excess or late transfers may need manual reconciliation.',bankAction:'Get bank-transfer details',eligibility:'Stripe shows the methods eligible for your country, currency, device and this payment flow.',status:'Booking & payment status',back:'Back to FrankiHolz',loading:'Loading your booking…',opening:'Opening Stripe…',missing:'No matching booking found. Check your reference and email.',error:'Unable to open payment. Please try again or contact FrankiHolz.',changed:'The payment environment has changed. Contact FrankiHolz before continuing.',test:'Stripe TEST — no real payment. This booking remains in the test environment.',closed:'This request is closed. No new payment can be started.',ready:'Payment is already saved, scheduled, processing or completed. Check your booking status for details.',bankExisting:'Bank-transfer instructions have already been created for this request. Continue with the same details and reference.'},
 de:{lookupDetails:'Buchungsdaten',step:'Ihre Buchungsanfrage',title:'Wie möchten Sie bezahlen?',lead:'Sichere Zahlungen über Stripe. Ihr Aufenthalt ist erst bestätigt, wenn der Gastgeber Ihrer Anfrage zustimmt.',reference:'Buchungsreferenz',email:'E-Mail der Buchung',load:'Zahlungsoptionen anzeigen',savedTitle:'Karte, Wallets & Banklastschrift',savedMethods:'Karten, Link, Apple Pay, Google Pay, SEPA-Lastschrift und weitere geeignete Methoden werden bei Stripe angeboten.',savedTiming:'Speichern Sie Ihre Zahlungsdaten jetzt ohne Belastung. Bei Zustimmung wird die Zahlung 14 Tage vor Check-in ausgelöst, bei Aufenthalten innerhalb von 14 Tagen nach Bestätigung. Banklastschriften können mehrere Werktage dauern.',savedAction:'Methode bei Stripe wählen',bankTitle:'EUR- / SEPA-Überweisung',bankMethods:'Erhalten Sie sofort die Stripe-Bankdaten und senden Sie vor der Zustimmung des Gastgebers eine echte EUR-Überweisung von Ihrer Bank.',bankTiming:'Verwenden Sie den genauen Betrag und Verwendungszweck. Der Eingang kann mehrere Werktage dauern. Termine werden erst nach Zustimmung reserviert. Bei Ablehnung werden eingegangene Gelder erstattet; Teil-, Mehr- oder verspätete Zahlungen müssen gegebenenfalls manuell abgeglichen werden.',bankAction:'Überweisungsdaten erhalten',eligibility:'Stripe zeigt die für Ihr Land, Ihre Währung, Ihr Gerät und diesen Zahlungsablauf verfügbaren Methoden.',status:'Buchungs- & Zahlungsstatus',back:'Zurück zu FrankiHolz',loading:'Buchung wird geladen …',opening:'Stripe wird geöffnet …',missing:'Keine passende Buchung gefunden. Prüfen Sie Referenz und E-Mail.',error:'Zahlung konnte nicht geöffnet werden. Versuchen Sie es erneut oder kontaktieren Sie FrankiHolz.',changed:'Die Zahlungsumgebung wurde geändert. Kontaktieren Sie FrankiHolz, bevor Sie fortfahren.',test:'Stripe TEST — keine echte Zahlung. Diese Buchung bleibt in der Testumgebung.',closed:'Diese Anfrage ist geschlossen. Es kann keine neue Zahlung gestartet werden.',ready:'Die Zahlung ist bereits gespeichert, geplant, in Verarbeitung oder abgeschlossen. Details finden Sie im Buchungsstatus.',bankExisting:'Für diese Anfrage wurden bereits Überweisungsdaten erstellt. Verwenden Sie dieselben Bankdaten und denselben Verwendungszweck.'}
};
let booking=null,credentials=null,lookupVersion=0,busy=false;
const text=key=>copy[language][key];
function message(value){el('paymentMessage').textContent=value;el('paymentMessage').hidden=!value;}
function translate(){document.documentElement.lang=language;document.querySelectorAll('[data-copy]').forEach(node=>{node.textContent=text(node.dataset.copy)});document.querySelectorAll('.lang-btn').forEach(node=>node.classList.toggle('active',node.dataset.lang===language));el('backLink').href='/?lang='+language;el('statusLink').href='/booking-status.html?lang='+language+'&reference='+encodeURIComponent(booking?.reference||el('reference').value);if(booking)paint();}
function setBusy(value){busy=value;['reference','email','lookupButton','savedPayment','bankPayment'].forEach(id=>{el(id).disabled=value});}
function paint(){
 el('statusLink').href='/booking-status.html?lang='+language+'&reference='+encodeURIComponent(booking.reference);
 el('paymentSummary').textContent=booking.reference+' · '+booking.room_name+' · '+booking.check_in+' → '+booking.check_out+' · '+new Intl.NumberFormat(language==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR'}).format(Number(booking.total_price));
 const closed=booking.booking_status==='cancelled';
 const payable=booking.booking_status==='pending'&&['not_started','awaiting_payment','expired','failed'].includes(booking.payment_status);
 const bank=booking.payment_collection_mode==='bank_transfer';
 el('paymentChoices').hidden=!payable;el('savedPayment').hidden=bank;
 el('paymentState').textContent=closed?text('closed'):!payable?text('ready'):bank?text('bankExisting'):'';
 el('modeNotice').hidden=booking.payment_mode!=='test';el('modeNotice').textContent=booking.payment_mode==='test'?text('test'):'';
}
async function lookup(event){
 event?.preventDefault();if(busy)return;
 const version=++lookupVersion;booking=null;credentials=null;el('paymentContent').hidden=true;
 const reference=el('reference').value.trim(),email=el('email').value.trim();if(!reference||!email)return;
 el('lookupButton')?.setAttribute('disabled','');message(text('loading'));
 try{
  const {data,error}=await client.rpc('frankiholz_payment_details',{p_reference:reference,p_email:email});
  if(version!==lookupVersion)return;if(error||!data)throw Error(error?.message||text('missing'));
  booking=data;credentials={reference:data.reference,email};try{sessionStorage.setItem('frankiholz-payment-email:'+data.reference,email)}catch(storageError){}
  paint();el('paymentLookupPanel').open=false;el('paymentContent').hidden=false;message('');
 }catch(error){if(version===lookupVersion)message(error.message||text('error'));}
 finally{el('lookupButton')?.removeAttribute('disabled');}
}
async function openPayment(collection){
 if(busy||!booking||!credentials)return;setBusy(true);message(text('opening'));
 try{
  const {data:mode,error}=await client.rpc('frankiholz_get_payment_environment');
  if(error||!['live','test'].includes(mode)||booking.payment_mode&&booking.payment_mode!==mode)throw Error(text('changed'));
  const endpoint=mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test';
  const result=await fetch(config.supabaseUrl+'/functions/v1/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.supabaseKey},body:JSON.stringify({...credentials,payment_collection_mode:collection})});
  const json=await result.json().catch(()=>({}));if(!result.ok||!json.checkout_url)throw Error(json.error||text('error'));
  const target=new URL(json.checkout_url);if(target.protocol!=='https:'||!['checkout.stripe.com','payments.stripe.com'].includes(target.hostname))throw Error(text('error'));
  location.assign(target.href);
 }catch(error){message(error.message||text('error'));setBusy(false);}
}
el('paymentLookup').addEventListener('submit',lookup);
el('paymentLookup').addEventListener('input',()=>{lookupVersion++;booking=null;credentials=null;el('paymentContent').hidden=true;message('');});
el('savedPayment').onclick=()=>openPayment('saved_method');el('bankPayment').onclick=()=>openPayment('bank_transfer');
document.querySelectorAll('.lang-btn').forEach(node=>node.onclick=()=>{language=node.dataset.lang;translate();});
el('reference').value=new URLSearchParams(location.search).get('reference')||'';
try{el('email').value=sessionStorage.getItem('frankiholz-payment-email:'+el('reference').value)||''}catch(storageError){}
translate();lookup();

window.addEventListener('pageshow',event=>{if(event.persisted){setBusy(false);lookup();}});
