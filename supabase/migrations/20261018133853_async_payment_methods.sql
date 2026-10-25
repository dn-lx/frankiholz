begin;
alter table public.frankiholz_bookings
  add column payment_collection_mode text not null default 'saved_method'
    check (payment_collection_mode in ('saved_method','bank_transfer')),
  add column payment_operation_token uuid,
  add column payment_operation_started_at timestamptz,
  add column bank_transfer_review_required boolean not null default false,
  add column refund_review_required boolean not null default false,
  add column stripe_refund_id text;
alter table public.frankiholz_bookings drop constraint frankiholz_bookings_payment_status_check;
alter table public.frankiholz_bookings add constraint frankiholz_bookings_payment_status_check
  check (payment_status in ('not_started','awaiting_payment','authorized','payment_method_saved','scheduled_charge','processing','paid','failed','expired','released','refunded'));

-- Service-only lease. Never automatically expire an uncertain Stripe operation:
-- an owner must reconcile it before another operation can move money.
create function public.frankiholz_claim_payment_operation(p_booking_id uuid,p_operation text)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare b public.frankiholz_bookings; operation_id uuid := gen_random_uuid();
begin
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found or b.payment_operation_token is not null or b.status='cancelled' then
    raise exception 'Payment operation unavailable; please contact FrankiHolz';
  end if;
  if p_operation='charge' then
    if b.status<>'confirmed' or b.payment_collection_mode<>'saved_method'
      or b.payment_status not in ('payment_method_saved','scheduled_charge','failed') then
      raise exception 'Booking cannot be charged';
    end if;
  elsif p_operation='setup' then
    if b.status<>'pending' or b.payment_status not in ('not_started','awaiting_payment','expired','failed')
      or b.stripe_payment_intent_id is not null or b.stripe_payment_method_id is not null then
      raise exception 'An existing payment must be reconciled first';
    end if;
  elsif p_operation='accept' then
    if b.payment_status not in ('payment_method_saved','scheduled_charge','paid')
      or (b.payment_collection_mode='bank_transfer' and b.payment_status<>'paid') then
      raise exception 'Guest payment is not ready for host approval';
    end if;
  elsif p_operation='cancel' then
    if b.payment_status='processing' then raise exception 'Payment is processing; wait for settlement before cancelling'; end if;
  else raise exception 'Invalid payment operation'; end if;
  update public.frankiholz_bookings set payment_operation_token=operation_id,
    payment_operation_started_at=now(),
    payment_status=case when p_operation='charge' then 'processing' else payment_status end
    where id=b.id;
  return jsonb_build_object('booking',to_jsonb(b),'token',operation_id);
end $$;
revoke all on function public.frankiholz_claim_payment_operation(uuid,text) from public,anon,authenticated;
grant execute on function public.frankiholz_claim_payment_operation(uuid,text) to service_role;

create function public.frankiholz_confirm_payment_booking(p_booking_id uuid,p_operation_token uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.frankiholz_bookings;
begin
  select * into b from public.frankiholz_bookings where id=p_booking_id for update;
  if not found or b.payment_operation_token is distinct from p_operation_token
    or b.status='cancelled' then raise exception 'Booking confirmation unavailable'; end if;
  if b.status='confirmed' then return; end if;
  perform 1 from public.frankiholz_rooms where id=b.room_id for update;
  if exists(select 1 from public.frankiholz_calendar where room_id=b.room_id
      and date>=b.check_in and date<b.check_out and not is_available
      and booking_id is distinct from b.id) then
    raise exception 'Dates are no longer available; reject and refund this request';
  end if;
  if b.payment_status not in ('payment_method_saved','paid') then raise exception 'Payment not ready'; end if;
  update public.frankiholz_bookings set status='confirmed',approved_at=now(),
    payment_status=case when b.payment_status='paid' then 'paid' else 'scheduled_charge' end,
    updated_at=now() where id=b.id;
  insert into public.frankiholz_calendar(room_id,date,is_available,availability_status,booking_id,updated_at)
    select b.room_id,d::date,false,'booked',b.id,now()
    from generate_series(b.check_in::timestamp,(b.check_out-1)::timestamp,interval '1 day') d
    on conflict(room_id,date) do update set is_available=false,availability_status='booked',booking_id=excluded.booking_id,updated_at=now();
end $$;
revoke all on function public.frankiholz_confirm_payment_booking(uuid,uuid) from public,anon,authenticated;
grant execute on function public.frankiholz_confirm_payment_booking(uuid,uuid) to service_role;

update public.frankiholz_copy set
  text_en=case copy_key when 'fhCheckIn' then 'Check-in: From 17:00 on your arrival date.' else 'Check-out: By 11:00 on your departure date (the following day for a one-night stay).' end,
  text_de=case copy_key when 'fhCheckIn' then 'Check-in: Ab 17:00 Uhr am Anreisetag.' else 'Check-out: Bis 11:00 Uhr am Abreisetag (bei einer Übernachtung am folgenden Tag).' end,
  updated_at=now()
where copy_key in ('fhCheckIn','fhCheckOut');
commit;
