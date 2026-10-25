import { test, expect } from '@playwright/test';
import { blockExternalNetwork } from './helpers.mjs';

async function guestFixture(page, options = {}) {
  await blockExternalNetwork(page);
  await page.addInitScript(options => {
    if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return;
    const booking = reference => ({ reference, room_name: reference === 'FH-A' ? 'Room A' : 'Room B', check_in: '2032-11-20', check_out: '2032-11-22', total_price: 100, booking_status: options.bookingStatus || 'pending', payment_status: options.paymentState || 'not_started', payment_mode: options.bookingMode || 'test', payment_collection_mode: 'saved_method', cancel_refund_eligible: true });
    const state = window.__guestRecovery = { bookings: { 'FH-A': booking('FH-A'), 'FH-B': booking('FH-B') }, calls: [], pending: [], modePending: [], delay: options.delay || [], modeDelay: !!options.modeDelay, mode: options.mode || 'test', readError: false };
    state.release = reference => { const held = state.pending.filter(item => item.reference === reference); state.pending = state.pending.filter(item => item.reference !== reference); held.forEach(item => item.resolve(item.value)); };
    state.releaseMode = () => { state.modePending.splice(0).forEach(resolve => resolve({ data: state.mode, error: null })); };
    try {
      for (const [reference, email] of Object.entries(options.emails || {})) sessionStorage.setItem('frankiholz-payment-email:' + reference, email);
      if (options.active) sessionStorage.setItem('frankiholz-active-checkout-reference', options.active);
    } catch (error) {}
    window.supabase = { createClient: () => ({
      from() { return { select() { return this; }, async in(key, keys) {
        if (options.copyError) return { data: null, error: { message: 'Fixture content unavailable' } };
        const rows = [{ copy_key: 'fhContactPhone', text_en: '+49 176 12345678', text_de: '+49 176 12345678' }, { copy_key: 'fhCheckIn', text_en: options.checkIn || '17:00', text_de: options.checkInDe || options.checkIn || '17:00' }, { copy_key: 'fhCheckOut', text_en: options.checkOut || '11:00', text_de: options.checkOutDe || options.checkOut || '11:00' }];
        return { data: rows.filter(row => keys.includes(row.copy_key)), error: null };
      } }; },
      async rpc(name, args) {
        state.calls.push({ name, args: structuredClone(args) });
        if (name === 'frankiholz_get_payment_environment') return state.modeDelay ? new Promise(resolve => state.modePending.push(resolve)) : { data: state.mode, error: null };
        if (state.readError) return { data: null, error: { message: 'Fixture read unavailable' } };
        const valid = args?.p_email === (args?.p_reference === 'FH-A' ? 'a@example.invalid' : 'b@example.invalid');
        let row = valid ? state.bookings[args?.p_reference] : null;
        if (row && options.returnState && location.pathname.includes('payment-success')) row = { ...row, payment_status: options.returnState };
        const value = { data: name === 'frankiholz_booking_status_v3' ? row ? [structuredClone(row)] : [] : row ? structuredClone(row) : null, error: null };
        return state.delay.includes(args?.p_reference) ? new Promise(resolve => state.pending.push({ reference: args.p_reference, resolve, value })) : value;
      }
    }) };
  }, options);
}
async function fillStatus(page, reference) {
  await page.locator('#ref').fill(reference);
  await page.locator('#email').fill(reference === 'FH-A' ? 'a@example.invalid' : 'b@example.invalid');
  await page.locator('#go').click();
}
async function captureSetup(page, checkoutUrl, { held = false } = {}) {
  const calls = [], headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,apikey' };
  let release = () => {};
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/functions/v1/frankiholz-create-authorization-*', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    calls.push(route.request().postDataJSON());
    if (held) await gate;
    await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ checkout_url: checkoutUrl }) });
  });
  return { calls, release };
}

test('standalone status rejects an older lookup after newer booking details arrive', async ({ page }) => {
  await guestFixture(page, { delay: ['FH-A'] }); await page.goto('/booking-status.html?lang=en');
  await fillStatus(page, 'FH-A'); await fillStatus(page, 'FH-B');
  await expect(page.locator('#out')).toContainText('FH-B'); await expect(page.locator('#out')).not.toContainText('FH-A');
  await page.evaluate(() => window.__guestRecovery.release('FH-A'));
  await expect(page.locator('#out')).toContainText('FH-B'); await expect(page.locator('#out')).not.toContainText('Room A');
});

test('editing status identity removes prior actions and a detached cancel callback cannot act', async ({ page }) => {
  let confirmations = 0; page.on('dialog', dialog => { confirmations++; return dialog.dismiss(); });
  await guestFixture(page); await page.goto('/booking-status.html?lang=en'); await fillStatus(page, 'FH-A');
  await expect(page.locator('#cancelBookingBtn')).toBeVisible();
  await page.evaluate(() => { window.__oldCancel = document.getElementById('cancelBookingBtn'); });
  await page.locator('#ref').fill('FH-B'); await expect(page.locator('#out')).toBeEmpty();
  await page.evaluate(() => window.__oldCancel.click()); expect(confirmations).toBe(0);
  await page.locator('#email').fill('b@example.invalid'); await page.locator('#go').click(); await expect(page.locator('#out')).toContainText('FH-B');
  await page.evaluate(() => window.__oldCancel.click()); expect(confirmations).toBe(0);
});

test('cancellation confirms the displayed reference and locks duplicate requests until settlement', async ({ page }) => {
  await guestFixture(page); const calls = [], questions = []; let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/functions/v1/frankiholz-cancel-booking-v2', async route => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,apikey' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    calls.push(route.request().postDataJSON()); await gate;
    await page.evaluate(() => { window.__guestRecovery.bookings['FH-B'].booking_status = 'cancelled'; window.__guestRecovery.bookings['FH-B'].payment_status = 'released'; });
    await route.fulfill({ status: 200, headers, contentType: 'application/json', body: '{"ok":true,"refundable":true}' });
  });
  page.on('dialog', dialog => { questions.push(dialog.message()); return dialog.accept(); });
  await page.goto('/booking-status.html?lang=en'); await fillStatus(page, 'FH-B');
  await page.locator('#cancelBookingBtn').click(); await expect.poll(() => calls.length).toBe(1);
  await expect(page.locator('#ref')).toBeDisabled(); await expect(page.locator('#retryCardBtn')).toBeDisabled();
  await page.evaluate(() => document.getElementById('cancelBookingBtn').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(calls).toEqual([{ reference: 'FH-B', email: 'b@example.invalid' }]); expect(questions).toHaveLength(1); expect(questions[0]).toContain('FH-B');
  release(); await expect(page.locator('#cancelBookingBtn')).toHaveCount(0); await expect(page.locator('#out')).toContainText('cancelled'); await expect(page.locator('#ref')).toBeEnabled();
});

test('a failed cancellation unlocks the same verified booking for safe retry', async ({ page }) => {
  await guestFixture(page); let calls = 0; page.on('dialog', dialog => dialog.accept());
  await page.route('**/functions/v1/frankiholz-cancel-booking-v2', route => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,apikey' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    calls++; return route.fulfill({ status: 500, headers, contentType: 'application/json', body: '{"error":"Fixture notification unavailable"}' });
  });
  await page.goto('/booking-status.html?lang=en'); await fillStatus(page, 'FH-A'); await page.locator('#cancelBookingBtn').click();
  await expect(page.locator('#out [role=alert]')).toContainText('Fixture notification unavailable'); await expect(page.locator('#cancelBookingBtn')).toBeEnabled();
  await page.locator('#cancelBookingBtn').click(); await expect.poll(() => calls).toBe(2); await expect(page.locator('#ref')).toBeEnabled();
});

test('retry navigation uses the currently verified reference and keeps email out of the URL', async ({ page }) => {
  await guestFixture(page); let documents = 0;
  await page.route('**/payment.html?reference=FH-B&lang=en', route => { if (route.request().isNavigationRequest()) documents++; return route.continue(); });
  await page.goto('/booking-status.html?lang=en'); await fillStatus(page, 'FH-B'); await expect(page.locator('#retryCardBtn')).toBeVisible();
  await page.evaluate(() => { const button = document.getElementById('retryCardBtn'); button.dispatchEvent(new MouseEvent('click')); button.dispatchEvent(new MouseEvent('click')); });
  await expect(page).toHaveURL(/\/payment.html\?reference=FH-B&lang=en/); expect(documents).toBe(1);
  await expect(page.locator('#email')).toHaveValue('b@example.invalid'); expect(page.url()).not.toContain('example');
});

test('a stale payment lookup cannot replace details or unlock a newer pending lookup', async ({ page }) => {
  await guestFixture(page, { delay: ['FH-A', 'FH-B'], emails: { 'FH-A': 'a@example.invalid' } }); await page.goto('/payment.html?reference=FH-A&lang=en');
  await page.locator('#reference').fill('FH-B'); await page.locator('#email').fill('b@example.invalid'); await page.locator('#lookupButton').click();
  await page.evaluate(() => window.__guestRecovery.release('FH-A')); await expect(page.locator('#lookupButton')).toBeDisabled(); await expect(page.locator('#paymentContent')).toBeHidden();
  await page.evaluate(() => window.__guestRecovery.release('FH-B')); await expect(page.locator('#paymentSummary')).toContainText('FH-B'); await expect(page.locator('#lookupButton')).toBeEnabled();
});

test('editing input while mode is pending invalidates the old payment action before setup', async ({ page }) => {
  await guestFixture(page, { modeDelay: true, emails: { 'FH-A': 'a@example.invalid' } }); const setup = await captureSetup(page, 'https://checkout.stripe.com/fixture');
  await page.goto('/payment.html?reference=FH-A&lang=en'); await expect(page.locator('#paymentContent')).toBeVisible(); await page.locator('#savedPayment').click();
  await page.evaluate(() => { document.getElementById('reference').value = 'FH-B'; document.getElementById('email').value = 'b@example.invalid'; document.getElementById('reference').dispatchEvent(new Event('input', { bubbles: true })); window.__guestRecovery.releaseMode(); });
  await expect(page.locator('#paymentContent')).toBeHidden(); await expect(page.locator('#lookupButton')).toBeEnabled(); expect(setup.calls).toHaveLength(0);
  expect(await page.evaluate(() => sessionStorage.getItem('frankiholz-active-checkout-reference'))).toBeNull();
});

test('pagehide invalidates a delayed setup response and Back restoration rechecks the booking', async ({ page }) => {
  await guestFixture(page, { emails: { 'FH-A': 'a@example.invalid' } }); const setup = await captureSetup(page, 'https://checkout.stripe.com/fixture', { held: true });
  await page.goto('/payment.html?reference=FH-A&lang=en'); await expect(page.locator('#paymentContent')).toBeVisible(); await page.locator('#savedPayment').click(); await expect.poll(() => setup.calls.length).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide'))); setup.release();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#paymentContent')).toBeVisible(); await expect(page.locator('#savedPayment')).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem('frankiholz-active-checkout-reference'))).toBeNull(); expect(page.url()).toContain('/payment.html');
});

for (const checkout of ['https://checkout.stripe.com.evil.example/fixture', 'https://user:secret@checkout.stripe.com/fixture', 'https://checkout.stripe.com:8443/fixture']) test('unsupported Stripe URL cannot overwrite active checkout: ' + new URL(checkout).hostname + (new URL(checkout).port || ''), async ({ page }) => {
  await guestFixture(page, { active: 'FH-OLD', emails: { 'FH-A': 'a@example.invalid' } }); await captureSetup(page, checkout);
  await page.goto('/payment.html?reference=FH-A&lang=en'); await expect(page.locator('#paymentContent')).toBeVisible(); await page.locator('#savedPayment').click();
  await expect(page.locator('#paymentMessage')).toContainText('Unable to open payment'); await expect(page.locator('#savedPayment')).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem('frankiholz-active-checkout-reference'))).toBe('FH-OLD'); expect(page.url()).toContain('/payment.html');
});

test('actual Stripe success URL recovers the reference only after trusted setup navigation', async ({ page }) => {
  await guestFixture(page, { emails: { 'FH-A': 'a@example.invalid' }, returnState: 'payment_method_saved' }); const setup = await captureSetup(page, 'https://checkout.stripe.com/__return_fixture__');
  await page.route('https://checkout.stripe.com/__return_fixture__', route => route.fulfill({ contentType: 'text/html', body: '<title>Mock Stripe</title>' }));
  await page.goto('/payment.html?reference=FH-A&lang=de'); await expect(page.locator('#paymentContent')).toBeVisible(); await page.locator('#savedPayment').click(); await expect(page).toHaveURL('https://checkout.stripe.com/__return_fixture__');
  expect(setup.calls).toEqual([{ reference: 'FH-A', email: 'a@example.invalid', payment_collection_mode: 'saved_method' }]);
  await page.goto('/payment-success.html?session_id=cs_test_fixture&lang=de&test=1&setup=1');
  await expect(page.locator('#kicker')).toHaveText('Zahlungsmethode sicher gespeichert'); await expect(page.locator('#verifiedReturn')).toContainText('FH-A'); await expect(page.locator('#returnMode')).toContainText('Stripe TEST');
  const link = new URL(await page.locator('#statusLink').getAttribute('href'), page.url()); expect(link.searchParams.get('reference')).toBe('FH-A'); expect(link.searchParams.get('lang')).toBe('de'); expect(link.href).not.toContain('example');
  await page.locator('#statusLink').click(); await expect(page.locator('#ref')).toHaveValue('FH-A'); await expect(page.locator('#email')).toHaveValue('a@example.invalid');
});

test('actual Stripe cancel URL recovers this tab booking and explicit reference takes precedence', async ({ page }) => {
  await guestFixture(page, { active: 'FH-A', emails: { 'FH-A': 'a@example.invalid', 'FH-B': 'b@example.invalid' } });
  await page.goto('/booking-status.html?lang=en&test=1'); await expect(page.locator('#out')).toContainText('FH-A');
  await page.goto('/booking-status.html?reference=FH-B&lang=de'); await expect(page.locator('#out')).toContainText('FH-B'); await expect(page.locator('#email')).toHaveValue('b@example.invalid');
});

test('success return is neutral without credentials even when query claims setup/test success', async ({ page }) => {
  await guestFixture(page); await page.goto('/payment-success.html?session_id=cs_fixture&setup=1&test=1&lang=en');
  await expect(page.locator('h1')).toHaveText('Check your booking status'); await expect(page.locator('#returnMessage')).toContainText('reference'); await expect(page.locator('#returnMode')).toBeHidden(); await expect(page.locator('#verifiedReturn')).toBeEmpty();
  expect(await page.evaluate(() => window.__guestRecovery.calls)).toEqual([]);
  await page.locator('#returnReference').fill('FH-B'); await page.locator('#returnEmail').fill('b@example.invalid'); await page.locator('#checkReturn').click(); await expect(page.locator('#verifiedReturn')).toContainText('FH-B');
});

test('delayed webhook remains pending until a refreshed backend response verifies saved method', async ({ page }) => {
  await guestFixture(page, { active: 'FH-A', emails: { 'FH-A': 'a@example.invalid' }, paymentState: 'awaiting_payment' }); await page.goto('/payment-success.html?session_id=cs_fixture&setup=1&lang=en');
  await expect(page.locator('h1')).toHaveText('We are still waiting for the latest update'); await expect(page.locator('#kicker')).not.toContainText('saved');
  await page.evaluate(() => { window.__guestRecovery.bookings['FH-A'].payment_status = 'payment_method_saved'; }); await page.locator('#refreshReturn').click();
  await expect(page.locator('#kicker')).toHaveText('Payment method saved securely'); await expect(page.locator('#lead')).toContainText('No payment has been collected');
  expect(await page.evaluate(() => window.__guestRecovery.calls.filter(call => call.name === 'frankiholz_booking_status_v3').length)).toBe(2);
});

for (const state of ['processing', 'paid', 'not_required']) test('success page displays backend state ' + state + ' independently of TEST query', async ({ page }) => {
  await guestFixture(page, { active: 'FH-A', emails: { 'FH-A': 'a@example.invalid' }, paymentState: state, bookingMode: 'live' }); await page.goto('/payment-success.html?session_id=cs_fake&setup=1&test=1&lang=en');
  await expect(page.locator('#verifiedReturn')).toContainText('FH-A'); await expect(page.locator('#returnMode')).toBeHidden();
  await expect(page.locator('h1')).toHaveText({ processing: 'Payment processing', paid: 'Payment received', not_required: 'No payment required' }[state]);
  if (state === 'processing') await expect(page.locator('#lead')).toContainText('not yet a settled payment');
  if (state === 'paid') await expect(page.locator('#verifiedReturn')).toContainText('Awaiting host approval');
});

test('success read failure cannot turn redirect parameters into verified payment claims', async ({ page }) => {
  await guestFixture(page, { active: 'FH-A', emails: { 'FH-A': 'a@example.invalid' }, delay: ['FH-A'], paymentState: 'paid' }); await page.goto('/payment-success.html?setup=1&lang=en');
  await page.locator('#returnReference').fill('FH-B'); await page.locator('#returnEmail').fill('b@example.invalid'); await page.evaluate(() => { window.__guestRecovery.readError = true; window.__guestRecovery.release('FH-A'); });
  await page.locator('#checkReturn').click(); await expect(page.locator('#returnMessage')).toContainText('could not verify'); await expect(page.locator('#verifiedReturn')).toBeEmpty(); await expect(page.locator('h1')).toHaveText('Check your booking status');
});

for (const screen of ['payment', 'booking-status']) for (const language of ['en', 'de']) test(`${screen} uses validated Admin times in ${language}`, async ({ page }) => {
  await guestFixture(page, { active: 'FH-A', emails: { 'FH-A': 'a@example.invalid' }, bookingStatus: 'confirmed', paymentState: 'paid', checkIn: 'Arrival from 18:30', checkInDe: 'Ab 19:15 Uhr', checkOut: '10:00', checkOutDe: '9:45' });
  await page.goto('/' + screen + '.html?reference=FH-A&lang=' + language);
  const container = page.locator(screen === 'payment' ? '.stay-facts' : '.guest-support'); await expect(container).toContainText(language === 'en' ? '18:30' : '19:15'); await expect(container).toContainText(language === 'en' ? '10:00' : '09:45');
});

test('invalid or unavailable managed times fall back safely and storage denial stays usable', async ({ page }) => {
  await guestFixture(page, { emails: { 'FH-A': 'a@example.invalid' }, checkIn: '29:00', checkOut: '11:99' }); await page.goto('/payment.html?reference=FH-A');
  await expect(page.locator('.stay-facts')).toContainText('17:00'); await expect(page.locator('.stay-facts')).toContainText('11:00');
  expect(await page.evaluate(() => window.FrankiHolzGuest.parseTime('Check-in at 9:30', '17:00'))).toBe('09:30');
  expect(await page.evaluate(() => window.FrankiHolzGuest.parseTime('125:00', '17:00'))).toBe('17:00');
  await page.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError'); } }); Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  await page.goto('/payment-success.html?reference=FH-A&lang=de'); await expect(page.locator('h1')).toHaveText('Buchungsstatus prüfen'); await expect(page.locator('#returnMessage')).toContainText('E-Mail'); await expect(page.locator('#verifiedReturn')).toBeEmpty();
});
