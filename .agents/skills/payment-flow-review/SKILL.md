---
name: payment-flow-review
description: Review FrankiHolz Stripe authorization, capture, cancellation, retry and webhook changes without exercising live payments.
---

# Payment flow review

Map each booking and payment state transition, including retries and duplicate events. Verify that the server owns amounts, currency, capture and cancellation decisions.

- Confirm webhook signatures and idempotency are enforced server-side.
- Check that repeated callbacks cannot double-capture or corrupt a booking.
- Verify failure, abandonment, cancellation and delayed-notification paths.
- Ensure browser code never receives secret keys and cannot choose an authoritative amount.
- Use Stripe test mode and mocked callbacks unless live testing is explicitly authorized.
- Confirm logs and analytics omit payment details and unnecessary guest data.
