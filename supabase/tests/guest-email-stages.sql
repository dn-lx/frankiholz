-- Execute after the migration, inside a caller-owned BEGIN/ROLLBACK.
-- LIKE does not copy foreign keys: no actual booking or delivery record is created.
create temporary table guest_email_stage_probe
  (like public.frankiholz_email_events including all) on commit drop;
do $$
declare probe_id uuid := gen_random_uuid();
begin
  insert into guest_email_stage_probe (booking_id,event_type,recipient)
  values (probe_id,'guest_request_ready','guest@example.invalid'),
         (probe_id,'guest_host_decision','guest@example.invalid'),
         (probe_id,'request_received','guest@example.invalid');
  begin
    insert into guest_email_stage_probe (booking_id,event_type,recipient)
    values (probe_id,'guest_host_decision','another@example.invalid');
    raise exception 'duplicate stage unexpectedly accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into guest_email_stage_probe (booking_id,event_type,recipient)
    values (probe_id,'unknown_event','guest@example.invalid');
    raise exception 'unknown event unexpectedly accepted';
  exception when check_violation then null;
  end;
end $$;

-- Private delivery protocol exercised with one rollback-only fixture. No provider calls.
do $$
declare bid uuid; healthy uuid; c jsonb; d jsonb; payload jsonb; wrong uuid:=gen_random_uuid(); signature text;
begin
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,
    payment_status,stripe_payment_method_id,payment_schedule_version)
  select 'ROLLBACK-EMAIL-'||gen_random_uuid(),id,current_date+900,current_date+901,'Rollback fixture','guest@example.invalid',95,
    'payment_method_saved','pm_rollback','v2_14_day' from public.frankiholz_rooms limit 1 returning id into bid;
  foreach signature in array array['frankiholz_claim_guest_email(uuid,text,text)','frankiholz_prepare_guest_email(uuid,text,uuid,jsonb)',
    'frankiholz_complete_guest_email(uuid,text,uuid,text)','frankiholz_release_guest_email(uuid,text,uuid)'] loop
    if has_function_privilege('anon','public.'||signature,'execute') or has_function_privilege('authenticated','public.'||signature,'execute')
      or not has_function_privilege('service_role','public.'||signature,'execute') then raise exception 'Unsafe RPC grants: %',signature;end if;
  end loop;
  if has_table_privilege('anon','public.frankiholz_guest_email_outbox','select') or has_table_privilege('authenticated','public.frankiholz_guest_email_outbox','select')
    or not (select relrowsecurity from pg_class where oid='public.frankiholz_guest_email_outbox'::regclass) then raise exception 'Outbox exposed';end if;
  c:=public.frankiholz_claim_guest_email(bid,'guest_request_ready','payment_method_saved');
  if not (c->>'claimed')::boolean or c->'booking'->>'status'<>'pending' then raise exception 'Setup not claimed';end if;
  payload:=jsonb_build_object('to','guest@example.invalid','subject','Thank you','html','<p>Saved</p>');
  begin perform public.frankiholz_prepare_guest_email(bid,'guest_request_ready',wrong,payload);raise exception 'Wrong token prepared';
    exception when others then if sqlerrm<>'Email delivery lease unavailable' then raise;end if;end;
  perform public.frankiholz_prepare_guest_email(bid,'guest_request_ready',(c->>'token')::uuid,payload);
  if public.frankiholz_prepare_guest_email(bid,'guest_request_ready',(c->>'token')::uuid,payload||'{"subject":"Changed"}'::jsonb)<>payload then raise exception 'Payload mutated';end if;
  -- Host decision queues behind the in-flight setup delivery.
  update public.frankiholz_bookings set status='confirmed',payment_status='scheduled_charge' where id=bid;
  d:=public.frankiholz_claim_guest_email(bid,'guest_host_decision','booking_confirmed');
  if (d->>'claimed')::boolean or not (d->>'queued')::boolean then raise exception 'Concurrent decision overtook setup';end if;
  if public.frankiholz_release_guest_email(bid,'guest_request_ready',wrong) then raise exception 'Wrong token released';end if;
  -- Recover a timed-out worker using exactly the prepared payload despite changed booking state.
  update public.frankiholz_guest_email_outbox set lease_until=now()-interval '1 second' where booking_id=bid and stage='guest_request_ready';
  d:=public.frankiholz_claim_guest_email(bid);
  if d->>'stage'<>'guest_request_ready' or d->'payload'<>payload or d->>'token'=c->>'token' then raise exception 'Recovery not immutable';end if;
  begin perform public.frankiholz_complete_guest_email(bid,'guest_request_ready',(c->>'token')::uuid,'provider-old');raise exception 'Stale worker completed';
    exception when others then if sqlerrm<>'Email delivery lease unavailable' then raise;end if;end;
  perform public.frankiholz_complete_guest_email(bid,'guest_request_ready',(d->>'token')::uuid,'provider-ready');
  c:=public.frankiholz_claim_guest_email(bid);
  if c->>'stage'<>'guest_host_decision' or c->'booking'->>'payment_status'<>'scheduled_charge' then raise exception 'Queued decision missing fresh state';end if;
  perform public.frankiholz_prepare_guest_email(bid,'guest_host_decision',(c->>'token')::uuid,payload||'{"subject":"Confirmed"}'::jsonb);
  perform public.frankiholz_complete_guest_email(bid,'guest_host_decision',(c->>'token')::uuid,'provider-decision');
  if (public.frankiholz_claim_guest_email(bid,'guest_host_decision','booking_confirmed')->>'claimed')::boolean
    or (select count(*) from public.frankiholz_email_events where booking_id=bid)<>2 then raise exception 'Duplicate stage delivered';end if;
  -- Old bank receipt + failed-charge decision already exhaust the two-message allowance.
  delete from public.frankiholz_guest_email_outbox where booking_id=bid;
  delete from public.frankiholz_email_events where booking_id=bid;
  insert into public.frankiholz_email_events(booking_id,event_type,recipient) values(bid,'payment_confirmed','guest@example.invalid'),(bid,'charge_failed','guest@example.invalid');
  if (public.frankiholz_claim_guest_email(bid,'guest_host_decision','booking_confirmed')->>'claimed')::boolean then raise exception 'Historical third email allowed';end if;
  delete from public.frankiholz_guest_email_outbox where booking_id=bid;
  delete from public.frankiholz_email_events where booking_id=bid;
  c:=public.frankiholz_claim_guest_email(bid,'guest_host_decision','booking_confirmed');
  perform public.frankiholz_prepare_guest_email(bid,'guest_host_decision',(c->>'token')::uuid,payload);
  -- Provider may have accepted, but its response/our completion was lost.
  update public.frankiholz_guest_email_outbox set first_attempt_at=now()-interval '25 hours',lease_until=now()-interval '1 second' where booking_id=bid;
  insert into public.frankiholz_guest_email_outbox(booking_id,stage,event_type) values(bid,'guest_request_ready','payment_method_saved');
  d:=public.frankiholz_claim_guest_email(bid);
  if (d->>'claimed')::boolean or not (d->>'needs_review')::boolean
    or exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=bid and state<>'needs_review') then raise exception 'Expired idempotency window replayed or queued sibling left retryable';end if;
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,payment_status,stripe_payment_method_id)
  select 'ROLLBACK-HEALTHY-'||gen_random_uuid(),room_id,check_in,check_out,guest_name,guest_email,total_price,'payment_method_saved','pm_healthy'
  from public.frankiholz_bookings where id=bid returning id into healthy;
  c:=public.frankiholz_claim_guest_email(healthy,'guest_request_ready','payment_method_saved');
  perform public.frankiholz_release_guest_email(healthy,'guest_request_ready',(c->>'token')::uuid);
  if not (c->>'claimed')::boolean or (select count(*) from public.frankiholz_guest_email_outbox where booking_id in(bid,healthy) and state in('pending','sending'))<>1 then raise exception 'Blocked booking starves healthy retry queue';end if;
  if not exists(select 1 from cron.job where jobname='frankiholz-guest-email-retry' and schedule='*/5 * * * *' and active) then raise exception 'Recovery job absent';end if;
end $$;
select 'Stage uniqueness, service-only grants, lease ordering, stale ownership, immutable recovery and historical suppression passed' as verification;
