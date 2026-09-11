# FrankiHolz guest booking workflow

Last verified: 2026-09-11

## Current guest journey

1. **Guest chooses a room.** The public site loads active FrankiHolz rooms, room photos and current availability.
2. **Guest chooses check-in and check-out.** The calendar is calculated from FrankiHolz availability, confirmed FrankiHolz bookings and imported Airbnb iCal blocks.
3. **FrankiHolz calculates an estimated stay total.** `frankiholz_estimate_total` validates the selected dates and applies the current dynamic-pricing rules.
4. **Guest submits the booking request.** Name and email are required; phone, country and message are optional. The request is saved with a reference such as `FH-XXXXXXXX`.
5. **The request starts as pending.** A pending request has `status = pending` and `payment_status = not_started`. Pending requests do **not** block the room dates.
6. **Admin reviews the request.** In FrankiHolz Admin → Bookings, the admin can reject it or choose **Approve & create payment**.
7. **Approval creates a temporary room hold.** Approval changes the booking to confirmed/awaiting payment, blocks the selected dates and sets a payment deadline using the configured payment-hold duration.
8. **Stripe Checkout is created for the exact booking total.** The Checkout session uses the guest email, EUR, the selected booking language and the booking/reference IDs in metadata.
9. **Guest pays through Stripe Checkout.** The payment link is available through the booking-status flow and can also be sent by the guest lifecycle email integration.
10. **Successful Stripe payment confirms the booking.** The Stripe webhook marks the booking as paid, records the payment identifiers and leaves the dates blocked as booked. A payment-confirmation email event is then triggered.
11. **Failed or expired payment releases the dates.** If the Checkout session expires or an asynchronous payment fails, the booking is closed and the temporary calendar hold is released.
12. **Guest can check status at any time.** The booking-status page accepts the booking reference and booking email and shows booking status, payment status, deadline and the payment link when payment is still due.

## Important operational behavior

- A booking request by itself does not reserve the room.
- The room becomes unavailable to other guests when the admin approves the request and the payment hold begins.
- A paid booking remains confirmed and blocked.
- A paid booking cannot be released through the normal cancel/status workflow without a refund workflow.
- If the payment deadline expires, the hold is released automatically by the payment-expiry handling.

## Verification performed on 2026-09-11

### Booking/database smoke test

A two-night Room 1 booking for 2029-03-12 → 2029-03-14 was priced at **€80.00** and reported available. A test call to `frankiholz_create_booking` successfully returned a FrankiHolz reference and the expected €80.00 total. The SQL transaction was deliberately rolled back, and a follow-up query confirmed that no test booking remained in the production database.

### Stripe test-mode evidence

The separate **FrankiHolz sandbox** Stripe account contains `cs_test_...` Checkout sessions created by the earlier FrankiHolz integration self-test. They carry the FrankiHolz booking ID/reference metadata and have correctly reached expired/unpaid state. The sandbox webhook endpoint is enabled for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

The Supabase payment-event ledger contains the corresponding sandbox `checkout.session.expired` events, showing that the test-mode webhook path processed those events.

### Current environment caveat

The production `frankiholz-create-payment` and `frankiholz-stripe-webhook` Edge Functions use one configured Stripe secret/webhook-secret pair at a time. Production is currently configured for the live FrankiHolz Stripe account. Therefore a brand-new end-to-end sandbox Checkout + current production webhook test should **not** be run by swapping production secrets. If a fully isolated recurring sandbox environment is wanted later, use a dedicated test Edge Function/secrets (or a separate Supabase test project) so production payment configuration is never changed during tests.
