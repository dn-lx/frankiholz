-- Run inside BEGIN ... ROLLBACK. All fixtures disappear, with no email or Stripe calls.
do $$
declare rid uuid; arrival date:=current_date+600; admin_email text; code text; percent integer;
  q record; created record; b public.frankiholz_bookings; before_count bigint;
begin
  select id into rid from public.frankiholz_rooms where active order by sort_order limit 1;
  select email into admin_email from public.frankiholz_admin_users limit 1;
  perform set_config('request.jwt.claims',jsonb_build_object('email',admin_email,'role','authenticated')::text,true);
  perform public.frankiholz_set_calendar_range(rid,arrival,arrival+4,'available');
  update public.frankiholz_calendar set price_override=null where room_id=rid and date between arrival and arrival+4;
  update public.frankiholz_rooms set base_price=40 where id=rid;
  foreach percent in array array[15,25] loop
    code:='FrankfiHolzGuest'||percent;
    if private.frankiholz_promo_percent(' '||upper(code)||' ')<>percent then raise exception 'Alias normalization failed';end if;
    select * into q from public.frankiholz_quote_with_promo(rid,arrival,arrival+2,code);
    if not q.available or q.discount_percent<>percent or q.total_price<>round(q.original_total_price*(100-percent)/100,2) then raise exception 'Incorrect alias quote';end if;
    select * into created from public.frankiholz_create_booking_with_promo(rid,arrival,arrival+2,'Rollback promo fixture','additional-promo-test@example.invalid',
      p_message=>'Rollback-only additional promo verification',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>' '||upper(code)||' ');
    select * into b from public.frankiholz_bookings where reference=created.reference;
    if b.promo_code<>code or b.promo_discount_percent<>percent or b.original_total_price<>q.original_total_price or b.total_price<>q.total_price
      or b.status<>'pending' or b.payment_status<>'not_started' or b.payment_collection_mode<>'saved_method'
      or b.stripe_payment_intent_id is not null or b.paid_at is not null then raise exception 'Incorrect alias snapshot or financial state';end if;
  end loop;
  if private.frankiholz_promo_percent('FrankFlowGuest25')<>25 or private.frankiholz_promo_percent('FrankFlowGuest50')<>50
    or private.frankiholz_promo_percent('FrankFlowGuest75')<>75 or private.frankiholz_promo_percent('FrankFlowGuest100')<>100
    or private.frankiholz_promo_percent('FrankiHolzGuest50')<>50 or private.frankiholz_promo_percent('FrankiHolzGuest75')<>75 then raise exception 'Existing codes changed';end if;
  begin perform private.frankiholz_promo_percent('FrankfiHolzGuest100');raise exception 'Unknown alias accepted';exception when others then if sqlerrm<>'Promo code is not valid' then raise;end if;end;
  update public.frankiholz_rooms set base_price=0.50 where id=rid;
  update public.frankiholz_pricing_settings set weekend_markup_pct=0,occupancy_markup_1_pct=0,occupancy_markup_2_pct=0,last_minute_discount_pct=0,long_stay_discount_1_pct=0,long_stay_discount_2_pct=0 where id=1;
  foreach percent in array array[15,25] loop
    code:='FrankfiHolzGuest'||percent;
    select count(*) into before_count from public.frankiholz_bookings;
    begin perform public.frankiholz_quote_with_promo(rid,arrival+3,arrival+4,code);raise exception 'Under-minimum alias quote accepted';exception when others then if sqlerrm<>'The discounted booking total must be at least EUR 0.50' then raise;end if;end;
    begin perform public.frankiholz_create_booking_with_promo(rid,arrival+3,arrival+4,'Rollback minimum fixture','additional-promo-test@example.invalid',p_message=>'Rollback-only minimum verification',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>code);raise exception 'Under-minimum alias booking accepted';exception when others then if sqlerrm<>'The discounted booking total must be at least EUR 0.50' then raise;end if;end;
    if (select count(*) from public.frankiholz_bookings)<>before_count then raise exception 'Failed booking persisted';end if;
  end loop;
  if has_function_privilege('anon','private.frankiholz_promo_percent(text)','execute') or has_function_privilege('authenticated','private.frankiholz_promo_percent(text)','execute')
    or not has_function_privilege('anon','public.frankiholz_quote_with_promo(uuid,date,date,text)','execute') then raise exception 'Promo grant regression';end if;
end $$;
set local role anon;
select discount_percent,total_price from public.frankiholz_quote_with_promo('2facc875-9470-4b12-9b28-cd65b7360b14',current_date+600,current_date+602,'FrankfiHolzGuest25');
reset role;
select 'Both alias discounts, snapshots, normalization, minimum rollback and grants passed' as verification;
