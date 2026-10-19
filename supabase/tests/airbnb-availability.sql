-- Execute inside BEGIN ... ROLLBACK, after the migration; no email/Stripe calls.
do $$
declare rid uuid; night date:=current_date+650; admin_email text; n integer; snapshot jsonb; req record;
begin
  select id into rid from public.frankiholz_rooms where active order by id limit 1;
  select email into admin_email from public.frankiholz_admin_users limit 1;
  perform set_config('request.jwt.claims',jsonb_build_object('email',admin_email,'role','authenticated')::text,true);
  insert into public.frankiholz_ical_blocks(room_id,date,provider) values(rid,night,'airbnb'),(rid,night+1,'airbnb') on conflict do nothing;
  delete from public.frankiholz_calendar where room_id=rid and date between night and night+2;
  n:=public.frankiholz_set_airbnb_availability(rid,night,night+2,true);
  if n<>2 then raise exception 'Must override only imported nights'; end if;
  if private.frankiholz_night_unavailable(rid,night) then raise exception 'Override did not open imported date'; end if;
  if exists(select 1 from public.frankiholz_calendar where room_id=rid and date=night+2) then raise exception 'Non-Airbnb date changed'; end if;
  perform public.frankiholz_replace_ical_blocks(rid,'airbnb',jsonb_build_array(jsonb_build_object('date',night),jsonb_build_object('date',night+1)));
  if private.frankiholz_night_unavailable(rid,night) then raise exception 'Sync erased explicit override'; end if;
  select to_jsonb(c)-'admin_available_override'-'updated_at' into snapshot from public.frankiholz_calendar c where room_id=rid and date=night;
  n:=public.frankiholz_set_airbnb_availability(rid,night,night,false);
  if n<>1 or not private.frankiholz_night_unavailable(rid,night) then raise exception 'Follow Airbnb failed'; end if;
  if snapshot is distinct from (select to_jsonb(c)-'admin_available_override'-'updated_at' from public.frankiholz_calendar c where room_id=rid and date=night) then raise exception 'Reset changed unrelated calendar fields'; end if;
  if private.frankiholz_night_unavailable(rid,night+1) then raise exception 'Reset leaked outside selected range'; end if;
  select * into req from public.frankiholz_create_booking_v2(rid,night+3,night+4,'Rollback fixture','rollback@example.invalid',p_message=>'SQL transaction only; no email or Stripe',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English']);
  update public.frankiholz_bookings set status='confirmed' where reference=req.reference;
  insert into public.frankiholz_ical_blocks(room_id,date,provider) values(rid,night+3,'airbnb');
  n:=public.frankiholz_set_airbnb_availability(rid,night+3,night+3,true);
  if n<>0 or not private.frankiholz_night_unavailable(rid,night+3) then raise exception 'Airbnb action reopened confirmed reservation'; end if;
  perform public.frankiholz_set_calendar_range(rid,night+3,night+3,'available');
  perform public.frankiholz_set_airbnb_availability(rid,night+3,night+3,false);
  if not private.frankiholz_night_unavailable(rid,night+3) then raise exception 'Reset failed to reassert confirmed reservation'; end if;
  if (select status from public.frankiholz_bookings where reference=req.reference)<>'confirmed' then raise exception 'Reservation state changed'; end if;
  begin
    perform public.frankiholz_set_airbnb_availability(rid,night,null,true);
    raise exception 'Null range permitted';
  exception when others then if sqlerrm<>'Invalid date range' then raise; end if; end;
  if has_function_privilege('anon','public.frankiholz_set_airbnb_availability(uuid,date,date,boolean)','execute') then raise exception 'Anonymous RPC grant'; end if;
  perform set_config('request.jwt.claims','{"email":"not-admin@example.invalid","role":"authenticated"}',true);
  begin
    perform public.frankiholz_set_airbnb_availability(rid,night,night,true);
    raise exception 'Nonadmin override permitted';
  exception when others then if sqlerrm<>'Not authorized' then raise; end if; end;
end $$;
select 'Airbnb override, sync persistence, scoped reset and authorization assertions passed' as verification;
