-- Isolated database only, after 20261023120000; caller owns BEGIN/ROLLBACK.
-- No provider calls. Do not run against shared guest data or commit fixtures.
create temporary table closure_recovery_failure_probe (booking_id uuid primary key) on commit drop;
-- The injected probe reads its caller-owned temp table even when the real
-- close RPC executes under a distinct migration owner. It is test-local only.
create function pg_temp.reject_recovery_queue_probe() returns trigger
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if exists(select 1 from pg_temp.closure_recovery_failure_probe where booking_id=new.booking_id) then
    raise exception 'Injected outbox insert failure';
  end if;
  return new;
end $$;
create trigger closure_recovery_queue_probe before insert on public.frankiholz_guest_email_outbox
  for each row execute function pg_temp.reject_recovery_queue_probe();

do $$
declare rid uuid; bid uuid; failed_id uuid; confirmed_id uuid; pending_id uuid; frozen_id uuid; historical_id uuid; op jsonb; claimed jsonb; snapshot public.frankiholz_bookings;
begin
  select id into rid from public.frankiholz_rooms limit 1;
  if rid is null then raise exception 'An isolated fixture room is required'; end if;
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
    payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent)
  values('ROLLBACK-CLOSURE-'||gen_random_uuid(),rid,current_date+930,current_date+931,'Rollback fixture','guest@example.invalid',0,'pending',
    'not_required','complimentary','v2_14_day','FrankFlowGuest100',100) returning id into bid;
  op:=public.frankiholz_claim_payment_operation(bid,'cancel');
  begin
    perform public.frankiholz_close_complimentary_booking(bid,gen_random_uuid(),'booking_cancelled');
    raise exception 'Wrong operation token accepted';
  exception when others then if sqlerrm<>'Complimentary booking operation unavailable' then raise; end if; end;
  begin
    perform public.frankiholz_close_complimentary_booking(bid,(op->>'token')::uuid,'payment_confirmed');
    raise exception 'Invalid closure event accepted';
  exception when others then if sqlerrm<>'Invalid closure notification' then raise; end if; end;
  if exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=bid) then raise exception 'Failed close queued mail'; end if;
  perform public.frankiholz_close_complimentary_booking(bid,(op->>'token')::uuid,'booking_cancelled');
  select * into snapshot from public.frankiholz_bookings where id=bid;
  if snapshot.status<>'cancelled' or snapshot.payment_status<>'not_required' or snapshot.closure_notification_event<>'booking_cancelled'
    or snapshot.paid_at is not null then raise exception 'Incorrect closed state or origin'; end if;
  if not exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=bid and stage='guest_host_decision'
    and event_type='booking_cancelled' and state='pending') then raise exception 'Closure was not durably queued'; end if;
  perform public.frankiholz_close_complimentary_booking(bid,(op->>'token')::uuid,'booking_cancelled');
  if (select count(*) from public.frankiholz_guest_email_outbox where booking_id=bid)<>1 then raise exception 'Replay duplicated queue'; end if;
  begin
    perform public.frankiholz_close_complimentary_booking(bid,(op->>'token')::uuid,'booking_rejected');
    raise exception 'Retry changed closure origin';
  exception when others then if sqlerrm<>'Booking is already closed' then raise; end if; end;
  begin
    update public.frankiholz_bookings set closure_notification_event='booking_rejected' where id=bid;
    raise exception 'Closed origin was mutable';
  exception when others then if sqlerrm<>'Closure notification origin is immutable' then raise; end if; end;

  -- A queue failure rolls back status, origin and calendar release together.
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
    payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent)
  values('ROLLBACK-FAIL-CLOSURE-'||gen_random_uuid(),rid,current_date+932,current_date+933,'Rollback fixture','guest@example.invalid',0,'confirmed',
    'not_required','complimentary','v2_14_day','FrankFlowGuest100',100) returning id into failed_id;
  begin
    update public.frankiholz_bookings set closure_notification_event='forged_event' where id=failed_id;
    raise exception 'Unknown event passed column constraint';
  exception when check_violation then null; end;
  insert into public.frankiholz_calendar(room_id,date,is_available,availability_status,booking_id)
    values(rid,current_date+932,false,'booked',failed_id);
  insert into closure_recovery_failure_probe values(failed_id);
  op:=public.frankiholz_claim_payment_operation(failed_id,'cancel');
  begin
    perform public.frankiholz_close_complimentary_booking(failed_id,(op->>'token')::uuid,'booking_rejected');
    raise exception 'Injected queue failure was ignored';
  exception when others then if sqlerrm<>'Injected outbox insert failure' then raise; end if; end;
  select * into snapshot from public.frankiholz_bookings where id=failed_id;
  if snapshot.status<>'confirmed' or snapshot.closure_notification_event is not null then raise exception 'Failed queue left a partial close'; end if;
  if not exists(select 1 from public.frankiholz_calendar where booking_id=failed_id and not is_available) then raise exception 'Failed queue released a reserved night'; end if;
  if exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=failed_id) then raise exception 'Failed queue retained a partial entry'; end if;
  delete from closure_recovery_failure_probe where booking_id=failed_id;
  perform public.frankiholz_close_complimentary_booking(failed_id,(op->>'token')::uuid,'booking_rejected');

  -- The deliberate two-stage policy survives a later cancellation.
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
    payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent)
  values('ROLLBACK-SENT-CLOSURE-'||gen_random_uuid(),rid,current_date+934,current_date+935,'Rollback fixture','guest@example.invalid',0,'confirmed',
    'not_required','complimentary','v2_14_day','FrankFlowGuest100',100) returning id into confirmed_id;
  insert into public.frankiholz_guest_email_outbox(booking_id,stage,event_type,state)
    values(confirmed_id,'guest_host_decision','booking_confirmed','sent');
  op:=public.frankiholz_claim_payment_operation(confirmed_id,'cancel');
  perform public.frankiholz_close_complimentary_booking(confirmed_id,(op->>'token')::uuid,'booking_cancelled');
  if (select count(*) from public.frankiholz_guest_email_outbox where booking_id=confirmed_id)<>1
    or not exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=confirmed_id and event_type='booking_confirmed' and state='sent') then
    raise exception 'Cancellation replaced or expanded an existing guest stage'; end if;

  -- A never-prepared pending confirmation adopts the recorded rejection in the
  -- same stage; the actual claim protocol must return that event after closure.
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
    payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent)
  values('ROLLBACK-PENDING-CLOSURE-'||gen_random_uuid(),rid,current_date+942,current_date+943,'Rollback fixture','guest@example.invalid',0,'confirmed',
    'not_required','complimentary','v2_14_day','FrankFlowGuest100',100) returning id into pending_id;
  insert into public.frankiholz_guest_email_outbox(booking_id,stage,event_type,state)
    values(pending_id,'guest_host_decision','booking_confirmed','pending');
  op:=public.frankiholz_claim_payment_operation(pending_id,'cancel');
  perform public.frankiholz_close_complimentary_booking(pending_id,(op->>'token')::uuid,'booking_rejected');
  if (select count(*) from public.frankiholz_guest_email_outbox where booking_id=pending_id)<>1
    or not exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=pending_id and event_type='booking_rejected' and state='pending') then
    raise exception 'Unprepared confirmation did not adopt recorded closure'; end if;
  claimed:=public.frankiholz_claim_guest_email(pending_id,null,null);
  if not (claimed->>'claimed')::boolean or claimed->>'event'<>'booking_rejected' then raise exception 'Email claim invented a different closure origin'; end if;

  -- A frozen provider payload cannot change, even while pending for retry.
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
    payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent)
  values('ROLLBACK-FROZEN-CLOSURE-'||gen_random_uuid(),rid,current_date+944,current_date+945,'Rollback fixture','guest@example.invalid',0,'confirmed',
    'not_required','complimentary','v2_14_day','FrankFlowGuest100',100) returning id into frozen_id;
  insert into public.frankiholz_guest_email_outbox(booking_id,stage,event_type,state,payload,first_attempt_at)
    values(frozen_id,'guest_host_decision','booking_confirmed','pending',jsonb_build_object('to','guest@example.invalid','subject','Frozen confirmation','html','<p>Previously accepted</p>'),now());
  op:=public.frankiholz_claim_payment_operation(frozen_id,'cancel');
  perform public.frankiholz_close_complimentary_booking(frozen_id,(op->>'token')::uuid,'booking_rejected');
  if not exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=frozen_id and event_type='booking_confirmed'
    and state='pending' and payload->>'subject'='Frozen confirmation') then raise exception 'Closure mutated a frozen payload'; end if;

  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
    payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent)
  values('ROLLBACK-SERVICE-CLOSURE-'||gen_random_uuid(),rid,current_date+946,current_date+947,'Rollback fixture','guest@example.invalid',0,'pending',
    'not_required','complimentary','v2_14_day','FrankFlowGuest100',100);

  -- The old two-argument contract is retained without guessing historical origin.
  insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
    payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent)
  values('ROLLBACK-OLD-CLOSURE-'||gen_random_uuid(),rid,current_date+936,current_date+937,'Rollback fixture','guest@example.invalid',0,'pending',
    'not_required','complimentary','v2_14_day','FrankFlowGuest100',100) returning id into historical_id;
  op:=public.frankiholz_claim_payment_operation(historical_id,'cancel');
  perform public.frankiholz_close_complimentary_booking(historical_id,(op->>'token')::uuid);
  if (select closure_notification_event from public.frankiholz_bookings where id=historical_id) is not null
    or exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=historical_id) then raise exception 'Historical origin invented'; end if;

  if has_function_privilege('anon','public.frankiholz_close_complimentary_booking(uuid,uuid,text)','execute')
    or has_function_privilege('authenticated','public.frankiholz_close_complimentary_booking(uuid,uuid,text)','execute')
    or not has_function_privilege('service_role','public.frankiholz_close_complimentary_booking(uuid,uuid,text)','execute')
    or has_function_privilege('anon','public.frankiholz_release_hold_with_notification(uuid,text)','execute')
    or has_function_privilege('authenticated','public.frankiholz_release_hold_with_notification(uuid,text)','execute')
    or not has_function_privilege('service_role','public.frankiholz_release_hold_with_notification(uuid,text)','execute') then
    raise exception 'Closure recovery RPC privileges are unsafe'; end if;
end $$;
drop trigger closure_recovery_queue_probe on public.frankiholz_guest_email_outbox;

-- Prove the origin boundary independently of unknown baseline table grants/RLS.
-- These deliberately broad test permissions are restored by this savepoint.
savepoint closure_origin_role_probe;
grant select,insert,update on public.frankiholz_bookings to authenticated,anon,service_role;
alter table public.frankiholz_bookings disable row level security;
revoke usage on schema private from anon,authenticated,service_role;
set local role service_role;
do $$
declare bid uuid;
begin
  update public.frankiholz_bookings set status='cancelled',closure_notification_event='booking_cancelled'
    where reference like 'ROLLBACK-SERVICE-CLOSURE-%' returning id into bid;
  if bid is null or not exists(select 1 from public.frankiholz_guest_email_outbox where booking_id=bid
    and event_type='booking_cancelled' and state='pending') then raise exception 'Service-role closure did not queue'; end if;
end $$;
reset role;
set local role authenticated;
do $$
begin
  begin
    update public.frankiholz_bookings set closure_notification_event='booking_rejected' where reference like 'ROLLBACK-CLOSURE-%';
    raise exception 'Authenticated role forged origin';
  exception when others then if sqlerrm<>'Closure notification origin is server-owned' then raise; end if; end;
  begin
    insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
      payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent,closure_notification_event)
    select 'ROLLBACK-FORGED-AUTH-'||gen_random_uuid(),room_id,current_date+938,current_date+939,'Rollback fixture','guest@example.invalid',0,'pending',
      'not_required','complimentary','v2_14_day','FrankFlowGuest100',100,'booking_rejected'
      from public.frankiholz_bookings where reference like 'ROLLBACK-CLOSURE-%' limit 1;
    raise exception 'Authenticated insert forged origin';
  exception when others then if sqlerrm<>'Closure notification origin is server-owned' then raise; end if; end;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    update public.frankiholz_bookings set closure_notification_event='booking_rejected' where reference like 'ROLLBACK-CLOSURE-%';
    raise exception 'Anonymous role forged origin';
  exception when others then if sqlerrm<>'Closure notification origin is server-owned' then raise; end if; end;
  begin
    insert into public.frankiholz_bookings(reference,room_id,check_in,check_out,guest_name,guest_email,total_price,status,
      payment_status,payment_collection_mode,payment_schedule_version,promo_code,promo_discount_percent,closure_notification_event)
    select 'ROLLBACK-FORGED-ANON-'||gen_random_uuid(),room_id,current_date+940,current_date+941,'Rollback fixture','guest@example.invalid',0,'pending',
      'not_required','complimentary','v2_14_day','FrankFlowGuest100',100,'booking_rejected'
      from public.frankiholz_bookings where reference like 'ROLLBACK-CLOSURE-%' limit 1;
    raise exception 'Anonymous insert forged origin';
  exception when others then if sqlerrm<>'Closure notification origin is server-owned' then raise; end if; end;
end $$;
reset role;
rollback to savepoint closure_origin_role_probe;
release savepoint closure_origin_role_probe;
select 'Closure origin, durable queue, atomic rollback, existing stage limits and private RPC grants verified; ROLLBACK required' as verification;
