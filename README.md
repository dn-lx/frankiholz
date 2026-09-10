# FrankiHolz Accommodation Website

Production source for **FrankiHolz** direct accommodation and booking management.

## Production

- Website: `https://accommodation.frankiflow.de`
- Netlify publish directory: repository root
- Backend: Supabase project used by FrankiHolz and FrankiFlow
- Payments: Stripe Checkout through Supabase Edge Functions
- Production branch: `main`

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

`main` is production. Do not develop directly on it.

For every future change batch:

1. Create one branch from the latest `main`, such as `work/booking-improvements`.
2. Put all related changes and intermediate commits on that branch.
3. Test and review the complete batch.
4. Open a pull request to `main`.
5. Merge only once the full batch is approved and production-ready.
6. Netlify production watches `main` only.

To reduce Netlify usage, branch deploys and deploy previews should remain disabled unless a preview is intentionally requested.

## Security

Never commit Stripe secret keys, Stripe webhook signing secrets, Supabase service-role keys, Airbnb private iCal feed URLs, email API keys or database passwords. Only the browser-safe Supabase publishable key belongs in client code.
