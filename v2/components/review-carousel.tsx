'use client';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Pause, Play, Star } from 'lucide-react';
import { defaultReviews } from '@/lib/content';
import type { Lang } from '@/lib/types';
export function validAirbnb(value:string) {
  try { const u=new URL(value);return u.protocol==='https:'&&/^(www\.)?airbnb\.(com|de)$/.test(u.hostname)&&/^\/rooms\/\d+/.test(u.pathname) ? u.href : ''; } catch {return '';}
}
type Entry={author:string;quote:string;rating:number|null;url:string;kind:string};
export function ReviewCarousel({lang,custom='',listing='',rating='',count=''}:{lang:Lang;custom?:string;listing?:string;rating?:string;count?:string}) {
  const de=lang==='de',reduced=useReducedMotion();
  const supplied:Entry[]=custom.split(/\r?\n/).flatMap(line=>{
    const parts=line.split('|').map(p=>p.trim());
    if(![3,4].includes(parts.length)||!parts[0]||!parts[1]||!validAirbnb(parts[2])||(parts.length===4&&!/^[1-5]$/.test(parts[3])))return [];
    return [{author:parts[0],quote:parts[1],url:validAirbnb(parts[2]),rating:parts[3]?Number(parts[3]):null,kind:'quote'}];
  }).slice(0,12);
  const entries:Entry[]=supplied.length?supplied:defaultReviews.map(r=>({...r,quote:de?r.quote_de:r.quote}));
  const [active,setActive]=useState(0),[paused,setPaused]=useState(false),[interacting,setInteracting]=useState(false);
  const index=active%entries.length,value=entries[index];
  useEffect(()=>{if(paused||interacting||reduced)return;const timer=setInterval(()=>setActive(n=>(n+1)%entries.length),6800);return()=>clearInterval(timer);},[paused,interacting,reduced,entries.length]);
  const source=validAirbnb(listing)||value.url;
  const aggregate=Number(rating),total=Number(count);
  return <section className="reviews-section" id="fhReviewsBand" aria-label={de?'Gästebewertungen':'Guest feedback'}><span id="reviews" className="anchor-target"/>
    <div className="shell reviews-layout"><div className="reviews-aside"><span className="micro-label light">{de?'GÄSTESTIMMEN / AIRBNB':'KIND WORDS / AIRBNB'}</span><h2>{de?'Nicht nur ein Zimmer. Ein gutes Gefühl.':'More than a room. A good feeling.'}</h2><p>{de?'Persönliche Erfahrungen unserer Gäste.':'Personal experiences from our guests.'}</p>{aggregate>0&&aggregate<=5&&<p className="review-snapshot">{aggregate.toLocaleString(de?'de-DE':'en-GB')} / 5 {total>0?`· ${total} ${de?'Bewertungen':'reviews'}`:''}<small>{de?'Manuell aktualisierte Momentaufnahme':'Manually updated snapshot'}</small></p>}<a className="text-link on-dark" href={source} target="_blank" rel="noopener noreferrer">{de?'Bewertungen auf Airbnb':'Read on Airbnb'}<ArrowRight size={16}/></a></div>
    <div className="review-stage" onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)} onFocus={()=>setInteracting(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setInteracting(false);}}>
      <div className="review-top"><span className="review-stars" aria-label={value.rating?`${value.rating} / 5`:de?'Gästebewertung':'Guest review'}>{value.rating&&Array.from({length:value.rating},(_,i)=><Star key={i} size={19} fill="currentColor"/>)}</span><span className="slide-count">{String(index+1).padStart(2,'0')} / {String(entries.length).padStart(2,'0')}</span></div>
      <motion.div key={index+'-'+lang} initial={false} animate={reduced?{}:{y:[8,0]}} transition={{duration:.4}}><p className="review-quote">{value.quote}</p><div className="review-author"><span className="review-avatar">{Array.from(value.author)[0]}</span><div><strong>{value.author}</strong><small>{value.kind==='summary'?(de?'Zusammenfassung · keine wörtliche Zitierung':'Summary · not a verbatim quotation'):(de?'Vom Gastgeber bereitgestelltes Zitat':'Host-provided guest quotation')}</small></div></div></motion.div>
      <div className="review-controls"><a href={value.url} target="_blank" rel="noopener noreferrer">{de?'Quelle ansehen':'View source'}</a><div><button className="review-nav" aria-label={de?'Vorherige Bewertung':'Previous review'} onClick={()=>setActive(n=>(n-1+entries.length)%entries.length)}><ArrowLeft size={18}/></button><button className="review-nav" aria-label={paused?(de?'Bewertungen abspielen':'Play reviews'):(de?'Bewertungen pausieren':'Pause reviews')} aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button><button className="review-nav" aria-label={de?'Nächste Bewertung':'Next review'} onClick={()=>setActive(n=>(n+1)%entries.length)}><ArrowRight size={18}/></button></div></div>
    </div></div>
  </section>;
}
