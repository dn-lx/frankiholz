import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {claimOperation,releaseOperation} from '../functions/_shared/payment-operation.ts';
import {isComplimentary,closeComplimentary} from '../functions/_shared/complimentary.ts';
import {chargeBooking} from '../functions/_shared/booking-charge.ts';
import {cancelTransfer} from '../functions/_shared/cancel-transfer.ts';
import {notifyClosedBooking} from '../functions/_shared/closure-notification.ts';
import {createSetupResource} from '../functions/_shared/setup-resource.ts';

// Real entrypoints/helpers; only external DB, Stripe and HTTP boundaries are mocked.
// Queue-trigger atomicity is separately asserted in closure-notifications.sql.
function fixture(mode='test',kind='complimentary'){
 const b={id:'booking_fixture',reference:'FH-ISOLATED',guest_email:'fixture@example.invalid',guest_name:'Fixture Guest',guest_phone:'',language:'en',room_id:'room_fixture',check_in:'2099-03-01',check_out:'2099-03-02',status:'pending',payment_mode:mode,payment_schedule_version:'v2_14_day',payment_collection_mode:'complimentary',payment_status:'not_required',promo_code:'FrankFlowGuest100',promo_discount_percent:100,total_price:0,payment_operation_token:null,stripe_payment_intent_id:null,stripe_customer_id:null,stripe_payment_method_id:null,stripe_checkout_session_id:null,closure_notification_event:null};
 if(kind==='setup')Object.assign(b,{payment_collection_mode:'saved_method',payment_status:'not_started',total_price:95});
 if(kind==='paid')Object.assign(b,{status:'confirmed',payment_collection_mode:'saved_method',payment_status:'paid',total_price:95,stripe_customer_id:'cus_existing',stripe_payment_method_id:'pm_existing',stripe_payment_intent_id:'pi_existing'});
 if(kind==='bank')Object.assign(b,{payment_collection_mode:'bank_transfer',payment_status:'paid',total_price:95,stripe_customer_id:'cus_existing',stripe_payment_intent_id:'pi_existing'});
 if(kind==='legacy')Object.assign(b,{payment_schedule_version:'legacy',payment_collection_mode:'saved_method',payment_status:'authorized',total_price:95,stripe_customer_id:'cus_existing',stripe_payment_intent_id:'pi_existing',payment_due_at:'2099-02-28T12:00:00Z'});
 const state={claims:0,closes:0,calendarWrites:0,refunds:0,detaches:0,piCancels:0,sessionExpires:0,emails:[],queue:[],providerDeliveries:new Set(),emailFailure:false,closeFailure:false,storeFailure:false,admin:true,tokenNumber:0,customerCalls:[],sessionCalls:[],customers:new Map(),sessions:[],resourceError:null};
 const queueClosure=()=>{
  if(b.status!=='cancelled'||!b.closure_notification_event)return;
  const prior=state.queue.find(x=>x.stage==='guest_host_decision');
  if(!prior)state.queue.push({stage:'guest_host_decision',event_type:b.closure_notification_event,state:'pending'});
  else if(prior.state==='pending'&&!prior.payload&&!prior.first_attempt_at)prior.event_type=b.closure_notification_event;
 };
 const service={async rpc(name,args){
  if(name==='frankiholz_admin_access_check')return {data:state.admin};
  if(name==='frankiholz_get_payment_environment')return {data:mode};
  if(name==='frankiholz_estimate_total')return {data:[{available:true}]};
  if(name==='frankiholz_claim_payment_operation'){
   if(b.payment_operation_token||b.status==='cancelled'||b.payment_status==='processing')return {error:{message:'Payment operation unavailable'}};
   const booking=structuredClone(b);b.payment_operation_token=`lease_${++state.tokenNumber}`;state.claims++;return {data:{booking,token:b.payment_operation_token}};
  }
  if(name==='frankiholz_close_complimentary_booking'){
   if(state.closeFailure){state.closeFailure=false;return {error:{message:'Injected transactional close failure'}};}
   if(state.noopClose)return {error:null};
   assert.equal(args.p_operation_token,b.payment_operation_token);state.closes++;b.status='cancelled';b.closure_notification_event=args.p_event_type;queueClosure();return {error:null};
  }
  if(name==='frankiholz_release_hold_with_notification'){
   if(state.legacyConcurrentClosure){b.status='cancelled';b.payment_status=state.legacyConcurrentPaymentStatus??'released';b.closure_notification_event='booking_cancelled';queueClosure();return {error:null};}
   state.closes++;b.status='cancelled';b.payment_status=args.p_reason;b.closure_notification_event=args.p_reason==='expired'?'authorization_expired':'booking_rejected';queueClosure();return {error:null};
  }
  throw new Error('Unexpected RPC '+name);
 },from(table){let patch;const predicates=[];const q={select(){return q},eq(k,v){predicates.push(row=>row[k]===v);return q},neq(k,v){predicates.push(row=>row[k]!==v);return q},in(k,values){predicates.push(row=>values.includes(row[k]));return q},is(k,v){predicates.push(row=>row[k]===v);return q},update(value){patch=value;return q},async run(single=false){
   if(table==='frankiholz_calendar'){if(patch)state.calendarWrites++;return {data:[],error:null};}
   if(patch&&(state.loseCloseToken&&patch.status==='cancelled'||state.loseSetupToken&&patch.stripe_checkout_session_id))b.payment_operation_token='different_owner_token';
   const rows=(table==='frankiholz_bookings'?[b]:state.queue).filter(row=>predicates.every(p=>p(row)));
   if(patch&&state.storeFailure&&patch.stripe_checkout_session_id){state.storeFailure=false;return {data:null,error:{message:'Injected booking store failure'}};}
   if(patch){rows.forEach(row=>Object.assign(row,patch));queueClosure();}
   return {data:structuredClone(single?rows[0]??null:rows),error:null};
  },maybeSingle(){return q.run(true)},then(ok,bad){return q.run().then(ok,bad)}};return q;}};
 const rejectResource=(stage)=>{if(state.resourceError?.stage===stage){const error=state.resourceError.error;state.resourceError=null;throw error;}};
 const stripe={
  customers:{create:async(data,options)=>{state.customerCalls.push({data,options});rejectResource('customer');const key=options.idempotencyKey;if(!state.customers.has(key))state.customers.set(key,{id:state.invalidCustomerID!==undefined?state.invalidCustomerID:'cus_'+(state.customers.size+1)});return state.customers.get(key);}},
  checkout:{sessions:{create:async(data,options)=>{state.sessionCalls.push({data,options});rejectResource('session');const session={id:'cs_'+(state.sessions.length+1),url:state.omitSessionURL?null:'https://checkout.stripe.com/c/pay/cs_'+(state.sessions.length+1)};state.sessions.push(session);return session;},expire:async()=>{state.sessionExpires++;}}},
  paymentMethods:{detach:async()=>{state.detaches++;}},
  paymentIntents:{retrieve:async()=>({id:'pi_existing',status:state.piStatus??'succeeded',currency:'eur',amount:9500,customer:'cus_existing',metadata:{booking_id:b.id}}),cancel:async()=>{state.piCancels++;state.piStatus='canceled';}},
  refunds:{create:async()=>{state.refunds++;return {id:'re_fixture',status:'succeeded'};}},
 };
 const send=async(_url,options)=>{const data=JSON.parse(options.body);state.emails.push(data);if(state.emailFailure)return new Response('{}',{status:500});state.providerDeliveries.add(data.booking_id+':guest_host_decision');state.queue.forEach(row=>row.state='sent');return new Response('{"ok":true}');};
 return {b,state,service,stripe,send};
}
async function entrypoint(name,f){
 const source=await readFile(new URL('../functions/'+name+'/index.ts',import.meta.url),'utf8');let handle;
 class Stripe{constructor(){return f.stripe;}}
 vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),{
  Deno:{env:{get:()=> 'isolated-fixture'},serve(fn){handle=fn}},Stripe,createClient:()=>f.service,
  claimOperation,releaseOperation,isComplimentary,closeComplimentary,chargeBooking,cancelTransfer,notifyClosedBooking,createSetupResource,
  Request,Response,console:{warn(){},error(){}},fetch:f.send,
 });return handle;
}
const guestRequest=f=>new Request('https://fixture.invalid/cancel',{method:'POST',headers:{origin:'https://develop--frankiholz.netlify.app','content-type':'application/json'},body:JSON.stringify({reference:f.b.reference,email:f.b.guest_email})});
const hostRequest=(f,action='reject')=>new Request('https://fixture.invalid/decision',{method:'POST',headers:{authorization:'Bearer isolated-admin','content-type':'application/json'},body:JSON.stringify({booking_id:f.b.id,action})});
const setupRequest=f=>new Request('https://fixture.invalid/setup',{method:'POST',headers:{origin:'https://develop--frankiholz.netlify.app','content-type':'application/json'},body:JSON.stringify({reference:f.b.reference,email:f.b.guest_email,payment_collection_mode:'saved_method'})});
const stripeError=(type='StripeInvalidRequestError',statusCode=400,headers={})=>Object.assign(new Error('Injected provider rejection'),{type,statusCode,headers});

for(const mode of ['live','test']){
 for(const actor of ['guest','host'])test(`${mode}: ${actor} closure HTTP failure recovers with the recorded event and no repeated side effects`,async()=>{
  const f=fixture(mode);f.state.emailFailure=true;
  const guest=await entrypoint('frankiholz-cancel-booking-v2',f),host=await entrypoint('frankiholz-booking-decision',f);
  const run=actor==='guest'?()=>guest(guestRequest(f)):()=>host(hostRequest(f));
  assert.equal((await run()).status,500);assert.equal(f.b.status,'cancelled');assert.equal(f.state.queue.length,1);assert.equal(f.state.queue[0].state,'pending');
  const event=actor==='guest'?'booking_cancelled':'booking_rejected';assert.equal(f.b.closure_notification_event,event);
  f.state.emailFailure=false;
  // Replaying through the other endpoint must not invent a different origin.
  const opposite=actor==='guest'?await host(hostRequest(f)):await guest(guestRequest(f));
  assert.equal(opposite.status,200);assert.equal((await run()).status,200);
  assert.ok(f.state.emails.every(x=>x.event_type===event));assert.equal(f.state.providerDeliveries.size,1);
  assert.equal(f.state.claims,1);assert.equal(f.state.closes,1);assert.equal(f.state.refunds,0);assert.equal(f.state.detaches,0);assert.equal(f.state.piCancels,0);
 });
 for(const actor of ['guest','host'])test(`${mode}: historical closed ${actor} retry does not invent an event`,async()=>{
  const f=fixture(mode);f.b.status='cancelled';const handler=await entrypoint(actor==='guest'?'frankiholz-cancel-booking-v2':'frankiholz-booking-decision',f);
  const response=await handler(actor==='guest'?guestRequest(f):hostRequest(f));assert.equal(response.status,200);assert.equal((await response.json()).notification_recovery_required,true);
  assert.equal(f.state.emails.length,0);assert.equal(f.state.claims,0);assert.equal(f.state.closes,0);
 });
 test(`${mode}: a failed complimentary close leaves no origin or queued event and can be retried by the other actor`,async()=>{
  const f=fixture(mode);f.state.closeFailure=true;const guest=await entrypoint('frankiholz-cancel-booking-v2',f),host=await entrypoint('frankiholz-booking-decision',f);
  assert.equal((await guest(guestRequest(f))).status,500);assert.equal(f.b.status,'pending');assert.equal(f.b.closure_notification_event,null);assert.equal(f.state.queue.length,0);assert.equal(f.b.payment_operation_token,null);
  assert.equal((await host(hostRequest(f))).status,200);assert.equal(f.b.closure_notification_event,'booking_rejected');assert.deepEqual(f.state.emails,[{event_type:'booking_rejected',booking_id:f.b.id}]);
 });
 for(const first of ['guest','host'])test(`${mode}: concurrent ${first}-first closure cannot change its origin or acknowledge failed handoffs`,async()=>{
  const f=fixture(mode);f.state.emailFailure=true;const guest=await entrypoint('frankiholz-cancel-booking-v2',f),host=await entrypoint('frankiholz-booking-decision',f);
  const requests=first==='guest'?[()=>guest(guestRequest(f)),()=>host(hostRequest(f))]:[()=>host(hostRequest(f)),()=>guest(guestRequest(f))];
  const results=await Promise.all(requests.map(r=>r()));assert.ok(results.every(r=>r.status===500));assert.equal(f.state.closes,1);assert.equal(f.state.queue.length,1);
  // Admin authorization adds an await, so dispatch order does not choose the lock winner.
  const originalEvent=f.state.emails[0].event_type;assert.equal(f.b.closure_notification_event,originalEvent);
  f.state.emailFailure=false;
  const opposite=originalEvent==='booking_cancelled'?await host(hostRequest(f)):await guest(guestRequest(f));
  assert.equal(opposite.status,200);assert.equal(f.state.closes,1);assert.equal(f.state.emails.at(-1).event_type,originalEvent);
 });
 test(`${mode}: paid cancellation retry does not refund or detach twice`,async()=>{
  const f=fixture(mode,'paid');f.state.emailFailure=true;const guest=await entrypoint('frankiholz-cancel-booking-v2',f),host=await entrypoint('frankiholz-booking-decision',f);
  assert.equal((await guest(guestRequest(f))).status,500);assert.equal(f.b.status,'cancelled');assert.equal(f.b.payment_status,'refunded');assert.equal(f.state.refunds,1);assert.equal(f.state.detaches,1);assert.equal(f.state.calendarWrites,1);
  f.state.emailFailure=false;const response=await host(hostRequest(f));assert.equal(response.status,200);assert.equal((await response.json()).payment_status,'refunded');
  assert.equal(f.state.refunds,1);assert.equal(f.state.detaches,1);assert.equal(f.state.calendarWrites,1);assert.equal(f.state.emails.at(-1).event_type,'booking_cancelled');
 });
 test(`${mode}: bank rejection retry preserves the rejection event and a single refund`,async()=>{
  const f=fixture(mode,'bank');f.state.emailFailure=true;const host=await entrypoint('frankiholz-booking-decision',f),guest=await entrypoint('frankiholz-cancel-booking-v2',f);
  assert.equal((await host(hostRequest(f))).status,500);assert.equal(f.b.status,'cancelled');assert.equal(f.state.refunds,1);assert.equal(f.state.queue.length,1);
  f.state.emailFailure=false;assert.equal((await guest(guestRequest(f))).status,200);assert.equal(f.state.refunds,1);assert.equal(f.state.emails.at(-1).event_type,'booking_rejected');
 });
 test(`${mode}: existing processing and unauthorized records cannot close or trigger notifications`,async()=>{
  const f=fixture(mode,'paid');f.b.payment_status='processing';const guest=await entrypoint('frankiholz-cancel-booking-v2',f),host=await entrypoint('frankiholz-booking-decision',f);
  assert.equal((await guest(guestRequest(f))).status,409);assert.equal((await host(hostRequest(f))).status,409);assert.equal(f.b.payment_status,'processing');assert.equal(f.state.claims,0);assert.equal(f.state.emails.length,0);
  f.state.admin=false;assert.equal((await host(hostRequest(f))).status,403);assert.equal(f.state.emails.length,0);
 });
 for(const expired of [false,true])test(`${mode}: legacy ${expired?'expiry':'rejection'} retries its recorded event without repeating provider cancellation`,async()=>{
  const f=fixture(mode,'legacy');f.state.piStatus='requires_capture';f.state.emailFailure=true;if(expired)f.b.payment_due_at='2000-01-01T00:00:00Z';
  const host=await entrypoint('frankiholz-booking-decision',f);assert.equal((await host(hostRequest(f))).status,500);assert.equal(f.state.piCancels,1);assert.equal(f.state.queue.length,1);
  f.state.emailFailure=false;assert.equal((await host(hostRequest(f))).status,200);assert.equal(f.state.piCancels,1);assert.equal(f.state.closes,1);assert.equal(f.state.emails.at(-1).event_type,expired?'authorization_expired':'booking_rejected');
 });
 for(const actor of ['guest','host'])test(`${mode}: ${actor} zero-row closure never reports success or sends a notification`,async()=>{
  const f=fixture(mode,actor==='guest'?'paid':'bank');f.state.loseCloseToken=true;
  const handler=await entrypoint(actor==='guest'?'frankiholz-cancel-booking-v2':'frankiholz-booking-decision',f);
  assert.equal((await handler(actor==='guest'?guestRequest(f):hostRequest(f))).status,500);
  assert.notEqual(f.b.status,'cancelled');assert.equal(f.b.closure_notification_event,null);assert.equal(f.state.queue.length,0);assert.equal(f.state.emails.length,0);assert.equal(f.b.payment_operation_token,'different_owner_token');
 });
 test(`${mode}: an unexpectedly no-op close RPC cannot produce a false success`,async()=>{
  const f=fixture(mode);f.state.noopClose=true;const guest=await entrypoint('frankiholz-cancel-booking-v2',f);
  assert.equal((await guest(guestRequest(f))).status,500);assert.equal(f.b.status,'pending');assert.equal(f.state.emails.length,0);assert.equal(f.state.queue.length,0);
 });
 test(`${mode}: legacy closure rereads a concurrently recorded origin rather than synthesizing its own`,async()=>{
  const f=fixture(mode,'legacy');f.state.piStatus='requires_capture';f.state.legacyConcurrentClosure=true;f.state.legacyConcurrentPaymentStatus='refunded';
  const host=await entrypoint('frankiholz-booking-decision',f);const response=await host(hostRequest(f));assert.equal(response.status,200);assert.equal((await response.json()).payment_status,'refunded');
  assert.equal(f.b.closure_notification_event,'booking_cancelled');assert.equal(f.state.emails[0].event_type,'booking_cancelled');assert.equal(f.state.closes,0);
 });
 for(const frozen of [false,true])test(`${mode}: host rejection ${frozen?'preserves frozen':'replaces unprepared'} pending confirmation in the same decision stage`,async()=>{
  const f=fixture(mode);f.b.status='confirmed';
  const prior={stage:'guest_host_decision',event_type:'booking_confirmed',state:'pending',payload:frozen?{subject:'Frozen confirmation',html:'Original accepted message'}:null,first_attempt_at:frozen?Date.now():null};f.state.queue.push(structuredClone(prior));
  const host=await entrypoint('frankiholz-booking-decision',f);assert.equal((await host(hostRequest(f))).status,200);assert.equal(f.state.queue.length,1);
  assert.equal(f.state.queue[0].event_type,frozen?'booking_confirmed':'booking_rejected');assert.deepEqual(f.state.queue[0].payload,prior.payload);assert.equal(f.b.closure_notification_event,'booking_rejected');
 });
 test(`${mode}: an existing sent decision stage is retained on later cancellation`,async()=>{
  const f=fixture(mode);f.b.status='confirmed';f.state.queue.push({stage:'guest_host_decision',event_type:'booking_confirmed',state:'sent'});
  const guest=await entrypoint('frankiholz-cancel-booking-v2',f);assert.equal((await guest(guestRequest(f))).status,200);
  assert.deepEqual(f.state.queue,[{stage:'guest_host_decision',event_type:'booking_confirmed',state:'sent'}]);assert.equal(f.b.closure_notification_event,'booking_cancelled');
 });
 for(const stage of ['customer','session'])test(`${mode}: definite ${stage} validation rejection unlocks retry without duplicating a customer`,async()=>{
  const f=fixture(mode,'setup');f.state.resourceError={stage,error:stripeError()};const handler=await entrypoint(mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test',f);
  assert.equal((await handler(setupRequest(f))).status,500);assert.equal(f.b.payment_status,'not_started');assert.equal(f.b.payment_operation_token,null);assert.equal(f.state.sessions.length,0);
  assert.equal((await handler(setupRequest(f))).status,200);assert.equal(f.b.payment_status,'awaiting_payment');assert.equal(f.b.payment_operation_token,null);assert.equal(f.state.customers.size,1);assert.equal(f.state.sessions.length,1);
  assert.equal(f.state.customerCalls[0].options.idempotencyKey,f.state.customerCalls[1].options.idempotencyKey);
  if(stage==='session')assert.notEqual(f.state.sessionCalls[0].options.idempotencyKey,f.state.sessionCalls[1].options.idempotencyKey);
 });
 for(const priorSession of [null,'cs_1'])test(`${mode}: expired checkout with stored session ${priorSession} can start a genuinely new attempt`,async()=>{
  const f=fixture(mode,'setup'),handler=await entrypoint(mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test',f);
  assert.equal((await handler(setupRequest(f))).status,200);const oldKey=f.state.sessionCalls[0].options.idempotencyKey;
  Object.assign(f.b,{payment_status:'not_started',stripe_checkout_session_id:priorSession,stripe_checkout_url:null,payment_due_at:null});
  const response=await handler(setupRequest(f));assert.equal(response.status,200);assert.match((await response.json()).checkout_url,/cs_2$/);assert.notEqual(f.state.sessionCalls[1].options.idempotencyKey,oldKey);assert.equal(f.state.customers.size,1);
 });
 for(const [name,error] of [['conflict',stripeError('StripeInvalidRequestError',409)],['rate limit',stripeError('StripeRateLimitError',429)],['server',stripeError('StripeAPIError',500)],['transport',stripeError('StripeConnectionError',undefined)],['idempotency',stripeError('StripeIdempotencyError',400)],['retry advised',stripeError('StripeInvalidRequestError',400,{'stripe-should-retry':'true'})]]){
  for(const stage of ['customer','session'])test(`${mode}: ${stage} ${name} keeps the lease for reconciliation`,async()=>{
   const f=fixture(mode,'setup');f.state.resourceError={stage,error};const handler=await entrypoint(mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test',f);
   assert.equal((await handler(setupRequest(f))).status,500);assert.ok(f.b.payment_operation_token);const calls=f.state.customerCalls.length+f.state.sessionCalls.length;
   assert.equal((await handler(setupRequest(f))).status,500);assert.equal(f.state.customerCalls.length+f.state.sessionCalls.length,calls);assert.equal(f.state.sessions.length,0);
  });
 }
 test(`${mode}: a lost setup lease cannot acknowledge an unstored session`,async()=>{
  const f=fixture(mode,'setup');f.state.loseSetupToken=true;const handler=await entrypoint(mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test',f);
  assert.equal((await handler(setupRequest(f))).status,500);assert.equal(f.b.payment_status,'not_started');assert.equal(f.b.stripe_checkout_session_id,null);assert.equal(f.b.payment_operation_token,'different_owner_token');assert.equal(f.state.sessionExpires,1);
 });
 for(const customerID of [null,'',123,'unexpected_customer'])test(`${mode}: invalid returned customer ${customerID} keeps the lease and never opens checkout`,async()=>{
  const f=fixture(mode,'setup');f.state.invalidCustomerID=customerID;const handler=await entrypoint(mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test',f);
  assert.equal((await handler(setupRequest(f))).status,500);assert.ok(f.b.payment_operation_token);assert.equal(f.state.sessionCalls.length,0);assert.equal(f.b.payment_status,'not_started');
 });
 for(const failure of ['storeFailure','omitSessionURL'])test(`${mode}: ${failure} after a session was created stays locked`,async()=>{
  const f=fixture(mode,'setup');f.state[failure]=true;const handler=await entrypoint(mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test',f);
  assert.equal((await handler(setupRequest(f))).status,500);assert.ok(f.b.payment_operation_token);assert.equal(f.state.sessions.length,1);
  assert.equal((await handler(setupRequest(f))).status,500);assert.equal(f.state.sessions.length,1);assert.equal(f.state.sessionCalls.length,1);
 });
}
