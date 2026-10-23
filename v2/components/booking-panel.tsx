'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, CreditCard, Info, ShieldCheck, X } from 'lucide-react';
import { client, formatEuro } from '@/lib/config';
import { guestHref, rememberGuest, requestReceived, verifyPaymentMode } from '@/lib/guest-booking';
import type { CalendarDay, Lang, Room } from '@/lib/types';
import './guest-booking.css';

const iso=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const at=(date:string)=>new Date(date+'T12:00:00');
const next=(date:string)=>{const value=at(date);value.setDate(value.getDate()+1);return iso(value)};
type Coverage={from:string;to:string};
type Quote={available:boolean;total_price:number;original_total_price?:number;discount_percent?:number;nights:number};
type Saved={reference:string;email:string;total:number;lang:Lang};
function validEnd(start:string,end:string,rows:CalendarDay[],coverage:Coverage|null){
  if(end<=start||!coverage||coverage.from>start||coverage.to<end)return false;
  for(let day=start;day<end;day=next(day))if(rows.find(row=>row.date===day)?.is_available===false)return false;
  return true;
}
function errorText(error:unknown,de:boolean){
  const text=error instanceof Error?error.message:typeof error==='object'&&error&&'message' in error?String(error.message):'';
  if(text==='Promo code is not valid')return de?'Dieser Gutscheincode ist ungültig.':'This promo code is not valid.';
  if(text==='The discounted booking total must be at least EUR 0.50')return de?'Der Gesamtpreis nach Rabatt muss mindestens 0,50 € betragen.':'The total after discount must be at least €0.50.';
  return text||(de?'Die Anfrage konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.':'The request could not be completed. Please try again.');
}

type Props={room:Room|null;lang:Lang;close:()=>void;onLanguageChange?:(lang:Lang)=>void};
export function BookingPanel({room,lang,close,onLanguageChange}:Props){
  const reduced=useReducedMotion(),de=lang==='de';
  const [month,setMonth]=useState(()=>{const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1)});
  const [days,setDays]=useState<CalendarDay[]>([]),[coverage,setCoverage]=useState<Coverage|null>(null);
  const [loading,setLoading]=useState(true),[calendarError,setCalendarError]=useState('');
  const [start,setStart]=useState(''),[end,setEnd]=useState(''),[promo,setPromo]=useState('');
  const [quote,setQuote]=useState<Quote|null>(null),[quoting,setQuoting]=useState(false),[quoteError,setQuoteError]=useState('');
  const [busy,setBusy]=useState(false),[mode,setMode]=useState<'test'|'live'|null>(null),[message,setMessage]=useState('');
  const [saved,setSaved]=useState<Saved|null>(null),[emailPending,setEmailPending]=useState(false);
  const [calendarRetry,setCalendarRetry]=useState(0);
  const drawer=useRef<HTMLElement>(null),closeButton=useRef<HTMLButtonElement>(null);
  const closeRef=useRef(close),busyRef=useRef(false),quoteVersion=useRef(0),alive=useRef(true);
  const selected=useRef({start:'',end:'',promo:''});
  closeRef.current=close;
  useEffect(()=>{
    alive.current=true;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    closeButton.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();if(!busyRef.current)closeRef.current();return}
      if(event.key!=='Tab'||!drawer.current)return;
      const items=Array.from(drawer.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')).filter(item=>item.getClientRects().length>0&&!item.matches(':disabled')&&item.tabIndex>=0);
      if(!items.length){event.preventDefault();drawer.current.focus();return}
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&(document.activeElement===first||!drawer.current.contains(document.activeElement))){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&(document.activeElement===last||!drawer.current.contains(document.activeElement))){event.preventDefault();first.focus()}
    };
    document.addEventListener('keydown',key);
    return()=>{alive.current=false;quoteVersion.current++;document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus()};
  },[]);
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      if(!room)return;
      setLoading(true);setCalendarError('');setCoverage(null);
      const sb=client();if(!sb){setLoading(false);setCalendarError(de?'Die Verbindung ist nicht verfügbar.':'The booking connection is unavailable.');return}
      const first=iso(new Date(month.getFullYear(),month.getMonth(),1));
      const last=iso(new Date(month.getFullYear(),month.getMonth()+1,0));
      // Cover every overnight from a selected check-in, including intervening months.
      const from=start&&start<first?start:first,to=start&&start>last?start:last;
      try{
        const result=await sb.rpc('frankiholz_get_calendar_rates',{p_room_id:room.id,p_from:from,p_to:to});
        if(cancelled)return;
        if(result.error)throw result.error;
        setDays((result.data||[]) as CalendarDay[]);setCoverage({from,to});
      }catch(error){if(!cancelled){setDays([]);setCalendarError(errorText(error,de));quoteVersion.current++;setQuote(null)}}
      finally{if(!cancelled)setLoading(false)}
    };
    void load();return()=>{cancelled=true};
  },[month,room?.id,start,calendarRetry]);
  useEffect(()=>{let alive=true;void verifyPaymentMode().then(value=>{if(alive)setMode(value)}).catch(()=>{});return()=>{alive=false}},[]);
  const byDate=useMemo(()=>new Map(days.map(day=>[day.date,day])),[days]);
  const grid=useMemo(()=>({padding:(new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7,dates:Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>iso(new Date(month.getFullYear(),month.getMonth(),i+1)))}),[month]);
  const today=iso(new Date()),free=quote?.discount_percent===100&&quote.total_price===0;
  const invalidate=()=>{quoteVersion.current++;setQuote(null);setQuoteError('');setQuoting(false)};
  async function estimate(checkIn=start,checkOut=end,code=promo){
    if(!room||!checkIn||!checkOut)return;
    const sb=client();if(!sb)return;
    const version=++quoteVersion.current;setQuote(null);setQuoteError('');setQuoting(true);
    const args:Record<string,unknown>={p_room_id:room.id,p_check_in:checkIn,p_check_out:checkOut};
    if(code.trim())args.p_promo_code=code.trim();
    try{
      const {data,error}=await sb.rpc(code.trim()?'frankiholz_quote_with_promo':'frankiholz_estimate_total',args);
      if(version!==quoteVersion.current||!alive.current)return;
      if(error)throw error;
      const value=data?.[0];
      if(!value?.available){setEnd('');selected.current.end='';throw new Error(de?'Diese Daten sind nicht mehr verfügbar. Bitte wählen Sie erneut.':'These dates are no longer available. Please choose again.')}
      if(!Number.isFinite(Number(value.total_price))||Number(value.total_price)<0)throw new Error(de?'Der Preis konnte nicht bestätigt werden.':'The stay price could not be verified.');
      setQuote({...value,total_price:Number(value.total_price)} as Quote);
    }catch(error){if(version===quoteVersion.current&&alive.current)setQuoteError(errorText(error,de))}
    finally{if(version===quoteVersion.current&&alive.current)setQuoting(false)}
  }
  function choose(day:string){
    if(loading||calendarError||busyRef.current||saved||day<today)return;
    const blocked=byDate.get(day)?.is_available===false;
    const current=selected.current;
    invalidate();setMessage('');
    if(day===current.start){selected.current={...current,start:'',end:''};setStart('');setEnd('');return}
    if(day===current.end){selected.current={...current,end:''};setEnd('');return}
    if(!current.start||current.end||day<current.start){if(blocked)return;selected.current={...current,start:day,end:''};setStart(day);setEnd('');return}
    if(!validEnd(current.start,day,days,coverage)){setQuoteError(de?'Der Zeitraum enthält eine nicht verfügbare Nacht.':'This period includes an unavailable night.');return}
    selected.current={...current,end:day};setEnd(day);void estimate(current.start,day,current.promo);
  }
  const continuation=(value:Saved)=>guestHref(value.total===0?'/booking-status':'/payment',value.reference,value.lang);
  function continueSaved(value:Saved){rememberGuest(value);location.assign(continuation(value))}
  async function retryEmail(){
    if(!saved||busyRef.current)return;
    busyRef.current=true;setBusy(true);setMessage('');
    try{await requestReceived(saved);setEmailPending(false);continueSaved(saved)}
    catch(error){setMessage(errorText(error,de))}
    finally{busyRef.current=false;if(alive.current)setBusy(false)}
  }
  async function book(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busyRef.current||saved)return;
    if(!room||!start||!end||!quote||loading||calendarError||quoting||!validEnd(start,end,days,coverage)){setMessage(de?'Bitte wählen Sie verfügbare Daten und bestätigen Sie den Preis.':'Choose available dates and confirm the stay price first.');return}
    const form=new FormData(event.currentTarget);
    if(form.get('bot-field'))return;
    const languages=String(form.get('languages')||'').split(/[,;]/).map(value=>value.trim()).filter(Boolean),intro=String(form.get('intro')||'').trim();
    if(!languages.length||intro.length<20){setMessage(de?'Bitte Sprache(n) und eine Vorstellung mit mindestens 20 Zeichen eingeben.':'Add at least one language and an introduction of at least 20 characters.');return}
    // Snapshot every form field before the first await; a repeated click shares this attempt.
    const payload={p_room_id:room.id,p_check_in:start,p_check_out:end,p_guest_name:String(form.get('name')||'').trim(),p_guest_email:String(form.get('email')||'').trim(),p_guest_phone:String(form.get('phone')||'').trim(),p_guest_country:String(form.get('country')||'').trim(),p_guests:Number(form.get('guests')||1),p_message:intro,p_language:lang,p_guest_age:Number(form.get('age')),p_guest_sex:String(form.get('sex')),p_guest_languages:languages,p_guest_hobbies:String(form.get('hobbies')||'').trim(),p_guest_returning:form.get('returning')==='yes'};
    const code=promo.trim(),requestPayload=code?{...payload,p_promo_code:code}:payload;
    busyRef.current=true;setBusy(true);setMessage('');
    try{
      const sb=client();if(!sb)throw new Error(de?'Verbindung nicht verfügbar.':'The booking connection is unavailable.');
      const environment=await verifyPaymentMode();setMode(environment);
      const {data,error}=await sb.rpc(code?'frankiholz_create_booking_with_promo':'frankiholz_create_booking_v2',requestPayload);
      if(error)throw error;
      const value=data?.[0];
      if(!value?.reference)throw new Error(de?'Ihre Anfrage konnte nicht bestätigt werden. Prüfen Sie Ihre E-Mail, bevor Sie erneut anfragen.':'Your request could not be confirmed. Check your email before submitting again.');
      const created:Saved={reference:String(value.reference),email:payload.p_guest_email,total:Number(value.total_price),lang:payload.p_language};
      rememberGuest(created);if(alive.current)setSaved(created);
      // Once created, retries only deliver the confirmation or continue; never recreate it.
      try{await requestReceived(created);if(alive.current)setEmailPending(false);continueSaved(created)}
      catch{if(alive.current){setEmailPending(true);setMessage(de?'Ihre Anfrage wurde gespeichert. Die Bestätigungs-E-Mail konnte noch nicht bestätigt werden. Sie können sicher fortfahren oder den Versand erneut versuchen.':'Your request is saved. We could not confirm the confirmation-email handoff. You can continue safely or retry the email.')}}
    }catch(error){if(alive.current)setMessage(errorText(error,de))}
    finally{busyRef.current=false;if(alive.current)setBusy(false)}
  }
  const promoStatus=quoteError||(quote?.discount_percent?(de?`${quote.discount_percent}% Rabatt: ${formatEuro(quote.original_total_price||0,lang)} → ${formatEuro(quote.total_price,lang)}`:`${quote.discount_percent}% off: ${formatEuro(quote.original_total_price||0,lang)} → ${formatEuro(quote.total_price,lang)}`):promo&&start&&end&&!quote?(de?'Code anwenden, um den Preis zu aktualisieren.':'Apply the code to update the price.'):quoting?(de?'Preis wird geprüft …':'Checking the stay price…'):'');
  if(!room)return null;
  return <motion.div className="booking-overlay" initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} role="presentation">
    <div className="booking-backdrop" onClick={()=>{if(!busyRef.current)close()}}/>
    <motion.section ref={drawer} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="booking-drawer-title" className="booking-drawer" initial={reduced?false:{x:'100%'}} animate={{x:0}} exit={reduced?{}:{x:'100%'}} transition={{type:'spring',damping:29,stiffness:250}}>
      <header className="drawer-header"><div><span className="eyebrow eyebrow-dark">{de?'IHR AUFENTHALT':'YOUR STAY'} / 01</span><h2 id="booking-drawer-title">{de?'Aufenthalt planen':'Plan your stay'}</h2></div><button ref={closeButton} type="button" disabled={busy} onClick={close} className="icon-btn dark" aria-label={de?'Buchung schließen':'Close booking'}><X size={21}/></button></header>
      <div className="drawer-scroll">{onLanguageChange&&<div className="guest-language" aria-label={de?'Sprache wählen':'Choose language'}>{(['en','de'] as const).map(language=><button key={language} type="button" disabled={busy} aria-pressed={lang===language} onClick={()=>onLanguageChange(language)}>{language.toUpperCase()}</button>)}</div>}
        <div className="booking-roomline"><div><small>{de?'Gewähltes Zimmer':'Selected room'}</small><strong>{de?(room.name_de||room.name):room.name}</strong></div><span>{formatEuro(room.base_price,lang)} <small>/{de?'Nacht':'night'}</small></span></div>
        <div className="calendar-heading"><div><span className="micro-label">{de?'VERFÜGBARKEIT':'AVAILABILITY'}</span><h3>{month.toLocaleDateString(de?'de-DE':'en-GB',{month:'long',year:'numeric'})}</h3></div><div className="calendar-nav"><button type="button" disabled={busy||!!saved} aria-label={de?'Vorheriger Monat':'Previous month'} onClick={()=>setMonth(value=>new Date(value.getFullYear(),value.getMonth()-1,1))}><ChevronLeft/></button><button type="button" disabled={busy||!!saved} aria-label={de?'Nächster Monat':'Next month'} onClick={()=>setMonth(value=>new Date(value.getFullYear(),value.getMonth()+1,1))}><ChevronRight/></button></div></div>
        <p className="booking-loading" role="status">{loading?(de?'Verfügbarkeit wird geladen …':'Loading availability…'):calendarError?null:start&&!end?(de?'Wählen Sie jetzt Ihr Check-out-Datum.':'Now choose your check-out date.'):de?'Wählen Sie Check-in und Check-out.':'Choose your check-in and check-out dates.'}</p>
        {calendarError&&<div className="guest-notice" data-kind="error" role="alert">{calendarError}<button className="guest-lookup-toggle" type="button" onClick={()=>setCalendarRetry(value=>value+1)}>{de?'Kalender erneut laden':'Retry calendar'}</button></div>}
        <div className="v2-calendar" aria-busy={loading}>
          {(de?['Mo','Di','Mi','Do','Fr','Sa','So']:['Mo','Tu','We','Th','Fr','Sa','Su']).map((label,i)=><div className="calendar-dow" key={i}>{label}</div>)}
          {Array.from({length:grid.padding},(_,i)=><div key={'pad'+i}/>)}
          {grid.dates.map(day=>{
            const row=byDate.get(day),blocked=row?.is_available===false,past=day<today;
            const checkout=blocked&&!!start&&!end&&validEnd(start,day,days,coverage);
            const disabled=loading||!!calendarError||busy||!!saved||past||(blocked&&!checkout&&day!==start&&day!==end);
            const isSelected=day===start||day===end,between=!!(start&&end&&day>start&&day<end);
            const note=day===start?(de?', Check-in ausgewählt':', check-in selected'):day===end?(de?', Check-out ausgewählt':', check-out selected'):checkout?(de?', nur Check-out':', check-out only'):blocked?(de?', nicht verfügbar':', unavailable'):'';
            return <button type="button" key={day} disabled={disabled} aria-pressed={isSelected} aria-label={day+note} title={checkout?(de?'Nur Check-out':'Check-out only'):undefined} className={'date-cell'+(blocked?' is-blocked':'')+(checkout?' is-checkout':'')+(isSelected?' is-selected':'')+(between?' is-between':'')} onClick={()=>choose(day)}><span>{Number(day.slice(-2))}</span><small>{checkout?'↗':isSelected?'●':!blocked&&row?.nightly_price?formatEuro(row.nightly_price,lang):''}</small></button>
          })}
        </div>
        <p className="calendar-hint"><Info size={15}/>{de?'Gestrichelte Tage sind nur als Abreise möglich. Ein ausgewähltes Datum erneut anklicken, um es abzuwählen.':'Dashed days allow check-out only. Click a selected date again to deselect it.'}</p>
        <div className="date-result" aria-live="polite"><div><small>CHECK-IN</small><strong>{start||'—'}</strong></div><div><small>CHECK-OUT</small><strong>{end||'—'}</strong></div><div><small>{de?'GESAMT':'TOTAL'}</small><strong>{quote?formatEuro(quote.total_price,lang):'—'}</strong></div></div>
        {mode==='test'&&<p className="guest-test" role="status">{de?'Stripe TEST: Hier wird kein echtes Geld belastet.':'Stripe TEST: No real money will be charged.'}</p>}
        <form onSubmit={book} className="booking-form">
          <fieldset className="booking-fieldset" disabled={busy||!!saved}>
            <div className="booking-promo"><label>{de?'Gutscheincode (optional)':'Promo code (optional)'}<input name="promo" maxLength={64} autoComplete="off" value={promo} onChange={event=>{const value=event.target.value;setPromo(value);selected.current.promo=value;invalidate()}}/></label><button type="button" disabled={!start||!end||loading||quoting} onClick={()=>void estimate()}>{quoting?(de?'Prüfen …':'Checking…'):(de?'Code anwenden':'Apply code')}</button></div>
            <p className="booking-promo-status" role="status">{promoStatus}</p>
            <p className="booking-honeypot" aria-hidden="true"><label>Leave empty<input name="bot-field" tabIndex={-1} autoComplete="off"/></label></p>
            <div className="form-row"><label>{de?'Vorname und Nachname':'Full name'}<input required name="name" autoComplete="name" minLength={2}/></label><label>{de?'E-Mail':'Email'}<input required name="email" type="email" autoComplete="email"/></label></div>
            <div className="form-row"><label>{de?'Telefon':'Phone'}<input name="phone" autoComplete="tel"/></label><label>{de?'Land':'Country'}<input required name="country" autoComplete="country-name"/></label></div>
            <div className="form-row"><label>{de?'Gäste':'Guests'}<select name="guests" defaultValue="1">{Array.from({length:room.max_guests},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><label>{de?'Alter':'Age'}<input required name="age" type="number" min={18} max={120}/></label></div>
            <label>{de?'Geschlecht':'Sex'}<select name="sex" required defaultValue=""><option value="" disabled>{de?'Auswählen':'Select'}</option><option value="female">{de?'Weiblich':'Female'}</option><option value="male">{de?'Männlich':'Male'}</option><option value="non_binary">{de?'Nicht-binär':'Non-binary'}</option><option value="other">{de?'Andere':'Other'}</option><option value="prefer_not_to_say">{de?'Keine Angabe':'Prefer not to say'}</option></select></label>
            <label>{de?'Sprachen':'Languages'}<input required name="languages" placeholder={de?'Deutsch, Englisch':'English, German'}/></label>
            <label>{de?'Interessen (optional)':'Hobbies (optional)'}<input name="hobbies"/></label>
            <label>{de?'Waren Sie schon einmal bei uns?':'Have you stayed with us before?'}<select name="returning" required defaultValue=""><option value="" disabled>{de?'Auswählen':'Select'}</option><option value="no">{de?'Nein':'No'}</option><option value="yes">{de?'Ja':'Yes'}</option></select></label>
            <label>{de?'Eine kurze Vorstellung (mindestens 20 Zeichen)':'A little about your visit (minimum 20 characters)'}<textarea name="intro" minLength={20} required rows={4}/></label>
            {!saved&&<button className="btn btn-dark btn-wide" disabled={!start||!end||!quote||loading||!!calendarError||quoting||busy} type="submit">{busy?(de?'Anfrage wird gespeichert …':'Saving request…'):free?(de?'Buchungsanfrage senden':'Send booking request'):(de?'Weiter zur Zahlung':'Continue to payment')}<ArrowRight size={17}/></button>}
          </fieldset>
        </form>
        {message&&<p className="guest-notice" data-kind={saved?'info':'error'} role="alert">{message}</p>}
        {saved&&<section className="guest-recovery" aria-label={de?'Gespeicherte Anfrage':'Saved request'}><h3>{de?'Buchungsanfrage gespeichert':'Booking request saved'}</h3><p>{de?'Ihre Referenz':'Your reference'}: <strong>{saved.reference}</strong></p><div className="guest-actions"><a className="btn btn-dark" href={continuation(saved)} onClick={()=>rememberGuest(saved)}>{saved.total===0?(de?'Buchungsstatus ansehen':'Check booking status'):(de?'Weiter zur Zahlung':'Continue to payment')}<ArrowRight size={17}/></a>{emailPending&&<button type="button" className="btn btn-outline" disabled={busy} onClick={()=>void retryEmail()}>{busy?(de?'Wird gesendet …':'Sending…'):(de?'Bestätigung erneut senden':'Retry confirmation email')}</button>}</div></section>}
        <div className="payment-disclaimer"><CreditCard size={19}/><p>{free?(de?'Keine Zahlung erforderlich. Ihre Anfrage wartet weiterhin auf die Bestätigung des Gastgebers.':'No payment required. Your request still needs host approval.'):(de?'Ihre Karte wird sicher bei Stripe gespeichert, zunächst ohne Belastung. Nach Bestätigung wird 14 Tage vor Check-in belastet — oder direkt nach Bestätigung bei kurzfristiger Anreise.':'Your card is saved securely with Stripe without an immediate charge. After host confirmation, payment is initiated 14 days before check-in, or after confirmation for arrivals within 14 days.')}</p></div>
        <p className="form-fine"><ShieldCheck size={16}/>{de?'Preise und Verfügbarkeit werden serverseitig geprüft.':'Prices and availability are verified by the server.'}</p>
        <p className="guest-subtle">{de?'Mehr als 14 Tage vor Check-in: volle Erstattung. Innerhalb von 14 Tagen: nicht erstattungsfähig.':'More than 14 days before check-in: full refund. Within 14 days: non-refundable.'} <a href={'/datenschutz?lang='+lang}>{de?'Datenschutz':'Privacy notice'}</a></p>
      </div>
    </motion.section>
  </motion.div>;
}
