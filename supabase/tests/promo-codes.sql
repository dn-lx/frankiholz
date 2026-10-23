-- Run after the migration INSIDE a transaction and roll back.
-- No email HTTP call, Stripe API call or persistent test booking is made.
do $$
declare
  room uuid := '2facc875-9470-4b12-9b28-cd65b7360b14';
  arrival date := current_date + 400;
  q record;
  b record;
  stored record;
  before_count bigint;
begin
  if private.frankiholz_promo_percent(' FrankiHolzGuest50 ') <> 50 or
     private.frankiholz_promo_percent('FRANKIHOLZGUEST75') <> 75 then
    raise exception 'Promo normalization failed';
  end if;
  begin
    perform private.frankiholz_promo_percent('unknown');
    raise exception 'Invalid promo was accepted';
  exception when others then
    if sqlerrm <> 'Promo code is not valid' then raise; end if;
  end;
  select * into q from public.frankiholz_quote_with_promo(room,arrival,arrival+4,'FrankiHolzGuest50');
  if not q.available or q.total_price <> round(q.original_total_price * 0.50,2) or q.discount_percent <> 50 then
    raise exception '50 percent quote failed';
  end if;
  select * into q from public.frankiholz_quote_with_promo(room,arrival,arrival+4,'FrankiHolzGuest75');
  if not q.available or q.total_price <> round(q.original_total_price * 0.25,2) or q.discount_percent <> 75 then
    raise exception '75 percent quote failed';
  end if;
  select count(*) into before_count from public.frankiholz_bookings;
  begin
    perform public.frankiholz_create_booking_with_promo(room,arrival,arrival+1,
      'Promo rollback test','promo-test@example.invalid',p_message=>'Rollback-only pricing verification',
      p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>'FrankiHolzGuest75');
    raise exception 'Under-minimum booking was accepted';
  exception when others then
    if sqlerrm <> 'The discounted booking total must be at least EUR 0.50' then raise; end if;
  end;
  if (select count(*) from public.frankiholz_bookings) <> before_count then
    raise exception 'Failed promo left a booking behind';
  end if;
  select * into b from public.frankiholz_create_booking_with_promo(room,arrival,arrival+4,
    'Promo rollback test','promo-test@example.invalid',p_message=>'Rollback-only pricing verification',
    p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>'FrankiHolzGuest75');
  select * into stored from public.frankiholz_bookings where reference=b.reference;
  if stored.total_price <> b.total_price or stored.total_price <> q.total_price or
     stored.promo_code <> 'FrankiHolzGuest75' or stored.promo_discount_percent <> 75 or
     stored.original_total_price <> q.original_total_price or stored.payment_status <> 'not_started' then
    raise exception 'Stored booking discount is inconsistent';
  end if;
  if has_function_privilege('anon','private.frankiholz_promo_percent(text)','execute') or
     not has_function_privilege('anon','public.frankiholz_quote_with_promo(uuid,date,date,text)','execute') then
    raise exception 'Promo function privileges incorrect';
  end if;
end;
$$;
-- Exercise the public APIs as an actual guest role, not just their owner.
set local role anon;
select total_price, discount_percent from public.frankiholz_quote_with_promo(
  '2facc875-9470-4b12-9b28-cd65b7360b14',current_date+400,current_date+404,'FrankiHolzGuest50');
select * from public.frankiholz_create_booking_with_promo(
  '2facc875-9470-4b12-9b28-cd65b7360b14',current_date+400,current_date+404,
  'Anonymous promo test','promo-test@example.invalid',p_message=>'Rollback-only anonymous pricing verification',
  p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English'],p_promo_code=>'FrankiHolzGuest50');
reset role;
select 'Promo quote, booking snapshot, invalid code, minimum and rollback checks passed' as verification;
