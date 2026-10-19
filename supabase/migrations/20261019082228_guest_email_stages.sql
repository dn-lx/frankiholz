-- Preserve the event audit while deduplicating guest delivery by two lifecycle stages.
-- Provider calls happen outside Postgres: the private outbox below serializes them.
alter table public.frankiholz_email_events
  drop constraint frankiholz_email_events_event_type_check;

alter table public.frankiholz_email_events
  add constraint frankiholz_email_events_event_type_check check (event_type in (
    'request_received','approved','rejected','payment_confirmed',
    'authorization_received','booking_confirmed','booking_rejected',
    'authorization_expired','payment_method_saved','charge_scheduled',
    'charge_failed','booking_cancelled','guest_request_ready','guest_host_decision'
  ));

create table public.frankiholz_guest_email_outbox (
  booking_id uuid not null references public.frankiholz_bookings(id) on delete cascade,
  stage text not null check (stage in ('guest_request_ready','guest_host_decision')),
  event_type text not null,
  state text not null default 'pending' check (state in ('pending','sending','sent','skipped','needs_review')),
  payload jsonb,
  first_attempt_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  provider_message_id text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (booking_id,stage)
);
alter table public.frankiholz_guest_email_outbox enable row level security;
revoke all on public.frankiholz_guest_email_outbox from public,anon,authenticated;
grant all on public.frankiholz_guest_email_outbox to service_role;

create function public.frankiholz_claim_guest_email(p_booking_id uuid,p_stage text default null,p_event_type text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare b public.frankiholz_bookings%rowtype; mail public.frankiholz_guest_email_outbox%rowtype; token uuid; sent_count integer; valid_event boolean; room jsonb;
begin
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if p_stage is not null then
    valid_event := case p_stage
      when 'guest_request_ready' then b.status='pending' and (
        (p_event_type='payment_method_saved' and b.payment_collection_mode='saved_method' and b.payment_status='payment_method_saved' and b.stripe_payment_method_id is not null)
        or (p_event_type='request_received' and b.payment_collection_mode='complimentary' and b.payment_status='not_required')
        or (p_event_type='authorization_received' and b.payment_status='authorized')
        or (p_event_type='payment_confirmed' and b.payment_collection_mode='bank_transfer' and b.payment_status='paid'))
      when 'guest_host_decision' then (b.status='confirmed' and p_event_type='booking_confirmed')
        or (b.status='cancelled' and p_event_type in ('booking_rejected','booking_cancelled','authorization_expired'))
      else false end;
    if valid_event then
      insert into public.frankiholz_guest_email_outbox(booking_id,stage,event_type)
      values(b.id,p_stage,p_event_type) on conflict do nothing;
    end if;
  end if;
  -- The sending lease spans the external provider call. Other events remain queued.
  if exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=b.id and state='sending' and lease_until>now()) then
    return jsonb_build_object('claimed',false,'queued',true);
  end if;
  -- Resend keeps idempotency keys for 24h. Ambiguous older attempts need manual
  -- reconciliation; never send them again after that protection can expire.
  update public.frankiholz_guest_email_outbox set state='needs_review',lease_token=null,lease_until=null,updated_at=now()
  where booking_id=b.id and state in ('pending','sending') and first_attempt_at<=now()-interval '23 hours';
  if exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=b.id and state='needs_review') then
    update public.frankiholz_guest_email_outbox set state='needs_review',lease_token=null,lease_until=null,updated_at=now()
    where booking_id=b.id and state in ('pending','sending');
    return jsonb_build_object('claimed',false,'needs_review',true);
  end if;
  select count(*) into sent_count from public.frankiholz_email_events where booking_id=b.id;
  if sent_count>=2 then
    update public.frankiholz_guest_email_outbox set state='skipped',lease_token=null,lease_until=null,updated_at=now()
    where booking_id=b.id and state in ('pending','sending');
    return jsonb_build_object('claimed',false,'skipped',true);
  end if;
  for mail in select * from public.frankiholz_guest_email_outbox
    where booking_id=b.id and (state='pending' or (state='sending' and lease_until<=now()))
    order by case stage when 'guest_request_ready' then 0 else 1 end
  loop
    if (mail.stage='guest_request_ready' and exists(select 1 from public.frankiholz_email_events where booking_id=b.id))
      or (mail.stage='guest_host_decision' and exists(select 1 from public.frankiholz_email_events where booking_id=b.id and event_type in ('guest_host_decision','booking_confirmed','booking_rejected','approved','rejected','booking_cancelled','authorization_expired','charge_scheduled','charge_failed')))
      or (mail.payload is null and ((mail.stage='guest_request_ready' and b.status<>'pending') or (mail.stage='guest_host_decision' and b.status not in ('confirmed','cancelled')))) then
      update public.frankiholz_guest_email_outbox set state='skipped',lease_token=null,lease_until=null,updated_at=now() where booking_id=b.id and stage=mail.stage;
      continue;
    end if;
    if mail.payload is null and mail.stage='guest_host_decision' then
      mail.event_type := case when b.status='confirmed' then 'booking_confirmed'
        when mail.event_type in ('booking_rejected','authorization_expired') then mail.event_type else 'booking_cancelled' end;
    end if;
    token:=gen_random_uuid();
    update public.frankiholz_guest_email_outbox set state='sending',event_type=mail.event_type,
      lease_token=token,lease_until=now()+interval '60 seconds',attempts=attempts+1,updated_at=now()
    where booking_id=b.id and stage=mail.stage;
    select jsonb_build_object('name',r.name,'name_de',r.name_de) into room from public.frankiholz_rooms r where r.id=b.room_id;
    return jsonb_build_object('claimed',true,'stage',mail.stage,'event',mail.event_type,'token',token,'payload',mail.payload,
      'booking',to_jsonb(b)||jsonb_build_object('frankiholz_rooms',room));
  end loop;
  return jsonb_build_object('claimed',false,'skipped',true);
end $$;

create function public.frankiholz_prepare_guest_email(p_booking_id uuid,p_stage text,p_token uuid,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare mail public.frankiholz_guest_email_outbox%rowtype; guest_email text;
begin
  perform 1 from public.frankiholz_bookings where id=p_booking_id for update;
  select * into mail from public.frankiholz_guest_email_outbox where booking_id=p_booking_id and stage=p_stage for update;
  if not found or mail.state<>'sending' or mail.lease_token is distinct from p_token or mail.lease_until<=now() then raise exception 'Email delivery lease unavailable'; end if;
  if mail.payload is not null then return mail.payload; end if;
  select b.guest_email into guest_email from public.frankiholz_bookings b where b.id=p_booking_id;
  if jsonb_typeof(p_payload->'html') is distinct from 'string' or jsonb_typeof(p_payload->'subject') is distinct from 'string'
    or p_payload->>'to' is distinct from guest_email or length(p_payload->>'html')>150000 or length(p_payload->>'subject')>500 then raise exception 'Invalid guest email payload'; end if;
  update public.frankiholz_guest_email_outbox set payload=p_payload,updated_at=now() where booking_id=p_booking_id and stage=p_stage;
  update public.frankiholz_guest_email_outbox set first_attempt_at=coalesce(first_attempt_at,now()) where booking_id=p_booking_id and stage=p_stage;
  return p_payload;
end $$;

create function public.frankiholz_complete_guest_email(p_booking_id uuid,p_stage text,p_token uuid,p_provider_id text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare mail public.frankiholz_guest_email_outbox%rowtype;
begin
  perform 1 from public.frankiholz_bookings where id=p_booking_id for update;
  select * into mail from public.frankiholz_guest_email_outbox where booking_id=p_booking_id and stage=p_stage for update;
  if not found or mail.state<>'sending' or mail.lease_token is distinct from p_token or mail.lease_until<=now() or mail.payload is null then raise exception 'Email delivery lease unavailable'; end if;
  if coalesce(p_provider_id,'')='' then raise exception 'Email provider acknowledgement missing'; end if;
  insert into public.frankiholz_email_events(booking_id,event_type,recipient,provider_message_id)
  values(p_booking_id,p_stage,mail.payload->>'to',p_provider_id) on conflict(booking_id,event_type) do nothing;
  update public.frankiholz_guest_email_outbox set state='sent',provider_message_id=p_provider_id,lease_token=null,lease_until=null,updated_at=now()
  where booking_id=p_booking_id and stage=p_stage;
  return true;
end $$;

create function public.frankiholz_release_guest_email(p_booking_id uuid,p_stage text,p_token uuid)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  perform 1 from public.frankiholz_bookings where id=p_booking_id for update;
  update public.frankiholz_guest_email_outbox set state='pending',lease_token=null,lease_until=null,updated_at=now()
  where booking_id=p_booking_id and stage=p_stage and state='sending' and lease_token=p_token;
  return found;
end $$;

revoke all on function public.frankiholz_claim_guest_email(uuid,text,text) from public,anon,authenticated;
revoke all on function public.frankiholz_prepare_guest_email(uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.frankiholz_complete_guest_email(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.frankiholz_release_guest_email(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.frankiholz_claim_guest_email(uuid,text,text) to service_role;
grant execute on function public.frankiholz_prepare_guest_email(uuid,text,uuid,jsonb) to service_role;
grant execute on function public.frankiholz_complete_guest_email(uuid,text,uuid,text) to service_role;
grant execute on function public.frankiholz_release_guest_email(uuid,text,uuid) to service_role;

-- Reuse the existing private scheduler credential; no secret is embedded in cron.
select cron.schedule('frankiholz-guest-email-retry','*/5 * * * *',$job$
  select net.http_post(
    url:='https://bdeajozhylypiidrldka.supabase.co/functions/v1/frankiholz-guest-email',
    headers:=jsonb_build_object('Content-Type','application/json','x-frankiholz-cron',
      (select token from public.frankiholz_scheduler_secrets where id=1)),
    body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=90000)
  where exists(select 1 from public.frankiholz_guest_email_outbox where state in ('pending','sending'));
$job$);
