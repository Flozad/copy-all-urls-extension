'use strict';

// A small, in-memory fake of the subset of the chrome.* extension API that the
// extension actually touches. Every test gets a fresh instance via
// createChrome() so state never leaks between tests.
//
// It records outgoing runtime messages, tabs.create() calls, context-menu
// operations and badge changes so assertions can inspect what the code did.
//
// Every listener registry captures its handlers into an array AND exposes a
// `_fire*` helper, so tests can drive the real chrome events (commands,
// context menus, runtime messages, onInstalled) rather than only calling the
// functions those handlers happen to delegate to. Anything the extension
// registers must be reachable from a test, or the handler is untested by
// construction.

function createStorageArea(options = {}) {
  const data = {};
  // Tests can force failures to exercise retry / fallback / lastError paths.
  // `failures` is a countdown: each failing call decrements it, so a test can
  // say "fail the first 2 attempts, then succeed".
  const control = {
    failures: options.failures || 0,
    failMode: options.failMode || 'lastError', // 'lastError' | 'throw'
    onLastError: options.onLastError || (() => {})
  };

  function shouldFail() {
    if (control.failures > 0) {
      control.failures -= 1;
      return true;
    }
    return false;
  }

  function settle(result, cb) {
    if (shouldFail()) {
      if (control.failMode === 'throw') {
        const err = new Error('storage unavailable');
        if (typeof cb === 'function') throw err;
        return Promise.reject(err);
      }
      // lastError mode: chrome sets runtime.lastError and yields undefined.
      control.onLastError('storage unavailable');
      if (typeof cb === 'function') {
        cb(undefined);
        return undefined;
      }
      return Promise.resolve(undefined);
    }
    // Success clears any lastError left over from a previous failed call.
    // Real Chrome scopes runtime.lastError to the callback currently running;
    // without this a single induced failure would poison every later call and
    // the retry / fallback branches would be unreachable.
    control.onLastError(null);
    if (typeof cb === 'function') {
      cb(result);
      return undefined;
    }
    return Promise.resolve(result);
  }

  return {
    _data: data,
    _control: control,
    get(keys, cb) {
      let result;
      if (keys == null) {
        result = { ...data };
      } else if (typeof keys === 'string') {
        result = keys in data ? { [keys]: data[keys] } : {};
      } else if (Array.isArray(keys)) {
        result = {};
        for (const k of keys) {
          if (k in data) result[k] = data[k];
        }
      } else if (typeof keys === 'object') {
        // Object form: keys are names, values are defaults.
        result = {};
        for (const [k, def] of Object.entries(keys)) {
          result[k] = k in data ? data[k] : def;
        }
      } else {
        result = {};
      }
      return settle(result, cb);
    },
    set(items, cb) {
      if (control.failures > 0) return settle(undefined, cb);
      Object.assign(data, items);
      return settle(undefined, cb);
    },
    remove(keys, cb) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) delete data[k];
      return settle(undefined, cb);
    },
    clear(cb) {
      for (const k of Object.keys(data)) delete data[k];
      return settle(undefined, cb);
    }
  };
}

function createChrome(options = {}) {
  const sent = [];         // runtime.sendMessage payloads
  const createdTabs = [];  // tabs.create() args
  const contextMenus = []; // full create() props, not just ids
  const badges = [];       // { text, color }
  const optionsPageOpened = { count: 0 };

  // Handler that answers runtime.sendMessage — used to fake the offscreen
  // document's responses in headless (background) flows.
  const messageResponder = options.messageResponder || null;

  // How many tabs.create() calls should reject, to exercise the
  // "one URL fails, the loop keeps going" branch in Action.paste.
  let tabCreateFailures = options.tabCreateFailures || 0;

  // Because lastError is cleared again by the next successful call (as in real
  // Chrome), every message raised is also appended to `_lastErrors` so a test
  // can assert "an error surfaced during this flow" without depending on it
  // still being set by the time the flow finishes.
  const lastErrors = [];
  const setLastError = (message) => {
    if (message) lastErrors.push(message);
    chrome.runtime.lastError = message ? { message } : null;
  };

  const chrome = {
    _sent: sent,
    _createdTabs: createdTabs,
    _contextMenus: contextMenus,
    _badges: badges,
    _optionsPageOpened: optionsPageOpened,
    _lastErrors: lastErrors,
    // Ids only — most assertions just want to know which menus exist.
    get _contextMenuIds() {
      return contextMenus.map((m) => m.id);
    },

    runtime: {
      lastError: null,
      _listeners: [],
      _onInstalled: [],
      getURL: (path) => `chrome-extension://test/${path}`,
      getManifest: () => options.manifest || { version: '1.12.1' },
      onMessage: {
        addListener: (fn) => chrome.runtime._listeners.push(fn)
      },
      onInstalled: {
        addListener: (fn) => chrome.runtime._onInstalled.push(fn)
      },
      openOptionsPage: (cb) => {
        optionsPageOpened.count += 1;
        if (typeof cb === 'function') cb();
      },
      sendMessage: (msg, cb) => {
        sent.push(msg);
        let response;
        if (messageResponder) response = messageResponder(msg);
        if (typeof cb === 'function') {
          cb(response);
          return undefined;
        }
        return Promise.resolve(response);
      },

      // --- test drivers -------------------------------------------------
      // Deliver a message to every registered onMessage listener, exactly as
      // Chrome would. Returns the first defined sendResponse payload.
      _fireMessage(message, sender = {}) {
        let responded;
        for (const fn of chrome.runtime._listeners) {
          fn(message, sender, (payload) => { responded = payload; });
        }
        return responded;
      },
      async _fireInstalled(details = { reason: 'install' }) {
        for (const fn of chrome.runtime._onInstalled) await fn(details);
      }
    },

    storage: {
      sync: createStorageArea({ ...(options.syncFailure || {}), onLastError: setLastError }),
      local: createStorageArea({ ...(options.localFailure || {}), onLastError: setLastError })
    },

    tabs: {
      _queryResult: options.tabs || [],
      // Which window counts as "current" when a query asks for currentWindow.
      _currentWindowId: options.currentWindowId === undefined ? 1 : options.currentWindowId,
      // Records the queryInfo of every call so tests can assert scope directly.
      _queries: [],
      query(queryInfo, cb) {
        chrome.tabs._queries.push(queryInfo);
        let result = chrome.tabs._queryResult;
        // Honour currentWindow so includeAllWindows is actually observable.
        // Tabs without a windowId are treated as belonging to the current
        // window, keeping existing single-window fixtures working unchanged.
        if (queryInfo && queryInfo.currentWindow) {
          result = result.filter(
            (t) => t.windowId === undefined || t.windowId === chrome.tabs._currentWindowId
          );
        }
        if (typeof cb === 'function') {
          cb(result);
          return undefined;
        }
        return Promise.resolve(result);
      },
      create(props, cb) {
        if (tabCreateFailures > 0) {
          tabCreateFailures -= 1;
          const err = new Error(`Cannot open ${props && props.url}`);
          if (typeof cb === 'function') throw err;
          return Promise.reject(err);
        }
        createdTabs.push(props);
        if (typeof cb === 'function') cb({ id: createdTabs.length });
        return Promise.resolve({ id: createdTabs.length });
      }
    },

    contextMenus: {
      _listeners: [],
      create: (props) => contextMenus.push(props),
      removeAll: (cb) => {
        contextMenus.length = 0;
        if (typeof cb === 'function') {
          cb();
          return undefined;
        }
        return Promise.resolve();
      },
      onClicked: {
        addListener: (fn) => chrome.contextMenus._listeners.push(fn)
      },
      async _fireClick(info, tab = {}) {
        for (const fn of chrome.contextMenus._listeners) await fn(info, tab);
      }
    },

    action: {
      _listeners: [],
      onClicked: {
        addListener: (fn) => chrome.action._listeners.push(fn)
      },
      async _fireClick(tab = {}) {
        for (const fn of chrome.action._listeners) await fn(tab);
      },
      setBadgeText: ({ text }) => badges.push({ text }),
      setBadgeBackgroundColor: ({ color }) => {
        if (badges.length) badges[badges.length - 1].color = color;
      }
    },

    commands: {
      _listeners: [],
      onCommand: {
        addListener: (fn) => chrome.commands._listeners.push(fn)
      },
      getAll: (cb) => {
        const result = options.commands || [];
        if (typeof cb === 'function') {
          cb(result);
          return undefined;
        }
        return Promise.resolve(result);
      },
      async _fire(command, tab = {}) {
        for (const fn of chrome.commands._listeners) await fn(command, tab);
      }
    },

    offscreen: {
      // Configurable so ensureOffscreen's create path is reachable. Default
      // stays `true` to keep existing tests unchanged.
      _hasDocument: options.hasOffscreenDocument === undefined ? true : options.hasOffscreenDocument,
      _createCalls: [],
      _createError: options.offscreenCreateError || null,
      hasDocument: async () => {
        if (chrome.offscreen._hasDocumentThrows) throw new Error('hasDocument unavailable');
        return chrome.offscreen._hasDocument;
      },
      createDocument: async (props) => {
        chrome.offscreen._createCalls.push(props);
        if (chrome.offscreen._createError) throw chrome.offscreen._createError;
        chrome.offscreen._hasDocument = true;
      },
      _closeCalls: 0,
      closeDocument: async () => {
        chrome.offscreen._closeCalls++;
        chrome.offscreen._hasDocument = false;
      }
    },

    alarms: {
      _created: [],
      _cleared: [],
      _listeners: [],
      create: (name, info) => chrome.alarms._created.push({ name, info }),
      clear: (name) => {
        chrome.alarms._cleared.push(name);
        chrome.alarms._created = chrome.alarms._created.filter((a) => a.name !== name);
        return Promise.resolve(true);
      },
      onAlarm: {
        addListener: (fn) => chrome.alarms._listeners.push(fn)
      },
      _fire(name) {
        for (const fn of chrome.alarms._listeners) fn({ name });
      }
    },

    // Convenience for tests that need to simulate a chrome.runtime.lastError.
    _setLastError: setLastError
  };

  return chrome;
}

module.exports = { createChrome, createStorageArea };
