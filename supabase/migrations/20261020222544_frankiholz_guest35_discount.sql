-- Add FrankiHolzGuest35 while preserving existing promo codes and function privileges.
begin;
CREATE OR REPLACE FUNCTION private.frankiholz_promo_percent(p_code text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  case lower(trim(coalesce(p_code,'')))
    when '' then return 0;
    when 'frankiholzguest15' then return 15;
    when 'frankiholzguest25' then return 25;
    when 'frankiholzguest35' then return 35;
    when 'frankflowguest25' then return 25;
    when 'frankflowguest50' then return 50;
    when 'frankflowguest75' then return 75;
    when 'frankflowguest100' then return 100;
    when 'frankiholzguest50' then return 50;
    when 'frankiholzguest75' then return 75;
    else raise exception 'Promo code is not valid';
  end case;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.frankiholz_create_booking_with_promo(p_room_id uuid, p_check_in date, p_check_out date, p_guest_name text, p_guest_email text, p_guest_phone text DEFAULT NULL::text, p_guest_country text DEFAULT NULL::text, p_guests integer DEFAULT 1, p_message text DEFAULT NULL::text, p_language text DEFAULT 'en'::text, p_guest_age integer DEFAULT NULL::integer, p_guest_sex text DEFAULT NULL::text, p_guest_languages text[] DEFAULT '{}'::text[], p_guest_hobbies text DEFAULT NULL::text, p_guest_returning boolean DEFAULT NULL::boolean, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(reference text, total_price numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  created record;
  percent integer;
  discounted numeric(10,2);
begin
  -- The existing RPC owns all guest validation, availability and base pricing.
  -- Its insert and this update are one transaction; errors roll both back.
  percent := private.frankiholz_promo_percent(p_promo_code);
  if percent = 0 then raise exception 'Promo code is required'; end if;
  select * into created from public.frankiholz_create_booking_v2(
    p_room_id,p_check_in,p_check_out,p_guest_name,p_guest_email,
    p_guest_phone,p_guest_country,p_guests,p_message,p_language,p_guest_age,
    p_guest_sex,p_guest_languages,p_guest_hobbies,p_guest_returning
  );
  discounted := round(created.total_price * (100-percent) / 100, 2);
  if percent <> 100 and discounted < 0.50 then
    raise exception 'The discounted booking total must be at least EUR 0.50';
  end if;
  update public.frankiholz_bookings b set
    original_total_price=created.total_price,
    promo_code=case lower(trim(p_promo_code))
      when 'frankiholzguest15' then 'FrankiHolzGuest15'
      when 'frankiholzguest25' then 'FrankiHolzGuest25'
      when 'frankiholzguest35' then 'FrankiHolzGuest35'
      when 'frankiholzguest50' then 'FrankiHolzGuest50'
      when 'frankiholzguest75' then 'FrankiHolzGuest75'
      else 'FrankFlowGuest'||percent::text end,
    promo_discount_percent=percent,
    total_price=discounted,
    payment_collection_mode=case when percent=100 then 'complimentary' else 'saved_method' end,
    payment_status=case when percent=100 then 'not_required' else 'not_started' end
  where b.reference=created.reference and b.status='pending' and b.payment_status='not_started';
  if not found then raise exception 'Could not store the booking discount'; end if;
  return query select created.reference,discounted;
end;
$function$
;
commit;
