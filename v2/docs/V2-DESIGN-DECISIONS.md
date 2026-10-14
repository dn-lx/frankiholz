# FrankiHolz v2 design decisions

## Direction — editorial, warm, distinctly FrankiHolz

Avoid generic SaaS cards and templated booking-grid repetition. Prefer photography, expressive Georgia display typography and strong side-by-side editorial sections. The experience should feel like a small, personally hosted property rather than a marketplace. Deep teal anchors the visual identity, with subtle sage and wood contrasts from approved brand guidance.

## Motion contract

- The hero and individual sections enter once as readers progress; Motion controls transforms/opacity and intentional review continuity.
- Room cards scale photography slightly on hover while buttons remain immediately usable.
- Booking panel uses a single interruptible spring entrance; close via button, backdrop or Escape.
- Mobile menu animates height/opacity but navigation remains keyboard accessible.
- Reduced-motion users receive static states and have no forced autoplay.
- Avoid scroll-jacking, large motion parallax, cursors, high-frequency decorative loops or animation-dependent content.

## Visual QA rubric

1. Hero at desktop 1440, tablet 820 and mobile 390: no clipping or horizontal scroll; logo preserved.
2. Section rhythm: alternating photographic and calm sections, comfortable but not oversized gaps.
3. Room cards: live photos when available, clear room details and real server-provided prices; loading and empty states.
4. Booking drawer: sufficient tap sizes, actual blocked-night/checkout-only distinction, selecting/deselecting dates, form required fields, payment warnings.
5. Admin: desktop persistent sidebar, mobile drawer, protected loading/login/error states, safe Stripe warning, bulk images.
6. Accessibility: visible focus, labelled actions, sufficient color contrast, complete reduced-motion flow.
7. No private API keys or guest data in frontend output; no security bypass.

## Deferred from the experimental build

Before any public rollout, conduct controlled end-to-end sandbox bookings and verify Admin API operations in an authorized session. Supabase backend is shared with production and cannot be treated as mock data. Legal pages must be completed. Payment gateway onboarding may still be in progress.

No branch merge or production deploy is part of creating v2.
