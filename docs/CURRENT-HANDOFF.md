# Current Handoff

**Last updated:** 2026-09-22

## Current baseline

FrankiHolz `develop` now uses the v2 Stripe saved-card / 14-day scheduled-charge lifecycle. Production `main` has not been changed.

The repository still follows the strict release rule: feature/fix/chore -> `develop`; only approved `develop -> main` releases may touch production.

## Stripe v2 alignment completed on develop

PR #30, **Unify FrankiHolz v2 Stripe booking flow**, was squash-merged into `develop` at commit:

```text
e24ba8502c644cd106737fb6001f63c1c45a348d
```

The change:
- retired the dynamically loaded legacy 48-hour authorization browser override;
- uses `frankiholz_create_booking_v2` for new requests;
- uses Stripe Checkout setup mode to save a card without charging it;
- forces Netlify develop/branch previews to Stripe TEST mode;
- uses the configured TEST/LIVE environment on the production hostname;
- aligns the status page, payment-success page and Admin booking controls with the 14-day model;
- loads the existing Admin TEST/LIVE payment-environment control;
- keeps server-side compatibility for old pre-v2 bookings only;
- updates Stripe/booking/test documentation.

## Backend additions and external side effects

The shared Supabase project `bdeajozhylypiidrldka` has these additive v2 components:

- RPC `public.frankiholz_booking_status_v3`
- Edge Function `frankiholz-cancel-booking-v2`

The migration for the v3 status RPC is recorded in:

```text
migrations/20260922_frankiholz_booking_status_v3.sql
```

The shared `public.frankiholz_copy` payment-flow wording was updated to the saved-card / 14-day model for:
- `approvedBlock`
- `directHost`
- `submitRequest`
- `pendingNote`
- `statusLead`

The Stripe TEST and LIVE webhook endpoints exist in the new FrankiFlow Stripe account. The TEST webhook signing secret was updated in Supabase and verified with a correctly signed test event returning HTTP 200.

The current global FrankiHolz payment environment remains:

```text
TEST
```

Do not switch it to LIVE until the develop acceptance test is complete.

## Verification completed

PR checks passed:
- Browser smoke tests
- Security checks
- Lighthouse quality report
- CodeRabbit

After merge, the `develop` push checks also passed for commit `e24ba850...`:
- Browser smoke tests
- Security checks

JavaScript syntax checks passed for all modified payment-flow files.

A backend sandbox cycle passed with no real money:
1. created a v2 booking;
2. created a Stripe `cs_test_...` setup Checkout session;
3. verified v3 status returned `payment_mode = test` and `payment_schedule_version = v2_14_day`;
4. cancelled through `frankiholz-cancel-booking-v2`;
5. verified final booking state `cancelled / released`.

The TEST webhook signing secret was separately verified with a signed synthetic event.

## Remaining acceptance check

The connected Netlify API currently exposes the production deploy but does not expose a branch-deploy listing, and the agent environment cannot directly fetch `develop--frankiholz.netlify.app`. Therefore the final browser-level acceptance step still needs confirmation on the Netlify develop branch URL:

```text
https://develop--frankiholz.netlify.app
```

Use a far-future booking and Stripe test card `4242 4242 4242 4242` to verify:
- Checkout is `cs_test_...` and says the card is being saved, not charged;
- returning from Stripe shows the saved-card / 14-day wording;
- webhook changes the booking to `payment_method_saved`;
- Admin shows TEST and can confirm the booking;
- a far-future confirmation becomes `scheduled_charge` with `charge_due_at` 14 days before check-in;
- cancellation behaves according to the 14-day policy.

Do not merge `develop` into `main` until this acceptance check passes.

## Next-agent startup

1. Read `AGENTS.md`, `docs/PROJECT-MEMORY.md`, `STRIPE.md`, `BOOKING-WORKFLOW.md`, and `STRIPE-TESTING.md`.
2. Confirm `develop` is still at or ahead of `e24ba850...`.
3. Confirm the payment environment is still TEST.
4. Complete the develop browser acceptance test above.
5. Only then prepare a normal release review for `develop -> main`.


## Agent Project Starter alignment — 2026-09-22

Agent infrastructure was aligned with `dn-lx/agent-project-starter` without changing FrankiHolz runtime/payment behavior. Added model-routing and memory/context policy, MCP and memory-context skills, bootstrap guidance, agent-stack validation, stronger PR evidence, reusable templates and an agent-independent engineering ADR. Existing payment-flow/email-safety skills and stronger CI/security/release checks were preserved. `main` is not part of this change.


## Develop acceptance testing + Admin cleanup — 2026-09-22

A deeper TEST-mode acceptance pass was executed against the shared Supabase/Stripe/Resend backend while the global FrankiHolz payment environment remained `TEST`.

### Backend changes made during testing

- Added authenticated Edge Function `frankiholz-admin-delete-bookings`.
  - Requires a valid FrankiHolz admin session.
  - Accepts 1–50 selected booking IDs.
  - Permanently deletes only bookings that are already `cancelled`, are not `paid/refunded`, and have no saved Stripe payment method.
  - Clears any booking-linked calendar rows before deletion.
- Updated `frankiholz-cancel-booking-v2` to expire an open Stripe Checkout setup session after cancellation and clear the stored payment URL/deadline.
- Updated both Stripe webhooks (`frankiholz-stripe-webhook-test` and `frankiholz-stripe-webhook`) so a late v2 setup completion cannot change a cancelled booking back to `payment_method_saved`; any late saved payment method is detached.
- Added Admin multi-select cleanup controls on branch `fix/admin-delete-closed-bookings-20260922`.

### Acceptance test evidence

Disposable booking `FH-915C90A9` was created for 2034-06-10 → 2034-06-12 with internal test recipient `info@frankiflow.de`.

Verified:
1. `frankiholz_create_booking_v2` returned €86.00.
2. Request-received email endpoint returned HTTP 200.
3. Both expected messages reached FrankiFlow Mail:
   - guest-facing booking request confirmation;
   - internal admin request notification.
4. Stripe TEST Checkout created a real `cs_test_...` session with:
   - `livemode = false`;
   - `mode = setup`;
   - `payment_schedule_version = v2_14_day`;
   - correct develop success/cancel URLs;
   - explicit wording that the card is saved now and charged 14 days before check-in.
5. Repeating the setup request while still open reused the existing Checkout session rather than creating a duplicate.
6. Cancelling the pending request returned `cancelled / released`.
7. Stripe confirmed that the open TEST Checkout session became `expired`.
8. A genuine Stripe `checkout.session.expired` event reached the TEST webhook and was recorded in `frankiholz_test_payment_events`.
9. Both TEST cancellation messages reached Resend and the FrankiFlow Mail DB.
10. Repeating cancellation returned `already_cancelled` and did not create additional booking email events or mailbox messages.
11. `frankiholz_booking_status_v3` returned the cancelled/released TEST state with no payment URL.
12. Unauthenticated access to `frankiholz-admin-delete-bookings` was rejected with HTTP 401 before deletion logic.
13. Cleanup of the disposable booking removed its booking row and two `frankiholz_email_events` rows; the Stripe TEST event ledger remained as an audit record with `booking_id = null`.
14. The four received test emails remain in FrankiFlow Mail history, which is intentional.

The final interactive card-save / host-confirm / scheduled-charge path still requires completing Stripe Checkout with a test card in a browser. Do not switch the payment environment to LIVE until that interactive acceptance step has also passed.


## Admin booking cleanup — 2026-09-22

A safe multi-select cleanup flow was added for old booking records.

- Admin UI shows selection checkboxes only for bookings that are already `cancelled`, are not `paid` or `refunded`, and do not retain a saved Stripe payment method.
- `frankiholz-admin-delete-bookings` is the server-authoritative delete endpoint. It requires an authenticated FrankiHolz admin and repeats the same safety checks server-side.
- The endpoint releases any calendar rows still linked to the booking before deleting it.
- Booking-linked email-event rows cascade with the booking; Stripe payment ledgers retain their event rows with `booking_id` set to null.
- The UI requires an extra confirmation when a selected historical record is marked `payment_mode = live`, even if it is already cancelled and unpaid.
- Permanent cleanup is intentionally unavailable for active, paid, refunded, or card-linked bookings.

The Edge Function is deployed in the shared Supabase project. This repository has no local Edge Function source tree, so this handoff is the repository record of that external backend change.
