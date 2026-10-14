'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { AnimatePresence,motion,useReducedMotion } from 'motion/react';
import { ArrowLeft,ArrowRight,ArrowUpRight,CalendarDays,CheckCircle2,ChevronDown,ClipboardList,CreditCard,DoorOpen,ExternalLink,FileText,ImagePlus,KeyRound,LayoutDashboard,LoaderCircle,LockKeyhole,LogOut,MapPin,Menu,RefreshCw,Settings,ShieldCheck,SlidersHorizontal,Sparkles,Users,X } from 'lucide-react';
import { client,formatEuro,mediaUrl } from '@/lib/config';
import type { Booking,Room,RoomImage,CopyRow } from '@/lib/types';
type Tab='overview'|'bookings'|'rooms'|'calendar'|'content'|'integrations';
type PayState={environment:'test'|'live';live_ready:boolean;test_ready:boolean;live_verified_at?:string;test_verified_at?:string};
type SiteText={hero_title:string;hero_title_de:string;hero_subtitle:string;hero_subtitle_de:string};
const sections:{key:Tab;label:string;icon:React.ComponentType<{size?:number}>}[]=[
 {key:'overview',label:'Overview',icon:LayoutDashboard},{key:'bookings',label:'Bookings',icon:ClipboardList},{key:'rooms',label:'Rooms',icon:DoorOpen},
 {key:'calendar',label:'Availability',icon:CalendarDays},{key:'content',label:'Website studio',icon:FileText},{key:'integrations',label:'Integrations',icon:SlidersHorizontal}
];
const editableCopy=[
 ['fhCheckIn','Check-in guidance'],['fhCheckOut','Check-out guidance'],['fhQuietHours','Quiet hours'],['fhExtraGuests','Additional guests'],['fhOtherRules','House guidelines'],
 ['fhFacilities','Amenities — one per line'],['fhAboutTitle','About heading'],['fhAboutBody','About us'],['fhContactPhone','Host contact number'],['fhAirbnbReviewsUrl','Airbnb review source URL']
];
export function AdminDashboard(){
 const [session,setSession]=useState<import('@supabase/supabase-js').Session|null>(null);
 const [checking,setChecking]=useState(true),[authorized,setAuthorized]=useState(false),[authError,setAuthError]=useState('');
 const [tab,setTab]=useState<Tab>('overview'),[navOpen,setNavOpen]=useState(false),[busy,setBusy]=useState(false);
 const [rooms,setRooms]=useState<Room[]>([]),[images,setImages]=useState<RoomImage[]>([]);
 const [bookings,setBookings]=useState<Booking[]>([]),[copy,setCopy]=useState<CopyRow[]>([]),[siteText,setSiteText]=useState<SiteText>({hero_title:'',hero_title_de:'',hero_subtitle:'',hero_subtitle_de:''});
 const [pay,setPay]=useState<PayState|null>(null),[feeds,setFeeds]=useState<Record<string,unknown>[]>([]);
 const [note,setNote]=useState(''),[noticeType,setNoticeType]=useState<'ok'|'error'>('ok');
 const [saving,setSaving]=useState(''),[calRoom,setCalRoom]=useState(''),[calFrom,setCalFrom]=useState(''),[calTo,setCalTo]=useState(''),[calState,setCalState]=useState('blocked');
 const [photoFiles,setPhotoFiles]=useState<Record<string,FileList|null>>({});
 const reduced=useReducedMotion();
 const feedback=(message:string,ok=true)=>{setNote(message);setNoticeType(ok?'ok':'error')};
 useEffect(()=>{
   let alive=true;
   const verify=async()=>{
     let sb=client();for(let i=0;!sb&&i<15;i++){await new Promise(r=>setTimeout(r,180));sb=client()}
     if(!sb){if(alive){setChecking(false);feedback('Supabase configuration could not be loaded.',false)}return}
     const {data:{session:s}}=await sb.auth.getSession();
     if(!alive)return;
     if(!s){setSession(null);setAuthorized(false);setChecking(false);return}
     const {data:permission,error}=await sb.rpc('frankiholz_admin_access_check');
     if(!alive)return;
     setSession(s);setAuthorized(!!permission&&!error);setChecking(false);
     if(!permission||error)feedback('Account is not authorized for FrankiHolz.',false);
   };
   void verify();
   return()=>{alive=false}
 },[]);
 const load=async()=>{
  const sb=client();if(!sb||!authorized)return;
  const [a,b,c,d,e,f,g]=await Promise.all([
    sb.from('frankiholz_rooms').select('*').order('sort_order'),
    sb.from('frankiholz_room_images').select('*').order('sort_order'),
    sb.from('frankiholz_bookings').select('*').order('created_at',{ascending:false}).limit(60),
    sb.from('frankiholz_copy').select('copy_key,text_en,text_de').order('sort_order'),
    sb.from('frankiholz_site_settings').select('hero_title,hero_title_de,hero_subtitle,hero_subtitle_de').eq('id',1).maybeSingle(),
    sb.rpc('frankiholz_get_payment_environment_state'),
    sb.from('frankiholz_ical_feeds').select('*')
  ]);
  setRooms((a.data||[]) as Room[]);setImages((b.data||[]) as RoomImage[]);
  setBookings((c.data||[]) as Booking[]);setCopy((d.data||[]) as CopyRow[]);
  if(e.data)setSiteText(e.data as SiteText);setPay(f.data?.[0]||null);
  setFeeds(g.data||[]);
  if(a.data?.length&&!calRoom)setCalRoom(a.data[0].id);
  if(a.error||c.error)feedback('Some Admin data could not be loaded. Please check permissions.',false);
 };
 useEffect(()=>{if(authorized)void load()},[authorized]);
 const login=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setBusy(true);setAuthError('');
  const sb=client();if(!sb){setBusy(false);setAuthError('Configuration unavailable');return}
  const f=new FormData(e.currentTarget);
  const {data,error}=await sb.auth.signInWithPassword({email:String(f.get('email')||''),password:String(f.get('password')||'')});
  if(error||!data.session){setAuthError(error?.message||'Sign in failed');setBusy(false);return}
  const verify=await sb.rpc('frankiholz_admin_access_check');
  if(verify.error||!verify.data){await sb.auth.signOut();setAuthError('This account is not authorized.');setBusy(false);return}
  setSession(data.session);setAuthorized(true);setBusy(false);
 };
 const logout=async()=>{await client()?.auth.signOut();setAuthorized(false);setSession(null);setTab('overview')};
 const chooseTab=(value:Tab)=>{setTab(value);setNavOpen(false);feedback('')};
 const approve=async(b:Booking,action:'accept'|'reject')=>{
   const sb=client();if(!sb)return;
   const prompt=action==='accept'?'Confirm this booking? Depending on check-in date and payment mode, real money may be charged.':'Reject this request? The saved card will be released.';
   if(!confirm(prompt))return;
   const {data:{session}}=await sb.auth.getSession();if(!session){feedback('Sign in again.',false);return}
   setSaving(b.id);try{
    const cfg=window.FRANKIHOLZ_CONFIG;
    if(!cfg)throw new Error('API connection missing');
    const result=await fetch(cfg.supabaseUrl+'/functions/v1/frankiholz-booking-decision',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:cfg.supabaseKey},
      body:JSON.stringify({booking_id:b.id,action})
    });const json=await result.json();
    if(!result.ok)throw new Error(json.error||'Unable to update booking');
    feedback('Booking updated: '+String(json.payment_status||json.status));await load();
   }catch(e){feedback(e instanceof Error?e.message:'Unexpected booking error',false)}finally{setSaving('')}
 };
 const saveRoom=async(room:Room)=>{
  const sb=client();if(!sb)return;setSaving(room.id);
  const payload={name:room.name,name_de:room.name_de,description:room.description,description_de:room.description_de,base_price:Number(room.base_price),max_guests:Number(room.max_guests),active:room.active,updated_at:new Date().toISOString()};
  const {data,error}=await sb.from('frankiholz_rooms').update(payload).eq('id',room.id).select('id,description,description_de').maybeSingle();
  feedback(error?.message||!data?'Could not verify room update.':'Room saved and verified.',!error&&!!data);
  setSaving('');
 };
 const uploadPhoto=async(room:Room)=>{
  const files=photoFiles[room.id];const sb=client();if(!sb||!files?.length)return;
  setSaving(room.id+'-photo');try{
   for(const [i,file] of Array.from(files).entries()){
     if(!file.type.startsWith('image/'))continue;
     const path='rooms/'+room.slug+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
     const a=await sb.storage.from('frankiholz-media').upload(path,file,{upsert:false,contentType:file.type});
     if(a.error)throw a.error;
     const b=await sb.from('frankiholz_room_images').insert({room_id:room.id,storage_path:path,sort_order:images.filter(x=>x.room_id===room.id).length+i});
     if(b.error)throw b.error;
   }
   feedback('Images uploaded.');await load();
  }catch(e){feedback(e instanceof Error?e.message:'Upload error',false)}finally{setSaving('')}
 };
 const removePhoto=async(img:RoomImage)=>{
  const sb=client();if(!sb||!confirm('Delete this room photo?'))return;
  setSaving(img.id);
  const removed=await sb.from('frankiholz_room_images').delete().eq('id',img.id);
  if(!removed.error)await sb.storage.from('frankiholz-media').remove([img.storage_path]);
  feedback(removed.error?.message||'Image removed.',!removed.error);await load();setSaving('');
 };
 const saveCopy=async()=>{
  const sb=client();if(!sb)return;setSaving('copy');
  const rows=copy.map((c,i)=>({copy_key:c.copy_key,label:c.copy_key,sort_order:500+i*10,text_en:c.text_en||'',text_de:c.text_de||'',updated_at:new Date().toISOString()}));
  const {error}=await sb.from('frankiholz_copy').upsert(rows,{onConflict:'copy_key'});
  feedback(error?.message||'Guest information saved.',!error);setSaving('');
 };
 const saveHero=async()=>{
  const sb=client();if(!sb)return;setSaving('hero');
  const {error}=await sb.from('frankiholz_site_settings').update({...siteText,updated_at:new Date().toISOString()}).eq('id',1);
  feedback(error?.message||'Homepage copy saved.',!error);setSaving('');
 };
 const setEnvironment=async(value:'test'|'live')=>{
  const sb=client();if(!sb||!pay||value===pay.environment)return;
  if(value==='live'){
    const okay=window.prompt('LIVE uses real cards and can charge real money after confirmation on BOTH websites. Type LIVE:');
    if(okay!=='LIVE')return;
  }
  setSaving('mode');const {data,error}=await sb.rpc('frankiholz_set_payment_environment',{p_environment:value});
  if(!error) setPay({...pay,environment:value});
  feedback(error?.message||('Stripe environment: '+String(data).toUpperCase()),!error);setSaving('');
 };
 const syncAirbnb=async()=>{
  const sb=client();const cfg=window.FRANKIHOLZ_CONFIG;if(!sb||!cfg)return;setSaving('sync');
  const result=await fetch(cfg.supabaseUrl+'/functions/v1/frankiholz-sync-airbnb',{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.supabaseKey,'x-frankiholz-source':'admin'},body:'{}'});
  feedback(result.ok?'Airbnb calendar sync requested.':'Could not run Airbnb calendar sync.',result.ok);setSaving('');
 };
 const saveCalendar=async(e:React.FormEvent)=>{
  e.preventDefault();const sb=client();if(!sb||!calRoom||!calFrom||!calTo)return;
  if(!confirm('Update room calendar range? Existing confirmed bookings remain protected.'))return;
  setSaving('calendar');
  const {data,error}=await sb.rpc('frankiholz_set_calendar_range',{p_room_id:calRoom,p_start_date:calFrom,p_end_date:calTo,p_status:calState,p_price_override:null,p_note:'Admin v2 studio'});
  feedback(error?.message||String(data)+' calendar dates updated.',!error);setSaving('');
 };
 const editRoom=(id:string,key:keyof Room,value:unknown)=>setRooms(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));
 const editCopy=(key:string,language:'en'|'de',value:string)=>setCopy(old=>old.map(r=>r.copy_key===key?{...r,['text_'+language]:value}:r));
 const payments=bookings.filter(b=>b.status==='confirmed').length,pending=bookings.filter(b=>b.status==='pending').length;
 const current=sections.find(s=>s.key===tab)!;
 if(checking)return <main id="main" className="admin-login-page"><div className="admin-loading"><LoaderCircle className="spin" size={28}/> Checking secure access…</div></main>;
 if(!authorized)return <main id="main" className="admin-login-page"><div className="admin-login-grid"><div className="admin-login-visual"><Link href="/"><img src="/assets/frankiholz-logo-for-dark.png" width={165} alt="FrankiHolz"/></Link><div><span className="micro-label light">FRANKIHOLZ / HOST STUDIO</span><h1>The beautiful details, beautifully managed.</h1><p>A private space to look after your rooms, guests and every little thing in between.</p></div><small>FRANKFURT AM MAIN · 50°06' N</small></div>
 <div className="admin-login-form"><span className="micro-label">SECURE ACCESS / 01</span><h2>Welcome back.</h2><p>Sign in with your authorized FrankiHolz account.</p><form onSubmit={login} className="admin-form"><label>Email<input type="email" name="email" placeholder="you@example.com" required autoComplete="username"/></label><label>Password<input type="password" name="password" required autoComplete="current-password"/></label>{authError&&<p role="alert" className="form-error">{authError}</p>}<button className="btn btn-dark btn-wide" type="submit" disabled={busy}>{busy?'Signing in…':'Open host studio'}<ArrowRight size={18}/></button></form><div className="secure-note"><LockKeyhole size={17}/> Admin access is verified server-side with Supabase RLS.</div><Link href="/" className="back-to-site"><ArrowLeft size={15}/> Back to guest website</Link></div></div></main>;
 return <main id="main" className="admin-v2">
  <aside className={'admin-sidebar'+(navOpen?' is-open':'')}><div className="admin-brand"><Link href="/"><img src="/assets/frankiholz-logo-for-dark.png" width={165} alt="FrankiHolz"/></Link><span>HOST STUDIO <span className="admin-edition">V2</span></span></div>
   <div className="sidebar-section">WORKSPACE</div><nav aria-label="Admin workspace">{sections.map(({key,label,icon:Icon})=><button key={key} className={'sidebar-link'+(tab===key?' active':'')} onClick={()=>chooseTab(key)}><Icon size={18}/><span>{label}</span>{tab===key&&<span className="sidebar-active-dot"/>}</button>)}</nav>
   <div className="sidebar-bottom"><span className="sidebar-connection"><span className="connected-dot"/> SECURE CONNECTION</span><Link href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/> Visit website</Link><button onClick={logout}><LogOut size={17}/> Sign out</button></div>
  </aside>
  <div className="admin-workspace">
   <header className="admin-topbar"><div className="admin-mobile-brand"><button onClick={()=>setNavOpen(!navOpen)} aria-expanded={navOpen} aria-label="Toggle admin menu">{navOpen?<X/>:<Menu/>}</button><strong>FRANKIHOLZ / STUDIO</strong></div><div className="breadcrumb">FRANKIHOLZ <span>/</span> {current.label.toUpperCase()}</div><div className="admin-top-actions"><span className="live-dot"/><span>Connected to host backend</span><button aria-label="Refresh data" onClick={()=>void load()}><RefreshCw size={18}/></button></div></header>
   <div className="admin-main">
    <AnimatePresence mode="wait"><motion.div key={tab} initial={reduced?false:{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={reduced?{}:{opacity:0,y:-8}} transition={{duration:.23}}>
    <div className="admin-page-heading"><div><span className="micro-label">YOUR HOST WORKSPACE</span><h1>{current.label}<span className="admin-orange-dot">.</span></h1><p>Careful control over your space, your guests and your operations.</p></div><button className="admin-refresh" onClick={()=>void load()}><RefreshCw size={16}/> Refresh</button></div>
    {note&&<div className={'admin-notice '+(noticeType==='error'?'is-error':'is-ok')} role="status">{note}<button onClick={()=>setNote('')} aria-label="Dismiss"><X size={15}/></button></div>}
    {tab==='overview'&&<><div className="admin-stat-grid"><div className="stat-card"><span>ACTIVE ROOMS</span><strong>{rooms.filter(r=>r.active).length.toString().padStart(2,'0')}</strong><small>Publicly bookable inventory</small><DoorOpen size={24}/></div><div className="stat-card"><span>PENDING REQUESTS</span><strong>{String(pending).padStart(2,'0')}</strong><small>Awaiting host attention</small><ClipboardList size={24}/></div><div className="stat-card"><span>CONFIRMED</span><strong>{String(payments).padStart(2,'0')}</strong><small>In the latest bookings</small><CheckCircle2 size={24}/></div><div className="stat-card stripe-stat"><span>STRIPE ENVIRONMENT</span><strong>{pay?.environment?.toUpperCase()||'—'}</strong><small>Shared setting across sites</small><CreditCard size={24}/></div></div>
    <div className="admin-columns"><section className="admin-card"><div className="admin-card-heading"><h2>Next on your list</h2><button onClick={()=>chooseTab('bookings')}>All bookings <ArrowRight size={16}/></button></div>{bookings.slice(0,5).map(b=><div className="admin-booking-preview" key={b.id}><div><strong>{b.reference}</strong><span>{b.check_in} → {b.check_out}</span></div><div className={'pill '+b.status}>{b.status}</div></div>)}{bookings.length===0&&<p>No bookings found.</p>}</section><section className="admin-card"><div className="admin-card-heading"><h2>Quick actions</h2></div>{[{label:'Review guest requests',tab:'bookings'},{label:'Edit room information',tab:'rooms'},{label:'Update website wording',tab:'content'},{label:'Check Stripe & Airbnb',tab:'integrations'}].map(x=><button className="quick-action" key={x.tab} onClick={()=>chooseTab(x.tab as Tab)}>{x.label}<ArrowUpRight size={17}/></button>)}</section></div></>}
    {tab==='bookings'&&<section className="admin-card"><div className="admin-card-heading"><h2>Guest requests</h2><span>{bookings.length} most recent</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reference</th><th>Dates</th><th>Status</th><th>Stripe</th><th>Total</th><th>Action</th></tr></thead><tbody>{bookings.map(b=><tr key={b.id}><td><strong>{b.reference}</strong><small>{b.guest_name}</small></td><td>{b.check_in}<small>{b.check_out}</small></td><td><span className={'pill '+b.status}>{b.status}</span></td><td><span className="pill neutral">{b.payment_mode||'?'}</span><small>{b.payment_status}</small></td><td>{formatEuro(b.total_price)}</td><td>{b.status==='pending'&&b.payment_status==='payment_method_saved'?<div className="table-actions"><button disabled={saving===b.id} onClick={()=>void approve(b,'accept')}>Confirm</button><button disabled={saving===b.id} onClick={()=>void approve(b,'reject')}>Reject</button></div>:<span className="muted">—</span>}</td></tr>)}</tbody></table></div></section>}
    {tab==='rooms'&&<div className="admin-room-list">{rooms.map(room=><section className="admin-card admin-room-editor" key={room.id}><div className="admin-card-heading"><div><span className="micro-label">{room.slug.toUpperCase()}</span><h2>{room.name}</h2></div><span className={'pill '+(room.active?'confirmed':'cancelled')}>{room.active?'Active':'Hidden'}</span></div><div className="admin-room-layout"><div className="admin-photo-grid">{images.filter(i=>i.room_id===room.id).slice(0,6).map(img=><div className="admin-photo" key={img.id}><img src={mediaUrl(img.storage_path)} alt={room.name}/><button aria-label="Delete photo" disabled={saving===img.id} onClick={()=>void removePhoto(img)}><X size={16}/></button></div>)}<label className="add-photo"><ImagePlus size={22}/><span>Add photos</span><input type="file" multiple accept="image/*" onChange={e=>setPhotoFiles(v=>({...v,[room.id]:e.target.files}))}/></label>{photoFiles[room.id]?.length&&<button className="btn btn-dark" onClick={()=>void uploadPhoto(room)}>Upload selected</button>}</div><div className="admin-form"><div className="form-row"><label>English name<input value={room.name} onChange={e=>editRoom(room.id,'name',e.target.value)}/></label><label>German name<input value={room.name_de||''} onChange={e=>editRoom(room.id,'name_de',e.target.value)}/></label></div><div className="form-row"><label>English description<textarea rows={3} value={room.description||''} onChange={e=>editRoom(room.id,'description',e.target.value)}/></label><label>German description<textarea rows={3} value={room.description_de||''} onChange={e=>editRoom(room.id,'description_de',e.target.value)}/></label></div><div className="form-row"><label>Base price (EUR)<input type="number" step=".01" min=".5" value={room.base_price} onChange={e=>editRoom(room.id,'base_price',Number(e.target.value))}/></label><label>Maximum guests<input type="number" min="1" max="12" value={room.max_guests} onChange={e=>editRoom(room.id,'max_guests',Number(e.target.value))}/></label></div><label className="checkbox-label"><input type="checkbox" checked={room.active} onChange={e=>editRoom(room.id,'active',e.target.checked)}/> Active and publicly visible</label><button className="btn btn-dark" disabled={saving===room.id} onClick={()=>void saveRoom(room)}>Save room <ArrowRight size={16}/></button></div></div></section>)}</div>}
    {tab==='calendar'&&<section className="admin-card"><div className="admin-card-heading"><h2>Availability control</h2><span>Server-verified date ranges</span></div><p className="admin-help">Calendar overrides are stored in the existing Supabase system. Confirmed guest bookings and Airbnb blocks remain protected by backend rules.</p><form onSubmit={saveCalendar} className="admin-form"><label>Room<select value={calRoom} onChange={e=>setCalRoom(e.target.value)}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><div className="form-row"><label>From<input type="date" value={calFrom} required onChange={e=>setCalFrom(e.target.value)}/></label><label>Until<input type="date" value={calTo} required onChange={e=>setCalTo(e.target.value)}/></label></div><label>Availability<select value={calState} onChange={e=>setCalState(e.target.value)}><option value="blocked">Blocked</option><option value="available">Available</option></select></label><button type="submit" className="btn btn-dark" disabled={saving==='calendar'}>Apply to selected dates</button></form></section>}
    {tab==='content'&&<><section className="admin-card"><div className="admin-card-heading"><h2>Hero & SEO copy</h2><span>English + German</span></div><div className="admin-form">{(['hero_title','hero_title_de','hero_subtitle','hero_subtitle_de'] as const).map(key=><label key={key}>{key.replaceAll('_',' ')}<textarea rows={key.includes('subtitle')?3:2} value={siteText[key]||''} onChange={e=>setSiteText({...siteText,[key]:e.target.value})}/></label>)}<button className="btn btn-dark" onClick={()=>void saveHero()} disabled={saving==='hero'}>Save hero copy</button></div></section><section className="admin-card"><div className="admin-card-heading"><h2>Guest information</h2><span>Stored in frankiholz_copy</span></div><div className="admin-form">{editableCopy.map(([key,label])=>{const row=copy.find(r=>r.copy_key===key);return <div className="admin-copy-group" key={key}><h3>{label}</h3><div className="form-row"><label>English<textarea rows={3} value={row?.text_en||''} onChange={e=>editCopy(key,'en',e.target.value)}/></label><label>Deutsch<textarea rows={3} value={row?.text_de||''} onChange={e=>editCopy(key,'de',e.target.value)}/></label></div></div>})}<button className="btn btn-dark" disabled={saving==='copy'} onClick={()=>void saveCopy()}>Save guest content <ArrowRight size={16}/></button></div></section></>}
    {tab==='integrations'&&<div className="integration-grid"><section className="admin-card"><div className="admin-card-heading"><h2>Stripe environment</h2><CreditCard size={22}/></div><p className="admin-help">One shared Supabase setting controls new checkouts across updated websites. LIVE uses real cards and may charge money after confirmation. Existing bookings keep their original payment mode.</p><div className="stripe-selector"><button disabled={!pay?.test_ready||saving==='mode'} className={pay?.environment==='test'?'active':''} onClick={()=>void setEnvironment('test')}>TEST</button><button disabled={!pay?.live_ready||saving==='mode'} className={pay?.environment==='live'?'active':''} onClick={()=>void setEnvironment('live')}>LIVE</button></div><div className="connection-row"><span>TEST connection</span><strong>{pay?.test_ready?'Connected':'Not verified'}</strong></div><div className="connection-row"><span>LIVE connection</span><strong>{pay?.live_ready?'Connected':'Not verified'}</strong></div><p className="admin-help">A connected API key is not proof that live account capabilities are enabled. Verify Stripe onboarding before accepting real money.</p></section><section className="admin-card"><div className="admin-card-heading"><h2>Airbnb calendar</h2><CalendarDays size={22}/></div><p className="admin-help">Private .ics feeds and imported blocks are managed by your protected Supabase Admin data.</p>{feeds.map((r,i)=><div className="connection-row" key={i}><span>{String(r.room_id||r.id||'Feed')}</span><strong>Configured</strong></div>)}<button className="btn btn-dark" disabled={saving==='sync'} onClick={()=>void syncAirbnb()}><RefreshCw size={16}/> Sync Airbnb calendars</button></section></div>}
    </motion.div></AnimatePresence>
   </div>
  </div>
 </main>;
}
