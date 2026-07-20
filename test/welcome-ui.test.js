'use strict';

// Behavioural tests for the real extension/welcome.js, running against the real
// extension/welcome.html in a jsdom document (see helpers/dom-harness.js).
//
// welcome.js has exactly two jobs — open the options page, and rewrite the two
// <kbd> labels with the shortcuts the user is actually bound to — so these
// tests drive both, plus every degraded environment the page has to survive:
// a chrome.runtime.lastError from getAll, commands with no shortcut assigned,
// missing elements, and a Chrome old enough to lack chrome.commands entirely.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadWelcome } = require('./helpers/dom-harness');

// The hardcoded fallbacks baked into welcome.html, shown until (and unless)
// chrome.commands.getAll reports the live bindings.
const DEFAULT_COPY = 'Ctrl+Shift+U';
const DEFAULT_PASTE = 'Ctrl+Shift+Y';

const labels = (p) => ({
  copy: p.text('kbdCopy').trim(),
  paste: p.text('kbdPaste').trim()
});

// Every load here goes through this wrapper so "does not throw" is an actual
// assertion rather than an absence of one. An exception thrown inside the
// DOMContentLoaded handler is swallowed by the event dispatcher and reported to
// jsdom's virtual console — window.console never sees it — but jsdom does fire
// an ErrorEvent on window, so a listener installed before the page scripts run
// records it. `p.errors` must be empty in every test below.
async function load(options = {}) {
  const errors = [];
  const p = await loadWelcome({
    ...options,
    beforeScripts: (document, window) => {
      window.addEventListener('error', (event) => errors.push(event.message));
      if (options.beforeScripts) options.beforeScripts(document, window);
    }
  });
  p.errors = errors;
  return p;
}

// ---------------------------------------------------------------------------
// Open Settings
// ---------------------------------------------------------------------------

test('#openOptions click opens the options page', async () => {
  const p = await load();
  assert.equal(p.chrome._optionsPageOpened.count, 0, 'nothing opened on load');

  await p.click('openOptions');

  assert.equal(p.chrome._optionsPageOpened.count, 1);
});

test('#openOptions opens the options page once per click, not once per load', async () => {
  const p = await load();

  await p.click('openOptions');
  await p.click('openOptions');
  await p.click('openOptions');

  assert.equal(p.chrome._optionsPageOpened.count, 3, 'listener bound exactly once');
});

test('welcome.html does not navigate anywhere on its own', async () => {
  const p = await load();

  assert.deepEqual(p.chrome._createdTabs, [], 'no tabs opened');
  assert.deepEqual(p.chrome._sent, [], 'no runtime messages sent');
});

// ---------------------------------------------------------------------------
// Live shortcut labels
// ---------------------------------------------------------------------------

test('the default labels match the manifest suggested keys before getAll answers', async () => {
  // No commands reported at all: whatever the HTML shipped with must survive.
  const p = await load({ chromeOptions: { commands: [] } });

  assert.deepEqual(labels(p), { copy: DEFAULT_COPY, paste: DEFAULT_PASTE });
});

test('getAll replaces both labels with the actual bound shortcuts', async () => {
  const p = await load({
    chromeOptions: {
      commands: [
        { name: 'copy-urls', shortcut: 'Command+Shift+K' },
        { name: 'paste-urls', shortcut: 'Command+Shift+L' }
      ]
    }
  });

  assert.deepEqual(labels(p), { copy: 'Command+Shift+K', paste: 'Command+Shift+L' });
});

test('a remapped copy shortcut does not disturb the paste label', async () => {
  const p = await load({
    chromeOptions: {
      commands: [{ name: 'copy-urls', shortcut: 'Alt+C' }]
    }
  });

  assert.deepEqual(labels(p), { copy: 'Alt+C', paste: DEFAULT_PASTE });
});

test('commands the page has no label for are ignored, not crashed on', async () => {
  const p = await load({
    chromeOptions: {
      commands: [
        { name: '_execute_action', shortcut: 'Ctrl+Shift+E' },
        { name: 'some-future-command', shortcut: 'Ctrl+Shift+F' },
        { name: 'paste-urls', shortcut: 'Ctrl+Alt+V' }
      ]
    }
  });

  assert.deepEqual(labels(p), { copy: DEFAULT_COPY, paste: 'Ctrl+Alt+V' });
  assert.deepEqual(p.errors, [], 'nothing thrown');
});

// ---------------------------------------------------------------------------
// Degraded shortcut data
// ---------------------------------------------------------------------------

test('a command with no shortcut assigned degrades to "not set", never "undefined"', async () => {
  const p = await load({
    chromeOptions: {
      commands: [
        // Chrome reports an empty string when the user cleared the binding or
        // another extension already claimed the combination.
        { name: 'copy-urls', shortcut: '' },
        // And omits the key entirely in some builds.
        { name: 'paste-urls' }
      ]
    }
  });

  assert.deepEqual(labels(p), { copy: 'not set', paste: 'not set' });
  for (const value of Object.values(labels(p))) {
    assert.ok(!/undefined/.test(value), `label rendered "${value}"`);
  }
});

test('one bound and one unbound shortcut are labelled independently', async () => {
  const p = await load({
    chromeOptions: {
      commands: [
        { name: 'copy-urls', shortcut: 'Ctrl+Shift+U' },
        { name: 'paste-urls', shortcut: '' }
      ]
    }
  });

  assert.deepEqual(labels(p), { copy: 'Ctrl+Shift+U', paste: 'not set' });
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

test('chrome.runtime.lastError during getAll leaves the default labels intact', async () => {
  const chrome = createChrome();
  // Real Chrome hands the callback undefined and sets lastError.
  chrome.commands.getAll = (cb) => {
    chrome._setLastError('commands unavailable');
    cb([
      { name: 'copy-urls', shortcut: 'Ctrl+Shift+Q' },
      { name: 'paste-urls', shortcut: 'Ctrl+Shift+Z' }
    ]);
  };

  const p = await load({ chrome });

  assert.deepEqual(
    labels(p),
    { copy: DEFAULT_COPY, paste: DEFAULT_PASTE },
    'returned early: the payload delivered alongside lastError was not trusted'
  );
  assert.deepEqual(p.errors, [], 'nothing thrown');
  assert.deepEqual(chrome._lastErrors, ['commands unavailable']);
});

test('getAll yielding undefined instead of an array does not throw', async () => {
  const chrome = createChrome();
  chrome.commands.getAll = (cb) => cb(undefined);

  const p = await load({ chrome });

  assert.deepEqual(labels(p), { copy: DEFAULT_COPY, paste: DEFAULT_PASTE });
  assert.deepEqual(p.errors, [], 'nothing thrown');
  // The page still works for its other job.
  await p.click('openOptions');
  assert.equal(chrome._optionsPageOpened.count, 1);
});

test('chrome.commands missing entirely (older Chrome) does not throw', async () => {
  const chrome = createChrome();
  delete chrome.commands;

  const p = await load({ chrome });

  assert.equal(p.chrome.commands, undefined);
  assert.deepEqual(labels(p), { copy: DEFAULT_COPY, paste: DEFAULT_PASTE });
  assert.deepEqual(p.errors, [], 'nothing thrown');
  await p.click('openOptions');
  assert.equal(chrome._optionsPageOpened.count, 1, 'the rest of the page still works');
});

test('chrome.commands present but without getAll does not throw', async () => {
  const chrome = createChrome();
  delete chrome.commands.getAll;

  const p = await load({ chrome });

  assert.deepEqual(labels(p), { copy: DEFAULT_COPY, paste: DEFAULT_PASTE });
  assert.deepEqual(p.errors, [], 'nothing thrown');
  await p.click('openOptions');
  assert.equal(chrome._optionsPageOpened.count, 1);
});

// ---------------------------------------------------------------------------
// Missing elements — the `if (openOptions)` / `if (!el) continue` guards
// ---------------------------------------------------------------------------

test('a missing #openOptions does not stop the shortcut labels from updating', async () => {
  const p = await load({
    chromeOptions: {
      commands: [
        { name: 'copy-urls', shortcut: 'Alt+1' },
        { name: 'paste-urls', shortcut: 'Alt+2' }
      ]
    },
    beforeScripts: (document) => {
      document.getElementById('openOptions').remove();
    }
  });

  assert.equal(p.document.getElementById('openOptions'), null);
  // Reached only if the guard held and DOMContentLoaded ran to completion.
  assert.deepEqual(labels(p), { copy: 'Alt+1', paste: 'Alt+2' });
  assert.deepEqual(p.errors, []);
});

test('a missing #kbdCopy does not stop #kbdPaste from updating', async () => {
  const p = await load({
    chromeOptions: {
      commands: [
        { name: 'copy-urls', shortcut: 'Alt+1' },
        { name: 'paste-urls', shortcut: 'Alt+2' }
      ]
    },
    beforeScripts: (document) => {
      document.getElementById('kbdCopy').remove();
    }
  });

  assert.equal(p.document.getElementById('kbdCopy'), null);
  assert.equal(p.text('kbdPaste').trim(), 'Alt+2');
  assert.deepEqual(p.errors, [], 'nothing thrown');
});

test('every element welcome.js touches removed at once: no throw, page still inert', async () => {
  const chrome = createChrome({
    commands: [
      { name: 'copy-urls', shortcut: 'Alt+1' },
      { name: 'paste-urls', shortcut: 'Alt+2' }
    ]
  });

  const p = await load({
    chrome,
    beforeScripts: (document) => {
      for (const id of ['openOptions', 'kbdCopy', 'kbdPaste']) {
        document.getElementById(id).remove();
      }
    }
  });

  assert.deepEqual(p.errors, [], 'DOMContentLoaded handler completed without throwing');
  assert.equal(chrome._optionsPageOpened.count, 0);
});
