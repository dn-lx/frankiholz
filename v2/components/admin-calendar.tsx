'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react';
import type {Room} from '@/lib/types';
import {formatEuro} from '@/lib/config';
import {checked,type AdminApi} from '@/lib/admin-api';
type CalendarRow={date:string;is_available:boolean;availability_status:string;price_override:number|null;note:string|null;booking_id:string|null;admin_available_override:boolean};
type Block={date:string;provider:string};type Reservation={check_in:string;check_out:string};
const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function AdminAvailability({api,rooms}:{api:AdminApi;rooms:Room[]}){
 const [id,setId]=useState(rooms[0]?.id||'');
 return <><section className="admin-card"><h2>Availability control</h2><p>Review imported Airbnb blocks, manual overrides, and confirmed reservations together.</p><label className="admin-room-select">Room<select value={id} onChange={event=>setId(event.target.value)} disabled={api.busy}>{rooms.map(room=><option value={room.id} key={room.id}>{room.name}</option>)}</select></label></section>{rooms.find(room=>room.id===id)&&<AdminCalendar key={id} api={api} room={rooms.find(room=>room.id===id)!}/>}</>;
}
export function AdminCalendar({api,room}:{api:AdminApi;room:Room}){
 const [month,setMonth]=useState(()=>{const today=new Date();return new Date(today.getFullYear(),today.getMonth(),1)}),[rows,setRows]=useState<CalendarRow[]>([]),[blocks,setBlocks]=useState<Block[]>([]),[reservations,setReservations]=useState<Reservation[]>([]);
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[price,setPrice]=useState(''),[note,setNote]=useState(''),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState('');const version=useRef(0);
 const load=async()=>{
  const request=++version.current;setLoading(true);setLoadError('');
  const from=iso(new Date(month.getFullYear(),month.getMonth(),1)),to=iso(new Date(month.getFullYear(),month.getMonth()+1,0));
  try{const results=await Promise.all([
   api.db.from('frankiholz_calendar').select('id,date,is_available,availability_status,price_override,note,booking_id,admin_available_override').eq('room_id',room.id).gte('date',from).lte('date',to),
   api.db.from('frankiholz_ical_blocks').select('date,provider').eq('room_id',room.id).gte('date',from).lte('date',to),
   api.db.from('frankiholz_bookings').select('check_in,check_out').eq('room_id',room.id).eq('status','confirmed').gte('check_out',from).lte('check_in',to)
  ]);results.forEach(result=>{if(result.error)throw Error(result.error.message)});if(request!==version.current)return;setRows(results[0].data||[]);setBlocks(results[1].data||[]);setReservations(results[2].data||[]);
  }catch(reason){if(request===version.current){setRows([]);setBlocks([]);setReservations([]);setLoadError(reason instanceof Error?reason.message:'Could not load availability.')}}finally{if(request===version.current)setLoading(false)}
 };
 useEffect(()=>{void load();return()=>{version.current++}},[month,room.id]);
 const dates=Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>iso(new Date(month.getFullYear(),month.getMonth(),i+1)));
 const choose=(date:string)=>{if(!start||end||date<start){setStart(date);setEnd('')}else setEnd(date)};
 const apply=async(status:'available'|'blocked'|'booked'|boolean)=>{
  if(!start||end&&end<start){api.notify('Choose a valid date range.',true);return;}
  if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0)){api.notify('The price override must be a non-negative amount.',true);return;}
  if(status==='available'&&!confirm('Make these dates available here? Existing reservations and financial records remain active. Reopening a confirmed night can allow another booking request.'))return;
  await api.execute('Updating availability',async()=>{
   const airbnb=typeof status==='boolean';
   const result=checked(await api.db.rpc(airbnb?'frankiholz_set_airbnb_availability':'frankiholz_set_calendar_range',airbnb?{p_room_id:room.id,p_start_date:start,p_end_date:end||start,p_available_here:status}:{p_room_id:room.id,p_start_date:start,p_end_date:end||start,p_status:status,p_price_override:price===''?null:Number(price),p_note:note.trim()||null}));
   setStart('');setEnd('');await load();api.notify(`${Number(result)} date(s) updated. ${airbnb?(status?'Only imported Airbnb blocks were made available here; confirmed reservations were skipped.':'Manual Airbnb availability overrides were removed from the range.'):'Existing reservations and payments are unchanged.'}`);
  });
 };
 const overrides=blocks.filter(block=>rows.some(row=>row.date===block.date&&row.admin_available_override&&row.is_available)).length;
 return <section className="admin-card admin-calendar-editor"><div className="admin-card-heading"><h2>{room.name} · calendar</h2><button className="admin-refresh" disabled={loading||api.busy} onClick={()=>void load()}><RefreshCw size={16}/>Reload calendar</button></div><div className="admin-month-nav"><button aria-label="Previous month" className="btn btn-light" disabled={api.busy} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={18}/></button><h3>{month.toLocaleString('en-GB',{month:'long',year:'numeric'})}</h3><button aria-label="Next month" className="btn btn-light" disabled={api.busy} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={18}/></button></div>{loading?<p role="status">Loading calendar…</p>:loadError?<p className="form-error" role="alert">{loadError}</p>:<><div className="admin-calendar-grid" aria-label={room.name+' availability calendar'}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span className="admin-calendar-weekday" key={day}>{day}</span>)}{Array.from({length:(month.getDay()+6)%7},(_,i)=><span key={'pad'+i}/>)}{dates.map(date=>{
  const row=rows.find(day=>day.date===date),imported=blocks.some(block=>block.date===date),override=Boolean(row?.admin_available_override&&row.is_available),reserved=reservations.some(booking=>date>=booking.check_in&&date<booking.check_out);
  const status=override?'available':reserved||row?.booking_id?'booked':row&&(row.availability_status==='blocked'||row.availability_status==='booked'||!row.is_available)?row.availability_status||'blocked':imported?'blocked':'available';
  const label=override&&imported?'Airbnb blocked · available here':status==='booked'?'Booked':status==='blocked'?(imported?'Airbnb blocked':'Blocked'):row?.price_override!=null?formatEuro(row.price_override):'Available';
  return <button key={date} type="button" title={row?.note||undefined} aria-label={date+': '+label} aria-pressed={date===start||date===end} disabled={api.busy} className={'admin-calendar-day '+status+(override&&imported?' airbnb-override':'')+(date===start||date===end?' selected':'')+(start&&end&&date>start&&date<end?' in-range':'')} onClick={()=>choose(date)}><strong>{Number(date.slice(-2))}</strong><small>{label}</small></button>
 })}</div><p className="admin-help">This month: {blocks.length} Airbnb-blocked nights · {overrides} available here by Admin override. Sync preserves these overrides.</p></>}<div className="admin-calendar-legend"><span>Available</span><span>Blocked</span><span>Booked</span><span>Airbnb blocked · available here</span></div><fieldset className="admin-range-fieldset" disabled={api.busy||loading||Boolean(loadError)}><legend>Selected range</legend><div className="admin-form"><div className="form-row"><label>From<input type="date" value={start} onChange={event=>{setStart(event.target.value);if(end&&end<event.target.value)setEnd('')}}/></label><label>Through (inclusive)<input type="date" value={end} min={start} onChange={event=>setEnd(event.target.value)}/></label></div><div className="form-row"><label>Price override (optional)<input type="number" min="0" step="0.01" value={price} onChange={event=>setPrice(event.target.value)} placeholder="Keep existing price"/></label><label>Admin note (optional)<input value={note} onChange={event=>setNote(event.target.value)}/></label></div><div className="admin-action-row"><button className="btn btn-light" disabled={!start} onClick={()=>void apply('available')}>Make available</button><button className="btn btn-light" disabled={!start} onClick={()=>void apply('blocked')}>Block range</button><button className="btn btn-light" disabled={!start} onClick={()=>void apply('booked')}>Mark booked</button></div><p className="admin-help">These controls change this website’s availability. They do not cancel reservations, alter payments, or change Airbnb.</p><h3>Airbnb availability</h3><p className="admin-help">The targeted Airbnb override skips confirmed reservations and survives calendar sync. Following Airbnb again removes manual availability overrides in the selected range.</p><div className="admin-action-row"><button className="btn btn-dark" disabled={!start} onClick={()=>void apply(true)}>Airbnb blocked · make available here</button><button className="btn btn-light" disabled={!start} onClick={()=>void apply(false)}>Follow Airbnb again</button></div></div></fieldset></section>;
}
