# Observability and Sentry activation — frankiholz

The repository contains privacy-safe Sentry browser scaffolding in `observability/sentry-browser.mjs`, but **Sentry is not considered active until an actual Sentry project/DSN and SDK loader are connected and a test event is verified**.

## Activation

1. Create/select the Sentry project for this application.
2. Use Sentry's official JavaScript Browser SDK/Loader for the deployment.
3. Provide the public DSN through deployment/runtime configuration. Do not commit Sentry auth tokens.
4. Load the Sentry SDK before calling `initSentryBrowser(...)`.
5. Pass an explicit environment such as `develop`, `staging` or `production` and a release identifier.
6. Send one synthetic non-sensitive test error and verify it reaches the correct Sentry project.
7. Review Sentry's data-scrubbing/PII settings before production activation.

Example after the official SDK is available:

```js
import { initSentryBrowser } from './observability/sentry-browser.mjs';

initSentryBrowser({
  dsn: window.__SENTRY_DSN__ || '',
  environment: window.__APP_ENV__ || 'unknown',
  release: window.__APP_RELEASE__ || ''
});
```

## Privacy rules

- `sendDefaultPii` remains disabled.
- Do not attach message bodies, booking details, mail content, customer addresses, authentication tokens, payment details or other sensitive records to Sentry events.
- The local scaffold filters common sensitive field names as a second layer; it is not a substitute for Sentry project-side scrubbing.
- Session Replay must remain disabled unless separately reviewed for the application's privacy risk.
- Sentry DSNs are client identifiers; Sentry auth tokens and upload credentials are secrets.

## Operational use

Once activated, tag releases/environments so errors can be tied back to GitHub changes. The Daily Improvement report may use aggregate Sentry signals later, but must not ingest raw user content.
