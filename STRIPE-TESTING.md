# FrankiHolz Stripe TEST-mode verification

Last updated: 2026-09-22

FrankiHolz has a separate Stripe TEST path using the same v2 saved-card and scheduled-charge lifecycle as live mode. Test mode never uses real money.

## Test infrastructure

Required Supabase secrets:

```text
STRIPE_TEST_SECRET_KEY
STRIPE_TEST_WEBHOOK_SECRET
```

Test webhook endpoint:

```text
https://bdeajozhylypiidrldka.supabase.co/functions/v1/frankiholz-stripe-webhook-test
```

Develop/branch Netlify hosts are forced to test mode even if the shared Admin environment is later changed to LIVE.

## End-to-end test

1. Open the develop branch deployment.
2. Select available far-future dates.
3. Submit a booking with valid guest/profile fields.
4. Confirm the created booking has `payment_schedule_version = v2_14_day`.
5. Confirm Stripe Checkout is a `cs_test_...` session with `mode = setup`.
6. Complete card setup with Stripe test card `4242 4242 4242 4242`, any future expiry and any CVC.
7. Verify webhook processing changes the booking to:
   - `payment_mode = test`
   - `payment_status = payment_method_saved`
   - a saved `stripe_customer_id`, `stripe_setup_intent_id` and `stripe_payment_method_id`
8. In Admin, confirm the request. For a stay more than 14 days away, verify:
   - `status = confirmed`
   - `payment_status = scheduled_charge`
   - `charge_due_at` is 14 days before check-in
   - calendar dates are `booked`
9. For a separate within-14-days test, confirm that host acceptance produces a Stripe test PaymentIntent and `payment_status = paid`.
10. Test cancellation:
   - more than 14 days before check-in → no charge or full test refund;
   - within 14 days for a confirmed booking → non-refundable behavior.
11. Verify `frankiholz_test_payment_events` receives Stripe test webhook events and no live Stripe objects are created.

## Safety rules

- Use far-future dates that are not needed by real guests.
- Clean up test bookings after verification.
- Check `payment_mode = test` before exercising any payment action.
- Never put test keys into the live secret names.
- Do not switch LIVE until the develop branch test is complete.
