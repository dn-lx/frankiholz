-- Keep each new pending booking's payment mode equal to the server-managed
-- Stripe environment at creation (previous default was always LIVE).
-- No existing rows are updated. Backend authorization functions still own keys.
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
  select * into v_room from public.frankiholz_rooms where id=p_room_id and active=true;
  if not found then raise exception 'Room not found'; end if;
  if p_guests<1 or p_guests>v_room.max_guests then raise exception 'Invalid guest count'; end if;
  if exists(select 1 from public.frankiholz_calendar c where c.room_id=p_room_id and c.date>=p_check_in and c.date<p_check_out and c.is_available=false)
     or exists(select 1 from public.frankiholz_ical_blocks ib where ib.room_id=p_room_id and ib.date>=p_check_in and ib.date<p_check_out)
     or exists(select 1 from public.frankiholz_bookings b where b.room_id=p_room_id and b.status='confirmed' and daterange(b.check_in,b.check_out,'[)') && daterange(p_check_in,p_check_out,'[)')) then
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
    p_guest_age,trim(p_guest_sex),coalesce(p_guest_languages,'{}'),nullif(trim(coalesce(p_guest_hobbies,'')),''),p_guest_returning,'v2_14_day',coalesce((select environment from public.frankiholz_payment_settings where id=1),'test')
  );
  return query select v_reference,v_total;
end;
$function$

