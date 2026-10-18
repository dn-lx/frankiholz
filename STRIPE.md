# FrankiHolz Stripe payment model

Last updated: 2026-10-18

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

Both updated public sites read `frankiholz_get_payment_environment` and honor the authenticated Admin TEST/LIVE setting. There is **one shared setting** in the shared Supabase project: it affects new checkouts on both updated `develop` and production, not two independent environments. The development website no longer forcibly runs TEST. At the owner's explicit request, guest LIVE checkout uses the normal form flow without a development-only LIVE warning banner or a browser prompt requiring the word `LIVE`. The non-blocking TEST notice, configuration-error handling and standard charge-timing disclosure remain. Public `?test=1` / `?stripe_test=1` query parameters do not override the Admin setting. Existing card-authorized bookings retain their stored `payment_mode`.

**Rollout note:** Production `main` is still on an older frontend that may not yet honor this shared selector. Do not claim both public sites support the updated mode switch until the separately approved `develop → main` frontend release. The live Stripe Checkout Edge Function uses the initiating allowlisted site URL for new-session return pages, so successful LIVE setup begun on `develop` comes back to `develop`. Existing previously created Checkout sessions retain their original return URLs.

The Admin integrations tab loads `assets/payment-environment-admin.js` and shows the TEST/LIVE selector. The payment-environment setting is stored in `public.frankiholz_payment_settings`. Removing the guest prompt does not remove Admin authentication or the Admin confirmation when changing the shared mode to LIVE, and does not bypass any Stripe card verification or authentication.

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


## Payment page and immediate transfers

The guest form creates the pending request and navigates to /payment.html. Payment choices live there rather than in a booking-form dropdown. The saved-method action opens Stripe’s hosted chooser; eligible cards, wallets and SEPA Direct Debit remain governed by Stripe. Card setup stores payment details and does not hold funds. EUR/SEPA transfers instead open Stripe’s hosted bank instructions immediately, before host approval. Only settled funds mark the request paid; host approval separately confirms the stay.

Payment context uses the existing reference/email authorization through frankiholz_payment_details. The email stays in tab-scoped session storage with an explicit lookup fallback, never in the page URL. The server snapshots the new booking environment; existing initialized test bookings are never converted to live. New-booking mode remains controlled by the authenticated Admin setting. The page rechecks the environment and the server owns amounts, currency and financial state.
