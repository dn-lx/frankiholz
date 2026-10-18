import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

const allowedOrigins = new Set([
  "https://stay.frankiflow.de",
  "https://accommodation.frankiflow.de",
  "https://frankiholz.netlify.app",
  "https://develop--frankiholz.netlify.app",
  "https://frankiholz.shipstatic.com",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = allowedOrigins.has(origin) || origin.startsWith("http://localhost:")
    ? origin
    : "https://stay.frankiflow.de";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const auth = req.headers.get("authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers });
  }

  const userClient = createClient(SUPABASE_URL, PUBLIC_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: isAdmin, error: adminError } = await userClient.rpc("frankiholz_admin_access_check");
    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers });
    }

    const body = await req.json();
    const rawIds = Array.isArray(body?.booking_ids) ? body.booking_ids : [];
    const bookingIds = [...new Set(rawIds.map((v: unknown) => String(v ?? "").trim()).filter(Boolean))];

    if (!bookingIds.length || bookingIds.length > 50) {
      return new Response(JSON.stringify({ error: "Select between 1 and 50 bookings" }), { status: 400, headers });
    }

    const { data: bookings, error: bookingError } = await service
      .from("frankiholz_bookings")
      .select("id,reference,status,payment_status,payment_mode,stripe_payment_method_id,payment_operation_token,bank_transfer_review_required,refund_review_required")
      .in("id", bookingIds);
    if (bookingError) throw bookingError;

    if ((bookings ?? []).length !== bookingIds.length) {
      const found = new Set((bookings ?? []).map((b: any) => b.id));
      const missing = bookingIds.filter(id => !found.has(id));
      return new Response(JSON.stringify({ error: "Some bookings were not found", missing }), { status: 404, headers });
    }

    const blocked = (bookings ?? []).filter((b: any) =>
      b.status !== "cancelled" ||
      ["paid", "refunded", "processing"].includes(String(b.payment_status ?? "")) ||
      Boolean(b.stripe_payment_method_id) || Boolean(b.payment_operation_token) || b.bank_transfer_review_required || b.refund_review_required
    );

    if (blocked.length) {
      return new Response(JSON.stringify({
        error: "Only cancelled bookings without paid/refunded status or a saved card can be permanently deleted",
        blocked: blocked.map((b: any) => ({
          id: b.id,
          reference: b.reference,
          status: b.status,
          payment_status: b.payment_status,
          payment_mode: b.payment_mode,
          has_saved_card: Boolean(b.stripe_payment_method_id),
        })),
      }), { status: 409, headers });
    }

    const { error: calendarError } = await service
      .from("frankiholz_calendar")
      .update({
        is_available: true,
        availability_status: "available",
        booking_id: null,
        updated_at: new Date().toISOString(),
      })
      .in("booking_id", bookingIds);
    if (calendarError) throw calendarError;

    const { data: deleted, error: deleteError } = await service
      .from("frankiholz_bookings")
      .delete()
      .in("id", bookingIds)
      .select("id,reference,payment_mode");
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({
      ok: true,
      deleted_count: deleted?.length ?? 0,
      deleted: deleted ?? [],
    }), { headers });
  } catch (error) {
    console.error("Admin booking deletion failed", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unexpected error",
    }), { status: 500, headers });
  }
});
