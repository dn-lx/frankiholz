# Project Memory — FrankiHolz

## Identity

FrankiHolz is the accommodation/booking product in the FrankiFlow Projects family.

## Durable rules

- GitHub is the engineering source of truth.
- `develop` is the development integration branch; `main` is production.
- Feature/fix/chore branches merge into `develop`, never directly into `main`.
- Keep the current static HTML/CSS/browser JavaScript architecture unless a migration is explicitly requested.
- Branch isolation does not isolate shared Supabase data, payments or email. Treat external writes as potentially live/shared unless verified otherwise.
- Preserve admin authorization, server-owned payment decisions, guest-data handling, escaping/translation behavior and security checks.
- Use mocked/offline verification when possible; real booking, payment and email actions require explicit authorization.
- Runtime secrets and credentials never belong in source control.

## Read before specialized work

- Project skill: `.agents/skills/frankiholz/SKILL.md`
- Payment Flow Review for Stripe/booking-payment state
- Email Safety Review for transactional email
- Security Boundary Review for auth/Supabase/storage/guest data
- Release Workflow and Quality Gates before merges/releases
- `PROJECT-FAMILY.md` and `docs/AGENT-ORCHESTRATION.md`

## Continuity rule

Durable product/architecture decisions belong here, in ADRs, or in Agent Skills. Temporary task state and external side effects belong in `docs/CURRENT-HANDOFF.md`. Chat/session memory is supplementary only.
