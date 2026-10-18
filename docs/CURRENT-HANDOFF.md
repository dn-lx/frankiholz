# Current Handoff

## In-progress payment options and booking UI — 2026-10-18

- Branch `fix/booking-payment-options-20261018` from develop. PR #56 targets develop; awaiting checks/merge. Reviewed migration and all ten payment/email/admin function deployments succeeded (existing JWT settings preserved). Working tree includes imported current Edge Function sources plus shared helpers, service-only operation/confirmation SQL, mocked payment tests and UI changes. Preserve earlier handoff edits.
- Latest owner requirements: promo Apply button beside/aligned with input; payment-neutral CTA and as many eligible Stripe methods as practical; check-in 17:00 and checkout 11:00 on departure date; EUR/SEPA bank transfer instructions IMMEDIATELY on booking request BEFORE host approval; remove the entire obsolete yellow gateway warning (all 3 homepage instances + standalone status page).
- Editable `frankiholz_copy` rows fhCheckIn/fhCheckOut already updated and verified in shared DB to 17:00 / 11:00 in EN/DE; local guest-info defaults match. Stripe built-in browser shows Google Pay and bank transfers enabled; SEPA Direct Debit shows approval pending. Other enabled methods are filtered by Stripe for setup/currency/device. PayPal remains deferred.
- New bank flow uses stored `payment_collection_mode=bank_transfer`, server-owned EUR total, per-booking Stripe customer and one customer_balance PI; hosted transfer instructions returned immediately. Settlement keeps booking.pending; only host approval reserves dates. Partial/excess/late funds and cancelled transfer records remain marked for Stripe reconciliation and protected from deletion.
- New saved-method helper retains processing for asynchronous debits; SQL operation leases serialize setup/charge/cancel/host approval, never auto-expire uncertain Stripe outcomes. Unknown outcomes intentionally require manual reconciliation. Host confirmation/calendar reservation is atomic and checks conflicts.
- Independent reviewer `/root/payment_options_review` identified callback CAS, truthful pending-refund handling and unchecked reject DB writes; fixes implemented. Added refund_review_required + stripe_refund_id, refund callbacks and generic payment emails (no recipient/auth changes), provider idempotency headers per booking/event/audience. Final focused review found no further payment-state blockers; fixed its remaining admin-profile HTML escaping finding and added regression coverage.
- Tests: full Chromium 41 passed after notice removal (360/390/1280 widths, both languages, promo and bank selection). Mocked Node payment tests 12 passed, including refund, email escaping and setup/cancellation races. First CI run passed all WebKit and 39/41 Chromium; two new English mobile geometry tests measured during smooth scroll. Fixed measurement to capture both rectangles in one frame, preserving assertions; rerun CI.
- Migration `20261018133853_async_payment_methods.sql` + SQL operation assertions previously rehearsed under full ROLLBACK; verified function absent, columns absent and zero rollback fixture bookings afterwards. Final rehearsal including refund columns and operation assertions passed with full ROLLBACK. Additive migration now applied successfully; ten updated function deployments active.
- Existing shared booking audit: no confirmed LIVE bookings. Only scheduled TEST booking without PI is FH-4F907974, check-in 2027-04-01, charge due 2027-03-18; cron has never been due. Existing TEST paid booking has a PI. Do not run charge cron against shared data for tests.
- Next: finish final tests/review; PR into develop and required checks; apply reviewed additive migration and deploy functions preserving verify_jwt flags (decision/admin-delete true; setup/cron/webhook/cancel/email false with own auth); live Stripe webhook updated in browser to 12 events (six retained + refund.created/updated/failed, payment_intent.requires_action/partially_funded, cash_balance.funds_available); verify corresponding TEST subscriptions before asynchronous TEST receipt tests; verify develop deployment and actual live checkout/bank instructions, then owner operates card entry/live charge or bank transfer. No receipt of funds has been proven yet.
- Browser runtime currently selected IAB. Tabs: 1 original develop user tab (preserve filled form), 2 Stripe payment-method settings; temporary 3 Stripe docs, 4 Supabase function Code, 5 Supabase SQL Editor, 6 Resend docs (temporary). Runtime handles liveStripe, supaWork, sqlWork, schemaEditor, taskFs, taskRepo. Browser tool list may show only user tabs while agent tabs remain accessible. All Stripe activity must remain in built-in browser.
- Original deployed Edge Function source backups outside Git: `C:/Users/dasha/.codex/visualizations/2026/10/18/01a14ec4-b9ac-7dc0-b23a-78974256ef31/payment-backend-before/`. No keys/card details in those files (runtime env references only). Supabase connector is now verified against correct project and available for deploy/read; Stripe connector is forbidden by user preference.

## Promo rollout and actual LIVE checkout handoff — 2026-10-18

- PR #55 merged into `develop` as `4fa4eefa0956c96c88fe328d4e8dafa5d4d877a8` after all four CI workflows passed (including Chromium/WebKit). Applied reviewed additive SQL migration through signed-in Supabase SQL Editor; verified success and persistent quote results. No production frontend merge.
- Verified deployed develop form: `FrankiHolzGuest50` on Oct 21–23 produces 1.00→0.50; `FrankiHolzGuest75` on Nov 7–11 produces 2.00→0.50. Server quote RPC results match. No promo booking or charge persisted during these quote checks.
- SQL Editor's Monaco `fill` only replaces the current textarea segment on a long document. Always click editor, Control+A, Backspace, then fill the complete query; verify the document before Run. Re-ran the full migration/assertions from an empty editor, including actual anon-role quote/create calls, with final ROLLBACK; passed. Verified helper/quote absent and zero promo columns before permanent migration.
- Owner explicitly requested actual LIVE E2E receipt verification. Created one authorized internal test booking through deployed FrankiHolz: reference `FH-FDA57E4E`, Room 1, check-in 2026-10-21, check-out 2026-10-22, total EUR 0.50, no promo. Profile explicitly synthetic/internal test; internal business contact used for automatic booking email. It reached actual `cs_live_` Stripe setup checkout. No card entered or Save/charge clicked by agent.
- Handed secure Stripe card entry/Save to owner and asked for FrankiHolz Admin sign-in. Next: verify webhook sets payment_method_saved, then owner performs host confirmation/live-charge step (within 14 days) and agent verifies actual succeeded live PaymentIntent, EUR 0.50, matching reference, webhook paid state and Stripe receipt/balance entry. Saving a card alone is not money received. Do not claim E2E payment success yet.
- Stripe onboarding advanced after owner filled identity; agent set statement descriptor `FRANKIFLOW FRANKIHOLZ` (short `FRANKIFLOW`). Payout-bank step still displayed mandate/SEPA agreement; asked owner to submit bank authorization, security and final onboarding. Setup checkout can open despite incomplete charges activation, so do not infer charges_enabled from a live session URL.
- Temporary shared room base prices remain EUR 0.50. Restore original prices after controlled tests using the guarded instructions below. The pending internal test booking must be cancelled/cleaned via the normal lifecycle after receipt verification, without deleting payment audit history.

## Server-owned promo implementation and LIVE E2E blocker — 2026-10-18

- New branch `feature/booking-promo-codes-20261018`: additive quote/create RPCs plus optional bilingual booking promo field. Codes `FrankiHolzGuest50` and `FrankiHolzGuest75` apply one 50% or 75% discount per booking; case/outer whitespace normalized, no stacking. No expiry/use limit specified by owner. Original price, canonical code, percentage and discounted total are snapshotted atomically on the newly created pending booking.
- Minimum discounted total is EUR 0.50; reject lower totals rather than silently overcharge. Deployed `frankiholz-charge-due` reads `total_price` but clamps cents to 50 and treats non-succeeded PaymentIntents as failures; do not enable asynchronous bank methods until that behavior and the webhook lifecycle are updated/tested.
- Read deployed v2 create/estimate/status SQL and charge worker via browser. Verified booking reference UNIQUE, booking RLS enabled/admin-only SELECT/UPDATE/DELETE policies, no noninternal booking triggers. Existing v2 RPC is retained; promo wrapper reuses its validation and updates only the new booking in the same transaction. Email hook recognizes the new RPC without changing recipient or provider behavior.
- Migration and SQL tests rehearsed through browser SQL Editor with final ROLLBACK; invalid code, both discounts, stored amount consistency, below-minimum rollback and privileges passed. No persisted test booking, email or Stripe object created. Independent security review found no blocking SQL issue; stale UI messages identified and fixed. Latest local Chromium calendar/payment/promo run: 13 passed. Local WebKit binary missing; require CI WebKit checks before merge.
- Owner explicitly requested actual FrankiHolz LIVE E2E and confirmation of receipt in Stripe. Rechecked Stripe browser: activation required/cards action required. Opened activation; it is blocked at representative identity form. Prefilled owner-supplied first/last name, email and phone only, no submission; DOB/private address unknown. Asked owner to complete identity/bank/security/final review in Stripe. Live card entry/charge remains owner-operated, then verify Stripe succeeded PaymentIntent and booking reference, amount and webhook booking state. Do not claim payment receipt until observed.
- No additional payment methods enabled. PayPal remains deferred. All three EUR 0.50 room base rates are currently shared/live; originals/restoration instructions below.

## Authorized temporary test rates and promo names — 2026-10-18

- Owner explicitly repeated changing all three room prices to EUR 0.50 for testing, and named codes `FrankiHolzGuest50` / `FrankiHolzGuest75` (50% / 75% off). Codes not yet implemented.
- Via signed-in Supabase SQL Editor, verified project `bdeajozhylypiidrldka` and updated ONLY the three known room `base_price` values, guarded by their original prices; RETURNING confirmed 3 rows at 0.50. Calendar overrides and existing bookings unchanged. Shared backend means production also sees these base rates; informed owner.
- Restore after testing, guarded by current base_price=0.50: room `2facc875-9470-4b12-9b28-cd65b7360b14` to 37.00; `3c2220b3-59df-4447-851d-9719a2a45574` to 40.00; `4474d731-7428-4dea-b03b-768b98d65f18` to 38.00. Do not overwrite subsequent owner edits.
- A EUR 0.50 total with either discount is below Stripe's minimum; use a larger total for real discounted charge tests or reject under-minimum discounted checkouts clearly.
- Supabase browser is authenticated. FrankiHolz Admin still shows login even after refresh; no credentials supplied or retrieved. Stripe remains browser-only.

## Inter typography and payment-method scope — 2026-10-18

- Font PR #54 merged into `develop` as `0bbf5419bf41fcaada990e904ee4d12a9241d64c` after Chromium/WebKit, security, Lighthouse and agent-stack checks passed. Verified deployed develop body/headings now use Inter, the font loaded, and desktop has no horizontal overflow. Production `main` unchanged.
- Latest owner steering: offer as many eligible payment methods as practical, settling to Stripe, and add promo-code support for 50% and 75% off. PayPal remains deferred unless explicitly reauthorized. Promo names/limits are pending (suggested FRANKI50/FRANKI75, disabled until tested); no discount or additional method has been implemented/enabled.
- Backend inspection blocker: Supabase project browser tab redirects to sign-in, and FrankiHolz Admin is also signed out. Requested sign-in. Existing local checkout exposes only the live setup function and partial SQL migrations; deployed charge/test/webhook implementations must be read before making payment or promo changes. Setup-only Checkout means Stripe's coupon UI alone cannot discount the eventual stored booking charge.

- Owner requested matching frankiflow.de typography and explicitly authorized a PR merged into `develop`. Browser inspection confirmed Inter for both body and headings. Replaced Manrope import/body stack in shared `assets/styles.css`, including weights 400–900; public, Admin and payment/status pages inherit the change.
- Local built-in browser preview confirmed Inter loaded, body/headings used Inter, English/German switching worked and desktop had no horizontal overflow. Required PR checks must pass before merge; no production release authorized.
- Owner deferred PayPal; its connection dialog was dismissed without proceeding with data sharing or linking. Latest Stripe Dashboard still reports activation required and cards require action. Support email/phone were saved via the browser in the preceding session; business/representative onboarding remains incomplete. Keep all Stripe activity in the built-in browser.
- Owner approved EUR 0.50 per-room live tests after reviewing Stripe's EUR minimum, but test dates are still unspecified and FrankiHolz Admin is not signed in. No room rates, bookings or charges changed. Guest card entry and final live payment remain owner-operated.
- Bank-payment choice remains open: bank transfer is guest-initiated and needs receipt/deadline handling; SEPA Direct Debit supports saving a mandate and later debit, without a funds hold, with asynchronous confirmation. The existing card-only saved-method flow needs backend/UI/webhook review before bank methods are enabled.

## Stripe live readiness inspection — 2026-10-18

- User selected the FrankiFlow live account for the FrankiHolz payment setup. Checked out `develop` locally and opened its public site and Admin in the built-in browser.
- Read-only Stripe inspection confirmed `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`, and `card_payments=inactive`; disabled reason is `requirements.past_due`.
- Outstanding onboarding includes representative name/address/date of birth/email/phone, business support phone, payout bank account, and Stripe terms acceptance. Owner must complete onboarding in Stripe Dashboard; no account details were guessed or submitted.
- Existing live FrankiHolz webhook is enabled and points to the documented Supabase `frankiholz-stripe-webhook` endpoint with the six documented events. This confirms registration only, not successful delivery or backend signature verification.
- Opened the selected account's Stripe Dashboard in the built-in browser; it currently requires sign-in. No Stripe, Supabase, payment mode, booking, deployment, or production settings were changed. No live card setup or charge was attempted.
- Next: owner signs in and completes onboarding; recheck account activation, then inspect deployed payment functions, webhook delivery/signature/idempotency and scheduled charges before claiming readiness. The public construction notice remains appropriate until verified.

## Payment gateway construction notice before develop → main — 2026-10-13

- Owner explicitly requested a bilingual public message that the online payment gateway is under construction and guests should contact the FrankiHolz host for an alternative payment method, followed by a `develop → main` production release.
- Implemented the English/German notice and direct #contact link in the guest booking panel, public cancellation/payment section, homepage booking status section, and standalone booking-status page. The text is intentionally a warning only: existing booking and Stripe routing/checkout endpoints remain unchanged.
- Automated Playwright smoke checks cover English/German copy, language switching and links without backend writes.
- At this point, Stripe LIVE remains restricted pending Stripe business onboarding (card payment capability inactive and charges disabled at the last direct check). Supabase's separate `live_ready` setting is not an account-level Stripe activation guarantee. Do not claim production LIVE checkout works until Stripe capability status and a controlled real end-to-end card-saving test have been verified.
- Before release, follow repository `.agents/skills/release-workflow/SKILL.md`: feature PR into develop with checks, then same-repository `develop → main` with `production-approved` label and release checks; preserve webhook/keys and inspect the 75+ pending commits. Post-merge, verify Netlify main deploy, guest pages and rollback path.


## Calendar exclusive checkout + shared TEST/LIVE selector on develop — 2026-10-11

Feature branch: `fix/calendar-checkout-stripe-env-20261011` from `develop`. Do not merge or deploy this branch directly to `main`.

### Confirmed booking-calendar bug
- Room 1 (Cozy Holz), 2026-10-13 night is available (€0.90 test rate). 2026-10-14 through 17 nights are blocked by Airbnb iCal. Confirmed booking night 2026-10-12 is unavailable.
- Read-only production backend check: `frankiholz_estimate_total(room1,2026-10-13,2026-10-14)` returns available=true, one night. The same call to 2026-10-15 returns false. Backend correctly uses half-open [check-in, check-out) intervals.
- Fixed an existing ternary-precedence issue in `assets/site.js` so explicit `?lang=en` is respected rather than incorrectly switching to German; this also ensures the new checkout-only text is localized correctly.
- Frontend calendar erroneously disabled every blocked date. Updated public JS to expose first blocked morning as an interactive **check-out only** boundary once valid check-in is selected, never allowing booked/blocked overnight dates in selected range.
- Clicking selected check-in now clears both selections. Clicking selected check-out clears check-out only. Summaries/pricing reset. Added aria labels and dashed checkout-only styling; no Airbnb blocks were edited.

### Stripe safety and rollout
- Both Stripe credentials are marked ready in shared Supabase; selected setting is currently `live`. The single `frankiholz_payment_settings` row is **GLOBAL across develop and main**. They do **not** have independent settings in the current architecture.
- Removed old forced TEST on develop and publicly controlled `?test=1` / `?stripe_test=1` override in new frontend. Updated frontend reads Admin-protected `frankiholz_get_payment_environment` regardless of hostname, displays TEST/LIVE visibly in booking flow, and requires an explicit `LIVE` confirmation when on a development preview.
- Updated Admin mode selector copy to explain shared setting and existing booking payment mode preservation. This is **not** a passwordless public mode switch.
- Staged a guarded same-signature migration to set a new booking's `payment_mode` to the selected mode at initial creation, rather than column default LIVE (existing rows unchanged).
- Staged existing LIVE Stripe Edge Function's smallest necessary callback change: use approved incoming browser Origin (allowlist already exists) for success/cancel return URLs, to return development LIVE tests back to develop rather than production. Existing production request origin still returns to production. No key, charge, or business logic changes.
- The **deployed production main branch is 71 commits behind develop** and contains a legacy browser-side mode choice which does not respect the Admin selector. A separately reviewed and approved `develop → main` production release is required for the updated mode selection to work on main. Do not claim main is updated merely because backend was changed.
- No real card setup or charge has been performed. Do not create artificial live bookings merely to test code.
- Playwright tests use a mocked calendar/payment RPC for Oct 13/14, deselection, blocked dates, German labels, and backend-mode precedence over query flags. Confirm security, browser and Lighthouse checks before any code merge.


## Compact public site spacing and Stripe TEST/LIVE test guide — 2026-10-11

Branch `fix/compact-site-spacing-20261011`, based on `develop`. No production `main` merge and no Supabase/Stripe settings changed.

- Added `assets/compact-spacing.css` as a final public-page stylesheet, reducing unnecessary vertical gaps in the hero, quick navigation, guest-review strip, room cards, house rules/amenities, booking section, location and footer. Touch targets and critical calendar/booking controls remain usable.
- Removed the public rules card's fixed 570px minimum and two-row span to avoid large empty card space; sections and spacing become responsive.
- Added desktop/mobile Playwright checks for section padding, min-height removal, no horizontal overflow and preservation of the guest booking/contact controls.
- Current source-of-truth Stripe model is documented in `STRIPE.md` and `BOOKING-WORKFLOW.md`: v2 saved-card setup (no initial charge), Admin host decision, charge 14 days before check-in or immediately for stays within 14 days. Develop/branch previews are forced to TEST; live production uses the Admin environment selector; existing bookings keep their original environment.
- A downloadable Stripe testing guide has been generated separately for the user. It distinguishes the production Admin selector from develop preview test-mode forcing and cautions about live payments. It is not a change to runtime configuration.

Review CI, desktop/mobile, and the hidden-until-selected booking panel before merging into develop; do not promote to main without production approval.


## Header width, hero right alignment and WhatsApp icon — 2026-10-11

Branch: `fix/hero-right-align-whatsapp-icon-20261011` from current `develop`, **not** `main`.

- Increased desktop public nav width from the previous 1,220px maximum to 1,370px / 96vw, keeping the same centered positioning; mobile retains existing nav width.
- Right-aligned the "Unterkunft in Frankfurt am Main" badge and "Zimmer ansehen" CTA against the right edge of the hero rail at desktop widths; they remain stacked and left-aligned on mobile.
- Replaced "WA" text with the actual WhatsApp pictogram sourced from Simple Icons (CC0) and bundled in `assets/whatsapp.svg`, white on a green circular 48px touch target. The WhatsApp chat link continues to use existing Admin-managed phone logic and preserves DE/EN accessible labels; no network requests are needed to render the icon.
- Bumped CSS asset cache versions to deliver the latest layout and icon styling.
- Added Playwright assertions for widened nav, exact badge/button alignment, no icon text and correct WhatsApp SVG asset.
- No changes to data, Supabase policies, booking/payment, Admin logic or Airbnb content. CI must pass before merging into `develop`; production `main` is not affected.


## Remove Sinhala placeholder + add WA contact badge — 2026-10-11

Branch `fix/booking-language-wa-contact-20261011` based on `develop` after PR #43 (right-aligned hero) merged. **No production `main` changes**.

- Booking page: changed free-text `#guestLanguages` placeholder from `English, German, Sinhala` to `English, German`, leaving the guest's language input, translations, and booking submission contract unchanged. No stored guest language records were changed.
- Public Contact section: added a small visible `WA` link adjacent to the phone number. Opens `https://wa.me/4917662493041` in a new tab (no background WhatsApp request) with `rel="noopener noreferrer"` and fully labelled accessibility text.
- The link is generated from the **existing bilingual Admin-managed `fhContactPhone` value** by `assets/guest-info.js`, not a second hardcoded phone setting. If the value is not a valid international number beginning with `+`, WA link hides rather than opening an invalid URL. Phone contact remains unchanged.
- Added compact/responsive WA link styling with focus and reduced-motion handling. Added Playwright smoke checks for link presence, exact `WA` label, German aria-label, correct URL, the revised placeholder and CMS-backed phone updates.
- No Supabase schema/data, payment, Stripe, booking logic, authentication, or private feed changes. CI/PR into `develop` only; do not merge to `main`.


## Hero badge + CTA right-side repositioning — 2026-10-11

Branch `fix/hero-badge-cta-right-20261011` from `develop`, **not** a production deploy.

- User screenshot requested moving the “Unterkunft in Frankfurt am Main” location badge and “Zimmer ansehen” primary button out of the left hero text to the center-right of the hero, and **removing** the “Unsere Unterkunft entdecken” secondary link. Main headline, description, tagline and navigation stay on the left/in their current roles.
- Restructured hero HTML with a single `.fh-hero-rail` holding the original badge (`data-i18n="eyebrow"`) and **the same** `#heroRoomsBtn` (`data-i18n="viewRooms"`), preserving the JS scroll-to-rooms handler.
- Created focused `assets/hero-placement.css` for desktop two-column positioning and a mobile single-column stacking order: badge above headline, CTA below text. Removed outdated single-column `!important` override from `assets/reviews-band.css`.
- Added Playwright assertions for desktop right-side badge/CTA, mobile stacking, removing the secondary link, CTA presence, and no page overflow.
- No Supabase, Airbnb, booking, admin, Stripe, payment, or database changes. Do not merge to `main`; follow standard feature→develop CI gating.


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

## Live Checkout failure diagnosis — 2026-10-18

- Booking FH-FDA57E4E remains EUR 0.50, pending / awaiting_payment, live. Browser SQL verification after the failed Save attempt confirmed no saved payment method and no PaymentIntent.
- Stripe browser Workbench shows the 14:49 CEST Checkout confirm request failed HTTP 400, code testmode_charges_only. Stripe states the account cannot currently make live charges and the transaction was not processed.
- Onboarding remains at /account/onboarding/2fa: no authentication method configured and Continue disabled. Owner must configure their authentication method, complete remaining onboarding and final submission before retrying.
- No card retry, new booking, charge, or refund was initiated. Preserve this booking for retry once live payments are enabled. Never record card details in this repository.
