async function blockExternalNetwork(page) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    // Offline fixtures install a synthetic client before page scripts. The local
    // SDK is intercepted just as the former external CDN was; provider requests
    // remain blocked. vendor-runtime.spec.mjs exercises the actual browser SDK.
    if (url.pathname === '/assets/vendor/supabase-js-2.118.0.js') {
      await route.fulfill({status:200,contentType:'application/javascript',body:'/* Synthetic Supabase client supplied by this test. */'});
      return;
    }
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      await route.continue();
    } else {
      await route.abort();
    }
  });
}

export { blockExternalNetwork };
