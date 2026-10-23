# Backend closure and setup recovery rollout

These source changes do not deploy Supabase functions or activate booking v2. Keep the current v2 pause and existing payment environment unchanged.

## Required order

1. In an isolated database with the current FrankiHolz baseline, apply `supabase/migrations/20261023120000_backend_recovery_notifications.sql`. It requires the existing bookings/rooms/calendar tables, `frankiholz_guest_email_outbox` and its scheduled drain from `20261019082228_guest_email_stages.sql`, the service-only payment-operation/complimentary-close RPCs, and legacy `frankiholz_release_authorized_hold(uuid,text)`. Confirm that legacy RPC's deployed signature and state contract before enabling that path.
2. Inside a caller-owned `BEGIN`/`ROLLBACK`, run `supabase/tests/closure-notifications.sql`. It exercises the actual new trigger/RPCs with synthetic fixtures and an injected queue failure. Its role probe temporarily broadens grants and disables RLS under a savepoint to verify the origin guard independently, then rolls those test-only changes back. Do not run it against shared guest data or commit its fixtures. Verify the new overload/wrapper are service-only and existing RLS, status RPC outputs and two-argument complimentary-close compatibility remain intact.
3. After database verification and review, apply the migration to the intended project through the supported management connection. Do not deploy the handlers first: an unrecognized `p_event_type` overload or missing column must fail rather than discard notification origin.
4. Deploy `frankiholz-cancel-booking-v2`, `frankiholz-booking-decision`, `frankiholz-create-authorization-v2`, and `frankiholz-create-authorization-test`, including their shared helpers. Preserve existing JWT settings, secrets, mode selection, signature enforcement and the v2 pause.
5. Verify deployed sources/configuration and observe the existing email drain. Use isolated provider fixtures or an explicitly authorized controlled check; do not create real guest messages, bookings, refunds or charges during routine validation.

## Recovery behavior

A database guard rejects origin writes by anon/authenticated even with broad table grants, and prevents changing a recorded origin after closure. Closure records a server-selected `booking_cancelled`, `booking_rejected` or `authorization_expired` origin. The trigger queues the existing guest decision stage atomically with the closed status; a prior sent/frozen confirmation stage is retained, preserving the intentional two-email policy. Only an unprepared pending confirmation adopts the recorded closure event, keeping the same stage and recipient protocol. The normal email endpoint still owns recipient validation, provider keys and stage deduplication. Failed HTTP handoff returns a retryable error, and either authorized endpoint may replay only the recorded event without repeating money or calendar operations. The scheduled drain also recovers a newly queued closure if the original caller never retries.

Historical closed records have no reliable origin and are not backfilled. Their retries return `notification_recovery_required: true` without inventing an event. An owner must reconcile those records separately. No guest/status RPC definitions or grants are changed. Verify exposed response fields against the deployed status contract during rollout; the base status RPC definition is not present in this checkout.

Setup resource creation releases its operation lease only for a Stripe SDK `StripeInvalidRequestError` with HTTP 400, at the customer/session creation call boundary, without a `stripe-should-retry: true` header. This classification follows stripe-node 22.4.0 `esm/Error.js` and `esm/RequestSender.js` (the pinned SDK). Conflicts, rate limits, idempotency errors, transport failures, retry-advised responses, 5xx responses, missing returned URLs and failures after a returned session remain locked for reconciliation. Processing is never treated as paid.

The customer idempotency key is per mode/booking; the session key also includes the claimed operation token. A legitimate later setup after expiry obtains a new token/key. Unknown attempts cannot obtain a new token until an owner safely reconciles them.

## Local evidence and limits

Run `node --test supabase/tests/*.test.mjs` for actual-entrypoint/helper mocked regressions. These do not establish the deployed database, trigger, RLS or provider behavior. SQL validation results must be reported separately; source changes and a successful mocked test suite are not proof of migration application or deployment.

Rolling functions back retains the additive nullable column, trigger and overload. Older two-argument complimentary callers keep working, but their closures have no origin and therefore do not gain reliable notification recovery. Do not drop the migration while updated handlers still depend on it.
