# FrankiHolz guest booking workflow

Last updated: 2026-09-11

## Production guest journey

1. **Guest chooses a room and dates.** The public calendar combines FrankiHolz availability, active holds, confirmed bookings and imported Airbnb iCal blocks.
2. **FrankiHolz calculates the stay total.** Dynamic pricing is applied before the booking request is created.
3. **Guest enters their details and continues to Stripe.** FrankiHolz creates a booking reference such as `FH-XXXXXXXX`, then opens a Stripe-hosted Checkout page.
4. **Stripe authorizes the card instead of charging it immediately.** Checkout uses a PaymentIntent with `capture_method = manual`. Only card payments are offered for this workflow.
5. **Successful authorization places the booking on hold.** The booking remains `status = pending`, changes to `payment_status = authorized`, and the selected dates become unavailable with a temporary `blocked` calendar status.
6. **The host has 48 hours to decide.** The guest is told that the card is authorized but not charged. `payment_due_at` is the host-decision deadline.
7. **Admin accepts or rejects the held request.** FrankiHolz Admin → Bookings shows two actions for an authorized booking:
   - **Accept & capture payment**
   - **Reject & release authorization**
8. **Accept captures the authorized amount.** Stripe captures the existing PaymentIntent. FrankiHolz changes the booking to `confirmed` / `paid`, and the calendar dates become `booked`.
9. **Reject releases the authorization.** Stripe cancels the PaymentIntent before capture. FrankiHolz closes the request, changes payment status to `released`, and makes the dates available again.
10. **No response within 48 hours is handled automatically.** A scheduled expiry job checks every 15 minutes. Overdue authorizations are cancelled in Stripe, the booking becomes `expired`, and the dates are released.
11. **Guest can check status at any time.** The booking-status page accepts the booking reference and guest email and shows whether card authorization is incomplete, the request is on hold, confirmed/paid, rejected/released, or expired.

## Email lifecycle

The guest email flow uses these events:

- `request_received` — booking request was created and Stripe authorization still needs to be completed.
- `authorization_received` — card authorization succeeded; dates are held and the host has up to 48 hours to decide.
- `booking_confirmed` — host accepted and the authorized amount was captured.
- `booking_rejected` — host rejected and the authorization was released without a charge.
- `authorization_expired` — no host decision was made within 48 hours; the authorization was released automatically.

The admin notification for a newly authorized booking is sent when `authorization_received` is processed so the host knows a 48-hour decision is required.

## Important operational behavior

- Creating a booking reference by itself does **not** hold a room.
- The room is held only after Stripe confirms the card authorization.
- A held request is still pending host approval and is not a confirmed reservation.
- The guest is charged only after the host accepts and Stripe capture succeeds.
- Rejection normally cancels an uncaptured authorization; it is not a normal refund because the charge was never captured.
- Banks can continue to display a released card authorization as pending for a short period after cancellation.
- Confirmed/paid bookings remain blocked as `booked`.
- Live and sandbox Stripe webhooks use the same state machine, but sandbox transactions use Stripe test money and are clearly marked with `payment_mode = test`.

## Automatic 48-hour release

Supabase schedules `frankiholz-expire-authorizations` every 15 minutes using `pg_cron` and `pg_net`. The function searches only for bookings with `payment_status = authorized` and an expired `payment_due_at`, cancels the corresponding live or test PaymentIntent, releases the calendar hold and triggers the guest expiry email.
