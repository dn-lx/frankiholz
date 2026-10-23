begin;
alter table public.frankiholz_bookings drop constraint frankiholz_bookings_payment_collection_mode_check;
alter table public.frankiholz_bookings add constraint frankiholz_bookings_payment_collection_mode_check check(payment_collection_mode in ('saved_method','bank_transfer','complimentary'));
alter table public.frankiholz_bookings drop constraint frankiholz_bookings_payment_status_check;
alter table public.frankiholz_bookings add constraint frankiholz_bookings_payment_status_check check(payment_status in ('not_started','awaiting_payment','authorized','payment_method_saved','scheduled_charge','processing','paid','failed','expired','released','refunded','not_required'));
alter table public.frankiholz_bookings add constraint frankiholz_complimentary_state check(
  (payment_collection_mode='complimentary')=(payment_status='not_required') and
  (payment_collection_mode<>'complimentary' or (
    total_price=0 and promo_discount_percent is not distinct from 100::smallint and promo_code is not distinct from 'FrankFlowGuest100'
    and stripe_customer_id is null and stripe_payment_method_id is null and stripe_setup_intent_id is null
    and stripe_payment_intent_id is null and stripe_checkout_session_id is null and stripe_checkout_url is null
    and stripe_refund_id is null and charge_due_at is null and payment_due_at is null and paid_at is null
  ))
);
create or replace function private.frankiholz_promo_percent(p_code text)
returns integer language plpgsql immutable
set search_path = pg_catalog
as $$
begin
  case lower(trim(coalesce(p_code,'')))
    when '' then return 0;
    when 'frankflowguest25' then return 25;
    when 'frankflowguest50' then return 50;
    when 'frankflowguest75' then return 75;
    when 'frankflowguest100' then return 100;
    when 'frankiholzguest50' then return 50;
    when 'frankiholzguest75' then return 75;
    else raise exception 'Promo code is not valid';
  end case;
end;
$$;
revoke all on function private.frankiholz_promo_percent(text) from public, anon, authenticated;

create or replace function public.frankiholz_quote_with_promo(
  p_room_id uuid, p_check_in date, p_check_out date, p_promo_code text
)
returns table(total_price numeric, available boolean, nights integer,
  original_total_price numeric, discount_percent integer)
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  q record;
  percent integer;
  discounted numeric(10,2);
begin
  percent := private.frankiholz_promo_percent(p_promo_code);
  select * into q from public.frankiholz_estimate_total(p_room_id,p_check_in,p_check_out);
  if not q.available then
    return query select 0::numeric,false,q.nights,0::numeric,percent;
    return;
  end if;
  discounted := round(q.total_price * (100-percent) / 100, 2);
  if percent <> 100 and discounted < 0.50 then
    raise exception 'The discounted booking total must be at least EUR 0.50';
  end if;
  return query select discounted,true,q.nights,q.total_price,percent;
end;
$$;
revoke all on function public.frankiholz_quote_with_promo(uuid,date,date,text) from public;
grant execute on function public.frankiholz_quote_with_promo(uuid,date,date,text) to anon, authenticated;

create or replace function public.frankiholz_create_booking_with_promo(
  p_room_id uuid, p_check_in date, p_check_out date,
  p_guest_name text, p_guest_email text,
  p_guest_phone text default null, p_guest_country text default null,
  p_guests integer default 1, p_message text default null,
  p_language text default 'en', p_guest_age integer default null,
  p_guest_sex text default null, p_guest_languages text[] default '{}',
  p_guest_hobbies text default null, p_guest_returning boolean default null,
  p_promo_code text default null
)
returns table(reference text, total_price numeric)
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
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
$$;
revoke all on function public.frankiholz_create_booking_with_promo(uuid,date,date,text,text,text,text,integer,text,text,integer,text,text[],text,boolean,text) from public;
grant execute on function public.frankiholz_create_booking_with_promo(uuid,date,date,text,text,text,text,integer,text,text,integer,text,text[],text,boolean,text) to anon, authenticated;

create or replace function public.frankiholz_claim_payment_operation(p_booking_id uuid,p_operation text)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare b public.frankiholz_bookings; operation_id uuid := gen_random_uuid();
begin
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found or b.payment_operation_token is not null or b.status='cancelled' then
    raise exception 'Payment operation unavailable; please contact FrankiHolz';
  end if;
  if p_operation='charge' then
    if b.status<>'confirmed' or b.payment_collection_mode<>'saved_method'
      or b.payment_status not in ('payment_method_saved','scheduled_charge','failed') then
      raise exception 'Booking cannot be charged';
    end if;
  elsif p_operation='setup' then
    if b.status<>'pending' or b.payment_status not in ('not_started','awaiting_payment','expired','failed')
      or b.stripe_payment_intent_id is not null or b.stripe_payment_method_id is not null then
      raise exception 'An existing payment must be reconciled first';
    end if;
  elsif p_operation='accept' then
    if b.payment_status not in ('payment_method_saved','scheduled_charge','paid','not_required')
      or (b.payment_collection_mode='bank_transfer' and b.payment_status<>'paid') then
      raise exception 'Guest payment is not ready for host approval';
    end if;
  elsif p_operation='cancel' then
    if b.payment_status='processing' then raise exception 'Payment is processing; wait for settlement before cancelling'; end if;
  else raise exception 'Invalid payment operation'; end if;
  update public.frankiholz_bookings set payment_operation_token=operation_id,
    payment_operation_started_at=now(),
    payment_status=case when p_operation='charge' then 'processing' else payment_status end
    where id=b.id;
  return jsonb_build_object('booking',to_jsonb(b),'token',operation_id);
end $$;
revoke all on function public.frankiholz_claim_payment_operation(uuid,text) from public,anon,authenticated;
grant execute on function public.frankiholz_claim_payment_operation(uuid,text) to service_role;

CREATE OR REPLACE FUNCTION public.frankiholz_confirm_payment_booking(p_booking_id uuid, p_operation_token uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare b public.frankiholz_bookings;
begin
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found or p_operation_token is null or b.payment_operation_token is distinct from p_operation_token
    or b.status='cancelled' then raise exception 'Booking confirmation unavailable'; end if;
  if b.status='confirmed' then return; end if;
  perform 1 from public.frankiholz_rooms where id=b.room_id for update;
  if exists(select 1 from generate_series(b.check_in,b.check_out-1,interval '1 day') d(day)
    where private.frankiholz_night_unavailable(b.room_id,d.day::date,b.id)) then
    raise exception 'Dates are no longer available; reject and refund this request';
  end if;
  if b.payment_status not in ('payment_method_saved','paid','not_required') then raise exception 'Payment not ready'; end if;
  update public.frankiholz_bookings set status='confirmed',approved_at=now(),
    payment_status=case when b.payment_status in ('paid','not_required') then b.payment_status else 'scheduled_charge' end,
    updated_at=now() where id=b.id;
  insert into public.frankiholz_calendar(room_id,date,is_available,availability_status,booking_id,updated_at)
    select b.room_id,d::date,false,'booked',b.id,now()
    from generate_series(b.check_in::timestamp,(b.check_out-1)::timestamp,interval '1 day') d
    on conflict(room_id,date) do update set is_available=false,availability_status='booked',booking_id=excluded.booking_id,admin_available_override=false,updated_at=now();
end $function$;


-- Service-only: callers authenticate Admin or guest reference/email before obtaining the lease.
create function public.frankiholz_close_complimentary_booking(p_booking_id uuid,p_operation_token uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare b public.frankiholz_bookings;
begin
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found or p_operation_token is null or b.payment_operation_token is distinct from p_operation_token
    or b.payment_collection_mode<>'complimentary' or b.payment_status<>'not_required' or b.total_price<>0 then
    raise exception 'Complimentary booking operation unavailable';
  end if;
  perform 1 from public.frankiholz_rooms where id=b.room_id for update;
  update public.frankiholz_calendar set is_available=true,availability_status='available',booking_id=null,updated_at=now()
    where booking_id=b.id;
  update public.frankiholz_bookings set status='cancelled',cancelled_at=coalesce(cancelled_at,now()),updated_at=now() where id=b.id;
end $$;
revoke all on function public.frankiholz_close_complimentary_booking(uuid,uuid) from public,anon,authenticated;
grant execute on function public.frankiholz_close_complimentary_booking(uuid,uuid) to service_role;
commit;
