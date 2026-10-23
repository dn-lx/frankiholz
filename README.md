# FrankiHolz Accommodation Website

**FrankiFlow Projects:** This repository is part of the FrankiFlow project family. See [`PROJECT-FAMILY.md`](PROJECT-FAMILY.md) for the shared engineering/agent architecture.

Production source for **FrankiHolz** direct accommodation and booking management.

## Production

- Website: `https://stay.frankiflow.de`
- Legacy URL: `https://accommodation.frankiflow.de` (keep as a redirect/alias)
- Netlify publish directory: `dist` (runtime files only)
- Backend: Supabase project used by FrankiHolz and FrankiFlow
- Payments: Stripe Checkout through Supabase Edge Functions
- Production branch: `main`
- Development branch: `develop` via Netlify branch deploy

## Current product areas

- Public bilingual German / English accommodation website
- Exact transparent FrankiHolz brand logo from the shared Drive brand asset in the website navigation and footer
- Three-room accommodation catalogue with bilingual names and descriptions
- Live availability calendar and dynamic pricing
- Airbnb/iCal availability synchronization
- Booking request flow with booking language stored with the booking
- Booking status and payment-success pages in German and English
- Admin management for hero content, SEO wording, room wording, photos, pricing, availability and bookings
- German + English hero, SEO, room name and room description fields editable in admin
- Stripe Checkout payment flow through Supabase Edge Functions
- SEO metadata, sitemap and robots.txt

## Calendar synchronization

Opening the public FrankiHolz website requests a fresh Airbnb/iCal synchronization before the public room/calendar data loads. The server-side sync has a short cooldown so repeated page refreshes do not repeatedly fetch the external feeds. Private iCal feed URLs stay in protected Supabase data and are never embedded in the public website.

## Netlify build settings

The site remains static HTML, CSS and JavaScript. The build copies only public runtime files; source notes, tests and backend code are excluded.

```text
Build command:      npm run build
Publish directory:  dist
```

The repository contains `netlify.toml`.

Use Node 22.19 or newer, then `npm ci --ignore-scripts`. Run `npm run vendor:check`, `npm test`, `node --test supabase/tests/*.test.mjs` and `npm run build`. Browser tests use `npm run test:e2e` after `npx playwright install --with-deps chromium webkit`. The four payment/closure handlers additionally use `npm run check:functions` with Deno 2.9.6. Provider calls in the test suite are mocked.

The Supabase browser library is pinned and served from `assets/vendor`; after an intentional dependency update, regenerate it with `npm run vendor:update` and commit the verified bundle and license. Netlify resizes images only from the approved public accommodation bucket, with original-image fallback; local previews use the originals. Room 2 still requires an actual room photo.

Backend recovery changes require a separately verified database migration and Edge Function rollout. See [the recovery rollout guide](docs/backend-recovery-rollout.md); a frontend deploy alone does not deploy these fixes.

## Development workflow

`main` is production and `develop` is the persistent development branch.

For future changes:

1. Make and test changes on `develop` (or a short-lived work branch based on it).
2. Review the Netlify `develop` branch deployment.
3. Promote only approved changes to `main`.
4. Netlify production uses `main`; the development branch uses its separate branch deployment URL.

## Security

Never commit Stripe secret keys, Stripe webhook signing secrets, Supabase service-role keys, Airbnb private iCal feed URLs, email API keys or database passwords. Only the browser-safe Supabase publishable key belongs in client code.
