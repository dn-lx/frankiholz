import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

const source=await readFile(new URL('../functions/frankiholz-guest-email/index.ts',import.meta.url),'utf8');
function harness(overrides={}){
 const b={id:'fixture-booking',reference:'FH-FIXTURE',guest_name:'Alex',guest_email:'guest@example.invalid',language:'en',status:'pending',payment_mode:'live',payment_schedule_version:'v2_14_day',payment_collection_mode:'saved_method',payment_status:'not_started',stripe_payment_method_id:null,total_price:95,check_in:'2026-11-26',check_out:'2026-11-28',charge_due_at:'2026-11-12T12:00:00Z',frankiholz_rooms:{name:'Cozy Holz'},...overrides};
 const ledger=[],deliveries=new Map(),outbox=new Map();let handler,historyReadError=false,failNext=false,failComplete=false,providerGate=null,tokenNumber=0;
 const service={from(table){
  let filters=[],insertion=null;
  const query={select(){return query},eq(k,v){filters.push(row=>row[k]===v);return query},in(k,values){filters.push(row=>values.includes(row[k]));return query},order(){return query},limit(){return query},insert(row){insertion=row;return query},
   async run(single=false){
    if(table==='frankiholz_email_events'&&historyReadError&&!insertion)return{error:{message:'Mocked read failure'}};
    const rows=table==='frankiholz_bookings'?[b]:table==='frankiholz_guest_email_outbox'?[...outbox.values()].map(s=>({...s,booking_id:b.id})):table==='frankiholz_scheduler_secrets'?[{id:1,token:'cron-fixture'}]:ledger;
    if(insertion){if(ledger.some(row=>row.booking_id===insertion.booking_id&&row.event_type===insertion.event_type))return{error:{code:'23505'}};ledger.push({...insertion,id:'ledger-'+ledger.length});return{data:null};}
    const found=rows.filter(row=>filters.every(fn=>fn(row)));return{data:structuredClone(single?found[0]??null:found)};
   },maybeSingle(){return query.run(true)},then(resolve,reject){return query.run().then(resolve,reject)}};return query;
 },async rpc(name,p){
   if(name==='frankiholz_admin_access_check')return{data:false};
   if(historyReadError)return{error:{message:'Mocked read failure'}};
   let slot=outbox.get(p.p_stage);
   if(name==='frankiholz_claim_guest_email'){
    const valid=p.p_stage==='guest_request_ready'?b.status==='pending'&&((p.p_event_type==='payment_method_saved'&&b.payment_status==='payment_method_saved'&&b.stripe_payment_method_id)||(p.p_event_type==='request_received'&&b.payment_collection_mode==='complimentary')||p.p_event_type==='authorization_received'||p.p_event_type==='payment_confirmed'):p.p_stage==='guest_host_decision'&&['confirmed','cancelled'].includes(b.status);
    if(valid&&!slot){slot={stage:p.p_stage,event:p.p_event_type,state:'pending',payload:null};outbox.set(p.p_stage,slot);}
    if([...outbox.values()].some(s=>s.state==='sending'))return{data:{claimed:false,queued:true}};
    for(const s of outbox.values())if(s.first_attempt_at&&Date.now()-s.first_attempt_at>=23*3600000&&['pending','sending'].includes(s.state))s.state='needs_review';
    if([...outbox.values()].some(s=>s.state==='needs_review')){for(const s of outbox.values())if(['pending','sending'].includes(s.state))s.state='needs_review';return{data:{claimed:false,needs_review:true}};}
    for(const s of [...outbox.values()].sort((a,z)=>a.stage==='guest_request_ready'?-1:z.stage==='guest_request_ready'?1:0)){
     if(s.state!=='pending')continue;
     if(ledger.length>=2||(s.stage==='guest_request_ready'&&ledger.length)||(s.stage==='guest_host_decision'&&ledger.some(r=>['guest_host_decision','booking_confirmed','booking_rejected','approved','rejected','booking_cancelled','authorization_expired','charge_failed','charge_scheduled'].includes(r.event_type)))||(!s.payload&&s.stage==='guest_request_ready'&&b.status!=='pending')){s.state='skipped';continue;}
     s.state='sending';s.token='token-'+(++tokenNumber);
     if(!s.payload&&s.stage==='guest_host_decision'&&b.status==='confirmed')s.event='booking_confirmed';
     return{data:structuredClone({claimed:true,...s,booking:b})};
    }
    return{data:{claimed:false,skipped:true}};
   }
   if(!slot||slot.state!=='sending'||slot.token!==p.p_token)return{error:{message:'Invalid lease'}};
   if(name==='frankiholz_prepare_guest_email'){slot.payload??=structuredClone(p.p_payload);slot.first_attempt_at??=Date.now();return{data:structuredClone(slot.payload)};}
   if(name==='frankiholz_complete_guest_email'){if(failComplete){failComplete=false;return{error:{message:'Mocked lost completion'}};}ledger.push({booking_id:b.id,event_type:slot.stage,recipient:slot.payload.to});slot.state='sent';return{data:true};}
   if(name==='frankiholz_release_guest_email'){slot.state='pending';return{data:true};}
   throw Error('Unexpected RPC '+name);
 }};
 const context={Deno:{env:{get:key=>key==='RESEND_API_KEY'?'fixture':'service-fixture'},serve(fn){handler=fn}},createClient:()=>service,console:{error(){},warn(){}},URL,Date,Intl,AbortSignal,Request,Response,
  async fetch(url,options){
   assert.equal(url,'https://api.resend.com/emails');
   if(providerGate){const gate=providerGate;providerGate=null;gate.entered();await gate.wait;}
   if(failNext){failNext=false;return new Response(JSON.stringify({message:'Mocked provider failure'}),{status:503});}
   const key=options.headers['Idempotency-Key'],body=JSON.parse(options.body);
   if(!deliveries.has(key))deliveries.set(key,{...body,id:'provider-'+deliveries.size});
   return new Response(JSON.stringify({id:deliveries.get(key).id}));
  }};
 vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),context);
 return{b,ledger,deliveries,outbox,context,guest:()=>[...deliveries.values()].filter(d=>d.to[0]===b.guest_email),
  pauseProvider(){let entered,release;const started=new Promise(r=>entered=r),wait=new Promise(r=>release=r);providerGate={entered,wait};return{started,release};},
  send:event=>context.sendGuest(event,b),setHistoryError:()=>{historyReadError=true},failNext:()=>{failNext=true},failComplete:()=>{failComplete=true},
  drain:(headers={authorization:'Bearer service-fixture'})=>handler(new Request('https://fixture.invalid/email',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({action:'drain'})})),
  request:(event,headers={authorization:'Bearer service-fixture'})=>handler(new Request('https://fixture.invalid/email',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(event==='request_received'?{event_type:event,reference:b.reference,email:b.guest_email}:{event_type:event,booking_id:b.id})}))};
}
for(const language of ['en','de'])for(const mode of ['live','test'])test(`only two guest messages across setup, approval and later callbacks in ${language}/${mode}`,async()=>{
 const f=harness({language,payment_mode:mode});
 const publicHeaders={origin:'https://develop--frankiholz.netlify.app','x-frankiholz-source':'public-site'};
 assert.equal((await f.request('request_received',publicHeaders)).status,200);assert.equal(f.guest().length,0);
 assert.equal([...f.deliveries.values()].filter(d=>d.to[0]==='info@frankiflow.de').length,1);
 f.b.payment_status='payment_method_saved';f.b.stripe_payment_method_id='pm_fixture';
 assert.equal((await f.request('payment_method_saved')).status,200);await f.send('payment_method_saved');
 assert.equal(f.guest().length,1);assert.match(f.guest()[0].html,language==='en'?/request is with your host/:/Anfrage liegt Ihrem Gastgeber vor/);
 f.b.status='confirmed';f.b.payment_status='paid';
 // The receipt may arrive before the decision callback. They share one guest delivery.
 await Promise.all(['payment_confirmed','booking_confirmed','charge_scheduled','charge_failed','approved'].map(e=>f.send(e)));
 assert.equal(f.guest().length,2);assert.match(f.guest()[1].html,language==='en'?/Payment received/:/Zahlung eingegangen/);
 f.b.status='cancelled';f.b.payment_status='refunded';
 for(const event of ['payment_confirmed','booking_cancelled','booking_rejected','request_received','payment_method_saved'])await f.send(event);
 assert.equal(f.guest().length,2);assert.equal(f.ledger.length,2);
 assert.deepEqual(f.ledger.map(row=>row.event_type),['guest_request_ready','guest_host_decision']);
 for(const message of f.guest()){assert.match(message.html,/frankiholz-logo-light-lockup.png/);assert.match(message.html,language==='en'?/With warm wishes/:/Mit herzlichen Grüßen/);}
});
test('scheduled approval includes payment state; subsequent settlement does not send a receipt',async()=>{
 const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});await f.send('payment_method_saved');
 f.b.status='confirmed';f.b.payment_status='scheduled_charge';await f.send('booking_confirmed');
 assert.match(f.guest()[1].html,/Payment scheduled/);assert.match(f.guest()[1].html,/12\/11\/2026/);
 f.b.payment_status='paid';await f.send('payment_confirmed');assert.equal(f.guest().length,2);
});
test('rejection and pending refund details share one decision email',async()=>{
 const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});await f.send('payment_method_saved');
 f.b.status='cancelled';f.b.payment_status='paid';f.b.refund_review_required=true;await f.send('booking_rejected');
 assert.match(f.guest()[1].html,/not yet complete/);
 f.b.payment_status='refunded';f.b.refund_review_required=false;await f.send('booking_rejected');await f.send('booking_cancelled');assert.equal(f.guest().length,2);
});
test('complimentary requests get a truthful ready message and one host decision',async()=>{
 const f=harness({payment_collection_mode:'complimentary',payment_status:'not_required',total_price:0});await f.send('request_received');
 assert.match(f.guest()[0].html,/No payment is required/);assert.doesNotMatch(f.guest()[0].html,/payment details have been saved/);
 f.b.status='confirmed';await f.send('booking_confirmed');await f.send('booking_confirmed');assert.equal(f.guest().length,2);
});
test('immediate charge failure is consolidated into approval with truthful payment details',async()=>{
 const f=harness({status:'confirmed',payment_status:'failed',stripe_payment_method_id:'pm_fixture'});await f.send('charge_failed');await f.send('booking_confirmed');
 assert.equal(f.guest().length,1);assert.match(f.guest()[0].html,/host has confirmed/);assert.match(f.guest()[0].html,/Payment needs attention/);assert.doesNotMatch(f.guest()[0].html,/will be charged automatically/);
});
test('historical multiple sends and late setup callbacks cannot add guest emails',async()=>{
 const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});
 for(const event_type of ['request_received','payment_method_saved','booking_confirmed'])f.ledger.push({booking_id:f.b.id,event_type});
 await f.send('payment_method_saved');f.b.status='confirmed';await f.send('payment_confirmed');await f.send('booking_confirmed');assert.equal(f.guest().length,0);
});
test('provider failure is retryable with the same stage key; history failure sends nothing',async()=>{
 const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});f.failNext();await assert.rejects(f.send('payment_method_saved'));
 assert.equal(f.ledger.length,0);await f.send('payment_method_saved');assert.equal(f.guest().length,1);
 assert.ok([...f.deliveries.keys()].some(key=>key.endsWith('-guest_request_ready-guest')));
 const g=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});g.setHistoryError();await assert.rejects(g.send('payment_method_saved'));assert.equal(g.guest().length,0);
});
test('legacy bank receipt and authorization use accurate first messages',async()=>{
 const bank=harness({payment_collection_mode:'bank_transfer',payment_status:'paid'});await bank.send('payment_confirmed');assert.match(bank.guest()[0].html,/payment has been received/);assert.doesNotMatch(bank.guest()[0].html,/payment details have been saved/);
 bank.b.status='confirmed';await bank.send('booking_confirmed');assert.equal(bank.guest().length,2);
 const held=harness({payment_schedule_version:'legacy',payment_status:'authorized'});await held.send('authorization_received');assert.match(held.guest()[0].html,/card was authorized/);
});
test('unready, forged canonical and unauthorized requests cannot trigger guest messages',async()=>{
 const f=harness();await f.send('payment_method_saved');await f.send('booking_confirmed');assert.equal(f.guest().length,0);
 assert.equal((await f.request('guest_host_decision')).status,400);assert.equal((await f.request('booking_confirmed',{})).status,401);
 assert.equal((await f.request('booking_confirmed',{authorization:'Bearer not-admin'})).status,403);assert.equal(f.guest().length,0);
});
test('a decision racing an in-flight setup email waits and is drained in order',async()=>{
 const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'}),gate=f.pauseProvider();
 const setup=f.send('payment_method_saved');await gate.started;
 f.b.status='confirmed';f.b.payment_status='paid';
 const queued=await f.send('booking_confirmed');assert.equal(queued.queued,true);assert.equal(f.guest().length,0);
 gate.release();await setup;
 assert.equal(f.guest().length,2);assert.match(f.guest()[0].html,/awaiting host approval/);assert.match(f.guest()[1].html,/Payment received/);
});
test('retry keeps the original provider payload when state changes after a failed attempt',async()=>{
 const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});f.failNext();await assert.rejects(f.send('payment_method_saved'));
 const original=structuredClone(f.outbox.get('guest_request_ready').payload);
 f.b.status='confirmed';f.b.payment_status='paid';await f.send('booking_confirmed');
 assert.equal(f.guest().length,2);assert.equal(f.guest()[0].subject,original.subject);assert.equal(f.guest()[0].html,original.html);
 assert.match(f.guest()[1].html,/Payment received/);
});
test('historical bank receipt and charge failure cannot generate a third message',async()=>{
 const f=harness({status:'confirmed',payment_status:'failed'});
 for(const event_type of ['payment_confirmed','charge_failed'])f.ledger.push({booking_id:f.b.id,event_type});
 await f.send('booking_confirmed');assert.equal(f.guest().length,0);
});
test('authenticated scheduled drain recovers failed delivery without another booking callback',async()=>{
 const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});f.failNext();await assert.rejects(f.send('payment_method_saved'));
 assert.equal((await f.drain({})).status,401);assert.equal((await f.drain({'x-frankiholz-cron':'wrong'})).status,401);assert.equal(f.guest().length,0);
 const response=await f.drain({'x-frankiholz-cron':'cron-fixture'});assert.equal(response.status,200);assert.equal((await response.json()).processed,1);assert.equal(f.guest().length,1);
});
test('accepted provider call with lost completion is recovered once, and never replayed beyond retention',async()=>{
 for(const expired of [false,true]){
  const f=harness({payment_status:'payment_method_saved',stripe_payment_method_id:'pm_fixture'});f.failComplete();await assert.rejects(f.send('payment_method_saved'));
  assert.equal(f.guest().length,1);assert.equal(f.ledger.length,0);
  if(expired)f.outbox.get('guest_request_ready').first_attempt_at=Date.now()-25*3600000;
  const response=await f.drain();assert.equal(response.status,200);assert.equal(f.guest().length,1);
  assert.equal(f.ledger.length,expired?0:1);if(expired)assert.equal(f.outbox.get('guest_request_ready').state,'needs_review');
 }
});
