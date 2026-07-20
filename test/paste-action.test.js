'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadBackground } = require('./helpers/harness');

// The exact rich-HTML clipboard payload from the bug screenshot: three <a>
// anchors joined by <br>, with query strings, percent-encoding, and a hash.
const SCREENSHOT_HTML =
  '<a href="https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Abolidolar.com&hl=es&metrics=CLICKS&num_of_months=16">Rendimiento en los resultados de la Búsqueda</a>' +
  '<br><a href="https://analytics.google.com/analytics/web/#/a338775579p470020555/reports/intelligenthome?params=_u..nav%3Dmaui">Analytics | Home</a>' +
  '<br><a href="https://vercel.com/1658725939913355955/designloop-free-html-to-figma-live-page-editor">DesignLoop</a>';

async function runPaste(content, settings = {}) {
  const chrome = createChrome();
  Object.assign(chrome.storage.sync._data, settings);
  const { Action } = loadBackground(chrome);
  await Action.paste(content);
  return chrome;
}

function pasteResult(chrome) {
  return [...chrome._sent].reverse().find((m) => m.type === 'paste');
}

test('smartPaste ON extracts every href from rich HTML (screenshot case)', async () => {
  const chrome = await runPaste(SCREENSHOT_HTML, { smartPaste: true });
  const urls = chrome._createdTabs.map((t) => t.url);
  assert.equal(urls.length, 3, 'opens all three tabs');
  assert.ok(urls[0].startsWith('https://search.google.com/search-console/'));
  assert.ok(urls[1].startsWith('https://analytics.google.com/analytics/web/'));
  assert.ok(urls[2].startsWith('https://vercel.com/'));
  assert.equal(pasteResult(chrome).success, true);
});

test('smartPaste ON: extracted URLs are not truncated by & in query strings', async () => {
  const chrome = await runPaste(SCREENSHOT_HTML, { smartPaste: true });
  const first = chrome._createdTabs[0].url;
  assert.match(first, /hl=es/);
  assert.match(first, /num_of_months=16/);
});

test('smartPaste ON extracts URLs from a plain newline-separated list', async () => {
  const chrome = await runPaste('https://a.test/\nhttps://b.test/\nhttps://c.test/', { smartPaste: true });
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), [
    'https://a.test/', 'https://b.test/', 'https://c.test/'
  ]);
});

test('plain text keeps duplicate lines: N pasted URLs open N tabs', async () => {
  // Regression: two identical URL lines used to collapse to one tab because the
  // whole pipeline de-duplicated. Plain text is now taken literally.
  const sameUrl = 'https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Abolidolar.com&hl=es';
  const chrome = await runPaste(`${sameUrl}\n${sameUrl}`, { smartPaste: true });
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), [sameUrl, sameUrl]);
  assert.equal(pasteResult(chrome).urlCount, 2);
});

test('plain text: three distinct URLs open three tabs in order', async () => {
  const chrome = await runPaste('https://a.test/\nhttps://a.test/\nhttps://b.test/', { smartPaste: true });
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), [
    'https://a.test/', 'https://a.test/', 'https://b.test/'
  ]);
});

test('smartPaste OFF also preserves duplicate lines', async () => {
  const chrome = await runPaste('https://dup.test/\nhttps://dup.test/', { smartPaste: false });
  assert.equal(chrome._createdTabs.length, 2);
});

test('HTML still dedupes the href-plus-visible-text double count', async () => {
  // <a href="url">url</a> yields the URL from BOTH the href and the anchor
  // text; that accidental pair must collapse to a single tab.
  const chrome = await runPaste(
    '<a href="https://dup.test/">https://dup.test/</a><br><a href="https://other.test/">other</a>',
    { smartPaste: true }
  );
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), [
    'https://dup.test/', 'https://other.test/'
  ]);
});

test('smartPaste ON strips trailing punctuation and surrounding quotes', async () => {
  const chrome = await runPaste('Visit (https://x.test/page), now!', { smartPaste: true });
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://x.test/page']);
});

test('smartPaste ON ignores non-http(s) schemes for safety', async () => {
  const chrome = await runPaste('javascript:alert(1)\nfile:///etc/passwd\nhttps://safe.test/', { smartPaste: true });
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://safe.test/']);
});

test('smartPaste OFF opens each non-empty line (blank lines skipped)', async () => {
  const chrome = await runPaste('https://a.test/\n\nhttps://b.test/\n', { smartPaste: false });
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://a.test/', 'https://b.test/']);
});

test('smartPaste OFF still enforces the http(s) allowlist', async () => {
  const chrome = await runPaste('chrome://settings\nhttps://ok.test/\nfile:///etc/passwd', { smartPaste: false });
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://ok.test/']);
});

test('paste is capped at MAX_PASTE_TABS (50) and flags it', async () => {
  const many = Array.from({ length: 70 }, (_, i) => `https://n${i}.test/`).join('\n');
  const chrome = await runPaste(many, { smartPaste: true });
  assert.equal(chrome._createdTabs.length, 50, 'never opens more than 50 tabs');
  assert.equal(pasteResult(chrome).capped, true);
});

test('empty content yields a "No URL found" error, not a crash', async () => {
  const chrome = await runPaste('   \n  \n', { smartPaste: true });
  const res = pasteResult(chrome);
  assert.equal(res.errorMsg, 'No URL found in the provided content');
  assert.equal(chrome._createdTabs.length, 0);
});

test('null/undefined content is reported, never thrown', async () => {
  const chrome = await runPaste(undefined, { smartPaste: true });
  const res = pasteResult(chrome);
  assert.ok(res && res.errorMsg, 'an error message is sent');
  assert.equal(chrome._createdTabs.length, 0);
});

// This is the crux of the screenshot failure. When a user copies *rendered*
// links from a web page, the clipboard's text/plain flavour is just the link
// TEXT ("Rendimiento en los resultados...") — the URLs live only in text/html.
// If smartPaste runs over that plain text it finds zero URLs and errors out,
// exactly like the screenshot. Extracting from the HTML flavour must recover them.
test('rich-link plain text has no URLs, but the HTML flavour does', async () => {
  const plainFlavour = 'Rendimiento en los resultados de la Búsqueda\nAnalytics | Home\nDesignLoop';
  const overPlain = await runPaste(plainFlavour, { smartPaste: true });
  assert.equal(overPlain._createdTabs.length, 0, 'plain-text flavour has no extractable URLs');
  assert.ok(pasteResult(overPlain).errorMsg, 'and so it errors — this is the screenshot failure');

  const overHtml = await runPaste(SCREENSHOT_HTML, { smartPaste: true });
  assert.equal(overHtml._createdTabs.length, 3, 'the HTML flavour recovers all URLs');
});
