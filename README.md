# FrankiHolz Accommodation Website

**FrankiFlow Projects:** This repository is part of the FrankiFlow project family. See [`PROJECT-FAMILY.md`](PROJECT-FAMILY.md) for the shared engineering/agent architecture.

Production source for **FrankiHolz** direct accommodation and booking management.

## Production

- Website: `https://stay.frankiflow.de`
- Legacy URL: `https://accommodation.frankiflow.de` (keep as a redirect/alias)
- Netlify publish directory: repository root
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

No build command is required.

```text
Build command:      (leave empty)
Publish directory:  .
```

The repository contains `netlify.toml`.

## Development workflow

`main` is production and `develop` is the persistent development branch.

For future changes:

1. Make and test changes on `develop` (or a short-lived work branch based on it).
2. Review the Netlify `develop` branch deployment.
3. Promote only approved changes to `main`.
4. Netlify production uses `main`; the development branch uses its separate branch deployment URL.

## Security

Never commit Stripe secret keys, Stripe webhook signing secrets, Supabase service-role keys, Airbnb private iCal feed URLs, email API keys or database passwords. Only the browser-safe Supabase publishable key belongs in client code.
