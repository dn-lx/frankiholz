import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildSite, publicFiles } from '../scripts/build-site.mjs';
import { syncSupabase, vendorFiles, version } from '../scripts/vendor-supabase.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'frankiholz-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const put = async (path, content = path) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  };
  await put('package.json', JSON.stringify({ dependencies: { '@supabase/supabase-js': version } }));
  await put('node_modules/@supabase/supabase-js/package.json', JSON.stringify({ version }));
  for (const [source] of vendorFiles) await put(`node_modules/@supabase/supabase-js/${source}`, `upstream ${source}`);
  await syncSupabase({ root, check: false });
  for (const path of publicFiles) await put(path);
  return { root, put };
}

async function files(root, prefix = '') {
  const output = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...await files(root, path));
    else output.push(path);
  }
  return output.sort();
}

test('vendor check detects a modified browser bundle and an unpinned runtime dependency', async t => {
  const { root, put } = await fixture(t);
  await syncSupabase({ root });
  await put(`assets/vendor/supabase-js-${version}.js`, 'modified runtime');
  await assert.rejects(syncSupabase({ root }), /differs from the pinned npm artifact/);
  await syncSupabase({ root, check: false });
  await put('package.json', JSON.stringify({ dependencies: { '@supabase/supabase-js': `^${version}` } }));
  await assert.rejects(syncSupabase({ root }), /pinned exactly/);
});

test('public artifact excludes private source, local artifacts and unlisted entrypoints', async t => {
  const { root, put } = await fixture(t);
  for (const path of ['docs/CURRENT-HANDOFF.md', 'supabase/functions/private.ts', 'tests/fixture.js', 'package-lock.json', 'node_modules/private.js', '.env', 'internal.html', 'assets/.env', 'assets/README.md', 'assets/maintenance.sh', 'dist/stale-private.txt']) await put(path);
  await put('assets/runtime.js');
  await put('assets/nested/icon.svg');
  await put('.well-known/security.txt');
  await buildSite({ root });
  const expected = [...publicFiles, 'assets/runtime.js', 'assets/nested/icon.svg', '.well-known/security.txt', ...vendorFiles.map(([, name]) => `assets/vendor/${name}`)].sort();
  assert.deepEqual(await files(join(root, 'dist')), expected);
  assert.equal(await readFile(join(root, 'dist/index.html'), 'utf8'), 'index.html');
  await buildSite({ root });
  assert.deepEqual(await files(join(root, 'dist')), expected, 'repeated builds must preserve the same public inventory');
});

test('public artifact rejects symlinks to non-public files', async t => {
  const { root, put } = await fixture(t);
  await put('private-note.txt', 'not for publication');
  await symlink(join(root, 'private-note.txt'), join(root, 'assets/leaked.txt'));
  await assert.rejects(buildSite({ root }), /must not be symlinks/);
});

test('build refuses a source directory as its output', async t => {
  const { root, put } = await fixture(t);
  await put('assets/runtime.js', 'keep source intact');
  await assert.rejects(buildSite({ root, output: join(root, 'assets') }), /project dist directory/);
  assert.equal(await readFile(join(root, 'assets/runtime.js'), 'utf8'), 'keep source intact');
});
