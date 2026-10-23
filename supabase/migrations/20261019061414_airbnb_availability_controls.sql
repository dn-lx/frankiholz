begin;
-- An explicit Airbnb-only override. Existing general Make available semantics stay intact.
create function public.frankiholz_set_airbnb_availability(
  p_room_id uuid, p_start_date date, p_end_date date, p_available_here boolean
) returns integer language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare v_date date; v_changed integer:=0;
begin
  if not private.frankiholz_is_admin() then raise exception 'Not authorized'; end if;
  if p_room_id is null or p_start_date is null or p_end_date is null or p_available_here is null
    or p_end_date<p_start_date or p_end_date-p_start_date>366 then
    raise exception 'Invalid date range';
  end if;
  perform 1 from public.frankiholz_rooms where id=p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if not p_available_here then
    -- Removing an override reasserts imported blocks and confirmed reservations.
    -- Never remove rows or change their price, note, booking link or manual block.
    update public.frankiholz_calendar set admin_available_override=false,updated_at=now()
      where room_id=p_room_id and date between p_start_date and p_end_date and admin_available_override;
    get diagnostics v_changed=row_count;
  else
    for v_date in
      select ib.date from public.frankiholz_ical_blocks ib
      where ib.room_id=p_room_id and ib.provider='airbnb'
        and ib.date between p_start_date and p_end_date
        and not exists(select 1 from public.frankiholz_bookings b
          where b.room_id=p_room_id and b.status='confirmed' and ib.date>=b.check_in and ib.date<b.check_out)
      order by ib.date
    loop
      v_changed:=v_changed+public.frankiholz_set_calendar_range(p_room_id,v_date,v_date,'available');
    end loop;
  end if;
  return v_changed;
end $$;
revoke all on function public.frankiholz_set_airbnb_availability(uuid,date,date,boolean) from public,anon;
grant execute on function public.frankiholz_set_airbnb_availability(uuid,date,date,boolean) to authenticated;
commit;
