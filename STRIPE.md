# FrankiHolz Stripe payment model

Last updated: 2026-09-22

FrankiHolz uses a **saved-card / scheduled-charge** model for new bookings.

## Current v2 flow

1. The guest creates a booking request.
2. FrankiHolz creates the request with `payment_schedule_version = v2_14_day`.
3. Stripe Checkout opens in **setup mode** and securely saves a card. No charge is made at this step.
4. The Stripe webhook stores the saved payment method and changes the booking to `payment_status = payment_method_saved`.
5. The host reviews the request in FrankiHolz Admin.
6. If the host confirms:
   - when check-in is more than 14 days away, the booking becomes `confirmed / scheduled_charge` and is charged automatically 14 days before check-in;
   - when check-in is already within 14 days, the saved card is charged immediately after confirmation.
7. If the host rejects an unconfirmed request, the saved payment method is detached and the booking is closed without a charge.
8. Guest cancellation more than 14 days before check-in is fully refundable. Within 14 days, confirmed bookings are non-refundable.

## Stripe environments

FrankiHolz keeps test and live credentials separate in Supabase Edge Function secrets:

```text
STRIPE_TEST_SECRET_KEY
STRIPE_TEST_WEBHOOK_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

The public site reads the configured payment environment through `frankiholz_get_payment_environment`. Netlify branch/develop hosts are additionally forced to Stripe TEST mode in browser code so a develop preview cannot open a live Checkout session.

The Admin integrations tab loads `assets/payment-environment-admin.js` and shows the TEST/LIVE selector. The payment-environment setting is stored in `public.frankiholz_payment_settings`.

## Current server components

- Test card setup: `frankiholz-create-authorization-test`
- Live card setup: `frankiholz-create-authorization-v2`
- Test webhook: `frankiholz-stripe-webhook-test`
- Live webhook: `frankiholz-stripe-webhook`
- Host accept/reject: `frankiholz-booking-decision`
- Scheduled test charge: `frankiholz-charge-due-test`
- Scheduled live charge: `frankiholz-charge-due`
- Unified v2 guest cancellation: `frankiholz-cancel-booking-v2`
- Guest/admin lifecycle email: `frankiholz-guest-email`
- Public v2 status: `frankiholz_booking_status_v3`

## Webhook events

The test and live webhooks listen only to the payment events required by FrankiHolz:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.amount_capturable_updated` (legacy compatibility)
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Webhook signatures are verified server-side and processed Stripe event IDs are stored to prevent duplicate handling.

## Legacy compatibility

Older 48-hour manual-capture bookings can still be handled by server-side compatibility logic in `frankiholz-booking-decision`. The public website and active Admin UI no longer use or describe that flow. `assets/authorization-flow.js` and `assets/admin-authorization-flow.js` are retained as inert compatibility files so stale references cannot re-enable the old browser override.

## Security

- Stripe secret keys and webhook signing secrets stay in Supabase secrets.
- Browser code receives only the public Supabase key.
- Price and charge amount remain server-owned.
- Host confirmation requires an authenticated FrankiHolz admin.
- Guest cancellation requires the matching booking reference and guest email and is executed server-side.
