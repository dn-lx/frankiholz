// Shared guest return continuity and validated Admin-managed arrival times.
(() => {
  'use strict';
  const defaults = () => ({ en: { checkIn: '17:00', checkOut: '11:00' }, de: { checkIn: '17:00', checkOut: '11:00' } });
  function parseTime(value, fallback) {
    const match = String(value ?? '').match(/(?:^|[^0-9])((?:[01]?\d|2[0-3]):[0-5]\d)(?![0-9])/);
    return match ? match[1].padStart(5, '0') : fallback;
  }
  async function loadStayTimes(client) {
    const times = defaults();
    try {
      const { data, error } = await client.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key', ['fhCheckIn', 'fhCheckOut']);
      if (error) return times;
      for (const lang of ['en', 'de']) for (const [key, field] of [['fhCheckIn', 'checkIn'], ['fhCheckOut', 'checkOut']]) {
        const row = data?.find(item => item.copy_key === key);
        times[lang][field] = parseTime(row?.['text_' + lang], times[lang][field]);
      }
    } catch (error) { /* The known homepage defaults remain available when content cannot be read. */ }
    return times;
  }
  function restoreCredentials({ checkoutFallback = false } = {}) {
    let reference = new URLSearchParams(location.search).get('reference')?.trim() || '';
    if (!reference && checkoutFallback) { try { reference = sessionStorage.getItem('frankiholz-active-checkout-reference') || ''; } catch (error) {} }
    let email = '';
    if (reference) { try { email = sessionStorage.getItem('frankiholz-payment-email:' + reference) || ''; } catch (error) {} }
    return { reference, email };
  }
  function rememberCredentials({ reference, email }) {
    if (!reference || !email) return;
    try { sessionStorage.setItem('frankiholz-payment-email:' + reference, email); } catch (error) {}
  }
  function verifiedCheckoutUrl(value) {
    if (typeof value !== 'string') throw new Error('Invalid Stripe checkout address');
    const target = new URL(value);
    if (target.protocol !== 'https:' || !['checkout.stripe.com', 'payments.stripe.com'].includes(target.hostname) || target.username || target.password || target.port) throw new Error('Invalid Stripe checkout address');
    return target.href;
  }
  function rememberCheckout(credentials, checkoutUrl) {
    // Revalidate here so a future caller cannot mark an arbitrary redirect as an active checkout.
    const target = verifiedCheckoutUrl(checkoutUrl);
    rememberCredentials(credentials);
    try { sessionStorage.setItem('frankiholz-active-checkout-reference', credentials.reference); } catch (error) {}
    return target;
  }
  window.FrankiHolzGuest = { parseTime, loadStayTimes, restoreCredentials, rememberCredentials, rememberCheckout, verifiedCheckoutUrl, defaultStayTimes: defaults };
})();
