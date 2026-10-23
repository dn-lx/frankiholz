'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock, Flower2, Home, MapPin, Menu, Phone, ShieldCheck, Sparkles, Star, Sun, Users, Wifi, X, WashingMachine, Tv, CookingPot } from 'lucide-react';
import { BookingPanel } from './booking-panel';
import { Dialog } from './dialog';
import { ReviewCarousel } from './review-carousel';
import { SectionHeading } from './section-heading';
import { client, contactNumber, mediaUrl, fallbackHero, formatEuro } from '@/lib/config';
import { contentFields, houseGuide } from '@/lib/content';
import { labels, type Room, type RoomImage, type Lang, type SiteSettings, type CopyRow } from '@/lib/types';

const orderIds=['fhReviewsBand','roomsSection','hostMessage','guestInfoPublic','bookingSection','location','cancellationPolicy','bookingStatusSection'];
function Reveal({children,className='',delay=0}:{children:React.ReactNode;className?:string;delay?:number}) {
  const ref=useRef<HTMLDivElement>(null),seen=useInView(ref,{once:true,amount:.12}),reduce=useReducedMotion();
  return <motion.div ref={ref} className={className} initial={false} animate={seen&&!reduce?{y:[18,0]}:{y:0}} transition={{duration:.6,delay,ease:[.22,1,.36,1]}}>{children}</motion.div>;
}
function savedOrder(raw:string) {
  try {const value=JSON.parse(raw);if(Array.isArray(value)&&value.length===orderIds.length&&new Set(value).size===orderIds.length&&value.every(x=>orderIds.includes(x)))return value as string[];} catch {}
  return orderIds;
}
export function SiteShell() {
  const [lang,setLang]=useState<Lang>('en'),[hydrated,setHydrated]=useState(false);
  const de=lang==='de',t=labels[lang],reduce=useReducedMotion();
  const [menuOpen,setMenuOpen]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [rooms,setRooms]=useState<Room[]>([]),[images,setImages]=useState<RoomImage[]>([]),[settings,setSettings]=useState<SiteSettings>({}),[copy,setCopy]=useState<CopyRow[]>([]);
  const [bookRoom,setBookRoom]=useState<Room|null>(null),[gallery,setGallery]=useState<Room|null>(null),[photoIndex,setPhotoIndex]=useState(0),[guideOpen,setGuideOpen]=useState(false);
  const [activeQuestion,setActiveQuestion]=useState<number|null>(0),[mapLoaded,setMapLoaded]=useState(false),[scrolled,setScrolled]=useState(false);
  const menuButton=useRef<HTMLButtonElement>(null);
  const rows=useMemo(()=>Object.fromEntries(copy.map(row=>[row.copy_key,row])),[copy]);
  const text=(key:string)=>{
    const row=rows[key],fallback=contentFields.find(f=>f.key===key);
    const value=(de?row?.text_de:row?.text_en)?.trim()||(de?row?.text_en:row?.text_de)?.trim();
    return value||fallback?.[lang]||'';
  };
  const order=savedOrder(text('fhHomepageOrder'));
  const roomName=(r:Room)=>de?(r.name_de||r.name):r.name;
  const roomPictures=(id:string)=>images.filter(i=>i.room_id===id).map(i=>mediaUrl(i.storage_path));
  const photo=roomPictures(rooms[0]?.id)[0]||fallbackHero;
  const heroUrl=settings.hero_storage_path?mediaUrl(settings.hero_storage_path):photo;
  const phone=contactNumber(text('fhContactPhone'));
  const hostPhoto=text('fhHostPhoto');
  const safeHostPhoto=hostPhoto.startsWith('/assets/')?hostPhoto:(()=>{try{const u=new URL(hostPhoto);return u.protocol==='https:'?u.href:'';}catch{return '';}})();
  useEffect(()=>{
    let stored='';try{stored=localStorage.getItem('frankiholz-lang')||localStorage.getItem('frankiholz-v2-lang')||'';}catch{}
    const query=new URLSearchParams(location.search).get('lang');
    setLang(query==='de'||query!=='en'&&(stored==='de'||!stored&&navigator.language.startsWith('de'))?'de':'en');setHydrated(true);
    const scroll=()=>setScrolled(window.scrollY>30);scroll();window.addEventListener('scroll',scroll,{passive:true});return()=>window.removeEventListener('scroll',scroll);
  },[]);
  useEffect(()=>{
    if(!hydrated)return;document.documentElement.lang=lang;
    try{localStorage.setItem('frankiholz-lang',lang);}catch{}
    const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState({},'',url.pathname+url.search+url.hash);
    const title=de?(settings.seo_title_de||settings.seo_title_en):(settings.seo_title_en||settings.seo_title_de);
    const description=de?(settings.seo_description_de||settings.seo_description_en):(settings.seo_description_en||settings.seo_description_de);
    if(title)document.title=title;
    if(description)document.querySelector('meta[name=description]')?.setAttribute('content',description);
  },[lang,hydrated,settings,de]);
  useEffect(()=>{
    let cancelled=false;
    async function load(){
      const sb=client();if(!sb)return;setReady(false);setError('');
      try{
        const [rr,ii,ss,cc]=await Promise.all([
          sb.from('frankiholz_rooms').select('*').eq('active',true).order('sort_order'),
          sb.from('frankiholz_room_images').select('*').order('sort_order').order('created_at'),
          sb.from('frankiholz_site_settings').select('*').eq('id',1).maybeSingle(),
          sb.from('frankiholz_copy').select('copy_key,text_en,text_de'),
        ]);
        if(cancelled)return;
        if(rr.error||ii.error)throw Error('rooms');
        setRooms((rr.data||[]) as Room[]);setImages((ii.data||[]) as RoomImage[]);setSettings((ss.data||{}) as SiteSettings);setCopy((cc.data||[]) as CopyRow[]);
      }catch{if(!cancelled)setError('rooms');}finally{if(!cancelled)setReady(true);}
    }
    void load();return()=>{cancelled=true;};
  },[revision]);
  useEffect(()=>{if(!menuOpen)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenuOpen(false);menuButton.current?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[menuOpen]);
  const chooseLang=(next:Lang)=>{setLang(next);setMenuOpen(false);};
  const openBooking=(room?:Room)=>{if(rooms.length)setBookRoom(room||rooms[0]);else document.getElementById('roomsSection')?.scrollIntoView({behavior:reduce?'instant':'smooth'});};
  const faqs=[
    {q:de?'Wann kann ich anreisen?':'When can I check in?',a:text('fhCheckIn')},
    {q:de?'Wann erfolgt die Abreise?':'What about check-out?',a:text('fhCheckOut')},
    {q:de?'Was ist bei der Heizung zu beachten?':'How should I use the heating?',a:text('fhHeatingRule')},
    {q:de?'Gibt es Ruhezeiten?':'What are the quiet hours?',a:text('fhQuietHours')},
    {q:de?'Kann ich Gäste mitbringen?':'Can I bring additional guests?',a:text('fhExtraGuests')},
    {q:de?'Was sollte ich noch wissen?':'Anything else to know?',a:text('fhOtherRules')},
  ];
  const icons=[Wifi,CookingPot,WashingMachine,Flower2,Sun,Tv];
  const sections:Record<string,React.ReactNode>={
    fhReviewsBand:<ReviewCarousel lang={lang} custom={text('fhHeroReviews')} listing={text('fhAirbnbReviewsUrl')} rating={text('fhAirbnbRating')} count={text('fhAirbnbCount')}/>,
    roomsSection:<section className="section-space rooms-section" id="roomsSection"><span id="rooms" className="anchor-target"/><div className="shell">
      <Reveal><SectionHeading eyebrow={de?'01 / IHR ZUHAUSE':'01 / YOUR PLACE'} title={de?'Zimmer mit Charakter.':'Rooms with a little more soul.'} subtitle={de?'Individuelle Privatzimmer. Ein entspannter Ausgangspunkt für Frankfurt.':'Individual private rooms. An easy starting point for discovering Frankfurt.'}/></Reveal>
      {!ready&&<p role="status">{de?'Zimmer werden geladen …':'Finding your room…'}</p>}
      {ready&&(error||!rooms.length)&&<div className="empty-rooms"><p>{error?(de?'Die Zimmer konnten gerade nicht geladen werden.':'We couldn’t load the rooms just now.'):(de?'Derzeit sind keine Zimmer verfügbar.':'No rooms are currently available.')}</p>{error&&<button className="btn btn-dark" onClick={()=>setRevision(n=>n+1)}>{de?'Erneut versuchen':'Try again'}</button>}<a href="#contact">{t.contact}<ArrowRight size={15}/></a></div>}
      <div className="rooms-grid">{rooms.map((room,i)=>{const pictures=roomPictures(room.id);return <Reveal key={room.id} delay={i*.05}><article className="room-card">
        <button className="room-image-wrap gallery-open" aria-label={(de?'Fotos ansehen: ':'View photos: ')+roomName(room)} disabled={!pictures.length} onClick={()=>{setGallery(room);setPhotoIndex(0);}}>{pictures[0]?<img className="room-photo-img" src={pictures[0]} alt={roomName(room)} loading="lazy"/>:<div className="fallback-photo"><Home size={60} strokeWidth={1}/><span>{de?'Fotos folgen':'Photos coming soon'}</span></div>}<span className="room-number">{String(i+1).padStart(2,'0')} / {String(rooms.length).padStart(2,'0')}</span><span className="room-photo-count">{pictures.length?`${pictures.length} ${de?'FOTOS':'PHOTOS'}`:(de?'PRIVATZIMMER':'PRIVATE ROOM')}</span></button>
        <div className="room-description"><div className="room-meta"><span><Users size={14}/>{de?'Bis zu':'Up to'} {room.max_guests} {de?'Gäste':'guests'}</span><span><Check size={14}/>{de?'Privatzimmer':'Private room'}</span></div><h3>{roomName(room)}</h3><p>{de?(room.description_de||room.description):(room.description||room.description_de)}</p><div className="room-divider"/><div className="room-footer"><div><small>{t.from}</small><strong>{formatEuro(room.base_price,lang)}</strong><small> / {t.night}</small></div><button className="round-arrow" aria-label={(de?'Buchen: ':'Book ')+roomName(room)} onClick={()=>openBooking(room)}><ArrowUpRight/></button></div></div>
      </article></Reveal>;})}</div></div></section>,
    hostMessage:<section className="experience-section section-space" id="hostMessage"><span id="experience" className="anchor-target"/><div className="shell experience-layout"><Reveal className="experience-image"><div className="experience-photo" style={{backgroundImage:`url('${photo}')`}}/><div className="floating-caption"><span>THE FRANKIHOLZ WAY</span><Star size={21} fill="currentColor"/></div></Reveal><Reveal className="experience-copy"><span className="micro-label">{de?'02 / PERSÖNLICH WILLKOMMEN':'02 / A PERSONAL WELCOME'}</span><h2>{text('fhHostTitle')}</h2><div className="host-byline">{safeHostPhoto&&<img src={safeHostPhoto} width={64} height={64} alt={text('fhHostName')} loading="lazy"/>}<div><strong>{text('fhHostName')}</strong><span>{text('fhHostRole')}</span></div></div>{text('fhHostBody').split(/\n\s*\n/).map((paragraph,i)=><p key={i}>{paragraph}</p>)}<a className="text-link" href="#contact">{t.contact}<ArrowUpRight size={18}/></a></Reveal></div></section>,
    guestInfoPublic:<section id="guestInfoPublic"><section id="amenities" className="amenities-section section-space"><div className="shell"><Reveal><SectionHeading eyebrow={de?'03 / DIE KLEINEN DINGE':'03 / THE LITTLE THINGS'} title={t.amenities} subtitle={de?'Gemeinsam genutzte Räume. Persönlicher Freiraum. Fragen Sie uns, wenn eine Ausstattung für Ihren Aufenthalt besonders wichtig ist.':'Shared spaces. Your own pace. Ask us if a particular amenity is essential to your stay.'}/></Reveal><div className="amenities-grid">{text('fhFacilities').split('\n').filter(Boolean).map((name,i)=>{const Icon=icons[i%icons.length];return <Reveal key={name}><div className="amenity"><div className="amenity-icon"><Icon size={26} strokeWidth={1.4}/></div><span>{name}</span></div></Reveal>;})}</div><div className="about-note"><h3>{text('fhAboutTitle')}</h3><p>{text('fhAboutBody')}</p></div></div></section>
      <section className="rules-section section-space" id="houseRules"><span id="rules" className="anchor-target"/><div className="shell rules-layout"><Reveal><span className="micro-label">{de?'04 / VOR DEM AUFENTHALT':'04 / BEFORE YOU ARRIVE'}</span><h2>{t.rules}</h2><p>{de?'Ein paar Hinweise, damit sich alle bei uns wohlfühlen.':'A few thoughtful guidelines to make your stay comfortable for everyone.'}</p><button className="btn btn-dark" onClick={()=>setGuideOpen(true)}>{de?'Hausregeln lesen':'Read the house guide'}<ArrowUpRight size={17}/></button><a className="guide-pdf text-link" href="/assets/documents/frankiholz-house-guide.pdf" target="_blank" rel="noopener noreferrer">{de?'PDF öffnen (EN/DE)':'Open PDF (EN/DE)'}</a></Reveal><Reveal><div className="faq-list">{faqs.map((item,i)=><div className={'faq-item'+(activeQuestion===i?' is-open':'')} key={item.q}><button aria-expanded={activeQuestion===i} aria-controls={'rule-'+i} onClick={()=>setActiveQuestion(activeQuestion===i?null:i)}><span>0{i+1}</span><strong>{item.q}</strong><ChevronDown size={19}/></button><div id={'rule-'+i} hidden={activeQuestion!==i}><p>{item.a}</p></div></div>)}</div></Reveal></div></section>
      <section className="contact-section section-space" id="contact"><div className="shell contact-layout"><Reveal><span className="micro-label">{de?'KONTAKT / SCHREIBEN SIE UNS':'SAY HELLO / YOUR HOST'}</span><h2>{de?'Fragen? Wir sind für Sie da.':'Let’s make your stay a good one.'}</h2></Reveal><Reveal className="contact-actions"><p>{t.contactNote}</p><div className="contact-links">{phone&&<><a href={'tel:'+phone} className="contact-phone"><Phone size={21}/>{text('fhContactPhone')}</a><a href={'https://wa.me/'+phone.slice(1)} target="_blank" rel="noopener noreferrer" className="whatsapp-pill"><img src="/assets/whatsapp.svg" width={22} height={22} alt=""/>WhatsApp<ArrowUpRight size={15}/></a></>}<a href="mailto:info@frankiflow.de">info@frankiflow.de</a></div></Reveal></div></section></section>,
    bookingSection:<section id="bookingSection" className="booking-invitation"><div className="shell"><CalendarDays size={32}/><div><h2>{de?'Ihr nächster Aufenthalt beginnt hier.':'Your next stay starts here.'}</h2><p>{de?'Reisedaten wählen, Verfügbarkeit prüfen und direkt anfragen.':'Choose your dates, check availability, and request your room directly.'}</p></div><button className="btn btn-cream" onClick={()=>openBooking()}>{t.reserve}<ArrowUpRight size={18}/></button></div></section>,
    location:<section id="location" className="location-section-v2 section-space"><div className="shell location-grid"><Reveal><div className="location-copy"><span className="micro-label light">{de?'05 / UNSER STANDORT':'05 / THE NEIGHBORHOOD'}</span><h2>{de?'Mitten drin. Und ganz bei sich.':'In the city. At your own pace.'}</h2><p>Seehofstraße 20, 60594 Frankfurt am Main — Sachsenhausen.</p><a href="https://www.google.com/maps/search/?api=1&query=Seehofstra%C3%9Fe%2020%20Frankfurt" target="_blank" rel="noopener noreferrer" className="btn btn-cream">{de?'Route öffnen':'Get directions'}<ArrowUpRight size={18}/></a></div></Reveal><Reveal><div className="map-card">{mapLoaded?<iframe title={de?'FrankiHolz Standort':'FrankiHolz location'} loading="lazy" src="https://www.google.com/maps?q=Seehofstra%C3%9Fe%2020%2C%2060594%20Frankfurt%20am%20Main&output=embed" referrerPolicy="no-referrer"/>:<div className="map-consent"><MapPin size={37} strokeWidth={1.2}/><strong>50.104° N, 8.691° E</strong><span>{de?'Die Karte wird erst nach Ihrem Klick geladen. Dabei werden Daten an Google übermittelt.':'The map loads only when you choose. Loading it shares request data with Google.'}</span><button className="btn btn-dark" onClick={()=>setMapLoaded(true)}>{de?'Karte anzeigen':'Show map'}<ArrowUpRight size={16}/></button></div>}</div></Reveal></div></section>,
    cancellationPolicy:<section id="cancellationPolicy" className="section-space policy-section"><div className="shell"><span className="micro-label">{de?'KLARE BEDINGUNGEN':'CLEAR EXPECTATIONS'}</span><h2>{de?'Einfach planen. Klar entscheiden.':'Plan easily. Know where you stand.'}</h2><div className="policy-columns"><div><ShieldCheck/><h3>{de?'Mehr als 14 Tage vor Anreise':'More than 14 days before arrival'}</h3><p>{de?'Bei Stornierung erhalten Sie eine volle Erstattung. Wurde Ihre Karte noch nicht belastet, erfolgt keine Belastung.':'Cancel for a full refund. If your card has not been charged, no charge is made.'}</p></div><div><Clock/><h3>{de?'Innerhalb von 14 Tagen vor Anreise':'Within 14 days of arrival'}</h3><p>{de?'Die Buchung ist nicht erstattungsfähig. Bestätigte Aufenthalte werden 14 Tage vor Anreise belastet oder bei späterer Bestätigung sofort.':'Bookings are non-refundable. Confirmed stays are charged 14 days before arrival, or on confirmation when arrival is sooner.'}</p></div></div><p className="policy-footnote">{de?'Ihre Karte wird sicher bei Stripe hinterlegt. FrankiHolz speichert Ihre Kartennummer nicht. Eine Anfrage bedarf der Bestätigung durch den Gastgeber.':'Your card is saved securely with Stripe. FrankiHolz never stores your card number. Your request needs host confirmation.'}</p></div></section>,
    bookingStatusSection:<section id="bookingStatusSection" className="section-space status-invitation"><div className="shell"><span className="micro-label">{de?'NACH IHRER ANFRAGE':'AFTER YOUR REQUEST'}</span><h2>{de?'Alle Details. An einem Ort.':'Every detail. In one place.'}</h2><p>{de?'Buchungsbestätigung, Zahlungsstatus und geplante Belastung mit Referenz und E-Mail abrufen.':'Check your booking confirmation, payment status and scheduled charge using your reference and email.'}</p><Link className="btn btn-dark" href={'/booking-status?lang='+lang}>{t.status}<ArrowRight size={18}/></Link></div></section>,
  };
  const heroTitle=(de?settings.hero_title_de:settings.hero_title)||t.heroTitle;
  const heroSub=(de?settings.hero_subtitle_de:settings.hero_subtitle)||t.heroSub;
  return <><div className="site-root"><header className={'nav-shell'+(scrolled?' is-scrolled':'')}><div className="nav-container"><Link href="/" className="nav-logo" aria-label="FrankiHolz homepage"><img src="/assets/images/frankiholz-logo-dark-384.webp" width={156} height={74} alt="FrankiHolz — Your stay in Frankfurt"/></Link><nav className="nav-links" aria-label={de?'Hauptnavigation':'Primary navigation'}><a href="#roomsSection">{t.rooms}</a><a href="#hostMessage">{t.experience}</a><a href="#fhReviewsBand">{t.reviews}</a><a href="#location">{t.location}</a></nav><div className="nav-right"><div className="language-toggle" aria-label={t.language}><button aria-pressed={lang==='en'} className={lang==='en'?'selected':''} onClick={()=>chooseLang('en')}>EN</button><button aria-pressed={lang==='de'} className={lang==='de'?'selected':''} onClick={()=>chooseLang('de')}>DE</button></div><button className="nav-cta" onClick={()=>openBooking()}>{t.reserve}<ArrowUpRight size={16}/></button><button ref={menuButton} className="mobile-toggle" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen?(de?'Menü schließen':'Close menu'):(de?'Menü öffnen':'Open menu')} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button></div></div><AnimatePresence>{menuOpen&&<motion.nav id="mobile-menu" className="mobile-menu" initial={reduce?false:{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={reduce?{}:{height:0,opacity:0}} aria-label="Mobile navigation">{[['#roomsSection',t.rooms],['#hostMessage',t.experience],['#fhReviewsBand',t.reviews],['#location',t.location]].map(([href,label])=><a key={href} href={href} onClick={()=>setMenuOpen(false)}>{label}<ArrowUpRight size={17}/></a>)}</motion.nav>}</AnimatePresence></header>
    <main id="main"><section className="hero-v2" aria-label={de?'Willkommen bei FrankiHolz':'Welcome to FrankiHolz'}><div className="hero-photo" style={{backgroundImage:`url('${heroUrl}')`}}/><div className="hero-wash"/><div className="shell hero-inner"><Reveal className="hero-copy"><div className="hero-eyebrow"><span className="hero-eyebrow-dot"/><span>{t.heroKicker}</span></div><h1>{heroTitle}</h1><p>{heroSub}</p><div className="hero-actions"><button className="btn btn-cream" onClick={()=>openBooking()}>{t.reserve}<ArrowUpRight size={20}/></button><a className="hero-underlink" href="#roomsSection">{t.explore}<ArrowRight size={18}/></a></div></Reveal><div className="hero-aside"><div className="vertical-index"><span>50°06' N — 08°41' E</span><span>FRANKFURT / SACHSENHAUSEN</span></div><div className="hero-location"><MapPin size={18}/><span>Seehofstraße 20<br/><small>60594 Frankfurt am Main</small></span></div></div><a href="#roomsSection" className="hero-scroll"><span>{t.scroll}</span><span className="scroll-line"><ArrowDown size={17}/></span></a></div><div className="hero-bottomline"><div className="shell"><span>FRANKIHOLZ / YOUR STAY IN FRANKFURT</span><span>{de?'PRIVATZIMMER · PERSÖNLICH GEHOSTET':'PRIVATE ROOMS · PERSONALLY HOSTED'}</span><span>01 — 06</span></div></div></section>
      <div className="trust-rail"><div className="shell trust-items"><div><ShieldCheck size={20}/><span>{de?'Persönlich betreut':'Personally hosted'}</span></div><div><Sparkles size={20}/><span>{de?'Mit Liebe zum Detail':'Thoughtful little details'}</span></div><div><MapPin size={20}/><span>Frankfurt-Sachsenhausen</span></div><div><Clock size={20}/><span>{de?'Direkte Buchungsanfrage':'Direct booking requests'}</span></div></div></div>
      {order.map(id=><div key={id} className="homepage-slot" data-section-id={id}>{sections[id]}</div>)}
    </main><footer className="footer-v2"><div className="shell"><div className="footer-main"><div><img src="/assets/images/frankiholz-logo-dark-384.webp" alt="FrankiHolz" width={172} height={86} loading="lazy"/><p>{de?'Ihr Zuhause auf Zeit in Frankfurt.':'Your stay in Frankfurt, done thoughtfully.'}</p></div><nav className="footer-links" aria-label={de?'Weitere Links':'More links'}><a href="#roomsSection">{t.rooms}</a><a href="#houseRules">{t.rules}</a><Link href={'/booking-status?lang='+lang}>{t.status}</Link><Link href="/admin">{de?'Gastgeber-Studio':'Host studio'}</Link></nav><div className="footer-contact"><span>{de?'BESUCHEN SIE UNS':'VISIT US'}</span><strong>Seehofstraße 20<br/>60594 Frankfurt am Main</strong>{phone&&<a href={'tel:'+phone}>{text('fhContactPhone')}</a>}<a href="mailto:info@frankiflow.de">info@frankiflow.de</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} FrankiHolz</span><div><Link href="/impressum">{t.imprint}</Link><Link href="/datenschutz">{t.privacy}</Link><a href="#main">{de?'Nach oben ↑':'Back to top ↑'}</a></div></div></div></footer></div>
    <AnimatePresence>{bookRoom&&<BookingPanel room={bookRoom} lang={lang} onLanguageChange={chooseLang} close={()=>setBookRoom(null)}/>}</AnimatePresence>
    {gallery&&<Dialog title={roomName(gallery)} close={()=>setGallery(null)} className="gallery-dialog"><img className="gallery-photo" src={roomPictures(gallery.id)[photoIndex]} alt={roomName(gallery)+' '+(photoIndex+1)}/><div className="gallery-thumbnails">{roomPictures(gallery.id).map((url,i)=><button key={url} aria-label={(de?'Foto ':'Photo ')+(i+1)} aria-pressed={photoIndex===i} onClick={()=>setPhotoIndex(i)}><img src={url} alt=""/></button>)}</div><button className="btn btn-dark" onClick={()=>{setGallery(null);setBookRoom(gallery);}}>{t.reserve}<ArrowRight size={18}/></button></Dialog>}
    {guideOpen&&<Dialog title={de?'Ihr Hausguide':'Your house guide'} close={()=>setGuideOpen(false)} className="guide-dialog">{houseGuide[lang].map(section=><section key={section.title}><h3>{section.title}</h3><ul>{section.items.map(item=><li key={item}>{item}</li>)}</ul></section>)}<a className="text-link" href="/assets/documents/frankiholz-house-guide.pdf" target="_blank" rel="noopener noreferrer">{de?'PDF öffnen (EN/DE)':'Open PDF (EN/DE)'}</a></Dialog>}
  </>;
}
