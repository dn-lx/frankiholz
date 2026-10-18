import { claimOperation, releaseOperation } from "../_shared/payment-operation.ts";
import { cancelTransfer } from "../_shared/cancel-transfer.ts";
import { chargeBooking } from "../_shared/booking-charge.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LIVE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const TEST_KEY = Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? "";
const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

const allowedOrigins = new Set([
  "https://stay.frankiflow.de",
  "https://accommodation.frankiflow.de",
  "https://frankiholz.netlify.app",
  "https://develop--frankiholz.netlify.app",
  "https://frankiholz.shipstatic.com",
]);

function isAllowedOrigin(origin: string) {
  return allowedOrigins.has(origin)
    || /^https:\/\/[a-z0-9-]+--frankiholz\.netlify\.app$/i.test(origin)
    || origin.startsWith("http://localhost:")
    || origin.startsWith("http://127.0.0.1:");
}

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = isAllowedOrigin(origin) ? origin : "https://stay.frankiflow.de";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type,apikey",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

async function sendEmail(bookingId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/frankiholz-guest-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ event_type: "booking_cancelled", booking_id: bookingId }),
    });
  } catch (error) {
    console.warn("Cancellation email failed", error);
  }
}

const chargeOutstanding=(booking:any,stripe:Stripe)=>chargeBooking(service,stripe,booking);

Deno.serve(async (req: Request) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  const origin = req.headers.get("origin") ?? "";
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers });
  }

  try {
    const body = await req.json();
    const reference = String(body?.reference ?? "").trim();
    const guestEmail = String(body?.email ?? "").trim().toLowerCase();
    if (!reference || !guestEmail) {
      return new Response(JSON.stringify({ error: "Booking reference and email are required" }), { status: 400, headers });
    }

    const { data: foundBooking, error } = await service
      .from("frankiholz_bookings")
      .select("*")
      .eq("reference", reference)
      .eq("guest_email", guestEmail)
      .eq("payment_schedule_version", "v2_14_day")
      .maybeSingle();

    if (error || !foundBooking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers });
    }
    let booking=foundBooking;
    if (booking.status === "cancelled") {
      return new Response(JSON.stringify({ ok: true, already_cancelled: true, payment_mode: booking.payment_mode }), { headers });
    }

    const key = booking.payment_mode === "test" ? TEST_KEY : LIVE_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: `Stripe ${booking.payment_mode} key is not configured` }), { status: 503, headers });
    }
    const stripe = new Stripe(key);
    if (booking.payment_status === "processing") {
      return new Response(JSON.stringify({ error: "Your payment is still processing. Please contact FrankiHolz or wait for settlement before cancelling." }), { status: 409, headers });
    }
    const refundable = new Date(`${booking.check_in}T12:00:00Z`).getTime() > Date.now() + 14 * 86400000;
    if (booking.payment_collection_mode!=="bank_transfer"&&!refundable&&booking.status==="confirmed"&&booking.payment_status!=="paid") {
      const pi=await chargeOutstanding(booking,stripe);
      if(pi.status!=="succeeded")return new Response(JSON.stringify({error:"Payment is processing. Wait for settlement before cancelling."}),{status:409,headers});
    }
    const operation=await claimOperation(service,booking.id,"cancel");
    booking=operation.booking;
    const operationToken=operation.token;
    let refunded = false;
    let refundId=booking.stripe_refund_id||null,refundReview=Boolean(booking.refund_review_required);
    let finalPayment = booking.payment_status;

    if(booking.payment_collection_mode==="bank_transfer"){
      const transfer=await cancelTransfer(stripe,booking,refundable||booking.status==="pending");
      finalPayment=transfer.payment_status;refundId=transfer.stripe_refund_id;refundReview=transfer.refund_review_required;
      refunded=finalPayment==="refunded";
    } else if (refundable && booking.payment_status === "paid" && booking.stripe_payment_intent_id) {
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        metadata: {
          booking_id: booking.id,
          reference: booking.reference,
          reason: "guest_cancelled_more_than_14_days",
        },
      }, { idempotencyKey: `fh-${booking.payment_mode}-refund-${booking.id}` });
      refunded = refund.status === "succeeded";
      refundId=refund.id;refundReview=!refunded;
      finalPayment = refunded ? "refunded" : booking.payment_status;
    } else if (booking.status !== "confirmed" && booking.payment_status !== "paid") {
      finalPayment = "released";
    } else if (refundable && booking.payment_status !== "paid") {
      finalPayment = "released";
    }

    if (booking.stripe_payment_method_id && finalPayment !== "scheduled_charge") {
      try { await stripe.paymentMethods.detach(booking.stripe_payment_method_id); } catch (detachError) {
        console.warn("Payment method detach failed", detachError);
      }
    }

    const { error: calendarError } = await service.from("frankiholz_calendar").update({
      is_available: true,
      availability_status: "available",
      booking_id: null,
      updated_at: new Date().toISOString(),
    }).eq("booking_id", booking.id);
    if (calendarError) throw calendarError;

    const { error: updateError } = await service.from("frankiholz_bookings").update({
      status: "cancelled",
      bank_transfer_review_required: booking.payment_collection_mode==="bank_transfer",
      stripe_refund_id:refundId,refund_review_required:refundReview,
      cancelled_at: new Date().toISOString(),
      payment_status: finalPayment,
      stripe_checkout_url: null,
      payment_due_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", booking.id);
    if (updateError) throw updateError;

    if (booking.stripe_checkout_session_id && booking.payment_status === "awaiting_payment") {
      try {
        await stripe.checkout.sessions.expire(booking.stripe_checkout_session_id);
      } catch (expireError) {
        console.warn("Checkout session expiry failed or session already closed", expireError);
      }
    }

    await releaseOperation(service,booking.id,operationToken);
    await sendEmail(booking.id);

    return new Response(JSON.stringify({
      ok: true,
      refundable,
      refunded,
      refund_pending:refundReview,
      policy: refundable ? "full_refund" : "non_refundable",
      payment_status: finalPayment,
      payment_mode: booking.payment_mode,
    }), { headers });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers });
  }
});