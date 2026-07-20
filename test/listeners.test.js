'use strict';

// Behavioural coverage for every chrome.* event listener background.js
// registers, driven through the mock's _fire* helpers so the real registered
// handlers run — not just the functions they happen to delegate to.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadBackground } = require('./helpers/harness');
const DEFAULT_SETTINGS = require('../extension/utils/defaults.js');

const TABS = [
  { title: 'One', url: 'https://one.test/', highlighted: true },
  { title: 'Two', url: 'https://two.test/', highlighted: false }
];

// Handlers kick off async work that the _fire* drivers do not always await
// (onMessage in particular is fire-and-forget). Give the microtask/immediate
// queues a chance to drain before asserting.
async function flush() {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

// A messageResponder that plays the part of the offscreen document: it answers
// clipboard reads with `clipboard` and ignores everything else (notifyUI).
function offscreenResponder(clipboard, opts = {}) {
  return (msg) => {
    if (msg && msg.target === 'offscreen' && msg.action === 'read') {
      if (opts.throwOnRead) throw new Error('clipboard read denied');
      return clipboard;
    }
    return undefined;
  };
}

// Objects the extension builds (tabs.create props, contextMenus.create props,
// offscreen.createDocument props) are constructed inside the vm realm, so their
// prototype is the vm's Object.prototype and deepStrictEqual rejects them on
// prototype grounds alone. Round-trip through JSON to compare by value.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function lastBadge(chrome) {
  return chrome._badges[chrome._badges.length - 1];
}

function offscreenWrites(chrome) {
  return chrome._sent.filter((m) => m.target === 'offscreen' && m.action === 'copy');
}

// ---------------------------------------------------------------------------
// runtime.onInstalled
// ---------------------------------------------------------------------------

test('onInstalled seeds only the missing defaults and never overwrites user values', async () => {
  const chrome = createChrome({ tabs: TABS });
  // Deliberately non-default values across several keys — these are exactly the
  // settings that issues #6 / #14 / #18 reported being wiped on every update.
  const userValues = {
    format: 'json',
    delimiter: '|',
    enableShortcuts: false,
    theme: 'dark',
    saveHistory: false,
    smartPaste: false
  };
  Object.assign(chrome.storage.sync._data, userValues);

  loadBackground(chrome);
  await chrome.runtime._fireInstalled({ reason: 'update' });
  await flush();

  const stored = chrome.storage.sync._data;
  // Every pre-existing user value survived untouched.
  for (const [key, value] of Object.entries(userValues)) {
    assert.equal(stored[key], value, `${key} must not be overwritten`);
  }
  // ...and none of them equals the default it replaced.
  for (const key of Object.keys(userValues)) {
    assert.notEqual(stored[key], DEFAULT_SETTINGS[key], `${key} kept its non-default value`);
  }
  // Every other default key got seeded.
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (key in userValues) continue;
    assert.deepEqual(stored[key], value, `${key} seeded from DEFAULT_SETTINGS`);
  }
  assert.equal(Object.keys(stored).length, Object.keys(DEFAULT_SETTINGS).length);
});

test('onInstalled opens the welcome page on a first install', async () => {
  const chrome = createChrome({ tabs: TABS });
  loadBackground(chrome);
  await chrome.runtime._fireInstalled({ reason: 'install' });
  await flush();

  assert.deepEqual(
    chrome._createdTabs.map((t) => t.url),
    ['chrome-extension://test/welcome.html']
  );
});

test('onInstalled does not open the welcome page on update or chrome_update', async () => {
  // Hijacking a tab on every extension or browser update is exactly the
  // behaviour users complain about; only reason === 'install' should do it.
  for (const reason of ['update', 'chrome_update']) {
    const chrome = createChrome({ tabs: TABS });
    loadBackground(chrome);
    await chrome.runtime._fireInstalled({ reason });
    await flush();

    assert.deepEqual(chrome._createdTabs, [], `no tab opened for reason=${reason}`);
  }
});

test('onInstalled writes nothing when every default key already exists', async () => {
  const chrome = createChrome({ tabs: TABS });
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    chrome.storage.sync._data[key] = 'preserved';
  }
  const setCalls = [];
  const realSet = chrome.storage.sync.set.bind(chrome.storage.sync);
  chrome.storage.sync.set = (items, cb) => {
    setCalls.push(items);
    return realSet(items, cb);
  };

  loadBackground(chrome);
  await chrome.runtime._fireInstalled({ reason: 'chrome_update' });
  await flush();

  assert.deepEqual(setCalls, [], 'storage.sync.set is never called');
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    assert.equal(chrome.storage.sync._data[key], 'preserved');
  }
});

test('onInstalled early-returns and seeds nothing when runtime.lastError is set', async () => {
  // failMode 'lastError' makes the first sync.get set chrome.runtime.lastError
  // and yield undefined — the branch that must NOT fall through to writing
  // defaults over a profile we could not read.
  const chrome = createChrome({ tabs: TABS, syncFailure: { failures: 1, failMode: 'lastError' } });
  const setCalls = [];
  const realSet = chrome.storage.sync.set.bind(chrome.storage.sync);
  chrome.storage.sync.set = (items, cb) => {
    setCalls.push(items);
    return realSet(items, cb);
  };

  loadBackground(chrome);
  await chrome.runtime._fireInstalled({ reason: 'update' });
  await flush();

  // lastError is scoped to the callback that saw it (as in real Chrome), so
  // assert it was raised during the flow rather than that it is still set.
  assert.deepEqual(chrome._lastErrors, ['storage unavailable'], 'lastError was set during the get');
  assert.deepEqual(setCalls, [], 'no defaults written');
  assert.deepEqual(chrome.storage.sync._data, {}, 'storage untouched');
});

test('onInstalled initialises the context menus', async () => {
  const chrome = createChrome({ tabs: TABS });
  loadBackground(chrome);
  await chrome.runtime._fireInstalled({ reason: 'install' });
  await flush();

  assert.deepEqual(chrome._contextMenuIds, ['copyUrls', 'pasteUrls']);
});

// ---------------------------------------------------------------------------
// updateContextMenus
// ---------------------------------------------------------------------------

test('updateContextMenus creates both menus with the right titles and contexts by default', async () => {
  const chrome = createChrome({ tabs: TABS });
  const { context } = loadBackground(chrome);
  // showContextMenu absent -> defaults to enabled.
  await context.updateContextMenus();

  assert.equal(chrome._contextMenus.length, 2);
  assert.deepEqual(plain(chrome._contextMenus[0]), { id: 'copyUrls', title: 'Copy URLs', contexts: ['all'] });
  assert.deepEqual(plain(chrome._contextMenus[1]), { id: 'pasteUrls', title: 'Paste URLs', contexts: ['all'] });
});

test('updateContextMenus with showContextMenu false removes all and creates nothing', async () => {
  const chrome = createChrome({ tabs: TABS });
  Object.assign(chrome.storage.sync._data, { showContextMenu: false });
  const { context } = loadBackground(chrome);
  // Seed a stale menu so we can observe removeAll actually clearing it.
  chrome._contextMenus.push({ id: 'stale' });

  await context.updateContextMenus();

  assert.deepEqual(chrome._contextMenuIds, [], 'removeAll ran and no menus were recreated');
});

test('updateContextMenus removes existing menus first, so repeated calls never duplicate', async () => {
  const chrome = createChrome({ tabs: TABS });
  const { context } = loadBackground(chrome);

  await context.updateContextMenus();
  await context.updateContextMenus();

  assert.deepEqual(chrome._contextMenuIds, ['copyUrls', 'pasteUrls'], 'still exactly two menus');
});

// ---------------------------------------------------------------------------
// contextMenus.onClicked
// ---------------------------------------------------------------------------

test('contextMenu copyUrls performs a headless copy and writes the clipboard via offscreen', async () => {
  const chrome = createChrome({ tabs: TABS, messageResponder: offscreenResponder(null) });
  Object.assign(chrome.storage.sync._data, { format: 'url_only' });
  loadBackground(chrome);

  await chrome.contextMenus._fireClick({ menuItemId: 'copyUrls' }, {});
  await flush();

  const writes = offscreenWrites(chrome);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].text, 'https://one.test/\nhttps://two.test/');
  assert.deepEqual(lastBadge(chrome), { text: '✓2', color: '#4CAF50' });
});

test('contextMenu pasteUrls opens the clipboard URLs and shows the success badge', async () => {
  const chrome = createChrome({
    tabs: TABS,
    messageResponder: offscreenResponder({ content: 'https://a.test/\nhttps://b.test/' })
  });
  loadBackground(chrome);

  await chrome.contextMenus._fireClick({ menuItemId: 'pasteUrls' }, {});
  await flush();

  assert.deepEqual(plain(chrome._createdTabs), [{ url: 'https://a.test/' }, { url: 'https://b.test/' }]);
  assert.deepEqual(lastBadge(chrome), { text: '✓2', color: '#4CAF50' });
});

test('contextMenu pasteUrls that opens zero URLs shows the empty badge, not success', async () => {
  const chrome = createChrome({
    tabs: TABS,
    // Non-empty clipboard, but nothing http(s) in it -> zero tabs opened.
    messageResponder: offscreenResponder({ content: 'just some prose, no links' })
  });
  loadBackground(chrome);

  await chrome.contextMenus._fireClick({ menuItemId: 'pasteUrls' }, {});
  await flush();

  assert.deepEqual(chrome._createdTabs, []);
  assert.deepEqual(lastBadge(chrome), { text: '∅', color: '#FF9800' });
  assert.ok(!chrome._badges.some((b) => String(b.text).startsWith('✓')), 'no success badge');
});

test('contextMenu pasteUrls with a whitespace-only clipboard shows the empty badge and opens nothing', async () => {
  const chrome = createChrome({
    tabs: TABS,
    messageResponder: offscreenResponder({ content: '   \n  \t ' })
  });
  loadBackground(chrome);

  await chrome.contextMenus._fireClick({ menuItemId: 'pasteUrls' }, {});
  await flush();

  assert.deepEqual(chrome._createdTabs, []);
  assert.deepEqual(chrome._badges, [{ text: '∅', color: '#FF9800' }]);
});

test('contextMenu pasteUrls shows the error badge when the clipboard read throws', async () => {
  const chrome = createChrome({
    tabs: TABS,
    messageResponder: offscreenResponder(null, { throwOnRead: true })
  });
  loadBackground(chrome);

  await chrome.contextMenus._fireClick({ menuItemId: 'pasteUrls' }, {});
  await flush();

  assert.deepEqual(chrome._createdTabs, []);
  assert.deepEqual(lastBadge(chrome), { text: '!', color: '#F44336' });
});

test('contextMenu click with an unknown menuItemId is a no-op', async () => {
  const chrome = createChrome({ tabs: TABS, messageResponder: offscreenResponder({ content: 'https://a.test/' }) });
  loadBackground(chrome);

  await chrome.contextMenus._fireClick({ menuItemId: 'somethingElse' }, {});
  await flush();

  assert.deepEqual(chrome._badges, []);
  assert.deepEqual(chrome._sent, []);
  assert.deepEqual(chrome._createdTabs, []);
});

// ---------------------------------------------------------------------------
// commands.onCommand
// ---------------------------------------------------------------------------

test('command with enableShortcuts false warns and performs no copy or paste', async () => {
  const chrome = createChrome({ tabs: TABS, messageResponder: offscreenResponder({ content: 'https://a.test/' }) });
  Object.assign(chrome.storage.sync._data, { enableShortcuts: false });
  loadBackground(chrome);

  await chrome.commands._fire('copy-urls');
  await chrome.commands._fire('paste-urls');
  await flush();

  assert.deepEqual(chrome._badges, [
    { text: '⚠', color: '#FF9800' },
    { text: '⚠', color: '#FF9800' }
  ]);
  assert.deepEqual(offscreenWrites(chrome), [], 'nothing copied');
  assert.deepEqual(chrome._createdTabs, [], 'nothing pasted');
});

test('command with enableShortcuts absent is treated as enabled', async () => {
  const chrome = createChrome({ tabs: TABS, messageResponder: offscreenResponder(null) });
  Object.assign(chrome.storage.sync._data, { format: 'url_only' });
  loadBackground(chrome);

  await chrome.commands._fire('copy-urls');
  await flush();

  assert.ok(!('enableShortcuts' in chrome.storage.sync._data), 'setting really is absent');
  assert.equal(offscreenWrites(chrome).length, 1, 'copy proceeded');
  assert.ok(!chrome._badges.some((b) => b.text === '⚠'), 'no warning badge');
});

test('copy-urls command runs the headless copy path', async () => {
  const chrome = createChrome({ tabs: TABS, messageResponder: offscreenResponder(null) });
  Object.assign(chrome.storage.sync._data, { enableShortcuts: true, format: 'url_only' });
  loadBackground(chrome);

  await chrome.commands._fire('copy-urls');
  await flush();

  const writes = offscreenWrites(chrome);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].text, 'https://one.test/\nhttps://two.test/');
  // The loading badge comes first, then the success badge with the count.
  assert.equal(chrome._badges[0].text, '⏳');
  assert.deepEqual(lastBadge(chrome), { text: '✓2', color: '#4CAF50' });
});

test('paste-urls command opens the clipboard URLs and badges the real count', async () => {
  const chrome = createChrome({
    tabs: TABS,
    messageResponder: offscreenResponder({ content: 'https://a.test/\nhttps://b.test/\nhttps://c.test/' })
  });
  loadBackground(chrome);

  await chrome.commands._fire('paste-urls');
  await flush();

  assert.equal(chrome._createdTabs.length, 3);
  assert.deepEqual(lastBadge(chrome), { text: '✓3', color: '#4CAF50' });
});

test('paste-urls command that opens no tabs shows the empty badge, not unconditional success', async () => {
  // Regression guard for the old behaviour: success was badged on a 500ms
  // timer regardless of whether any tab was actually opened.
  const chrome = createChrome({
    tabs: TABS,
    messageResponder: offscreenResponder({ content: 'chrome://settings\nnot-a-url' })
  });
  loadBackground(chrome);

  await chrome.commands._fire('paste-urls');
  await flush();

  assert.deepEqual(chrome._createdTabs, [], 'non-http URLs are never opened');
  assert.deepEqual(lastBadge(chrome), { text: '∅', color: '#FF9800' });
  assert.ok(!chrome._badges.some((b) => String(b.text).startsWith('✓')));
});

test('an unknown command does nothing and does not throw', async () => {
  const chrome = createChrome({ tabs: TABS, messageResponder: offscreenResponder({ content: 'https://a.test/' }) });
  loadBackground(chrome);

  await chrome.commands._fire('not-a-real-command');
  await flush();

  assert.deepEqual(chrome._badges, []);
  assert.deepEqual(chrome._createdTabs, []);
  assert.deepEqual(offscreenWrites(chrome), []);
});

test('a failure inside the command handler surfaces as the error badge', async () => {
  // The enableShortcuts lookup rejects, which is the first thing the handler does.
  const chrome = createChrome({ tabs: TABS, syncFailure: { failures: 1, failMode: 'throw' } });
  loadBackground(chrome);

  await chrome.commands._fire('copy-urls');
  await flush();

  assert.deepEqual(chrome._badges, [{ text: '!', color: '#F44336' }]);
  assert.deepEqual(offscreenWrites(chrome), []);
});

// ---------------------------------------------------------------------------
// runtime.onMessage
// ---------------------------------------------------------------------------

test('onMessage type copy dispatches Action.copy', async () => {
  const chrome = createChrome({ tabs: TABS });
  Object.assign(chrome.storage.sync._data, { format: 'url_only' });
  loadBackground(chrome);

  chrome.runtime._fireMessage({ type: 'copy' });
  await flush();

  const reply = chrome._sent.find((m) => m.type === 'copy' && m.copied_url !== undefined);
  assert.ok(reply, 'Action.copy notified the UI');
  assert.equal(reply.copied_url, 2);
  assert.equal(reply.content, 'https://one.test/\nhttps://two.test/');
});

test('onMessage type paste forwards BOTH content and html to Action.paste', async () => {
  const chrome = createChrome({ tabs: TABS });
  loadBackground(chrome);

  // The plain flavour holds only link labels; the URLs live in the html
  // flavour. Tabs can only be opened if the second argument was passed through.
  chrome.runtime._fireMessage({
    type: 'paste',
    content: 'Example One\nExample Two',
    html: '<a href="https://from-html-1.test/">Example One</a><a href="https://from-html-2.test/">Example Two</a>'
  });
  await flush();

  assert.deepEqual(plain(chrome._createdTabs), [
    { url: 'https://from-html-1.test/' },
    { url: 'https://from-html-2.test/' }
  ]);
  const reply = chrome._sent.find((m) => m.type === 'paste' && m.success);
  assert.equal(reply.urlCount, 2);
});

test('onMessage type updateContextMenus rebuilds the menus', async () => {
  const chrome = createChrome({ tabs: TABS });
  loadBackground(chrome);
  chrome._contextMenus.push({ id: 'stale' });

  chrome.runtime._fireMessage({ type: 'updateContextMenus' });
  await flush();

  assert.deepEqual(chrome._contextMenuIds, ['copyUrls', 'pasteUrls']);
});

test('onMessage with an unknown type is ignored', async () => {
  const chrome = createChrome({ tabs: TABS });
  loadBackground(chrome);

  const response = chrome.runtime._fireMessage({ type: 'definitelyNotAThing' });
  await flush();

  assert.equal(response, undefined);
  assert.deepEqual(chrome._sent, []);
  assert.deepEqual(chrome._createdTabs, []);
  assert.deepEqual(chrome._contextMenus, []);
});

test('no chrome.action.onClicked listener is registered (the manifest owns the popup)', () => {
  const chrome = createChrome({ tabs: TABS });
  loadBackground(chrome);
  assert.equal(chrome.action._listeners.length, 0);
});

// ---------------------------------------------------------------------------
// Badge behaviour
// ---------------------------------------------------------------------------

test('showBadge clears the badge text once its timeout fires', () => {
  const chrome = createChrome({ tabs: TABS });
  const { context, flushTimers } = loadBackground(chrome);

  context.showBadge('X', '#123456', 2000);
  assert.deepEqual(chrome._badges, [{ text: 'X', color: '#123456' }]);

  flushTimers();
  assert.deepEqual(chrome._badges, [{ text: 'X', color: '#123456' }, { text: '' }]);
});

test('the loading badge has duration 0 and therefore persists', () => {
  const chrome = createChrome({ tabs: TABS });
  const { context, flushTimers } = loadBackground(chrome);

  context.showLoadingBadge();
  assert.deepEqual(chrome._badges, [{ text: '⏳', color: '#FF9800' }]);

  flushTimers();
  assert.deepEqual(chrome._badges, [{ text: '⏳', color: '#FF9800' }], 'no clear was scheduled');
  assert.equal(context._timers.length, 0);
});

test('success and error badges use the right text and colour', () => {
  const chrome = createChrome({ tabs: TABS });
  const { context } = loadBackground(chrome);

  context.showSuccessBadge(7);
  assert.deepEqual(lastBadge(chrome), { text: '✓7', color: '#4CAF50' });

  context.showSuccessBadge();
  assert.deepEqual(lastBadge(chrome), { text: '✓', color: '#4CAF50' }, 'no count -> bare check');

  context.showErrorBadge();
  assert.deepEqual(lastBadge(chrome), { text: '!', color: '#F44336' });
});

test('showBadge arms an alarm so a torn-down worker cannot strand the badge', () => {
  const chrome = createChrome({ tabs: TABS });
  const { context } = loadBackground(chrome);

  context.showBadge('X', '#123456', 2000);
  assert.deepEqual(chrome.alarms._created.map((a) => a.name), ['clear-badge']);

  // The worker dies before the setTimeout fires; the alarm still clears it.
  chrome.alarms._fire('clear-badge');
  assert.deepEqual(lastBadge(chrome), { text: '' });
});

test('the persistent loading badge is also alarm-backstopped', () => {
  const chrome = createChrome({ tabs: TABS });
  const { context, flushTimers } = loadBackground(chrome);

  context.showLoadingBadge();
  flushTimers();
  assert.deepEqual(lastBadge(chrome), { text: '⏳', color: '#FF9800' }, 'no timer clears it');
  assert.deepEqual(chrome.alarms._created.map((a) => a.name), ['clear-badge']);

  chrome.alarms._fire('clear-badge');
  assert.deepEqual(lastBadge(chrome), { text: '' });
});

test('clearing the badge disarms the alarm so it cannot wipe a later badge', () => {
  const chrome = createChrome({ tabs: TABS });
  const { context, flushTimers } = loadBackground(chrome);

  context.showBadge('X', '#123456', 2000);
  flushTimers();
  assert.deepEqual(lastBadge(chrome), { text: '' });
  assert.equal(chrome.alarms._created.length, 0, 'timeout cancelled the backstop');
});

test('an unrelated alarm does not touch the badge', () => {
  const chrome = createChrome({ tabs: TABS });
  const { context } = loadBackground(chrome);

  context.showBadge('X', '#123456', 0);
  chrome.alarms._fire('some-other-alarm');
  assert.deepEqual(lastBadge(chrome), { text: 'X', color: '#123456' });
});

// ---------------------------------------------------------------------------
// ensureOffscreen
// ---------------------------------------------------------------------------

test('a clipboard write closes the offscreen document afterwards', async () => {
  const chrome = createChrome({ tabs: TABS, hasOffscreenDocument: false });
  const { context } = loadBackground(chrome);

  await context.writeClipboardViaOffscreen('https://a.test/');

  assert.equal(chrome.offscreen._createCalls.length, 1);
  assert.equal(chrome.offscreen._closeCalls, 1);
  assert.equal(chrome.offscreen._hasDocument, false);
});

test('a clipboard read closes the document and still returns its result', async () => {
  const chrome = createChrome({ tabs: TABS, hasOffscreenDocument: false });
  chrome.runtime.sendMessage = async () => ({ content: 'https://a.test/' });
  const { context } = loadBackground(chrome);

  const result = await context.readClipboardViaOffscreen();

  assert.deepEqual(plain(result), { content: 'https://a.test/' });
  assert.equal(chrome.offscreen._closeCalls, 1);
});

test('overlapping clipboard operations share one document and close it once', async () => {
  const chrome = createChrome({ tabs: TABS, hasOffscreenDocument: false });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  chrome.runtime.sendMessage = async () => { await gate; return {}; };
  const { context } = loadBackground(chrome);

  const both = Promise.all([
    context.writeClipboardViaOffscreen('a'),
    context.writeClipboardViaOffscreen('b')
  ]);
  release();
  await both;

  assert.equal(chrome.offscreen._createCalls.length, 1, 'one document for both');
  assert.equal(chrome.offscreen._closeCalls, 1, 'closed once, by the last one out');
});

test('the document is closed even when the clipboard operation throws', async () => {
  const chrome = createChrome({ tabs: TABS, hasOffscreenDocument: false });
  chrome.runtime.sendMessage = async () => { throw new Error('clipboard blocked'); };
  const { context } = loadBackground(chrome);

  await assert.rejects(() => context.writeClipboardViaOffscreen('a'), /clipboard blocked/);
  assert.equal(chrome.offscreen._closeCalls, 1);
});

test('ensureOffscreen creates the document once with the right url, reasons and justification', async () => {
  const chrome = createChrome({ tabs: TABS, hasOffscreenDocument: false });
  const { context } = loadBackground(chrome);

  await context.ensureOffscreen();

  assert.equal(chrome.offscreen._createCalls.length, 1);
  assert.deepEqual(plain(chrome.offscreen._createCalls[0]), {
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'Read and write the clipboard to copy and paste tab URLs.'
  });

  // A second call sees an existing document and creates nothing more.
  await context.ensureOffscreen();
  assert.equal(chrome.offscreen._createCalls.length, 1);
});

test('two concurrent ensureOffscreen calls create the document only once', async () => {
  const chrome = createChrome({ tabs: TABS, hasOffscreenDocument: false });
  const { context } = loadBackground(chrome);

  await Promise.all([context.ensureOffscreen(), context.ensureOffscreen(), context.ensureOffscreen()]);

  assert.equal(chrome.offscreen._createCalls.length, 1, 'the in-flight guard held');
  assert.equal(chrome.offscreen._hasDocument, true);
});

test('ensureOffscreen swallows the "only a single offscreen document" race error', async () => {
  const chrome = createChrome({
    tabs: TABS,
    hasOffscreenDocument: false,
    offscreenCreateError: new Error('Only a single offscreen document may be created.')
  });
  const { context } = loadBackground(chrome);

  await context.ensureOffscreen(); // must resolve, not reject
  assert.equal(chrome.offscreen._createCalls.length, 1);
});

test('ensureOffscreen propagates any other createDocument error', async () => {
  const chrome = createChrome({
    tabs: TABS,
    hasOffscreenDocument: false,
    offscreenCreateError: new Error('offscreen API unavailable')
  });
  const { context } = loadBackground(chrome);

  await assert.rejects(() => context.ensureOffscreen(), /offscreen API unavailable/);
});

// ---------------------------------------------------------------------------
// Action.paste resilience
// ---------------------------------------------------------------------------

test('Action.paste keeps going when one tabs.create rejects and reports the real count', async () => {
  // The mock fails the first create() call only.
  const chrome = createChrome({ tabs: TABS, tabCreateFailures: 1 });
  const { Action } = loadBackground(chrome);

  const opened = await Action.paste('https://a.test/\nhttps://b.test/\nhttps://c.test/');

  assert.equal(opened, 2, 'only the failed URL is excluded from the count');
  assert.deepEqual(plain(chrome._createdTabs), [{ url: 'https://b.test/' }, { url: 'https://c.test/' }]);
  const reply = chrome._sent.find((m) => m.type === 'paste' && m.success);
  assert.equal(reply.urlCount, 2);
  assert.equal(reply.capped, false);
});
