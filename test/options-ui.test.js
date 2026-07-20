'use strict';

// Behavioural tests for the real extension/options.js against the real
// extension/options.html in a jsdom document (see helpers/dom-harness.js).
//
// The options page is almost entirely "control changes -> value lands in
// chrome.storage", so every test below asserts the exact storage key and the
// exact value, not merely that *something* was written.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadOptions, EXT_DIR } = require('./helpers/dom-harness');
const DEFAULT_SETTINGS = require('../extension/utils/defaults.js');

const FORMATS = ['text', 'html', 'json', 'url_only', 'delimited', 'custom'];

const sync = (o) => o.chrome.storage.sync._data;
const local = (o) => o.chrome.storage.local._data;
const plain = (value) => JSON.parse(JSON.stringify(value));
const messages = (o) => [...o.document.querySelectorAll('.message')].map((m) => m.textContent);
const errors = (o) => [...o.document.querySelectorAll('.message.error')].map((m) => m.textContent);

// StorageUtil retries 3x against sync (sleeping 100ms then 200ms) before
// falling back to local once. Exhausting exactly those four attempts makes
// setWithFallback return false and leaves both areas healthy afterwards, so a
// follow-up assertion about storage contents still means something.
function breakNextWrite(o) {
  o.chrome.storage.sync._control.failures = 3;
  o.chrome.storage.local._control.failures = 1;
}
const RETRY_BACKOFF_MS = 400; // 100 + 200, with headroom

// ---------------------------------------------------------------------------
// loadSettings
// ---------------------------------------------------------------------------

test('a fresh profile shows every DEFAULT_SETTINGS value', async () => {
  const o = await loadOptions();

  assert.equal(o.resolve('format_url_only').checked, true, 'format defaults to url_only');
  assert.equal(o.resolve('anchor_title').checked, true, 'anchor defaults to title');
  assert.equal(o.resolve('anchor_url').checked, false);
  // Regression: this read a hardcoded '' instead of the default, so the custom
  // format shipped with an unusable blank template.
  assert.equal(o.resolve('custom_template').value, '$title - $url');
  assert.equal(o.resolve('delimiter_input').value, '--', 'delimiter defaults to --');
  assert.equal(o.resolve('smart_paste').checked, true);
  assert.equal(o.resolve('selected_tabs_only').checked, false);
  assert.equal(o.resolve('include_all_windows').checked, false);
  assert.equal(o.resolve('show_context_menu').checked, true);
  assert.equal(o.resolve('save_history').checked, true);
  assert.equal(o.resolve('bold_titles').checked, false);
  assert.equal(o.resolve('theme_preference').value, 'auto');
  assert.equal(o.resolve('enable_shortcuts').checked, true);

  // Regression: options read `!== false` while the popup read `=== true`, so a
  // fresh profile showed auto-copy ON here and OFF in the popup.
  assert.equal(o.resolve('auto_action').checked, false, 'auto-copy is OFF on a fresh profile');

  assert.equal(o.document.body.classList.contains('theme-auto'), true);
  assert.equal(o.text('version_label'), '1.12.1', 'version comes from the manifest');
});

test('loadSettings populates every control from stored settings', async () => {
  const stored = {
    format: 'delimited',
    anchor: 'url',
    customTemplate: '$title => $url',
    delimiter: ' | ',
    smartPaste: false,
    selectedTabsOnly: true,
    includeAllWindows: true,
    showContextMenu: false,
    saveHistory: false,
    autoAction: true,
    bold: true,
    theme: 'dark',
    enableShortcuts: false
  };
  const o = await loadOptions({ sync: stored });

  assert.equal(o.resolve('format_delimited').checked, true);
  assert.equal(o.resolve('format_url_only').checked, false);
  assert.equal(o.resolve('anchor_url').checked, true);
  assert.equal(o.resolve('anchor_title').checked, false);
  assert.equal(o.resolve('custom_template').value, '$title => $url');
  assert.equal(o.resolve('delimiter_input').value, ' | ');
  assert.equal(o.resolve('smart_paste').checked, false);
  assert.equal(o.resolve('selected_tabs_only').checked, true);
  assert.equal(o.resolve('include_all_windows').checked, true);
  assert.equal(o.resolve('show_context_menu').checked, false);
  assert.equal(o.resolve('save_history').checked, false);
  assert.equal(o.resolve('auto_action').checked, true);
  assert.equal(o.resolve('bold_titles').checked, true);
  assert.equal(o.resolve('theme_preference').value, 'dark');
  assert.equal(o.resolve('enable_shortcuts').checked, false);

  assert.equal(o.document.body.classList.contains('theme-dark'), true);
  // The stored format also drives which advanced block is visible.
  assert.equal(o.resolve('delimited_advanced').style.display, 'block');
});

test('the #mime_type control is gone along with the setting', async () => {
  const o = await loadOptions();

  assert.equal(o.document.getElementById('mime_type'), null);
  assert.equal('mime' in DEFAULT_SETTINGS, false);
  assert.equal('mimeType' in DEFAULT_SETTINGS, false);
});

// ---------------------------------------------------------------------------
// Persistence — one test per control
// ---------------------------------------------------------------------------

for (const format of FORMATS) {
  test(`format radio "${format}" persists format=${format}`, async () => {
    const o = await loadOptions();

    await o.pickRadio(`format_${format}`);

    assert.equal(sync(o).format, format);
  });
}

for (const anchor of ['url', 'title']) {
  test(`anchor radio "${anchor}" persists anchor=${anchor}`, async () => {
    // Start from the opposite value so the write is observable.
    const o = await loadOptions({ sync: { anchor: anchor === 'url' ? 'title' : 'url' } });

    await o.pickRadio(`anchor_${anchor}`);

    assert.equal(sync(o).anchor, anchor);
  });
}

test('#custom_template persists customTemplate after the 500ms debounce', async () => {
  const o = await loadOptions();

  await o.setValue('custom_template', '$url\t$title');
  assert.equal(sync(o).customTemplate, undefined, 'still debouncing');

  await o.flushTimers(500);

  assert.equal(sync(o).customTemplate, '$url\t$title');
});

test('#delimiter_input persists delimiter after the 500ms debounce', async () => {
  const o = await loadOptions();

  await o.setValue('delimiter_input', ';;');
  assert.equal(sync(o).delimiter, undefined, 'still debouncing');

  await o.flushTimers(500);

  assert.equal(sync(o).delimiter, ';;');
});

const CHECKBOXES = [
  { id: 'smart_paste', key: 'smartPaste', from: true },
  { id: 'selected_tabs_only', key: 'selectedTabsOnly', from: false },
  { id: 'include_all_windows', key: 'includeAllWindows', from: false },
  { id: 'auto_action', key: 'autoAction', from: false },
  { id: 'bold_titles', key: 'bold', from: false },
  { id: 'enable_shortcuts', key: 'enableShortcuts', from: true }
];

for (const { id, key, from } of CHECKBOXES) {
  test(`#${id} persists ${key} in both directions`, async () => {
    const o = await loadOptions();
    assert.equal(o.resolve(id).checked, from, 'starts at its default');

    await o.check(id, !from);
    assert.equal(sync(o)[key], !from);

    await o.check(id, from);
    assert.equal(sync(o)[key], from);
  });
}

test('#show_context_menu persists showContextMenu and asks the background to rebuild the menus', async () => {
  const o = await loadOptions();

  await o.check('show_context_menu', false);

  assert.equal(sync(o).showContextMenu, false);
  assert.deepEqual(plain(o.chrome._sent), [{ type: 'updateContextMenus' }]);

  await o.check('show_context_menu', true);

  assert.equal(sync(o).showContextMenu, true);
  assert.equal(o.chrome._sent.length, 2);
});

test('#show_context_menu sends no message when the save fails', async () => {
  const o = await loadOptions();
  breakNextWrite(o);

  await o.check('show_context_menu', false);
  await o.flushTimers(RETRY_BACKOFF_MS);

  assert.deepEqual(plain(o.chrome._sent), [], 'no rebuild requested for a save that never landed');
  assert.deepEqual(errors(o), ['Failed to save context menu setting.']);
});

test('#save_history persists saveHistory and clearing it wipes the history', async () => {
  const o = await loadOptions({
    sync: { saveHistory: true },
    local: { copyHistory: [{ id: 'a', ts: Date.now(), count: 2, content: 'x' }] }
  });
  assert.ok(local(o).copyHistory, 'history present to begin with');

  await o.check('save_history', false);
  await o.flush();

  assert.equal(sync(o).saveHistory, false);
  assert.equal(local(o).copyHistory, undefined, 'opting out discards what was recorded');
});

test('#save_history leaves the history alone when the save fails', async () => {
  const history = [{ id: 'a', ts: Date.now(), count: 2, content: 'x' }];
  const o = await loadOptions({ sync: { saveHistory: true }, local: { copyHistory: history } });

  // Spy on the shared CopyHistory object — options.js holds the same reference.
  let clearCalls = 0;
  const realClear = o.window.CopyHistory.clear.bind(o.window.CopyHistory);
  o.window.CopyHistory.clear = async () => { clearCalls += 1; return realClear(); };

  breakNextWrite(o);
  await o.check('save_history', false);
  await o.flushTimers(RETRY_BACKOFF_MS);

  assert.equal(clearCalls, 0, 'the handler returns early before clearing');
  assert.deepEqual(plain(local(o).copyHistory), plain(history), 'history survives');
  assert.deepEqual(errors(o), ['Failed to save history setting.']);
});

for (const theme of ['auto', 'light', 'dark']) {
  test(`#theme_preference "${theme}" persists and applies the theme class live`, async () => {
    // Start from a different theme so the class change is observable.
    const o = await loadOptions({ sync: { theme: theme === 'dark' ? 'light' : 'dark' } });

    await o.select('theme_preference', theme);

    assert.equal(sync(o).theme, theme);
    assert.equal(o.document.body.classList.contains(`theme-${theme}`), true);
    const others = ['auto', 'light', 'dark'].filter((t) => t !== theme);
    for (const other of others) {
      assert.equal(o.document.body.classList.contains(`theme-${other}`), false);
    }
  });
}

// ---------------------------------------------------------------------------
// Advanced option gating
// ---------------------------------------------------------------------------

const ADVANCED_FOR = { html: 'html_advanced', custom: 'custom_advanced', delimited: 'delimited_advanced' };
const ALL_ADVANCED = Object.values(ADVANCED_FOR);

for (const format of FORMATS) {
  test(`toggleAdvancedOptions shows only the right block for "${format}"`, async () => {
    const o = await loadOptions();

    await o.pickRadio(`format_${format}`);

    const shown = ADVANCED_FOR[format];
    for (const id of ALL_ADVANCED) {
      assert.equal(
        o.resolve(id).style.display,
        id === shown ? 'block' : 'none',
        `#${id} for format ${format}`
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Error surfacing
// ---------------------------------------------------------------------------

test('a failed format write surfaces an error toast', async () => {
  const o = await loadOptions();
  breakNextWrite(o);

  await o.pickRadio('format_json');
  await o.flushTimers(RETRY_BACKOFF_MS);

  assert.deepEqual(errors(o), ['Failed to save format setting.']);
  assert.equal(sync(o).format, undefined, 'nothing was persisted');
});

test('a failed theme write surfaces an error toast and does not change the theme', async () => {
  const o = await loadOptions({ sync: { theme: 'light' } });
  breakNextWrite(o);

  await o.select('theme_preference', 'dark');
  await o.flushTimers(RETRY_BACKOFF_MS);

  assert.deepEqual(errors(o), ['Failed to save theme preference.']);
  assert.equal(o.document.body.classList.contains('theme-light'), true);
  assert.equal(o.document.body.classList.contains('theme-dark'), false);
});

test('toasts disappear after their timeout', async () => {
  const o = await loadOptions();
  breakNextWrite(o);

  await o.check('bold_titles', true);
  await o.flushTimers(RETRY_BACKOFF_MS);
  assert.equal(messages(o).length, 1);

  await o.flushTimers(5000);

  assert.deepEqual(messages(o), []);
});

// ---------------------------------------------------------------------------
// Reset flow
// ---------------------------------------------------------------------------

const DIRTY_SYNC = {
  format: 'json',
  anchor: 'url',
  theme: 'dark',
  delimiter: '@@',
  autoAction: true,
  bold: true,
  strayLegacyKey: 'should not survive'
};
const PRESERVED_LOCAL = {
  copyHistory: [{ id: 'a', ts: 1700000000000, count: 4, format: 'json', content: 'https://a.example' }],
  pasteSource: 'textarea'
};

test('#reset_settings opens the confirmation modal and #cancel_reset closes it', async () => {
  const o = await loadOptions();
  assert.equal(o.isHidden('reset_confirmation'), true);

  await o.click('reset_settings');
  assert.equal(o.isHidden('reset_confirmation'), false);

  await o.click('cancel_reset');
  assert.equal(o.isHidden('reset_confirmation'), true);
});

test('#confirm_reset restores every default and preserves copy history + paste source', async () => {
  const o = await loadOptions({
    sync: DIRTY_SYNC,
    local: { ...PRESERVED_LOCAL, junk: 'wipe me' }
  });

  await o.click('reset_settings');
  await o.click('confirm_reset');
  await o.flush(60);

  assert.deepEqual(plain(sync(o)), plain(DEFAULT_SETTINGS),
    'sync holds exactly DEFAULT_SETTINGS — stray legacy keys are gone');

  // The critical bit: these are user DATA, not settings, and nothing could
  // restore them if the wipe took them.
  assert.deepEqual(plain(local(o).copyHistory), plain(PRESERVED_LOCAL.copyHistory),
    'copy history survived the reset');
  assert.equal(local(o).pasteSource, 'textarea', 'paste source survived the reset');
  assert.equal(local(o).junk, undefined, 'unrelated local keys are still wiped');

  assert.ok(messages(o).some((m) => /reset successfully/i.test(m)));
});

test('#confirm_reset copes with a profile that has nothing to preserve', async () => {
  const o = await loadOptions({ sync: { format: 'json' } });

  await o.click('reset_settings');
  await o.click('confirm_reset');
  await o.flush(60);

  assert.deepEqual(plain(sync(o)), plain(DEFAULT_SETTINGS));
  assert.deepEqual(plain(local(o)), {});
});

// ---------------------------------------------------------------------------
// Repair flow
// ---------------------------------------------------------------------------

test('#repair_storage restores defaults and preserves copy history + paste source', async () => {
  const o = await loadOptions({
    sync: DIRTY_SYNC,
    local: { ...PRESERVED_LOCAL, junk: 'wipe me' }
  });

  await o.click('repair_storage');
  await o.flush(60);

  assert.deepEqual(plain(sync(o)), plain(DEFAULT_SETTINGS));
  assert.deepEqual(plain(local(o).copyHistory), plain(PRESERVED_LOCAL.copyHistory),
    'copy history survived the repair');
  assert.equal(local(o).pasteSource, 'textarea', 'paste source survived the repair');
  assert.equal(local(o).junk, undefined);

  assert.ok(messages(o).some((m) => /repair completed successfully/i.test(m)));
});

// ---------------------------------------------------------------------------
// Storage health check
// ---------------------------------------------------------------------------

const results = (o) => o.resolve('storage_results');
const sectionTitles = (o) => [...results(o).querySelectorAll('h5')].map((h) => h.textContent);
const lines = (o) => [...results(o).querySelectorAll('p')].map((p) => p.textContent);
const listItems = (o) => [...results(o).querySelectorAll('li')].map((li) => li.textContent);

test('the storage health check renders a healthy report', async () => {
  const o = await loadOptions();
  assert.equal(o.isHidden('storage_status'), true);

  await o.click('storage_health_check');
  await o.flush(30);

  assert.equal(o.isHidden('storage_status'), false, 'the results panel is revealed');
  assert.deepEqual(sectionTitles(o), ['Chrome Sync Storage', 'Local Storage', 'Recommendations']);
  assert.deepEqual(lines(o), [
    'Available: Yes', 'Readable: Yes', 'Writable: Yes',
    'Available: Yes', 'Readable: Yes', 'Writable: Yes'
  ]);
  assert.deepEqual(listItems(o), [
    'Storage appears healthy. Settings loss may be due to external factors.'
  ]);
  // The probe cleans up after itself.
  assert.equal(sync(o).healthCheck, undefined);
  assert.equal(local(o).healthCheck, undefined);
});

test('the storage health check reports broken sync storage', async () => {
  const o = await loadOptions();
  o.chrome.storage.sync._control.failures = 99;

  await o.click('storage_health_check');
  await o.flush(30);

  assert.deepEqual(sectionTitles(o),
    ['Chrome Sync Storage', 'Local Storage', 'Errors', 'Recommendations']);
  assert.deepEqual(lines(o), [
    'Available: No',
    'Available: Yes', 'Readable: Yes', 'Writable: Yes'
  ], 'a dead area only reports availability');
  assert.deepEqual(listItems(o), [
    'Sync storage failed: storage unavailable',
    'Chrome Sync storage is not available. Check Chrome sync settings.',
    'Storage errors detected. Consider running repair operation.'
  ]);
});

test('the health report is built from real elements, never innerHTML', async () => {
  const o = await loadOptions();
  o.chrome.storage.sync._control.failures = 99;

  await o.click('storage_health_check');
  await o.flush(30);

  // Structural proof: every reported string sits in a text node of its own
  // element, so a markup-bearing chrome.runtime.lastError.message could never
  // be parsed as HTML.
  const errorItem = results(o).querySelectorAll('li')[0];
  assert.equal(errorItem.tagName, 'LI');
  assert.equal(errorItem.childNodes.length, 1);
  assert.equal(errorItem.childNodes[0].nodeType, 3, 'a single text node');

  const statusValue = results(o).querySelector('p span');
  assert.equal(statusValue.childNodes.length, 1);
  assert.equal(statusValue.childNodes[0].nodeType, 3);

  // And the source itself must stay free of innerHTML. Comments are stripped
  // first — both files *mention* innerHTML to explain why they avoid it.
  const stripComments = (source) => source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  for (const file of ['options.js', 'popup.js']) {
    const code = stripComments(fs.readFileSync(path.join(EXT_DIR, file), 'utf8'));
    assert.equal(/\binnerHTML\b/.test(code), false, `${file} must not use innerHTML`);
  }
});

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

test('#customizeShortcuts opens the Chrome shortcuts page', async () => {
  const o = await loadOptions();

  await o.click('customizeShortcuts');

  assert.deepEqual(plain(o.chrome._createdTabs), [{ url: 'chrome://extensions/shortcuts' }]);
});

test('the configured shortcuts are rendered, with "Not set" for unbound commands', async () => {
  const o = await loadOptions({
    chromeOptions: {
      commands: [
        { name: 'copy-urls', shortcut: 'Ctrl+Shift+U' },
        { name: 'paste-urls', shortcut: '' }
      ]
    }
  });

  assert.equal(o.text('copyShortcut'), 'Ctrl+Shift+U');
  assert.equal(o.text('pasteShortcut'), 'Not set');
});
