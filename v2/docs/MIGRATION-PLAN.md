# Complete Next.js v2 migration

The owner requested the complete existing site on `v2`, with improved UI and motion, and explicitly prohibited merges. The existing remote v2 prototype is extended without rewriting history. The audited develop source is restored as the reference baseline on this branch; backend contracts and approved artwork remain authoritative. Main and develop are untouched.

Next.js App Router, strict TypeScript and React provide the application routes. Supabase's bundled browser SDK retains server-owned authorization, prices, availability and payment transitions. Motion adds restrained section entrances and modal/menu transitions. Approved local fonts and image derivatives preserve privacy and brand quality. Native dialogs and semantic controls support keyboard access; reduced motion removes decorative transitions.

## Implementation sequence

1. Pin compatible framework/runtime dependencies with a dedicated v2 lockfile. Preserve the current audited static app at the repository root.
2. Port all public content, Admin-managed bilingual copy, real review summaries, section ordering, galleries, house guide/PDF and click-to-load map into React.
3. Complete booking calendar, quote/promos, profile, request email and payment/status/recovery routes against the current API contracts.
4. Complete authenticated Admin room/media, requests, calendars, pricing, content, SEO, host, layout, feed and payment-environment tools.
5. Preserve legacy `.html` links and query strings. Build the production application; verify meaningful mocked guest/Admin flows in Chromium and WebKit, mobile layouts, accessibility, dependency/secret/security gates and independent review.
6. Push tested checkpoints only to v2 for the owner's Netlify branch deploy. No merge, production deploy, backend mutation, real booking, payment, refund or email is included.

The risk is high because booking/payment/guest data and authorization cross the frontend boundary. The server continues to enforce those decisions. Tests intercept provider traffic and never exercise shared backend writes. A build or mock test does not certify the deployed Supabase database or provider integration. Roll back a v2 checkpoint by reverting its commit on v2; main/develop are unaffected.
