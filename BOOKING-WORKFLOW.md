# FrankiHolz guest booking workflow

Last updated: 2026-10-18

## Current guest journey

1. **Choose room and dates.** FrankiHolz combines its calendar, confirmed bookings and imported Airbnb/iCal blocks.
2. **Calculate the stay total.** The server-side pricing RPC returns the current total.
3. **Create the booking request.** The public site uses `frankiholz_create_booking_v2`, which records the guest profile and `payment_schedule_version = v2_14_day`.
4. **Choose payment on the payment page.** After creating the request, guests continue to saved-method setup (the Stripe-hosted chooser offers eligible cards, wallets and bank debit). Setup saves a method without charging. New EUR/SEPA bank transfers are disabled. Existing transfer instructions, receipt reconciliation and refund handling remain available for transfers already initiated. Receipt does not confirm the stay.
5. **Card setup completes.** The Stripe webhook records the Customer, SetupIntent and PaymentMethod, then sets `payment_status = payment_method_saved`.
6. **Host reviews the request.** The booking remains pending until FrankiHolz confirms or rejects it.
7. **Host confirms.**
   - More than 14 days before check-in: status becomes `confirmed / scheduled_charge`; the room dates become booked.
   - Within 14 days of check-in: the saved card is charged immediately and the booking becomes `confirmed / paid`.
8. **Scheduled charge.** A server-side scheduled job charges confirmed `scheduled_charge` bookings when `charge_due_at` is reached.
9. **Host rejects.** An unconfirmed v2 request is closed without charging the guest.
10. **Guest checks status.** `frankiholz_booking_status_v3` returns booking status, payment status, scheduled charge date, cancellation eligibility and payment environment.
11. **Guest cancels.** `frankiholz-cancel-booking-v2` applies the 14-day policy using the booking's stored test/live payment mode.

## Payment states

- `not_started` — booking exists, card setup has not started.
- `awaiting_payment` — Stripe card-setup Checkout is open.
- `payment_method_saved` — card is saved; host decision is pending.
- `scheduled_charge` — booking confirmed; charge is scheduled for 14 days before check-in.
- `paid` — payment completed.
- `failed` — automatic/off-session payment failed and needs follow-up.
- `released` — uncharged request/payment method was released.
- `refunded` — a paid booking was refunded.
- `expired` — legacy/expired payment state retained for compatibility.

## Cancellation policy

- **More than 14 days before check-in:** full refund if already paid; otherwise no charge.
- **Within 14 days:** confirmed bookings are non-refundable. If a confirmed booking has not yet been charged, the cancellation endpoint attempts the outstanding charge before closing it.
- Pending/unconfirmed requests can be rejected or cancelled without a booking charge.
- If a guest cancels while Stripe card setup is still open, FrankiHolz expires that Checkout session and clears the payment URL/deadline. The TEST webhook also refuses to turn a cancelled booking back into `payment_method_saved` if a late completion event arrives.

## Environment rules

- The Admin TEST/LIVE selector controls new production-site payment setup.
- Updated `develop` and updated production frontends both read the shared Admin TEST/LIVE setting; TEST is no longer forcibly selected on `develop`. Normal guest checkout follows the server-selected environment without a development-only confirmation.
- The Stripe setting is currently **global** for both sites because they share Supabase. Switching it affects *new* updated-site checkout sessions on both. It is not a branch-isolated setting. The current production `main` has older code and needs its own approved release before its frontend fully honors this selector.
- A public `?stripe_test=1` or `?test=1` parameter cannot force sandbox mode. The Admin setting is authoritative.
- Existing bookings keep their own `payment_mode`; switching the global environment does not migrate an existing booking from test to live or vice versa.

## Legacy path

Pre-v2 bookings may still contain the old 48-hour manual-capture state. Server compatibility remains for those records only. The active public and Admin interfaces no longer present that lifecycle.


## Admin cleanup

The Bookings tab supports reversible removal of any request from the active list, including paid, processing and confirmed records. Select requests and use Delete selected. Show removed requests provides Restore to bookings. This changes only admin_deleted_at: reservations, scheduled charges, Stripe payments and financial/email audit records stay active. Cancellation/refund must be handled separately.

The older permanent-cleanup endpoint remains restricted to eligible closed records and is not called by the new list controls.

A booking is deletable only when all of these are true:
- `status = cancelled`;
- payment status is neither `paid` nor `refunded`;
- no saved Stripe payment method remains.

The browser shows selection controls only for eligible rows, and the authenticated Edge Function `frankiholz-admin-delete-bookings` re-checks the rule server-side. Before deletion it clears any booking-linked calendar rows back to available. Booking-specific email-event rows cascade-delete; Stripe payment-event ledger rows are retained with `booking_id = null` for audit history. Received messages already stored in FrankiFlow Mail are not deleted.


## Explicit administrator availability override

Make available reopens each selected calendar night even if an existing reservation or imported calendar blocks it. The override is stored server-side and honoured by Admin, public calendar, quotes and booking creation. It does not cancel or refund the original reservation. A new host confirmation reserves the dates again and consumes the override. Adjacent nights remain unchanged.


## Request list

Admin sorts requests newest received first by immutable created_at, with id as a deterministic tie-breaker. Each request displays Received in Europe/Berlin time, separately from payment scheduling. Payment updates do not change received order. Refresh requests reloads current state; removed requests use the same ordering. Long messages preserve line breaks and wrap inside their cards.

## Airbnb availability controls

Airbnb sync replaces imported blocks, preserving explicit Admin availability overrides. Room calendars distinguish imported Airbnb blocks from “Airbnb blocked · available here” dates and report the imported/overridden nights in the visible month. Each room has a sync action; Integrations syncs all enabled feeds and reports counts/errors.

The separate Airbnb-only action affects imported Airbnb-blocked nights in the selected inclusive range, excluding confirmed reservations. “Follow Airbnb again” removes manual availability overrides in that range; imported blocks and confirmed reservations then apply normally. Both actions require server-verified Admin access and serialize on the room lock. Neither changes Airbnb, reservations, payments, prices or notes. General “Make available” retains its broader explicit reopening behavior.
## Guest discount codes and complimentary stays

Available codes: FrankfiHolzGuest15 (15%), FrankfiHolzGuest25 (25%), FrankFlowGuest25 (25%), FrankFlowGuest50 (50%), FrankFlowGuest75 (75%) and FrankFlowGuest100 (100%). Matching ignores case and surrounding whitespace. One code per request; no stacking, expiry or usage limit configured. Existing FrankiHolzGuest50/75 remain compatible. Amounts and the promo snapshot are calculated server-side. Positive discounted totals must be at least EUR0.50; they are never rounded up to that minimum.

A 100% discount creates a pending complimentary request with total0 and payment_status=not_required. It goes directly to booking status without Stripe or card setup. Host approval still checks/reserves available dates atomically. Rejection/cancellation preserves not_required; there are no charges, refunds or payment receipts. The scheduler excludes complimentary requests. Database constraints prohibit Stripe IDs, due dates and paid_at for these requests. Host and guest messages explicitly explain that no payment is required.