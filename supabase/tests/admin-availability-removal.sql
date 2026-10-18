-- Run after the migration in the same transaction; always finish with ROLLBACK.
do $$
declare room uuid; req record; bid uuid; another record; op jsonb; arrival date:=current_date+700; admin_email text; n integer;
begin
 select id into room from public.frankiholz_rooms where active order by id limit 1;
 select email into admin_email from public.frankiholz_admin_users limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('email',admin_email,'role','authenticated')::text,true);
 select * into req from public.frankiholz_create_booking_v2(room,arrival,arrival+2,'SQL rollback fixture','rollback@example.invalid',p_message=>'Rollback only, no payment or email',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English']);
 select id into bid from public.frankiholz_bookings where reference=req.reference;
 update public.frankiholz_bookings set payment_status='payment_method_saved' where id=bid;
 op:=public.frankiholz_claim_payment_operation(bid,'accept');
 perform public.frankiholz_confirm_payment_booking(bid,(op->>'token')::uuid);
 if not private.frankiholz_night_unavailable(room,arrival) then raise exception 'Confirmed booking must block night'; end if;
 n:=public.frankiholz_set_calendar_range(room,arrival,arrival,'available');
 if n<>1 or private.frankiholz_night_unavailable(room,arrival) then raise exception 'Admin failed to reopen booked night'; end if;
 if not private.frankiholz_night_unavailable(room,arrival+1) then raise exception 'Override leaked into adjacent booked night'; end if;
 if not (select available from public.frankiholz_estimate_total(room,arrival,arrival+1)) then raise exception 'Quote still blocked'; end if;
 if not (select is_available from public.frankiholz_get_calendar_rates(room,arrival,arrival)) then raise exception 'Public calendar still blocked'; end if;
 insert into public.frankiholz_ical_blocks(room_id,date) values(room,arrival) on conflict do nothing;
 if private.frankiholz_night_unavailable(room,arrival) then raise exception 'Import overrides admin'; end if;
 select * into another from public.frankiholz_create_booking_v2(room,arrival,arrival+1,'New rollback fixture','rollback2@example.invalid',p_message=>'Rollback replacement request only',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English']);
 update public.frankiholz_bookings set payment_status='payment_method_saved' where reference=another.reference;
 op:=public.frankiholz_claim_payment_operation((select id from public.frankiholz_bookings where reference=another.reference),'accept');
 perform public.frankiholz_confirm_payment_booking((select id from public.frankiholz_bookings where reference=another.reference),(op->>'token')::uuid);
 if not private.frankiholz_night_unavailable(room,arrival) then raise exception 'New confirmation failed to reserve night'; end if;
 begin
  perform public.frankiholz_create_booking_v2(room,arrival,arrival+1,'Conflict rollback fixture','rollback3@example.invalid',p_message=>'This overlapping request must fail',p_guest_age=>30,p_guest_sex=>'prefer_not_to_say',p_guest_languages=>array['English']);
  raise exception 'Third overlapping request permitted';
 exception when others then if sqlerrm<>'One or more selected dates are unavailable' then raise; end if; end;
 update public.frankiholz_bookings set status='cancelled' where reference=another.reference;
 update public.frankiholz_calendar set booking_id=null,is_available=true,availability_status='available'
 where booking_id=(select id from public.frankiholz_bookings where reference=another.reference);
 if not private.frankiholz_night_unavailable(room,arrival) then raise exception 'Original confirmed reservation protection lost after replacement cancellation'; end if;
 if (select status from public.frankiholz_bookings where id=bid)<>'confirmed' then raise exception 'Original reservation modified'; end if;
 perform public.frankiholz_admin_remove_requests(array[bid]);
 if (select admin_deleted_at is null from public.frankiholz_bookings where id=bid) then raise exception 'Request removal failed'; end if;
 if (select status from public.frankiholz_bookings where id=bid)<>'confirmed' then raise exception 'Removal cancelled reservation'; end if;
 perform public.frankiholz_admin_remove_requests(array[bid],true);
 if (select admin_deleted_at is not null from public.frankiholz_bookings where id=bid) then raise exception 'Restore failed'; end if;
 if public.frankiholz_payment_details(req.reference,'wrong@example.invalid') is not null then raise exception 'Payment details leaked'; end if;
 if public.frankiholz_payment_details(req.reference,'rollback@example.invalid')->>'payment_mode'<>public.frankiholz_get_payment_environment() then raise exception 'Environment snapshot incorrect'; end if;
 perform set_config('request.jwt.claims','{"email":"not-admin@example.invalid","role":"authenticated"}',true);
 begin
  perform public.frankiholz_set_calendar_range(room,arrival,arrival,'available');
  raise exception 'Nonadmin override permitted';
 exception when others then if sqlerrm<>'Not authorized' then raise; end if; end;
 begin
  perform public.frankiholz_admin_remove_requests(array[bid]);
  raise exception 'Nonadmin removal permitted';
 exception when others then if sqlerrm<>'Not authorized' then raise; end if; end;
 if has_function_privilege('anon','public.frankiholz_admin_remove_requests(uuid[],boolean)','execute') then raise exception 'Anon removal grant'; end if;
end $$;
select 'Override, quote, booking, approval, import, restore and authorization assertions passed; all changes rolled back' as verification;
