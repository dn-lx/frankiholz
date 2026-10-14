'use client';
import { useEffect,useMemo,useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence,motion,useReducedMotion,useScroll,useTransform } from 'motion/react';
import { ArrowDown,ArrowRight,ArrowUpRight,CalendarDays,Check,ChevronDown,Clock,Flower2,Home,Instagram,Leaf,MapPin,Menu,MoveUpRight,Phone,ShieldCheck,Sparkles,Star,Sun,Users,Wifi,X, WashingMachine, Tv, CookingPot } from 'lucide-react';
import { BookingPanel } from './booking-panel';
import { ReviewCarousel } from './review-carousel';
import { SectionHeading } from './section-heading';
import {client,mediaUrl,fallbackHero,formatEuro} from '@/lib/config';
import { labels,type Room,type RoomImage,type Lang,type SiteSettings } from '@/lib/types';

const listing='https://www.airbnb.com/rooms/1621684668409633226';
type Info=Record<string,string>;
const defaults:Record<string,{en:string;de:string}>={
 fhCheckIn:{en:'Please arrange your arrival time with your host before your stay.',de:'Bitte stimmen Sie Ihre Ankunftszeit vorab mit dem Gastgeber ab.'},
 fhCheckOut:{en:'Please confirm your departure time with the host before your stay.',de:'Bitte klären Sie Ihre Abreisezeit vor dem Aufenthalt.'},
 fhQuietHours:{en:'Please be considerate of neighbors, especially at night.',de:'Bitte nehmen Sie Rücksicht auf Nachbarn, besonders nachts.'},
 fhExtraGuests:{en:'Only registered guests may stay overnight. Visitors need advance approval.',de:'Nur angemeldete Gäste dürfen übernachten. Besucher benötigen vorherige Zustimmung.'},
 fhFacilities:{en:'Wi-Fi\nShared kitchen access\nLaundry (additional charge)\nGarden access\nHeating\nTV',de:'WLAN\nGemeinschaftsküche\nWäschewaschen (gegen Gebühr)\nGarten\nHeizung\nFernseher'},
 fhAboutBody:{en:'FrankiHolz welcomes guests to private rooms in a shared apartment in the heart of Frankfurt-Sachsenhausen. Here, authentic hospitality meets the freedom to explore the city.',de:'FrankiHolz bietet Privatzimmer in einer Wohngemeinschaft in Frankfurt-Sachsenhausen. Herzliche Gastfreundschaft und viel Freiheit, die Stadt zu entdecken.'},
 fhContactPhone:{en:'+49 176 62493 041',de:'+49 176 62493 041'}
};
const appear={hidden:{opacity:0,y:28},visible:{opacity:1,y:0}};
function Reveal({children,className='',delay=0}:{children:React.ReactNode;className?:string;delay?:number}){
 const reduced=useReducedMotion();
 return <motion.div className={className} variants={appear} initial={reduced?false:'hidden'} whileInView="visible" viewport={{once:true,amount:.1}} transition={{duration:reduced?0:.8,delay,ease:[.22,1,.36,1]}}>{children}</motion.div>;
}
function PhoneBadge({number}:{number:string}){
 const digits=number.replace(/\D/g,'');
 return <a href={'https://wa.me/'+digits} target="_blank" rel="noopener noreferrer" className="whatsapp-pill" aria-label="Chat with FrankiHolz on WhatsApp"><img src="/assets/whatsapp.svg" width="22" height="22" alt="" aria-hidden="true"/> WhatsApp <ArrowUpRight size={15}/></a>;
}
export function SiteShell(){
 const [lang,setLang]=useState<Lang>('en');
 const t=labels[lang],de=lang==='de';
 const [menuOpen,setMenuOpen]=useState(false),[ready,setReady]=useState(false);
 const [rooms,setRooms]=useState<Room[]>([]),[images,setImages]=useState<RoomImage[]>([]);
 const [settings,setSettings]=useState<SiteSettings>({});
 const [info,setInfo]=useState<Info>({});
 const [bookRoom,setBookRoom]=useState<Room|null>(null),[activeQuestion,setActiveQuestion]=useState<number|null>(0);
 const [mapLoaded,setMapLoaded]=useState(false);
 const [scrolled,setScrolled]=useState(false);
 const reduce=useReducedMotion();
 const {scrollYProgress}=useScroll();
 const heroShift=useTransform(scrollYProgress,[0,.26],['0%','17%']);
 const roomPictures=useMemo(()=>rooms.map(r=>images.filter(x=>x.room_id===r.id).sort((a,b)=>a.sort_order-b.sort_order).map(x=>mediaUrl(x.storage_path))),[rooms,images]);
 const photo=roomPictures.flat().find(Boolean)||fallbackHero;
 const heroUrl=settings.hero_storage_path?mediaUrl(settings.hero_storage_path):photo;
 const infoText=(key:string)=>info[key]||defaults[key]?.[lang]||'';
 const phone=infoText('fhContactPhone').replace(/[^+\d ]/g,'');
 useEffect(()=>{
  const url=new URLSearchParams(location.search).get('lang');
  const stored=localStorage.getItem('frankiholz-v2-lang');
  const nextLang:Lang=url==='de'||(!url&&stored==='de')?'de':'en';
  setLang(nextLang);
  const sc=()=>setScrolled(scrollY>30);
  window.addEventListener('scroll',sc,{passive:true});return()=>window.removeEventListener('scroll',sc);
 },[]);
 useEffect(()=>{
  document.documentElement.lang=lang;
  localStorage.setItem('frankiholz-v2-lang',lang);
 },[lang]);
 useEffect(()=>{
  let closed=false;
  const load=async()=>{
   let sb=client();for(let i=0;!sb&&i<15;i++){await new Promise(r=>setTimeout(r,170));sb=client()}
   if(!sb){if(!closed)setReady(true);return}
   const [rr,ii,ss,cc]=await Promise.all([
      sb.from('frankiholz_rooms').select('*').eq('active',true).order('sort_order'),
      sb.from('frankiholz_room_images').select('*').order('sort_order'),
      sb.from('frankiholz_site_settings').select('hero_storage_path').eq('id',1).maybeSingle(),
      sb.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key',Object.keys(defaults))
   ]);
   if(closed)return;
   setRooms((rr.data||[]) as Room[]);setImages((ii.data||[]) as RoomImage[]);
   setSettings((ss.data||{}) as SiteSettings);
   const result:Info={};
   (cc.data||[]).forEach(r=>{const value=lang==='de'?r.text_de:r.text_en;if(value?.trim())result[r.copy_key]=value.trim()});
   setInfo(result);setReady(true);
  };
  void load();return()=>{closed=true}
 },[lang]);
 const chooseLang=(next:Lang)=>{setLang(next);setMenuOpen(false);const u=new URL(location.href);u.searchParams.set('lang',next);history.replaceState({},'',u.pathname+u.search+u.hash)};
 const amenities=infoText('fhFacilities').split('\n').filter(Boolean);
 const highlights=[Wifi,CookingPot,WashingMachine,Flower2,Sun,Tv];
 const faqs=[
  {q:de?'Wann kann ich anreisen?':'When can I check in?',a:infoText('fhCheckIn')},
  {q:de?'Wann erfolgt die Abreise?':'What about check-out?',a:infoText('fhCheckOut')},
  {q:de?'Gibt es Ruhezeiten?':'What are the quiet hours?',a:infoText('fhQuietHours')},
  {q:de?'Kann ich Gäste mitbringen?':'Can I bring additional guests?',a:infoText('fhExtraGuests')}
 ];
 const openBooking=(room?:Room)=>{if(rooms.length)setBookRoom(room||rooms[0]);else document.getElementById('rooms')?.scrollIntoView({behavior:'smooth'})};
 return <><div className="site-root">
  <header className={'nav-shell'+(scrolled?' is-scrolled':'')}>
    <div className="nav-container">
      <Link href="/" className="nav-logo" aria-label="FrankiHolz homepage"><img src="/assets/frankiholz-logo-for-dark.png" width={156} height={74} alt="FrankiHolz — Your stay in Frankfurt"/></Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <a href="#rooms">{t.rooms}</a><a href="#experience">{t.experience}</a><a href="#reviews">{t.reviews}</a><a href="#location">{t.location}</a>
      </nav>
      <div className="nav-right"><div className="language-toggle" aria-label="Choose language"><button className={lang==='en'?'selected':''} onClick={()=>chooseLang('en')} aria-pressed={lang==='en'}>EN</button><button className={lang==='de'?'selected':''} onClick={()=>chooseLang('de')} aria-pressed={lang==='de'}>DE</button></div>
        <button className="nav-cta" onClick={()=>openBooking()}>{t.reserve}<ArrowUpRight size={16}/></button>
        <button className="mobile-toggle" aria-expanded={menuOpen} aria-label="Open menu" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
      </div>
    </div>
    <AnimatePresence>{menuOpen&&<motion.nav className="mobile-menu" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} aria-label="Mobile navigation">
      {[['#rooms',t.rooms],['#experience',t.experience],['#reviews',t.reviews],['#location',t.location]].map(([href,label])=><a key={href} href={href} onClick={()=>setMenuOpen(false)}>{label}<ArrowUpRight size={17}/></a>)}<button onClick={()=>{setMenuOpen(false);openBooking()}}>{t.reserve}<ArrowRight/></button>
    </motion.nav>}</AnimatePresence>
  </header>
  <main id="main">
    <section className="hero-v2" aria-label="Welcome to FrankiHolz">
      <motion.div className="hero-photo" style={{backgroundImage:'url('+heroUrl+')',y:heroShift}} />
      <div className="hero-wash"/>
      <div className="shell hero-inner"><motion.div className="hero-copy" initial={reduce?false:{opacity:0,y:36}} animate={{opacity:1,y:0}} transition={{duration:1,ease:[.22,1,.36,1]}}>
        <div className="hero-eyebrow"><span className="hero-eyebrow-dot"/><span>{t.heroKicker}</span></div>
        <h1>{t.heroTitle}</h1>
        <p>{t.heroSub}</p>
        <div className="hero-actions"><button className="btn btn-cream" onClick={()=>openBooking()}>{t.reserve}<ArrowUpRight size={20}/></button><a className="hero-underlink" href="#rooms">{t.explore}<ArrowRight size={18}/></a></div>
      </motion.div>
      <motion.div className="hero-aside" initial={reduce?false:{opacity:0,x:24}} animate={{opacity:1,x:0}} transition={{duration:1,delay:.32}}>
        <div className="vertical-index"><span>50°06' N — 08°41' E</span><span>FRANKFURT / SACHSENHAUSEN</span></div>
        <div className="hero-location"><MapPin size={18}/><span>Seehofstraße 20<br/><small>60594 Frankfurt am Main</small></span></div>
      </motion.div>
      <a href="#rooms" className="hero-scroll"><span>{t.scroll}</span><span className="scroll-line"><ArrowDown size={17}/></span></a>
      </div>
      <div className="hero-bottomline"><div className="shell"><span>FRANKIHOLZ / EST. FRANKFURT</span><span>{de?'PRIVATZIMMER · PERSÖNLICH GEHOSTET':'PRIVATE ROOMS · PERSONALLY HOSTED'}</span><span>01 — 04</span></div></div>
    </section>
    <div className="trust-rail"><div className="shell trust-items"><div><ShieldCheck size={20}/><span>{de?'Persönlich betreut':'Personally hosted'}</span></div><div><Sparkles size={20}/><span>{de?'Mit Liebe zum Detail':'Thoughtful little details'}</span></div><div><MapPin size={20}/><span>Frankfurt-Sachsenhausen</span></div><div><Clock size={20}/><span>{de?'Direkte Buchungsanfrage':'Direct booking requests'}</span></div></div></div>
    <section className="section-space rooms-section" id="rooms"><div className="shell">
      <Reveal><SectionHeading eyebrow={de?'01 / IHR ZUHAUSE':'01 / YOUR PLACE'} title={de?'Zimmer mit Charakter.':'Rooms with a little more soul.'} subtitle={de?'Drei individuelle Zimmer. Ein entspannter Ausgangspunkt für Frankfurt.':'Three distinct spaces. One easy starting point for discovering Frankfurt.'}/></Reveal>
      <div className="rooms-grid">
       {!ready&&Array.from({length:3},(_,i)=><div key={i} className="room-card room-skeleton"/>)}
       {ready&&rooms.length===0&&<div className="empty-rooms"><p>{de?'Zimmer werden geladen oder sind gerade nicht verfügbar.':'Room details are temporarily unavailable.'}</p><a href="#contact">{t.contact}<ArrowRight size={15}/></a></div>}
       {rooms.map((room,i)=>{
        const pictures=roomPictures[i]||[];
        const image=pictures[0];
        const desc=de?(room.description_de||room.description):(room.description||room.description_de);
        return <Reveal key={room.id} delay={i*.085}><article className="room-card">
          <div className="room-image-wrap"><div className="room-photo" style={{backgroundImage:image?'url('+image+')':undefined}} aria-label={room.name} role="img">{!image&&<div className="fallback-photo"><Home size={65} strokeWidth={.8}/></div>}</div><span className="room-number">0{i+1} / 03</span><span className="room-photo-count">{pictures.length?String(pictures.length).padStart(2,'0')+' PHOTOS':'PRIVATE ROOM'}</span></div>
          <div className="room-description"><div className="room-meta"><span><Users size={14}/>{de?'Bis zu':'Up to'} {room.max_guests} {de?'Gäste':'guests'}</span><span><Check size={14}/>{de?'Privatzimmer':'Private room'}</span></div>
            <h3>{de?(room.name_de||room.name):room.name}</h3><p>{desc}</p><div className="room-divider"/><div className="room-footer"><div><small>{t.from}</small><strong>{formatEuro(room.base_price,lang)}</strong><small> / {t.night}</small></div><button className="round-arrow" aria-label={'Book '+room.name} onClick={()=>openBooking(room)}><ArrowUpRight/></button></div>
          </div></article></Reveal>
       })}
      </div>
    </div></section>
    <section className="experience-section section-space" id="experience"><div className="shell experience-layout">
      <Reveal className="experience-image"><div className="experience-photo" style={{backgroundImage:'url('+photo+')'}}/><div className="floating-caption"><span>THE FRANKIHOLZ WAY</span><Star size={21} fill="currentColor"/></div><div className="experience-smallmark">F<span>H</span></div></Reveal>
      <Reveal className="experience-copy"><span className="micro-label">{de?'02 / ANKOMMEN & WOHLFÜHLEN':'02 / STAY A LITTLE LONGER'}</span><h2>{t.about}</h2><p>{infoText('fhAboutBody')||t.aboutDescription}</p><div className="experience-bullets"><div><span>01</span><p>{de?'Persönlicher Kontakt statt anonymer Buchung.':'Real people, not a faceless check-in.'}</p></div><div><span>02</span><p>{de?'Alles Wichtige für einen angenehmen Aufenthalt.':'Everyday comforts, without the fuss.'}</p></div><div><span>03</span><p>{de?'Ein Zuhause auf Zeit, mitten in der Stadt.':'A home base with Frankfurt on your doorstep.'}</p></div></div><a className="text-link" href="#amenities">{de?'Ausstattung entdecken':'Discover our amenities'} <ArrowUpRight size={19}/></a></Reveal>
    </div></section>
    <section id="amenities" className="amenities-section section-space"><div className="shell">
      <Reveal><SectionHeading eyebrow={de?'03 / GUT ZU WISSEN':'03 / THE LITTLE THINGS'} title={t.amenities} subtitle={de?'Von WLAN bis Gemeinschaftsküche – alles, was zählt.':'The simple comforts that make a stay feel easy.'}/></Reveal>
      <div className="amenities-grid">{amenities.map((name,i)=>{const I=highlights[i%highlights.length];return <Reveal key={name} delay={i*.045}><div className="amenity"><div className="amenity-icon"><I size={26} strokeWidth={1.4}/></div><span>{name}</span><ArrowUpRight size={14} className="amenity-corner"/></div></Reveal>})}</div>
    </div></section>
    <ReviewCarousel lang={lang}/>
    <section className="rules-section section-space" id="rules"><div className="shell rules-layout"><Reveal><div><span className="micro-label">{de?'04 / VOR DEM AUFENTHALT':'04 / BEFORE YOU ARRIVE'}</span><h2>{t.rules}</h2><p>{de?'Damit sich alle wohlfühlen, ein paar Hinweise für Ihren Aufenthalt.':'A few thoughtful guidelines to make your stay comfortable for everyone.'}</p><a href="#contact" className="text-link">{de?'Noch Fragen? Schreiben Sie uns':'Questions? Just ask'}<ArrowUpRight size={18}/></a></div></Reveal><Reveal><div className="faq-list">{faqs.map((f,i)=><div className={'faq-item'+(activeQuestion===i?' is-open':'')} key={f.q}><button aria-expanded={activeQuestion===i} onClick={()=>setActiveQuestion(activeQuestion===i?null:i)}><span>0{i+1}</span><strong>{f.q}</strong><ChevronDown size={19}/></button><AnimatePresence>{activeQuestion===i&&<motion.div initial={reduce?false:{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={reduce?{}:{height:0,opacity:0}}><p>{f.a}</p></motion.div>}</AnimatePresence></div>)}</div></Reveal></div></section>
    <section id="location" className="location-section-v2 section-space"><div className="shell location-grid"><Reveal><div className="location-copy"><span className="micro-label light">{de?'05 / UNSER STANDORT':'05 / THE NEIGHBORHOOD'}</span><h2>{de?'Mitten drin. Und ganz bei sich.':'In the city. At your own pace.'}</h2><p>{de?'Seehofstraße 20, 60594 Frankfurt am Main – mitten in Sachsenhausen.':'Seehofstraße 20, 60594 Frankfurt am Main — in the heart of Sachsenhausen.'}</p><a href="https://www.google.com/maps/search/?api=1&query=Seehofstra%C3%9Fe%2020%20Frankfurt" target="_blank" rel="noopener noreferrer" className="btn btn-cream">{de?'Route öffnen':'Get directions'} <ArrowUpRight size={18}/></a></div></Reveal>
    <Reveal><div className="map-card">{mapLoaded?<iframe title="FrankiHolz location" loading="lazy" src="https://www.google.com/maps?q=Seehofstra%C3%9Fe%2020%2C%2060594%20Frankfurt%20am%20Main&output=embed" referrerPolicy="no-referrer-when-downgrade"/>:<div className="map-consent"><MapPin size={37} strokeWidth={1.2}/><strong>50.104° N, 8.691° E</strong><span>{de?'Karte wird erst nach Ihrem Klick geladen.':'The map loads only when you choose to view it.'}</span><button className="btn btn-dark" onClick={()=>setMapLoaded(true)}>{de?'Karte anzeigen':'Show map'} <ArrowUpRight size={16}/></button></div>}</div></Reveal></div></section>
    <section className="contact-section section-space" id="contact"><div className="shell contact-layout"><Reveal><span className="micro-label">{de?'06 / KONTAKT':'06 / SAY HELLO'}</span><h2>{de?'Fragen? Wir sind für Sie da.':'Let's make your stay a good one.'}</h2></Reveal><Reveal className="contact-actions"><p>{t.contactNote}</p><div className="contact-links"><a href={'tel:'+phone.replace(/[^+\d]/g,'')} className="contact-phone"><Phone size={21}/> {phone||'+49 176 62493 041'}</a><PhoneBadge number={phone||'+49 176 62493 041'}/></div></Reveal></div></section>
  </main>
  <footer className="footer-v2"><div className="shell"><div className="footer-main"><div><img src="/assets/frankiholz-logo-for-dark.png" alt="FrankiHolz" width={172} height={86}/><p>{de?'Dein Zuhause auf Zeit in Frankfurt.':'Your stay in Frankfurt, done thoughtfully.'}</p></div><div className="footer-links"><a href="#rooms">{t.rooms}</a><a href="#experience">{t.experience}</a><a href="#reviews">{t.reviews}</a><a href="/booking-status">{t.status}</a><a href="/admin">Host studio</a></div><div className="footer-contact"><span>VISIT US</span><strong>Seehofstraße 20<br/>60594 Frankfurt am Main</strong><a href={'tel:'+phone.replace(/[^+\d]/g,'')}>{phone}</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} FrankiHolz. Made for a better stay.</span><div><Link href="/impressum">{t.imprint}</Link><Link href="/datenschutz">{t.privacy}</Link><a href="#main">Back to top ↑</a></div></div></div></footer>
  </div><AnimatePresence>{bookRoom&&<BookingPanel room={bookRoom} lang={lang} close={()=>setBookRoom(null)}/>}</AnimatePresence></>;
}
