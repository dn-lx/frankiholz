# FrankiHolz guest booking workflow

Last updated: 2026-09-22

## Current guest journey

1. **Choose room and dates.** FrankiHolz combines its calendar, confirmed bookings and imported Airbnb/iCal blocks.
2. **Calculate the stay total.** The server-side pricing RPC returns the current total.
3. **Create the booking request.** The public site uses `frankiholz_create_booking_v2`, which records the guest profile and `payment_schedule_version = v2_14_day`.
4. **Save a card with Stripe.** Stripe Checkout runs in setup mode. No money is charged.
5. **Card setup completes.** The Stripe webhook records the Customer, SetupIntent and PaymentMethod, then sets `payment_status = payment_method_saved`.
6. **Host reviews the request.** The booking remains pending until FrankiHolz confirms or rejects it.
7. **Host confirms.**
   - More than 14 days before check-in: status becomes `confirmed / scheduled_charge`; the room dates become booked.
   - Within 14 days of check-in: the saved card is charged immediately and the booking becomes `confirmed / paid`.
8. **Scheduled charge.** A server-side scheduled job charges confirmed `scheduled_charge` bookings when `charge_due_at` is reached.
9. **Host rejects.** An unconfirmed v2 request is closed without charging the guest.
10. **Guest checks status.** `frankiholz_booking_status_v3` returns booking status, payment status, scheduled charge date, cancellation eligibility and payment environment.
11. **Guest cancels.** `frankiholz-cancel-booking-v2` applies the 14-day policy using the booking's stored test/live payment mode.

## Payment states

- `not_started` — booking exists, card setup has not started.
- `awaiting_payment` — Stripe card-setup Checkout is open.
- `payment_method_saved` — card is saved; host decision is pending.
- `scheduled_charge` — booking confirmed; charge is scheduled for 14 days before check-in.
- `paid` — payment completed.
- `failed` — automatic/off-session payment failed and needs follow-up.
- `released` — uncharged request/payment method was released.
- `refunded` — a paid booking was refunded.
- `expired` — legacy/expired payment state retained for compatibility.

## Cancellation policy

- **More than 14 days before check-in:** full refund if already paid; otherwise no charge.
- **Within 14 days:** confirmed bookings are non-refundable. If a confirmed booking has not yet been charged, the cancellation endpoint attempts the outstanding charge before closing it.
- Pending/unconfirmed requests can be rejected or cancelled without a booking charge.
- If a guest cancels while Stripe card setup is still open, FrankiHolz expires that Checkout session and clears the payment URL/deadline. The TEST webhook also refuses to turn a cancelled booking back into `payment_method_saved` if a late completion event arrives.

## Environment rules

- The Admin TEST/LIVE selector controls new production-site payment setup.
- Netlify develop/branch previews are forced to Stripe TEST mode.
- Existing bookings keep their own `payment_mode`; switching the global environment does not migrate an existing booking from test to live or vice versa.

## Legacy path

Pre-v2 bookings may still contain the old 48-hour manual-capture state. Server compatibility remains for those records only. The active public and Admin interfaces no longer present that lifecycle.


## Admin cleanup

The Bookings tab supports multi-select permanent cleanup for old closed/test records.

A booking is deletable only when all of these are true:
- `status = cancelled`;
- payment status is neither `paid` nor `refunded`;
- no saved Stripe payment method remains.

The browser shows selection controls only for eligible rows, and the authenticated Edge Function `frankiholz-admin-delete-bookings` re-checks the rule server-side. Before deletion it clears any booking-linked calendar rows back to available. Booking-specific email-event rows cascade-delete; Stripe payment-event ledger rows are retained with `booking_id = null` for audit history. Received messages already stored in FrankiFlow Mail are not deleted.
