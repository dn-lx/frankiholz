# Current Handoff

## Website audit fixes — 2026-10-23

- Follow-up owner authorization: fix the audit findings. Work is on `fix/website-audit-20261023` from develop `932e5b19`; the fixes target develop, with production still subject to the develop → main release contract. Operator details supplied by owner: Inura Devasurendra, Seehofstraße 20, 60594 Frankfurt am Main, info@frankiflow.de.
- Both Stripe webhook handlers now propagate database failures, defer acknowledgement until accepted email handoff, and safely replay already-applied setup/payment/legacy states. Independent review found and helped fix concurrent setup/legacy acknowledgement races. Maintained payment/email tests: 81 passed, including 36 new recovery/race cases; the four original audit failure assertions also pass. No provider/database/money actions were performed.
- Booking guest count survives language changes; duplicate submits are locked before awaiting payment mode and recover on failures; full cancellation terms are translated; payment/status use Admin-managed contact. Contrast is corrected and serious accessibility checks cover six page types at mobile/desktop sizes. Legal/privacy pages use owner-supplied identity; Google Maps requires a click; Inter is self-hosted; approved image derivatives reduce public transfer sizes without changing originals.
- Vulnerable LHCI wrapper replaced by pinned Lighthouse13.5; full npm audit is clean. Frozen installs and maintained webhook regressions are wired into CI; removed an unused corrupt binary workflow stub outside .github. Semantic SQL content is unchanged (one trailing blank line removed).
- Chromium regression validation and independent frontend/security review passed. Native bundled Chromium/WebKit/iPhone/iPad tests use `/workspace/setup/playwright-native.config.mjs` locally; the wrapper uses verified Debian13 userspace libraries, with no verification disabled. Consult the fix PR for final full-matrix and CI results. Runtime helpers are outside Git and retained in the cloud workspace.
- Backend deployment and real database/RLS/SQL tests still need a Supabase management connection. Existing credential names were checked; SUPABASE_ACCESS_TOKEN was absent. Added a personal token requirement scoped to api.supabase.com in environment settings; never enter it in chat. Saving requirements does not deploy or publish. Before deployment, inspect existing JWT flags/function versions and preserve them; deploy both webhook handlers and validate TEST recovery before claiming production fixes active. Do not merge main while these release prerequisites remain unresolved.

## Website audit — release deferred — 2026-10-23

- Owner requested an audit and a merge into main only if everything passes. Audited develop `932e5b19fa5c3d57f96a250c421253764104c092` against main `d55df7448d31507fe2339ba9346ef4d57b7a6375` (17 candidate commits). Local branch `audit-develop`; no application changes, commits, pushes, PRs, deployments, real bookings, payments or email sends.
- Existing checks: 140 system-Chromium browser tests and 45 mocked backend tests passed; 43 JavaScript syntax checks and agent-stack validation passed. Expanded Axe found serious contrast issues across homepage/status/payment/admin login at desktop/mobile widths. Production npm audit clean; full development graph reports 11 high, 2 moderate, 2 low findings. Semgrep reported no ERROR findings but one legacy YAML parser error. Gitleaks found no secrets in pending commits; tree detection is the intended public Supabase publishable key.
- Release blocker independently reproduced: both Stripe webhook handlers ignore booking-read errors and failed-payment update errors, then log/acknowledge the event. Retry becomes duplicate while booking remains processing. Four actual-source fault-injection regression assertions fail (LIVE/TEST × read/write failure). See webhook lines 6, 36, 52. Their email helper also ignores endpoint HTTP errors after event finalization, allowing notifications to disappear before outbox insertion.
- Other confirmed findings: language switching resets guest count 2 to 1; rapid double-click dispatches two creation RPCs (persistent duplicates not proven); German cancellation policy remains English; new payment/status support links ignore Admin-managed contact. Public privacy/imprint links were not found. These require follow-up, not an assertion that the live backend was fully audited.
- Full report and repro artifacts: `/workspace/audit/FRANKIHOLZ-AUDIT-2026-10-23.md`. Full WebKit/mobile release matrix, eight SQL assertion files, deployed backend/RLS state, live site and GitHub CI/PR/protection remain unverified because required network/system/database access is unavailable. Required domain additions were saved to the environment configuration draft; saving does not apply/publish them. No credential values were requested.
- Decision: no merge; owner's passing-check condition is unmet. Next: fix webhook recovery/durable notification handling on a focused branch from current develop, carry the failure cases into maintained tests, obtain independent review, then finish UI/accessibility and full release verification. Any eventual production release must remain a same-repository develop → main PR with production-approved and passing required checks.

## Room picker and four guest promos — 2026-10-19 (in progress)

- Branch codex/room-picker-guest-promos from develop96adab9. Owner requests styled room dropdown and exact FrankFlowGuest25/50/75/100 codes. Added4 normalized server-owned codes; retained FrankiHolzGuest50/75. Positive discounted totals still require EUR0.50 minimum; 100% is a distinct complimentary/not_required state with no Stripe IDs/due dates/paid_at, pending host approval. Strong DB invariant prevents fake paid receipts.
- Reviewed rollout: all9 remote entrypoint/dependency sources matched HEAD baseline. Deployed setupLIVEv12/TESTv26, decisionv22 (verify_jwt=true preserved), cancelv4/emailv33 (verify_jwt=false preserved). Added shared complimentary helper; keyless host approval/rejection and guest cancellation, no Stripe operations or payment emails. Then applied migration guest_discount_codes. Independent promo_security_review found no backend blockers, reran22 mocked tests successfully.
- Full migration+SQL assertions rehearsed BEGIN/ROLLBACK: four discounts/snapshots, free pending-confirm-cancel, availability conflicts, invalid/minimum rollback, service-only grants and forged paid_at denied. No persistent fixture/booking/email/charge created. Browser tests in progress; room dropdown styled combobox/listbox retainsnative fallback, thumbnails/prices/keyboard and mouse focus fix; finalCI/PR/merge pending. Existing rates/overrides/bookings untouched.


## Completed Airbnb sync/UI rollout — 2026-10-19

- PR60 https://github.com/dn-lx/frankiholz/pull/60 merged to develop as 96adab9fcc7a929dab18e209074f295cb545ab51 after all required workflows passed on bb09c9e968592370d65c087a6f142fb334a23863. Browser CI156 passed (78 Chromium +78 WebKit),15 mocked payment checks; security/secrets/dependencies/Lighthouse/agent stack green. Local checkout develop; main unchanged.
- Independent reviewer cleared final RPC and bidirectional feed-save/sync serialization. New RPC migration applied; anonymous EXECUTE denied, authenticated calls still check private.frankiholz_is_admin. Security advisor's new authenticated-definer notice is expected for this admin-checking RPC; baseline unrelated notices unchanged. SQL rehearsal tested override, import persistence, narrow reset, preservation of other columns/range, confirmed reservation protection, invalid range and nonadmin denial under full rollback. No fixture persisted.
- Deployed built-in-browser Admin tab24 at08:30CEST performed actual Sync all: all3 succeeded,39/364/340 imported nights (743 total). New labels/summary distinguish overrides; Room1 October8 imported dates all explicitly available here. Existing27 total manual overrides preserved. Did not change real availability, bookings, payments or feed URLs. Remote sync Edge Function remainsv31 unchanged; original sync worked but overrides hid imported blocks.
- Deployed all3 room editors verified details above photos, equal full widths823.47px, no horizontal overflow. Evidence outside Git in current visualization directory: airbnb-sync-deployed.png, room-details-above-photos.png, airbnb-override-controls.png. Tab24 left on new override controls and marked deliverable. Original user Admin tab10 was not reloaded; its unsaved inputs preserved. Local preview4180 stopped. This completion handoff remains uncommitted.


## Airbnb calendar clarity and room layout — 2026-10-19 (in progress)

- Branch codex/airbnb-calendar-room-layout from develop2844d13. Live read: all3 Airbnb feeds successfully synced; 39/364/340 imported dates and Room1 27 manual overrides explain apparent non-sync. Existing overrides must remain until owner explicitly selects reset. No private feed URLs fetched into source/logs.
- Added Admin-only RPC frankiholz_set_airbnb_availability, applied reviewed migration airbnb_availability_controls successfully. True affects only Airbnb-blocked selected dates, skips confirmed reservations under room lock; false clears only admin_available_override/timestamp in selected range. Existing general Make available contract unchanged. Migration+SQL assertions first passed inside BEGIN/ROLLBACK; no persisted booking/fixture/email/payment. Independent payment_options_review found no SQL/security blockers; sync link-replacement race fixed by disabling/guarding feed replacement during sync.
- UI changes staged locally: full-width details above photos, explicit override labels/legend/monthly counts, perroom sync, count/error reporting, confirmed-night display even if old broad override cleared booking link. 15 focused Chromium checks passed. Full Chromium and final race test pending, CI/PR/merge pending. New RPC applied but no real availability overrides changed by agent. Existing sync Edge Function v31 unchanged.


## Completed UI audit deployment — 2026-10-18

- PR58 https://github.com/dn-lx/frankiholz/pull/58 merged into develop as 2844d1310a5ac71017c9295a973f7f8a8df46311. Local checkout develop. All four required workflows succeeded; final browser CI 138 cases (69 Chromium + 69 WebKit), plus 15 mocked financial checks. Security, Lighthouse and agent stack green. Main unchanged.
- Deployed Admin verified newest received first with Europe/Berlin timestamps, Refresh requests and wrapped unbroken messages; no horizontal overflow. Existing database has 14 total requests, all already removed by owner/external state (active0). Used Show removed requests to inspect; did not remove, restore, cancel, charge or refund any request.
- Deployed homepage verified all three photo/placeholder covers250px and aligned card action bottoms. Normal deployed payment lookup verified no new bank-transfer offer; card/wallet/SEPA Direct Debit path retained. Existing bank transfer reconciliation remains supported. Temporary EUR0.45 payment inspection tab closed without creating a setup or charge. LIVE remains configured; setup functions live v11/test v25 ACTIVE.
- Evidence outside Git: C:/Users/dasha/.codex/visualizations/2026/10/18/01a14ec4-b9ac-7dc0-b23a-78974256ef31/admin-ui-audit-deployed.png. Deployed Admin tab21 and homepage tab20 marked deliverable. Local preview server4180 stopped. This completion handoff update is intentionally uncommitted.
## Public/Admin UI audit and bank option removal — 2026-10-18

- Branch codex/booking-ui-audit from develop8bff8ca; owner requested received-time ordering, wrapping, no new bank transfers, broader homepage/Admin alignment audit. Existing source already sortedcreated_atDESC but displayedchargedue; now stablecreated_at/idDESC, visible Received Europe/Berlin timestamps, Refresh requests withfirst-errorrecovery/stale-readguard. Cards separateidentity/time/badges/stay/contact/message/actions. Longunbrokenstringswrap, message newlinepreserved.
- AuditedfiveAdminsections andpublichomepage/booking at360/768/1280; fixedgridminwidth, checkalignment/layout, 44labelassociations plusCMSlabel.htmlFor, IntegrationshiddenStripecheckboxescapingviewport; securitymodeconfirmbehavior preserved, stalecapturewordingcorrected. Public/Admin cacheversionsbumped. docs/UI-AUDIT-2026-10-18.md recordsfindings.
- Banknewoffer removed frompaymentpage; onlyconditionalexistingtransferinstructionsremain. Both setupfunctions nowrejectnewbankselections andbankrecordswithoutPI, whileexistingbankPI canstillretrieveinstructions. AllotherdynamicStripeoptionsincludingSEPADirectDebitkept. NoStripeDashboardsettingschanged. Local andremoteentrypointcompared beforedeployment: onlynewguarddelta, depsunchanged. LIVEsetupv11 andTESTsetupv25 ACTIVE preservingverify_jwt=false andownref/email+originchecks. Existingbankwebhook/refunds/audituntouched.
- Local fullChromium68 passed +15mockedfinancialchecks includingnewtransferdenialandexistingreuse; latestsmallcleanupremovesunusedtranslationkeys andduplicateexistingtransfernote. Independentreviewpayment_options_review foundnoremainingblockers afterrefreshfix, independentlyreran15mockedtests. RequiredCI/WebKit andPRmerge stillpending. Noactualbooking/charge/refund/deletion createdforUIverification. ExistingliveGooglePay+Linkreceiptsremainasbelow.


## Google Pay real LIVE receipt verified — 2026-10-18

- Owner performed host confirmation for FH-C3B4A1CF (Room1 Oct26–27 EUR0.50). Fresh DB16:10:11UTC: LIVE/confirmed/paid, paid_at15:51:49.842UTC, PI pi_3URwNCJklkLgsTvy1KNu5jJM, no operation lock. No agent financial action performed.
- Built-in Stripe tab19 actual PI detail explicitly Successful EUR0.50, description/referenceFH-C3B4A1CF, live metadata, succeeded event17:51:47EuropeBerlin; latest charge ch_3URwNCJklkLgsTvy1H1peiEk. Expanded charge payment method explicitly Wallet Google Pay. FeeEUR0.26, netEUR0.24; dashboard funds-available date25Oct02:00, no payout-to-bank claim. Screenshot google-pay-live-received.png saved outsideGit. Tab19 marked deliverable.
- Fully verified real receipts now Link FH-FDA57E4E + GooglePay FH-C3B4A1CF, EUR0.50 each. Bank FH-0B21A2A9 latestDB still LIVE/pending/awaiting_payment/paid_atnull. Do not resend transfer. Other offered methods not yet proven by live settlement.
- Cleanup outstanding: two confirmed/paid synthetic bookings now reserve Room1 Oct21 and Oct26 nights. Any real refund remains owner-operated. No paid audit records deleted; opening dates via Admin Make available would not itself cancel/refund these reservations. Room baseprices remainEUR0.50 by owner instruction.


## Google Pay LIVE setup verified — 2026-10-18

- Owner completed Google Pay setup for FH-C3B4A1CF. Fresh DB at15:08:57UTC: live/pending/payment_method_saved, totalEUR0.50, no paid_at, no PI, operation unlocked. Saved PM pm_1URvfaJklkLgsTvyIdU4fs7Y; SetupIntent seti_1URvYiJklkLgsTvyINhKUTNc.
- Stripe built-in browser customer cus_VSqiR4PzchO5V4 explicitly shows wallet google_pay on saved PM and no payments. Linked live SetupIntent page shows Successful / Setup intent succeeded at17:06:44EuropeBerlin, metadata referenceFH-C3B4A1CF, mode live. Payment-success frontend also correctly states saved, not charged. No full card data accessed; do not reproduce billing details from expanded PM panel.
- New signedAdmin tab17 refreshed and scrolled to exact FH-C3B4A1CF row, pending/payment method saved, Confirm booking button visible. Asked OWNER to click Confirm booking and accept prompt to initiate realEUR0.50 charge (Oct26 arrivalwithin14days); agent did not perform financial confirmation. Next verify actual PI succeeded, wallet google_pay and matched amount/ref in Stripe plus paid webhook DB. Saving alone is not money receipt.
- Stripe tab19 now live SetupIntent detail, marked deliverable. Admin17 marked handoff, payment-success16 deliverable, bankPI13 handoff, previousLinkreceipt2 deliverable. Evidence google-pay-setup-succeeded.png and google-pay-host-confirmation.png saved in session visualization directory.


## Deployed payment page and Admin controls — 2026-10-18

- PR57 https://github.com/dn-lx/frankiholz/pull/57 merged into develop as 8bff8cae6b1821c8212cf527f54c15afbf95fe7d. Local checkout develop. All required CI succeeded on head2859a07: 114 Chromium/WebKit cases +13 mocked financial-state/email tests; security, Lighthouse and agent-stack green. Main unchanged.
- Reviewed migration admin_availability_payment_page applied successfully. Backend live reverified; actual anonymous-role wrong-email lookup denied and anon removal EXECUTE=false. SQL rollback verifies environment snapshot, overriding confirmed/iCal night, quote/create/host confirmation consuming override, third overlap rejection, original booking protection on replacement cancellation, remove/restore. Actual frankiholz_replace_ical_blocks RPC also rehearsed under rollback and preserves admin override. No existing dates/requests reopened/removed by agent.
- Deployed payment.html verified against actual live FH-C3B4A1CF in EN/DE. New page has no card-number fields; booking details collapse after lookup; saved-method action opens real Stripe dynamic chooser; bank action opens hosted instructions. Deployed Admin verified all14 current requests selectable, master checkbox18px and centered; no delete submitted. Every removal is reversible list removal; reservations, scheduled charges and financial/email records remain ACTIVE unless separately cancelled/refunded.
- Deployed bank action for existing FH-0B21A2A9 reused exact same live PI pi_3URupjJklkLgsTvy1eOM7VsQ and instructions/reference. Owner says EUR0.50 sent; latest Stripe browser14:56UTC still incomplete/awaiting bank transfer; DB pending/awaiting_payment/no paid_at. Do not resend or claim receipt. Earlier actual Link EUR0.50 receipt below remains the only fully verified settlement.
- Open LIVE Stripe tab16 now uses same booking FH-C3B4A1CF but new setup session after previous session was abandoned: cs_live_c1nVcYkWHb0PeVjSfz1IgkLJLwmb5eRGrQvvKXd4KoZYUlhQTJXaN8Tet2. DB live/pending/awaiting_payment, no PI/charge. Deployed new saved-method action verified. More methods expanded: Card, Klarna, GooglePay, SEPA Direct Debit, Bancontact, Satispay; ApplePay/AmazonPay/Link express visible. No Save clicked. Asked owner to complete another method directly and tell which; then inspect saved-method webhook, owner-operated host approval, actual receipt. Other methods still require owner/device/account authentication and real settlement checks; forms alone are not successful payments.
- Browser survivors: original usertab1 untouched; tab2 actual successful Link receipt deliverable; tab8 updated homepage deliverable; tab10 user Admin untouched (may need refresh); tab13 live bank PI markedhandoff; tab14 owner-navigated homepage preserved; tab16 livechooser markedhandoff; tab17 NEW updated signed Admin deliverable. Bank instructions verificationtab18 and docstab15 closed. Local previewserver4180 session56161 can stop; no background monitoring scheduled.
- Evidence outsideGit in session visualization directory: payment-options-deployed.png, admin-request-controls-deployed.png, live-payment-chooser-deployed.png. Existing logo PNG decodes as invalid/truncated in local repo; new page uses plain FrankiHolz company-name link, no invented mark. Existing old logo issue not broadened into unrelated changes. Room base rates stillEUR0.50 by owner instruction; original restore values below remain valid.


## Payment page, Admin override and removable requests — 2026-10-18

- Branch codex/payment-options-page based on develop 7744600. Owner clarified all financial exercises are real LIVE: new-booking setting verified live; never convert existing initialized TEST records. Bank transfers sent promptly before host approval; cards saved without a funds hold and charged after approval at 14-day due date. PayPal remains deferred.
- Implemented payment.html/assets/payment.js: no booking-form dropdown; request navigates to payment step, then saved-method action opens actual dynamic Stripe chooser, bank-transfer action opens hosted instructions. Server-priced/mode-snapshotted; ref/email lookup, session-scoped email, no email in URL, redirect allowlist, terminal-state guards and BFCache refresh. Status retries route through this page.
- Admin Make available now stores explicit server-side per-night override across confirmed-booking/iCal blocks; Admin/public calendar/quotes/create/confirmation agree. Original reservation/payment unchanged; new confirmation consumes override. New migration 20261018170000_admin_availability_payment_page.sql not applied yet. Two rollback rehearsals passed authorization, original reservation protection, override/quote/create/confirm, third-request rejection, restore. Sync-airbnb v31 reads/writes iCal blocks only, not calendar override rows.
- Every request can be reversibly removed from active Admin list via admin_deleted_at RPC, with Show removed requests + Restore. Explicit UI warns reservations, scheduled charges and money remain active; no cancellation/refund/deletion of financial records. Checkbox width18px and aligned. Old permanent-delete endpoint remains restricted/unchanged, not called by new controls.
- Independent payment_options_review reviewed migration/Admin and payment UI: no security blockers; fixed missing SQL semicolons, initial environment snapshot, BFCache recovery and stale status-link reference. Local full Chromium55 passed before last two recovery tests; focused13 running. Mocked payment13 passed. Required CI/security/WebKit pending.
- LIVE FH-0B21A2A9 EUR0.50 bank transfer: owner reports sent; Stripe browser latest still incomplete/awaiting bank transfer, DB live/pending/awaiting_payment/no paid_at. Do not resend or claim receipt. PI pi_3URupjJklkLgsTvy1eOM7VsQ. Earlier FH-FDA57E4E EUR0.50 Link receipt confirmed as below.
- Additional LIVE method inspection booking FH-C3B4A1CF Room1 Oct26–27 EUR0.50, no saved method/charge. Same live session re-opened (no duplicatebooking): cs_live_c17FByOXVjaSadfsqpgW3RSur4tOTDM6PN0R2AMrT4qxB0WlwxhDd602qo. Card/GooglePay/Klarna/SEPA Debit/Bancontact/Satispay forms opened; ApplePay/AmazonPay visible. Only Link actually settled so far. Other providers need owner/device/account authorization; no final financial actions by agent.


## Verified LIVE receipt and develop rollout — 2026-10-18

- PR #56 merged into develop as 77446005c3d7d3c847cd2a430334418a1879223a after all four workflows passed (82 Chromium/WebKit browser checks, 13 mocked payment tests). Local checkout is develop. Main unchanged. Reviewed additive async-payment migration and ten Edge Functions deployed; existing JWT settings preserved; final setup live v10/test v24. Both LIVE and TEST webhooks now retain six original events plus six bank/refund events (12 total).
- Deployed develop UI verified: yellow gateway notice removed everywhere, promo button at same y/height as input in EN/DE, 17:00/11:00 rules displayed. Proof booking-notice-removed.png in session visualization directory.
- VERIFIED real LIVE receipt for FH-FDA57E4E (Room1 Oct21–22 EUR0.50): owner saved payment method and performed host confirmation. DB fresh query at14:16:41 UTC shows confirmed/paid, pi_3URusbJklkLgsTvy1s8eA1FJ, paid_at14:16:09.701 UTC, no operation lock. Ledger has setup completion and payment_intent.succeeded evt_3URusbJklkLgsTvy1gNkIbPh. Stripe live detail visibly shows Successful EUR0.50, Link method, matching FrankiHolz reference, feeEUR0.26/netEUR0.24. Earlier pending read occurred before completion; no duplicate retry/charge was made. Proof live-payment-received.png saved outside Git. No payout to owner bank claimed.
- Hosted Checkout visibly offered cards, Apple Pay, Google Pay, Link, Amazon Pay, Klarna and SEPA Debit, plus additional methods. Only this card/Link payment has verified real settlement. SEPA Debit dashboard previously showed approval pending; appearance does not prove live debit settlement. PayPal deferred.
- Actual bank-instruction E2E passed for FH-0B21A2A9, Room2 Oct27–28 EUR0.50, explicit internal/no-stay synthetic profile, owner business email. Stripe hosted instructions show EUR0.50, correct reference and SEPA Instant note. DB pending/awaiting_payment/bank_transfer, one PI, no lock; no host approval or dates reserved. No bank funds sent/received. Owner-operated bank transfer needed to verify settlement.
- Cleanup outstanding: FH-FDA57E4E is a confirmed/paid synthetic booking reserving Room1 Oct21 night. Owner must operate any refund; then cancel normally to free dates, preserving audit. FH-0B21A2A9 awaits transfer or normal cancellation. All three shared base rates remain EUR0.50 by owner instruction; restore originals using guarded instructions below after tests. Do not overwrite owner changes.
- Browser: user tab1 preserved; tab2 live Stripe payment receipt marked deliverable; tab7 live bank instructions marked handoff; tab8 updated develop homepage marked deliverable; signedAdmin tab10 /admin marked handoff. Temporary tabs3 TEST webhook,4 Supabase code,9 unsigned duplicate Admin can close. All Stripe activity browser-only. Session screenshot directory C:/Users/dasha/.codex/visualizations/2026/10/18/01a14ec4-b9ac-7dc0-b23a-78974256ef31. This continuity update remains uncommitted after merged PR.

## In-progress payment options and booking UI — 2026-10-18

- Branch `fix/booking-payment-options-20261018` from develop. PR #56 targets develop; awaiting checks/merge. Reviewed migration and all ten payment/email/admin function deployments succeeded (existing JWT settings preserved). Working tree includes imported current Edge Function sources plus shared helpers, service-only operation/confirmation SQL, mocked payment tests and UI changes. Preserve earlier handoff edits.
- Latest owner requirements: promo Apply button beside/aligned with input; payment-neutral CTA and as many eligible Stripe methods as practical; check-in 17:00 and checkout 11:00 on departure date; EUR/SEPA bank transfer instructions IMMEDIATELY on booking request BEFORE host approval; remove the entire obsolete yellow gateway warning (all 3 homepage instances + standalone status page).
- Editable `frankiholz_copy` rows fhCheckIn/fhCheckOut already updated and verified in shared DB to 17:00 / 11:00 in EN/DE; local guest-info defaults match. Stripe built-in browser shows Google Pay and bank transfers enabled; SEPA Direct Debit shows approval pending. Other enabled methods are filtered by Stripe for setup/currency/device. PayPal remains deferred.
- New bank flow uses stored `payment_collection_mode=bank_transfer`, server-owned EUR total, per-booking Stripe customer and one customer_balance PI; hosted transfer instructions returned immediately. Settlement keeps booking.pending; only host approval reserves dates. Partial/excess/late funds and cancelled transfer records remain marked for Stripe reconciliation and protected from deletion.
- New saved-method helper retains processing for asynchronous debits; SQL operation leases serialize setup/charge/cancel/host approval, never auto-expire uncertain Stripe outcomes. Unknown outcomes intentionally require manual reconciliation. Host confirmation/calendar reservation is atomic and checks conflicts.
- Independent reviewer `/root/payment_options_review` identified callback CAS, truthful pending-refund handling and unchecked reject DB writes; fixes implemented. Added refund_review_required + stripe_refund_id, refund callbacks and generic payment emails (no recipient/auth changes), provider idempotency headers per booking/event/audience. Final focused review found no further payment-state blockers; fixed its remaining admin-profile HTML escaping finding and added regression coverage.
- Tests: full Chromium 41 passed after notice removal (360/390/1280 widths, both languages, promo and bank selection). Mocked Node payment tests 13 passed, including refund, email escaping and setup/cancellation races. First CI run passed all WebKit and 39/41 Chromium; two new English mobile geometry tests measured during smooth scroll. Fixed measurement to capture both rectangles in one frame, preserving assertions; rerun CI.
- Migration `20261018133853_async_payment_methods.sql` + SQL operation assertions previously rehearsed under full ROLLBACK; verified function absent, columns absent and zero rollback fixture bookings afterwards. Final rehearsal including refund columns and operation assertions passed with full ROLLBACK. Additive migration now applied successfully; ten updated function deployments active.
- Existing shared booking audit: no confirmed LIVE bookings. Only scheduled TEST booking without PI is FH-4F907974, check-in 2027-04-01, charge due 2027-03-18; cron has never been due. Existing TEST paid booking has a PI. Do not run charge cron against shared data for tests.
- Next: finish final CI and merge PR #56 into develop. Reviewed additive migration and ten functions are deployed, preserving verify_jwt flags (decision/admin-delete true; setup/cron/webhook/cancel/email false with own auth). Small follow-up: prior Checkout is retrieved before switching to bank transfer; only open sessions expire, already expired sessions proceed. Redeploy setup functions for this helper change; live Stripe webhook updated in browser to 12 events (six retained + refund.created/updated/failed, payment_intent.requires_action/partially_funded, cash_balance.funds_available); verify corresponding TEST subscriptions before asynchronous TEST receipt tests; verify develop deployment and actual live checkout/bank instructions, then owner operates card entry/live charge or bank transfer. No receipt of funds has been proven yet.
- Browser runtime currently selected IAB. Tabs: 1 original develop user tab (preserve filled form), 2 Stripe payment-method settings; temporary 3 Stripe docs, 4 Supabase function Code, 5 Supabase SQL Editor, 6 Resend docs (temporary). Runtime handles liveStripe, supaWork, sqlWork, schemaEditor, taskFs, taskRepo. Browser tool list may show only user tabs while agent tabs remain accessible. All Stripe activity must remain in built-in browser.
- Original deployed Edge Function source backups outside Git: `C:/Users/dasha/.codex/visualizations/2026/10/18/01a14ec4-b9ac-7dc0-b23a-78974256ef31/payment-backend-before/`. No keys/card details in those files (runtime env references only). Supabase connector is now verified against correct project and available for deploy/read; Stripe connector is forbidden by user preference.

## Promo rollout and actual LIVE checkout handoff — 2026-10-18

- PR #55 merged into `develop` as `4fa4eefa0956c96c88fe328d4e8dafa5d4d877a8` after all four CI workflows passed (including Chromium/WebKit). Applied reviewed additive SQL migration through signed-in Supabase SQL Editor; verified success and persistent quote results. No production frontend merge.
- Verified deployed develop form: `FrankiHolzGuest50` on Oct 21–23 produces 1.00→0.50; `FrankiHolzGuest75` on Nov 7–11 produces 2.00→0.50. Server quote RPC results match. No promo booking or charge persisted during these quote checks.
- SQL Editor's Monaco `fill` only replaces the current textarea segment on a long document. Always click editor, Control+A, Backspace, then fill the complete query; verify the document before Run. Re-ran the full migration/assertions from an empty editor, including actual anon-role quote/create calls, with final ROLLBACK; passed. Verified helper/quote absent and zero promo columns before permanent migration.
- Owner explicitly requested actual LIVE E2E receipt verification. Created one authorized internal test booking through deployed FrankiHolz: reference `FH-FDA57E4E`, Room 1, check-in 2026-10-21, check-out 2026-10-22, total EUR 0.50, no promo. Profile explicitly synthetic/internal test; internal business contact used for automatic booking email. It reached actual `cs_live_` Stripe setup checkout. No card entered or Save/charge clicked by agent.
- Handed secure Stripe card entry/Save to owner and asked for FrankiHolz Admin sign-in. Next: verify webhook sets payment_method_saved, then owner performs host confirmation/live-charge step (within 14 days) and agent verifies actual succeeded live PaymentIntent, EUR 0.50, matching reference, webhook paid state and Stripe receipt/balance entry. Saving a card alone is not money received. Do not claim E2E payment success yet.
- Stripe onboarding advanced after owner filled identity; agent set statement descriptor `FRANKIFLOW FRANKIHOLZ` (short `FRANKIFLOW`). Payout-bank step still displayed mandate/SEPA agreement; asked owner to submit bank authorization, security and final onboarding. Setup checkout can open despite incomplete charges activation, so do not infer charges_enabled from a live session URL.
- Temporary shared room base prices remain EUR 0.50. Restore original prices after controlled tests using the guarded instructions below. The pending internal test booking must be cancelled/cleaned via the normal lifecycle after receipt verification, without deleting payment audit history.

## Server-owned promo implementation and LIVE E2E blocker — 2026-10-18

- New branch `feature/booking-promo-codes-20261018`: additive quote/create RPCs plus optional bilingual booking promo field. Codes `FrankiHolzGuest50` and `FrankiHolzGuest75` apply one 50% or 75% discount per booking; case/outer whitespace normalized, no stacking. No expiry/use limit specified by owner. Original price, canonical code, percentage and discounted total are snapshotted atomically on the newly created pending booking.
- Minimum discounted total is EUR 0.50; reject lower totals rather than silently overcharge. Deployed `frankiholz-charge-due` reads `total_price` but clamps cents to 50 and treats non-succeeded PaymentIntents as failures; do not enable asynchronous bank methods until that behavior and the webhook lifecycle are updated/tested.
- Read deployed v2 create/estimate/status SQL and charge worker via browser. Verified booking reference UNIQUE, booking RLS enabled/admin-only SELECT/UPDATE/DELETE policies, no noninternal booking triggers. Existing v2 RPC is retained; promo wrapper reuses its validation and updates only the new booking in the same transaction. Email hook recognizes the new RPC without changing recipient or provider behavior.
- Migration and SQL tests rehearsed through browser SQL Editor with final ROLLBACK; invalid code, both discounts, stored amount consistency, below-minimum rollback and privileges passed. No persisted test booking, email or Stripe object created. Independent security review found no blocking SQL issue; stale UI messages identified and fixed. Latest local Chromium calendar/payment/promo run: 13 passed. Local WebKit binary missing; require CI WebKit checks before merge.
- Owner explicitly requested actual FrankiHolz LIVE E2E and confirmation of receipt in Stripe. Rechecked Stripe browser: activation required/cards action required. Opened activation; it is blocked at representative identity form. Prefilled owner-supplied first/last name, email and phone only, no submission; DOB/private address unknown. Asked owner to complete identity/bank/security/final review in Stripe. Live card entry/charge remains owner-operated, then verify Stripe succeeded PaymentIntent and booking reference, amount and webhook booking state. Do not claim payment receipt until observed.
- No additional payment methods enabled. PayPal remains deferred. All three EUR 0.50 room base rates are currently shared/live; originals/restoration instructions below.

## Authorized temporary test rates and promo names — 2026-10-18

- Owner explicitly repeated changing all three room prices to EUR 0.50 for testing, and named codes `FrankiHolzGuest50` / `FrankiHolzGuest75` (50% / 75% off). Codes not yet implemented.
- Via signed-in Supabase SQL Editor, verified project `bdeajozhylypiidrldka` and updated ONLY the three known room `base_price` values, guarded by their original prices; RETURNING confirmed 3 rows at 0.50. Calendar overrides and existing bookings unchanged. Shared backend means production also sees these base rates; informed owner.
- Restore after testing, guarded by current base_price=0.50: room `2facc875-9470-4b12-9b28-cd65b7360b14` to 37.00; `3c2220b3-59df-4447-851d-9719a2a45574` to 40.00; `4474d731-7428-4dea-b03b-768b98d65f18` to 38.00. Do not overwrite subsequent owner edits.
- A EUR 0.50 total with either discount is below Stripe's minimum; use a larger total for real discounted charge tests or reject under-minimum discounted checkouts clearly.
- Supabase browser is authenticated. FrankiHolz Admin still shows login even after refresh; no credentials supplied or retrieved. Stripe remains browser-only.

## Inter typography and payment-method scope — 2026-10-18

- Font PR #54 merged into `develop` as `0bbf5419bf41fcaada990e904ee4d12a9241d64c` after Chromium/WebKit, security, Lighthouse and agent-stack checks passed. Verified deployed develop body/headings now use Inter, the font loaded, and desktop has no horizontal overflow. Production `main` unchanged.
- Latest owner steering: offer as many eligible payment methods as practical, settling to Stripe, and add promo-code support for 50% and 75% off. PayPal remains deferred unless explicitly reauthorized. Promo names/limits are pending (suggested FRANKI50/FRANKI75, disabled until tested); no discount or additional method has been implemented/enabled.
- Backend inspection blocker: Supabase project browser tab redirects to sign-in, and FrankiHolz Admin is also signed out. Requested sign-in. Existing local checkout exposes only the live setup function and partial SQL migrations; deployed charge/test/webhook implementations must be read before making payment or promo changes. Setup-only Checkout means Stripe's coupon UI alone cannot discount the eventual stored booking charge.

- Owner requested matching frankiflow.de typography and explicitly authorized a PR merged into `develop`. Browser inspection confirmed Inter for both body and headings. Replaced Manrope import/body stack in shared `assets/styles.css`, including weights 400–900; public, Admin and payment/status pages inherit the change.
- Local built-in browser preview confirmed Inter loaded, body/headings used Inter, English/German switching worked and desktop had no horizontal overflow. Required PR checks must pass before merge; no production release authorized.
- Owner deferred PayPal; its connection dialog was dismissed without proceeding with data sharing or linking. Latest Stripe Dashboard still reports activation required and cards require action. Support email/phone were saved via the browser in the preceding session; business/representative onboarding remains incomplete. Keep all Stripe activity in the built-in browser.
- Owner approved EUR 0.50 per-room live tests after reviewing Stripe's EUR minimum, but test dates are still unspecified and FrankiHolz Admin is not signed in. No room rates, bookings or charges changed. Guest card entry and final live payment remain owner-operated.
- Bank-payment choice remains open: bank transfer is guest-initiated and needs receipt/deadline handling; SEPA Direct Debit supports saving a mandate and later debit, without a funds hold, with asynchronous confirmation. The existing card-only saved-method flow needs backend/UI/webhook review before bank methods are enabled.

## Stripe live readiness inspection — 2026-10-18

- User selected the FrankiFlow live account for the FrankiHolz payment setup. Checked out `develop` locally and opened its public site and Admin in the built-in browser.
- Read-only Stripe inspection confirmed `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`, and `card_payments=inactive`; disabled reason is `requirements.past_due`.
- Outstanding onboarding includes representative name/address/date of birth/email/phone, business support phone, payout bank account, and Stripe terms acceptance. Owner must complete onboarding in Stripe Dashboard; no account details were guessed or submitted.
- Existing live FrankiHolz webhook is enabled and points to the documented Supabase `frankiholz-stripe-webhook` endpoint with the six documented events. This confirms registration only, not successful delivery or backend signature verification.
- Opened the selected account's Stripe Dashboard in the built-in browser; it currently requires sign-in. No Stripe, Supabase, payment mode, booking, deployment, or production settings were changed. No live card setup or charge was attempted.
- Next: owner signs in and completes onboarding; recheck account activation, then inspect deployed payment functions, webhook delivery/signature/idempotency and scheduled charges before claiming readiness. The public construction notice remains appropriate until verified.

## Payment gateway construction notice before develop → main — 2026-10-13

- Owner explicitly requested a bilingual public message that the online payment gateway is under construction and guests should contact the FrankiHolz host for an alternative payment method, followed by a `develop → main` production release.
- Implemented the English/German notice and direct #contact link in the guest booking panel, public cancellation/payment section, homepage booking status section, and standalone booking-status page. The text is intentionally a warning only: existing booking and Stripe routing/checkout endpoints remain unchanged.
- Automated Playwright smoke checks cover English/German copy, language switching and links without backend writes.
- At this point, Stripe LIVE remains restricted pending Stripe business onboarding (card payment capability inactive and charges disabled at the last direct check). Supabase's separate `live_ready` setting is not an account-level Stripe activation guarantee. Do not claim production LIVE checkout works until Stripe capability status and a controlled real end-to-end card-saving test have been verified.
- Before release, follow repository `.agents/skills/release-workflow/SKILL.md`: feature PR into develop with checks, then same-repository `develop → main` with `production-approved` label and release checks; preserve webhook/keys and inspect the 75+ pending commits. Post-merge, verify Netlify main deploy, guest pages and rollback path.


## Calendar exclusive checkout + shared TEST/LIVE selector on develop — 2026-10-11

Feature branch: `fix/calendar-checkout-stripe-env-20261011` from `develop`. Do not merge or deploy this branch directly to `main`.

### Confirmed booking-calendar bug
- Room 1 (Cozy Holz), 2026-10-13 night is available (€0.90 test rate). 2026-10-14 through 17 nights are blocked by Airbnb iCal. Confirmed booking night 2026-10-12 is unavailable.
- Read-only production backend check: `frankiholz_estimate_total(room1,2026-10-13,2026-10-14)` returns available=true, one night. The same call to 2026-10-15 returns false. Backend correctly uses half-open [check-in, check-out) intervals.
- Fixed an existing ternary-precedence issue in `assets/site.js` so explicit `?lang=en` is respected rather than incorrectly switching to German; this also ensures the new checkout-only text is localized correctly.
- Frontend calendar erroneously disabled every blocked date. Updated public JS to expose first blocked morning as an interactive **check-out only** boundary once valid check-in is selected, never allowing booked/blocked overnight dates in selected range.
- Clicking selected check-in now clears both selections. Clicking selected check-out clears check-out only. Summaries/pricing reset. Added aria labels and dashed checkout-only styling; no Airbnb blocks were edited.

### Stripe safety and rollout
- Both Stripe credentials are marked ready in shared Supabase; selected setting is currently `live`. The single `frankiholz_payment_settings` row is **GLOBAL across develop and main**. They do **not** have independent settings in the current architecture.
- Removed old forced TEST on develop and publicly controlled `?test=1` / `?stripe_test=1` override in new frontend. Updated frontend reads Admin-protected `frankiholz_get_payment_environment` regardless of hostname, displays TEST/LIVE visibly in booking flow, and requires an explicit `LIVE` confirmation when on a development preview.
- Updated Admin mode selector copy to explain shared setting and existing booking payment mode preservation. This is **not** a passwordless public mode switch.
- Staged a guarded same-signature migration to set a new booking's `payment_mode` to the selected mode at initial creation, rather than column default LIVE (existing rows unchanged).
- Staged existing LIVE Stripe Edge Function's smallest necessary callback change: use approved incoming browser Origin (allowlist already exists) for success/cancel return URLs, to return development LIVE tests back to develop rather than production. Existing production request origin still returns to production. No key, charge, or business logic changes.
- The **deployed production main branch is 71 commits behind develop** and contains a legacy browser-side mode choice which does not respect the Admin selector. A separately reviewed and approved `develop → main` production release is required for the updated mode selection to work on main. Do not claim main is updated merely because backend was changed.
- No real card setup or charge has been performed. Do not create artificial live bookings merely to test code.
- Playwright tests use a mocked calendar/payment RPC for Oct 13/14, deselection, blocked dates, German labels, and backend-mode precedence over query flags. Confirm security, browser and Lighthouse checks before any code merge.


## Compact public site spacing and Stripe TEST/LIVE test guide — 2026-10-11

Branch `fix/compact-site-spacing-20261011`, based on `develop`. No production `main` merge and no Supabase/Stripe settings changed.

- Added `assets/compact-spacing.css` as a final public-page stylesheet, reducing unnecessary vertical gaps in the hero, quick navigation, guest-review strip, room cards, house rules/amenities, booking section, location and footer. Touch targets and critical calendar/booking controls remain usable.
- Removed the public rules card's fixed 570px minimum and two-row span to avoid large empty card space; sections and spacing become responsive.
- Added desktop/mobile Playwright checks for section padding, min-height removal, no horizontal overflow and preservation of the guest booking/contact controls.
- Current source-of-truth Stripe model is documented in `STRIPE.md` and `BOOKING-WORKFLOW.md`: v2 saved-card setup (no initial charge), Admin host decision, charge 14 days before check-in or immediately for stays within 14 days. Develop/branch previews are forced to TEST; live production uses the Admin environment selector; existing bookings keep their original environment.
- A downloadable Stripe testing guide has been generated separately for the user. It distinguishes the production Admin selector from develop preview test-mode forcing and cautions about live payments. It is not a change to runtime configuration.

Review CI, desktop/mobile, and the hidden-until-selected booking panel before merging into develop; do not promote to main without production approval.


## Header width, hero right alignment and WhatsApp icon — 2026-10-11

Branch: `fix/hero-right-align-whatsapp-icon-20261011` from current `develop`, **not** `main`.

- Increased desktop public nav width from the previous 1,220px maximum to 1,370px / 96vw, keeping the same centered positioning; mobile retains existing nav width.
- Right-aligned the "Unterkunft in Frankfurt am Main" badge and "Zimmer ansehen" CTA against the right edge of the hero rail at desktop widths; they remain stacked and left-aligned on mobile.
- Replaced "WA" text with the actual WhatsApp pictogram sourced from Simple Icons (CC0) and bundled in `assets/whatsapp.svg`, white on a green circular 48px touch target. The WhatsApp chat link continues to use existing Admin-managed phone logic and preserves DE/EN accessible labels; no network requests are needed to render the icon.
- Bumped CSS asset cache versions to deliver the latest layout and icon styling.
- Added Playwright assertions for widened nav, exact badge/button alignment, no icon text and correct WhatsApp SVG asset.
- No changes to data, Supabase policies, booking/payment, Admin logic or Airbnb content. CI must pass before merging into `develop`; production `main` is not affected.


## Remove Sinhala placeholder + add WA contact badge — 2026-10-11

Branch `fix/booking-language-wa-contact-20261011` based on `develop` after PR #43 (right-aligned hero) merged. **No production `main` changes**.

- Booking page: changed free-text `#guestLanguages` placeholder from `English, German, Sinhala` to `English, German`, leaving the guest's language input, translations, and booking submission contract unchanged. No stored guest language records were changed.
- Public Contact section: added a small visible `WA` link adjacent to the phone number. Opens `https://wa.me/4917662493041` in a new tab (no background WhatsApp request) with `rel="noopener noreferrer"` and fully labelled accessibility text.
- The link is generated from the **existing bilingual Admin-managed `fhContactPhone` value** by `assets/guest-info.js`, not a second hardcoded phone setting. If the value is not a valid international number beginning with `+`, WA link hides rather than opening an invalid URL. Phone contact remains unchanged.
- Added compact/responsive WA link styling with focus and reduced-motion handling. Added Playwright smoke checks for link presence, exact `WA` label, German aria-label, correct URL, the revised placeholder and CMS-backed phone updates.
- No Supabase schema/data, payment, Stripe, booking logic, authentication, or private feed changes. CI/PR into `develop` only; do not merge to `main`.


## Hero badge + CTA right-side repositioning — 2026-10-11

Branch `fix/hero-badge-cta-right-20261011` from `develop`, **not** a production deploy.

- User screenshot requested moving the “Unterkunft in Frankfurt am Main” location badge and “Zimmer ansehen” primary button out of the left hero text to the center-right of the hero, and **removing** the “Unsere Unterkunft entdecken” secondary link. Main headline, description, tagline and navigation stay on the left/in their current roles.
- Restructured hero HTML with a single `.fh-hero-rail` holding the original badge (`data-i18n="eyebrow"`) and **the same** `#heroRoomsBtn` (`data-i18n="viewRooms"`), preserving the JS scroll-to-rooms handler.
- Created focused `assets/hero-placement.css` for desktop two-column positioning and a mobile single-column stacking order: badge above headline, CTA below text. Removed outdated single-column `!important` override from `assets/reviews-band.css`.
- Added Playwright assertions for desktop right-side badge/CTA, mobile stacking, removing the secondary link, CTA presence, and no page overflow.
- No Supabase, Airbnb, booking, admin, Stripe, payment, or database changes. Do not merge to `main`; follow standard feature→develop CI gating.


## Expanded Airbnb review carousel with per-guest stars — 2026-10-11

Feature branch: `feature/airbnb-twelve-starred-reviews-20261011` from current `develop`.

- Expanded the below-hero genuine guest feedback slider from three to **twelve** individually attributed summaries of public **five-star** Airbnb reviews from listing `https://www.airbnb.com/rooms/1621684668409633226`, personally checked against the public Airbnb review dialog on 2026-10-11.
- Review authors: Katharina, Catarina, Ke, Imanol, Anas, Patricia, Kai, Josephin Alina, Abhiram, Sophie, Alexander, Dai. Verified five-star ratings for all 12; do **not** claim their exact guest text is reproduced — the visible summaries are faithful paraphrases of reviews, labelled as such in both languages and linked to the original public listing.
- Each individual card now has visible gold star glyphs `★★★★★`, numerical `5 / 5` and an accessible rating label. German/English review summaries and rating labels follow the language switch.
- Expanded protected optional Admin input to up to 12 items. For custom guest feedback, the optional fourth pipe-separated field records the **known** individual 1–5 star rating; if the rating is unknown, no stars are displayed rather than fabricating five stars.
- No Supabase writes, auth changes, Stripe/booking changes, or production `main` deployment. Carousel stays motion-aware with controls and attribution.
- Added Playwright coverage for all 12 authors and star ratings, forward/loop navigation, German summaries, responsive rendering and custom Admin ratings (including a four-star review).
- Production release remains develop→main only, separately reviewed and approved.


## Verified Airbnb listing review strip below the homepage hero — 2026-10-11

Branch: `feature/airbnb-reviews-below-hero-20261011` based on current `develop`. Production `main`, Supabase and Stripe are unchanged.

- The owner supplied public listing `https://www.airbnb.com/rooms/1621684668409633226`, already saved in protected/Admin-editable `public.frankiholz_copy.fhAirbnbReviewsUrl` for both languages (existing copy included tracking query string).
- Airbnb indexed page snapshots differed: an older fetched version showed **4.61 / 23 reviews**, whereas a newer search-indexed snapshot displayed **4.69 / 29 reviews**. Thus numbers are **not live**; UI displays the newer known snapshot and an explicit "Airbnb listing snapshot · not live" disclosure, with direct canonical source link. Admin editors can manually revise `fhAirbnbRating` and `fhAirbnbCount` (fallback defaults 4.69, 29; no database migration).
- No individual written review texts/guest names were accessible from the public Airbnb page: the reviews section showed zero review items in non-JS retrieval, though aggregate rating/tags were visible. Do not invent quotations. Only confirmed public review topic labels (hospitality, location, cleanliness) are shown without claiming exact guest quotes.
- Moved reviews to the screenshot-requested space **after the quick-navigation row and before Rooms**; removed review panel from inside hero, keeping the hero fully wide.
- Real quotations if later collected through owner-verified sources may be displayed in the existing optional sliding carousel in this same strip via bilingual Admin `fhHeroReviews` records (author | exact quote | canonical Airbnb listing URL).
- The lower About Us review link was removed to avoid duplicate review placement. All reviews link directly to the official listing.
- Tests cover location, source URL, English/German, snapshot, hidden default carousel and mock review slider.
- No standalone Airbnb public review sync API has been verified; official listing-embed process is documented by Airbnb at `https://www.airbnb.com/help/article/923`, but the exact host-provided embed code has not been supplied.

Before merging: run Playwright, security and static UI checks; verify desktop/mobile. Standard release path feature→develop then approved develop→main. Do not call a snapshot "live synchronized".


## Remove hero welcome panel + prepare genuine Airbnb reviews — 2026-10-11

Branch: `feature/airbnb-hero-reviews-20261011` based on `develop`. Do not deploy or modify production/main or shared booking/payment data.

- Removed the entire decorative `fh-stay-note` hero information card requested by the host. The hero becomes a full-width editorial layout when no reviews exist.
- Added `#fhHeroReviews`, a responsive, motion-aware guest review slider in the hero, initially **hidden**. No fictional or sample reviews are shipped in the public website.
- Reused protected bilingual `public.frankiholz_copy` storage by adding optional `fhHeroReviews` Admin content field: one review per line, `Guest name | Exact review quote | Public Airbnb listing URL`, maximum ten per language. A separate test fixture uses clearly synthetic quotations only in Playwright tests.
- Every visible quote retains a direct, validated Airbnb listing link; no HTML is injected from guest text. Existing `fhAirbnbReviewsUrl` still supports the old public listing link where there is no hero carousel, preventing duplicate review placement.
- Auto-scroll every 7.5 s when multiple review entries exist, pauses on hover/focus/hidden browser tab and honors reduced-motion preferences; previous/next buttons remain available.
- **No automatic review sync.** Airbnb officially documents embedding a listing preview with reviews (`https://www.airbnb.com/help/article/923`), but does not provide a verified general public reviews feed in the current integration. Do not scrape reviews or mislabel manually copied quotes as synchronized. When owner provides listing(s), verify what reviews and embeds are actually available, and obtain permission/accuracy for any displayed content.
- No Supabase schema migration or live write; retain the existing authenticated Admin and RLS constraints. Check browser/CI before merging feature into `develop`. Future `develop → main` requires normal production approval.


## Premium Homepage + Admin UI — October 11, 2026 (feature branch, not production)

Branch: `feature/premium-public-admin-redesign-20261011`, based on latest `develop`. No shared Supabase, Stripe, payments, guest data, or `main` production changes.

- Reworked public homepage into an editorial split hero with a guest-facing highlight panel, bilingual room/facility/house-rule/location jump navigation, refined room cards and guest info, booking-safe CTAs and mobile-friendly layout.
- Redesigned the authenticated Admin static shell as a responsive host workspace: desktop sidebar tabs, mobile horizontally scrollable tabs, clearer operational header, premium section/card hierarchy and updated login visuals. Existing tab buttons, IDs, RLS enforcement, RPC usage and Stripe environment controls are unchanged.
- New `assets/premium-2026.css` layers on existing approved FrankiHolz branding; retains motion-safe/reduced-motion behavior.
- New `e2e/premium-ui.spec.mjs` checks desktop/mobile layout, language switching, required Admin controls and no narrow-screen overflow; offline test reveals static Admin dashboard solely for layout validation and is NOT a substitute for signed-in QA.
- Added Airbnb public listing URL guidance under the existing optional Admin reviews link. Airbnb's official host path is Listings → listing → View → Share → Copy link (or Share → Embed → Copy HTML for a separate review preview).
- Direct Admin authentication was not possible: Supabase Auth passwords cannot be retrieved in plaintext and available browser profiles contain no saved FrankiHolz Admin login. A future live signed-in inspection requires user-controlled profile sign-in; do not reset credentials or bypass auth.
- This change does not perform a Next.js migration; current architecture remains static HTML/JS to protect booking/payment continuity.

Before merging into `develop`: inspect PR diff and GitHub CI; check authenticated Admin UI with a legitimate host session, and visually test desktop + mobile. Production release requires normal approved `develop → main` process.


## Admin duplication, map visibility and UI polish — 2026-10-11

Feature branch: `fix/admin-map-ui-refresh-20261011` from current `develop`. Production `main` and the shared Supabase/Stripe backend were not changed.

- Diagnosed Stripe payment controls duplicated because `admin-tabs.js` injected `payment-environment-admin.js` while `admin.html` also loaded it directly. Removed the extra injection and added a singleton guard in the payment UI script. The TEST/LIVE toggle and its RPCs are otherwise untouched.
- Replaced the old location-map click placeholder with a responsive two-column location section containing a default, lazy-loaded Google Maps iframe and directions fallback. This introduces a potential visitor-data transfer to Google; review German/EU privacy requirements before release.
- Refined the public accommodation and Admin UI using existing brand tokens, responsive spacing, canonical FrankiHolz brand assets, subtle/reduced-motion-aware transitions and improved keyboard focus.
- Updated Playwright tests for map existence/URL, DE locale, and a repeat-loaded Stripe UI script to prevent regressions.
- Viewer: the public develop homepage is readable with three room cards and clear house rules; map lacked an initial iframe. The Admin dashboard is gated by authentication, so viewer could only inspect the login page and the screenshot provided by the host. No login, booking, Stripe or database writes were performed.
- Next.js migration is viable as a **separate** architectural project, not included in this fix. Preserve Supabase RLS/Edge Functions, Stripe v2 payment handling, Airbnb calendar sync, bilingual CMS and production branch protections; audit authenticated Admin and public behavior before cutover.

Review PR checks and conduct a signed-in Admin visual acceptance test before merging to `develop`; do not promote to `main` without the normal release approval and privacy review.


## Guest-information website work — 2026-10-11 (feature branch, not live)

Feature branch: \`feature/guest-info-trust-20261011\` based on \`develop\`. No changes were made to \`develop\`, \`main\` or the live/shared Supabase data.

- Added public DE/EN house rules, facilities, About Us, contact telephone and click-to-load location map.
- Added an authorized bilingual website-content editor using existing \`public.frankiholz_copy\` RLS policies; no new schema is required. The section has safe defaults until an admin first saves it.
- Review links: only administrator-configured HTTPS Airbnb URLs are displayed. Do not scrape reviews; Airbnb's official listing Embed option can be evaluated separately after the host supplies its approved embed HTML.
- Added direct room-save verification in Admin; the existing room names/descriptions are edited in \`frankiholz_rooms\` (English \`name\`/\`description\`, German \`name_de\`/\`description_de\`).
- Live DB read on 2026-10-11 found all three rooms active and sharing generic duplicate EN/DE descriptions. Added a conservative SQL migration that updates these placeholders only when the existing values still match. This migration has NOT been applied to the live DB.
- Default check-in/out text asks guests to arrange exact times with the host; quiet-hours time window and optional Airbnb listing URL need host confirmation. The laundry amount is not specified and is represented only as an additional charge.
- Smoke tests cover section visibility, telephone link, DE content, and consent-style map loading.

Next actions: inspect CI and review, verify rendered DE/EN site in a browser, obtain confirmed operating hours and approved Airbnb listing/share embed, review room-specific factual differences, and apply the SQL migration through the controlled backend change process if approved. Do not promote to production until tests/review pass.


**Last updated:** 2026-09-22

## Current baseline

FrankiHolz `develop` now uses the v2 Stripe saved-card / 14-day scheduled-charge lifecycle. Production `main` has not been changed.

The repository still follows the strict release rule: feature/fix/chore -> `develop`; only approved `develop -> main` releases may touch production.

## Stripe v2 alignment completed on develop

PR #30, **Unify FrankiHolz v2 Stripe booking flow**, was squash-merged into `develop` at commit:

```text
e24ba8502c644cd106737fb6001f63c1c45a348d
```

The change:
- retired the dynamically loaded legacy 48-hour authorization browser override;
- uses `frankiholz_create_booking_v2` for new requests;
- uses Stripe Checkout setup mode to save a card without charging it;
- forces Netlify develop/branch previews to Stripe TEST mode;
- uses the configured TEST/LIVE environment on the production hostname;
- aligns the status page, payment-success page and Admin booking controls with the 14-day model;
- loads the existing Admin TEST/LIVE payment-environment control;
- keeps server-side compatibility for old pre-v2 bookings only;
- updates Stripe/booking/test documentation.

## Backend additions and external side effects

The shared Supabase project `bdeajozhylypiidrldka` has these additive v2 components:

- RPC `public.frankiholz_booking_status_v3`
- Edge Function `frankiholz-cancel-booking-v2`

The migration for the v3 status RPC is recorded in:

```text
migrations/20260922_frankiholz_booking_status_v3.sql
```

The shared `public.frankiholz_copy` payment-flow wording was updated to the saved-card / 14-day model for:
- `approvedBlock`
- `directHost`
- `submitRequest`
- `pendingNote`
- `statusLead`

The Stripe TEST and LIVE webhook endpoints exist in the new FrankiFlow Stripe account. The TEST webhook signing secret was updated in Supabase and verified with a correctly signed test event returning HTTP 200.

The current global FrankiHolz payment environment remains:

```text
TEST
```

Do not switch it to LIVE until the develop acceptance test is complete.

## Verification completed

PR checks passed:
- Browser smoke tests
- Security checks
- Lighthouse quality report
- CodeRabbit

After merge, the `develop` push checks also passed for commit `e24ba850...`:
- Browser smoke tests
- Security checks

JavaScript syntax checks passed for all modified payment-flow files.

A backend sandbox cycle passed with no real money:
1. created a v2 booking;
2. created a Stripe `cs_test_...` setup Checkout session;
3. verified v3 status returned `payment_mode = test` and `payment_schedule_version = v2_14_day`;
4. cancelled through `frankiholz-cancel-booking-v2`;
5. verified final booking state `cancelled / released`.

The TEST webhook signing secret was separately verified with a signed synthetic event.

## Remaining acceptance check

The connected Netlify API currently exposes the production deploy but does not expose a branch-deploy listing, and the agent environment cannot directly fetch `develop--frankiholz.netlify.app`. Therefore the final browser-level acceptance step still needs confirmation on the Netlify develop branch URL:

```text
https://develop--frankiholz.netlify.app
```

Use a far-future booking and Stripe test card `4242 4242 4242 4242` to verify:
- Checkout is `cs_test_...` and says the card is being saved, not charged;
- returning from Stripe shows the saved-card / 14-day wording;
- webhook changes the booking to `payment_method_saved`;
- Admin shows TEST and can confirm the booking;
- a far-future confirmation becomes `scheduled_charge` with `charge_due_at` 14 days before check-in;
- cancellation behaves according to the 14-day policy.

Do not merge `develop` into `main` until this acceptance check passes.

## Next-agent startup

1. Read `AGENTS.md`, `docs/PROJECT-MEMORY.md`, `STRIPE.md`, `BOOKING-WORKFLOW.md`, and `STRIPE-TESTING.md`.
2. Confirm `develop` is still at or ahead of `e24ba850...`.
3. Confirm the payment environment is still TEST.
4. Complete the develop browser acceptance test above.
5. Only then prepare a normal release review for `develop -> main`.


## Agent Project Starter alignment — 2026-09-22

Agent infrastructure was aligned with `dn-lx/agent-project-starter` without changing FrankiHolz runtime/payment behavior. Added model-routing and memory/context policy, MCP and memory-context skills, bootstrap guidance, agent-stack validation, stronger PR evidence, reusable templates and an agent-independent engineering ADR. Existing payment-flow/email-safety skills and stronger CI/security/release checks were preserved. `main` is not part of this change.


## Develop acceptance testing + Admin cleanup — 2026-09-22

A deeper TEST-mode acceptance pass was executed against the shared Supabase/Stripe/Resend backend while the global FrankiHolz payment environment remained `TEST`.

### Backend changes made during testing

- Added authenticated Edge Function `frankiholz-admin-delete-bookings`.
  - Requires a valid FrankiHolz admin session.
  - Accepts 1–50 selected booking IDs.
  - Permanently deletes only bookings that are already `cancelled`, are not `paid/refunded`, and have no saved Stripe payment method.
  - Clears any booking-linked calendar rows before deletion.
- Updated `frankiholz-cancel-booking-v2` to expire an open Stripe Checkout setup session after cancellation and clear the stored payment URL/deadline.
- Updated both Stripe webhooks (`frankiholz-stripe-webhook-test` and `frankiholz-stripe-webhook`) so a late v2 setup completion cannot change a cancelled booking back to `payment_method_saved`; any late saved payment method is detached.
- Added Admin multi-select cleanup controls on branch `fix/admin-delete-closed-bookings-20260922`.

### Acceptance test evidence

Disposable booking `FH-915C90A9` was created for 2034-06-10 → 2034-06-12 with internal test recipient `info@frankiflow.de`.

Verified:
1. `frankiholz_create_booking_v2` returned €86.00.
2. Request-received email endpoint returned HTTP 200.
3. Both expected messages reached FrankiFlow Mail:
   - guest-facing booking request confirmation;
   - internal admin request notification.
4. Stripe TEST Checkout created a real `cs_test_...` session with:
   - `livemode = false`;
   - `mode = setup`;
   - `payment_schedule_version = v2_14_day`;
   - correct develop success/cancel URLs;
   - explicit wording that the card is saved now and charged 14 days before check-in.
5. Repeating the setup request while still open reused the existing Checkout session rather than creating a duplicate.
6. Cancelling the pending request returned `cancelled / released`.
7. Stripe confirmed that the open TEST Checkout session became `expired`.
8. A genuine Stripe `checkout.session.expired` event reached the TEST webhook and was recorded in `frankiholz_test_payment_events`.
9. Both TEST cancellation messages reached Resend and the FrankiFlow Mail DB.
10. Repeating cancellation returned `already_cancelled` and did not create additional booking email events or mailbox messages.
11. `frankiholz_booking_status_v3` returned the cancelled/released TEST state with no payment URL.
12. Unauthenticated access to `frankiholz-admin-delete-bookings` was rejected with HTTP 401 before deletion logic.
13. Cleanup of the disposable booking removed its booking row and two `frankiholz_email_events` rows; the Stripe TEST event ledger remained as an audit record with `booking_id = null`.
14. The four received test emails remain in FrankiFlow Mail history, which is intentional.

The final interactive card-save / host-confirm / scheduled-charge path still requires completing Stripe Checkout with a test card in a browser. Do not switch the payment environment to LIVE until that interactive acceptance step has also passed.


## Admin booking cleanup — 2026-09-22

A safe multi-select cleanup flow was added for old booking records.

- Admin UI shows selection checkboxes only for bookings that are already `cancelled`, are not `paid` or `refunded`, and do not retain a saved Stripe payment method.
- `frankiholz-admin-delete-bookings` is the server-authoritative delete endpoint. It requires an authenticated FrankiHolz admin and repeats the same safety checks server-side.
- The endpoint releases any calendar rows still linked to the booking before deleting it.
- Booking-linked email-event rows cascade with the booking; Stripe payment ledgers retain their event rows with `booking_id` set to null.
- The UI requires an extra confirmation when a selected historical record is marked `payment_mode = live`, even if it is already cancelled and unpaid.
- Permanent cleanup is intentionally unavailable for active, paid, refunded, or card-linked bookings.

The Edge Function is deployed in the shared Supabase project. This repository has no local Edge Function source tree, so this handoff is the repository record of that external backend change.

## Live Checkout failure diagnosis — 2026-10-18

- Booking FH-FDA57E4E remains EUR 0.50, pending / awaiting_payment, live. Browser SQL verification after the failed Save attempt confirmed no saved payment method and no PaymentIntent.
- Stripe browser Workbench shows the 14:49 CEST Checkout confirm request failed HTTP 400, code testmode_charges_only. Stripe states the account cannot currently make live charges and the transaction was not processed.
- Onboarding remains at /account/onboarding/2fa: no authentication method configured and Continue disabled. Owner must configure their authentication method, complete remaining onboarding and final submission before retrying.
- No card retry, new booking, charge, or refund was initiated. Preserve this booking for retry once live payments are enabled. Never record card details in this repository.
