'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { guestHref, useGuestLanguage } from '@/lib/guest-booking';
import { GuestLanguage, GuestLegal } from './payment-client';
import './guest-booking.css';
export function PaymentSuccessClient(){
  const [lang,setLang]=useGuestLanguage(),de=lang==='de';
  const [reference,setReference]=useState(''),[test,setTest]=useState(false);
  useEffect(()=>{const query=new URLSearchParams(location.search);setReference(query.get('reference')||'');setTest(query.get('test')==='1')},[]);
  return <main id="main" className="centered-route"><div className="guest-route-shell"><div className="guest-compact-head"><Link href={'/?lang='+lang} className="logo-link"><img src="/assets/frankiholz-logo-for-light.png" alt="FrankiHolz" width={166} height={70}/></Link><GuestLanguage lang={lang} onChange={setLang}/></div><div className="status-card"><div className="success-icon"><CheckCircle2 size={32}/></div><span className="micro-label">{test?'TEST · ':''}{de?'RÜCKKEHR VON STRIPE':'RETURNING FROM STRIPE'}</span><h1>{de?'Ihr Aufenthalt ist einen Schritt näher.':'Your stay is one step closer.'}</h1><p>{de?'Wenn Sie die Einrichtung bei Stripe abgeschlossen haben, ist Ihre Zahlungsmethode sicher gespeichert. Dies bedeutet nicht, dass eine Zahlung eingegangen ist oder Ihr Aufenthalt bereits bestätigt wurde. Prüfen Sie den aktuellen Buchungsstatus.':'If you completed setup with Stripe, your payment method is saved securely. This does not mean a payment was collected or your stay is confirmed. Check your booking status for the current details.'}</p><div className="status-info"><ShieldCheck size={21}/>{de?'Nach Bestätigung durch den Gastgeber wird die Karte 14 Tage vor Check-in belastet — oder nach Bestätigung, wenn die Anreise innerhalb von 14 Tagen liegt.':'After host confirmation, your card is charged 14 days before check-in, or after confirmation for arrivals within 14 days.'}</div><Link className="btn btn-dark" href={guestHref('/booking-status',reference,lang)}>{de?'Buchungsstatus prüfen':'Check booking status'}<ArrowRight size={18}/></Link><Link className="text-link" href={'/?lang='+lang}>{de?'Zur Startseite':'Return home'}</Link></div><GuestLegal lang={lang}/></div></main>;
}
