'use client';
import { useEffect,useState } from 'react';
import { AnimatePresence,motion,useReducedMotion } from 'motion/react';
import { ArrowLeft,ArrowRight,Star } from 'lucide-react';
import { reviews,listing } from '@/lib/reviews';
import type {Lang} from '@/lib/types';
export function ReviewCarousel({lang}:{lang:Lang}){
  const [active,setActive]=useState(0),[paused,setPaused]=useState(false);
  const reduced=useReducedMotion();
  useEffect(()=>{if(paused||reduced)return;const id=setInterval(()=>setActive(n=>(n+1)%reviews.length),6800);return()=>clearInterval(id)},[paused,reduced]);
  const value=reviews[active];
  return <section className="reviews-section" id="reviews" aria-label="Guest feedback"><div className="shell reviews-layout">
    <div className="reviews-aside"><span className="micro-label light">KIND WORDS / AIRBNB</span><h2>{lang==='de'?'Nicht nur ein Zimmer. Ein gutes Gefühl.':'More than a room. A good feeling.'}</h2><p>{lang==='de'?'Ausgewählte Zusammenfassungen echter Airbnb-Bewertungen.':'Selected summaries of genuine Airbnb guest reviews.'}</p><a className="text-link on-dark" href={listing} target="_blank" rel="noopener noreferrer">{lang==='de'?'Alle Bewertungen auf Airbnb':'See every review on Airbnb'} <ArrowRight size={16}/></a></div>
    <div className="review-stage" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={(e)=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setPaused(false)}}>
      <div className="review-top"><span className="review-stars" aria-label="5 of 5 stars">{Array.from({length:5},(_,i)=><Star key={i} size={19} fill="currentColor"/>)}</span><span className="slide-count">{String(active+1).padStart(2,'0')} / {String(reviews.length).padStart(2,'0')}</span></div>
      <AnimatePresence mode="wait"><motion.div key={active} initial={reduced?false:{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={reduced?{}:{opacity:0,y:-14}} transition={{duration:.42,ease:[.22,1,.36,1]}} className="review-quote">
        <p>“{lang==='de'?value.de:value.en}”</p><div className="review-by"><strong>{value.name}</strong><span>{lang==='de'?'Airbnb Bewertung · Zusammenfassung':'Airbnb review · summary'}</span></div>
      </motion.div></AnimatePresence>
      <div className="review-bottom"><div className="review-progress"><span style={{width:((active+1)/reviews.length*100)+'%'}}/></div><div className="review-buttons"><button aria-label="Previous review" onClick={()=>setActive(x=>(x+reviews.length-1)%reviews.length)}><ArrowLeft size={20}/></button><button aria-label="Next review" onClick={()=>setActive(x=>(x+1)%reviews.length)}><ArrowRight size={20}/></button></div></div>
    </div>
  </div></section>
}
