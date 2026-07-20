'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadHistory } = require('./helpers/harness');

function setup(sync = {}) {
  const chrome = createChrome();
  Object.assign(chrome.storage.sync._data, sync);
  const CopyHistory = loadHistory(chrome);
  return { chrome, CopyHistory };
}

test('add then getAll returns the entry newest-first', async () => {
  const { CopyHistory } = setup({ saveHistory: true });
  await CopyHistory.add({ content: 'https://a.test/', count: 1, format: 'url_only' });
  await CopyHistory.add({ content: 'https://b.test/\nhttps://c.test/', count: 2, format: 'url_only' });
  const all = await CopyHistory.getAll();
  assert.equal(all.length, 2);
  assert.equal(all[0].count, 2, 'newest first');
  assert.equal(all[1].count, 1);
});

test('empty content is never recorded', async () => {
  const { CopyHistory } = setup({ saveHistory: true });
  await CopyHistory.add({ content: '', count: 0, format: 'url_only' });
  assert.equal((await CopyHistory.getAll()).length, 0);
});

test('saveHistory=false disables recording', async () => {
  const { CopyHistory } = setup({ saveHistory: false });
  await CopyHistory.add({ content: 'https://a.test/', count: 1, format: 'url_only' });
  assert.equal((await CopyHistory.getAll()).length, 0);
});

test('content longer than MAX_CONTENT_CHARS is truncated and flagged', async () => {
  const { CopyHistory } = setup({ saveHistory: true });
  const huge = 'x'.repeat(CopyHistory.MAX_CONTENT_CHARS + 500);
  await CopyHistory.add({ content: huge, count: 1, format: 'url_only' });
  const [entry] = await CopyHistory.getAll();
  assert.equal(entry.content.length, CopyHistory.MAX_CONTENT_CHARS);
  assert.equal(entry.truncated, true);
});

test('an HTML copy carries its plain-text flavor so restore can rebuild both', async () => {
  const { CopyHistory } = setup({ saveHistory: true });
  // The plain flavor cannot be derived from the HTML after the fact: the title
  // is entity-escaped, so tag-stripping would mangle it and drop the URL.
  await CopyHistory.add({
    content: '<a href="https://a.test/">A &amp; B</a>',
    plainContent: 'A & B\nhttps://a.test/',
    count: 1,
    format: 'html'
  });
  const [entry] = await CopyHistory.getAll();
  assert.equal(entry.plainContent, 'A & B\nhttps://a.test/');
});

test('plain formats store no redundant plainContent copy', async () => {
  const { CopyHistory } = setup({ saveHistory: true });
  await CopyHistory.add({
    content: 'https://a.test/',
    plainContent: 'https://a.test/',
    count: 1,
    format: 'url_only'
  });
  const [entry] = await CopyHistory.getAll();
  assert.equal(entry.plainContent, undefined, 'identical flavors are not stored twice');
});

test('history is capped at MAX_ENTRIES', async () => {
  const { CopyHistory } = setup({ saveHistory: true });
  // Use distinct counts so the coalescing rule never merges them.
  for (let i = 0; i < CopyHistory.MAX_ENTRIES + 10; i++) {
    await CopyHistory.add({ content: `https://n${i}.test/`, count: i + 1, format: 'url_only' });
  }
  const all = await CopyHistory.getAll();
  assert.equal(all.length, CopyHistory.MAX_ENTRIES);
});

test('remove deletes a single entry by id; clear empties everything', async () => {
  const { CopyHistory } = setup({ saveHistory: true });
  await CopyHistory.add({ content: 'https://a.test/', count: 1, format: 'url_only' });
  await CopyHistory.add({ content: 'https://b.test/', count: 2, format: 'url_only' });
  let all = await CopyHistory.getAll();
  await CopyHistory.remove(all[0].id);
  all = await CopyHistory.getAll();
  assert.equal(all.length, 1);
  await CopyHistory.clear();
  assert.equal((await CopyHistory.getAll()).length, 0);
});

test('getAll tolerates corrupted (non-array) storage', async () => {
  const { chrome, CopyHistory } = setup({ saveHistory: true });
  chrome.storage.local._data.copyHistory = 'not-an-array';
  assert.equal((await CopyHistory.getAll()).length, 0);
});
