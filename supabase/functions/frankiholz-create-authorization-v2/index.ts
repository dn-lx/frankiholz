import { createSetupResource } from "../_shared/setup-resource.ts";
import { openBankTransfer } from "../_shared/bank-transfer.ts";
import { claimOperation, releaseOperation } from "../_shared/payment-operation.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY=Deno.env.get("STRIPE_SECRET_KEY")??"";
const CONFIGURED_SITE_URL=(Deno.env.get("FRANKIHOLZ_SITE_URL")??"").replace(/\/+$/,"");
const SITE_URL=(!CONFIGURED_SITE_URL||CONFIGURED_SITE_URL==="https://accommodation.frankiflow.de")?"https://stay.frankiflow.de":CONFIGURED_SITE_URL;
const stripe=STRIPE_SECRET_KEY?new Stripe(STRIPE_SECRET_KEY):null;
const service=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
const allowedOrigins=new Set(["https://stay.frankiflow.de","https://accommodation.frankiflow.de","https://frankiholz.netlify.app","https://develop--frankiholz.netlify.app"]);
function cors(req:Request){const origin=req.headers.get("origin")??"";const allow=allowedOrigins.has(origin)?origin:"https://stay.frankiflow.de";return{"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Vary":"Origin"}}

Deno.serve(async(req:Request)=>{
 const headers=cors(req);if(req.method==="OPTIONS")return new Response("ok",{headers});if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers});
 const origin=req.headers.get("origin")??"";if(!allowedOrigins.has(origin))return new Response(JSON.stringify({error:"Origin not allowed"}),{status:403,headers});if(!stripe)return new Response(JSON.stringify({error:"Stripe live mode is not configured"}),{status:503,headers});
 try{
  const body=await req.json();const reference=String(body?.reference||"").trim();const email=String(body?.email||"").trim().toLowerCase();if(!reference||!email)return new Response(JSON.stringify({error:"Booking reference and email are required"}),{status:400,headers});
  const {data:booking,error}=await service.from("frankiholz_bookings").select("*,frankiholz_rooms(name,name_de)").eq("reference",reference).eq("guest_email",email).maybeSingle();if(error||!booking)return new Response(JSON.stringify({error:"Booking not found"}),{status:404,headers});
  if(booking.payment_collection_mode==="complimentary"||booking.payment_status==="not_required"||Number(booking.total_price)<=0)return new Response(JSON.stringify({error:"No payment is required for this complimentary booking. Check your booking status."}),{status:409,headers});
  const {data:environment,error:environmentError}=await service.rpc("frankiholz_get_payment_environment");if(environmentError||environment!=="live")return new Response(JSON.stringify({error:"Payment environment changed; please contact FrankiHolz"}),{status:409,headers});
  if(booking.payment_status!=="not_started"&&booking.payment_mode!=="live")return new Response(JSON.stringify({error:"Booking payment environment mismatch"}),{status:409,headers});
  if(booking.payment_schedule_version!=="v2_14_day")return new Response(JSON.stringify({error:"This booking is not using the 14-day payment flow"}),{status:409,headers});
  const collection=String(body.payment_collection_mode||"saved_method");if(!["saved_method","bank_transfer"].includes(collection))return new Response(JSON.stringify({error:"Unsupported payment method"}),{status:400,headers});if(booking.payment_collection_mode==="bank_transfer"&&collection!=="bank_transfer")return new Response(JSON.stringify({error:"A bank transfer is already in progress. Please use the existing instructions."}),{status:409,headers});
  if(collection==="bank_transfer"){const result=await openBankTransfer(service,stripe,booking,"live");return new Response(JSON.stringify(result),{headers})}
  if(booking.status==="cancelled")return new Response(JSON.stringify({error:"This booking request is closed"}),{status:409,headers});
  if(["payment_method_saved","scheduled_charge","processing","paid"].includes(booking.payment_status))return new Response(JSON.stringify({error:"A payment method is already saved for this booking"}),{status:409,headers});
  if(booking.payment_status==="awaiting_payment"&&booking.payment_mode==="live"&&booking.stripe_checkout_url&&booking.payment_due_at&&new Date(booking.payment_due_at).getTime()>Date.now())return new Response(JSON.stringify({checkout_url:booking.stripe_checkout_url,reused:true,live_mode:true}),{headers});
  const {data:estimate,error:estimateError}=await service.rpc("frankiholz_estimate_total",{p_room_id:booking.room_id,p_check_in:booking.check_in,p_check_out:booking.check_out});if(estimateError||!estimate?.[0]?.available)return new Response(JSON.stringify({error:"Those dates are no longer available"}),{status:409,headers});
  const {token}=await claimOperation(service,booking.id,"setup");
  const {data:pricedTotal,error:priceError}=await service.rpc("frankiholz_prepare_collection_total",{p_booking_id:booking.id,p_operation_token:token,p_collection_mode:"saved_method"});
  if(priceError||!Number.isFinite(Number(pricedTotal)))throw priceError||new Error("Payment amount unavailable");
  let customerId=booking.stripe_customer_id as string|null;if(!customerId){const customer=await createSetupResource(service,booking.id,token,()=>stripe.customers.create({email:booking.guest_email,name:booking.guest_name,phone:booking.guest_phone||undefined,metadata:{booking_id:booking.id,reference:booking.reference,frankiholz_mode:"live"}},{idempotencyKey:`fh-setup-customer-live-${booking.id}`}));customerId=customer.id;}
  if(typeof customerId!=="string"||!customerId.startsWith("cus_"))throw new Error("Payment customer needs reconciliation; please contact FrankiHolz");
  const checkoutCustomerId=customerId;
  const language=booking.language==="de"?"de":"en";const expiresAt=Math.floor((Date.now()+30*60*1000)/1000);const metadata={booking_id:booking.id,reference:booking.reference,language,frankiholz_mode:"live",payment_schedule_version:"v2_14_day"};
  const checkIn=new Date(`${booking.check_in}T12:00:00Z`);const scheduled=new Date(checkIn.getTime()-14*86400000);const chargeDueAt=new Date(Math.max(Date.now(),scheduled.getTime())).toISOString();
  const returnBase=allowedOrigins.has(origin)?origin:SITE_URL;
 const session=await createSetupResource(service,booking.id,token,()=>stripe.checkout.sessions.create({mode:"setup",currency:"eur",customer:checkoutCustomerId,excluded_payment_method_types:["paypal"],locale:language,expires_at:expiresAt,success_url:`${returnBase}/payment-success?session_id={CHECKOUT_SESSION_ID}&lang=${language}&setup=1`,cancel_url:`${returnBase}/booking-status?lang=${language}`,metadata,setup_intent_data:{metadata},custom_text:{submit:{message:language==="de"?`Ihre Zahlungsmethode wird jetzt sicher gespeichert. Die Belastung erfolgt automatisch 14 Tage vor Check-in (${booking.check_in}) oder sofort nach Bestätigung, falls der Aufenthalt innerhalb von 14 Tagen beginnt.`:`Your payment method will be saved securely. It will be charged automatically 14 days before check-in (${booking.check_in}), or after confirmation if the stay starts within 14 days.`}}},{idempotencyKey:`fh-setup-session-live-${booking.id}-${token}`}));
  if(!session.url)throw new Error("Stripe did not return a Checkout URL");const setupDeadline=new Date(expiresAt*1000).toISOString();
  const {data:stored,error:storeError}=await service.from("frankiholz_bookings").update({stripe_checkout_session_id:session.id,stripe_checkout_url:session.url,stripe_customer_id:customerId,stripe_payment_intent_id:null,stripe_setup_intent_id:null,stripe_payment_method_id:null,payment_status:"awaiting_payment",payment_mode:"live",payment_due_at:setupDeadline,charge_due_at:chargeDueAt,authorized_at:null,updated_at:new Date().toISOString()}).eq("id",booking.id).eq("payment_operation_token",token).select("id");if(storeError||stored?.length!==1){try{await stripe.checkout.sessions.expire(session.id)}catch{};throw storeError||new Error("Payment setup needs reconciliation; please contact FrankiHolz")}
  await releaseOperation(service,booking.id,token);
  return new Response(JSON.stringify({checkout_url:session.url,reference:booking.reference,expires_at:setupDeadline,charge_due_at:chargeDueAt,live_mode:true,setup_mode:true}),{headers});
 }catch(error){console.error(error);return new Response(JSON.stringify({error:error instanceof Error?error.message:"Unexpected error"}),{status:500,headers})}
});