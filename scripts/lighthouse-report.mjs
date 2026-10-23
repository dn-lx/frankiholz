import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'lighthouse-report');
const cli = createRequire(import.meta.url).resolve('lighthouse/cli/index.js');
const thresholds = { performance: 0.7, accessibility: 0.85, 'best-practices': 0.85, seo: 0.85 };
const pages = [['homepage', '/'], ['booking-status', '/booking-status.html']];
const offline = process.env.LIGHTHOUSE_OFFLINE === '1';
// Never let a read-only quality report trigger the public backend's calendar sync.
const blocked = ['*functions/v1/frankiholz-sync-airbnb*', ...(offline ? ['https://*'] : [])];

const port = await new Promise((resolvePort, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    probe.close(error => error ? reject(error) : resolvePort(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/static-server.mjs', '.', String(port)], { cwd: root, stdio: 'inherit' });
const serverClosed = once(server, 'close');
let audit;
const stop = () => {
  audit?.kill('SIGTERM');
  server.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null || server.signalCode !== null) throw new Error('Local Lighthouse server exited before readiness');
    try { ready = (await fetch(origin)).ok; } catch {}
    if (ready) break;
    await delay(50);
  }
  if (!ready) throw new Error('Local Lighthouse server did not become ready');
  await mkdir(output, { recursive: true });
  if (offline) console.log('Offline Lighthouse lab run: external HTTPS is blocked; scores do not represent the deployed site.');
  for (const [name, path] of pages) {
    const prefix = join(output, name);
    await Promise.all(['html', 'json'].map(type => rm(`${prefix}.report.${type}`, { force: true })));
    audit = spawn(process.execPath, [
      cli, origin + path, '--output=json', '--output=html', `--output-path=${prefix}`,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
      ...blocked.map(pattern => `--blocked-url-patterns=${pattern}`),
      '--no-enable-error-reporting',
    ], { cwd: root, stdio: 'inherit' });
    const [code, signal] = await once(audit, 'close');
    audit = undefined;
    if (code !== 0) throw new Error(`Lighthouse failed for ${path}: ${signal || code}`);
    const result = JSON.parse(await readFile(`${prefix}.report.json`, 'utf8'));
    if (result.runtimeError) throw new Error(`${path}: ${result.runtimeError.message}`);
    for (const [category, minimum] of Object.entries(thresholds)) {
      const score = result.categories[category]?.score;
      if (typeof score !== 'number') throw new Error(`${path}: missing ${category} score`);
      console.log(`${name} ${category}: ${Math.round(score * 100)}`);
      if (score < minimum) console.warn(`WARNING: ${name} ${category} is below ${minimum * 100}`);
    }
  }
} finally {
  stop();
  await serverClosed;
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
}
