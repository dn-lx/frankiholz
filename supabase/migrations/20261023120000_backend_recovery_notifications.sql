begin;

-- Server-owned origin makes closure retries independent of the endpoint used.
alter table public.frankiholz_bookings add column closure_notification_event text
  check (closure_notification_event in ('booking_cancelled','booking_rejected','authorization_expired'));

-- Enforce the server boundary even if a pre-existing table-level UPDATE grant
-- includes newly added columns. Definer RPCs execute as the trusted migration
-- owner, which need not be the same role as the pre-existing table owner.
create function private.frankiholz_protect_closure_origin()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if (tg_op='INSERT' and new.closure_notification_event is not null)
    or (tg_op='UPDATE' and new.closure_notification_event is distinct from old.closure_notification_event) then
    if current_user<>'service_role'
      and current_user<>pg_get_userbyid((select relowner from pg_class where oid=tg_relid))
      and current_user<>pg_get_userbyid((select p.proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='private' and p.proname='frankiholz_protect_closure_origin' and p.pronargs=0)) then
      raise exception 'Closure notification origin is server-owned';
    end if;
    if tg_op='UPDATE' and old.status='cancelled' then raise exception 'Closure notification origin is immutable'; end if;
  end if;
  return new;
end $$;
revoke all on function private.frankiholz_protect_closure_origin() from public,anon,authenticated;
create trigger frankiholz_protect_closure_origin
  before insert or update of closure_notification_event on public.frankiholz_bookings
  for each row execute function private.frankiholz_protect_closure_origin();

-- Queue in the same transaction as the closed status. The existing scheduled
-- drain can recover even if the endpoint fails before receiving an HTTP call.
-- An existing stage is retained: do not add a third guest email. A pending
-- unprepared confirmation may adopt the closure event; frozen payloads, sent
-- stages and active senders retain their provider-idempotency contract.
create function private.frankiholz_queue_closure_notification()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  insert into public.frankiholz_guest_email_outbox as outbox(booking_id,stage,event_type)
  values(new.id,'guest_host_decision',new.closure_notification_event)
  on conflict(booking_id,stage) do update set event_type=excluded.event_type,updated_at=now()
    where outbox.state='pending' and outbox.payload is null and outbox.first_attempt_at is null;
  return new;
end $$;
revoke all on function private.frankiholz_queue_closure_notification() from public,anon,authenticated;
create trigger frankiholz_queue_closure_notification
  after update of status,closure_notification_event on public.frankiholz_bookings
  for each row when(new.status='cancelled' and new.closure_notification_event is not null
    and (old.status is distinct from new.status or old.closure_notification_event is distinct from new.closure_notification_event))
  execute function private.frankiholz_queue_closure_notification();

-- Keep the original two-argument RPC for already deployed callers. New callers
-- provide the event explicitly, so PostgREST resolves this exact overload.
create function public.frankiholz_close_complimentary_booking(
  p_booking_id uuid, p_operation_token uuid, p_event_type text
) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare b public.frankiholz_bookings;
begin
  if p_event_type is null or p_event_type not in ('booking_cancelled','booking_rejected') then
    raise exception 'Invalid closure notification';
  end if;
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found or p_operation_token is null or b.payment_operation_token is distinct from p_operation_token
    or b.payment_collection_mode<>'complimentary' or b.payment_status<>'not_required' or b.total_price<>0 then
    raise exception 'Complimentary booking operation unavailable';
  end if;
  if b.status='cancelled' then
    if b.closure_notification_event is distinct from p_event_type then raise exception 'Booking is already closed'; end if;
    return;
  end if;
  perform 1 from public.frankiholz_rooms where id=b.room_id for update;
  update public.frankiholz_calendar set is_available=true,availability_status='available',booking_id=null,updated_at=now()
    where booking_id=b.id;
  update public.frankiholz_bookings set status='cancelled',cancelled_at=coalesce(cancelled_at,now()),
    closure_notification_event=p_event_type,updated_at=now() where id=b.id;
end $$;
revoke all on function public.frankiholz_close_complimentary_booking(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.frankiholz_close_complimentary_booking(uuid,uuid,text) to service_role;

-- Preserve the existing legacy release rules, recording their notification in
-- the same transaction. No provider call or additional financial action occurs.
create function public.frankiholz_release_hold_with_notification(
  p_booking_id uuid, p_reason text
) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare b public.frankiholz_bookings; event_type text;
begin
  if p_reason is null or p_reason not in ('released','expired') then raise exception 'Invalid release reason'; end if;
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status='cancelled' then return; end if;
  event_type:=case when p_reason='expired' then 'authorization_expired' else 'booking_rejected' end;
  update public.frankiholz_bookings set closure_notification_event=event_type where id=p_booking_id;
  perform public.frankiholz_release_authorized_hold(p_booking_id,p_reason);
  if not exists(select 1 from public.frankiholz_bookings where id=p_booking_id and status='cancelled') then
    raise exception 'Booking release was not completed';
  end if;
end $$;
revoke all on function public.frankiholz_release_hold_with_notification(uuid,text) from public,anon,authenticated;
grant execute on function public.frankiholz_release_hold_with_notification(uuid,text) to service_role;

commit;
