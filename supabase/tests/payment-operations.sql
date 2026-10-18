-- Run after the migration inside a transaction, then ROLLBACK.
-- SQL only: no Stripe requests, HTTP calls or transactional emails.
do $$
declare room uuid; request record; b public.frankiholz_bookings; op jsonb; arrival date := current_date+600;
begin
  select id into room from public.frankiholz_rooms where active order by id limit 1;
  select * into request from public.frankiholz_create_booking_v2(room,arrival,arrival+1,
    'Payment rollback test','payment-test@example.invalid',p_message=>'Isolated SQL operation lock verification',
    p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English']);
  select * into b from public.frankiholz_bookings where reference=request.reference;
  op := public.frankiholz_claim_payment_operation(b.id,'setup');
  begin
    perform public.frankiholz_claim_payment_operation(b.id,'cancel');
    raise exception 'Cancellation overlapped setup';
  exception when others then
    if sqlerrm<>'Payment operation unavailable; please contact FrankiHolz' then raise; end if;
  end;
  update public.frankiholz_bookings set payment_operation_token=null,payment_operation_started_at=null,
    payment_status='payment_method_saved',stripe_payment_method_id='pm_rollback_only' where id=b.id;
  op := public.frankiholz_claim_payment_operation(b.id,'accept');
  perform public.frankiholz_confirm_payment_booking(b.id,(op->>'token')::uuid);
  if (select status from public.frankiholz_bookings where id=b.id)<>'confirmed' then raise exception 'Host confirmation failed'; end if;
  if (select count(*) from public.frankiholz_calendar where booking_id=b.id)<>1 then raise exception 'Exclusive checkout boundary failed'; end if;
  update public.frankiholz_bookings set payment_operation_token=null,payment_operation_started_at=null where id=b.id;
  op := public.frankiholz_claim_payment_operation(b.id,'charge');
  if (select payment_status from public.frankiholz_bookings where id=b.id)<>'processing' then raise exception 'Charge was not claimed'; end if;
  begin
    perform public.frankiholz_claim_payment_operation(b.id,'cancel');
    raise exception 'Cancellation overlapped charge';
  exception when others then
    if sqlerrm<>'Payment operation unavailable; please contact FrankiHolz' then raise; end if;
  end;
  update public.frankiholz_bookings set payment_operation_token=null,payment_operation_started_at=null,
    payment_collection_mode='bank_transfer',payment_status='awaiting_payment',status='pending' where id=b.id;
  begin
    perform public.frankiholz_claim_payment_operation(b.id,'accept');
    raise exception 'Unpaid bank transfer was approved';
  exception when others then
    if sqlerrm<>'Guest payment is not ready for host approval' then raise; end if;
  end;
  begin
    perform public.frankiholz_claim_payment_operation(b.id,'charge');
    raise exception 'Bank transfer was charged off-session';
  exception when others then
    if sqlerrm<>'Booking cannot be charged' then raise; end if;
  end;
  if has_function_privilege('anon','public.frankiholz_claim_payment_operation(uuid,text)','execute')
     or has_function_privilege('authenticated','public.frankiholz_claim_payment_operation(uuid,text)','execute')
     or has_function_privilege('anon','public.frankiholz_confirm_payment_booking(uuid,uuid)','execute') then
    raise exception 'Payment operation privileges incorrect';
  end if;
end $$;
select 'Payment locks, host confirmation, bank separation and service-only permissions verified; rollback required' as verification;
