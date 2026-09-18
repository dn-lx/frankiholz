# Documentation Policy — FrankiHolz

## Source of truth

GitHub is the canonical development documentation store. Current source code, tests, accepted ADRs and maintained repo docs override historical Google Drive notes.

Shared historical FrankiFlow ecosystem Drive documents were imported to `dn-lx/frankiflow/docs/family/legacy-drive/` on 2026-09-18. They are reference snapshots, not live truth.

## What must stay current

Update documentation whenever a change affects architecture, routes, APIs/contracts, environment variables, integrations, pricing/business rules, authentication/authorization, database schema, deployment, user-visible workflow, operational runbooks, agent tooling, or brand usage.

Tiny copy/style changes that do not alter behavior do not require architecture documentation.

## Daily maintenance

A deterministic GitHub workflow runs once daily and reports whether non-documentation changes occurred during the previous 24 hours without corresponding docs changes.

A separate AI documentation maintainer may then update the relevant docs on `develop`. It must inspect actual commits/diffs/tests first, update only documentation/skills/ADRs needed to reflect reality, never invent system behavior, never copy secrets into docs, never change application code as part of documentation maintenance, leave `main` untouched, and do nothing when there were no meaningful changes.

## Brand/document rule

Agents must reuse files under `brand/` and project static assets. Existing approved logos/icons must never be regenerated just to create a document or UI.
