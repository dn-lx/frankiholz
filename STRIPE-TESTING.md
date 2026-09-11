# FrankiHolz Stripe sandbox testing

FrankiHolz has a dedicated Stripe sandbox path that runs the **same authorization → 48-hour hold → host accept/reject** state machine as production without charging real money.

## Sandbox account and webhook

Use the **FrankiHolz sandbox** Stripe account.

Sandbox webhook endpoint:

```text
https://bdeajozhylypiidrldka.supabase.co/functions/v1/frankiholz-stripe-webhook-test
```

Enabled sandbox events:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Required Supabase secrets:

```text
STRIPE_TEST_SECRET_KEY
STRIPE_TEST_WEBHOOK_SECRET
```

Production secrets remain separate:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

## Starting sandbox mode

Open the normal FrankiHolz website with the hidden test flag:

```text
https://accommodation.frankiflow.de/?lang=en&stripe_test=1
```

or German:

```text
https://accommodation.frankiflow.de/?lang=de&stripe_test=1
```

The public booking UI remains the same, but the authorization Checkout is created through `frankiholz-create-authorization-test` and the booking is marked `payment_mode = test`.

## End-to-end sandbox workflow

1. Select an available room and dates.
2. Enter guest details and continue to Stripe.
3. Complete the sandbox Checkout with a Stripe test card.
4. Stripe authorizes the amount with manual capture. No real money is charged.
5. The sandbox webhook changes the booking to `payment_status = authorized`, leaves `status = pending`, sets a 48-hour decision deadline and blocks the selected dates.
6. FrankiHolz Admin shows a **TEST** badge and the same production decision controls:
   - **Accept & capture payment**
   - **Reject & release authorization**
7. Accept captures the sandbox PaymentIntent and confirms the booking.
8. Reject cancels the sandbox authorization and releases the dates.
9. If neither action occurs within 48 hours, the scheduled expiry function cancels the authorization and releases the dates automatically.

## Standard successful test card

```text
4242 4242 4242 4242
```

Use any future expiry date and any three-digit CVC.

## Testing rules

- Use far-future dates that are not needed by real guests.
- Sandbox bookings still exercise the real FrankiHolz booking/calendar state machine, so clean them up after testing.
- `payment_mode = test` is the authoritative marker that no real money is involved.
- Sandbox lifecycle emails include a `[TEST]` prefix after the booking has been marked as test mode.
- Never replace production Stripe secrets with sandbox values.

## What to verify

A complete sandbox test should confirm:

- Stripe Checkout session is test mode (`cs_test_...`).
- PaymentIntent reaches `requires_capture` after card authorization.
- Booking becomes pending + authorized.
- Dates become blocked for other guests.
- Host decision deadline is approximately 48 hours after authorization.
- Accept captures the PaymentIntent and changes dates to booked.
- Reject cancels the PaymentIntent and reopens dates.
- Automatic expiry cancels overdue authorizations and reopens dates.
- Guest email events are written for authorization and the final decision.
- Stripe test webhook events are recorded in `frankiholz_test_payment_events`.
