# FrankiHolz Stripe sandbox testing

FrankiHolz has a separate Stripe sandbox path for testing the booking payment experience without charging real money or changing the real booking/calendar state.

## Stripe account

Use the **FrankiHolz sandbox** Stripe account only.

The sandbox webhook endpoint is:

```text
https://bdeajozhylypiidrldka.supabase.co/functions/v1/frankiholz-stripe-webhook-test
```

It listens for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

## One-time Supabase secret setup

The sandbox payment functions intentionally use different secret names from production.

In the Supabase project **FrankiFlow & FrankiHolz Backend**, add these Edge Function secrets:

```text
STRIPE_TEST_SECRET_KEY=<FrankiHolz sandbox sk_test key>
STRIPE_TEST_WEBHOOK_SECRET=<signing secret for the sandbox webhook endpoint>
```

Do **not** replace or edit the production secrets:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

The production and sandbox paths are isolated from each other.

## Sandbox guest/admin workflow

1. A guest submits a normal FrankiHolz booking request on the public website.
2. The booking appears in FrankiHolz Admin → **Bookings** as a normal request.
3. Under the booking row, the admin can use the separate **Stripe Sandbox** controls and click **Create TEST payment**.
4. FrankiHolz calls the isolated Edge Function `frankiholz-create-payment-test`.
5. Stripe creates a `cs_test_...` hosted Checkout Session for the booking's current total in EUR.
6. The test session is stored only in the booking's `stripe_test_*` / `test_payment_*` fields.
7. The guest/tester completes Stripe Checkout with Stripe test payment details.
8. Stripe sends the result to `frankiholz-stripe-webhook-test`.
9. The webhook updates only the **TEST payment status** (`paid`, `failed`, or `expired`).
10. The admin can see the TEST status in the booking row. The tester can also use `/booking-status-test` with the booking reference and email.
11. A successful test returns to `/payment-success-test`.

## What sandbox testing does NOT do

Sandbox testing does **not**:

- charge real money,
- change the real `payment_status`,
- change the real booking approval status,
- reserve or release room dates,
- send the normal production payment-confirmation lifecycle email,
- alter the production Stripe configuration.

This separation allows the payment UI and webhook handling to be tested safely against real-looking booking data.

## Production workflow remains separate

The existing production button **Approve & create payment** still uses `frankiholz-create-payment` and the live FrankiHolz Stripe configuration. Production approval creates the real payment hold, blocks the dates during the payment window and, after a successful live payment, keeps the booking confirmed and the dates booked.

## Stripe test card

For a standard successful card payment in Stripe test mode, use:

```text
4242 4242 4242 4242
```

Use any future expiry date and any three-digit CVC.

## Test pages

- Sandbox status: `https://accommodation.frankiflow.de/booking-status-test`
- Sandbox success: `https://accommodation.frankiflow.de/payment-success-test`

These pages are marked `noindex,nofollow` and clearly identify the transaction as TEST mode.
