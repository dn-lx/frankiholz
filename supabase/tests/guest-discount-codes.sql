-- Execute after the migration inside BEGIN ... ROLLBACK. No external email/Stripe calls.
do $$
declare rid uuid; arrival date:=current_date+600; admin_email text; percent integer; code text;
  q record; created record; b public.frankiholz_bookings; free_id uuid; operation jsonb; before_count bigint;
begin
  select id into rid from public.frankiholz_rooms where active order by sort_order limit 1;
  select email into admin_email from public.frankiholz_admin_users limit 1;
  perform set_config('request.jwt.claims',jsonb_build_object('email',admin_email,'role','authenticated')::text,true);
  perform public.frankiholz_set_calendar_range(rid,arrival,arrival+8,'available');
  update public.frankiholz_calendar set price_override=null where room_id=rid and date between arrival and arrival+8;
  update public.frankiholz_rooms set base_price=40 where id=rid;
  foreach percent in array array[25,50,75,100] loop
    code:='FrankFlowGuest'||percent;
    if private.frankiholz_promo_percent(' '||upper(code)||' ')<>percent then raise exception 'Code normalization failed'; end if;
    select * into q from public.frankiholz_quote_with_promo(rid,arrival,arrival+4,code);
    if not q.available or q.discount_percent<>percent or q.total_price<>round(q.original_total_price*(100-percent)/100,2) then raise exception 'Incorrect quote for %',code; end if;
    select * into created from public.frankiholz_create_booking_with_promo(rid,arrival,arrival+4,'Rollback fixture','rollback@example.invalid',
      p_message=>'Transactional discount verification only',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>' '||upper(code)||' ');
    select * into b from public.frankiholz_bookings where reference=created.reference;
    if b.total_price<>q.total_price or b.promo_code<>code or b.original_total_price<>q.original_total_price or b.promo_discount_percent<>percent or b.status<>'pending' then raise exception 'Incorrect stored promo snapshot'; end if;
    if percent=100 then
      free_id:=b.id;
      if b.payment_status<>'not_required' or b.payment_collection_mode<>'complimentary' or b.paid_at is not null or b.charge_due_at is not null or b.stripe_payment_intent_id is not null then raise exception 'Free request has financial state'; end if;
    elsif b.payment_status<>'not_started' or b.payment_collection_mode<>'saved_method' then raise exception 'Paid flow changed'; end if;
  end loop;
  if private.frankiholz_promo_percent('FrankiHolzGuest50')<>50 or private.frankiholz_promo_percent('FrankiHolzGuest75')<>75 then raise exception 'Legacy code regression'; end if;
  begin perform private.frankiholz_promo_percent('FrankFlowGuest101');raise exception 'Invalid code accepted';exception when others then if sqlerrm<>'Promo code is not valid' then raise;end if;end;
  -- Complimentary requests cannot acquire setup/charge leases.
  begin perform public.frankiholz_claim_payment_operation(free_id,'setup');raise exception 'Free setup allowed';exception when others then if sqlerrm<>'An existing payment must be reconciled first' then raise;end if;end;
  begin perform public.frankiholz_claim_payment_operation(free_id,'charge');raise exception 'Free charge allowed';exception when others then if sqlerrm<>'Booking cannot be charged' then raise;end if;end;
  operation:=public.frankiholz_claim_payment_operation(free_id,'accept');
  perform public.frankiholz_confirm_payment_booking(free_id,(operation->>'token')::uuid);
  perform public.frankiholz_confirm_payment_booking(free_id,(operation->>'token')::uuid);
  update public.frankiholz_bookings set payment_operation_token=null,payment_operation_started_at=null where id=free_id;
  if not private.frankiholz_night_unavailable(rid,arrival) or (select payment_status from public.frankiholz_bookings where id=free_id)<>'not_required' then raise exception 'Complimentary confirmation failed'; end if;
  operation:=public.frankiholz_claim_payment_operation(free_id,'cancel');
  perform public.frankiholz_close_complimentary_booking(free_id,(operation->>'token')::uuid);
  update public.frankiholz_bookings set payment_operation_token=null,payment_operation_started_at=null where id=free_id;
  if (select status from public.frankiholz_bookings where id=free_id)<>'cancelled' or (select payment_status from public.frankiholz_bookings where id=free_id)<>'not_required' then raise exception 'Complimentary cancellation failed'; end if;
  if exists(select 1 from public.frankiholz_calendar where booking_id=free_id) then raise exception 'Cancellation kept reservation'; end if;
  -- A request made before a block must still fail host confirmation atomically.
  select * into created from public.frankiholz_create_booking_with_promo(rid,arrival+5,arrival+6,'Rollback fixture','rollback@example.invalid',p_message=>'Availability verification only',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>'FrankFlowGuest100');
  select * into b from public.frankiholz_bookings where reference=created.reference;
  perform public.frankiholz_set_calendar_range(rid,arrival+5,arrival+5,'blocked');
  operation:=public.frankiholz_claim_payment_operation(b.id,'accept');
  begin perform public.frankiholz_confirm_payment_booking(b.id,(operation->>'token')::uuid);raise exception 'Unavailable free stay confirmed';exception when others then if sqlerrm<>'Dates are no longer available; reject and refund this request' then raise;end if;end;
  update public.frankiholz_bookings set payment_operation_token=null,payment_operation_started_at=null where id=b.id;
  -- Positive discounts must not round down to a free booking or bypass the minimum.
  update public.frankiholz_rooms set base_price=0.50 where id=rid;
  update public.frankiholz_pricing_settings set weekend_markup_pct=0,occupancy_markup_1_pct=0,occupancy_markup_2_pct=0,last_minute_discount_pct=0,long_stay_discount_1_pct=0,long_stay_discount_2_pct=0 where id=1;
  foreach percent in array array[25,50,75] loop
    select count(*) into before_count from public.frankiholz_bookings;
    begin
      perform public.frankiholz_create_booking_with_promo(rid,arrival+7,arrival+8,'Rollback fixture','rollback@example.invalid',p_message=>'Minimum verification only',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>'FrankFlowGuest'||percent);
      raise exception 'Under-minimum promo accepted';
    exception when others then if sqlerrm<>'The discounted booking total must be at least EUR 0.50' then raise;end if;end;
    if (select count(*) from public.frankiholz_bookings)<>before_count then raise exception 'Failed promo left a row';end if;
  end loop;
  if has_function_privilege('anon','public.frankiholz_close_complimentary_booking(uuid,uuid)','execute') or has_function_privilege('authenticated','public.frankiholz_close_complimentary_booking(uuid,uuid)','execute') then raise exception 'Guest close RPC grant';end if;
  begin update public.frankiholz_bookings set paid_at=now() where id=free_id;raise exception 'Free paid receipt permitted';exception when check_violation then null;end;
end $$;
set local role anon;
select discount_percent,total_price from public.frankiholz_quote_with_promo('2facc875-9470-4b12-9b28-cd65b7360b14',current_date+607,current_date+608,'FrankFlowGuest100');
reset role;
select 'All four discounts, snapshots, free approval/cancellation, conflicts, minimum rollback and privileges passed' as verification;
