'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadBackground } = require('./helpers/harness');

const TABS = [
  { title: 'One', url: 'https://one.test/', highlighted: true },
  { title: 'Two', url: 'https://two.test/', highlighted: false }
];

// Action.copy is callback-driven (storage.get -> tabs.query -> sendMessage).
// The mock runs callbacks synchronously, but CopyHistory.add is awaited inside,
// so we give the microtask queue a tick before asserting on the sent message.
async function runCopy(settings, tabs = TABS) {
  const chrome = createChrome({ tabs });
  Object.assign(chrome.storage.sync._data, settings);
  const { Action } = loadBackground(chrome);
  await Action.copy();
  return chrome;
}

function lastCopyMessage(chrome) {
  return [...chrome._sent].reverse().find((m) => m.type === 'copy');
}

test('Action.copy with url_only sends plaintext of all tabs', async () => {
  const chrome = await runCopy({ format: 'url_only' });
  const msg = lastCopyMessage(chrome);
  assert.ok(msg, 'a copy message was sent');
  assert.equal(msg.copied_url, 2);
  assert.equal(msg.mimeType, 'plaintext');
  assert.equal(msg.content, 'https://one.test/\nhttps://two.test/');
});

test('Action.copy with html reports mimeType html', async () => {
  const chrome = await runCopy({ format: 'html' });
  const msg = lastCopyMessage(chrome);
  assert.equal(msg.mimeType, 'html');
  assert.match(msg.content, /<a href="https:\/\/one.test\/">One<\/a>/);
});

test('Action.copy with json sends parseable JSON', async () => {
  const chrome = await runCopy({ format: 'json' });
  const msg = lastCopyMessage(chrome);
  assert.deepEqual(JSON.parse(msg.content), [
    { title: 'One', url: 'https://one.test/' },
    { title: 'Two', url: 'https://two.test/' }
  ]);
});

test('Action.copy selectedTabsOnly copies only highlighted tabs', async () => {
  const chrome = await runCopy({ format: 'url_only', selectedTabsOnly: true });
  const msg = lastCopyMessage(chrome);
  assert.equal(msg.copied_url, 1);
  assert.equal(msg.content, 'https://one.test/');
});

test('Action.copy records the copy in history', async () => {
  const chrome = await runCopy({ format: 'url_only', saveHistory: true });
  const stored = chrome.storage.local._data.copyHistory;
  assert.ok(Array.isArray(stored) && stored.length === 1);
  assert.equal(stored[0].count, 2);
  assert.equal(stored[0].format, 'url_only');
});

test('Action.copy with no tabs does not send a copy message', async () => {
  const chrome = await runCopy({ format: 'url_only' }, []);
  assert.equal(lastCopyMessage(chrome), undefined);
});

test('Action.copy defaults to url_only when no format stored', async () => {
  const chrome = await runCopy({});
  const msg = lastCopyMessage(chrome);
  assert.equal(msg.content, 'https://one.test/\nhttps://two.test/');
});

test('Action.copyHeadless writes formatted content to the clipboard via offscreen', async () => {
  const chrome = createChrome({ tabs: TABS });
  Object.assign(chrome.storage.sync._data, { format: 'url_only' });
  const { Action } = loadBackground(chrome);
  await Action.copyHeadless();
  const offscreenWrite = chrome._sent.find((m) => m.target === 'offscreen' && m.action === 'copy');
  assert.ok(offscreenWrite, 'a clipboard-write is routed through the offscreen document');
  assert.equal(offscreenWrite.text, 'https://one.test/\nhttps://two.test/');
  assert.ok(chrome._badges.some((b) => String(b.text).includes('✓')), 'shows a success badge');
});

test('Action.copyHeadless with no tabs shows the empty badge, writes nothing', async () => {
  const chrome = createChrome({ tabs: [] });
  const { Action } = loadBackground(chrome);
  await Action.copyHeadless();
  assert.equal(chrome._sent.find((m) => m.target === 'offscreen'), undefined);
  assert.ok(chrome._badges.some((b) => b.text === '∅'));
});
