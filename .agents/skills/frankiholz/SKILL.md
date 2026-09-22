---
name: frankiholz
description: Maintain the FrankiHolz static accommodation website, bilingual content, availability UI, booking pages, and embedded admin while preserving its existing Supabase and Stripe boundaries. Use for work in this repository, not the separate FrankiFlow Admin app.
---

# FrankiHolz

## Read the executing path

This repository is a static site: root HTML pages, `assets/*.js`, and CSS; Supabase JS v2 is loaded from a CDN. `netlify.toml` publishes the repository root. There is no package manifest or local Edge Function implementation here. Do not introduce a frontend framework or assume this checkout contains the full backend.

- `index.html` loads `assets/config.js`, then `assets/site.js` and overlay scripts. The page shares globals such as `sb`, `CFG`, `T`, and `currentLang`.
- `assets/site.js` provides rooms, calendar, prices, translations, and initial event handlers. It calls `frankiholz-sync-airbnb` before loading settings and rooms; keep private iCal URLs on the server.
- `assets/copy-overlay.js` loads editable bilingual wording from `frankiholz_copy`. The old `assets/authorization-flow.js` file is retained only as an inert compatibility stub; it must not replace the active booking handler in `site.js`.
- `admin.html` loads `assets/admin-1.js` through `assets/admin-5.js`, followed by copy, tab, and hero-size scripts. `admin-1.js` uses Supabase sign-in plus the `frankiholz_admin_access_check` RPC. Preserve both authentication and the admin access check.
- `booking-status.html` uses `assets/booking-status.js`; `payment-success.html` has its own inline language handling.

## Product contracts and payment lifecycle

Read `BOOKING-WORKFLOW.md` and `STRIPE.md` with the actual scripts before touching booking behavior. New bookings use the v2 saved-card / 14-day scheduled-charge model:

1. `frankiholz_create_booking_v2` creates a pending request with `payment_schedule_version = v2_14_day`.
2. Stripe Checkout runs in setup mode and saves a card without charging it.
3. The webhook changes the booking to `payment_method_saved`.
4. Host confirmation schedules the charge for 14 days before check-in, or charges immediately if check-in is already within 14 days.
5. Rejection/cancellation closes the request without a charge when no payment is due.
6. Cancelling an `awaiting_payment` booking expires the open Stripe Checkout session so a late card setup cannot resurrect a cancelled request.

Pre-v2 48-hour authorization records may still exist. Server-side compatibility remains only for those old records; the active public and Admin interfaces must not present the legacy lifecycle for new bookings.

`assets/admin-5.js` owns host booking actions. Permanent cleanup is deliberately narrower than cancellation: the Admin may delete selected bookings only after they are cancelled, not paid/refunded, and no saved Stripe payment method remains. The server-side `frankiholz-admin-delete-bookings` function enforces the same rule.

Language travels through booking RPC arguments and status/return links. Maintain both German and English text, editable copy keys, locale selection, and room/SEO fallback behavior. Use existing escaping helpers when placing guest or database values into HTML.

## Backend and environment boundaries

`assets/config.js` contains browser-safe Supabase configuration for the shared FrankiHolz/FrankiFlow project and the `frankiholz-media` bucket. Payment, email, and iCal functions run remotely. Keep service-role keys, Stripe secrets, email credentials, and private feed URLs out of browser assets, skills, and graph output.

Preserve the existing RPC and Edge Function contracts rather than implementing authoritative booking, payment, or authorization decisions in the browser. `assets/email-hook.js` wraps booking RPC calls and can send a request-received email; even a test booking can have external effects. Read `EMAIL.md` for the documented lifecycle and duplicate-protection contract, and inspect the server implementation when changing it.

Development docs disagree about hosting and admin isolation. Inspect checked-in workflow/configuration before making deployment claims. `scripts/build-staging.py` forces the generated guest authorization path to Stripe test mode, but currently enables admin using the configured shared Supabase project. Stripe test mode does not isolate booking/calendar data or email.

The staging script requires `assets/frankiholz-logo-approved.png`, which is absent in this checkout. The `deploy-staging-shipstatic.yml` workflow referenced by `DEVELOPMENT-WORKFLOW.md` is also absent. Treat these as existing limitations to report, not permission to add assets, alter deployments, or disable safeguards during unrelated tooling work.

## Verification proportional to the change

For skill/rule changes, validate YAML frontmatter, resolve local references, and run `git diff --check`. For JS changes, run `node --check` on affected files and check the HTML load sequence, dynamic injection, and affected German/English views. The staging Python script can be syntax-checked without running it; do not report its build as passing while its required logo is missing.

Use Graphify only as a navigation aid. Static extraction may miss shared globals, dynamically injected scripts, Supabase RPCs, and deployed Edge Functions. Read the actual call sites and server contracts for consequential changes. Follow the repository-root `AGENTS.md` for branch scope and simplicity rules.
