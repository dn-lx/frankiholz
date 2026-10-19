# Guest booking emails

Each booking has at most two guest notification stages:

1. Payment details saved and request awaiting the host. Complimentary requests receive a truthful no-payment-required version. Ordinary unpaid requests do not receive an earlier guest email.
2. Host confirmation or rejection, including the payment state known at delivery. Confirmation retains the warm welcome, arrival-time question, WhatsApp contact and house-guide link.

Payment callbacks reuse these stages. They do not add separate receipts, scheduled-charge notifications or later guest cancellation emails. Host notifications remain separate. Historical guest deliveries count toward the two-message cap; existing messages cannot be withdrawn.

The private `frankiholz_guest_email_outbox` uses a booking-wide lease, frozen provider payload and a stable Resend idempotency key. A sending worker drains a queued host decision after the request email. Unprepared stale request emails are skipped after the host has already decided.

The authenticated `action: drain` path on `frankiholz-guest-email` retries pending/expired work every five minutes using the existing scheduler credential. It processes at most four bookings per invocation, stops starting work after 40 seconds, and never calls Stripe. The job only invokes the function when there is retryable work.

Resend retains idempotency keys for [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys). After 23 hours from the first prepared provider attempt, uncertain deliveries and remaining work for that booking enter `needs_review`. They must be reconciled with the provider before any manual recovery; never clear the marker and resend blindly. This favors avoiding duplicate guest emails over an unsafe automatic replay. Inspect using a privileged operator connection:

```sql
select booking_id, stage, state, first_attempt_at, provider_message_id
from public.frankiholz_guest_email_outbox
where state = 'needs_review';
```

The table and delivery RPCs are service-only. The retry action accepts only the service bearer or existing private scheduler secret, never guest or admin browser credentials. No provider payloads or credentials are logged.

Verification: `node --test supabase/tests/guest-email-delivery.test.mjs supabase/tests/payment-methods.test.mjs`. Rehearse the migration plus `supabase/tests/guest-email-stages.sql` inside `BEGIN` / `ROLLBACK`; this creates only transactional fixtures and never sends email.
