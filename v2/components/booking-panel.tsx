'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CreditCard, Info, ShieldCheck, X } from 'lucide-react';
import { client, formatEuro, isPreviewHost } from '@/lib/config';
import type { CalendarDay, Lang, Room } from '@/lib/types';

const iso=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const dateAt=(date:string)=>new Date(date+'T12:00:00');
const next=(date:string)=>{const x=dateAt(date);x.setDate(x.getDate()+1);return iso(x)};
function isValidEnd(a:string,b:string,rows:CalendarDay[]){
  if(b<=a)return false;
  for(let d=a;d<b;d=next(d)) if(rows.find(x=>x.date===d)?.is_available===false)return false;
  return true;
}
type Props={room:Room|null;lang:Lang;close:()=>void};
export function BookingPanel({room,lang,close}:Props){
  const reduce=useReducedMotion();
  const de=lang==='de';
  const [month,setMonth]=useState(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),1)});
  const [days,setDays]=useState<CalendarDay[]>([]);
  const [loading,setLoading]=useState(false),[start,setStart]=useState(''),[end,setEnd]=useState('');
  const [price,setPrice]=useState<number|null>(null),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(''),[mode,setMode]=useState<'test'|'live'|null>(null);
  const [status,setStatus]=useState<'idle'|'error'|'ok'>('idle');
  useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow=''}},[]);
  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};
    addEventListener('keydown',fn);return()=>removeEventListener('keydown',fn)
  },[close]);
  useEffect(()=>{
    let cancelled=false;
    async function load(){
      if(!room)return;
      const sb=client();if(!sb)return;
      setLoading(true);
      const y=month.getFullYear(),m=month.getMonth();
      const from=iso(new Date(y,m,1)),to=iso(new Date(y,m+2,0));
      const res=await sb.rpc('frankiholz_get_calendar_rates',{p_room_id:room.id,p_from:from,p_to:to});
      if(!cancelled){setDays((res.data||[]) as CalendarDay[]);setLoading(false);if(res.error){setStatus('error');setMessage(de?'Kalender derzeit nicht verfügbar.':'Calendar is temporarily unavailable.' )}}
    }
    void load();return()=>{cancelled=true}
  },[month,room,de]);
  useEffect(()=>{
    const sb=client();if(!sb)return;
    void sb.rpc('frankiholz_get_payment_environment').then(({data})=>{if(data==='test'||data==='live')setMode(data)});
  },[]);
  const dateMap=useMemo(()=>new Map(days.map(d=>[d.date,d])),[days]);
  const grid=useMemo(()=>{
    const y=month.getFullYear(),m=month.getMonth(),count=new Date(y,m+1,0).getDate();
    return {padding:(new Date(y,m,1).getDay()+6)%7,dates:Array.from({length:count},(_,i)=>iso(new Date(y,m,i+1)))};
  },[month]);
  const today=iso(new Date());
  const choose=useCallback(async (day:string)=>{
    const blocked=dateMap.get(day)?.is_available===false;
    if(day<today)return;
    if(day===start){setStart('');setEnd('');setPrice(null);return}
    if(day===end){setEnd('');setPrice(null);return}
    if(!start||end||day<start){if(blocked)return;setStart(day);setEnd('');setPrice(null);return}
    if(!isValidEnd(start,day,days))return;
    setEnd(day);
    const sb=client();if(!sb||!room)return;
    const result=await sb.rpc('frankiholz_estimate_total',{p_room_id:room.id,p_check_in:start,p_check_out:day});
    const estimate=result.data?.[0];
    if(!estimate?.available){setEnd('');setPrice(null);setStatus('error');setMessage(de?'Diese Daten sind nicht verfügbar.':'These dates are unavailable.');return}
    setPrice(Number(estimate.total_price));
  },[dateMap,start,end,days,room,today,de]);
  async function book(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!room||!start||!end||price===null||busy)return;
    const sb=client();if(!sb){setStatus('error');setMessage('Connection is unavailable.');return}
    setBusy(true);setStatus('idle');setMessage('');
    try{
      const env=await sb.rpc('frankiholz_get_payment_environment');
      if(env.error||!['test','live'].includes(env.data))throw new Error('Payment environment cannot be verified.');
      const actual=env.data as 'test'|'live';setMode(actual);
      if(actual==='live'&&isPreviewHost()&&window.prompt(de?'LIVE-Checkout: echte Zahlungen nach Bestätigung. LIVE eingeben:':'LIVE checkout can charge real money after host confirmation. Type LIVE to proceed:')!=='LIVE')return;
      const f=new FormData(event.currentTarget);
      const languages=String(f.get('languages')||'').split(/[,;]/).map(x=>x.trim()).filter(Boolean);
      const intro=String(f.get('intro')||'').trim();
      if(!languages.length||intro.length<20)throw new Error(de?'Bitte Sprachen und eine kurze Vorstellung (20+ Zeichen) eingeben.':'Enter your languages and a short introduction (20+ characters).');
      const payload={
        p_room_id:room.id,p_check_in:start,p_check_out:end,
        p_guest_name:String(f.get('name')||'').trim(),p_guest_email:String(f.get('email')||'').trim(),
        p_guest_phone:String(f.get('phone')||'').trim(),p_guest_country:String(f.get('country')||'').trim(),
        p_guests:Number(f.get('guests')||1),p_message:intro,p_language:lang,
        p_guest_age:Number(f.get('age')),p_guest_sex:String(f.get('sex')),
        p_guest_languages:languages,p_guest_hobbies:String(f.get('hobbies')||'').trim(),
        p_guest_returning:f.get('returning')==='yes'
      };
      const req=await sb.rpc('frankiholz_create_booking_v2',payload);
      if(req.error||!req.data?.[0]?.reference)throw new Error(req.error?.message||'Could not create booking');
      const booking=req.data[0];
      const cfg=window.FRANKIHOLZ_CONFIG;
      if(!cfg)throw new Error('Payment configuration missing. Your request was created: '+booking.reference);
      const endpoint=actual==='test'?'frankiholz-create-authorization-test':'frankiholz-create-authorization-v2';
      const response=await fetch(cfg.supabaseUrl+'/functions/v1/'+endpoint,{
        method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.supabaseKey},
        body:JSON.stringify({reference:booking.reference,email:payload.p_guest_email})
      });
      const json=await response.json();
      if(!response.ok||!json.checkout_url)throw new Error(json.error||'Card setup unavailable. Reference: '+booking.reference);
      location.href=json.checkout_url;
    }catch(e){setStatus('error');setMessage(e instanceof Error?e.message:'Booking could not be completed.')}
    finally{setBusy(false)}
  }
  if(!room)return null;
  return <motion.div className="booking-overlay" initial={reduce?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} role="presentation">
    <div className="booking-backdrop" onClick={close}/>
    <motion.section role="dialog" aria-modal="true" aria-label={de?'Zimmer buchen':'Book a room'} className="booking-drawer"
      initial={reduce?false:{x:'100%'}} animate={{x:0}} exit={reduce?{}:{x:'100%'}} transition={{type:'spring',damping:29,stiffness:250}}>
      <header className="drawer-header"><div><span className="eyebrow eyebrow-dark">YOUR STAY / 01</span><h2>{de?'Aufenthalt planen':'Plan your stay'}</h2></div><button onClick={close} className="icon-btn dark" aria-label="Close booking"><X size={21}/></button></header>
      <div className="drawer-scroll">
        <div className="booking-roomline"><div><small>{de?'Gewähltes Zimmer':'Selected room'}</small><strong>{de?(room.name_de||room.name):room.name}</strong></div><span>{formatEuro(room.base_price,lang)} <small>/{de?'Nacht':'night'}</small></span></div>
        <div className="calendar-heading"><div><span className="micro-label">{de?'VERFÜGBARKEIT':'AVAILABILITY'}</span><h3>{month.toLocaleDateString(de?'de-DE':'en-US',{month:'long',year:'numeric'})}</h3></div><div className="calendar-nav"><button type="button" aria-label="Previous month" onClick={()=>setMonth(x=>new Date(x.getFullYear(),x.getMonth()-1,1))}><ChevronLeft/></button><button type="button" aria-label="Next month" onClick={()=>setMonth(x=>new Date(x.getFullYear(),x.getMonth()+1,1))}><ChevronRight/></button></div></div>
        <div className="v2-calendar" aria-busy={loading}>
          {(de?['Mo','Di','Mi','Do','Fr','Sa','So']:['Mo','Tu','We','Th','Fr','Sa','Su']).map((x,i)=><div className="calendar-dow" key={i}>{x}</div>)}
          {Array.from({length:grid.padding},(_,i)=><div key={'pad'+i}/>)}
          {grid.dates.map(day=>{
            const row=dateMap.get(day),blocked=row?.is_available===false,past=day<today;
            const checkout=blocked&&!!start&&!end&&day>start&&isValidEnd(start,day,days);
            const disabled=past||(blocked&&!checkout&&day!==start&&day!==end);
            const selected=day===start||day===end;
            const between=start&&end&&day>start&&day<end;
            return <button type="button" key={day} disabled={disabled} aria-pressed={!!selected} aria-label={day+(checkout?' check-out only':'')} title={checkout?(de?'Nur Check-out':'Check-out only'):undefined}
              className={'date-cell'+(blocked?' is-blocked':'')+(checkout?' is-checkout':'')+(selected?' is-selected':'')+(between?' is-between':'')}
              onClick={()=>void choose(day)}><span>{Number(day.slice(-2))}</span><small>{checkout?'↗':selected?'●':!blocked&&row?.nightly_price?formatEuro(row.nightly_price,lang):''}</small></button>
          })}
        </div>
        <p className="calendar-hint"><Info size={15}/>{de?'Gestrichelte Tage sind nur als Abreise möglich. Ausgewähltes Datum erneut klicken, um es abzuwählen.':'Dashed days allow check-out only. Click a selected date again to deselect.'}</p>
        <div className="date-result"><div><small>CHECK-IN</small><strong>{start||'—'}</strong></div><div><small>CHECK-OUT</small><strong>{end||'—'}</strong></div><div><small>{de?'GESAMT':'TOTAL'}</small><strong>{price!==null?formatEuro(price,lang):'—'}</strong></div></div>
        <div className="payment-disclaimer"><CreditCard size={19}/><p><strong>{mode==='test'?'STRIPE TEST':mode==='live'?'STRIPE LIVE':de?'ZAHLUNGSMODUS WIRD GELADEN':'PAYMENT MODE LOADING'}</strong><br/>{de?'Die Zahlungsabwicklung wird derzeit vorbereitet. Bitte kontaktieren Sie uns für Alternativen.':'The payment gateway is being prepared. Contact us for alternative arrangements.'}</p></div>
        <form onSubmit={book} className="booking-form">
          <div className="form-row"><label>{de?'Vorname und Nachname':'Full name'}<input required name="name" autoComplete="name" minLength={2} placeholder="Full name"/></label><label>Email<input required name="email" type="email" autoComplete="email" placeholder="you@example.com"/></label></div>
          <div className="form-row"><label>{de?'Telefon':'Phone'}<input name="phone" autoComplete="tel" placeholder="+49…"/></label><label>{de?'Land':'Country'}<input required name="country" autoComplete="country-name" placeholder="Germany"/></label></div>
          <div className="form-row"><label>{de?'Gäste':'Guests'}<select name="guests">{Array.from({length:room.max_guests},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><label>{de?'Alter':'Age'}<input required name="age" type="number" min={18} max={120}/></label></div>
          <label>{de?'Geschlecht':'Sex'}<select name="sex" required defaultValue=""><option value="" disabled>Select…</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
          <label>{de?'Sprachen':'Languages'}<input required name="languages" placeholder="Deutsch, English"/></label>
          <label>{de?'Interessen':'Hobbies'}<input name="hobbies" placeholder="Travel, music, art…"/></label>
          <label>{de?'Schon einmal bei uns gewesen?':'Returning guest?'}<select name="returning"><option value="no">No</option><option value="yes">Yes</option></select></label>
          <label>{de?'Stellen Sie sich vor (mindestens 20 Zeichen)':'A little about your visit (minimum 20 characters)'}<textarea name="intro" minLength={20} required rows={3} placeholder={de?'Warum besuchen Sie Frankfurt?':'What brings you to Frankfurt?'}/></label>
          {status==='error'&&<p className="form-error" role="alert">{message}</p>}
          <button className="btn btn-dark btn-wide" disabled={!start||!end||price===null||busy} type="submit">{busy?(de?'Wird bearbeitet…':'Working…'):(de?'Buchungsanfrage absenden':'Request to book')}<ArrowRight size={17}/></button>
          <p className="form-fine"><ShieldCheck size={16}/>{de?'Preise und Verfügbarkeit werden serverseitig geprüft.':'Prices and availability are verified by the server.'}</p>
        </form>
      </div>
    </motion.section>
  </motion.div>
}
