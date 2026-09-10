# FrankiHolz GitHub → Netlify workflow

## Branch policy

1. `main` is always the production source.
2. Create one `work/<topic>` branch from the latest `main` for a complete batch of requested changes.
3. Keep every intermediate commit on that working branch.
4. Test the complete website, admin and booking flow before production.
5. Merge the working branch into `main` only when the entire batch is ready.
6. Netlify deploys the new `main` commit to production once.
7. Delete the completed working branch when no longer needed.

## Cost-control rule

Configure Netlify to deploy the `main` production branch only. Keep automatic branch deploys and deploy previews disabled by default.

## Production checks before merge

- German and English public pages and language switch
- Exact FrankiHolz transparent logo
- Room names/descriptions in both languages
- Public page-load Airbnb/iCal sync and current blocked dates
- Calendar availability and dynamic pricing
- Booking request creation and stored language
- Booking-status lookup
- Admin login and bilingual content editing
- Stripe Checkout creation and return pages
- Stripe live webhook processing when live payments are enabled
- Mobile layout, SEO metadata, sitemap and clean URLs

## Secrets

Production Stripe, webhook, email and Supabase service-role secrets must stay in service-side secret stores and must never be committed to GitHub.
