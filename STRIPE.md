# FrankiHolz production Stripe setup

FrankiHolz uses Stripe Checkout from the Supabase Edge Function `frankiholz-create-payment`, and Stripe payment events are processed by `frankiholz-stripe-webhook`.

## Live Stripe account

The FrankiHolz live Stripe account is enabled for real charges and payouts. Card payments and SEPA Direct Debit capability are active.

The production webhook endpoint is:

```text
https://bdeajozhylypiidrldka.supabase.co/functions/v1/frankiholz-stripe-webhook
```

It receives:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

## One-time live-secret activation

The live secret values must be stored directly in Supabase Edge Function secrets. They must never be committed to GitHub or placed in browser JavaScript.

Set:

```text
STRIPE_SECRET_KEY=<FrankiHolz live sk_live key>
STRIPE_WEBHOOK_SECRET=<signing secret for the FrankiHolz production webhook>
FRANKIHOLZ_SITE_URL=https://accommodation.frankiflow.de
```

Once these secrets are live, admin approval creates a real Stripe Checkout session. The guest receives the Checkout URL through the booking-status flow (and, after transactional email is configured, by email). Stripe webhook events then mark successful payments as paid and confirmed in FrankiHolz.

## Language handling

Checkout uses the booking language stored in `frankiholz_bookings.language`. German bookings open Stripe Checkout in German and return to German FrankiHolz status pages; English bookings use English.

## Verification before accepting guests

After setting the live secrets:

1. Create one small real booking request with an email you control.
2. Approve it in FrankiHolz Admin.
3. Confirm that the Checkout URL starts with Stripe Checkout and is a **live** Checkout session, not `cs_test_...`.
4. Complete the small real payment.
5. Confirm that the booking changes to `paid` / `confirmed` after the webhook arrives.
6. Refund the small verification payment from Stripe if desired.
