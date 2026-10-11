# Current Handoff

## Expanded Airbnb review carousel with per-guest stars — 2026-10-11

Feature branch: `feature/airbnb-twelve-starred-reviews-20261011` from current `develop`.

- Expanded the below-hero genuine guest feedback slider from three to **twelve** individually attributed summaries of public **five-star** Airbnb reviews from listing `https://www.airbnb.com/rooms/1621684668409633226`, personally checked against the public Airbnb review dialog on 2026-10-11.
- Review authors: Katharina, Catarina, Ke, Imanol, Anas, Patricia, Kai, Josephin Alina, Abhiram, Sophie, Alexander, Dai. Verified five-star ratings for all 12; do **not** claim their exact guest text is reproduced — the visible summaries are faithful paraphrases of reviews, labelled as such in both languages and linked to the original public listing.
- Each individual card now has visible gold star glyphs `★★★★★`, numerical `5 / 5` and an accessible rating label. German/English review summaries and rating labels follow the language switch.
- Expanded protected optional Admin input to up to 12 items. For custom guest feedback, the optional fourth pipe-separated field records the **known** individual 1–5 star rating; if the rating is unknown, no stars are displayed rather than fabricating five stars.
- No Supabase writes, auth changes, Stripe/booking changes, or production `main` deployment. Carousel stays motion-aware with controls and attribution.
- Added Playwright coverage for all 12 authors and star ratings, forward/loop navigation, German summaries, responsive rendering and custom Admin ratings (including a four-star review).
- Production release remains develop→main only, separately reviewed and approved.


## Verified Airbnb listing review strip below the homepage hero — 2026-10-11

Branch: `feature/airbnb-reviews-below-hero-20261011` based on current `develop`. Production `main`, Supabase and Stripe are unchanged.

- The owner supplied public listing `https://www.airbnb.com/rooms/1621684668409633226`, already saved in protected/Admin-editable `public.frankiholz_copy.fhAirbnbReviewsUrl` for both languages (existing copy included tracking query string).
- Airbnb indexed page snapshots differed: an older fetched version showed **4.61 / 23 reviews**, whereas a newer search-indexed snapshot displayed **4.69 / 29 reviews**. Thus numbers are **not live**; UI displays the newer known snapshot and an explicit "Airbnb listing snapshot · not live" disclosure, with direct canonical source link. Admin editors can manually revise `fhAirbnbRating` and `fhAirbnbCount` (fallback defaults 4.69, 29; no database migration).
- No individual written review texts/guest names were accessible from the public Airbnb page: the reviews section showed zero review items in non-JS retrieval, though aggregate rating/tags were visible. Do not invent quotations. Only confirmed public review topic labels (hospitality, location, cleanliness) are shown without claiming exact guest quotes.
- Moved reviews to the screenshot-requested space **after the quick-navigation row and before Rooms**; removed review panel from inside hero, keeping the hero fully wide.
- Real quotations if later collected through owner-verified sources may be displayed in the existing optional sliding carousel in this same strip via bilingual Admin `fhHeroReviews` records (author | exact quote | canonical Airbnb listing URL).
- The lower About Us review link was removed to avoid duplicate review placement. All reviews link directly to the official listing.
- Tests cover location, source URL, English/German, snapshot, hidden default carousel and mock review slider.
- No standalone Airbnb public review sync API has been verified; official listing-embed process is documented by Airbnb at `https://www.airbnb.com/help/article/923`, but the exact host-provided embed code has not been supplied.

Before merging: run Playwright, security and static UI checks; verify desktop/mobile. Standard release path feature→develop then approved develop→main. Do not call a snapshot "live synchronized".


## Remove hero welcome panel + prepare genuine Airbnb reviews — 2026-10-11

Branch: `feature/airbnb-hero-reviews-20261011` based on `develop`. Do not deploy or modify production/main or shared booking/payment data.

- Removed the entire decorative `fh-stay-note` hero information card requested by the host. The hero becomes a full-width editorial layout when no reviews exist.
- Added `#fhHeroReviews`, a responsive, motion-aware guest review slider in the hero, initially **hidden**. No fictional or sample reviews are shipped in the public website.
- Reused protected bilingual `public.frankiholz_copy` storage by adding optional `fhHeroReviews` Admin content field: one review per line, `Guest name | Exact review quote | Public Airbnb listing URL`, maximum ten per language. A separate test fixture uses clearly synthetic quotations only in Playwright tests.
- Every visible quote retains a direct, validated Airbnb listing link; no HTML is injected from guest text. Existing `fhAirbnbReviewsUrl` still supports the old public listing link where there is no hero carousel, preventing duplicate review placement.
- Auto-scroll every 7.5 s when multiple review entries exist, pauses on hover/focus/hidden browser tab and honors reduced-motion preferences; previous/next buttons remain available.
- **No automatic review sync.** Airbnb officially documents embedding a listing preview with reviews (`https://www.airbnb.com/help/article/923`), but does not provide a verified general public reviews feed in the current integration. Do not scrape reviews or mislabel manually copied quotes as synchronized. When owner provides listing(s), verify what reviews and embeds are actually available, and obtain permission/accuracy for any displayed content.
- No Supabase schema migration or live write; retain the existing authenticated Admin and RLS constraints. Check browser/CI before merging feature into `develop`. Future `develop → main` requires normal production approval.


## Premium Homepage + Admin UI — October 11, 2026 (feature branch, not production)

Branch: `feature/premium-public-admin-redesign-20261011`, based on latest `develop`. No shared Supabase, Stripe, payments, guest data, or `main` production changes.

- Reworked public homepage into an editorial split hero with a guest-facing highlight panel, bilingual room/facility/house-rule/location jump navigation, refined room cards and guest info, booking-safe CTAs and mobile-friendly layout.
- Redesigned the authenticated Admin static shell as a responsive host workspace: desktop sidebar tabs, mobile horizontally scrollable tabs, clearer operational header, premium section/card hierarchy and updated login visuals. Existing tab buttons, IDs, RLS enforcement, RPC usage and Stripe environment controls are unchanged.
- New `assets/premium-2026.css` layers on existing approved FrankiHolz branding; retains motion-safe/reduced-motion behavior.
- New `e2e/premium-ui.spec.mjs` checks desktop/mobile layout, language switching, required Admin controls and no narrow-screen overflow; offline test reveals static Admin dashboard solely for layout validation and is NOT a substitute for signed-in QA.
- Added Airbnb public listing URL guidance under the existing optional Admin reviews link. Airbnb's official host path is Listings → listing → View → Share → Copy link (or Share → Embed → Copy HTML for a separate review preview).
- Direct Admin authentication was not possible: Supabase Auth passwords cannot be retrieved in plaintext and available browser profiles contain no saved FrankiHolz Admin login. A future live signed-in inspection requires user-controlled profile sign-in; do not reset credentials or bypass auth.
- This change does not perform a Next.js migration; current architecture remains static HTML/JS to protect booking/payment continuity.

Before merging into `develop`: inspect PR diff and GitHub CI; check authenticated Admin UI with a legitimate host session, and visually test desktop + mobile. Production release requires normal approved `develop → main` process.


## Admin duplication, map visibility and UI polish — 2026-10-11

Feature branch: `fix/admin-map-ui-refresh-20261011` from current `develop`. Production `main` and the shared Supabase/Stripe backend were not changed.

- Diagnosed Stripe payment controls duplicated because `admin-tabs.js` injected `payment-environment-admin.js` while `admin.html` also loaded it directly. Removed the extra injection and added a singleton guard in the payment UI script. The TEST/LIVE toggle and its RPCs are otherwise untouched.
- Replaced the old location-map click placeholder with a responsive two-column location section containing a default, lazy-loaded Google Maps iframe and directions fallback. This introduces a potential visitor-data transfer to Google; review German/EU privacy requirements before release.
- Refined the public accommodation and Admin UI using existing brand tokens, responsive spacing, canonical FrankiHolz brand assets, subtle/reduced-motion-aware transitions and improved keyboard focus.
- Updated Playwright tests for map existence/URL, DE locale, and a repeat-loaded Stripe UI script to prevent regressions.
- Viewer: the public develop homepage is readable with three room cards and clear house rules; map lacked an initial iframe. The Admin dashboard is gated by authentication, so viewer could only inspect the login page and the screenshot provided by the host. No login, booking, Stripe or database writes were performed.
- Next.js migration is viable as a **separate** architectural project, not included in this fix. Preserve Supabase RLS/Edge Functions, Stripe v2 payment handling, Airbnb calendar sync, bilingual CMS and production branch protections; audit authenticated Admin and public behavior before cutover.

Review PR checks and conduct a signed-in Admin visual acceptance test before merging to `develop`; do not promote to `main` without the normal release approval and privacy review.


## Guest-information website work — 2026-10-11 (feature branch, not live)

Feature branch: \`feature/guest-info-trust-20261011\` based on \`develop\`. No changes were made to \`develop\`, \`main\` or the live/shared Supabase data.

- Added public DE/EN house rules, facilities, About Us, contact telephone and click-to-load location map.
- Added an authorized bilingual website-content editor using existing \`public.frankiholz_copy\` RLS policies; no new schema is required. The section has safe defaults until an admin first saves it.
- Review links: only administrator-configured HTTPS Airbnb URLs are displayed. Do not scrape reviews; Airbnb's official listing Embed option can be evaluated separately after the host supplies its approved embed HTML.
- Added direct room-save verification in Admin; the existing room names/descriptions are edited in \`frankiholz_rooms\` (English \`name\`/\`description\`, German \`name_de\`/\`description_de\`).
- Live DB read on 2026-10-11 found all three rooms active and sharing generic duplicate EN/DE descriptions. Added a conservative SQL migration that updates these placeholders only when the existing values still match. This migration has NOT been applied to the live DB.
- Default check-in/out text asks guests to arrange exact times with the host; quiet-hours time window and optional Airbnb listing URL need host confirmation. The laundry amount is not specified and is represented only as an additional charge.
- Smoke tests cover section visibility, telephone link, DE content, and consent-style map loading.

Next actions: inspect CI and review, verify rendered DE/EN site in a browser, obtain confirmed operating hours and approved Airbnb listing/share embed, review room-specific factual differences, and apply the SQL migration through the controlled backend change process if approved. Do not promote to production until tests/review pass.


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
