# FrankiHolz Website

Production source for **FrankiHolz Accommodation & Direct Booking**.

- Production: https://accommodation.frankiflow.de
- Hosting: Netlify
- Backend: shared Supabase project **FrankiFlow & FrankiHolz Backend**
- Payments: Stripe Checkout through Supabase Edge Functions
- Availability: FrankiHolz bookings/manual blocks plus external Airbnb iCal sync
- Admin: `/admin`

The public site contains the room selector, calendar, booking request form, booking-status lookup and payment-return pages. Sensitive payment, admin and iCal logic remains server-side in Supabase and is not stored in this repository.

## Production deployment rule

`main` is the **production branch**. Netlify should deploy production only from `main`.

Future changes must be collected on one temporary working branch, for example:

`work/2026-09-booking-ui-improvements`

Finish and test the whole batch on that branch. Only merge to `main` when the batch is ready to publish. The merge to `main` should be the single production Netlify deployment.

To save Netlify build/deploy credits, disable automatic branch deploys and deploy previews unless a preview is intentionally required.

See `DEPLOYMENT.md` for the exact workflow.

## Netlify settings

- Production branch: `main`
- Build command: none
- Publish directory: repository root (`.`)

`netlify.toml` contains the clean URL redirects and no-index headers for admin/status/payment pages.

## Security

Only browser-safe Supabase configuration belongs in the repository. Stripe secret keys, Supabase service-role keys, webhook secrets and private Airbnb iCal feed URLs must remain outside GitHub.
