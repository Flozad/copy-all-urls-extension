'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const EXT = path.join(__dirname, '..', 'extension');
const readExt = (f) => fs.readFileSync(path.join(EXT, f), 'utf8');

// Collect every literal id passed to getElementById('...') in a JS file.
function referencedIds(js) {
  const ids = new Set();
  const re = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(js))) ids.add(m[1]);
  return ids;
}

// Collect every id="..." declared in an HTML file.
function declaredIds(html) {
  const ids = new Set();
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  return ids;
}

// Collect values of a given data-* attribute in HTML.
function dataValues(html, attr) {
  const vals = new Set();
  const re = new RegExp(`\\bdata-${attr}\\s*=\\s*["']([^"']+)["']`, 'g');
  let m;
  while ((m = re.exec(html))) vals.add(m[1]);
  return vals;
}

const PAIRS = [
  { js: 'popup.js', html: 'popup.html' },
  { js: 'options.js', html: 'options.html' },
  { js: 'welcome.js', html: 'welcome.html' }
];

for (const { js, html } of PAIRS) {
  test(`${js}: every getElementById target exists in ${html}`, () => {
    const declared = declaredIds(readExt(html));
    const referenced = referencedIds(readExt(js));
    const missing = [...referenced].filter((id) => !declared.has(id));
    assert.deepEqual(missing, [], `ids referenced in ${js} but absent from ${html}: ${missing.join(', ')}`);
  });
}

test('popup: every format option in the JS map has a data-format button in the HTML', () => {
  const html = readExt('popup.html');
  const buttons = dataValues(html, 'format');
  // The six formats the popup claims to support.
  const expected = ['url_only', 'text', 'html', 'json', 'delimited', 'custom'];
  for (const f of expected) {
    assert.ok(buttons.has(f), `popup.html is missing a data-format="${f}" option`);
  }
});

test('popup: every data-source option is one the code understands', () => {
  const html = readExt('popup.html');
  const sources = dataValues(html, 'source');
  for (const s of sources) {
    assert.ok(['clipboard', 'textarea'].includes(s), `unknown data-source="${s}"`);
  }
  assert.ok(sources.has('clipboard') && sources.has('textarea'), 'both paste sources present');
});

test('popup: core action buttons and containers are present', () => {
  const declared = declaredIds(readExt('popup.html'));
  for (const id of [
    'actionCopy', 'actionPaste', 'copiedContent', 'autoCopyToggle',
    'historyButton', 'historyPanel', 'historyList', 'clearHistoryButton',
    'formatDropdown', 'sourceDropdown', 'message', 'optionsButton'
  ]) {
    assert.ok(declared.has(id), `popup.html missing #${id}`);
  }
});

test('options: every settings control referenced by JS exists in the HTML', () => {
  const declared = declaredIds(readExt('options.html'));
  for (const id of [
    'formats', 'smart_paste', 'include_all_windows', 'selected_tabs_only',
    'delimiter_input', 'custom_template', 'show_context_menu', 'save_history',
    'auto_action', 'bold_titles', 'theme_preference', 'reset_settings',
    'confirm_reset', 'cancel_reset'
  ]) {
    assert.ok(declared.has(id), `options.html missing #${id}`);
  }
});

test('welcome: the elements welcome.js drives are present in the HTML', () => {
  const declared = declaredIds(readExt('welcome.html'));
  for (const id of ['openOptions', 'kbdCopy', 'kbdPaste']) {
    assert.ok(declared.has(id), `welcome.html missing #${id}`);
  }
});

test('welcome: the command names it labels are the ones the manifest declares', () => {
  const manifest = JSON.parse(readExt('manifest.json'));
  const js = readExt('welcome.js');
  for (const cmd of Object.keys(manifest.commands || {})) {
    assert.ok(
      js.includes(`'${cmd}'`) || js.includes(`"${cmd}"`),
      `welcome.js has no shortcut label for command "${cmd}"`
    );
  }
});

test('manifest commands are all handled in background.js', () => {
  const manifest = JSON.parse(readExt('manifest.json'));
  const bg = readExt('background.js');
  for (const cmd of Object.keys(manifest.commands || {})) {
    assert.ok(bg.includes(`'${cmd}'`) || bg.includes(`"${cmd}"`), `background.js does not handle command "${cmd}"`);
  }
});

test('every script referenced by popup.html and options.html exists on disk', () => {
  for (const htmlFile of ['popup.html', 'options.html', 'offscreen.html', 'welcome.html']) {
    const html = readExt(htmlFile);
    const re = /<script[^>]*\bsrc\s*=\s*["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(html))) {
      const src = m[1];
      if (/^https?:/.test(src)) continue; // skip any CDN (there should be none)
      assert.ok(fs.existsSync(path.join(EXT, src)), `${htmlFile} references missing script ${src}`);
    }
  }
});
