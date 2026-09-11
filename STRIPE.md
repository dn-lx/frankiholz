# FrankiHolz production Stripe setup

FrankiHolz uses Stripe Checkout with **manual card capture**. The guest authorizes the booking amount first; FrankiHolz captures that authorization only after the host accepts the booking.

## Production components

- Guest Checkout creation: `frankiholz-create-authorization`
- Stripe webhook: `frankiholz-stripe-webhook`
- Admin accept/reject action: `frankiholz-booking-decision`
- Automatic 48-hour release: `frankiholz-expire-authorizations`
- Guest/admin lifecycle email: `frankiholz-guest-email`

Production webhook endpoint:

```text
https://bdeajozhylypiidrldka.supabase.co/functions/v1/frankiholz-stripe-webhook
```

Enabled production events:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## Payment model

Checkout is created with:

```text
mode = payment
payment_method_types = card
payment_intent_data.capture_method = manual
```

After successful Checkout, Stripe leaves the PaymentIntent in `requires_capture`. FrankiHolz records the authorization, blocks the selected dates and starts a fixed 48-hour host-decision window.

- **Accept:** capture the PaymentIntent, mark booking paid/confirmed, mark dates booked.
- **Reject:** cancel the uncaptured PaymentIntent, mark authorization released, free the dates.
- **No decision in 48h:** scheduled expiry cancels the authorization and frees the dates automatically.

## Secrets

Production secrets stay in Supabase Edge Function secrets and must never be committed to GitHub or exposed to the browser:

```text
STRIPE_SECRET_KEY=<FrankiHolz live secret key>
STRIPE_WEBHOOK_SECRET=<production webhook signing secret>
FRANKIHOLZ_SITE_URL=https://accommodation.frankiflow.de
```

The sandbox uses separate secrets:

```text
STRIPE_TEST_SECRET_KEY=<FrankiHolz sandbox secret key>
STRIPE_TEST_WEBHOOK_SECRET=<sandbox webhook signing secret>
```

Do not swap test secrets into the production secret names.

## Language handling

Checkout uses `frankiholz_bookings.language`. German bookings open Stripe Checkout in German and return to German FrankiHolz pages; English bookings use English.

## Guest communication

The website and emails must describe the first Stripe step as an **authorization**, not an immediate charge. The guest is charged only after the host accepts. If rejected or not confirmed within 48 hours, the authorization is cancelled. A bank can continue showing a released authorization as pending for a short period.

## Production verification

Before relying on the workflow for real guests, verify in Stripe and FrankiHolz that:

1. Checkout creates a PaymentIntent with manual capture.
2. After guest authorization, the PaymentIntent is `requires_capture`.
3. FrankiHolz booking is still pending and `payment_status = authorized`.
4. Calendar dates are held as blocked.
5. Admin acceptance captures the same PaymentIntent and changes the booking to paid/confirmed.
6. Admin rejection cancels the PaymentIntent and releases the dates.
7. The 48-hour expiry process releases overdue authorizations.
8. Guest lifecycle email records are created for authorization, confirmation, rejection and expiry.
