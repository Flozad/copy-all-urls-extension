'use strict';

// The version lives in three places and the Web Store rejects a re-upload of an
// existing version, so drift here is caught at submission time at the earliest
// — after you have already built and tried to upload. Catch it at test time.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'extension', 'manifest.json'), 'utf8')
);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');

test('manifest.json and package.json agree on the version', () => {
  assert.equal(pkg.version, manifest.version);
});

test('the manifest version has a CHANGELOG entry', () => {
  const heading = new RegExp('^## \\[' + manifest.version.replace(/\./g, '\\.') + '\\]', 'm');
  assert.match(
    changelog,
    heading,
    'CHANGELOG.md has no "## [' + manifest.version + ']" section'
  );
});

test('the newest CHANGELOG entry is the version being shipped', () => {
  const first = changelog.match(/^## \[([^\]]+)\]/m);
  assert.ok(first, 'CHANGELOG has no version headings');
  assert.equal(
    first[1],
    manifest.version,
    'the top CHANGELOG entry should be the version in the manifest'
  );
});

test('the manifest declares the fields the store listing relies on', () => {
  for (const field of ['short_name', 'author', 'homepage_url', 'minimum_chrome_version']) {
    assert.ok(manifest[field], 'manifest is missing ' + field);
  }
  assert.equal(manifest.manifest_version, 3, 'the store only accepts MV3');
});

test('every declared permission is one the extension actually uses', () => {
  // A permission nobody uses is an install-time warning for nothing, and the
  // store asks you to justify each one individually.
  const sources = ['background.js', 'popup.js', 'options.js', 'offscreen.js', 'welcome.js']
    .map((f) => path.join(ROOT, 'extension', f))
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, 'utf8'))
    .join('\n');

  const evidence = {
    tabs: /chrome\.tabs\./,
    storage: /chrome\.storage\./,
    contextMenus: /chrome\.contextMenus\./,
    offscreen: /chrome\.offscreen\./,
    alarms: /chrome\.alarms\./,
    // Clipboard access goes through the offscreen document's execCommand and
    // navigator.clipboard rather than a chrome.* namespace.
    clipboardWrite: /execCommand\(['"]copy|clipboard\.write/,
    clipboardRead: /execCommand\(['"]paste|clipboard\.read/
  };

  const unused = (manifest.permissions || []).filter((perm) => {
    const probe = evidence[perm];
    return probe && !probe.test(sources);
  });

  assert.deepEqual(unused, [], 'declared but unused permissions');
});

test('the extension requests no host permissions', () => {
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
});
