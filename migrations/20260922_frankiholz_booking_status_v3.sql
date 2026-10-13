create or replace function public.frankiholz_booking_status_v3(p_reference text, p_email text)
returns table(
  reference text,
  room_name text,
  check_in date,
  check_out date,
  total_price numeric,
  booking_status text,
  payment_status text,
  charge_due_at timestamptz,
  payment_url text,
  cancel_refund_eligible boolean,
  payment_mode text,
  payment_schedule_version text
)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
begin
  return query
  select
    b.reference,
    case when b.language='de' then coalesce(r.name_de,r.name) else r.name end,
    b.check_in,
    b.check_out,
    b.total_price,
    b.status,
    b.payment_status,
    b.charge_due_at,
    case when b.payment_status='awaiting_payment' then coalesce(b.stripe_checkout_url,b.stripe_hosted_invoice_url) else null end,
    (b.check_in > current_date + 14),
    b.payment_mode,
    b.payment_schedule_version
  from public.frankiholz_bookings b
  join public.frankiholz_rooms r on r.id=b.room_id
  where upper(b.reference)=upper(trim(p_reference))
    and lower(b.guest_email)=lower(trim(p_email))
  limit 1;
end;
$$;
