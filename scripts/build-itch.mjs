// Build + zip the itch.io upload. One-stop script: sets ITCH_BUILD env so
// vite strips the service worker + sourcemaps, runs tsc + vite build, then
// packages dist/ into netrunner-itch.zip at the repo root.
//
// Usage: npm run itch
// Output: netrunner-itch.zip — upload this to itch.io → Edit game → Uploads
//         Check "This file will be played in the browser"
//         Set iframe size to 1280x720 (landscape).

import { execSync } from 'node:child_process';
import { createWriteStream, existsSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const outFile = path.join(root, 'netrunner-itch.zip');

process.env.ITCH_BUILD = '1';

function run(cmd) {
  console.log(`\n[itch] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, env: process.env });
}

// 1. Type check — fail the whole pipeline if TS is broken.
run('npx tsc --noEmit');

// 2. Production build (PWA plugin disabled via ITCH_BUILD=1 in vite.config.ts).
run('npx vite build');

if (!existsSync(distDir)) {
  console.error('[itch] dist/ missing after build — bailing out.');
  process.exit(1);
}

// 3. Remove previous zip, then compress dist contents (NOT the dist folder
//    itself — itch expects index.html at the zip root).
if (existsSync(outFile)) rmSync(outFile);

const output = createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const mb = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n[itch] ✓ wrote ${path.relative(root, outFile)} (${mb} MB)`);
  console.log(`[itch] index size check: ${statSync(path.join(distDir, 'index.html')).size} bytes`);
  console.log(`[itch] next step: upload to itch.io → Edit game → Uploads`);
  console.log(`[itch]   - check "This file will be played in the browser"`);
  console.log(`[itch]   - set iframe size 1280 × 720 (landscape)`);
});

archive.on('warning', (err) => {
  if (err.code !== 'ENOENT') throw err;
});
archive.on('error', (err) => { throw err; });
archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();
