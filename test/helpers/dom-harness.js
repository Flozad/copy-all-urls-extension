'use strict';

// Loads a REAL extension page (popup.html / options.html) into a jsdom
// document, injects the mocked chrome API plus a fake navigator.clipboard, and
// evaluates the actual <script src> files the HTML references — in the order
// the HTML lists them — before firing DOMContentLoaded.
//
// Why jsdom (the only devDependency in this repo):
// popup.js and options.js are ~1400 lines of DOM code. classList.toggle with a
// force flag, delegated change events bubbling from a radio to its container,
// dataset, DocumentFragment, querySelectorAll snapshots, event.stopPropagation
// interacting with a document-level outside-click handler — a hand-rolled DOM
// that got any one of those subtly wrong would produce tests that pass while
// the real page is broken, which is worse than no tests. See test/README.md.
//
// Timers inside the page are fake and controlled: `flushTimers(ms)` advances a
// virtual clock. The 500ms input debounces and the 3s/5s toast timeouts are
// therefore instant and deterministic.

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { createChrome } = require('./chrome-mock');

const EXT_DIR = path.join(__dirname, '..', '..', 'extension');

// Yield to the macrotask queue so every pending promise chain settles.
function microtasks(rounds = 6) {
  let p = Promise.resolve();
  for (let i = 0; i < rounds; i += 1) {
    p = p.then(() => new Promise((resolve) => setImmediate(resolve)));
  }
  return p;
}

// ---------------------------------------------------------------------------
// Asynchronous storage callbacks
// ---------------------------------------------------------------------------
// chrome-mock.js invokes storage callbacks *synchronously*. Real Chrome never
// does — every chrome.storage callback is dispatched on a later microtask.
// That difference is not cosmetic here: popup.js calls
// `chrome.storage.local.get(['pasteSource'], cb)` near the top of its
// DOMContentLoaded handler, and `cb` reaches `sourceDisplayNames`, a `const`
// declared 200 lines further down. Synchronously, that is a TDZ
// ReferenceError; in a browser the handler has long finished by then and it
// works. Deferring the callbacks keeps the page under test running against
// realistic scheduling instead of failing on an artifact of the mock.
//
// Ordering is preserved (microtasks are FIFO), and the promise-returning form
// used by CopyHistory is left untouched.
function deferStorageCallbacks(chrome) {
  for (const areaName of ['sync', 'local']) {
    const area = chrome.storage[areaName];
    for (const method of ['get', 'set', 'remove', 'clear']) {
      const original = area[method].bind(area);
      area[method] = function deferred(...args) {
        if (typeof args[args.length - 1] === 'function') {
          const callback = args.pop();
          return Promise.resolve().then(() => original(...args, callback));
        }
        return original(...args);
      };
    }
  }
  return chrome;
}

// ---------------------------------------------------------------------------
// Fake clipboard
// ---------------------------------------------------------------------------
// Records everything written and serves whatever the test staged for reading.
// `read()` yields ClipboardItem-shaped objects (types + getType -> Blob) since
// popup.js walks that exact shape.
function createClipboard() {
  const state = {
    // Recorded output
    writes: [],       // arrays of ClipboardItem passed to write()
    writeTexts: [],   // strings passed to writeText()
    // Staged input for read()/readText()
    items: [],        // e.g. [{ 'text/html': '<a>', 'text/plain': 'x' }]
    text: '',
    // Failure switches
    failRead: false,
    failReadText: false,
    failWrite: false,
    failWriteText: false
  };

  const clipboard = {
    _state: state,

    // --- staging helpers (test-facing) ---------------------------------
    stageItems(items) { state.items = items; },
    stageText(text) { state.text = text; },
    reset() {
      state.writes.length = 0;
      state.writeTexts.length = 0;
    },
    // Last ClipboardItem written, flattened to { type: string }.
    get lastWrittenItem() {
      const last = state.writes[state.writes.length - 1];
      return last ? last[0] : undefined;
    },
    get lastWrittenText() {
      return state.writeTexts[state.writeTexts.length - 1];
    },

    // --- the API popup.js actually calls --------------------------------
    async read() {
      if (state.failRead) throw new Error('clipboard.read() denied');
      return state.items.map((flavors) => ({
        types: Object.keys(flavors),
        async getType(type) {
          return { async text() { return flavors[type]; } };
        }
      }));
    },
    async readText() {
      if (state.failReadText) throw new Error('clipboard.readText() denied');
      return state.text;
    },
    async write(items) {
      if (state.failWrite) throw new Error('clipboard.write() failed');
      state.writes.push(items);
    },
    async writeText(text) {
      if (state.failWriteText) throw new Error('clipboard.writeText() failed');
      state.writeTexts.push(text);
    }
  };

  return clipboard;
}

// ---------------------------------------------------------------------------
// Virtual timers
// ---------------------------------------------------------------------------
function createTimers() {
  let now = 0;
  let seq = 0;
  const pending = new Map();

  function setTimeoutFake(fn, delay = 0, ...args) {
    seq += 1;
    const id = seq;
    pending.set(id, { id, fn, time: now + (Number(delay) || 0), args, order: seq });
    return id;
  }

  function clearTimeoutFake(id) {
    pending.delete(id);
  }

  // Runs every timer scheduled to fire within `advanceMs`, one at a time, with
  // a full microtask drain between each so promise chains (and any timers they
  // schedule, e.g. StorageUtil's retry backoff) are picked up in order.
  async function flushTimers(advanceMs = Infinity) {
    const target = advanceMs === Infinity ? Infinity : now + advanceMs;

    for (let guard = 0; guard < 5000; guard += 1) {
      await microtasks(2);
      let next = null;
      for (const timer of pending.values()) {
        if (timer.time > target) continue;
        if (!next || timer.time < next.time || (timer.time === next.time && timer.order < next.order)) {
          next = timer;
        }
      }
      if (!next) break;
      pending.delete(next.id);
      now = Math.max(now, next.time);
      next.fn(...next.args);
    }

    await microtasks();
    if (target !== Infinity) now = target;
  }

  return { setTimeoutFake, clearTimeoutFake, flushTimers, pendingCount: () => pending.size };
}

// ---------------------------------------------------------------------------
// Page loader
// ---------------------------------------------------------------------------
function scriptSources(html) {
  const sources = [];
  const re = /<script\s+src=["']([^"']+)["']/gi;
  let match = re.exec(html);
  while (match) {
    sources.push(match[1].replace(/^\.\//, ''));
    match = re.exec(html);
  }
  return sources;
}

/**
 * @param {'popup.html'|'options.html'|'welcome.html'} page
 * @param {object} options
 *   - chrome:  a pre-built chrome mock (defaults to createChrome())
 *   - sync:    seed object written into chrome.storage.sync before load
 *   - local:   seed object written into chrome.storage.local before load
 *   - chromeOptions: forwarded to createChrome() when `chrome` is absent
 *   - beforeScripts: fn(document, window) run after the document is parsed and
 *     the globals are injected, but before any page script is evaluated and
 *     before DOMContentLoaded. Lets a test mutate the DOM (e.g. delete an
 *     element) so the page's own null-guards become reachable.
 */
async function loadPage(page, options = {}) {
  const htmlPath = path.join(EXT_DIR, page);
  const html = fs.readFileSync(htmlPath, 'utf8');

  const chrome = options.chrome || createChrome(options.chromeOptions || {});
  if (options.sync) Object.assign(chrome.storage.sync._data, options.sync);
  if (options.local) Object.assign(chrome.storage.local._data, options.local);
  deferStorageCallbacks(chrome);

  // Swallow jsdom's "Not implemented: navigation" (options.js calls
  // location.reload() after a reset) and the pages' own console noise.
  const virtualConsole = new VirtualConsole();
  const consoleLog = { log: [], warn: [], error: [] };

  const dom = new JSDOM(html, {
    url: 'https://extension.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });

  const { window } = dom;
  const { document } = window;

  // --- injected globals -------------------------------------------------
  const timers = createTimers();
  window.setTimeout = timers.setTimeoutFake;
  window.clearTimeout = timers.clearTimeoutFake;

  window.chrome = chrome;

  const clipboard = createClipboard();
  Object.defineProperty(window.navigator, 'clipboard', {
    value: clipboard,
    configurable: true
  });

  // jsdom's Blob predates Blob.prototype.text(), which is the only way a test
  // can inspect the flavours popup.js hands to ClipboardItem. Node's built-in
  // Blob is spec-current and nothing on these pages does anything else with
  // Blobs, so swapping it in is safe and makes the payloads assertable.
  window.Blob = globalThis.Blob;

  // jsdom has no ClipboardItem at all; popup.js constructs one directly.
  const clipboardItems = [];
  window.ClipboardItem = class ClipboardItem {
    constructor(data) {
      this.__data = data;
      this.types = Object.keys(data);
      clipboardItems.push(this);
    }
    async getType(type) {
      return this.__data[type];
    }
  };

  const record = (bucket) => (...args) => {
    consoleLog[bucket].push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
  };
  window.console = {
    log: record('log'),
    warn: record('warn'),
    error: record('error'),
    info() {},
    debug() {}
  };

  // jsdom fires its own DOMContentLoaded asynchronously after construction.
  // Track it so we don't end up delivering the event twice (which would
  // register every listener in popup.js/options.js twice over).
  let domContentLoadedFired = false;
  document.addEventListener('DOMContentLoaded', () => { domContentLoadedFired = true; });

  if (typeof options.beforeScripts === 'function') {
    options.beforeScripts(document, window);
  }

  // --- evaluate the real page scripts, in document order ----------------
  const loaded = scriptSources(html);
  for (const src of loaded) {
    const file = path.join(EXT_DIR, src);
    // window.eval is an *indirect* eval: declarations land in the window's
    // global scope exactly as a <script> tag's would, so each file can see the
    // previous one's `const` bindings (storage.js requires DEFAULT_SETTINGS).
    window.eval(fs.readFileSync(file, 'utf8'));
  }

  // --- fire DOMContentLoaded and let the async init settle --------------
  await microtasks(2);
  if (!domContentLoadedFired) {
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  }
  await microtasks();

  // --- test-facing handles ----------------------------------------------
  function resolve(target) {
    if (!target) throw new Error('resolve() needs a target');
    if (typeof target !== 'string') return target;
    const byId = document.getElementById(target);
    if (byId) return byId;
    const bySelector = document.querySelector(target);
    if (!bySelector) throw new Error(`No element for "${target}"`);
    return bySelector;
  }

  function fire(element, type, init = { bubbles: true, cancelable: true }) {
    const evt = new window.Event(type, init);
    element.dispatchEvent(evt);
  }

  async function click(target) {
    const element = resolve(target);
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await microtasks();
  }

  async function setValue(target, value) {
    const element = resolve(target);
    element.value = value;
    fire(element, 'input');
    await microtasks();
  }

  async function check(target, value = true) {
    const element = resolve(target);
    element.checked = value;
    fire(element, 'change');
    await microtasks();
  }

  async function select(target, value) {
    const element = resolve(target);
    element.value = value;
    fire(element, 'change');
    await microtasks();
  }

  // Radios live inside a container that owns the delegated change listener, so
  // the event has to bubble from the input itself.
  async function pickRadio(id) {
    const element = resolve(id);
    element.checked = true;
    fire(element, 'change');
    await microtasks();
  }

  function isHidden(target) {
    return resolve(target).classList.contains('hidden');
  }

  function text(target) {
    return resolve(target).textContent;
  }

  return {
    dom,
    window,
    document,
    chrome,
    clipboard,
    clipboardItems,
    console: consoleLog,
    loadedScripts: loaded,
    flushTimers: timers.flushTimers,
    pendingTimers: timers.pendingCount,
    flush: microtasks,
    click,
    setValue,
    check,
    select,
    pickRadio,
    resolve,
    isHidden,
    text,
    close: () => dom.window.close()
  };
}

const loadPopup = (options) => loadPage('popup.html', options);
const loadOptions = (options) => loadPage('options.html', options);
const loadWelcome = (options) => loadPage('welcome.html', options);

module.exports = {
  loadPage, loadPopup, loadOptions, loadWelcome, microtasks, createClipboard, EXT_DIR
};
