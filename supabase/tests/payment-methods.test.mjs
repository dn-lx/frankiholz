import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {chargeBooking} from '../functions/_shared/booking-charge.ts';
import {openBankTransfer} from '../functions/_shared/bank-transfer.ts';
import {cancelTransfer} from '../functions/_shared/cancel-transfer.ts';
import {isComplimentary,closeComplimentary} from '../functions/_shared/complimentary.ts';
import {claimOperation,releaseOperation} from '../functions/_shared/payment-operation.ts';
import {notifyClosedBooking} from '../functions/_shared/closure-notification.ts';

const booking=()=>({id:'booking-1',reference:'FH-ISOLATED',status:'confirmed',payment_status:'scheduled_charge',payment_collection_mode:'saved_method',payment_mode:'test',payment_schedule_version:'v2_14_day',total_price:0.50,stripe_customer_id:'cus_fixture',stripe_payment_method_id:'pm_fixture',stripe_setup_intent_id:'seti_fixture',stripe_payment_intent_id:null,check_in:'2026-11-10',check_out:'2026-11-11'});
function fixture(b=booking()){
  const tables={frankiholz_bookings:[b],frankiholz_test_payment_events:[],frankiholz_payment_events:[]};
  const state={b,tables,creates:[],refunds:[],emails:[]};
  const service={
    async rpc(name,args){
      if(name==='frankiholz_get_payment_environment')return {data:'test'};
      if(name==='frankiholz_estimate_total')return {data:[{available:true}]};
      if(name!=='frankiholz_claim_payment_operation')throw new Error('Unexpected RPC '+name);
      const op=args.p_operation;
      if(b.payment_operation_token||b.status==='cancelled'||op==='charge'&&(b.status!=='confirmed'||b.payment_collection_mode!=='saved_method'||!['payment_method_saved','scheduled_charge','failed'].includes(b.payment_status)))return {error:{message:'Payment operation unavailable'}};
      const snapshot=structuredClone(b);b.payment_operation_token='operation-fixture';
      if(op==='charge')b.payment_status='processing';
      return {data:{booking:snapshot,token:b.payment_operation_token}};
    },
    from(table){
      let conditions=[],patch=null,insertion=null;
      const q={select(){return q},eq(k,v){conditions.push(row=>row[k]===v);return q},is(k,v){conditions.push(row=>row[k]===v||v===null&&row[k]===undefined);return q},neq(k,v){conditions.push(row=>row[k]!==v);return q},in(k,v){conditions.push(row=>v.includes(row[k]));return q},update(v){patch=v;return q},insert(v){insertion=v;return q},
        async run(single=false){
          const rows=tables[table]??=[];
          if(insertion){if(rows.some(r=>r.stripe_event_id===insertion.stripe_event_id))return {error:{code:'23505'}};rows.push(insertion);return {data:null};}
          if(patch&&state.beforeUpdate)state.beforeUpdate(table,patch);
          const found=rows.filter(row=>conditions.every(fn=>fn(row)));
          if(patch)found.forEach(row=>Object.assign(row,patch));
          return {data:structuredClone(single?found[0]??null:found),error:null};
        },maybeSingle(){return q.run(true)},then(resolve,reject){return q.run().then(resolve,reject)}};
      return q;
    },
  };
  const stripe={
    customers:{create:async()=>({id:'cus_fixture'})},
    paymentIntents:{create:async(data,options)=>{state.creates.push({data,options});return state.pi={...data,id:'pi_fixture',status:state.result??'processing',next_action:{display_bank_transfer_instructions:{hosted_instructions_url:'https://payments.stripe.com/bank_transfers/fixture'}}}},retrieve:async()=>state.pi,cancel:async()=>{state.pi.status='canceled';return state.pi}},
    refunds:{create:async(data,options)=>{state.refunds.push({data,options});return {status:'succeeded'}}},
    webhooks:{constructEventAsync:async()=>state.event},
  };
  return {...state,state,service,stripe};
}
async function webhook(f,name='frankiholz-stripe-webhook-test'){
  const source=await readFile(new URL('../functions/'+name+'/index.ts',import.meta.url),'utf8');
  let handler;
  class Stripe {constructor(){return f.stripe}static createSubtleCryptoProvider(){return {}}}
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),{
    Deno:{env:{get:()=> 'mock-only'},serve(fn){handler=fn}},Stripe,createClient:()=>f.service,
    Request,Response,console:{error(...errors){f.state.errors=errors.map(String)},warn(){}},fetch:async(_url,options)=>{f.state.emails.push(JSON.parse(options.body));return new Response('{}')},
  });
  return handler(new Request('https://fixture.invalid/webhook',{method:'POST',headers:{'stripe-signature':'mocked'},body:'{}'}));
}

for(const mode of ['live','test'])test(`${mode} setup refuses new transfers, preserves existing instructions and keeps saved methods`,async()=>{
 const name=mode==='live'?'frankiholz-create-authorization-v2':'frankiholz-create-authorization-test';
 const source=await readFile(new URL('../functions/'+name+'/index.ts',import.meta.url),'utf8');
 async function run(b,collection){
  const f=fixture({...booking(),status:'pending',payment_status:'not_started',guest_email:'fixture@example.invalid',payment_mode:mode,...b});
  const rpc=f.service.rpc.bind(f.service);f.service.rpc=(name,args)=>name==='frankiholz_get_payment_environment'?Promise.resolve({data:mode}):rpc(name,args);
  let handler,bankCalls=0;class Stripe{constructor(){return f.stripe}}
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),{Deno:{env:{get:()=> 'mock-only'},serve(fn){handler=fn}},Stripe,createClient:()=>f.service,Request,Response,console:{error(){}},openBankTransfer:async()=>{bankCalls++;return {checkout_url:'https://payments.stripe.com/existing',reused:true}}});
  const response=await handler(new Request('https://fixture.invalid/setup',{method:'POST',headers:{origin:'https://develop--frankiholz.netlify.app','content-type':'application/json'},body:JSON.stringify({reference:f.b.reference,email:f.b.guest_email,payment_collection_mode:collection})}));
  return {response,json:await response.json(),bankCalls,f};
 }
 const denied=await run({},'bank_transfer');assert.equal(denied.response.status,409);assert.match(denied.json.error,/New bank transfers/);assert.equal(denied.bankCalls,0);assert.equal(denied.f.creates.length,0);
 const unstarted=await run({payment_collection_mode:'bank_transfer'},'bank_transfer');assert.equal(unstarted.response.status,409);assert.equal(unstarted.bankCalls,0);
 const existing=await run({payment_collection_mode:'bank_transfer',stripe_payment_intent_id:'pi_existing'},'bank_transfer');assert.equal(existing.response.status,200);assert.equal(existing.bankCalls,1);assert.equal(existing.json.reused,true);
 const saved=await run({payment_status:'awaiting_payment',stripe_checkout_url:'https://checkout.stripe.com/existing',payment_due_at:'2099-01-01T00:00:00Z'},'saved_method');assert.equal(saved.response.status,200);assert.equal(saved.bankCalls,0);assert.equal(saved.json.checkout_url,'https://checkout.stripe.com/existing');
 const free=await run({payment_collection_mode:'complimentary',payment_status:'not_required',total_price:0},'saved_method');assert.equal(free.response.status,409);assert.match(free.json.error,/No payment is required/);assert.equal(free.bankCalls,0);assert.equal(free.f.creates.length,0);
});

const complimentary=()=>({...booking(),status:'pending',payment_status:'not_required',payment_collection_mode:'complimentary',total_price:0,promo_code:'FrankFlowGuest100',promo_discount_percent:100,guest_email:'fixture@example.invalid',stripe_customer_id:null,stripe_payment_method_id:null,stripe_setup_intent_id:null});
async function freeHandler(name,f){
 const source=await readFile(new URL('../functions/'+name+'/index.ts',import.meta.url),'utf8');let handler;
 const original=f.service.rpc.bind(f.service);
 f.service.rpc=async(name,args)=>{
   if(name==='frankiholz_admin_access_check')return {data:f.state.admin!==false};
   if(name==='frankiholz_confirm_payment_booking'){assert.equal(args.p_operation_token,f.b.payment_operation_token);f.b.status='confirmed';return {error:null}}
   if(name==='frankiholz_close_complimentary_booking'){assert.equal(args.p_operation_token,f.b.payment_operation_token);f.b.status='cancelled';f.b.closure_notification_event=args.p_event_type;return {error:null}}
   return original(name,args);
 };
 class Stripe{constructor(){throw new Error('Complimentary flow must never construct Stripe')}}
 vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),{
   Deno:{env:{get:key=>key.startsWith('STRIPE')?undefined:'mock-only'},serve(fn){handler=fn}},Stripe,createClient:()=>f.service,
   isComplimentary,closeComplimentary,claimOperation,releaseOperation,chargeBooking,cancelTransfer,notifyClosedBooking,
   Request,Response,console:{error(){},warn(){}},fetch:async(_url,options)=>{f.state.emails.push(JSON.parse(options.body));return new Response('{}')},
 });
 return handler;
}
for(const action of ['accept','reject'])test(`complimentary host ${action} works without Stripe keys or APIs`,async()=>{
 const f=fixture(complimentary()),handler=await freeHandler('frankiholz-booking-decision',f);
 const request=()=>new Request('https://fixture.invalid/decision',{method:'POST',headers:{authorization:'Bearer fixture-admin'},body:JSON.stringify({booking_id:f.b.id,action})});
 const response=await handler(request());assert.equal(response.status,200,await response.clone().text());
 assert.equal(f.b.status,action==='accept'?'confirmed':'cancelled');assert.equal(f.b.payment_status,'not_required');assert.equal(f.b.payment_operation_token,null);
 assert.equal(f.creates.length,0);assert.equal(f.refunds.length,0);assert.equal(f.b.paid_at,undefined);
 assert.deepEqual(f.state.emails.map(e=>e.event_type),[action==='accept'?'booking_confirmed':'booking_rejected']);
 assert.equal((await handler(request())).status,200);assert.equal(f.creates.length,0);
});
test('unauthorized host cannot confirm a complimentary request',async()=>{
 const f=fixture(complimentary());f.state.admin=false;const handler=await freeHandler('frankiholz-booking-decision',f);
 const response=await handler(new Request('https://fixture.invalid/decision',{method:'POST',headers:{authorization:'Bearer fixture-unauthorized'},body:JSON.stringify({booking_id:f.b.id,action:'accept'})}));
 assert.equal(response.status,403);assert.equal(f.b.status,'pending');assert.equal(f.state.emails.length,0);
});
for(const status of ['pending','confirmed'])test(`complimentary ${status} guest cancellation never charges or refunds`,async()=>{
 const f=fixture({...complimentary(),status}),handler=await freeHandler('frankiholz-cancel-booking-v2',f);
 const request=email=>new Request('https://fixture.invalid/cancel',{method:'POST',headers:{origin:'https://develop--frankiholz.netlify.app'},body:JSON.stringify({reference:f.b.reference,email})});
 assert.equal((await handler(request('wrong@example.invalid'))).status,404);assert.equal(f.b.status,status);
 const response=await handler(request(f.b.guest_email));assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).policy,'no_payment');
 assert.equal(f.b.status,'cancelled');assert.equal(f.b.payment_status,'not_required');assert.equal(f.creates.length,0);assert.equal(f.refunds.length,0);
 assert.equal((await handler(request(f.b.guest_email))).status,200);assert.equal(f.state.emails.length,2,'Closed retries repeat the idempotent notification handoff without money operations');
});
test('complimentary charge and malformed free markers are refused',async()=>{
 const f=fixture({...complimentary(),status:'confirmed'});await assert.rejects(chargeBooking(f.service,f.stripe,f.b));assert.equal(f.creates.length,0);
 assert.equal(isComplimentary({...f.b,total_price:1}),false);assert.equal(isComplimentary({...f.b,promo_discount_percent:75}),false);
});
test('complimentary messages describe no payment and cannot send receipt events',async()=>{
 const source=await readFile(new URL('../functions/frankiholz-guest-email/index.ts',import.meta.url),'utf8');let handler;const sent=[];
 const f=fixture(complimentary());const context={Deno:{env:{get:key=>key==='RESEND_API_KEY'?'fixture':'mock-only'},serve(fn){handler=fn}},createClient:()=>f.service,Request,Response,console:{error(){}},URL,Date,Intl,AbortSignal,fetch:async(_url,options)=>{sent.push(options);return new Response('{}')}};
 vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),context);
 for(const language of ['en','de'])for(const event of ['request_received','booking_confirmed']){
   const result=context.guestTemplate(event,{...f.b,language});assert.match(result.html,language==='en'?/No payment is required/:/keine Zahlung erforderlich/);assert.doesNotMatch(result.html,/automatically 14 days|automatisch 14 Tage/);
 }
 const response=await handler(new Request('https://fixture.invalid/email',{method:'POST',headers:{authorization:'Bearer mock-only'},body:JSON.stringify({event_type:'payment_confirmed',booking_id:f.b.id})}));
 assert.equal(response.status,409);assert.equal(sent.length,0);
});

test('SEPA processing is retained; repeated entry points cannot create another charge',async()=>{
  const f=fixture();const pi=await chargeBooking(f.service,f.stripe,f.b);
  assert.equal(pi.status,'processing');assert.equal(f.b.payment_status,'processing');assert.equal(f.b.stripe_payment_intent_id,'pi_fixture');
  await assert.rejects(chargeBooking(f.service,f.stripe,f.b));
  assert.equal(f.creates.length,1);assert.equal(f.creates[0].data.amount,50);
});
test('unknown Stripe result stays locked for reconciliation rather than retrying or failing the payment',async()=>{
  const f=fixture();f.stripe.paymentIntents.create=async()=>{throw new Error('network timeout')};
  await assert.rejects(chargeBooking(f.service,f.stripe,f.b),/reconciliation/);
  assert.equal(f.b.payment_status,'processing');assert.ok(f.b.payment_operation_token);
});
test('an already cancelled booking cannot start a Stripe charge',async()=>{
  const f=fixture({...booking(),status:'cancelled',payment_status:'released'});
  await assert.rejects(chargeBooking(f.service,f.stripe,f.b));assert.equal(f.creates.length,0);
});
test('bank instructions use stored total, remain pending host approval, and reuse one PaymentIntent',async()=>{
  const f=fixture({...booking(),status:'pending',payment_status:'not_started',stripe_payment_method_id:null,stripe_setup_intent_id:null});
  f.state.result='requires_action';
  const result=await openBankTransfer(f.service,f.stripe,f.b,'test');
  assert.match(result.checkout_url,/payments\.stripe\.com/);assert.equal(f.b.status,'pending');assert.equal(f.b.payment_status,'awaiting_payment');
  assert.equal(f.creates[0].data.amount,50);assert.equal(f.creates[0].data.payment_method_data.type,'customer_balance');
  await openBankTransfer(f.service,f.stripe,f.b,'test');assert.equal(f.creates.length,1);
});
test('bank settlement records paid but never confirms/reserves a pending booking; replay sends one email',async()=>{
  const f=fixture({...booking(),status:'pending',payment_status:'awaiting_payment',payment_collection_mode:'bank_transfer',stripe_payment_method_id:null,stripe_payment_intent_id:'pi_fixture'});
  f.state.pi={id:'pi_fixture',amount:50,currency:'eur',customer:'cus_fixture',status:'succeeded',metadata:{booking_id:f.b.id,payment_schedule_version:'v2_14_day'}};
  f.state.event={id:'evt_fixture',type:'payment_intent.succeeded',data:{object:f.state.pi}};
  assert.equal((await webhook(f)).status,200);assert.equal(f.b.payment_status,'paid');assert.equal(f.b.status,'pending');
  assert.equal((await webhook(f)).status,200);assert.equal(f.state.emails.length,1);
});
test('mismatched amount and stale failures cannot change a paid booking',async()=>{
  const f=fixture({...booking(),payment_status:'paid',stripe_payment_intent_id:'pi_fixture'});
  f.state.pi={id:'pi_fixture',amount:50,currency:'eur',customer:'cus_fixture',status:'succeeded',metadata:{booking_id:f.b.id,payment_schedule_version:'v2_14_day'}};
  f.state.event={id:'evt_stale',type:'payment_intent.payment_failed',data:{object:{...f.state.pi,status:'requires_payment_method'}}};
  await webhook(f);assert.equal(f.b.payment_status,'paid');assert.equal(f.state.emails.length,0);
  f.b.payment_status='awaiting_payment';f.state.event={id:'evt_wrong',type:'payment_intent.succeeded',data:{object:{...f.state.pi,amount:500}}};
  await webhook(f);assert.equal(f.b.payment_status,'awaiting_payment');assert.equal(f.state.emails.length,0);
});
test('rejecting paid bank request refunds its matching PaymentIntent, while an unfunded transfer is cancelled',async()=>{
  const f=fixture({...booking(),payment_collection_mode:'bank_transfer',stripe_payment_intent_id:'pi_fixture'});
  f.state.pi={id:'pi_fixture',amount:50,currency:'eur',customer:'cus_fixture',status:'succeeded',metadata:{booking_id:f.b.id}};
  assert.equal((await cancelTransfer(f.stripe,f.b,true)).payment_status,'refunded');assert.equal(f.refunds.length,1);
  f.state.pi.status='requires_action';assert.equal((await cancelTransfer(f.stripe,f.b,true)).payment_status,'released');assert.equal(f.state.pi.status,'canceled');
});

test('pending refunds stay paid and require review until a matching succeeded refund callback',async()=>{
  const f=fixture({...booking(),status:'cancelled',payment_status:'paid',stripe_payment_intent_id:'pi_fixture',stripe_refund_id:'re_fixture',refund_review_required:true});
  f.stripe.refunds.create=async()=>({id:'re_fixture',status:'pending'});
  f.state.pi={id:'pi_fixture',amount:50,currency:'eur',customer:'cus_fixture',status:'succeeded',metadata:{booking_id:f.b.id}};
  const result=await cancelTransfer(f.stripe,f.b,true);
  assert.equal(result.payment_status,'paid');assert.equal(result.refund_review_required,true);
  const refund={id:'re_fixture',amount:50,status:'succeeded',payment_intent:'pi_fixture',metadata:{booking_id:f.b.id}};
  f.stripe.refunds.retrieve=async()=>refund;
  f.state.event={id:'evt_refund',type:'refund.updated',data:{object:refund}};
  const response=await webhook(f);assert.equal(response.status,200,JSON.stringify(f.state.errors));assert.equal(f.b.payment_status,'refunded');assert.equal(f.b.refund_review_required,false);
});

test('payment and refund emails distinguish host approval and pending refunds in both languages',async()=>{
  const source=await readFile(new URL('../functions/frankiholz-guest-email/index.ts',import.meta.url),'utf8');
  const context={Deno:{env:{get:()=>''},serve(){}},createClient:()=>({}),console,URL,Date,Intl,AbortSignal};
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),context);
  for(const language of ['en','de']){
    const b={...booking(),language,status:'pending',frankiholz_rooms:{name:'<script>unsafe</script>'}};
    const received=context.guestTemplate('payment_confirmed',b);
    assert.match(received.html,language==='en'?/still awaits host approval/:/weiterhin auf die Bestätigung/);
    assert.ok(!received.html.includes('<script>unsafe'));
    const refund=context.guestTemplate('booking_cancelled',{...b,status:'cancelled',refund_review_required:true});
    assert.match(refund.html,language==='en'?/not yet complete/:/noch nicht abgeschlossen/);
  }
});

test('guest emails greet safely and ask arrival time only after host confirmation',async()=>{
 const source=await readFile(new URL('../functions/frankiholz-guest-email/index.ts',import.meta.url),'utf8');
 const context={Deno:{env:{get:()=>''},serve(){}},createClient:()=>({}),console,URL,Date,Intl,AbortSignal};
 vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),context);
 for(const language of ['en','de'])for(const status of ['pending','confirmed'])for(const event of ['request_received','booking_confirmed','payment_method_saved','payment_confirmed','charge_scheduled','charge_failed','booking_rejected','booking_cancelled','authorization_received','authorization_expired','approved','rejected']){
  const html=context.guestTemplate(event,{...booking(),status,language,guest_name:'<img src=x onerror=alert(1)>',frankiholz_rooms:{name:'Room 1'}}).html;
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));
  assert.match(html,language==='de'?/Mit herzlichen Grüßen/:/With warm wishes/);
  assert.match(html,/https:\/\/wa.me\/4917662493041\?text=/);assert.doesNotMatch(html,/guest_email=/);
  assert.equal(html.includes(language==='de'?'Wann dürfen wir Sie begrüßen?':'What time will you be arriving?'),status==='confirmed'&&['booking_confirmed','payment_confirmed','charge_scheduled'].includes(event));
 }
});

test('a setup callback racing cancellation cannot resurrect the booking and detaches the obsolete method',async()=>{
  const f=fixture({...booking(),status:'pending',payment_status:'awaiting_payment',stripe_payment_method_id:null,stripe_checkout_session_id:'cs_fixture'});
  let detached=false;
  f.stripe.setupIntents={retrieve:async()=>({id:'seti_fixture',status:'succeeded',payment_method:'pm_new'})};
  f.stripe.paymentMethods={detach:async()=>{detached=true}};
  f.state.beforeUpdate=(_table,patch)=>{if(patch.payment_status==='payment_method_saved'){f.b.status='cancelled';f.b.payment_status='released'}};
  f.state.event={id:'evt_setup_race',type:'checkout.session.completed',data:{object:{id:'cs_fixture',mode:'setup',customer:'cus_fixture',setup_intent:'seti_fixture',metadata:{booking_id:f.b.id,payment_schedule_version:'v2_14_day'}}}};
  const response=await webhook(f);
  assert.equal(response.status,200,JSON.stringify(f.state.errors));assert.equal(f.b.status,'cancelled');assert.equal(f.b.payment_status,'released');assert.equal(detached,true);assert.equal(f.state.emails.length,0);
});
test('an expiry callback racing completed setup cannot clear the saved method',async()=>{
  const f=fixture({...booking(),status:'pending',payment_status:'awaiting_payment',stripe_checkout_session_id:'cs_fixture'});
  f.state.beforeUpdate=(_table,patch)=>{if(patch.payment_status==='not_started')f.b.payment_status='payment_method_saved'};
  f.state.event={id:'evt_expiry_race',type:'checkout.session.expired',data:{object:{id:'cs_fixture',metadata:{booking_id:f.b.id}}}};
  const response=await webhook(f);assert.equal(response.status,200);assert.equal(f.b.payment_status,'payment_method_saved');assert.equal(f.b.stripe_checkout_session_id,'cs_fixture');
});

test('admin profile values are escaped before inclusion in HTML email',async()=>{
 const source=await readFile(new URL('../functions/frankiholz-guest-email/index.ts',import.meta.url),'utf8');
 const sent=[];const context={Deno:{env:{get:(key)=>key==='RESEND_API_KEY'?'fixture':''},serve(){}},createClient:()=>({}),console,URL,Date,Intl,AbortSignal,fetch:async(_url,options)=>{sent.push(JSON.parse(options.body));return {ok:true,json:async()=>({id:'email_fixture'})}}};
 vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'')),context);
 const unsafe='<img src=x onerror=alert(1)>';
 await context.sendAdminIfNeeded('request_received',{...booking(),guest_age:unsafe,guest_sex:unsafe,guest_country:unsafe,guest_languages:[unsafe],guest_hobbies:unsafe});
 assert.equal(sent.length,1);assert.ok(!sent[0].html.includes(unsafe));assert.match(sent[0].html,/Country: &lt;img/);assert.match(sent[0].html,/Languages: &lt;img/);
});

test('an expired card setup can switch to bank transfer without attempting to expire it again',async()=>{
 const f=fixture({...booking(),status:'pending',payment_status:'awaiting_payment',stripe_payment_method_id:null,stripe_checkout_session_id:'cs_expired'});
 f.state.result='requires_action';f.stripe.checkout={sessions:{retrieve:async()=>({id:'cs_expired',status:'expired'}),expire:async()=>{throw new Error('Expired session cannot expire again')}}};
 const result=await openBankTransfer(f.service,f.stripe,f.b,'test');assert.equal(result.bank_transfer,true);assert.equal(f.b.payment_operation_token,null);assert.equal(f.creates.length,1);
});
