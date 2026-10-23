'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CreditCard, ShieldCheck } from 'lucide-react';
import { client, formatEuro } from '@/lib/config';
import { bookingState, guestHref, guestPost, paymentState, rememberGuest, savedCredentials, stayDate, stripeCheckoutUrl, useGuestLanguage, useHostNumber, verifyPaymentMode, type GuestBooking, type GuestCredentials } from '@/lib/guest-booking';
import type { Lang } from '@/lib/types';
import './guest-booking.css';

export function GuestLanguage({lang,onChange}:{lang:Lang;onChange:(lang:Lang)=>void}){
  return <div className="guest-language" aria-label={lang==='de'?'Sprache wählen':'Choose language'}>{(['en','de'] as const).map(language=><button key={language} type="button" aria-pressed={lang===language} onClick={()=>onChange(language)}>{language.toUpperCase()}</button>)}</div>;
}
export function GuestLegal({lang}:{lang:Lang}){
  return <nav className="guest-legal" aria-label={lang==='de'?'Rechtliche Informationen':'Legal information'}><Link href={'/impressum?lang='+lang}>{lang==='de'?'Impressum':'Legal notice'}</Link><Link href={'/datenschutz?lang='+lang}>{lang==='de'?'Datenschutz':'Privacy notice'}</Link></nav>;
}
export function GuestSupport({booking,lang}:{booking:GuestBooking;lang:Lang}){
  const de=lang==='de',number=useHostNumber(lang),confirmed=booking.booking_status==='confirmed',closed=booking.booking_status==='cancelled';
  const greeting=(de?'Hallo FrankiHolz, meine Buchungsreferenz ist ':'Hello FrankiHolz, my booking reference is ')+booking.reference+'. '+(confirmed?(de?'Meine voraussichtliche Ankunftszeit ist …':'My estimated arrival time is …'):'');
  return <aside className="guest-support"><h2>{confirmed?(de?'Wir freuen uns auf Sie!':'We look forward to welcoming you!'):closed?(de?'Wir sind weiterhin für Sie da':'We are still here to help'):(de?'Ihre Gastgeber helfen Ihnen gerne':'Your hosts are here to help')}</h2><p>{confirmed?(de?'Wann kommen Sie voraussichtlich an? Antworten Sie auf Ihre Bestätigungs-E-Mail oder schreiben Sie uns über WhatsApp, damit wir Ihre Ankunft ab 17:00 Uhr abstimmen können.':'What time do you expect to arrive? Reply to your confirmation email or message us on WhatsApp so we can arrange your welcome from 17:00.'):closed?(de?'Haben Sie Fragen oder planen Sie eine andere Reise? Schreiben Sie uns gerne.':'Have a question or planning another trip? Please get in touch.'):(de?'Ihr Gastgeber prüft Ihre Anfrage. Sie erhalten eine E-Mail, sobald Ihr Aufenthalt bestätigt ist. Bei Fragen helfen wir gerne.':'Your host is reviewing your request. We will email you as soon as your stay is confirmed. Please get in touch with any questions.')}</p><div className="guest-support-links">{number&&<a href={'https://wa.me/'+number+'?text='+encodeURIComponent(greeting)} target="_blank" rel="noopener noreferrer"><img src="/assets/whatsapp.svg" alt="" width={21} height={21}/>{de?'Über WhatsApp schreiben':'Chat with your hosts'}</a>}<a href="/assets/documents/frankiholz-house-guide.pdf" target="_blank" rel="noopener noreferrer">{de?'Hausregeln ansehen (PDF · EN/DE)':'Read our house guide (PDF · EN/DE)'}</a></div></aside>;
}
export function GuestSummary({booking,lang}:{booking:GuestBooking;lang:Lang}){
  const de=lang==='de',nights=Math.round((Date.parse(booking.check_out)-Date.parse(booking.check_in))/86400000);
  return <section className="guest-summary" aria-label={de?'Buchungsübersicht':'Booking summary'}><span className="micro-label">{de?'IHR AUFENTHALT':'YOUR STAY'}</span><h2>{booking.room_name}</h2><p>{bookingState(booking.booking_status,lang)}</p><dl><div><dt>Check-in</dt><dd>{stayDate(booking.check_in,lang)}<small>{de?'ab 17:00 Uhr':'from 17:00'}</small></dd></div><div><dt>Check-out</dt><dd>{stayDate(booking.check_out,lang)}<small>{de?'bis 11:00 Uhr':'by 11:00'}</small></dd></div></dl><div className="guest-total"><span>{de?'Gesamtpreis':'Stay total'}{Number.isFinite(nights)&&nights>0?' · '+nights+' '+(de?(nights===1?'Nacht':'Nächte'):(nights===1?'night':'nights')):''}</span><strong>{formatEuro(booking.total_price,lang)}</strong></div><p className="guest-subtle">{de?'Buchungsreferenz':'Booking reference'}: <strong>{booking.reference}</strong></p></section>;
}
export function PaymentClient(){
  const [lang,setLang]=useGuestLanguage(),de=lang==='de';
  const [reference,setReference]=useState(''),[email,setEmail]=useState('');
  const [booking,setBooking]=useState<GuestBooking|null>(null),[credentials,setCredentials]=useState<GuestCredentials|null>(null);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[lookupOpen,setLookupOpen]=useState(true);
  const version=useRef(0),busyRef=useRef(false),alive=useRef(true),language=useRef(lang);language.current=lang;
  const problem=(error:unknown,fallback?:string)=>error instanceof Error?error.message:typeof error==='object'&&error&&'message' in error?String(error.message):fallback||(language.current==='de'?'Die Anfrage konnte nicht abgeschlossen werden.':'The request could not be completed.');
  async function lookup(snapshot:GuestCredentials){
    if(busyRef.current||!snapshot.reference.trim()||!snapshot.email.trim())return;
    const attempt=++version.current;setLoading(true);setBooking(null);setCredentials(null);setError('');
    try{
      const sb=client();if(!sb)throw new Error(de?'Verbindung nicht verfügbar.':'The booking connection is unavailable.');
      const result=await sb.rpc('frankiholz_payment_details',{p_reference:snapshot.reference.trim(),p_email:snapshot.email.trim()});
      if(attempt!==version.current||!alive.current)return;
      if(result.error)throw result.error;
      const found=Array.isArray(result.data)?result.data[0]:result.data;
      if(!found?.reference)throw new Error(language.current==='de'?'Keine passende Buchung gefunden. Prüfen Sie Referenz und E-Mail.':'No matching booking found. Check your reference and email.');
      const access={reference:String(found.reference),email:snapshot.email.trim()};rememberGuest(access);setCredentials(access);setBooking(found as GuestBooking);setLookupOpen(false);
    }catch(error){if(attempt===version.current&&alive.current)setError(problem(error))}
    finally{if(attempt===version.current&&alive.current)setLoading(false)}
  }
  useEffect(()=>{
    alive.current=true;const access=savedCredentials();setReference(access.reference);setEmail(access.email);
    if(access.reference&&access.email)void lookup(access);
    const restore=(event:PageTransitionEvent)=>{if(event.persisted){busyRef.current=false;setBusy(false);const access=savedCredentials();if(access.reference&&access.email)void lookup(access)}};
    window.addEventListener('pageshow',restore);
    return()=>{alive.current=false;version.current++;window.removeEventListener('pageshow',restore)};
  },[]);
  const invalidate=()=>{version.current++;setBooking(null);setCredentials(null);setLoading(false);setError('');setLookupOpen(true)};
  const payable=!!booking&&booking.booking_status==='pending'&&['not_started','awaiting_payment','expired','failed'].includes(booking.payment_status);
  const free=booking?.payment_status==='not_required',closed=booking?.booking_status==='cancelled',bank=booking?.payment_collection_mode==='bank_transfer';
  async function openPayment(collection:'saved_method'|'bank_transfer'){
    if(busyRef.current||!booking||!credentials||!payable||(collection==='bank_transfer'&&!bank))return;
    busyRef.current=true;setBusy(true);setError('');
    const access={...credentials},modeSnapshot=booking.payment_mode;
    try{
      const environment=await verifyPaymentMode(modeSnapshot);
      const data=await guestPost(environment==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test',{...access,payment_collection_mode:collection});
      const target=stripeCheckoutUrl(data.checkout_url);location.assign(target);
    }catch(error){if(alive.current)setError(problem(error));busyRef.current=false;if(alive.current)setBusy(false)}
  }
  const title=free?(de?'Keine Zahlung erforderlich':'No payment required'):closed?(de?'Ihre Anfrage ist geschlossen':'Your request is closed'):booking&&!payable?(booking.booking_status==='confirmed'?(de?'Ihr Aufenthalt ist bestätigt':'Your stay is confirmed'):(de?'Ihre Anfrage ist bei uns angekommen':'Your request is with us')):(de?'Wie möchten Sie bezahlen?':'Choose how to pay');
  const lead=free?(closed?(de?'Ihre Anfrage ist geschlossen. Es ist keine Zahlung erforderlich.':'Your request is closed. No payment is required.'):booking?.booking_status==='confirmed'?(de?'Ihr kostenloser Aufenthalt ist bestätigt.':'Your complimentary stay is confirmed.'):(de?'Ihr 100%-Gutschein deckt den gesamten Aufenthalt ab. Die Anfrage erfordert weiterhin die Bestätigung des Gastgebers.':'Your 100% promo covers the full stay. Your request still requires host approval.')):closed?(de?'Wenn Sie Fragen haben oder eine andere Reise planen, schreiben Sie uns gerne.':'If you have a question or are planning another trip, please get in touch.'):booking&&!payable?(de?'Hier finden Sie den aktuellen Status Ihres Aufenthalts und Ihrer Zahlung.':'Your current stay and payment details are below.'):(de?'Vielen Dank für Ihre Anfrage. Wählen Sie Ihre Methode sicher bei Stripe; Ihr Gastgeber bestätigt den Aufenthalt separat.':'Thank you for choosing FrankiHolz. Choose your preferred method securely with Stripe; your host confirms your stay separately.');
  return <main id="main" className="centered-route"><div className="guest-route-shell"><div className="guest-compact-head"><Link href={'/?lang='+lang} className="back-link"><ArrowLeft size={16}/>{de?'Zurück zu FrankiHolz':'Back to FrankiHolz'}</Link><GuestLanguage lang={lang} onChange={setLang}/></div><div className="status-card"><span className="micro-label">{de?'IHRE BUCHUNGSANFRAGE':'YOUR BOOKING REQUEST'}</span><h1>{title}</h1><p>{lead}</p>
    {booking&&!lookupOpen&&<button type="button" disabled={busy} className="guest-lookup-toggle" onClick={()=>{setLookupOpen(true)}}>{de?'Andere Buchung aufrufen':'Look up another booking'}</button>}
    {lookupOpen&&<form className="status-form guest-forms" onSubmit={event=>{event.preventDefault();void lookup({reference,email})}}><label>{de?'Buchungsreferenz':'Booking reference'}<input name="reference" value={reference} required disabled={busy} autoComplete="off" placeholder="FH-XXXXXXXX" onChange={event=>{setReference(event.target.value);invalidate()}}/></label><label>{de?'E-Mail der Buchung':'Booking email'}<input name="email" type="email" autoComplete="email" value={email} required disabled={busy} onChange={event=>{setEmail(event.target.value);invalidate()}}/></label><button type="submit" disabled={loading||busy} className="btn btn-dark">{loading?(de?'Buchung wird geladen …':'Loading your booking…'):(de?'Zahlungsoptionen anzeigen':'Show payment options')}<ArrowRight size={17}/></button></form>}
    {error&&<p className="guest-notice" data-kind="error" role="alert">{error}</p>}
    {booking&&<><GuestSummary booking={booking} lang={lang}/>{booking.payment_mode==='test'&&<p className="guest-test" role="status">{de?'Stripe TEST — keine echte Zahlung. Diese Buchung bleibt in der Testumgebung.':'Stripe TEST — no real payment. This booking remains in the test environment.'}</p>}
      {payable&&!bank&&<section className="guest-payment-option"><CreditCard size={24}/><h2>{de?'Karte, Wallets & Banklastschrift':'Card, wallets & bank debit'}</h2><p className="guest-method-copy">{de?'Karten, Apple Pay, Google Pay, SEPA-Lastschrift und weitere geeignete Methoden werden bei Stripe angeboten.':'Cards, Apple Pay, Google Pay, SEPA Direct Debit and other eligible methods are offered on Stripe.'}</p><p className="guest-method-copy">{de?'Speichern Sie Ihre Zahlungsdaten jetzt ohne Belastung. Nach Bestätigung wird die Zahlung 14 Tage vor Check-in ausgelöst — bei kurzfristiger Anreise nach Bestätigung. Banklastschriften können mehrere Werktage dauern.':'Save your payment details now without a charge. After host confirmation, payment is initiated 14 days before check-in, or after confirmation for arrivals within 14 days. Bank debits can take several business days.'}</p><button className="btn btn-dark" disabled={busy} onClick={()=>void openPayment('saved_method')}>{busy?(de?'Stripe wird geöffnet …':'Opening Stripe…'):(de?'Methode bei Stripe wählen':'Choose a method on Stripe')}<ArrowRight size={17}/></button><p className="guest-subtle">{de?'Stripe zeigt die für Ihr Land, Ihre Währung, Ihr Gerät und diesen Ablauf verfügbaren Methoden.':'Stripe shows the methods eligible for your country, currency, device and this payment flow.'}</p></section>}
      {payable&&bank&&<section className="guest-payment-option"><h2>{de?'Bestehende Überweisung':'Existing bank transfer'}</h2><p>{de?'Überweisungen werden für neue Anfragen nicht mehr angeboten. Für diese Anfrage läuft bereits eine Überweisung. Sehen Sie die bestehenden Bankdaten an und überweisen Sie nicht erneut, wenn Sie schon bezahlt haben.':'Bank transfers are no longer offered for new requests. This request already has a transfer in progress. View its existing instructions; do not send the payment again if you have already transferred it.'}</p><button className="btn btn-dark" disabled={busy} onClick={()=>void openPayment('bank_transfer')}>{busy?(de?'Wird geöffnet …':'Opening…'):(de?'Bestehende Überweisungsdaten ansehen':'View existing transfer instructions')}<ArrowRight size={17}/></button></section>}
      {!payable&&<section className="guest-saved-state" aria-label={de?'Zahlungsstatus':'Payment status'}><h2>{paymentState(booking.payment_status,lang)}</h2><p>{closed?(de?'Diese Anfrage ist geschlossen. Es kann keine neue Zahlung gestartet werden.':'This request is closed. No new payment can be started.'):free?(de?'Keine Zahlungsdaten oder Belastung erforderlich.':'No payment details or charge required.'):(de?'Die Zahlungsmethode ist bereits gespeichert oder die Zahlung ist geplant, in Verarbeitung oder abgeschlossen. Details finden Sie im Buchungsstatus.':'Payment is already saved, scheduled, processing or completed. Check your booking status for details.')}</p></section>}
      <div className="guest-actions"><Link href={guestHref('/booking-status',booking.reference,lang)} onClick={()=>{if(credentials)rememberGuest(credentials)}} className="btn btn-outline">{de?'Buchungs- & Zahlungsstatus':'Booking & payment status'}<ArrowRight size={17}/></Link></div><GuestSupport booking={booking} lang={lang}/></>}
    <div className="status-info"><ShieldCheck size={19}/>{de?'Stripe verarbeitet Zahlungsdaten sicher. Eine Zahlung bestätigt den Aufenthalt nicht; der Gastgeber muss zustimmen.':'Stripe processes payment details securely. Payment does not confirm your stay; your host must approve it.'}</div>
  </div><GuestLegal lang={lang}/></div></main>;
}
