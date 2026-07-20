#!/usr/bin/env node
// Packages extension/ into a Web Store upload zip named after the manifest
// version. The zip is a build artifact (gitignored) — always regenerate rather
// than reusing an old one, which is how jquery and contentScript.js survived in
// the shipped package long after they were deleted from the source tree.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'extension', 'manifest.json'), 'utf8')
);
const out = path.join(root, `umbrella-copy-all-urls-${manifest.version}.zip`);

fs.rmSync(out, { force: true });

// -X drops macOS extended attributes; the excludes keep __MACOSX/ and .DS_Store
// resource forks out of the archive.
execFileSync(
  'zip',
  ['-r', '-X', out, '.', '-x', '.*', '-x', '*/.*', '-x', '__MACOSX/*'],
  { cwd: path.join(root, 'extension'), stdio: 'inherit' }
);

const listed = execFileSync('unzip', ['-l', out], { encoding: 'utf8' });
console.log(`\nBuilt ${path.relative(root, out)}`);
console.log(listed.trim().split('\n').slice(-1)[0]);
