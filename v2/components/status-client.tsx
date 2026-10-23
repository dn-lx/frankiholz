'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { client, formatEuro } from '@/lib/config';
import { bookingState, guestHref, guestPost, paymentState, rememberGuest, savedCredentials, stayDate, useGuestLanguage, type GuestBooking, type GuestCredentials } from '@/lib/guest-booking';
import { GuestLanguage, GuestLegal, GuestSupport } from './payment-client';
import './guest-booking.css';

export function StatusClient(){
  const [lang,setLang]=useGuestLanguage(),de=lang==='de';
  const [reference,setReference]=useState(''),[email,setEmail]=useState('');
  const [booking,setBooking]=useState<GuestBooking|null>(null),[credentials,setCredentials]=useState<GuestCredentials|null>(null);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const version=useRef(0),busyRef=useRef(false),alive=useRef(true),language=useRef(lang);language.current=lang;
  async function lookup(access:GuestCredentials){
    if(!access.reference.trim()||!access.email.trim())return;
    const attempt=++version.current;setLoading(true);setError('');setBooking(null);setCredentials(null);
    try{
      const sb=client();if(!sb)throw new Error(de?'Verbindung nicht verfügbar.':'The booking connection is unavailable.');
      const result=await sb.rpc('frankiholz_booking_status_v3',{p_reference:access.reference.trim(),p_email:access.email.trim()});
      if(attempt!==version.current||!alive.current)return;
      if(result.error)throw result.error;
      const found=result.data?.[0];
      if(!found?.reference)throw new Error(language.current==='de'?'Keine passende Buchung gefunden.':'No matching booking found.');
      const verified={reference:String(found.reference),email:access.email.trim()};rememberGuest(verified);setCredentials(verified);setBooking(found as GuestBooking);
    }catch(error){if(attempt===version.current&&alive.current)setError(error instanceof Error?error.message:typeof error==='object'&&error&&'message' in error?String(error.message):(language.current==='de'?'Buchung konnte nicht geladen werden.':'Unable to look up your booking.'))}
    finally{if(attempt===version.current&&alive.current)setLoading(false)}
  }
  useEffect(()=>{
    alive.current=true;const access=savedCredentials();setReference(access.reference);setEmail(access.email);if(access.reference&&access.email)void lookup(access);
    const restore=(event:PageTransitionEvent)=>{if(event.persisted){busyRef.current=false;setBusy(false);const access=savedCredentials();if(access.reference&&access.email)void lookup(access)}};
    window.addEventListener('pageshow',restore);return()=>{alive.current=false;version.current++;window.removeEventListener('pageshow',restore)};
  },[]);
  const invalidate=()=>{version.current++;setBooking(null);setCredentials(null);setLoading(false);setError('');setNotice('')};
  async function cancel(){
    if(busyRef.current||!booking||!credentials||booking.booking_status==='cancelled')return;
    busyRef.current=true;
    if(!window.confirm(de?'Möchten Sie diese Buchung wirklich stornieren?':'Do you really want to cancel this booking?')){busyRef.current=false;return}
    const access={...credentials};setBusy(true);setError('');setNotice('');
    try{
      const result=await guestPost('frankiholz-cancel-booking-v2',access);
      if(!alive.current)return;
      setNotice(result.policy==='no_payment'?(de?'Buchung storniert. Keine Zahlung oder Erstattung erforderlich.':'Booking cancelled. No payment or refund required.'):result.refundable?(de?'Buchung storniert. Volle Erstattung gilt.':'Booking cancelled. Full refund applies.'):(de?'Buchung storniert. Innerhalb von 14 Tagen ist sie nicht erstattungsfähig.':'Booking cancelled. It is non-refundable within 14 days.'));
      await lookup(access);
    }catch(error){if(alive.current)setError(error instanceof Error?error.message:(de?'Stornierung fehlgeschlagen.':'Cancellation failed.'))}
    finally{busyRef.current=false;if(alive.current)setBusy(false)}
  }
  const retry=booking?.booking_status==='pending'&&['not_started','expired','failed','awaiting_payment'].includes(booking.payment_status);
  const policy=booking?.payment_status==='not_required'?(de?'Keine Zahlung oder Erstattung erforderlich.':'No payment or refund required.'):booking?.cancel_refund_eligible?(de?'Volle Erstattung möglich, mehr als 14 Tage vor Check-in.':'Full refund available, more than 14 days before check-in.'):(de?'Innerhalb von 14 Tagen vor Check-in nicht erstattungsfähig.':'Non-refundable within 14 days before check-in.');
  return <main id="main" className="centered-route"><div className="guest-route-shell"><div className="guest-compact-head"><Link href={'/?lang='+lang} className="back-link"><ArrowLeft size={16}/>{de?'Zurück zu FrankiHolz':'Back to FrankiHolz'}</Link><GuestLanguage lang={lang} onChange={setLang}/></div><div className="status-card"><span className="micro-label">{de?'FRANKIHOLZ / IHRE RESERVIERUNG':'FRANKIHOLZ / YOUR RESERVATION'}</span><h1>{de?'Alle Details an einem Ort.':'Every detail, in one place.'}</h1><p>{de?'Prüfen Sie Ihre Buchung, Zahlungsdaten und geplante Belastung mit der Referenz und der E-Mail-Adresse Ihrer Anfrage.':'Check your booking confirmation, card status and scheduled charge with the reference and email from your request.'}</p><form onSubmit={event=>{event.preventDefault();if(!busyRef.current){setNotice('');void lookup({reference,email})}}} className="status-form guest-forms"><label>{de?'Buchungsreferenz':'Booking reference'}<input name="reference" value={reference} onChange={event=>{setReference(event.target.value);invalidate()}} required disabled={busy} placeholder="FH-XXXXXXXX" autoComplete="off"/></label><label>{de?'E-Mail-Adresse':'Email address'}<input name="email" type="email" autoComplete="email" value={email} onChange={event=>{setEmail(event.target.value);invalidate()}} required disabled={busy}/></label><button type="submit" disabled={loading||busy} className="btn btn-dark">{loading?(de?'Wird geprüft …':'Checking…'):(de?'Status prüfen':'Check status')}<Search size={16}/></button></form>
    {error&&<p className="guest-notice" data-kind="error" role="alert">{error}</p>}{notice&&<p className="guest-notice" role="status">{notice}</p>}
    {booking&&<section className="status-result" aria-label={de?'Buchungsdetails':'Booking details'}><h2>{booking.reference}</h2><p>{booking.room_name}</p><div className="status-fields">{[[de?'Buchung':'Booking',bookingState(booking.booking_status,lang)],[de?'Zahlung':'Payment',paymentState(booking.payment_status,lang)],['Check-in',stayDate(booking.check_in,lang)],['Check-out',stayDate(booking.check_out,lang)],[de?'Gesamtpreis':'Stay total',formatEuro(booking.total_price,lang)]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}{booking.charge_due_at&&<div><small>{de?'Geplante Belastung':'Scheduled charge'}</small><strong>{new Date(booking.charge_due_at).toLocaleString(de?'de-DE':'en-GB',{timeZone:'Europe/Berlin'})}</strong></div>}{booking.payment_due_at&&!booking.charge_due_at&&<div><small>{de?'Zahlungsfrist':'Payment deadline'}</small><strong>{new Date(booking.payment_due_at).toLocaleString(de?'de-DE':'en-GB',{timeZone:'Europe/Berlin'})}</strong></div>}</div>{booking.payment_mode==='test'&&<p className="guest-test">{de?'Stripe TEST — keine echte Zahlung.':'Stripe TEST — no real payment.'}</p>}<p className="guest-subtle">{policy}</p><div className="guest-actions">{retry&&<Link className="btn btn-dark" href={guestHref('/payment',booking.reference,lang)} onClick={()=>{if(credentials)rememberGuest(credentials)}}>{de?'Weiter zur Zahlung':'Continue to payment'}<ArrowRight size={16}/></Link>}{booking.booking_status!=='cancelled'&&<button type="button" className="guest-cancel" disabled={busy||loading} onClick={()=>void cancel()}>{busy?(de?'Wird storniert …':'Cancelling…'):(de?'Buchung stornieren':'Cancel booking')}</button>}</div><GuestSupport booking={booking} lang={lang}/></section>}
    <div className="status-info"><ShieldCheck size={19}/>{de?'Ihre Buchungsdaten sind nur mit Referenz und passender E-Mail-Adresse zugänglich.':'Your booking details are only accessible with your reference and matching email.'}</div>
  </div><GuestLegal lang={lang}/></div></main>;
}
