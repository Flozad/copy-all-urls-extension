'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadStorageUtil } = require('./helpers/harness');

const DEFAULT_SETTINGS = require('../extension/utils/defaults.js');

// `failures` is a countdown, so a number this large means "fail every call".
const ALWAYS = 999;

// Objects built inside the vm sandbox carry the sandbox's Object.prototype, so
// assert.deepEqual against a host-realm literal fails on prototype identity
// alone. Re-spread into a host object before comparing.
function plain(value) {
  return { ...value };
}

function setup(options = {}) {
  const chrome = createChrome(options);
  const { StorageUtil, logs } = loadStorageUtil(chrome);
  return { chrome, StorageUtil, logs, sync: chrome.storage.sync, local: chrome.storage.local };
}

// --- module guard ---------------------------------------------------------

test('loading storage.js without defaults.js in context throws', () => {
  assert.throws(
    () => loadStorageUtil(createChrome(), { skipDefaults: true }),
    /utils\/storage\.js requires utils\/defaults\.js to be loaded first/
  );
});

test('StorageUtil.defaultSettings is the shared DEFAULT_SETTINGS', () => {
  const { StorageUtil } = setup();
  assert.deepEqual(plain(StorageUtil.defaultSettings), DEFAULT_SETTINGS);
});

// --- setWithFallback ------------------------------------------------------

test('setWithFallback(key, value) writes to sync and returns true', async () => {
  const { StorageUtil, sync } = setup();
  assert.equal(await StorageUtil.setWithFallback('format', 'html'), true);
  assert.equal(sync._data.format, 'html');
});

test('setWithFallback(object) writes every pair to sync', async () => {
  const { StorageUtil, sync, local } = setup();
  assert.equal(await StorageUtil.setWithFallback({ format: 'html', bold: true }), true);
  assert.equal(sync._data.format, 'html');
  assert.equal(sync._data.bold, true);
  assert.deepEqual(local._data, {}, 'no need to touch local when sync works');
});

test('setWithFallback ignores `value` when the key is an object', async () => {
  const { StorageUtil, sync } = setup();
  await StorageUtil.setWithFallback({ theme: 'dark' }, 'IGNORED');
  assert.deepEqual(sync._data, { theme: 'dark' });
});

test('setWithFallback retries and succeeds on the second attempt', async () => {
  const { StorageUtil, sync, local } = setup({ syncFailure: { failures: 1 } });
  assert.equal(await StorageUtil.setWithFallback('format', 'html'), true);
  assert.equal(sync._data.format, 'html', 'the retry landed in sync');
  assert.deepEqual(local._data, {}, 'local fallback was never needed');
});

test('setWithFallback falls back to local when sync fails every attempt', async () => {
  const { StorageUtil, sync, local } = setup({ syncFailure: { failures: ALWAYS } });
  assert.equal(await StorageUtil.setWithFallback('format', 'html'), true);
  assert.deepEqual(sync._data, {}, 'nothing was written to sync');
  assert.equal(local._data.format, 'html');
});

test('setWithFallback returns false and logs when both sync and local fail', async () => {
  const { StorageUtil, sync, local, logs } = setup({
    syncFailure: { failures: ALWAYS },
    localFailure: { failures: ALWAYS }
  });
  assert.equal(await StorageUtil.setWithFallback('format', 'html'), false);
  assert.deepEqual(sync._data, {});
  assert.deepEqual(local._data, {});
  assert.ok(logs.error.some((l) => l.includes('Both sync and local storage failed')));
});

test('setWithFallback honours the retries parameter', async () => {
  async function countSyncAttempts(retries) {
    const { StorageUtil, sync } = setup({ syncFailure: { failures: ALWAYS } });
    let attempts = 0;
    const realSet = sync.set.bind(sync);
    sync.set = (items, cb) => {
      attempts += 1;
      return realSet(items, cb);
    };
    await StorageUtil.setWithFallback('format', 'html', retries);
    return attempts;
  }
  assert.equal(await countSyncAttempts(1), 1);
  assert.equal(await countSyncAttempts(3), 3);
});

// --- getWithFallback ------------------------------------------------------

test('getWithFallback(string) returns the sync value', async () => {
  const { StorageUtil, sync } = setup();
  sync._data.format = 'html';
  assert.deepEqual(await StorageUtil.getWithFallback('format'), { format: 'html' });
});

test('getWithFallback(array) returns every present key', async () => {
  const { StorageUtil, sync } = setup();
  Object.assign(sync._data, { format: 'html', theme: 'dark' });
  assert.deepEqual(await StorageUtil.getWithFallback(['format', 'theme', 'absent']), {
    format: 'html',
    theme: 'dark'
  });
});

test('getWithFallback(object) uses stored values, falling back to the supplied defaults', async () => {
  const { StorageUtil, sync } = setup();
  sync._data.format = 'html';
  assert.deepEqual(await StorageUtil.getWithFallback({ format: 'url_only', theme: 'auto' }), {
    format: 'html',
    theme: 'auto'
  });
});

test('getWithFallback reads from local when sync is broken', async () => {
  const { StorageUtil, local } = setup({ syncFailure: { failures: ALWAYS } });
  local._data.format = 'from-local';
  assert.deepEqual(await StorageUtil.getWithFallback('format'), { format: 'from-local' });
});

test('getWithFallback(string) returns the built-in default when both storages fail', async () => {
  const { StorageUtil, logs } = setup({
    syncFailure: { failures: ALWAYS },
    localFailure: { failures: ALWAYS }
  });
  assert.deepEqual(plain(await StorageUtil.getWithFallback('format')), {
    format: DEFAULT_SETTINGS.format
  });
  assert.ok(logs.error.some((l) => l.includes('Both sync and local storage failed')));
});

test('getWithFallback(object) merges built-in defaults with the supplied ones when both storages fail', async () => {
  const { StorageUtil } = setup({
    syncFailure: { failures: ALWAYS },
    localFailure: { failures: ALWAYS }
  });
  // chrome.storage.get(object) semantics: the object's keys select what comes
  // back and its values are the caller's own defaults, which win over ours.
  const result = plain(await StorageUtil.getWithFallback({ format: 'custom' }));
  assert.deepEqual(result, { format: 'custom' });
});

test('getWithFallback(object) fills unsupplied values from DEFAULT_SETTINGS when both storages fail', async () => {
  const { StorageUtil } = setup({
    syncFailure: { failures: ALWAYS },
    localFailure: { failures: ALWAYS }
  });
  const result = plain(await StorageUtil.getWithFallback({ format: undefined, theme: 'dark' }));
  assert.deepEqual(result, { format: DEFAULT_SETTINGS.format, theme: 'dark' });
});

test('getWithFallback(array) returns exactly the named defaults when both storages fail', async () => {
  // Regression: the old code branched on `typeof keys === 'object'`, which is
  // ALSO true for an array, so an array of key names took the object branch and
  // was spread positionally — callers got every DEFAULT_SETTINGS key PLUS junk
  // numeric keys { '0': 'format', '1': 'theme' }.
  const { StorageUtil } = setup({
    syncFailure: { failures: ALWAYS },
    localFailure: { failures: ALWAYS }
  });
  const result = plain(await StorageUtil.getWithFallback(['format', 'theme']));

  assert.deepEqual(result, { format: DEFAULT_SETTINGS.format, theme: DEFAULT_SETTINGS.theme });
  assert.ok(!('0' in result), 'no array index leaked in as a key');
  assert.ok(!('delimiter' in result), 'unrequested keys are not returned');
});

test('getWithFallback(array) yields undefined for keys with no known default', async () => {
  const { StorageUtil } = setup({
    syncFailure: { failures: ALWAYS },
    localFailure: { failures: ALWAYS }
  });
  const result = plain(await StorageUtil.getWithFallback(['format', 'noSuchSetting']));
  assert.deepEqual(result, { format: DEFAULT_SETTINGS.format, noSuchSetting: undefined });
});

test('getWithFallback(null) returns the full default set when both storages fail', async () => {
  const { StorageUtil } = setup({
    syncFailure: { failures: ALWAYS },
    localFailure: { failures: ALWAYS }
  });
  assert.deepEqual(plain(await StorageUtil.getWithFallback(null)), { ...DEFAULT_SETTINGS });
});

test('getWithFallback honours the retries parameter', async () => {
  const { StorageUtil, sync } = setup({ syncFailure: { failures: ALWAYS } });
  let attempts = 0;
  const realGet = sync.get.bind(sync);
  sync.get = (keys, cb) => {
    attempts += 1;
    return realGet(keys, cb);
  };
  await StorageUtil.getWithFallback('format', 1);
  assert.equal(attempts, 1);
});

// --- checkHealth ----------------------------------------------------------

test('checkHealth reports both areas working', async () => {
  const { StorageUtil } = setup();
  const status = await StorageUtil.checkHealth();
  assert.equal(status.sync.working, true);
  assert.equal(status.sync.error, null);
  assert.equal(status.local.working, true);
  assert.equal(status.local.error, null);
});

test('checkHealth flags a broken sync area and leaves local healthy', async () => {
  const { StorageUtil } = setup({ syncFailure: { failures: ALWAYS } });
  const status = await StorageUtil.checkHealth();
  assert.equal(status.sync.working, false);
  assert.equal(typeof status.sync.error, 'string');
  assert.ok(status.sync.error.length > 0);
  assert.equal(status.local.working, true);
});

test('checkHealth flags a broken local area and leaves sync healthy', async () => {
  const { StorageUtil } = setup({ localFailure: { failures: ALWAYS } });
  const status = await StorageUtil.checkHealth();
  assert.equal(status.local.working, false);
  assert.equal(typeof status.local.error, 'string');
  assert.ok(status.local.error.length > 0);
  assert.equal(status.sync.working, true);
});

test('checkHealth removes its transient probe key from both areas', async () => {
  const { StorageUtil, sync, local } = setup();
  await StorageUtil.checkHealth();
  assert.ok(!('__health_check__' in sync._data), 'probe key left behind in sync');
  assert.ok(!('__health_check__' in local._data), 'probe key left behind in local');
  assert.deepEqual(sync._data, {});
  assert.deepEqual(local._data, {});
});

test('checkHealth leaves unrelated stored data untouched', async () => {
  const { StorageUtil, sync } = setup();
  sync._data.format = 'html';
  await StorageUtil.checkHealth();
  assert.deepEqual(sync._data, { format: 'html' });
});

test('checkHealth swallows a cleanup failure and still returns a status', async () => {
  const { StorageUtil, sync, logs } = setup();
  sync.remove = () => {
    throw new Error('remove exploded');
  };
  const status = await StorageUtil.checkHealth();
  assert.equal(status.sync.working, true);
  assert.equal(status.local.working, true);
  assert.ok(logs.warn.some((l) => l.includes('Failed to cleanup health check keys')));
});

// --- repair ---------------------------------------------------------------

test('repair clears both areas and restores every default', async () => {
  const { StorageUtil, sync, local } = setup();
  Object.assign(sync._data, { format: 'html', junk: 'corrupt' });
  Object.assign(local._data, { junk: 'corrupt' });

  assert.equal(await StorageUtil.repair(), true);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    assert.deepEqual(sync._data[key], value, `sync.${key} was not restored`);
    assert.deepEqual(local._data[key], value, `local.${key} was not restored`);
  }
  assert.ok(!('junk' in sync._data), 'corrupt sync key survived repair');
  assert.ok(!('junk' in local._data), 'corrupt local key survived repair');
  assert.deepEqual(Object.keys(sync._data).sort(), Object.keys(DEFAULT_SETTINGS).sort());
});

test('repair returns false without throwing when clearing fails', async () => {
  const { StorageUtil, sync, logs } = setup();
  sync.clear = () => {
    throw new Error('clear exploded');
  };
  assert.equal(await StorageUtil.repair(), false);
  assert.ok(logs.error.some((l) => l.includes('Storage repair failed')));
});

test('repair returns false when restoring defaults to local fails', async () => {
  const { StorageUtil, local } = setup();
  const realSet = local.set.bind(local);
  local.set = (items, cb) => {
    local.set = realSet; // only the restore call fails
    throw new Error('set exploded');
  };
  assert.equal(await StorageUtil.repair(), false);
});
