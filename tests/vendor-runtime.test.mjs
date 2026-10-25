import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { syncSupabase, version } from '../scripts/vendor-supabase.mjs';

test('committed Supabase runtime and license match the exact installed npm artifact', async () => {
  await syncSupabase();
});

test('guest and admin pages load the pinned self-hosted Supabase runtime', async () => {
  for (const name of ['index.html', 'admin.html', 'booking-status.html', 'payment.html', 'payment-success.html']) {
    const html = await readFile(new URL(`../${name}`, import.meta.url), 'utf8');
    const sources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
      .map(match => match[1]).filter(source => source.includes('supabase-js'));
    assert.deepEqual(sources.map(source => source.split('?')[0]), [`/assets/vendor/supabase-js-${version}.js`], name);
  }
});

test('self-hosted UMD retains the browser createClient API without requiring a CDN', async () => {
  const source = await readFile(new URL(`../assets/vendor/supabase-js-${version}.js`, import.meta.url), 'utf8');
  const context = vm.createContext({ console, URL, Headers, Request, Response, fetch, WebSocket, TextEncoder, TextDecoder, AbortController, setTimeout, clearTimeout, setInterval, clearInterval });
  vm.runInContext(source, context, { filename: `supabase-js-${version}.js` });
  assert.equal(typeof context.supabase.createClient, 'function');
  const client = context.supabase.createClient('https://fixture.supabase.co', 'fixture-publishable-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  assert.equal(typeof client.from('rooms').select, 'function');
  assert.equal(typeof client.rpc, 'function');
  assert.equal(typeof client.auth.getSession, 'function');
  assert.equal(typeof client.storage.from, 'function');
});
