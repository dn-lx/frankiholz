import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

// Execute both real Deno entrypoints with isolated Stripe/DB/HTTP dependencies.
// Guest delivery's provider/outbox idempotency is covered separately in
// guest-email-delivery.test.mjs; here the boundary is acceptance by that service.
async function fixture(mode,type='payment_intent.succeeded'){
  const name=mode==='live'?'frankiholz-stripe-webhook':'frankiholz-stripe-webhook-test';
  const source=await readFile(new URL(`../functions/${name}/index.ts`,import.meta.url),'utf8');
  const b={id:'booking_fixture',reference:'FH-FIXTURE',status:'confirmed',payment_status:'processing',payment_mode:mode,
    payment_schedule_version:'v2_14_day',payment_collection_mode:'saved_method',total_price:95,paid_at:null,
    check_in:'2027-01-25',stripe_customer_id:'cus_fixture',stripe_payment_intent_id:'pi_fixture',
    stripe_checkout_session_id:'cs_fixture',stripe_setup_intent_id:null,stripe_payment_method_id:null,payment_operation_token:null};
  const pi={id:'pi_fixture',amount:9500,currency:'eur',customer:'cus_fixture',status:type==='payment_intent.payment_failed'?'requires_payment_method':'succeeded',
    metadata:{booking_id:b.id,payment_schedule_version:'v2_14_day'}};
  const session={id:'cs_fixture',mode:'setup',customer:'cus_fixture',setup_intent:'seti_fixture',
    metadata:{booking_id:b.id,payment_schedule_version:'v2_14_day'}};
  const event={id:'evt_fixture',type,data:{object:type.startsWith('checkout.')?session:pi}};
  const events=[],emailAttempts=[],detached=[];
  const state={readFailure:null,writeFailure:null,emailFailure:false,signatureFailure:false,bookingWrites:0,rpcCalls:[]};
  if(type.startsWith('checkout.'))Object.assign(b,{status:'pending',payment_status:'awaiting_payment',stripe_payment_intent_id:null});
  const service={async rpc(name,args){
    state.rpcCalls.push({name,args});
    if(name==='frankiholz_mark_authorized_hold'){
      if(b.payment_status==='authorized')return {data:false};
      Object.assign(b,{payment_status:'authorized',stripe_payment_intent_id:args.p_payment_intent_id});return {data:true};
    }
    if(name==='frankiholz_release_authorized_hold'){
      Object.assign(b,{status:'cancelled',payment_status:args.p_reason});return {error:null};
    }
    throw new Error('Unexpected RPC '+name);
  },from(table){
    let patch,insertion;const conditions=[];
    const q={select(){return q},eq(k,v){conditions.push(row=>row[k]===v);return q},
      in(k,values){conditions.push(row=>values.includes(row[k]));return q},
      is(k,v){conditions.push(row=>row[k]===v);return q},
      update(value){patch=value;return q},insert(value){insertion=value;return q},
      async run(single=false){
        if(!patch&&!insertion&&state.readFailure===table){state.readFailure=null;return {data:null,error:{message:'Injected DB read failure'}};}
        if((patch||insertion)&&state.writeFailure===table){state.writeFailure=null;return {data:null,error:{message:'Injected DB write failure'}};}
        if(insertion){if(events.some(e=>e.stripe_event_id===insertion.stripe_event_id))return {error:{code:'23505'}};events.push(insertion);return {error:null};}
        const rows=(table==='frankiholz_bookings'?[b]:events).filter(row=>conditions.every(fn=>fn(row)));
        if(patch){rows.forEach(row=>Object.assign(row,patch));state.bookingWrites+=rows.length;}
        return {data:structuredClone(single?rows[0]??null:rows),error:null};
      },maybeSingle(){return q.run(true)},then(resolve,reject){return q.run().then(resolve,reject)}};
    return q;
  }};
  class Stripe{constructor(){return {
    webhooks:{constructEventAsync:async()=>{if(state.signatureFailure)throw new Error('Invalid signature');return event}},
    paymentIntents:{retrieve:async()=>pi},
    setupIntents:{retrieve:async()=>({id:'seti_fixture',status:'succeeded',payment_method:'pm_fixture'})},
    paymentMethods:{detach:async id=>detached.push(id)},
  }}static createSubtleCryptoProvider(){return {}}}
  let handler;
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),{
    Deno:{env:{get:()=> 'isolated-fixture'},serve(fn){handler=fn}},Stripe,createClient:()=>service,Request,Response,
    console:{error(){},warn(){}},fetch:async(_url,options)=>{
      emailAttempts.push(JSON.parse(options.body));
      return state.emailFailure?new Response('{}',{status:500}):new Response('{"ok":true}');
    },
  });
  const request=()=>handler(new Request('https://fixture.invalid/webhook',{method:'POST',headers:{'stripe-signature':'isolated-fixture'},body:'{}'}));
  return {b,pi,event,events,emailAttempts,detached,state,request};
}

for(const mode of ['live','test']){
  test(`${mode}: failed event-ledger read is retried without applying the payment`,async()=>{
    const f=await fixture(mode);f.state.readFailure=mode==='live'?'frankiholz_payment_events':'frankiholz_test_payment_events';
    assert.equal((await f.request()).status,500);assert.equal(f.events.length,0);assert.equal(f.b.payment_status,'processing');assert.equal(f.emailAttempts.length,0);
    assert.equal((await f.request()).status,200);assert.equal(f.b.payment_status,'paid');assert.equal(f.events.length,1);
  });
  for(const type of ['payment_intent.succeeded','payment_intent.payment_failed']){
    const finalState=type.endsWith('succeeded')?'paid':'failed';
    for(const failure of ['readFailure','writeFailure'])test(`${mode}: ${type} recovers from a transient booking ${failure}`,async()=>{
      const f=await fixture(mode,type);f.state[failure]='frankiholz_bookings';
      assert.equal((await f.request()).status,500);assert.equal(f.events.length,0);assert.equal(f.b.payment_status,'processing');assert.equal(f.emailAttempts.length,0);
      assert.equal((await f.request()).status,200);assert.equal(f.b.payment_status,finalState);assert.equal(f.events.length,1);assert.equal(f.emailAttempts.length,1);
      assert.equal((await f.request()).status,200);assert.equal(f.emailAttempts.length,1);
    });
  }
  test(`${mode}: failed expiry update remains retriable and does not clear a later saved method`,async()=>{
    const f=await fixture(mode,'checkout.session.expired');f.state.writeFailure='frankiholz_bookings';
    assert.equal((await f.request()).status,500);assert.equal(f.events.length,0);assert.equal(f.b.payment_status,'awaiting_payment');
    f.b.payment_status='payment_method_saved';
    assert.equal((await f.request()).status,200);assert.equal(f.b.payment_status,'payment_method_saved');assert.equal(f.b.stripe_checkout_session_id,'cs_fixture');assert.equal(f.emailAttempts.length,0);
  });
  for(const type of ['payment_intent.succeeded','payment_intent.payment_failed','checkout.session.completed'])test(`${mode}: ${type} retries email HTTP 500 after its state transition`,async()=>{
    const f=await fixture(mode,type);f.state.emailFailure=true;
    assert.equal((await f.request()).status,500);assert.equal(f.events.length,0);assert.equal(f.emailAttempts.length,1);
    const stateAfterTransition=f.b.payment_status,paidAt=f.b.paid_at,writes=f.state.bookingWrites;
    f.state.emailFailure=false;
    assert.equal((await f.request()).status,200);assert.equal(f.events.length,1);assert.equal(f.b.payment_status,stateAfterTransition);
    assert.equal(f.b.paid_at,paidAt);assert.equal(f.emailAttempts.length,2);assert.deepEqual(f.emailAttempts[0],f.emailAttempts[1]);
    if(type==='checkout.session.completed')assert.equal(f.state.bookingWrites,writes,'Setup replay must not resave or detach the active method');
    assert.equal((await f.request()).status,200);assert.equal(f.emailAttempts.length,2);assert.deepEqual(f.detached,[]);
  });
  test(`${mode}: concurrent setup callbacks cannot acknowledge an event while every email handoff fails`,async()=>{
    const f=await fixture(mode,'checkout.session.completed');f.state.emailFailure=true;
    const responses=await Promise.all([f.request(),f.request()]);
    assert.deepEqual(responses.map(r=>r.status),[500,500]);assert.equal(f.events.length,0);assert.equal(f.emailAttempts.length,2);
    assert.deepEqual(f.emailAttempts[0],f.emailAttempts[1]);assert.deepEqual(f.detached,[]);
    f.state.emailFailure=false;
    assert.equal((await f.request()).status,200);assert.equal(f.events.length,1);assert.equal(f.emailAttempts.length,3);
    assert.equal((await f.request()).status,200);assert.equal(f.emailAttempts.length,3);
  });
  test(`${mode}: lost ledger acknowledgement safely repeats the same idempotent email handoff`,async()=>{
    const f=await fixture(mode,'checkout.session.completed');
    f.state.writeFailure=mode==='live'?'frankiholz_payment_events':'frankiholz_test_payment_events';
    assert.equal((await f.request()).status,500);assert.equal(f.events.length,0);assert.equal(f.b.payment_status,'payment_method_saved');
    assert.equal((await f.request()).status,200);assert.equal(f.events.length,1);assert.equal(f.emailAttempts.length,2);
    assert.deepEqual(f.emailAttempts[0],{event_type:'payment_method_saved',booking_id:f.b.id});assert.deepEqual(f.emailAttempts[1],f.emailAttempts[0]);
    assert.equal((await f.request()).status,200);assert.equal(f.emailAttempts.length,2);
  });
  test(`${mode}: cancelled or superseded setup retries do not send an obsolete ready notification`,async()=>{
    for(const changed of ['cancelled','superseded']){
      const f=await fixture(mode,'checkout.session.completed');f.state.emailFailure=true;
      assert.equal((await f.request()).status,500);f.state.emailFailure=false;
      if(changed==='cancelled'){f.b.status='cancelled';f.b.payment_status='released';}
      else f.b.stripe_checkout_session_id='cs_replacement';
      assert.equal((await f.request()).status,200);assert.equal(f.emailAttempts.length,1);
      assert.deepEqual(f.detached,changed==='cancelled'?['pm_fixture']:[]);
    }
  });
  test(`${mode}: stale failure after asynchronous settlement cannot downgrade paid state`,async()=>{
    const f=await fixture(mode,'payment_intent.payment_failed');f.b.payment_status='paid';f.pi.status='succeeded';
    assert.equal((await f.request()).status,200);assert.equal(f.b.payment_status,'paid');assert.equal(f.emailAttempts.length,0);
  });
  test(`${mode}: legacy authorization replay does not reapply or reject an existing hold`,async()=>{
    const f=await fixture(mode,'payment_intent.amount_capturable_updated');
    Object.assign(f.b,{status:'pending',payment_schedule_version:'legacy',payment_status:'awaiting_payment',stripe_payment_intent_id:null});
    f.pi.status='requires_capture';f.state.emailFailure=true;
    assert.equal((await f.request()).status,500);assert.equal(f.b.payment_status,'authorized');assert.equal(f.state.rpcCalls.length,1);
    f.state.emailFailure=false;
    assert.equal((await f.request()).status,200);assert.equal(f.b.payment_status,'authorized');assert.equal(f.state.rpcCalls.length,1);
    assert.deepEqual(f.emailAttempts[1],{event_type:'authorization_received',booking_id:f.b.id});
    assert.equal((await f.request()).status,200);assert.equal(f.emailAttempts.length,2);
  });
  test(`${mode}: concurrent legacy authorization callbacks retain a failed notification for retry`,async()=>{
    const f=await fixture(mode,'payment_intent.amount_capturable_updated');
    Object.assign(f.b,{status:'pending',payment_schedule_version:'legacy',payment_status:'awaiting_payment',stripe_payment_intent_id:null});
    f.pi.status='requires_capture';f.state.emailFailure=true;
    const responses=await Promise.all([f.request(),f.request()]);
    assert.deepEqual(responses.map(r=>r.status),[500,500]);assert.equal(f.events.length,0);assert.equal(f.b.payment_status,'authorized');
    f.state.emailFailure=false;assert.equal((await f.request()).status,200);assert.equal(f.events.length,1);
  });
  test(`${mode}: legacy checkout retry preserves its existing authorization`,async()=>{
    const f=await fixture(mode,'checkout.session.completed');
    f.b.payment_schedule_version='legacy';f.event.data.object.metadata.payment_schedule_version='legacy';f.event.data.object.payment_intent='pi_fixture';f.pi.status='requires_capture';f.state.emailFailure=true;
    assert.equal((await f.request()).status,500);assert.equal(f.b.payment_status,'authorized');assert.equal(f.state.rpcCalls.length,1);
    f.state.emailFailure=false;
    assert.equal((await f.request()).status,200);assert.equal(f.b.payment_status,'authorized');assert.equal(f.state.rpcCalls.length,1);
    assert.deepEqual(f.emailAttempts[1],{event_type:'authorization_received',booking_id:f.b.id});
  });
  test(`${mode}: released legacy cancellation retries its notification without rerunning release`,async()=>{
    const f=await fixture(mode,'payment_intent.canceled');
    Object.assign(f.b,{status:'pending',payment_schedule_version:'legacy',payment_status:'authorized',payment_due_at:'2099-01-01T00:00:00Z'});
    f.pi.status='canceled';f.state.emailFailure=true;
    assert.equal((await f.request()).status,500);assert.equal(f.b.payment_status,'released');assert.equal(f.state.rpcCalls.length,1);
    f.state.emailFailure=false;
    assert.equal((await f.request()).status,200);assert.equal(f.state.rpcCalls.length,1);
    assert.deepEqual(f.emailAttempts[1],{event_type:'booking_rejected',booking_id:f.b.id});
  });
  test(`${mode}: invalid signatures cannot read or mutate state or trigger notifications`,async()=>{
    const f=await fixture(mode);f.state.signatureFailure=true;
    assert.equal((await f.request()).status,400);assert.equal(f.state.bookingWrites,0);assert.equal(f.events.length,0);assert.equal(f.emailAttempts.length,0);
  });
}
