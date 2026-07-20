'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadBackground } = require('./helpers/harness');

const TABS = [
  { title: 'Example Domain', url: 'https://example.com/', highlighted: true },
  { title: 'Search & Rescue', url: 'https://foo.com/a?b=1&c=2', highlighted: false },
  { title: 'Third', url: 'http://third.test/path#frag', highlighted: true }
];

function load(tabs = TABS) {
  const chrome = createChrome({ tabs });
  return { chrome, ...loadBackground(chrome) };
}

test('url_only: one URL per line, nothing else', () => {
  const { CopyTo } = load();
  assert.equal(
    CopyTo.url_only(TABS),
    'https://example.com/\nhttps://foo.com/a?b=1&c=2\nhttp://third.test/path#frag'
  );
});

test('text: "title: url" per line', () => {
  const { CopyTo } = load();
  assert.equal(
    CopyTo.text(TABS),
    'Example Domain: https://example.com/\nSearch & Rescue: https://foo.com/a?b=1&c=2\nThird: http://third.test/path#frag'
  );
});

test('html: anchors joined by <br>, titles NOT bold by default', () => {
  const { CopyTo } = load();
  const html = CopyTo.html(TABS);
  assert.match(html, /^<a href="https:\/\/example.com\/">Example Domain<\/a>/);
  assert.equal(html.split('<br>').length, 3);
  assert.doesNotMatch(html, /<strong>/);
});

test('html: bold=true wraps titles in <strong>', () => {
  const { CopyTo } = load();
  const html = CopyTo.html(TABS, true);
  assert.match(html, /<a href="https:\/\/example.com\/"><strong>Example Domain<\/strong><\/a>/);
  assert.equal((html.match(/<strong>/g) || []).length, 3);
});

test('html: every href round-trips to a valid, parseable URL', () => {
  const { CopyTo } = load();
  const html = CopyTo.html(TABS);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, TABS.length);
  for (const h of hrefs) {
    assert.doesNotThrow(() => new URL(h));
  }
});

test('json: valid JSON, array of {title,url}, order preserved', () => {
  const { CopyTo } = load();
  const parsed = JSON.parse(CopyTo.json(TABS));
  assert.deepEqual(parsed, [
    { title: 'Example Domain', url: 'https://example.com/' },
    { title: 'Search & Rescue', url: 'https://foo.com/a?b=1&c=2' },
    { title: 'Third', url: 'http://third.test/path#frag' }
  ]);
});

test('custom: substitutes $url, $title and $date', () => {
  const { CopyTo } = load();
  const out = CopyTo.custom(TABS, '[$title]($url)');
  const lines = out.split('\n');
  assert.equal(lines[0], '[Example Domain](https://example.com/)');
  assert.equal(lines.length, 3);

  const dated = CopyTo.custom([TABS[0]], '$date $url');
  assert.match(dated, /^\d{4}-\d{2}-\d{2} https:\/\/example.com\/$/);
});

test('custom: multiple $url tokens all replaced (global)', () => {
  const { CopyTo } = load();
  const out = CopyTo.custom([TABS[0]], '$url $url');
  assert.equal(out, 'https://example.com/ https://example.com/');
});

test('delimited: an unset delimiter falls back to DEFAULT_SETTINGS.delimiter', () => {
  const { CopyTo } = load();
  // Previously this fell back to a local '\t' while getCopySettings fell back to
  // DEFAULT_SETTINGS.delimiter ('--'), so the same unset setting produced
  // different output depending on which path reached the formatter.
  const out = CopyTo.delimited([TABS[0]], undefined);
  assert.equal(out, 'Example Domain--https://example.com/');
});

test('delimited: \\t \\n \\r escape sequences expand to real chars', () => {
  const { CopyTo } = load();
  assert.equal(CopyTo.delimited([TABS[0]], '\\t'), 'Example Domain\thttps://example.com/');
  assert.equal(CopyTo.delimited([TABS[0]], '\\n'), 'Example Domain\nhttps://example.com/');
  assert.equal(CopyTo.delimited([TABS[0]], '\\r'), 'Example Domain\rhttps://example.com/');
});

test('delimited: custom string delimiter, whitespace-only falls back to the default', () => {
  const { CopyTo } = load();
  // Padding is part of the delimiter and is preserved verbatim; only a
  // whitespace-only delimiter is rejected and falls back to the default.
  assert.equal(CopyTo.delimited([TABS[0]], ' | '), 'Example Domain | https://example.com/');
  assert.equal(CopyTo.delimited([TABS[0]], '   '), 'Example Domain--https://example.com/');
});

test('html: escapes markup in attacker-controlled titles and URLs (XSS guard)', () => {
  const { CopyTo } = load();
  const evil = [{
    title: '<img src=x onerror=alert(1)>',
    url: 'https://x.test/"><script>alert(1)</script>',
    highlighted: true
  }];
  const html = CopyTo.html(evil);
  // No raw injectable markup survives — angle brackets/quotes are entities.
  assert.doesNotMatch(html.replace(/^<a href="|">.*$/g, ''), /<script>/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot;/);
});

test('formatters handle a single tab and preserve unicode titles', () => {
  const { CopyTo } = load([{ title: 'Búsqueda 日本語', url: 'https://x.test/', highlighted: true }]);
  assert.equal(CopyTo.url_only([{ title: 'Búsqueda 日本語', url: 'https://x.test/' }]), 'https://x.test/');
  assert.match(CopyTo.text([{ title: 'Búsqueda 日本語', url: 'https://x.test/' }]), /Búsqueda 日本語/);
});
