begin;
-- Only an authenticated administrator can explicitly reopen an occupied night.
alter table public.frankiholz_calendar add column admin_available_override boolean not null default false;
alter table public.frankiholz_bookings add column admin_deleted_at timestamptz;
create function private.frankiholz_night_unavailable(p_room_id uuid,p_date date,p_ignore_booking uuid default null)
returns boolean language sql stable security definer set search_path=pg_catalog,public,private as $$
  select case when coalesce(c.admin_available_override,false) and c.is_available then false
    else coalesce(not c.is_available,false)
      and (c.booking_id is null or c.booking_id is distinct from p_ignore_booking)
      or exists(select 1 from public.frankiholz_ical_blocks ib where ib.room_id=p_room_id and ib.date=p_date)
      or exists(select 1 from public.frankiholz_bookings b where b.room_id=p_room_id and b.status='confirmed'
        and b.id is distinct from p_ignore_booking and p_date>=b.check_in and p_date<b.check_out)
    end
  from (select 1) seed left join public.frankiholz_calendar c on c.room_id=p_room_id and c.date=p_date;
$$;
revoke all on function private.frankiholz_night_unavailable(uuid,date,uuid) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.frankiholz_set_calendar_range(p_room_id uuid, p_start_date date, p_end_date date, p_status text, p_price_override numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_changed integer := 0;
  v_date date;
begin
  if not private.frankiholz_is_admin() then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('available','blocked','booked') then
    raise exception 'Invalid availability status';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date must be on or after start date';
  end if;
  if (p_end_date - p_start_date) > 366 then
    raise exception 'Date range is too large';
  end if;
  if p_price_override is not null and p_price_override < 0 then
    raise exception 'Invalid price override';
  end if;

  perform 1 from public.frankiholz_rooms where id=p_room_id for update;
  for v_date in
    select d::date from generate_series(p_start_date, p_end_date, interval '1 day') d
  loop
    if p_status<>'available' and exists (
      select 1
      from public.frankiholz_calendar c
      join public.frankiholz_bookings b on b.id = c.booking_id
      where c.room_id = p_room_id
        and c.date = v_date
        and c.booking_id is not null
        and b.status in ('pending','confirmed')
    ) then
      -- Real bookings always remain booked. Booking cancellation controls availability.
      update public.frankiholz_calendar
      set availability_status='booked', is_available=false, updated_at=now()
      where room_id=p_room_id and date=v_date;
      continue;
    end if;

    insert into public.frankiholz_calendar(
      room_id,date,is_available,availability_status,price_override,note,booking_id,admin_available_override,updated_at
    ) values (
      p_room_id,v_date,(p_status='available'),p_status,p_price_override,
      nullif(trim(coalesce(p_note,'')),''),null,(p_status='available'),now()
    )
    on conflict (room_id,date) do update set
      is_available=excluded.is_available,
      availability_status=excluded.availability_status,
      price_override=coalesce(excluded.price_override, public.frankiholz_calendar.price_override),
      note=coalesce(excluded.note, public.frankiholz_calendar.note),
      booking_id=null,
      admin_available_override=excluded.admin_available_override,
      updated_at=now();
    v_changed := v_changed + 1;
  end loop;

  return v_changed;
end;
$function$;

CREATE OR REPLACE FUNCTION public.frankiholz_create_booking_v2(p_room_id uuid, p_check_in date, p_check_out date, p_guest_name text, p_guest_email text, p_guest_phone text DEFAULT NULL::text, p_guest_country text DEFAULT NULL::text, p_guests integer DEFAULT 1, p_message text DEFAULT NULL::text, p_language text DEFAULT 'en'::text, p_guest_age integer DEFAULT NULL::integer, p_guest_sex text DEFAULT NULL::text, p_guest_languages text[] DEFAULT '{}'::text[], p_guest_hobbies text DEFAULT NULL::text, p_guest_returning boolean DEFAULT NULL::boolean)
 RETURNS TABLE(reference text, total_price numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_room public.frankiholz_rooms%rowtype;
  v_total numeric(10,2);
  v_reference text;
  v_language text;
begin
  perform private.frankiholz_release_expired_holds();
  if p_check_in < current_date or p_check_out <= p_check_in or (p_check_out-p_check_in)>60 then raise exception 'Invalid booking dates'; end if;
  if length(trim(coalesce(p_guest_name,'')))<2 or position('@' in coalesce(p_guest_email,''))<2 then raise exception 'Guest name and email are required'; end if;
  if p_guest_age is null or p_guest_age < 18 or p_guest_age > 120 then raise exception 'Guest age must be between 18 and 120'; end if;
  if coalesce(trim(p_guest_sex),'') not in ('female','male','non_binary','prefer_not_to_say','other') then raise exception 'Please select a valid sex option'; end if;
  if coalesce(array_length(p_guest_languages,1),0)=0 then raise exception 'Please add at least one language'; end if;
  if length(trim(coalesce(p_message,'')))<20 then raise exception 'Please introduce yourself in the message'; end if;
  select * into v_room from public.frankiholz_rooms where id=p_room_id and active=true for update;
  if not found then raise exception 'Room not found'; end if;
  if p_guests<1 or p_guests>v_room.max_guests then raise exception 'Invalid guest count'; end if;
  if exists(select 1 from generate_series(p_check_in,p_check_out-1,interval '1 day') d(day)
    where private.frankiholz_night_unavailable(p_room_id,d.day::date)) then
    raise exception 'One or more selected dates are unavailable';
  end if;
  v_language:=case when lower(coalesce(p_language,'en'))='de' then 'de' else 'en' end;
  v_total:=private.frankiholz_dynamic_total(p_room_id,p_check_in,p_check_out)::numeric(10,2);
  v_reference:='FH-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.frankiholz_bookings(
    reference,room_id,check_in,check_out,guest_name,guest_email,guest_phone,guest_country,guests,message,total_price,status,payment_status,language,
    guest_age,guest_sex,guest_languages,guest_hobbies,guest_returning,payment_schedule_version,payment_mode
  ) values(
    v_reference,p_room_id,p_check_in,p_check_out,trim(p_guest_name),lower(trim(p_guest_email)),nullif(trim(coalesce(p_guest_phone,'')),''),nullif(trim(coalesce(p_guest_country,'')),''),p_guests,nullif(trim(coalesce(p_message,'')),''),v_total,'pending','not_started',v_language,
    p_guest_age,trim(p_guest_sex),coalesce(p_guest_languages,'{}'),nullif(trim(coalesce(p_guest_hobbies,'')),''),p_guest_returning,'v2_14_day',public.frankiholz_get_payment_environment()
  );
  return query select v_reference,v_total;
end;
$function$;

CREATE OR REPLACE FUNCTION public.frankiholz_estimate_total(p_room_id uuid, p_check_in date, p_check_out date)
 RETURNS TABLE(total_price numeric, available boolean, nights integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare v_room public.frankiholz_rooms%rowtype;
begin
  perform private.frankiholz_release_expired_holds();
  if p_check_out <= p_check_in or (p_check_out - p_check_in) > 60 then
    return query select 0::numeric,false,0; return;
  end if;
  select * into v_room from public.frankiholz_rooms where id=p_room_id and active=true;
  if not found then return query select 0::numeric,false,0; return; end if;

  if exists(select 1 from generate_series(p_check_in,p_check_out-1,interval '1 day') d(day)
    where private.frankiholz_night_unavailable(p_room_id,d.day::date)) then
    return query select 0::numeric,false,(p_check_out-p_check_in)::integer; return;
  end if;
  return query select private.frankiholz_dynamic_total(p_room_id,p_check_in,p_check_out),true,(p_check_out-p_check_in)::integer;
end;
$function$;

create or replace function public.frankiholz_get_calendar_rates(p_room_id uuid,p_from date,p_to date)
returns table(date date,availability_status text,is_available boolean,nightly_price numeric)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
 perform private.frankiholz_release_expired_holds();
 if p_to<p_from or p_to-p_from>370 then raise exception 'Invalid date range'; end if;
 if not exists(select 1 from public.frankiholz_rooms where id=p_room_id and active=true) then return; end if;
 return query select d.day::date,
   case when not private.frankiholz_night_unavailable(p_room_id,d.day::date) then 'available'
     when c.booking_id is not null or c.availability_status='booked' then 'booked' else 'blocked' end,
   not private.frankiholz_night_unavailable(p_room_id,d.day::date),
   case when private.frankiholz_night_unavailable(p_room_id,d.day::date) then null::numeric
     else private.frankiholz_dynamic_nightly_price(p_room_id,d.day::date,d.day::date,d.day::date+1) end
 from generate_series(p_from,p_to,interval '1 day') d(day)
 left join public.frankiholz_calendar c on c.room_id=p_room_id and c.date=d.day::date order by d.day;
end $$;
CREATE OR REPLACE FUNCTION public.frankiholz_confirm_payment_booking(p_booking_id uuid, p_operation_token uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare b public.frankiholz_bookings;
begin
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found or b.payment_operation_token is distinct from p_operation_token
    or b.status='cancelled' then raise exception 'Booking confirmation unavailable'; end if;
  if b.status='confirmed' then return; end if;
  perform 1 from public.frankiholz_rooms where id=b.room_id for update;
  if exists(select 1 from generate_series(b.check_in,b.check_out-1,interval '1 day') d(day)
    where private.frankiholz_night_unavailable(b.room_id,d.day::date,b.id)) then
    raise exception 'Dates are no longer available; reject and refund this request';
  end if;
  if b.payment_status not in ('payment_method_saved','paid') then raise exception 'Payment not ready'; end if;
  update public.frankiholz_bookings set status='confirmed',approved_at=now(),
    payment_status=case when b.payment_status='paid' then 'paid' else 'scheduled_charge' end,
    updated_at=now() where id=b.id;
  insert into public.frankiholz_calendar(room_id,date,is_available,availability_status,booking_id,updated_at)
    select b.room_id,d::date,false,'booked',b.id,now()
    from generate_series(b.check_in::timestamp,(b.check_out-1)::timestamp,interval '1 day') d
    on conflict(room_id,date) do update set is_available=false,availability_status='booked',booking_id=excluded.booking_id,admin_available_override=false,updated_at=now();
end $function$;

-- Reversible removal from the Admin list preserves payments, future charges and audit history.
create function public.frankiholz_admin_remove_requests(p_booking_ids uuid[],p_restore boolean default false)
returns integer language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare changed integer;
begin
 if not private.frankiholz_is_admin() then raise exception 'Not authorized'; end if;
 if coalesce(array_length(p_booking_ids,1),0) not between 1 and 50 then raise exception 'Select between 1 and 50 requests'; end if;
 update public.frankiholz_bookings set admin_deleted_at=case when p_restore then null else now() end
 where id=any(p_booking_ids);
 get diagnostics changed=row_count; return changed;
end $$;
revoke all on function public.frankiholz_admin_remove_requests(uuid[],boolean) from public,anon;
grant execute on function public.frankiholz_admin_remove_requests(uuid[],boolean) to authenticated;
-- Same reference/email authorization as status_v3; no extra personal data.
create function public.frankiholz_payment_details(p_reference text,p_email text)
returns jsonb language sql security definer set search_path=pg_catalog,public as $$
 select to_jsonb(st)||jsonb_build_object('payment_collection_mode',b.payment_collection_mode)
 from public.frankiholz_booking_status_v3(p_reference,p_email) st
 join public.frankiholz_bookings b on b.reference=st.reference;
$$;
revoke all on function public.frankiholz_payment_details(text,text) from public;
grant execute on function public.frankiholz_payment_details(text,text) to anon,authenticated;
commit;
