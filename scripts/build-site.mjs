import { cp, mkdir, readdir, lstat, rm } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncSupabase } from './vendor-supabase.mjs';

// Explicit public entrypoints keep new source, notes and local files out of deployments.
export const publicFiles = [
  'index.html', 'admin.html', 'booking-status.html', 'payment.html',
  'payment-success.html', '404.html', 'netlify-forms.html',
  'imprint.html', 'privacy.html', 'robots.txt', 'sitemap.xml',
];
const assetTypes = new Set(['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.txt', '.json', '.webmanifest']);

async function copyPublicDirectory(source, output, { assets = false } = {}) {
  const metadata = await lstat(source);
  if (metadata.isSymbolicLink()) throw new Error(`Public files must not be symlinks: ${source}`);
  await mkdir(output, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const from = join(source, entry.name);
    const to = join(output, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Public files must not be symlinks: ${from}`);
    if (entry.isDirectory()) await copyPublicDirectory(from, to, { assets });
    else if (entry.isFile() && (!assets || assetTypes.has(extname(entry.name).toLowerCase()))) await cp(from, to);
  }
}

export async function buildSite({ root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), output = join(root, 'dist') } = {}) {
  root = resolve(root);
  output = resolve(output);
  if (!relative(root, output) || relative(root, output).startsWith('..')) throw new Error('Build output must be a directory inside the project root');
  await syncSupabase({ root });
  // Clean only the named output directory, never the checkout or source assets.
  if (output !== join(root, 'dist')) throw new Error('Build output must be the project dist directory');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const name of publicFiles) {
    const source = join(root, name);
    if ((await lstat(source)).isSymbolicLink()) throw new Error(`Public files must not be symlinks: ${source}`);
    await cp(source, join(output, name));
  }
  await copyPublicDirectory(join(root, 'assets'), join(output, 'assets'), { assets: true });
  try {
    await copyPublicDirectory(join(root, '.well-known'), join(output, '.well-known'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSite();
  console.log('Built public pages and runtime assets in dist/');
}
