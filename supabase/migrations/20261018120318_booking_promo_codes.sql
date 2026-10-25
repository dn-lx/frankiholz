-- Additive APIs: existing clients retain their current booking contract.
begin;

alter table public.frankiholz_bookings
  add column if not exists promo_code text,
  add column if not exists promo_discount_percent smallint,
  add column if not exists original_total_price numeric(10,2);

create or replace function private.frankiholz_promo_percent(p_code text)
returns integer language plpgsql immutable
set search_path = pg_catalog
as $$
begin
  case lower(trim(coalesce(p_code,'')))
    when '' then return 0;
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
  if discounted < 0.50 then
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
  if discounted < 0.50 then
    raise exception 'The discounted booking total must be at least EUR 0.50';
  end if;
  update public.frankiholz_bookings b set
    original_total_price=created.total_price,
    promo_code=case percent when 50 then 'FrankiHolzGuest50' else 'FrankiHolzGuest75' end,
    promo_discount_percent=percent,
    total_price=discounted
  where b.reference=created.reference and b.status='pending' and b.payment_status='not_started';
  if not found then raise exception 'Could not store the booking discount'; end if;
  return query select created.reference,discounted;
end;
$$;
revoke all on function public.frankiholz_create_booking_with_promo(uuid,date,date,text,text,text,text,integer,text,text,integer,text,text[],text,boolean,text) from public;
grant execute on function public.frankiholz_create_booking_with_promo(uuid,date,date,text,text,text,text,integer,text,text,integer,text,text[],text,boolean,text) to anon, authenticated;

commit;
