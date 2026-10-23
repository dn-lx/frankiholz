'use strict';
const returnConfig=window.FRANKIHOLZ_CONFIG,returnClient=window.supabase?.createClient?.(returnConfig.supabaseUrl,returnConfig.supabaseKey)||null,returnGuest=window.FrankiHolzGuest;
const returnEl=id=>document.getElementById(id);
let returnStoredLanguage='';try{returnStoredLanguage=localStorage.getItem('frankiholz-lang')||''}catch(storageError){}
let returnLanguage=new URLSearchParams(location.search).get('lang')||returnStoredLanguage||'en';if(!['en','de'].includes(returnLanguage))returnLanguage='en';
let returnVersion=0,returnActive=true,returnBooking=null,returnLoading=false;
const returnCopy={
 en:{checking:'Checking your booking',title:'Check your booking status',lead:'Returning from Stripe does not confirm a saved payment method, payment collection or host approval. We check your latest booking status below.',missing:'Enter your booking reference and the same email address used for your request. If this tab could not retain your details, use the reference from your email.',loading:'Checking the latest booking status…',error:'We could not verify your booking status. Check the reference and email, then try again.',details:'Booking details',reference:'Booking reference',email:'Booking email',check:'Check latest status',refresh:'Refresh status',status:'Check booking status',home:'← Back to FrankiHolz',test:'Stripe TEST — this booking is in the test environment; no real payment.',book:'Booking',pay:'Payment',awaiting:'Waiting for Stripe confirmation',awaitingTitle:'We are still waiting for the latest update',awaitingLead:'Your payment setup has not yet been confirmed by our backend. A Stripe update can take a little time. Refresh the status; do not submit a second booking or repeat a transfer.',saved:'Payment method saved securely',savedTitle:'Your booking request is ready for review',savedLead:'Your payment method is saved securely with Stripe. No payment has been collected yet. Your host must confirm the stay; payment is initiated 14 days before check-in, or after confirmation for arrivals within 14 days.',scheduled:'Payment scheduled',scheduledLead:'Your payment is scheduled under the 14-day policy. A scheduled charge is not a receipt of money.',processing:'Payment processing',processingLead:'Your payment is still processing. Bank debits can take several business days. This is not yet a settled payment; refresh your status for updates.',paid:'Payment received',paidLead:'Our backend reports that payment has been received. Host approval is a separate booking state, shown below.',free:'No payment required',freeLead:'Your 100% promo covers the full stay. The booking still requires host approval.',closed:'Your request is closed',closedLead:'This request is closed. The current payment status is shown below. Check the booking status for any refund details.',confirmed:'Your stay is confirmed',pending:'Awaiting host approval',cancelled:'Request closed',failed:'Payment failed',released:'Payment released',refunded:'Refunded',expired:'Expired',authorized:'Card authorized',due:'Scheduled charge',other:'Your current booking status is shown below. Refresh it for the latest update.'},
 de:{checking:'Buchung wird geprüft',title:'Buchungsstatus prüfen',lead:'Die Rückkehr von Stripe bestätigt weder gespeicherte Zahlungsdaten noch einen Zahlungseingang oder die Genehmigung durch den Gastgeber. Wir prüfen unten den aktuellen Buchungsstatus.',missing:'Geben Sie Ihre Buchungsreferenz und dieselbe E-Mail-Adresse wie bei Ihrer Anfrage ein. Falls dieser Tab Ihre Daten nicht speichern konnte, nutzen Sie die Referenz aus Ihrer E-Mail.',loading:'Aktueller Buchungsstatus wird geprüft …',error:'Der Buchungsstatus konnte nicht bestätigt werden. Prüfen Sie Referenz und E-Mail und versuchen Sie es erneut.',details:'Buchungsdaten',reference:'Buchungsreferenz',email:'E-Mail der Buchung',check:'Aktuellen Status prüfen',refresh:'Status aktualisieren',status:'Buchungsstatus prüfen',home:'← Zurück zu FrankiHolz',test:'Stripe TEST — diese Buchung ist in der Testumgebung; keine echte Zahlung.',book:'Buchung',pay:'Zahlung',awaiting:'Stripe-Bestätigung ausstehend',awaitingTitle:'Wir warten noch auf die aktuelle Bestätigung',awaitingLead:'Die Einrichtung Ihrer Zahlungsmethode wurde noch nicht durch unser Backend bestätigt. Ein Stripe-Update kann etwas dauern. Aktualisieren Sie den Status; stellen Sie keine zweite Anfrage und wiederholen Sie keine Überweisung.',saved:'Zahlungsmethode sicher gespeichert',savedTitle:'Ihre Buchungsanfrage ist zur Prüfung bereit',savedLead:'Ihre Zahlungsmethode ist sicher bei Stripe gespeichert. Es wurde noch keine Zahlung eingezogen. Ihr Gastgeber muss den Aufenthalt bestätigen; die Belastung erfolgt 14 Tage vor Check-in oder nach Bestätigung bei kurzfristiger Anreise.',scheduled:'Zahlung geplant',scheduledLead:'Ihre Zahlung ist gemäß der 14-Tage-Regel geplant. Eine geplante Belastung ist noch kein Zahlungseingang.',processing:'Zahlung wird verarbeitet',processingLead:'Ihre Zahlung wird noch verarbeitet. Banklastschriften können mehrere Werktage dauern. Es liegt noch kein bestätigter Zahlungseingang vor; aktualisieren Sie den Status für Neuigkeiten.',paid:'Zahlung eingegangen',paidLead:'Unser Backend meldet einen Zahlungseingang. Die Genehmigung durch den Gastgeber ist ein gesonderter Buchungsstatus, der unten angezeigt wird.',free:'Keine Zahlung erforderlich',freeLead:'Ihr 100%-Gutschein deckt den gesamten Aufenthalt ab. Die Buchung erfordert weiterhin die Genehmigung durch den Gastgeber.',closed:'Ihre Anfrage ist geschlossen',closedLead:'Diese Anfrage ist geschlossen. Der aktuelle Zahlungsstatus steht unten. Weitere Angaben zu einer Erstattung finden Sie im Buchungsstatus.',confirmed:'Ihr Aufenthalt ist bestätigt',pending:'Wartet auf Bestätigung',cancelled:'Anfrage geschlossen',failed:'Zahlung fehlgeschlagen',released:'Zahlung freigegeben',refunded:'Erstattet',expired:'Abgelaufen',authorized:'Karte autorisiert',due:'Geplante Belastung',other:'Der aktuelle Buchungsstatus steht unten. Aktualisieren Sie ihn für die neuesten Informationen.'}
};
const returnEsc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const returnText=key=>returnCopy[returnLanguage][key];
const returnIdentity=()=>({reference:returnEl('returnReference').value.trim(),email:returnEl('returnEmail').value.trim()});
const returnSameInput=identity=>identity.reference===returnEl('returnReference').value.trim()&&identity.email===returnEl('returnEmail').value.trim();
function returnMessage(value){returnEl('returnMessage').textContent=value;returnEl('returnMessage').hidden=!value;}
function returnLinks(){
 const reference=returnBooking?.reference||returnEl('returnReference').value.trim();
 returnEl('statusLink').href='/booking-status.html?'+new URLSearchParams({... (reference?{reference}:{}),lang:returnLanguage});
 returnEl('homeLink').href='/?lang='+returnLanguage;
}
function paintReturn(){
 const copy=returnCopy[returnLanguage],b=returnBooking;
 document.documentElement.lang=returnLanguage;try{localStorage.setItem('frankiholz-lang',returnLanguage)}catch(storageError){}
 returnEl('lookupSummary').textContent=copy.details;returnEl('referenceLabel').textContent=copy.reference;returnEl('emailLabel').textContent=copy.email;returnEl('checkReturn').textContent=copy.check;returnEl('refreshReturn').textContent=copy.refresh;returnEl('statusLink').textContent=copy.status;returnEl('homeLink').textContent=copy.home;
 document.querySelectorAll('.lang-btn').forEach(button=>{button.classList.toggle('active',button.dataset.lang===returnLanguage);button.setAttribute('aria-pressed',String(button.dataset.lang===returnLanguage))});
 let kicker=copy.checking,title=copy.title,lead=copy.lead;
 if(b){
  const labels={not_started:copy.awaiting,awaiting_payment:copy.awaiting,payment_method_saved:copy.saved,scheduled_charge:copy.scheduled,processing:copy.processing,paid:copy.paid,not_required:copy.free,failed:copy.failed,released:copy.released,refunded:copy.refunded,expired:copy.expired,authorized:copy.authorized};
  kicker=labels[b.payment_status]||copy.checking;
  if(b.booking_status==='cancelled'){title=copy.closed;lead=copy.closedLead;}
  else if(['not_started','awaiting_payment'].includes(b.payment_status)){title=copy.awaitingTitle;lead=copy.awaitingLead;}
  else if(b.payment_status==='payment_method_saved'){title=b.booking_status==='confirmed'?copy.confirmed:copy.savedTitle;lead=b.booking_status==='confirmed'?(returnLanguage==='de'?'Ihre Zahlungsmethode ist sicher gespeichert. Ihr Aufenthalt ist bestätigt; es wurde noch keine Zahlung eingezogen. Die Belastung erfolgt gemäß der 14-Tage-Regel.':'Your payment method is saved securely. Your stay is confirmed; no payment has been collected yet. Payment follows the 14-day policy.'):copy.savedLead;}
  else if(b.payment_status==='scheduled_charge'){title=b.booking_status==='confirmed'?copy.confirmed:copy.scheduled;lead=copy.scheduledLead;}
  else if(b.payment_status==='processing'){title=copy.processing;lead=copy.processingLead;}
  else if(b.payment_status==='paid'){title=copy.paid;lead=copy.paidLead;}
  else if(b.payment_status==='not_required'){title=b.booking_status==='confirmed'?copy.confirmed:copy.free;lead=b.booking_status==='confirmed'?(returnLanguage==='de'?'Ihr kostenloser Aufenthalt ist bestätigt. Es sind keine Zahlungsdaten oder Belastung erforderlich.':'Your complimentary stay is confirmed. No payment details or charge are required.'):copy.freeLead;}
  else{title=labels[b.payment_status]||copy.title;lead=copy.other;}
  const bookingLabel=({pending:copy.pending,confirmed:copy.confirmed,cancelled:copy.cancelled})[b.booking_status]||b.booking_status;
  const due=b.charge_due_at?'<br>'+copy.due+': '+returnEsc(new Date(b.charge_due_at).toLocaleString(returnLanguage==='de'?'de-DE':'en-GB',{timeZone:'Europe/Berlin'})):'';
  returnEl('verifiedReturn').innerHTML='<div class="notice '+(b.payment_status==='paid'?'success':'')+'"><strong>'+returnEsc(b.reference)+'</strong> · '+returnEsc(b.room_name)+'<br>'+copy.book+': <strong>'+returnEsc(bookingLabel)+'</strong><br>'+copy.pay+': <strong>'+returnEsc(labels[b.payment_status]||String(b.payment_status||'').replaceAll('_',' '))+'</strong>'+due+'</div>';
 }else{returnEl('verifiedReturn').innerHTML='';}
 returnEl('kicker').textContent=kicker;returnEl('title').textContent=title;returnEl('lead').textContent=lead;document.title=title+' · FrankiHolz';
 returnEl('returnMode').hidden=b?.payment_mode!=='test';returnEl('returnMode').textContent=b?.payment_mode==='test'?copy.test:'';
 returnEl('refreshReturn').hidden=!b;returnEl('refreshReturn').disabled=returnLoading;returnEl('checkReturn').disabled=returnLoading;
 returnLinks();
}
function invalidateReturn(){returnVersion++;returnBooking=null;returnLoading=false;returnMessage('');paintReturn();}
async function verifyReturn(event){
 event?.preventDefault();if(!returnActive||returnLoading)return;
 const identity=returnIdentity(),version=++returnVersion;returnBooking=null;
 if(!identity.reference||!identity.email){returnLoading=false;paintReturn();returnEl('successLookupPanel').open=true;returnMessage(returnText('missing'));return;}
 returnLoading=true;paintReturn();returnMessage(returnText('loading'));
 try{
  if(!returnClient)throw new Error(returnText('error'));
  const {data,error}=await returnClient.rpc('frankiholz_booking_status_v3',{p_reference:identity.reference,p_email:identity.email});
  if(!returnActive||version!==returnVersion||!returnSameInput(identity))return;
  const booking=data?.[0];if(error||!booking?.reference)throw new Error(returnText('error'));
  returnBooking=booking;returnGuest.rememberCredentials({reference:booking.reference,email:identity.email});returnLoading=false;paintReturn();returnMessage('');returnEl('successLookupPanel').open=false;
 }catch(error){if(returnActive&&version===returnVersion&&returnSameInput(identity)){returnLoading=false;paintReturn();returnMessage(returnText('error'));returnEl('successLookupPanel').open=true;}}
}
document.querySelectorAll('.lang-btn').forEach(button=>button.onclick=()=>{returnLanguage=button.dataset.lang;const url=new URL(location.href);url.searchParams.set('lang',returnLanguage);history.replaceState({},'',url.pathname+url.search+url.hash);paintReturn();if(returnLoading)returnMessage(returnText('loading'));});
['returnReference','returnEmail'].forEach(id=>returnEl(id).addEventListener('input',invalidateReturn));
returnEl('successLookup').addEventListener('submit',verifyReturn);returnEl('refreshReturn').onclick=verifyReturn;
const returnRestored=returnGuest.restoreCredentials({checkoutFallback:true});returnEl('returnReference').value=returnRestored.reference;returnEl('returnEmail').value=returnRestored.email;
paintReturn();verifyReturn();
window.addEventListener('pagehide',()=>{returnActive=false;returnVersion++;});
window.addEventListener('pageshow',event=>{returnActive=true;if(event.persisted){returnLoading=false;verifyReturn();}});
