'use strict';

// Loads the REAL extension source files into a sandboxed vm context with a
// mocked chrome API, so tests exercise the shipping code — not a copy of it.
//
// background.js begins with `importScripts('utils/defaults.js','utils/history.js')`
// and defines `CopyTo` / `Action` as module-scoped consts, then registers a
// pile of chrome listeners. We provide importScripts (which evaluates the util
// files in the same context), stub the globals the listeners touch, and append
// a footer that hoists CopyTo/Action onto globalThis so tests can reach them.

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const EXT_DIR = path.join(__dirname, '..', '..', 'extension');

function read(rel) {
  return fs.readFileSync(path.join(EXT_DIR, rel), 'utf8');
}

// Build a context that looks enough like a service worker for background.js to
// load. `chrome` is injected by the caller so each test controls storage/tabs.
function makeContext(chrome) {
  const timers = [];
  const context = {
    chrome,
    console: { log() {}, warn() {}, error() {}, info() {} },
    Blob: global.Blob,
    URL: global.URL,
    JSON,
    Date,
    Math,
    Set,
    Object,
    Array,
    String,
    Promise,
    RegExp,
    setImmediate: global.setImmediate,
    queueMicrotask: global.queueMicrotask,
    setTimeout: (fn) => {
      // Run synchronously-ish but deferred; capture so tests can flush.
      timers.push(fn);
      return timers.length;
    },
    clearTimeout: () => {},
    _timers: timers
  };
  // self / globalThis point back at the context object (service-worker global).
  context.self = context;
  context.globalThis = context;
  context.self.clients = { matchAll: async () => [] };
  return context;
}

// Loads background.js (plus its importScripts deps) and returns the live
// CopyTo, Action, CopyHistory objects wired to the supplied chrome mock.
function loadBackground(chrome) {
  const context = makeContext(chrome);
  vm.createContext(context);

  // importScripts evaluates each util file in this same context.
  context.importScripts = function (...files) {
    for (const f of files) {
      const src = read(f);
      vm.runInContext(src, context, { filename: f });
    }
  };

  const source = read('background.js') +
    '\n;globalThis.__CopyTo = CopyTo; globalThis.__Action = Action;';
  vm.runInContext(source, context, { filename: 'background.js' });

  return {
    context,
    CopyTo: context.__CopyTo,
    Action: context.__Action,
    CopyHistory: context.CopyHistory,
    flushTimers: () => {
      const pending = context._timers.splice(0);
      for (const fn of pending) fn();
    }
  };
}

// Loads just utils/history.js (used by history-focused tests).
function loadHistory(chrome) {
  const context = makeContext(chrome);
  vm.createContext(context);
  vm.runInContext(read('utils/history.js'), context, { filename: 'utils/history.js' });
  return context.CopyHistory;
}

// Loads utils/storage.js (used by StorageUtil tests).
//
// storage.js hard-requires utils/defaults.js to have been evaluated in the same
// context first — it throws otherwise — so we run defaults.js ahead of it.
// `options.skipDefaults` deliberately omits it so that guard can be tested.
//
// setTimeout is replaced with an immediate microtask: storage.js sleeps
// 2^i * 100ms between retries, and real timers would make this suite take
// seconds. Console output is captured so tests can assert on the error paths.
function loadStorageUtil(chrome, options = {}) {
  const context = makeContext(chrome);
  const logs = { log: [], warn: [], error: [] };
  const record = (bucket) => (...args) => {
    logs[bucket].push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
  };
  context.console = {
    log: record('log'),
    warn: record('warn'),
    error: record('error'),
    info() {}
  };
  context.setTimeout = (fn) => {
    Promise.resolve().then(fn);
    return 0;
  };
  vm.createContext(context);

  if (!options.skipDefaults) {
    vm.runInContext(read('utils/defaults.js'), context, { filename: 'utils/defaults.js' });
  }
  vm.runInContext(read('utils/storage.js'), context, { filename: 'utils/storage.js' });

  return { StorageUtil: context.StorageUtil, logs, context };
}

module.exports = { loadBackground, loadHistory, loadStorageUtil, read, EXT_DIR };
