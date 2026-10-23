'use client';
import { useEffect, useState } from 'react';
import { client, publicConfig } from './config';
import type { Lang } from './types';

export type GuestBooking = {
  reference:string; room_name:string; check_in:string; check_out:string; total_price:number;
  booking_status:string; payment_status:string; payment_mode?:'live'|'test';
  payment_collection_mode?:string; charge_due_at?:string|null; payment_due_at?:string|null;
  cancel_refund_eligible?:boolean;
};
export type GuestCredentials={reference:string;email:string};
export function useGuestLanguage(){
  const [lang,setLang]=useState<Lang>('en');
  useEffect(()=>{
    const query=new URLSearchParams(location.search).get('lang');
    let saved='';try{saved=localStorage.getItem('frankiholz-lang')||localStorage.getItem('frankiholz-v2-lang')||''}catch{}
    setLang(query==='de'||(!query&&saved==='de')?'de':'en');
  },[]);
  useEffect(()=>{document.documentElement.lang=lang;},[lang]);
  const change=(next:Lang)=>{
    setLang(next);try{localStorage.setItem('frankiholz-lang',next);localStorage.setItem('frankiholz-v2-lang',next)}catch{}
    const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState({},'',url.pathname+url.search+url.hash);
  };
  return [lang,change] as const;
}
export function savedCredentials():GuestCredentials{
  const reference=new URLSearchParams(location.search).get('reference')||'';
  let email='';try{email=sessionStorage.getItem('frankiholz-payment-email:'+reference)||''}catch{}
  return {reference,email};
}
export function rememberGuest({reference,email}:GuestCredentials){
  try{sessionStorage.setItem('frankiholz-payment-email:'+reference,email)}catch{}
}
export function guestHref(path:string,reference:string,lang:Lang){
  return path+'?'+new URLSearchParams({reference,lang}).toString();
}
export async function guestPost(endpoint:string,body:Record<string,unknown>){
  const config=publicConfig();
  const response=await fetch(config.supabaseUrl+'/functions/v1/'+endpoint,{
    method:'POST',headers:{'Content-Type':'application/json',apikey:config.supabaseKey},body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({})) as Record<string,unknown>;
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'The request could not be completed.');
  return data;
}
export function stripeCheckoutUrl(value:unknown):string{
  if(typeof value!=='string')throw new Error('Stripe did not return a checkout address.');
  const url=new URL(value);
  if(url.protocol!=='https:'||!['checkout.stripe.com','payments.stripe.com'].includes(url.hostname)||url.username||url.password||url.port)throw new Error('The payment address could not be verified.');
  return url.href;
}
export async function verifyPaymentMode(snapshot?:string){
  const sb=client();if(!sb)throw new Error('The booking connection is unavailable.');
  const {data,error}=await sb.rpc('frankiholz_get_payment_environment');
  if(error||(data!=='test'&&data!=='live'))throw new Error('The payment environment is temporarily unavailable.');
  if(snapshot&&snapshot!==data)throw new Error('The payment environment has changed. Contact FrankiHolz before continuing.');
  return data as 'test'|'live';
}
export async function requestReceived(credentials:GuestCredentials){
  return guestPost('frankiholz-guest-email',{event_type:'request_received',reference:credentials.reference,email:credentials.email.trim().toLowerCase()});
}
export function phoneNumber(value:string){
  const clean=value.replace(/[^+0-9]/g,'');
  return /^\+[1-9][0-9]{6,14}$/.test(clean)?clean.slice(1):null;
}
export function useHostNumber(lang:Lang){
  const [numbers,setNumbers]=useState<Record<Lang,string|null>>({en:null,de:null});
  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      let row:{text_en?:string;text_de?:string}|undefined;
      try{
        const sb=client();if(!sb)return;
        const {data,error}=await sb.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key',['fhContactPhone']);
        if(!error)row=data?.find(item=>item.copy_key==='fhContactPhone');
      }catch{}
      if(!alive)return;
      const result={} as Record<Lang,string|null>;
      for(const language of ['en','de'] as const){
        const saved=row?.[language==='de'?'text_de':'text_en'];
        result[language]=phoneNumber(typeof saved==='string'&&saved.trim()?saved.trim():'+49 176 62493 041');
      }
      setNumbers(result);
    };
    void load();return()=>{alive=false};
  },[]);
  return numbers[lang];
}
export const paymentState=(state:string,lang:Lang)=>{
  const labels:Record<string,[string,string]>={
    not_required:['No payment required (100% promo)','Keine Zahlung erforderlich (100%-Gutschein)'],
    not_started:['Payment not started','Zahlung noch nicht gestartet'],
    awaiting_payment:['Waiting for payment details or bank transfer','Zahlungsdaten oder Überweisung ausstehend'],
    payment_method_saved:['Payment method saved securely','Zahlungsmethode sicher gespeichert'],
    processing:['Payment processing — awaiting settlement','Zahlung wird verarbeitet — Geldeingang ausstehend'],
    scheduled_charge:['Payment scheduled','Zahlung geplant'],paid:['Paid','Bezahlt'],failed:['Payment failed','Zahlung fehlgeschlagen'],
    released:['Payment released','Zahlung freigegeben'],refunded:['Refunded','Erstattet'],expired:['Expired','Abgelaufen'],authorized:['Card authorized','Karte autorisiert']
  };
  return labels[state]?.[lang==='de'?1:0]||state.replaceAll('_',' ');
};
export const bookingState=(state:string,lang:Lang)=>({pending:lang==='de'?'Wartet auf Bestätigung':'Awaiting host approval',confirmed:lang==='de'?'Aufenthalt bestätigt':'Stay confirmed',cancelled:lang==='de'?'Anfrage geschlossen':'Request closed'}[state]||state.replaceAll('_',' '));
export function stayDate(value:string,lang:Lang){
  const date=new Date(value+'T12:00:00Z');
  return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Berlin'}).format(date);
}
