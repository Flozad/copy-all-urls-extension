'use strict';

// Tab titles are attacker-controlled: any page the user visits sets its own
// document.title. The html format is written to the clipboard as a real
// text/html flavor, so unescaped markup pastes as LIVE HTML into whatever the
// user pastes into. These tests pin both the escaping and the plain-text
// flavor that is derived alongside it.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadBackground } = require('./helpers/harness');

const HOSTILE_TABS = [
  {
    title: '</a><img src=x onerror=alert(1)>',
    url: 'https://evil.test/?a=1&b=2',
    highlighted: true
  },
  { title: `Bob's "Tips & Tricks" <b>page</b>`, url: 'https://ok.test/', highlighted: true }
];

function copyToOf(tabs) {
  const chrome = createChrome({ tabs });
  return loadBackground(chrome).CopyTo;
}

test('CopyTo.html escapes markup in tab titles', () => {
  const html = copyToOf(HOSTILE_TABS).html(HOSTILE_TABS);
  // `onerror=` still appears as literal text — that is fine and expected. What
  // matters is that its enclosing < > are escaped, so it is inert text rather
  // than a parsed attribute on a real element.
  assert.doesNotMatch(html, /<img/, 'no raw <img> tag survives');
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  // Exactly two anchors and one break — the injected </a> did not create more.
  assert.equal(html.match(/<a /g).length, 2);
  assert.equal(html.match(/<\/a>/g).length, 2);
});

test('CopyTo.html escapes ampersands and quotes in URLs', () => {
  const html = copyToOf(HOSTILE_TABS).html(HOSTILE_TABS);
  assert.match(html, /href="https:\/\/evil\.test\/\?a=1&amp;b=2"/);
});

test('CopyTo.html cannot have its href attribute broken out of', () => {
  const tabs = [{ title: 't', url: 'https://x.test/"onmouseover="evil()' }];
  const html = copyToOf(tabs).html(tabs);
  assert.doesNotMatch(html, /"onmouseover="/);
  assert.match(html, /&quot;onmouseover=&quot;/);
});

test('CopyTo.html still emits <strong> when bold is on', () => {
  const tabs = [{ title: 'hi', url: 'https://a.test/' }];
  const html = copyToOf(tabs).html(tabs, true);
  assert.match(html, /<strong>hi<\/strong>/);
});

test('html copy sends an intact plain-text flavor alongside the HTML', async () => {
  // Regression: the plain flavor used to be derived by regex-stripping the HTML
  // string. Once titles became entity-escaped, the entity-deleting pass
  // (/&[^;]+;/g -> '') silently ate every & < > " ' and dropped the URLs.
  const chrome = createChrome({ tabs: HOSTILE_TABS });
  Object.assign(chrome.storage.sync._data, { format: 'html' });
  const { Action } = loadBackground(chrome);
  await Action.copy();

  const msg = [...chrome._sent].reverse().find((m) => m.type === 'copy');
  assert.equal(msg.mimeType, 'html');
  assert.ok(msg.plainContent, 'a plain-text flavor is supplied');

  // The plain flavor is real text built from the tabs — not stripped markup.
  assert.match(msg.plainContent, /Bob's "Tips & Tricks" <b>page<\/b>/);
  assert.match(msg.plainContent, /https:\/\/ok\.test\//);
  assert.doesNotMatch(msg.plainContent, /&amp;|&lt;|&#39;/, 'no leftover entities');
});

test('non-html formats send plainContent equal to content', async () => {
  const chrome = createChrome({ tabs: HOSTILE_TABS });
  Object.assign(chrome.storage.sync._data, { format: 'url_only' });
  const { Action } = loadBackground(chrome);
  await Action.copy();

  const msg = [...chrome._sent].reverse().find((m) => m.type === 'copy');
  assert.equal(msg.plainContent, msg.content);
});
