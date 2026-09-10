# FrankiHolz GitHub → Netlify workflow

## Branch policy

1. `main` is always the production source.
2. Create one `work/<topic>` branch from the latest `main` for a batch of requested changes.
3. Keep all intermediate commits on that working branch.
4. Test the complete website and booking flow before production.
5. Merge the working branch into `main` only when everything in the batch is ready.
6. Netlify then deploys the new `main` commit once.
7. Delete the working branch after merge if it is no longer required.

## Cost-control rule

Configure Netlify to deploy only the `main` production branch by default. Disable automatic branch deploys and deploy previews unless a preview is intentionally requested.

## Before merging to main

Check room loading, room photos, calendar availability, Airbnb-blocked dates, request creation, booking-status lookup, admin login, approval/payment link creation, Stripe return pages, mobile layout, SEO files and clean URLs.
