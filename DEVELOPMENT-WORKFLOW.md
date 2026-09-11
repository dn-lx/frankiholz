# FrankiHolz development and deployment workflow

## Branch model

- `main` — production only. Netlify deploys this branch to `https://accommodation.frankiflow.de`.
- `develop` — integration/staging branch. GitHub Pages deploys this branch.
- `feature/*` — normal product work. Always create from `develop`, then open a PR back to `develop`.
- `fix/*` — normal fixes. Create from `develop`, then PR back to `develop`.
- `hotfix/*` — emergency production-only fixes. Create from `main`, PR to `main`, then merge the same fix back into `develop`.

## Normal feature flow

1. Start from the latest `develop`.
2. Create `feature/<short-name>` or `fix/<short-name>`.
3. Implement and review the change.
4. Open a pull request into `develop`.
5. Merge into `develop` only after approval.
6. GitHub Pages automatically deploys the updated staging frontend.
7. Test staging.
8. When a release is ready, open a PR from `develop` to `main`.
9. Merge to `main` only after explicit production approval.
10. Netlify automatically deploys `main` to `accommodation.frankiflow.de`.

## Staging safety

The GitHub Pages staging build is deliberately different from production:

- Stripe is forced to **TEST** mode in the generated staging artifact.
- The staging site displays a visible `STAGING · Stripe TEST mode · No real payments` banner.
- The production admin console is disabled on the GitHub Pages staging host because staging currently shares the production Supabase project. This prevents accidental changes to live rooms, pricing, availability, content and payment settings.
- Search engines are blocked with `robots.txt`.
- Production source files are not modified by the staging build. These safeguards are applied only to the generated `_site` artifact.

If full admin/backend staging is needed later, create a separate Supabase development project/branch and point the staging build to it.

## GitHub Pages

The workflow is `.github/workflows/deploy-staging-pages.yml` and runs only for `develop` (or manual dispatch while on `develop`).

The expected project-page URL is:

`https://dn-lx.github.io/frankiholz/`

Because GitHub project Pages is hosted below `/frankiholz/`, `scripts/build-pages-staging.py` rewrites root-relative URLs and creates clean-route directory aliases for `/booking-status`, `/payment-success` and `/admin`.

### One-time repository setting

In GitHub, open:

`Repository → Settings → Pages → Build and deployment → Source → GitHub Actions`

This one-time repository setting must be enabled before the first Pages deployment can succeed.
