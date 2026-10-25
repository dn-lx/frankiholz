-- Manual direct-bank booking, separate from the Stripe customer-balance bank-transfer rail.
-- Rollout remains OFF until a verified bank account is configured. Direct-transfer discount is independent of Stripe.
-- Shared Supabase backend: coordinate this migration with the frontend/Edge Function deploy.

CREATE TABLE IF NOT EXISTS public.frankiholz_manual_bank_settings (
 id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
 enabled boolean NOT NULL DEFAULT false,
 discount_enabled boolean NOT NULL DEFAULT false,
 account_holder text NOT NULL DEFAULT '',
 bank_name text NOT NULL DEFAULT '',
 iban text NOT NULL DEFAULT '',
 bic text NOT NULL DEFAULT '',
 discount_percent numeric(5,2) NOT NULL DEFAULT 3.00
   CHECK (discount_percent >= 0 AND discount_percent <= 5),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.frankiholz_manual_bank_settings (id) VALUES (1)
 ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.frankiholz_manual_bank_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.frankiholz_manual_bank_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.frankiholz_manual_bank_settings TO authenticated;
GRANT ALL ON public.frankiholz_manual_bank_settings TO service_role;
DROP POLICY IF EXISTS frankiholz_manual_bank_admin ON public.frankiholz_manual_bank_settings;
CREATE POLICY frankiholz_manual_bank_admin ON public.frankiholz_manual_bank_settings
 FOR ALL TO authenticated USING (public.frankiholz_admin_access_check())
 WITH CHECK (public.frankiholz_admin_access_check());

ALTER TABLE public.frankiholz_bookings
 ADD COLUMN IF NOT EXISTS manual_bank_base_total numeric(10,2),
 ADD COLUMN IF NOT EXISTS manual_bank_account_holder text,
 ADD COLUMN IF NOT EXISTS manual_bank_bank_name text,
 ADD COLUMN IF NOT EXISTS manual_bank_iban text,
 ADD COLUMN IF NOT EXISTS manual_bank_bic text,
 ADD COLUMN IF NOT EXISTS manual_bank_discount_percent numeric(5,2),
 ADD COLUMN IF NOT EXISTS manual_bank_requested_at timestamptz,
 ADD COLUMN IF NOT EXISTS manual_bank_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS manual_bank_verified_by uuid,
 ADD COLUMN IF NOT EXISTS manual_bank_reconciliation_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.frankiholz_bookings
 DROP CONSTRAINT IF EXISTS frankiholz_bookings_payment_collection_mode_check;
ALTER TABLE public.frankiholz_bookings
 ADD CONSTRAINT frankiholz_bookings_payment_collection_mode_check
 CHECK (payment_collection_mode IN ('saved_method','bank_transfer','complimentary','manual_bank'));

-- Guests may check whether the option exists, but never receive bank details from here.
CREATE OR REPLACE FUNCTION public.frankiholz_manual_bank_offer()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
 SELECT jsonb_build_object(
  'available',coalesce(s.enabled AND public.frankiholz_get_payment_environment()='live'
                      AND length(trim(s.account_holder))>1 AND
                      length(regexp_replace(s.iban,'[[:space:]]','','g'))>=15,false),
  'discount_percent', CASE WHEN s.discount_enabled THEN s.discount_percent ELSE 0 END)
 FROM public.frankiholz_manual_bank_settings s WHERE s.id=1;
$$;
REVOKE ALL ON FUNCTION public.frankiholz_manual_bank_offer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.frankiholz_manual_bank_offer() TO anon,authenticated,service_role;

-- Requires a booking reference AND the matching guest email. Returns IBAN only to
-- that guest, after payment method selection. No amount is trusted from the browser.
CREATE OR REPLACE FUNCTION public.frankiholz_start_manual_bank_transfer(
 p_reference text,p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE b public.frankiholz_bookings%rowtype;
 s public.frankiholz_manual_bank_settings%rowtype;
 total numeric(10,2);
 room_open boolean;
BEGIN
 SELECT * INTO b FROM public.frankiholz_bookings
 WHERE upper(reference)=upper(trim(p_reference))
   AND lower(guest_email)=lower(trim(p_email))
 FOR UPDATE;
 IF NOT FOUND OR b.status<>'pending' OR b.payment_schedule_version<>'v2_14_day'
    OR b.payment_status NOT IN ('not_started','awaiting_payment')
    -- A customer profile without a saved method or active Checkout is safe to switch.
    OR b.stripe_checkout_session_id IS NOT NULL
    OR b.stripe_payment_intent_id IS NOT NULL
    OR b.stripe_payment_method_id IS NOT NULL
 THEN RAISE EXCEPTION 'This booking cannot start a manual bank transfer'; END IF;
 SELECT * INTO s FROM public.frankiholz_manual_bank_settings WHERE id=1;
 IF NOT FOUND OR NOT s.enabled OR b.payment_mode<>'live'
    OR public.frankiholz_get_payment_environment()<>'live'
    OR length(trim(s.account_holder))<2
    OR length(regexp_replace(s.iban,'[[:space:]]','','g'))<15
 THEN RAISE EXCEPTION 'Direct bank transfer is not currently available'; END IF;
 IF b.payment_collection_mode='manual_bank' THEN
   IF b.payment_status<>'awaiting_payment' THEN
     RAISE EXCEPTION 'Manual transfer already completed or closed'; END IF;
   total:=b.total_price;
 ELSIF b.payment_collection_mode='saved_method' AND b.payment_status='not_started' THEN
   SELECT available INTO room_open FROM public.frankiholz_estimate_total(b.room_id,b.check_in,b.check_out);
   IF room_open IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Those stay dates are no longer available; please choose another booking';
   END IF;
   total:=round(b.total_price*(100-(CASE WHEN s.discount_enabled THEN s.discount_percent ELSE 0 END))/100,2);
   IF total<0.50 THEN RAISE EXCEPTION 'Total after discount must be at least EUR 0.50'; END IF;
   UPDATE public.frankiholz_bookings SET
    total_price=total, payment_collection_mode='manual_bank',
    payment_status='awaiting_payment',manual_bank_base_total=b.total_price,
    manual_bank_account_holder=s.account_holder,manual_bank_bank_name=s.bank_name,
    manual_bank_iban=s.iban,manual_bank_bic=s.bic,
    manual_bank_discount_percent=(CASE WHEN s.discount_enabled THEN s.discount_percent ELSE 0 END),manual_bank_requested_at=now(),
    charge_due_at=NULL,payment_due_at=NULL,updated_at=now()
   WHERE id=b.id;
 ELSE RAISE EXCEPTION 'This booking already has another payment method'; END IF;
 RETURN jsonb_build_object('reference',b.reference,'amount',total,'currency','EUR',
    'account_holder',coalesce(b.manual_bank_account_holder,s.account_holder),
    'bank_name',coalesce(b.manual_bank_bank_name,s.bank_name),
    'iban',coalesce(b.manual_bank_iban,s.iban),
    'bic',coalesce(b.manual_bank_bic,s.bic),
    'payment_reference',b.reference,
    'proof_email','info@frankiflow.de','discount_percent',
    coalesce(b.manual_bank_discount_percent,(CASE WHEN s.discount_enabled THEN s.discount_percent ELSE 0 END)));
END $$;
REVOKE ALL ON FUNCTION public.frankiholz_start_manual_bank_transfer(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.frankiholz_start_manual_bank_transfer(text,text) TO anon,authenticated,service_role;

-- A reference + email can read instructions again after reload, without rerunning Stripe.
CREATE OR REPLACE FUNCTION public.frankiholz_get_manual_bank_instructions(
 p_reference text,p_email text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE b public.frankiholz_bookings%rowtype;
 s public.frankiholz_manual_bank_settings%rowtype;
BEGIN
 SELECT * INTO b FROM public.frankiholz_bookings
  WHERE upper(reference)=upper(trim(p_reference))
  AND lower(guest_email)=lower(trim(p_email))
  AND payment_collection_mode='manual_bank';
 IF NOT FOUND THEN RAISE EXCEPTION 'No matching manual transfer'; END IF;
 SELECT * INTO s FROM public.frankiholz_manual_bank_settings WHERE id=1;
 RETURN jsonb_build_object('reference',b.reference,'amount',b.total_price,
   'account_holder',coalesce(b.manual_bank_account_holder,s.account_holder),
   'bank_name',coalesce(b.manual_bank_bank_name,s.bank_name),
   'iban',coalesce(b.manual_bank_iban,s.iban),
   'bic',coalesce(b.manual_bank_bic,s.bic),
   'payment_reference',b.reference,'proof_email','info@frankiflow.de',
   'status',b.status,'payment_status',b.payment_status);
END $$;
REVOKE ALL ON FUNCTION public.frankiholz_get_manual_bank_instructions(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.frankiholz_get_manual_bank_instructions(text,text) TO anon,authenticated,service_role;

-- Admin attests that ACTUAL bank credit (not merely emailed proof) matches booking.
-- Existing availability and calendar-confirmation function remains the authority.
CREATE OR REPLACE FUNCTION public.frankiholz_admin_confirm_manual_bank(
 p_booking_id uuid,p_received_eur numeric,p_verified_reference text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE b public.frankiholz_bookings%rowtype; operation jsonb; token uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.frankiholz_admin_access_check() THEN
  RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO b FROM public.frankiholz_bookings WHERE id=p_booking_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'pending'
    OR b.payment_collection_mode<>'manual_bank'
    OR b.payment_status<>'awaiting_payment'
    OR b.stripe_payment_intent_id IS NOT NULL THEN
  RAISE EXCEPTION 'Manual bank booking is not ready for confirmation'; END IF;
 IF p_received_eur IS DISTINCT FROM b.total_price
    OR upper(trim(p_verified_reference))<>upper(b.reference) THEN
  RAISE EXCEPTION 'Verify bank statement amount and booking reference before confirming'; END IF;
 UPDATE public.frankiholz_bookings SET
  payment_status='paid',paid_at=now(),
  manual_bank_verified_at=now(),manual_bank_verified_by=auth.uid()
 WHERE id=b.id;
 operation:=public.frankiholz_claim_payment_operation(b.id,'accept');
 token:=(operation->>'token')::uuid;
 PERFORM public.frankiholz_confirm_payment_booking(b.id,token);
 UPDATE public.frankiholz_bookings SET payment_operation_token=NULL,
    payment_operation_started_at=NULL WHERE id=b.id AND payment_operation_token=token;
END $$;
REVOKE ALL ON FUNCTION public.frankiholz_admin_confirm_manual_bank(uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.frankiholz_admin_confirm_manual_bank(uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.frankiholz_admin_reject_manual_bank(
 p_booking_id uuid,p_reconciliation_acknowledged boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE b public.frankiholz_bookings%rowtype;
BEGIN
 IF auth.uid() IS NULL OR NOT public.frankiholz_admin_access_check() THEN
   RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_reconciliation_acknowledged IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'Acknowledge the need to check for incoming or late transfers'; END IF;
 SELECT * INTO b FROM public.frankiholz_bookings WHERE id=p_booking_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'pending' OR b.payment_collection_mode<>'manual_bank'
   OR b.payment_status<>'awaiting_payment' THEN
    RAISE EXCEPTION 'Manual transfer cannot be rejected automatically'; END IF;
 UPDATE public.frankiholz_bookings SET status='cancelled',
  payment_status='released',closure_notification_event='booking_rejected',
  cancelled_at=now(),manual_bank_reconciliation_required=true,updated_at=now()
 WHERE id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.frankiholz_admin_reject_manual_bank(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.frankiholz_admin_reject_manual_bank(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.frankiholz_cancel_pending_manual_bank(
 p_reference text,p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE b public.frankiholz_bookings%rowtype;
BEGIN
 SELECT * INTO b FROM public.frankiholz_bookings WHERE upper(reference)=upper(trim(p_reference))
  AND lower(guest_email)=lower(trim(p_email)) FOR UPDATE;
 IF NOT FOUND OR b.status<>'pending' OR b.payment_collection_mode<>'manual_bank'
    OR b.payment_status<>'awaiting_payment' THEN
    RAISE EXCEPTION 'Contact the host for cancellation or refund'; END IF;
 UPDATE public.frankiholz_bookings SET status='cancelled',payment_status='released',
  closure_notification_event='booking_cancelled',cancelled_at=now(),
  manual_bank_reconciliation_required=true,updated_at=now()
 WHERE id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.frankiholz_cancel_pending_manual_bank(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.frankiholz_cancel_pending_manual_bank(text,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.frankiholz_payment_details(
  p_reference text,p_email text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
 SELECT to_jsonb(st)||jsonb_build_object(
  'payment_collection_mode',b.payment_collection_mode,
  'manual_bank_base_total',b.manual_bank_base_total,
  'manual_bank_discount_percent',b.manual_bank_discount_percent)
 FROM public.frankiholz_booking_status_v3(p_reference,p_email) st
 JOIN public.frankiholz_bookings b ON b.reference=st.reference;
$$;
REVOKE ALL ON FUNCTION public.frankiholz_payment_details(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.frankiholz_payment_details(text,text) TO anon,authenticated,service_role;
