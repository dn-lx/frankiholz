import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const version = '2.118.0';
export const vendorFiles = [
  ['dist/umd/supabase.js', `supabase-js-${version}.js`],
  ['LICENSE', `supabase-js-${version}.LICENSE.txt`],
];

export async function syncSupabase({ root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), check = true } = {}) {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const upstream = join(root, 'node_modules/@supabase/supabase-js');
  const installed = JSON.parse(await readFile(join(upstream, 'package.json'), 'utf8'));
  if (manifest.dependencies?.['@supabase/supabase-js'] !== version || installed.version !== version) {
    throw new Error(`Supabase must be installed and pinned exactly to ${version}; run npm ci`);
  }
  const target = join(root, 'assets/vendor');
  if (!check) await mkdir(target, { recursive: true });
  for (const [source, name] of vendorFiles) {
    const bytes = await readFile(join(upstream, source));
    const output = join(target, name);
    if (check) {
      if (!(await readFile(output)).equals(bytes)) throw new Error(`${name} differs from the pinned npm artifact; run npm run vendor:update`);
    } else {
      await writeFile(output, bytes);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (!['update', 'check'].includes(mode)) throw new Error('Usage: node scripts/vendor-supabase.mjs update|check');
  await syncSupabase({ check: mode === 'check' });
  console.log(`Supabase ${version} vendor files ${mode === 'check' ? 'match the pinned npm artifact' : 'updated from the pinned npm artifact'}`);
}
