'use strict';

// Copying rendered links from a page puts the link LABELS in text/plain and
// the actual URLs only in the href attributes of the text/html flavor. The
// readers prefer plain text, so without an explicit HTML fallback the href
// extraction is unreachable and paste fails with "No URL found" on exactly the
// content it was written for.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadBackground } = require('./helpers/harness');

const PLAIN_LABELS = 'Example Site\nAnother Site';
const HTML_FLAVOR =
  '<a href="https://example.test/page">Example Site</a>' +
  '<a href="https://another.test/page">Another Site</a>';

const urlsOf = (chrome) => chrome._createdTabs.map((t) => t.url);

test('paste falls back to the HTML flavor when plain text yields no URLs', async () => {
  const chrome = createChrome({ tabs: [] });
  const { Action } = loadBackground(chrome);

  const opened = await Action.paste(PLAIN_LABELS, HTML_FLAVOR);

  assert.equal(opened, 2);
  assert.deepEqual(urlsOf(chrome), [
    'https://example.test/page',
    'https://another.test/page'
  ]);
});

test('paste prefers the plain flavor when it does contain URLs', async () => {
  const chrome = createChrome({ tabs: [] });
  const { Action } = loadBackground(chrome);

  await Action.paste('https://plain.test/', HTML_FLAVOR);

  assert.deepEqual(urlsOf(chrome), ['https://plain.test/'],
    'the HTML fallback is not consulted when the plain text works');
});

test('paste uses the HTML flavor when plain text is empty entirely', async () => {
  const chrome = createChrome({ tabs: [] });
  const { Action } = loadBackground(chrome);

  const opened = await Action.paste('', HTML_FLAVOR);

  assert.equal(opened, 2);
});

test('the HTML fallback still enforces the http(s) allowlist', async () => {
  const chrome = createChrome({ tabs: [] });
  const { Action } = loadBackground(chrome);

  await Action.paste('no urls here', [
    '<a href="https://good.test/">good</a>',
    '<a href="chrome://settings">internal</a>',
    '<a href="javascript:alert(1)">xss</a>',
    '<a href="file:///etc/passwd">local</a>'
  ].join(''));

  assert.deepEqual(urlsOf(chrome), ['https://good.test/']);
});

test('no URLs in either flavor reports the error, opens nothing', async () => {
  const chrome = createChrome({ tabs: [] });
  const { Action } = loadBackground(chrome);

  const opened = await Action.paste('just text', '<p>still just text</p>');

  assert.equal(opened, 0);
  assert.deepEqual(urlsOf(chrome), []);
  const err = [...chrome._sent].reverse().find((m) => m.type === 'paste' && m.errorMsg);
  assert.match(err.errorMsg, /No URL found/);
});
