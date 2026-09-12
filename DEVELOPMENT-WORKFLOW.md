# FrankiHolz development and deployment workflow

## Branch model

- `main` — production only. Netlify deploys this branch to `https://accommodation.frankiflow.de`.
- `develop` — integration/staging branch. ShipStatic deploys this branch to `https://staging.accommodation.frankiflow.de`.
- `feature/*` — normal product work. Always create from `develop`, then open a PR back to `develop`.
- `fix/*` — normal fixes. Create from `develop`, then PR back to `develop`.
- `hotfix/*` — emergency production-only fixes. Create from `main`, PR to `main`, then merge the same fix back into `develop`.

## Normal feature flow

1. Start from the latest `develop`.
2. Create `feature/<short-name>` or `fix/<short-name>`.
3. Implement and review the change.
4. Open a pull request into `develop`.
5. Merge into `develop` only after approval.
6. ShipStatic automatically deploys the updated staging frontend.
7. Test staging at `https://staging.accommodation.frankiflow.de`.
8. When a release is ready, open a PR from `develop` to `main`.
9. Merge to `main` only after explicit production approval.
10. Netlify automatically deploys `main` to `https://accommodation.frankiflow.de`.

## Staging safety

The ShipStatic staging build is deliberately different from production:

- Stripe is forced to **TEST** mode in the generated staging artifact.
- The staging site displays a visible `STAGING · Stripe TEST mode · No real payments` banner.
- The production admin console is disabled on the ShipStatic staging host because staging currently shares the production Supabase project. This prevents accidental changes to live rooms, pricing, availability, content and payment settings.
- Search engines are blocked with `robots.txt` and `noindex,nofollow` metadata.
- Production source files are not modified by the staging build. These safeguards are applied only to the generated `_site` artifact.

If full admin/backend staging is needed later, create a separate Supabase development project/branch and point the staging build to it.

## ShipStatic staging

The workflow is `.github/workflows/deploy-staging-shipstatic.yml` and runs only for `develop` (or manual dispatch while on `develop`).

The workflow:

1. builds the staging-safe `_site` artifact with `scripts/build-staging.py`,
2. verifies that Stripe is locked to TEST mode,
3. deploys `_site` using `shipstatic/action@v2`,
4. links the deployment to `staging.accommodation.frankiflow.de`, and
5. prints the DNS records required by ShipStatic so they can be configured in IONOS.

GitHub repository secret required:

`SHIP_TOKEN`

For custom-domain linking, `SHIP_TOKEN` must contain a ShipStatic API key (`ship-...`). A deploy token (`deploy-...`) can upload deployments but cannot link a custom domain.

## Production

Production remains completely separate from staging:

- branch: `main`
- host: Netlify
- domain: `https://accommodation.frankiflow.de`
- Stripe: normally LIVE, controlled through the FrankiHolz admin payment-environment setting

A merge into `develop` must never deploy production. A merge into `main` is the production release point.
