import { notifyClosedBooking } from "../_shared/closure-notification.ts";
import { isComplimentary, closeComplimentary } from "../_shared/complimentary.ts";
import { claimOperation, releaseOperation } from "../_shared/payment-operation.ts";
import { cancelTransfer } from "../_shared/cancel-transfer.ts";
import { chargeBooking } from "../_shared/booking-charge.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;const PUBLIC_KEY=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;const LIVE_KEY=Deno.env.get("STRIPE_SECRET_KEY")??"";const TEST_KEY=Deno.env.get("STRIPE_TEST_SECRET_KEY")??"";const allowedOrigins=new Set(["https://stay.frankiflow.de","https://accommodation.frankiflow.de","https://frankiholz.netlify.app","https://develop--frankiholz.netlify.app","https://frankiholz.shipstatic.com"]);const service=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
function cors(req:Request){const o=req.headers.get("origin")??"";const a=allowedOrigins.has(o)||o.startsWith("http://localhost:")?o:"https://stay.frankiflow.de";return{"Access-Control-Allow-Origin":a,"Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Vary":"Origin"}}
async function email(event_type:string,booking_id:string){try{await fetch(`${SUPABASE_URL}/functions/v1/frankiholz-guest-email`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${SERVICE_ROLE}`},body:JSON.stringify({event_type,booking_id})})}catch(e){console.warn("Email trigger failed",e)}}
async function markConfirmed(b:any,_paymentStatus:string){const operation=await claimOperation(service,b.id,"accept");const {error}=await service.rpc("frankiholz_confirm_payment_booking",{p_booking_id:b.id,p_operation_token:operation.token});await releaseOperation(service,b.id,operation.token);if(error)throw error}
const chargeNow=(b:any,stripe:Stripe)=>chargeBooking(service,stripe,b);
Deno.serve(async(req:Request)=>{const headers=cors(req);if(req.method==="OPTIONS")return new Response("ok",{headers});if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers});const auth=req.headers.get("authorization");if(!auth)return new Response(JSON.stringify({error:"Missing authorization"}),{status:401,headers});const userClient=createClient(SUPABASE_URL,PUBLIC_KEY,{global:{headers:{Authorization:auth}}});try{const {data:isAdmin,error:adminError}=await userClient.rpc("frankiholz_admin_access_check");if(adminError||!isAdmin)return new Response(JSON.stringify({error:"Not authorized"}),{status:403,headers});const body=await req.json();const bookingId=String(body?.booking_id||""),action=String(body?.action||"");if(!bookingId||!["accept","reject"].includes(action))return new Response(JSON.stringify({error:"booking_id and valid action are required"}),{status:400,headers});const {data:b,error}=await service.from("frankiholz_bookings").select("*").eq("id",bookingId).maybeSingle();if(error||!b)return new Response(JSON.stringify({error:"Booking not found"}),{status:404,headers});
  if(b.status==="cancelled"){
    if(action!=="reject")return new Response(JSON.stringify({error:"This booking is already closed"}),{status:409,headers});
    const notified=await notifyClosedBooking(service,b.id,SUPABASE_URL,SERVICE_ROLE,fetch);
    return new Response(JSON.stringify({ok:true,status:"cancelled",payment_status:notified.booking.payment_status,mode:notified.booking.payment_mode,notification_recovery_required:!notified.notified}),{headers});
  }
  // Manual direct transfers are independent of Stripe. An authorized admin must
  // attest to the bank statement's credited amount, not just an emailed receipt.
  if(b.payment_collection_mode==="manual_bank"){
    if(b.payment_schedule_version!=="v2_14_day")return new Response(JSON.stringify({error:"Invalid manual transfer booking"}),{status:409,headers});
    if(action==="accept"){
      const amount=Number(body?.received_eur),reference=String(body?.verified_reference||"").trim();
      if(!Number.isFinite(amount)||!reference)return new Response(JSON.stringify({error:"Bank statement amount and verified payment reference are required"}),{status:400,headers});
      const {error:confirmError}=await userClient.rpc("frankiholz_admin_confirm_manual_bank",{p_booking_id:b.id,p_received_eur:amount,p_verified_reference:reference});
      if(confirmError)return new Response(JSON.stringify({error:confirmError.message}),{status:409,headers});
      await email("booking_confirmed",b.id);
      return new Response(JSON.stringify({ok:true,status:"confirmed",payment_status:"paid",mode:b.payment_mode}),{headers});
    }
    const {error:rejectError}=await userClient.rpc("frankiholz_admin_reject_manual_bank",{p_booking_id:b.id,p_reconciliation_acknowledged:body?.reconciliation_acknowledged===true});
    if(rejectError)return new Response(JSON.stringify({error:rejectError.message}),{status:409,headers});
    await notifyClosedBooking(service,b.id,SUPABASE_URL,SERVICE_ROLE,fetch);
    return new Response(JSON.stringify({ok:true,status:"cancelled",payment_status:"released",manual_reconciliation_required:true}),{headers});
  }
  if(b.payment_collection_mode==="complimentary"){
    if(!isComplimentary(b))return new Response(JSON.stringify({error:"Invalid complimentary booking"}),{status:409,headers});
    if(action==="accept")await markConfirmed(b,"not_required");else await closeComplimentary(service,b,"booking_rejected");
    if(action==="accept")await email("booking_confirmed",b.id);else await notifyClosedBooking(service,b.id,SUPABASE_URL,SERVICE_ROLE,fetch);
    return new Response(JSON.stringify({ok:true,status:action==="accept"?"confirmed":"cancelled",payment_status:"not_required",mode:b.payment_mode}),{headers});
  }
  if(b.payment_schedule_version==="v2_14_day"){
    const key=b.payment_mode==="test"?TEST_KEY:LIVE_KEY;if(!key)return new Response(JSON.stringify({error:`Stripe ${b.payment_mode} key is not configured`}),{status:503,headers});const stripe=new Stripe(key);
    if(b.payment_status==="processing")return new Response(JSON.stringify({ok:action==="accept",status:b.status,payment_status:"processing",error:action==="reject"?"Payment is processing. Please wait for settlement before rejecting.":undefined}),{status:action==="accept"?200:409,headers});
    if(action==="reject"){
      const operation=await claimOperation(service,b.id,"cancel"),current=operation.booking;
      if(current.payment_collection_mode!=="bank_transfer"&&current.payment_status==="paid"){
        await releaseOperation(service,b.id,operation.token);
        return new Response(JSON.stringify({error:"Paid saved-method bookings must be cancelled using the refund policy"}),{status:409,headers});
      }
      const transfer=current.payment_collection_mode==="bank_transfer"?await cancelTransfer(stripe,current,true):{payment_status:"released",stripe_refund_id:null,refund_review_required:false};
      if(current.stripe_payment_method_id){try{await stripe.paymentMethods.detach(current.stripe_payment_method_id)}catch{console.warn("Payment method detach needs review")}}
      const {error:calendarError}=await service.from("frankiholz_calendar").update({is_available:true,availability_status:"available",booking_id:null,updated_at:new Date().toISOString()}).eq("booking_id",b.id);if(calendarError)throw calendarError;
      const {data:closed,error:bookingError}=await service.from("frankiholz_bookings").update({status:"cancelled",closure_notification_event:"booking_rejected",payment_status:transfer.payment_status,stripe_refund_id:transfer.stripe_refund_id,refund_review_required:transfer.refund_review_required,bank_transfer_review_required:current.payment_collection_mode==="bank_transfer",cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",b.id).eq("payment_operation_token",operation.token).select("id");if(bookingError)throw bookingError;if(closed?.length!==1)throw new Error("Booking rejection needs reconciliation; please contact FrankiHolz");
      await releaseOperation(service,b.id,operation.token);await notifyClosedBooking(service,b.id,SUPABASE_URL,SERVICE_ROLE,fetch);
      return new Response(JSON.stringify({ok:true,status:"cancelled",payment_status:transfer.payment_status,mode:b.payment_mode}),{headers});
    }
    if(!["payment_method_saved","scheduled_charge","paid"].includes(b.payment_status))return new Response(JSON.stringify({error:"Guest must save a payment method before this booking can be accepted"}),{status:409,headers});if(b.payment_status==="paid"){await markConfirmed(b,"paid");await email("booking_confirmed",b.id);return new Response(JSON.stringify({ok:true,status:"confirmed",payment_status:"paid",mode:b.payment_mode}),{headers})}
    const due=b.charge_due_at?new Date(b.charge_due_at).getTime():new Date(`${b.check_in}T12:00:00Z`).getTime()-14*86400000;const dueNow=due<=Date.now();await markConfirmed(b,"scheduled_charge");let chargedStatus="scheduled_charge";if(dueNow){try{const pi=await chargeNow(b,stripe);chargedStatus=pi.status==="succeeded"?"paid":"processing";if(pi.status==="succeeded")await email("payment_confirmed",b.id)}catch(e){if(e instanceof Error&&e.message==="Payment requires customer attention")await email("charge_failed",b.id);throw e}}await email("booking_confirmed",b.id);return new Response(JSON.stringify({ok:true,status:"confirmed",payment_status:chargedStatus,charge_due_at:b.charge_due_at,mode:b.payment_mode}),{headers})
  }
  if(b.payment_status==="paid")return new Response(JSON.stringify({ok:true,already_paid:true}),{headers});if(b.payment_status!=="authorized"||!b.stripe_payment_intent_id)return new Response(JSON.stringify({error:"Booking does not have an active card authorization"}),{status:409,headers});const key=b.payment_mode==="test"?TEST_KEY:LIVE_KEY;if(!key)return new Response(JSON.stringify({error:`Stripe ${b.payment_mode} key is not configured`}),{status:503,headers});const stripe=new Stripe(key);if(b.payment_due_at&&new Date(b.payment_due_at).getTime()<=Date.now()){try{const pi=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);if(pi.status==="requires_capture")await stripe.paymentIntents.cancel(pi.id)}catch{}const {error:releaseError}=await service.rpc("frankiholz_release_hold_with_notification",{p_booking_id:b.id,p_reason:"expired"});if(releaseError)throw releaseError;await notifyClosedBooking(service,b.id,SUPABASE_URL,SERVICE_ROLE,fetch);return new Response(JSON.stringify({error:"The 48-hour confirmation window has expired"}),{status:409,headers})}
  if(action==="accept"){const pi=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);let captured=pi;if(pi.status==="requires_capture")captured=await stripe.paymentIntents.capture(pi.id);if(captured.status!=="succeeded")return new Response(JSON.stringify({error:`Payment could not be captured (Stripe status: ${captured.status})`}),{status:409,headers});await service.rpc("frankiholz_mark_payment_captured",{p_booking_id:b.id,p_payment_intent_id:captured.id});await email("booking_confirmed",b.id);return new Response(JSON.stringify({ok:true,status:"confirmed",payment_status:"paid",mode:b.payment_mode}),{headers})}
  try{const pi=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);if(["requires_capture","requires_payment_method","requires_confirmation","requires_action","processing"].includes(pi.status))await stripe.paymentIntents.cancel(pi.id)}catch{}const {error:releaseError}=await service.rpc("frankiholz_release_hold_with_notification",{p_booking_id:b.id,p_reason:"released"});if(releaseError)throw releaseError;const closure=await notifyClosedBooking(service,b.id,SUPABASE_URL,SERVICE_ROLE,fetch);return new Response(JSON.stringify({ok:true,status:"cancelled",payment_status:closure.booking.payment_status,mode:closure.booking.payment_mode,notification_recovery_required:!closure.notified}),{headers})
 }catch(error){console.error(error);return new Response(JSON.stringify({error:error instanceof Error?error.message:"Unexpected error"}),{status:500,headers})}});