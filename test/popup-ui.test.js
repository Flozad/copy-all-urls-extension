'use strict';

// Behavioural tests for the real extension/popup.js, running against the real
// extension/popup.html in a jsdom document (see helpers/dom-harness.js).
//
// Everything here drives the page the way a user does — click a button,
// type in an input, deliver a runtime message — and then asserts on what
// actually changed: chrome.storage contents, the messages sent to the
// background, clipboard calls, and DOM state.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPopup } = require('./helpers/dom-harness');

const FORMATS = ['text', 'html', 'json', 'url_only', 'delimited', 'custom'];

const DISPLAY_NAMES = {
  url_only: 'URL Only',
  text: 'Text (URL + Title)',
  html: 'HTML',
  json: 'JSON',
  delimited: 'Delimited',
  custom: 'Custom'
};

const toast = (p) => p.text('message').trim();

// Messages are constructed inside the jsdom realm, so their prototype is that
// window's Object.prototype and assert/strict's deepEqual would reject them on
// identity alone. Round-tripping brings them back into this realm; it also
// keeps `'html' in msg` style checks honest, since JSON drops nothing here.
const plain = (value) => JSON.parse(JSON.stringify(value));
const sent = (p) => plain(p.chrome._sent);
const copies = (p) => sent(p).filter((m) => m.type === 'copy');
const pastes = (p) => sent(p).filter((m) => m.type === 'paste');

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

test('#actionCopy sends a copy message to the background', async () => {
  const p = await loadPopup();
  assert.deepEqual(sent(p), []);

  await p.click('actionCopy');

  assert.deepEqual(sent(p), [{ type: 'copy' }]);
});

// ---------------------------------------------------------------------------
// Format selection
// ---------------------------------------------------------------------------

for (const format of FORMATS) {
  test(`selecting format "${format}" persists it, closes the dropdown and re-copies`, async () => {
    const p = await loadPopup();

    // Open the dropdown first so "it closes again" is a real assertion.
    await p.click('formatDropdownToggle');
    assert.equal(p.isHidden('formatDropdown'), false);

    await p.click(`.format-option[data-format="${format}"]`);

    assert.equal(p.chrome.storage.sync._data.format, format, 'format persisted to sync');
    assert.equal(p.isHidden('formatDropdown'), true, 'dropdown closed');
    assert.equal(
      p.text('currentFormatIndicator').trim(),
      `Format: ${DISPLAY_NAMES[format]}`,
      'indicator updated'
    );
    assert.deepEqual(copies(p), [{ type: 'copy' }], 'a fresh copy was requested');

    // The checkmark tracks currentFormat, which is what the re-copy reads.
    const checked = [...p.document.querySelectorAll('.format-option')]
      .filter((option) => option.querySelector('span').textContent === '✓')
      .map((option) => option.dataset.format);
    assert.deepEqual(checked, [format], 'exactly the selected option is ticked');
  });
}

test('a stored format is restored on open', async () => {
  const p = await loadPopup({ sync: { format: 'json' } });

  assert.equal(p.text('currentFormatIndicator').trim(), 'Format: JSON');
  assert.equal(
    p.document.querySelector('.format-option[data-format="json"] span').textContent,
    '✓'
  );
});

// ---------------------------------------------------------------------------
// Advanced settings gating
// ---------------------------------------------------------------------------

const ADVANCED_EXPECTATIONS = {
  text: { advanced: true, delimited: true, custom: true },
  html: { advanced: true, delimited: true, custom: true },
  json: { advanced: true, delimited: true, custom: true },
  url_only: { advanced: true, delimited: true, custom: true },
  delimited: { advanced: false, delimited: false, custom: true },
  custom: { advanced: false, delimited: true, custom: false }
};

for (const format of FORMATS) {
  const expected = ADVANCED_EXPECTATIONS[format];
  test(`updateAdvancedSettings gating for "${format}"`, async () => {
    const p = await loadPopup();
    await p.click(`.format-option[data-format="${format}"]`);

    assert.equal(p.isHidden('formatAdvancedSettings'), expected.advanced,
      '#formatAdvancedSettings hidden?');
    assert.equal(p.isHidden('delimitedSettings'), expected.delimited,
      '#delimitedSettings hidden?');
    assert.equal(p.isHidden('customSettings'), expected.custom,
      '#customSettings hidden?');
  });
}

test('advanced settings are gated from stored format on open, not just on click', async () => {
  const p = await loadPopup({ sync: { format: 'delimited' } });

  assert.equal(p.isHidden('formatAdvancedSettings'), false);
  assert.equal(p.isHidden('delimitedSettings'), false);
  assert.equal(p.isHidden('customSettings'), true);
});

// ---------------------------------------------------------------------------
// Dropdown open/close behaviour
// ---------------------------------------------------------------------------

test('#formatDropdownToggle opens and closes the format dropdown', async () => {
  const p = await loadPopup();
  assert.equal(p.isHidden('formatDropdown'), true);

  await p.click('formatDropdownToggle');
  assert.equal(p.isHidden('formatDropdown'), false);

  await p.click('formatDropdownToggle');
  assert.equal(p.isHidden('formatDropdown'), true);
});

test('#currentFormatIndicator also opens the format dropdown', async () => {
  const p = await loadPopup();

  await p.click('currentFormatIndicator');

  assert.equal(p.isHidden('formatDropdown'), false);
});

test('#currentSourceIndicator opens the source dropdown and force-closes the format one', async () => {
  const p = await loadPopup();

  await p.click('formatDropdownToggle');
  assert.equal(p.isHidden('formatDropdown'), false);

  await p.click('currentSourceIndicator');

  assert.equal(p.isHidden('sourceDropdown'), false, 'source dropdown opened');
  assert.equal(p.isHidden('formatDropdown'), true, 'format dropdown was force-closed');
});

test('only one dropdown is ever open at a time', async () => {
  const p = await loadPopup();

  await p.click('formatDropdownToggle');
  assert.equal(p.isHidden('formatDropdown'), false);
  assert.equal(p.isHidden('sourceDropdown'), true);

  await p.click('currentSourceIndicator');
  assert.equal(p.isHidden('sourceDropdown'), false);
  assert.equal(p.isHidden('formatDropdown'), true);

  await p.click('formatDropdownToggle');
  assert.equal(p.isHidden('formatDropdown'), false);
  assert.equal(p.isHidden('sourceDropdown'), true);
});

test('a click outside closes whichever dropdown is open', async () => {
  const p = await loadPopup();

  await p.click('formatDropdownToggle');
  assert.equal(p.isHidden('formatDropdown'), false);
  await p.click('body');
  assert.equal(p.isHidden('formatDropdown'), true, 'format dropdown closed by outside click');

  await p.click('currentSourceIndicator');
  assert.equal(p.isHidden('sourceDropdown'), false);
  await p.click('body');
  assert.equal(p.isHidden('sourceDropdown'), true, 'source dropdown closed by outside click');
});

// ---------------------------------------------------------------------------
// Paste source
// ---------------------------------------------------------------------------

for (const source of ['textarea', 'clipboard']) {
  test(`selecting paste source "${source}" persists to storage.local and updates the indicator`, async () => {
    // Start from the other source so the assertion cannot pass by default.
    const other = source === 'textarea' ? 'clipboard' : 'textarea';
    const p = await loadPopup({ local: { pasteSource: other } });

    await p.click('currentSourceIndicator');
    await p.click(`.source-option[data-source="${source}"]`);

    assert.equal(p.chrome.storage.local._data.pasteSource, source, 'written to LOCAL');
    assert.equal(
      p.chrome.storage.sync._data.pasteSource,
      undefined,
      'paste source must never go to sync'
    );
    assert.equal(p.isHidden('sourceDropdown'), true, 'dropdown closed');

    const label = source === 'textarea' ? 'Textarea' : 'Clipboard';
    assert.equal(p.text('currentSourceIndicator').trim(), `Paste: ${label}`);

    const ticked = [...p.document.querySelectorAll('.source-option')]
      .filter((option) => option.querySelector('span').textContent === '✓')
      .map((option) => option.dataset.source);
    assert.deepEqual(ticked, [source]);
  });
}

test('a stored paste source is restored on open', async () => {
  const p = await loadPopup({ local: { pasteSource: 'textarea' } });

  assert.equal(p.text('currentSourceIndicator').trim(), 'Paste: Textarea');
});

// ---------------------------------------------------------------------------
// Paste — textarea source
// ---------------------------------------------------------------------------

test('paste from an empty textarea shows an error and sends nothing', async () => {
  const p = await loadPopup({ local: { pasteSource: 'textarea' } });
  p.resolve('copiedContent').value = '   \n  ';

  await p.click('actionPaste');

  assert.equal(toast(p), 'Textarea is empty. Please paste URLs here first.');
  assert.deepEqual(pastes(p), [], 'no paste message sent');
});

test('paste from a non-empty textarea sends content with no html field', async () => {
  const p = await loadPopup({ local: { pasteSource: 'textarea' } });
  p.resolve('copiedContent').value = 'https://a.example\nhttps://b.example';

  await p.click('actionPaste');

  const sent = pastes(p);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].content, 'https://a.example\nhttps://b.example');
  assert.equal('html' in sent[0], false, 'textarea paste must not carry an html flavour');
});

// ---------------------------------------------------------------------------
// Paste — clipboard source
// ---------------------------------------------------------------------------

test('paste from clipboard reads both flavours and forwards both', async () => {
  const p = await loadPopup({ local: { pasteSource: 'clipboard' } });
  p.clipboard.stageItems([{
    'text/html': '<a href="https://a.example">A</a>',
    'text/plain': 'https://a.example'
  }]);

  await p.click('actionPaste');

  assert.deepEqual(pastes(p), [{
    type: 'paste',
    content: 'https://a.example',
    html: '<a href="https://a.example">A</a>'
  }]);
});

test('an empty text/plain promotes the html flavour into content', async () => {
  const p = await loadPopup({ local: { pasteSource: 'clipboard' } });
  const html = '<a href="https://rich.example">Rich Link</a>';
  p.clipboard.stageItems([{ 'text/html': html, 'text/plain': '' }]);

  await p.click('actionPaste');

  // This is the rich-link case: the visible text is just the label, so the
  // HTML (which still holds the href) has to become the payload.
  assert.deepEqual(pastes(p), [{ type: 'paste', content: html, html: '' }]);
});

test('a clipboard.read() rejection falls back to readText()', async () => {
  const p = await loadPopup({ local: { pasteSource: 'clipboard' } });
  p.clipboard._state.failRead = true;
  p.clipboard.stageText('https://fallback.example');

  await p.click('actionPaste');

  assert.deepEqual(pastes(p), [{
    type: 'paste',
    content: 'https://fallback.example',
    html: ''
  }]);
});

test('an empty clipboard shows the empty message and sends nothing', async () => {
  const p = await loadPopup({ local: { pasteSource: 'clipboard' } });
  p.clipboard.stageItems([{ 'text/plain': '   ' }]);

  await p.click('actionPaste');

  assert.equal(toast(p), 'Clipboard is empty. Copy some URLs first.');
  assert.deepEqual(pastes(p), []);
});

test('total clipboard failure shows the permissions error', async () => {
  const p = await loadPopup({ local: { pasteSource: 'clipboard' } });
  p.clipboard._state.failRead = true;
  p.clipboard._state.failReadText = true;

  await p.click('actionPaste');

  assert.equal(toast(p), 'Failed to read clipboard. Check permissions.');
  assert.deepEqual(pastes(p), []);
});

// ---------------------------------------------------------------------------
// Auto-copy toggle
// ---------------------------------------------------------------------------

test('#autoCopyToggle on persists autoAction=true and confirms', async () => {
  const p = await loadPopup();
  assert.equal(p.resolve('autoCopyToggle').checked, false, 'off on a fresh profile');

  await p.check('autoCopyToggle', true);

  assert.equal(p.chrome.storage.sync._data.autoAction, true);
  assert.equal(toast(p), 'Auto-copy enabled - URLs will copy when popup opens');
});

test('#autoCopyToggle off persists autoAction=false and confirms', async () => {
  const p = await loadPopup({ sync: { autoAction: true } });
  assert.equal(p.resolve('autoCopyToggle').checked, true, 'reflects stored value');
  await p.flushTimers(100); // drain the auto-copy that opening therefore queued

  await p.check('autoCopyToggle', false);

  assert.equal(p.chrome.storage.sync._data.autoAction, false);
  assert.equal(toast(p), 'Auto-copy disabled');
});

test('autoAction=true copies on popup open', async () => {
  const p = await loadPopup({ sync: { autoAction: true } });
  assert.deepEqual(copies(p), [], 'the copy is deferred by 100ms');

  await p.flushTimers(100);

  assert.deepEqual(copies(p), [{ type: 'copy' }]);
});

test('autoAction=false does not copy on popup open', async () => {
  const p = await loadPopup({ sync: { autoAction: false } });

  await p.flushTimers(5000);

  assert.deepEqual(copies(p), []);
});

test('an absent autoAction does not copy on popup open', async () => {
  const p = await loadPopup();

  await p.flushTimers(5000);

  assert.deepEqual(copies(p), []);
});

// ---------------------------------------------------------------------------
// Debounced inputs
// ---------------------------------------------------------------------------

test('#delimiterInput rewrites a blank value to the default and saves that', async () => {
  const p = await loadPopup();
  const input = p.resolve('delimiterInput');

  await p.setValue('delimiterInput', '   ');

  assert.equal(input.value, '--', 'field rewritten to DEFAULT_SETTINGS.delimiter');
  assert.equal(p.chrome.storage.sync._data.delimiter, undefined, 'not written yet');

  await p.flushTimers(500);

  assert.equal(p.chrome.storage.sync._data.delimiter, '--');
});

test('#delimiterInput debounces for 500ms, then saves and re-copies', async () => {
  const p = await loadPopup();

  await p.setValue('delimiterInput', '|');
  await p.flushTimers(499);
  assert.equal(p.chrome.storage.sync._data.delimiter, undefined, 'still debouncing at 499ms');
  assert.deepEqual(copies(p), []);

  await p.flushTimers(1);

  assert.equal(p.chrome.storage.sync._data.delimiter, '|');
  assert.deepEqual(copies(p), [{ type: 'copy' }], 'preview refreshed once');
});

test('#delimiterInput collapses a burst of keystrokes into one write', async () => {
  const p = await loadPopup();

  await p.setValue('delimiterInput', ',');
  await p.flushTimers(200);
  await p.setValue('delimiterInput', ', ');
  await p.flushTimers(200);
  await p.setValue('delimiterInput', ' | ');
  await p.flushTimers(500);

  assert.equal(p.chrome.storage.sync._data.delimiter, ' | ');
  assert.deepEqual(copies(p), [{ type: 'copy' }], 'one write, one re-copy');
});

test('#customTemplateInput debounces, saves and re-copies', async () => {
  const p = await loadPopup();

  await p.setValue('customTemplateInput', '$title -> $url');
  assert.equal(p.chrome.storage.sync._data.customTemplate, undefined);

  await p.flushTimers(500);

  assert.equal(p.chrome.storage.sync._data.customTemplate, '$title -> $url');
  assert.deepEqual(copies(p), [{ type: 'copy' }]);
});

test('stored delimiter and template populate their inputs on open', async () => {
  const p = await loadPopup({ sync: { delimiter: '\\t', customTemplate: '$url' } });

  assert.equal(p.resolve('delimiterInput').value, '\\t');
  assert.equal(p.resolve('customTemplateInput').value, '$url');
});

// ---------------------------------------------------------------------------
// Incoming runtime messages
// ---------------------------------------------------------------------------

test('an html copy result writes both flavours via ClipboardItem', async () => {
  const p = await loadPopup();
  const html = '<a href="https://a.example">A &amp; B</a>';
  const plain = 'A & B\nhttps://a.example';

  p.chrome.runtime._fireMessage({
    type: 'copy',
    mimeType: 'html',
    content: html,
    plainContent: plain,
    copied_url: 3
  });
  await p.flush();

  assert.equal(p.resolve('copiedContent').value, html, 'textarea shows the copied content');
  assert.equal(p.clipboard._state.writes.length, 1, 'exactly one clipboard.write()');
  assert.deepEqual(p.clipboard._state.writeTexts, [], 'no writeText fallback on the happy path');

  const item = p.clipboard.lastWrittenItem;
  assert.deepEqual(item.types, ['text/html', 'text/plain']);
  assert.equal(await (await item.getType('text/html')).text(), html);
  assert.equal(await (await item.getType('text/plain')).text(), plain);

  assert.equal(toast(p), 'Copied 3 URLs as HTML!');
});

test('a ClipboardItem write failure falls back to writeText(plainContent)', async () => {
  const p = await loadPopup();
  p.clipboard._state.failWrite = true;

  p.chrome.runtime._fireMessage({
    type: 'copy',
    mimeType: 'html',
    content: '<a href="https://a.example">A</a>',
    plainContent: 'A\nhttps://a.example',
    copied_url: 1
  });
  await p.flush();

  assert.deepEqual(p.clipboard._state.writeTexts, ['A\nhttps://a.example'],
    'the plain flavour, not the HTML, is what lands on the clipboard');
  assert.equal(toast(p), 'Copied 1 URLs to clipboard!');
});

test('when both clipboard paths fail the user is told', async () => {
  const p = await loadPopup();
  p.clipboard._state.failWrite = true;
  p.clipboard._state.failWriteText = true;

  p.chrome.runtime._fireMessage({
    type: 'copy',
    mimeType: 'html',
    content: '<a>x</a>',
    plainContent: 'x',
    copied_url: 1
  });
  await p.flush();

  assert.equal(toast(p), 'Failed to copy to clipboard');
});

test('a non-html copy result uses writeText', async () => {
  const p = await loadPopup();

  p.chrome.runtime._fireMessage({
    type: 'copy',
    mimeType: 'text/plain',
    content: 'https://a.example\nhttps://b.example',
    copied_url: 2
  });
  await p.flush();

  assert.deepEqual(p.clipboard._state.writeTexts, ['https://a.example\nhttps://b.example']);
  assert.equal(p.clipboard._state.writes.length, 0, 'no rich write for plain text');
  assert.equal(toast(p), 'Copied 2 URLs to clipboard!');
});

test('a copy errorMsg shows an error and never touches the clipboard', async () => {
  const p = await loadPopup();

  p.chrome.runtime._fireMessage({ type: 'copy', errorMsg: 'No tabs found' });
  await p.flush();

  assert.equal(toast(p), 'Error: No tabs found');
  assert.equal(p.clipboard._state.writes.length, 0);
  assert.deepEqual(p.clipboard._state.writeTexts, []);
  assert.equal(p.resolve('copiedContent').value, '', 'textarea left alone');
});

test('paste results render success, capped and error toasts', async () => {
  const p = await loadPopup();

  p.chrome.runtime._fireMessage({ type: 'paste', success: true, urlCount: 4 });
  await p.flush();
  assert.equal(toast(p), '4 URLs opened successfully!');

  p.chrome.runtime._fireMessage({ type: 'paste', success: true, urlCount: 50, capped: true });
  await p.flush();
  assert.equal(toast(p), 'Opened 50 URLs (limit reached — the rest were skipped).');

  p.chrome.runtime._fireMessage({ type: 'paste', success: false, errorMsg: 'No URL found' });
  await p.flush();
  assert.equal(toast(p), 'Error: No URL found');

  p.chrome.runtime._fireMessage({ type: 'paste', success: false, error: 'boom' });
  await p.flush();
  assert.equal(toast(p), 'Error: boom');
});

test('a toast clears itself after its timeout', async () => {
  const p = await loadPopup();

  p.chrome.runtime._fireMessage({ type: 'paste', success: true, urlCount: 1 });
  await p.flush();
  assert.notEqual(toast(p), '');

  await p.flushTimers(3300);

  assert.equal(toast(p), '');
});

// ---------------------------------------------------------------------------
// History panel
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

function entry(overrides = {}) {
  return {
    id: overrides.id || `id-${Math.random().toString(36).slice(2)}`,
    ts: overrides.ts !== undefined ? overrides.ts : Date.now(),
    count: overrides.count !== undefined ? overrides.count : 3,
    format: overrides.format || 'url_only',
    content: overrides.content || 'https://a.example',
    truncated: overrides.truncated || false
  };
}

const dayHeaders = (p) =>
  [...p.document.querySelectorAll('#historyList .history-day')].map((el) => el.textContent);
const rows = (p) => [...p.document.querySelectorAll('#historyList .history-entry')];

test('#historyButton opens the panel and renders entries', async () => {
  const p = await loadPopup({
    local: { copyHistory: [entry({ id: 'a', count: 3, format: 'json' })] }
  });
  assert.equal(p.isHidden('historyPanel'), true);

  await p.click('historyButton');

  assert.equal(p.isHidden('historyPanel'), false);
  assert.equal(p.resolve('historyButton').getAttribute('aria-expanded'), 'true');
  assert.equal(rows(p).length, 1);
  assert.match(rows(p)[0].textContent, /3 tabs/);
  assert.match(rows(p)[0].textContent, /JSON/);
  assert.equal(p.isHidden('clearHistoryButton'), false);
});

test('closing the history panel clears the rendered list', async () => {
  const p = await loadPopup({ local: { copyHistory: [entry()] } });

  await p.click('historyButton');
  assert.equal(rows(p).length, 1);

  await p.click('historyButton');

  assert.equal(p.isHidden('historyPanel'), true);
  assert.equal(p.resolve('historyButton').getAttribute('aria-expanded'), 'false');
  assert.equal(p.text('historyList'), '', 'list torn down so a long history costs nothing idle');
});

test('history is grouped into Today / Yesterday / an explicit date', async () => {
  const now = Date.now();
  const older = now - 5 * DAY;
  const p = await loadPopup({
    local: {
      copyHistory: [
        entry({ id: 'today-1', ts: now }),
        entry({ id: 'today-2', ts: now - 1000 }),
        entry({ id: 'yesterday', ts: now - DAY }),
        entry({ id: 'older', ts: older })
      ]
    }
  });

  await p.click('historyButton');

  const expectedOlder = new Date(older).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  assert.deepEqual(dayHeaders(p), ['Today', 'Yesterday', expectedOlder]);
  assert.equal(rows(p).length, 4, 'two same-day entries share one header');
});

test('history pluralises "1 tab" vs "N tabs"', async () => {
  const p = await loadPopup({
    local: {
      copyHistory: [
        entry({ id: 'one', count: 1 }),
        entry({ id: 'many', count: 12 })
      ]
    }
  });

  await p.click('historyButton');

  // The count lives in its own span; textContent of the row runs the spans
  // together, so assert on the span itself rather than a fuzzy substring.
  const countOf = (row) => row.children[0].children[1].textContent;
  assert.equal(countOf(rows(p)[0]), '1 tab');
  assert.equal(countOf(rows(p)[1]), '12 tabs');
});

test('loading a history entry fills the textarea and writes the clipboard', async () => {
  const content = 'https://one.example\nhttps://two.example';
  const p = await loadPopup({
    local: { copyHistory: [entry({ id: 'a', count: 2, content })] }
  });

  await p.click('historyButton');
  await p.click(rows(p)[0].children[0]);

  assert.equal(p.resolve('copiedContent').value, content);
  assert.deepEqual(p.clipboard._state.writeTexts, [content]);
  assert.equal(toast(p), 'Restored 2 URLs to clipboard!');
});

test('loading a truncated entry says so', async () => {
  const p = await loadPopup({
    local: { copyHistory: [entry({ id: 'a', count: 400, truncated: true })] }
  });

  await p.click('historyButton');
  await p.click(rows(p)[0].children[0]);

  assert.equal(toast(p), 'Restored 400 tabs (list was truncated when saved)');
});

test('a failed clipboard write on load is reported as partial success', async () => {
  const p = await loadPopup({ local: { copyHistory: [entry({ id: 'a', content: 'x' })] } });
  p.clipboard._state.failWriteText = true;

  await p.click('historyButton');
  await p.click(rows(p)[0].children[0]);

  assert.equal(p.resolve('copiedContent').value, 'x', 'textarea still filled');
  assert.equal(toast(p), 'Loaded into textarea, but clipboard write failed');
});

test('deleting a history entry removes only that one and re-renders', async () => {
  const p = await loadPopup({
    local: {
      copyHistory: [
        entry({ id: 'keep-1', content: 'one' }),
        entry({ id: 'drop', content: 'two' }),
        entry({ id: 'keep-2', content: 'three' })
      ]
    }
  });

  await p.click('historyButton');
  assert.equal(rows(p).length, 3);

  await p.click(rows(p)[1].children[1]); // the × on the middle row

  assert.deepEqual(
    p.chrome.storage.local._data.copyHistory.map((e) => e.id),
    ['keep-1', 'keep-2'],
    'only the clicked entry was removed from storage'
  );
  assert.equal(rows(p).length, 2, 'the panel re-rendered');
});

test('#clearHistoryButton empties the history', async () => {
  const p = await loadPopup({
    local: { copyHistory: [entry({ id: 'a' }), entry({ id: 'b' })] }
  });

  await p.click('historyButton');
  await p.click('clearHistoryButton');

  assert.equal(p.chrome.storage.local._data.copyHistory, undefined, 'storage key removed');
  assert.equal(rows(p).length, 0);
  assert.match(p.text('historyList'), /No copies yet/);
  assert.equal(toast(p), 'History cleared');
});

test('an empty history shows the placeholder and hides "Clear all"', async () => {
  const p = await loadPopup();

  await p.click('historyButton');

  assert.equal(p.isHidden('historyPanel'), false);
  assert.equal(rows(p).length, 0);
  assert.match(p.text('historyList'), /No copies yet\. Copy some URLs to see them here\./);
  assert.equal(p.isHidden('clearHistoryButton'), true);
});

test('an open history panel refreshes when a copy result arrives', async () => {
  const p = await loadPopup({ local: { copyHistory: [entry({ id: 'a' })] } });

  await p.click('historyButton');
  assert.equal(rows(p).length, 1);

  // The background records history before messaging the popup.
  p.chrome.storage.local._data.copyHistory = [entry({ id: 'b' }), entry({ id: 'a' })];
  p.chrome.runtime._fireMessage({ type: 'copy', content: 'x', copied_url: 1 });
  await p.flush();

  assert.equal(rows(p).length, 2, 'panel re-rendered with the new entry');
});

// ---------------------------------------------------------------------------
// Options button
// ---------------------------------------------------------------------------

test('#optionsButton opens the options page', async () => {
  const p = await loadPopup();

  await p.click('optionsButton');

  assert.equal(p.chrome._optionsPageOpened.count, 1);
});
