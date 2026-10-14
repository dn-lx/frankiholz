# FrankiHolz v2 — Next.js hospitality redesign

**Status:** independent experimental `v2` branch. Do not merge into `develop` or `main`. Never switch production to this version without explicit separate acceptance and release review.

## Design approach

A photographic, editorial hospitality experience built with Next.js App Router, Motion for section entrance and navigational transitions, and a brand-aligned palette: deep teal `#0C3447`, warm wood `#C48048`, sage `#99AA8B`, and off-white `#F8F6F0`. Approved FrankiHolz logos and favicon are copied from GitHub `develop`, not recreated. A strong serif headline adds warmth; robust sans-serif controls preserve usability.

Referenced the real `dn-lx/agent-project-starter` design-stack guidance: Taste (distinctive composition), UI/UX Pro Max principles (system, hierarchy, mobile accessibility), Impeccable (critical anti-pattern review), and Motion where runtime animation is useful. No unpinned third-party installer was executed.

## Routes

- `/` — new cinematic EN/DE site, dynamic live room list, amenities, verified attributed guest-review summaries, house rules, consent-to-load map and contact
- `/admin` — Supabase-authenticated Host Studio (bookings, room images, calendar overrides, bilingual content, Stripe and Airbnb controls), preserving the admin RPC and RLS boundary
- `/booking-status` — guest reference/email status lookup
- `/payment-success` — Stripe saved-card return page
- `/impressum`, `/datenschutz` — preliminary legal placeholders **not publish-ready** (complete legal pages before production)

## Integrations and limitations

- Read-only room info: `frankiholz_rooms`, `frankiholz_room_images`, `frankiholz_site_settings`, and `frankiholz_copy`
- Booking: `frankiholz_get_calendar_rates`, `frankiholz_estimate_total`, `frankiholz_create_booking_v2`; card setup Edge Functions for TEST/LIVE. All rates and date availability remain server authoritative.
- Airbnb reviews shown are **attributed paraphrases**, not live synchronization.
- Content/room/admin writes are behind existing Supabase Auth + `frankiholz_admin_access_check` and RLS. Stripe Admin env switch requires typing LIVE and affects the *shared* backend.
- As of 2026-10-13, **Stripe production business onboarding was not fully active** per project handoff; LIVE operation is not declared ready despite an RPC reporting credentials connected.
- The project still has some incomplete legal/booking flows. This is a redesign prototype pending independent security and operations verification, not a replacement for deployed production.

## Local development

```bash
cd v2
npm install
npm run dev
npm run build
npm run typecheck
npm test
npx playwright install chromium
npx playwright test --project=chromium-desktop --project=chromium-mobile
```

No Stripe secret or service role key belongs in frontend. The bundled `public/assets/config.js` is the existing *public anon key* copied from the current project; use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for separate preview backends if needed. This branch currently connects to shared Supabase read-only until you sign in or submit a booking. Treat all writes as potentially live.

## Netlify v2 branch

The `v2` branch root `netlify.toml` builds from `v2/` and publishes the Next.js `.next` output using Netlify's automatic Next/OpenNext runtime. This configuration lives **only on `v2`**, not `develop` or `main`. Enable the `v2` branch deploy explicitly in Netlify if it is not already enabled.

## Critical release checklist

- Browser visual QA and full workflows at desktop 1440x900 and mobile 390px, with screenshots and reduced motion.
- Verify login and allowed/denied Admin permissions, room image upload, booked/checkout-only dates and international contact.
- Mock/test all Stripe paths and inspect shared Edge Functions. Never send real money as part of automated tests.
- Complete provider identity, cancellation conditions, and privacy/third-party map disclosures.
- Do not merge this branch to develop/main without separate user instructions.
