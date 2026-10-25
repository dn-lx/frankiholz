-- Development rollout: bank transfer as default-free payment; +2% on other methods.
-- IMPORTANT: Review German BGB §270a for consumer-card/SEPA surcharging
-- before enabling this migration or payment feature for real guests.
-- Apply before deploying the matching Edge Function changes.
ALTER TABLE public.frankiholz_bookings
  ADD COLUMN IF NOT EXISTS payment_base_total numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_fee_amount numeric(10,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.frankiholz_prepare_collection_total(
  p_booking_id uuid,
  p_operation_token uuid,
  p_collection_mode text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  b public.frankiholz_bookings%rowtype;
  base_total numeric(10,2);
  fee numeric(10,2);
BEGIN
  IF p_collection_mode NOT IN ('saved_method', 'bank_transfer') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;
  SELECT * INTO b FROM public.frankiholz_bookings
    WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND OR p_operation_token IS NULL
    OR b.payment_operation_token IS DISTINCT FROM p_operation_token
    OR b.status <> 'pending'
    OR b.payment_status NOT IN ('not_started','awaiting_payment','expired','failed')
    OR b.stripe_payment_method_id IS NOT NULL
    OR b.stripe_payment_intent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Payment amount cannot be changed for this booking';
  END IF;
  base_total:=coalesce(b.payment_base_total,b.total_price);
  fee:=CASE WHEN p_collection_mode='saved_method'
    THEN round(base_total*0.02,2) ELSE 0 END;
  UPDATE public.frankiholz_bookings
  SET payment_base_total=base_total,
      payment_fee_amount=fee,
      total_price=base_total+fee,
      payment_collection_mode=p_collection_mode,
      updated_at=now()
  WHERE id=p_booking_id AND payment_operation_token=p_operation_token;
  RETURN base_total+fee;
END
$function$;

REVOKE ALL ON FUNCTION public.frankiholz_prepare_collection_total(uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.frankiholz_prepare_collection_total(uuid,uuid,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.frankiholz_payment_details(
  p_reference text,p_email text
) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT to_jsonb(st) ||
    jsonb_build_object(
      'payment_collection_mode', b.payment_collection_mode,
      'payment_base_total', coalesce(b.payment_base_total,b.total_price),
      'payment_fee_amount', b.payment_fee_amount)
  FROM public.frankiholz_booking_status_v3(p_reference,p_email) st
  JOIN public.frankiholz_bookings b ON b.reference=st.reference;
$function$;
