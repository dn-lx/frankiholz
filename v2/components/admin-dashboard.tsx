'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import {ArrowLeft,ArrowRight,ClipboardList,CreditCard,DoorOpen,ExternalLink,FileText,LayoutDashboard,LoaderCircle,LockKeyhole,LogOut,Menu,RefreshCw,Settings,CalendarDays,X} from 'lucide-react';
import {client} from '@/lib/config';
import {checked,type AdminApi,type AdminData} from '@/lib/admin-api';
import {AdminBookings} from './admin-bookings';
import {AdminRooms} from './admin-rooms';
import {AdminAvailability} from './admin-calendar';
import {AdminContent} from './admin-content';
import {AdminIntegrations,AdminPricing} from './admin-integrations';
import './admin.css';

const tabs=[['overview','Overview',LayoutDashboard],['bookings','Bookings',ClipboardList],['rooms','Rooms',DoorOpen],['calendar','Availability',CalendarDays],['pricing','Pricing',Settings],['content','Website studio',FileText],['integrations','Integrations',CreditCard]] as const;
type Tab=typeof tabs[number][0];
export function AdminDashboard(){
 const [db,setDb]=useState<SupabaseClient|null>(null),[authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true);
 const [data,setData]=useState<AdminData|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[loginBusy,setLoginBusy]=useState(false);
 const [tab,setTab]=useState<Tab>('overview'),[menu,setMenu]=useState(false),[note,setNote]=useState(''),[error,setError]=useState(false),[authError,setAuthError]=useState('');
 const lock=useRef(false),epoch=useRef(0),loadVersion=useRef(0);const reduce=useReducedMotion();
 const notify=useCallback((message:string,isError=false)=>{setNote(message);setError(isError)},[]);
 const guard=useCallback(async(connection:SupabaseClient)=>{
   const {data:{session},error:sessionError}=await connection.auth.getSession();
   if(sessionError||!session){setAuthorized(false);setData(null);throw Error('Your session has expired. Please sign in again.');}
   const access=await connection.rpc('frankiholz_admin_access_check');
   if(access.error||!access.data){setAuthorized(false);setData(null);throw Error('This account is not authorized as a FrankiHolz administrator.');}
   return session;
 },[]);
 useEffect(()=>{
  let active=true,timer:ReturnType<typeof setTimeout>|undefined;const connection=client();
  if(!connection){setChecking(false);setAuthError('The secure connection is unavailable. Reload to try again.');return;}
  setDb(connection);
  const verify=async()=>{
   const generation=++epoch.current;
   try{const {data:{session},error}=await connection.auth.getSession();if(error)throw error;
    if(!session){if(active&&generation===epoch.current){setAuthorized(false);setData(null);setChecking(false)}return;}
    await guard(connection);if(active&&generation===epoch.current){setAuthorized(true);setAuthError('');setChecking(false)}
   }catch(reason){if(active&&generation===epoch.current){setAuthorized(false);setData(null);setChecking(false);setAuthError(reason instanceof Error?reason.message:'Access could not be verified.')}}
  };
  void verify();
  const {data:{subscription}}=connection.auth.onAuthStateChange((_event,session)=>{
   if(!session){epoch.current++;loadVersion.current++;setAuthorized(false);setData(null);setChecking(false);}
   else{clearTimeout(timer);timer=setTimeout(()=>void verify(),0)}
  });
  return()=>{active=false;epoch.current++;clearTimeout(timer);subscription.unsubscribe()};
 },[guard]);
 const reload=useCallback(async()=>{
  if(!db)return;const version=++loadVersion.current,generation=epoch.current;setLoading(true);
  try{await guard(db);
   const r=await Promise.all([
    db.from('frankiholz_rooms').select('*').order('sort_order'),
    db.from('frankiholz_room_images').select('*').order('sort_order').order('created_at'),
    db.from('frankiholz_bookings').select('*,frankiholz_rooms(name)').order('created_at',{ascending:false}).order('id',{ascending:false}),
    db.from('frankiholz_site_settings').select('*').eq('id',1).maybeSingle(),
    db.from('frankiholz_pricing_settings').select('*').eq('id',1).maybeSingle(),
    db.from('frankiholz_copy').select('copy_key,label,text_en,text_de,sort_order').order('sort_order'),
    db.from('frankiholz_ical_feeds').select('id,room_id,provider,enabled,last_synced_at,last_status,last_error').eq('provider','airbnb'),
    db.rpc('frankiholz_get_payment_environment_state')
   ]);
   r.forEach(result=>checked(result));if(version!==loadVersion.current||generation!==epoch.current)return;
   setData({rooms:r[0].data||[],images:r[1].data||[],bookings:r[2].data||[],settings:r[3].data||{},pricing:r[4].data||{},copy:r[5].data||[],feeds:r[6].data||[],payment:r[7].data?.[0]||null});
  }catch(reason){if(version===loadVersion.current&&generation===epoch.current)notify(reason instanceof Error?reason.message:'Could not load the host workspace.',true)}
  finally{if(version===loadVersion.current)setLoading(false)}
 },[db,guard,notify]);
 useEffect(()=>{if(authorized)void reload()},[authorized,reload]);
 const execute=useCallback(async(label:string,job:()=>Promise<void>)=>{
  if(!db||lock.current)return false;lock.current=true;setBusy(true);notify(label+'…');const generation=epoch.current;
  try{await guard(db);await job();return generation===epoch.current;}
  catch(reason){if(generation===epoch.current)notify(reason instanceof Error?reason.message:'The operation could not complete.',true);return false;}
  finally{lock.current=false;setBusy(false)}
 },[db,guard,notify]);
 const edge=useCallback(async(endpoint:string,body:unknown)=>{
  if(!db)throw Error('The connection is unavailable.');const session=await guard(db),cfg=window.FRANKIHOLZ_CONFIG;
  if(!cfg)throw Error('The API configuration is unavailable.');
  const response=await fetch(cfg.supabaseUrl+'/functions/v1/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.supabaseKey,Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'The server could not complete this operation.');return result as Record<string,unknown>;
 },[db,guard]);
 const login=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!db||loginBusy)return;setLoginBusy(true);setAuthError('');const form=new FormData(event.currentTarget);
  try{const result=await db.auth.signInWithPassword({email:String(form.get('email')||'').trim(),password:String(form.get('password')||'')});if(result.error)throw result.error;await guard(db);setAuthorized(true)}
  catch(reason){await db.auth.signOut();setAuthError(reason instanceof Error?reason.message:'Sign-in failed.')}finally{setLoginBusy(false)}
 };
 const logout=async()=>{if(!db)return;const result=await db.auth.signOut();if(result.error){notify(result.error.message,true);return;}setAuthorized(false);setData(null);setTab('overview')};
 if(checking)return <main id="main" className="admin-login-page"><p className="admin-loading" role="status"><LoaderCircle className="spin"/> Verifying secure access…</p></main>;
 if(!authorized||!db)return <main id="main" className="admin-login-page"><div className="admin-login-grid"><div className="admin-login-visual"><Link href="/" aria-label="FrankiHolz home"><img src="/assets/frankiholz-logo-for-dark.png" width="180" height="85" alt="FrankiHolz"/></Link><div><span className="micro-label">A PERSONAL PLACE. A CAREFUL HOST.</span><h1>Your space.<br/>Thoughtfully managed.</h1><p>Welcome to your private host studio. Rooms, guests and the details that make a stay memorable.</p></div><small>FRANKFURT AM MAIN · HOST STUDIO</small></div><div className="admin-login-form"><span className="micro-label">SECURE ACCESS</span><h2>Welcome back.</h2><p>Sign in with your authorized FrankiHolz account.</p><form onSubmit={login} className="admin-form"><label>Email<input type="email" name="email" autoComplete="username" required/></label><label>Password<input type="password" name="password" autoComplete="current-password" required/></label>{authError&&<p role="alert" className="form-error">{authError}</p>}<button className="btn btn-dark btn-wide" disabled={loginBusy||!db}>{loginBusy?'Signing in…':'Open host studio'}<ArrowRight size={18}/></button></form><p className="secure-note"><LockKeyhole size={17}/>Your access is verified by the server.</p><Link className="back-to-site" href="/"><ArrowLeft size={15}/>Back to guest website</Link></div></div></main>;
 const api:AdminApi={db,busy,execute,edge,notify,reload};const current=tabs.find(([key])=>key===tab)!;
 return <main id="main" className="admin-v2"><aside className={'admin-sidebar'+(menu?' is-open':'')}><div className="admin-brand"><Link href="/"><img src="/assets/frankiholz-logo-for-dark.png" width="165" height="78" alt="FrankiHolz"/></Link><span>HOST STUDIO <span className="admin-edition">V2</span></span></div><nav aria-label="Admin workspace">{tabs.map(([key,label,Icon])=><button key={key} className={'sidebar-link'+(tab===key?' active':'')} aria-current={tab===key?'page':undefined} onClick={()=>{setTab(key);setMenu(false)}}><Icon size={18}/>{label}</button>)}</nav><div className="sidebar-bottom"><Link href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/>Visit website</Link><button onClick={()=>void logout()} disabled={busy}><LogOut size={17}/>Sign out</button></div></aside><div className="admin-workspace"><header className="admin-topbar"><div className="admin-mobile-brand"><button aria-label="Toggle admin menu" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button><strong>FRANKIHOLZ / STUDIO</strong></div><div className="breadcrumb">FRANKIHOLZ / {current[1].toUpperCase()}</div><button className="admin-refresh" disabled={loading||busy} onClick={()=>void reload()}><RefreshCw size={17}/>{loading?'Refreshing…':'Refresh data'}</button></header><div className="admin-main"><div className="admin-page-heading"><div><span className="micro-label">YOUR HOST WORKSPACE</span><h1>{current[1]}<span className="admin-orange-dot">.</span></h1><p>Your rooms, your guests, every considered detail.</p></div></div>{note&&<div className={'admin-notice '+(error?'is-error':'is-ok')} role={error?'alert':'status'}>{note}<button aria-label="Dismiss notification" onClick={()=>setNote('')}><X size={16}/></button></div>}{!data?<section className="admin-card"><p role="status">{loading?'Loading your workspace…':'Workspace data could not be loaded.'}</p>{!loading&&<button className="btn btn-dark" onClick={()=>void reload()}>Try again</button>}</section>:<AnimatePresence mode="wait"><motion.div key={tab} initial={reduce?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={reduce?{}:{opacity:0}} transition={{duration:.18}}>{tab==='overview'&&<><div className="admin-stat-grid">{[['Active rooms',data.rooms.filter(r=>r.active).length],['Pending requests',data.bookings.filter(b=>b.status==='pending'&&!b.admin_deleted_at).length],['Confirmed stays',data.bookings.filter(b=>b.status==='confirmed').length],['Stripe mode',data.payment?.environment?.toUpperCase()||'Unavailable']].map(([title,value])=><div className="stat-card" key={title}><span>{title}</span><strong>{value}</strong><small>Current backend records</small></div>)}</div><section className="admin-card"><h2>Make their next stay a good one.</h2><p>Review requests, keep availability current, and make the guest experience yours.</p><div className="admin-action-row">{tabs.filter(([key])=>key!=='overview').map(([key,label])=><button className="btn btn-light" key={key} onClick={()=>setTab(key)}>{label}<ArrowRight size={15}/></button>)}</div></section></>}{tab==='bookings'&&<AdminBookings api={api} initial={data.bookings}/>} {tab==='rooms'&&<AdminRooms api={api} rooms={data.rooms} images={data.images}/>} {tab==='calendar'&&<AdminAvailability api={api} rooms={data.rooms}/>} {tab==='pricing'&&<AdminPricing api={api} initial={data.pricing}/>} {tab==='content'&&<AdminContent api={api} settings={data.settings} initialCopy={data.copy}/>} {tab==='integrations'&&<AdminIntegrations api={api} rooms={data.rooms} initialFeeds={data.feeds} initialPayment={data.payment}/>}</motion.div></AnimatePresence>}</div></div></main>;
}
