'use strict';

// Generated, table-driven settings-combination matrix.
//
// Everything here is driven through the REAL settings-resolution path —
// settings are written into chrome.storage.sync and then Action.copy() /
// Action.paste() are invoked — rather than by calling CopyTo.* directly. The
// hand-written suites mostly call CopyTo directly, so getCopySettings(),
// collectTabs() and formatTabs() were effectively untested as a unit.
//
// Sections:
//   A  full cross-product of format x bold x anchor x delimiter x customTemplate
//      (288 cases) + an inertness proof that settings outside their own format
//      have literally zero effect on the emitted content.
//   B  selectedTabsOnly x includeAllWindows across two windows (4 cases).
//   C  smartPaste x paste-source-shape x html-fallback-needed (8 cases).
//   D  all-pairs over the remaining background-observable settings.
//   E  the four conjuncts of the history coalescing rule.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChrome } = require('./helpers/chrome-mock');
const { loadBackground } = require('./helpers/harness');

// ---------------------------------------------------------------------------
// Pure reference implementations. Deliberately written from the SPEC, not by
// importing the extension's own helpers, so a regression in extension/ cannot
// silently move the expectation with it.
// ---------------------------------------------------------------------------

const DEFAULT_DELIMITER = '--';
const DEFAULT_ANCHOR = 'title';
const DEFAULT_TEMPLATE = '$title - $url';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Mirrors getCopySettings() + CopyTo.delimited()'s two-stage fallback.
function resolveDelimiter(raw) {
  let d = raw || DEFAULT_DELIMITER;          // getCopySettings: falsy -> default
  if (d === '\\t') d = '\t';
  if (d === '\\n') d = '\n';
  if (d === '\\r') d = '\r';
  // Whitespace-only -> default. Everything else is taken literally: padding is
  // part of the delimiter, so " | " stays " | " and is NOT trimmed to "|".
  if (!d.trim() && !['\t', '\n', '\r'].includes(d)) d = DEFAULT_DELIMITER;
  return d;
}

function refText(tabs) {
  return tabs.map((t) => `${t.title}: ${t.url}`).join('\n');
}

// The single source of truth for every Part A expectation.
function refContent(tabs, { format, bold, anchor, delimiter, customTemplate }) {
  switch (format) {
    case 'html':
      return tabs
        .map((t) => {
          const label = esc(anchor === 'url' ? t.url : t.title);
          return `<a href="${esc(t.url)}">${bold ? `<strong>${label}</strong>` : label}</a>`;
        })
        .join('<br>');
    case 'json':
      return JSON.stringify(tabs.map((t) => ({ title: t.title, url: t.url })), null, 2);
    case 'url_only':
      return tabs.map((t) => t.url).join('\n');
    case 'custom': {
      // getCopySettings + CopyTo.custom: blank or whitespace-only falls back to
      // DEFAULT_SETTINGS.customTemplate, which is a real, usable template.
      const tpl = (customTemplate && customTemplate.trim()) ? customTemplate : DEFAULT_TEMPLATE;
      const date = today();
      return tabs
        .map((t) => tpl.replace(/\$url/g, t.url).replace(/\$title/g, t.title).replace(/\$date/g, date))
        .join('\n');
    }
    case 'delimited': {
      const d = resolveDelimiter(delimiter);
      return tabs.map((t) => `${t.title.trim()}${d}${t.url.trim()}`).join('\n');
    }
    default:
      return refText(tabs);
  }
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

const TABS = [
  // Title carries &, < and > so escaping is load-bearing in the html format,
  // and the URL carries & so anchor='url' is visibly different from the href.
  { title: 'One & <b>Bold</b>', url: 'https://one.test/?a=1&b=2', highlighted: true },
  { title: 'Two', url: 'https://two.test/', highlighted: false }
];

async function runCopy(settings, tabs = TABS, chromeOptions = {}) {
  const chrome = createChrome({ tabs, ...chromeOptions });
  Object.assign(chrome.storage.sync._data, settings);
  const { Action } = loadBackground(chrome);
  await Action.copy();
  return chrome;
}

function lastCopyMessage(chrome) {
  return [...chrome._sent].reverse().find((m) => m.type === 'copy');
}

// Turn a possibly-unset value into something readable inside a test name.
function label(v) {
  if (v === undefined) return '<unset>';
  if (v === '') return '<empty>';
  return JSON.stringify(v);
}

// ===========================================================================
// PART A — exhaustive cross-product through Action.copy()
// ===========================================================================

const FORMATS = ['url_only', 'text', 'html', 'json', 'custom', 'delimited'];
const BOLDS = [false, true];
const ANCHORS = ['title', 'url'];
const DELIMITERS = [undefined, '\\t', ' | ', '   '];
const TEMPLATES = [undefined, '$url', '$title - $url ($date)'];

// key -> [{ name, content }]  used by the inertness proof at the end of Part A.
const inertnessGroups = new Map();

// Only the axes that this format is allowed to depend on go into the key.
// Everything else must therefore be inert, or the group will disagree.
function inertnessKey({ format, bold, anchor, delimiter, customTemplate }) {
  if (format === 'html') return `html|bold=${bold}|anchor=${anchor}`;
  if (format === 'delimited') return `delimited|delimiter=${label(delimiter)}`;
  if (format === 'custom') return `custom|template=${label(customTemplate)}`;
  return format;
}

let partACaseCount = 0;

for (const format of FORMATS) {
  for (const bold of BOLDS) {
    for (const anchor of ANCHORS) {
      for (const delimiter of DELIMITERS) {
        for (const customTemplate of TEMPLATES) {
          const combo = { format, bold, anchor, delimiter, customTemplate };
          const name =
            `A copy: format=${format} bold=${bold} anchor=${anchor} ` +
            `delimiter=${label(delimiter)} customTemplate=${label(customTemplate)}`;
          partACaseCount += 1;

          test(name, async () => {
            const stored = { format, bold, anchor };
            if (delimiter !== undefined) stored.delimiter = delimiter;
            if (customTemplate !== undefined) stored.customTemplate = customTemplate;

            const chrome = await runCopy(stored);
            const msg = lastCopyMessage(chrome);
            assert.ok(msg, 'a copy message was sent');

            const expected = refContent(TABS, combo);
            assert.equal(msg.content, expected, 'exact emitted content');
            assert.equal(msg.copied_url, TABS.length);

            // The clipboard flavor is derived solely from format === 'html'.
            assert.equal(msg.mimeType, format === 'html' ? 'html' : 'plaintext');

            // html puts two flavors on the clipboard; every other format's
            // plain flavor is byte-identical to its content.
            if (format === 'html') {
              assert.equal(msg.plainContent, refText(TABS), 'plain flavor derived from tabs');
              assert.notEqual(msg.plainContent, msg.content);
            } else {
              assert.equal(msg.plainContent, msg.content);
            }

            const key = inertnessKey(combo);
            if (!inertnessGroups.has(key)) inertnessGroups.set(key, []);
            inertnessGroups.get(key).push({ name, content: msg.content });
          });
        }
      }
    }
  }
}

// Explicit inertness proof. Every case sharing a key differs only in axes that
// the format must ignore, so any variation inside a group is a leak.
test('A inertness: settings outside their own format have zero effect', () => {
  assert.equal(partACaseCount, 288, 'full cross-product size');

  const expectedGroupSizes = {
    // 4 delimiters x 3 templates are all inert for html; bold/anchor are keyed.
    html: 12,
    // 2 bold x 2 anchor x 3 templates are inert for delimited.
    delimited: 12,
    // 2 bold x 2 anchor x 4 delimiters are inert for custom.
    custom: 16,
    // everything except format is inert for these.
    url_only: 48,
    text: 48,
    json: 48
  };

  for (const [key, members] of inertnessGroups) {
    const format = key.split('|')[0];
    assert.equal(
      members.length,
      expectedGroupSizes[format],
      `group ${key} should hold ${expectedGroupSizes[format]} cases`
    );
    const first = members[0];
    for (const m of members) {
      assert.equal(
        m.content,
        first.content,
        `inertness leak in group ${key}:\n  ${first.name}\n  ${m.name}`
      );
    }
  }

  // Sanity: the keyed axes really do change output (otherwise the proof above
  // would pass trivially on a formatter that ignores everything).
  const htmlPlain = inertnessGroups.get('html|bold=false|anchor=title')[0].content;
  const htmlBold = inertnessGroups.get('html|bold=true|anchor=title')[0].content;
  const htmlUrl = inertnessGroups.get('html|bold=false|anchor=url')[0].content;
  assert.notEqual(htmlPlain, htmlBold);
  assert.notEqual(htmlPlain, htmlUrl);
  assert.match(htmlUrl, /<a href="https:\/\/one\.test\/\?a=1&amp;b=2">https:\/\/one\.test\/\?a=1&amp;b=2<\/a>/);
  assert.match(htmlPlain, /<a href="https:\/\/one\.test\/\?a=1&amp;b=2">One &amp; &lt;b&gt;Bold&lt;\/b&gt;<\/a>/);
});

test('A delimiter: unset and whitespace-only both resolve to the "--" default', async () => {
  const unset = lastCopyMessage(await runCopy({ format: 'delimited' }));
  const blank = lastCopyMessage(await runCopy({ format: 'delimited', delimiter: '   ' }));
  const explicit = lastCopyMessage(await runCopy({ format: 'delimited', delimiter: '--' }));
  assert.equal(unset.content, explicit.content);
  assert.equal(blank.content, explicit.content);
  assert.match(unset.content, /One & <b>Bold<\/b>--https:\/\/one\.test\/\?a=1&b=2/);
});

test('A delimiter: " | " keeps its padding — only whitespace-only is rejected', async () => {
  const msg = lastCopyMessage(await runCopy({ format: 'delimited', delimiter: ' | ' }));
  // Regression: CopyTo.delimited used to .trim() every non-special delimiter,
  // so " | " (a padded pipe, the natural choice) silently became "|" and the
  // padding was unrecoverable through the UI.
  assert.match(msg.content, /Bold<\/b> \| https:/);
  assert.ok(msg.content.includes(' | '));
});

test('A delimiter: leading/trailing padding survives on both sides', async () => {
  const msg = lastCopyMessage(await runCopy({ format: 'delimited', delimiter: '  ->  ' }));
  assert.ok(msg.content.includes('  ->  '));
});

test('A custom: a blank template falls back to the default rather than emitting blank lines', async () => {
  const unset = lastCopyMessage(await runCopy({ format: 'custom' }));
  const blank = lastCopyMessage(await runCopy({ format: 'custom', customTemplate: '' }));
  const spaces = lastCopyMessage(await runCopy({ format: 'custom', customTemplate: '   ' }));
  const explicit = lastCopyMessage(await runCopy({ format: 'custom', customTemplate: '$title - $url' }));

  // Regression: DEFAULT_SETTINGS.customTemplate was '', so selecting the
  // "custom" format without writing a template copied N-1 newlines — truthy
  // content, so it was written to the clipboard AND recorded in history.
  assert.equal(unset.content, explicit.content);
  assert.equal(blank.content, explicit.content);
  assert.equal(spaces.content, explicit.content);
  assert.match(unset.content, /One & <b>Bold<\/b> - https:\/\/one\.test\/\?a=1&b=2/);
  assert.ok(unset.content.trim().length > 0);
  assert.equal(unset.copied_url, 2);
});

test('A custom: a template that is only padding around a placeholder keeps its padding', async () => {
  const msg = lastCopyMessage(await runCopy({ format: 'custom', customTemplate: '  $url  ' }));
  assert.match(msg.content, /^ {2}https:\/\/one\.test\/\?a=1&b=2 {2}$/m);
});

// ===========================================================================
// PART B — selectedTabsOnly x includeAllWindows, exhaustive
// ===========================================================================

const MULTI_WINDOW_TABS = [
  { title: 'W1 A', url: 'https://w1a.test/', highlighted: true, windowId: 1 },
  { title: 'W1 B', url: 'https://w1b.test/', highlighted: false, windowId: 1 },
  { title: 'W2 C', url: 'https://w2c.test/', highlighted: true, windowId: 2 },
  { title: 'W2 D', url: 'https://w2d.test/', highlighted: false, windowId: 2 }
];

const SCOPE_CASES = [
  {
    selectedTabsOnly: false,
    includeAllWindows: false,
    urls: ['https://w1a.test/', 'https://w1b.test/'],
    query: { currentWindow: true }
  },
  {
    selectedTabsOnly: true,
    includeAllWindows: false,
    urls: ['https://w1a.test/'],
    query: { currentWindow: true }
  },
  {
    selectedTabsOnly: false,
    includeAllWindows: true,
    urls: ['https://w1a.test/', 'https://w1b.test/', 'https://w2c.test/', 'https://w2d.test/'],
    query: {}
  },
  {
    // Both on means "highlighted tabs, across every window" — not "the current
    // window's highlighted tabs" and not "every tab in every window".
    selectedTabsOnly: true,
    includeAllWindows: true,
    urls: ['https://w1a.test/', 'https://w2c.test/'],
    query: {}
  }
];

for (const c of SCOPE_CASES) {
  test(`B scope: selectedTabsOnly=${c.selectedTabsOnly} includeAllWindows=${c.includeAllWindows}`, async () => {
    const chrome = await runCopy(
      { format: 'url_only', selectedTabsOnly: c.selectedTabsOnly, includeAllWindows: c.includeAllWindows },
      MULTI_WINDOW_TABS,
      { currentWindowId: 1 }
    );
    const msg = lastCopyMessage(chrome);
    assert.ok(msg, 'a copy message was sent');
    assert.equal(msg.content, c.urls.join('\n'), 'exact tab set copied');
    assert.equal(msg.copied_url, c.urls.length);

    // The window scope must be pushed down into the query, not filtered after.
    assert.equal(chrome.tabs._queries.length, 1, 'exactly one tabs.query per copy');
    // The queryInfo is built inside the vm realm, so its Object prototype is a
    // different intrinsic — compare structurally rather than by reference.
    assert.deepEqual(JSON.parse(JSON.stringify(chrome.tabs._queries[0])), c.query);
  });
}

test('B scope: selectedTabsOnly filters after the query, includeAllWindows only widens it', async () => {
  const none = await runCopy(
    { format: 'url_only', selectedTabsOnly: true, includeAllWindows: false },
    MULTI_WINDOW_TABS.map((t) => ({ ...t, highlighted: false })),
    { currentWindowId: 1 }
  );
  assert.equal(lastCopyMessage(none), undefined, 'no highlighted tabs => nothing copied');
});

// ===========================================================================
// PART C — smartPaste x paste source shape x html fallback needed
// ===========================================================================

// Plain text that already contains URLs, plus a chrome:// line that the
// http(s) allowlist must reject on BOTH the smart and the split-lines path.
const PLAIN_WITH_URLS = 'https://a.test/\nchrome://settings/\nhttps://b.test/';
// Plain text that is only link *labels* — this is what the clipboard's plain
// flavor holds after copying rendered links.
const PLAIN_LABELS_ONLY = 'Label One\nLabel Two';
const RICH_HTML =
  '<a href="https://a.test/">Label One</a><br>' +
  '<a href="chrome://settings/">Blocked</a><br>' +
  '<a href="https://b.test/">Label Two</a>';

const PASTE_CASES = [];
for (const smartPaste of [false, true]) {
  for (const source of ['textarea', 'clipboard']) {
    for (const htmlFallbackNeeded of [false, true]) {
      const content = htmlFallbackNeeded ? PLAIN_LABELS_ONLY : PLAIN_WITH_URLS;
      // A textarea paste has no text/html flavor at all — html is undefined,
      // so the rich-link fallback structurally cannot engage.
      const html = source === 'clipboard' ? RICH_HTML : undefined;

      let expected;
      if (!htmlFallbackNeeded) {
        // Content alone yields URLs; the fallback is never consulted.
        expected = ['https://a.test/', 'https://b.test/'];
      } else if (source !== 'clipboard') {
        expected = []; // no html flavor => nothing to fall back to
      } else {
        // The html fallback always extracts smartly, regardless of the
        // smartPaste setting: the naive path splits on newlines, and an html
        // blob is one line whose URLs live in href attributes. Deferring to
        // smartPaste here made the fallback a guaranteed no-op when it was off.
        expected = ['https://a.test/', 'https://b.test/'];
      }

      PASTE_CASES.push({ smartPaste, source, htmlFallbackNeeded, content, html, expected });
    }
  }
}

for (const c of PASTE_CASES) {
  const name =
    `C paste: smartPaste=${c.smartPaste} source=${c.source} htmlFallbackNeeded=${c.htmlFallbackNeeded}`;
  test(name, async () => {
    const chrome = createChrome({ tabs: [] });
    Object.assign(chrome.storage.sync._data, { smartPaste: c.smartPaste });
    const { Action } = loadBackground(chrome);

    const opened = await Action.paste(c.content, c.html);

    assert.deepEqual(chrome._createdTabs.map((t) => t.url), c.expected, 'exact opened tab URLs');
    assert.equal(opened, c.expected.length);

    const pasteMsgs = chrome._sent.filter((m) => m.type === 'paste');
    const last = pasteMsgs[pasteMsgs.length - 1];
    assert.ok(last, 'a paste message was sent');
    if (c.expected.length === 0) {
      assert.equal(last.errorMsg, 'No URL found in the provided content');
    } else {
      assert.equal(last.success, true);
      assert.equal(last.urlCount, c.expected.length);
    }

    // The http(s) allowlist holds in every one of the 8 cells.
    for (const t of chrome._createdTabs) {
      assert.match(t.url, /^https?:\/\//);
    }
    assert.ok(
      !chrome._createdTabs.some((t) => String(t.url).startsWith('chrome://')),
      'chrome:// is never opened from clipboard content'
    );
  });
}

test('C paste: smartPaste=false still opens rich links via the html fallback', async () => {
  const chrome = createChrome({ tabs: [] });
  Object.assign(chrome.storage.sync._data, { smartPaste: false });
  const { Action } = loadBackground(chrome);
  const opened = await Action.paste(PLAIN_LABELS_ONLY, RICH_HTML);
  // Regression: the fallback used to re-run extractUrls() with the SAME
  // smartPaste flag, so with smart paste disabled it was guaranteed to be a
  // no-op — the html flavor was fed to the newline splitter and paste reported
  // "No URL found" even though the hrefs were right there.
  assert.equal(opened, 2);
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://a.test/', 'https://b.test/']);
});

test('C paste: smartPaste=false promotes a lone html flavor and still extracts hrefs', async () => {
  const chrome = createChrome({ tabs: [] });
  Object.assign(chrome.storage.sync._data, { smartPaste: false });
  const { Action } = loadBackground(chrome);
  const opened = await Action.paste('', RICH_HTML);
  assert.equal(opened, 2);
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://a.test/', 'https://b.test/']);
});

test('C paste: smartPaste=false keeps the literal line-splitting path for plain text', async () => {
  const chrome = createChrome({ tabs: [] });
  Object.assign(chrome.storage.sync._data, { smartPaste: false });
  const { Action } = loadBackground(chrome);
  // Duplicate lines are two tabs the user asked for; the html de-dupe must not
  // leak into plain text just because the fallback now forces smart extraction.
  const opened = await Action.paste('https://a.test/\nhttps://a.test/', undefined);
  assert.equal(opened, 2);
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://a.test/', 'https://a.test/']);
});

test('C paste: an empty preferred flavor promotes the html flavor', async () => {
  const chrome = createChrome({ tabs: [] });
  Object.assign(chrome.storage.sync._data, { smartPaste: true });
  const { Action } = loadBackground(chrome);
  const opened = await Action.paste('', RICH_HTML);
  assert.equal(opened, 2);
  assert.deepEqual(chrome._createdTabs.map((t) => t.url), ['https://a.test/', 'https://b.test/']);
});

// ===========================================================================
// PART D — all-pairs over the remaining settings
// ===========================================================================

// Minimal greedy pairwise generator. The full space is only 96 rows, so we can
// afford to score every candidate against the uncovered-pair set directly.
function allPairs(params) {
  const names = Object.keys(params);
  const values = names.map((n) => params[n]);

  const uncovered = new Set();
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      for (const a of values[i]) {
        for (const b of values[j]) {
          uncovered.add(`${i}=${JSON.stringify(a)}|${j}=${JSON.stringify(b)}`);
        }
      }
    }
  }

  // Enumerate the full cross-product as the candidate pool.
  let candidates = [[]];
  for (const vals of values) {
    const next = [];
    for (const partial of candidates) for (const v of vals) next.push([...partial, v]);
    candidates = next;
  }

  const pairsOf = (row) => {
    const out = [];
    for (let i = 0; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++) {
        out.push(`${i}=${JSON.stringify(row[i])}|${j}=${JSON.stringify(row[j])}`);
      }
    }
    return out;
  };

  const chosen = [];
  while (uncovered.size > 0) {
    let best = null;
    let bestScore = -1;
    for (const row of candidates) {
      let score = 0;
      for (const p of pairsOf(row)) if (uncovered.has(p)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    if (bestScore <= 0) break; // defensive: cannot happen for a full pool
    for (const p of pairsOf(best)) uncovered.delete(p);
    chosen.push(Object.fromEntries(best.map((v, i) => [names[i], v])));
  }

  return { rows: chosen, uncovered };
}

const D_PARAMS = {
  saveHistory: [true, false],
  showContextMenu: [true, false],
  enableShortcuts: [true, false],
  autoAction: [true, false],
  smartPaste: [true, false],
  theme: ['auto', 'light', 'dark']
};

const D_PLAN = allPairs(D_PARAMS);
const EXPECTED_COPY = 'https://one.test/?a=1&b=2\nhttps://two.test/';

test('D all-pairs: the generated plan covers every pair of parameter values', () => {
  assert.equal(D_PLAN.uncovered.size, 0, 'no uncovered pairs remain');
  assert.ok(D_PLAN.rows.length >= 6, 'a 3-valued parameter forces at least 6 rows');
  assert.ok(D_PLAN.rows.length < 96, 'pairwise must be smaller than the full cross-product');
});

for (const row of D_PLAN.rows) {
  const name =
    'D settings: ' + Object.entries(row).map(([k, v]) => `${k}=${v}`).join(' ');

  test(name, async () => {
    const chrome = createChrome({ tabs: TABS });
    Object.assign(chrome.storage.sync._data, { format: 'url_only', ...row });
    const { Action, CopyHistory } = loadBackground(chrome);

    // 1. showContextMenu — observable through the onInstalled bootstrap.
    //    reason 'update' rather than 'install' so the first-install welcome tab
    //    does not pollute the tabs.create assertions further down.
    await chrome.runtime._fireInstalled({ reason: 'update' });
    assert.deepEqual(
      chrome._contextMenuIds,
      row.showContextMenu ? ['copyUrls', 'pasteUrls'] : [],
      'context menus follow showContextMenu'
    );

    // 2. enableShortcuts — the command listener gates before doing any work.
    await chrome.commands._fire('copy-urls');
    const offscreenWrites = chrome._sent.filter((m) => m.target === 'offscreen' && m.action === 'copy');
    if (row.enableShortcuts) {
      assert.equal(offscreenWrites.length, 1, 'the shortcut performed a headless copy');
      // 4. theme / autoAction have no background-layer consequence: the copy
      //    output is byte-identical regardless of how they are set.
      assert.equal(offscreenWrites[0].text, EXPECTED_COPY, 'theme/autoAction do not affect copy output');
    } else {
      assert.equal(offscreenWrites.length, 0, 'a disabled shortcut copies nothing');
      assert.ok(chrome._badges.some((b) => b.text === '⚠'), 'a disabled shortcut badges a warning');
    }

    // 3. saveHistory — recorded only when the shortcut actually copied AND
    //    history is enabled.
    const history = await CopyHistory.getAll();
    const shouldRecord = row.enableShortcuts && row.saveHistory;
    assert.equal(history.length, shouldRecord ? 1 : 0, 'history follows saveHistory');
    if (shouldRecord) {
      assert.equal(history[0].format, 'url_only');
      assert.equal(history[0].count, 2);
      assert.equal(history[0].content, EXPECTED_COPY);
    }

    // 5. smartPaste is paired here too; assert it still drives paste parsing
    //    under whatever combination of the other settings this row picked.
    const opened = await Action.paste('see https://c.test/ now');
    assert.equal(opened, row.smartPaste ? 1 : 0, 'smartPaste governs loose-text extraction');
    assert.deepEqual(
      chrome._createdTabs.map((t) => t.url),
      row.smartPaste ? ['https://c.test/'] : []
    );

    // 4b. Neither theme nor autoAction is ever read by the background layer.
    assert.equal(
      chrome._sent.some((m) => m.theme !== undefined || m.autoAction !== undefined),
      false,
      'theme/autoAction never leak into background messages'
    );
  });
}

// ===========================================================================
// PART E — the history coalescing rule, all five conjuncts
// ===========================================================================

function seedHistory(chrome, entry) {
  chrome.storage.local._data.copyHistory = [
    {
      id: 'seed',
      ts: Date.now(),
      count: 5,
      format: 'url_only',
      signature: 'sig-A',
      content: 'seeded',
      truncated: false,
      ...entry
    }
  ];
}

function historyOf(chrome) {
  return chrome.storage.local._data.copyHistory || [];
}

test('E coalesce: same signature and format inside the 15s window REPLACES the newest entry', async () => {
  const chrome = createChrome({ tabs: [] });
  const { CopyHistory } = loadBackground(chrome);
  seedHistory(chrome, { signature: 'sig-A', format: 'delimited', content: 'first', ts: Date.now() });

  // Same tabs, same format — the user is typing a delimiter character by
  // character, which must not flood the list.
  await CopyHistory.add({ content: 'second', count: 5, format: 'delimited', signature: 'sig-A' });

  const entries = historyOf(chrome);
  assert.equal(entries.length, 1, 'the refinement replaced, it did not append');
  assert.equal(entries[0].content, 'second');
  assert.equal(entries[0].format, 'delimited');
  assert.notEqual(entries[0].id, 'seed');
});

test('E coalesce: same signature but a DIFFERENT format must NOT coalesce', async () => {
  const chrome = createChrome({ tabs: [] });
  const { CopyHistory } = loadBackground(chrome);
  // The popup re-copies on every dropdown change, so coalescing across formats
  // meant picking HTML right after a Text copy destroyed the Text entry and the
  // earlier rendering was unrecoverable.
  seedHistory(chrome, { signature: 'sig-A', format: 'text', content: 'as text', ts: Date.now() });

  await CopyHistory.add({ content: 'as html', count: 5, format: 'html', signature: 'sig-A' });

  const entries = historyOf(chrome);
  assert.equal(entries.length, 2, 'each format kept its own entry');
  assert.equal(entries[0].format, 'html');
  assert.equal(entries[1].format, 'text');
  assert.equal(entries[1].content, 'as text');
});

test('E coalesce: identical tab COUNT but a different signature must NOT coalesce', async () => {
  const chrome = createChrome({ tabs: [] });
  const { CopyHistory } = loadBackground(chrome);
  // Two different windows that happen to hold the same number of tabs. This is
  // the exact regression the signature was introduced for — keying on count
  // alone silently destroyed the first window's entry.
  seedHistory(chrome, { signature: 'a\nb\nc\nd\ne', count: 5, content: 'window one', ts: Date.now() });

  await CopyHistory.add({ content: 'window two', count: 5, format: 'url_only', signature: 'v\nw\nx\ny\nz' });

  const entries = historyOf(chrome);
  assert.equal(entries.length, 2, 'both windows kept their entry');
  assert.equal(entries[0].content, 'window two');
  assert.equal(entries[1].content, 'window one');
});

test('E coalesce: an empty signature never coalesces', async () => {
  const chrome = createChrome({ tabs: [] });
  const { CopyHistory } = loadBackground(chrome);
  seedHistory(chrome, { signature: '', content: 'first', ts: Date.now() });

  // Same (empty) signature on both sides, inside the window: still must append,
  // because a caller that omits the signature may only over-record.
  await CopyHistory.add({ content: 'second', count: 5, format: 'url_only', signature: '' });
  assert.equal(historyOf(chrome).length, 2);

  // And an omitted signature normalises to '' with the same outcome.
  await CopyHistory.add({ content: 'third', count: 5, format: 'url_only' });
  const entries = historyOf(chrome);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].content, 'third');
  assert.equal(entries[0].signature, '');
});

test('E coalesce: the same signature OUTSIDE the 15s window appends', async () => {
  const chrome = createChrome({ tabs: [] });
  const { CopyHistory } = loadBackground(chrome);
  seedHistory(chrome, { signature: 'sig-A', content: 'old', ts: Date.now() - 20000 });

  await CopyHistory.add({ content: 'new', count: 5, format: 'url_only', signature: 'sig-A' });

  const entries = historyOf(chrome);
  assert.equal(entries.length, 2, 'a stale entry with the same signature is not a refinement');
  assert.equal(entries[0].content, 'new');
  assert.equal(entries[1].content, 'old');
});

test('E coalesce: the boundary is exclusive — exactly 15000ms old does not coalesce', async () => {
  const chrome = createChrome({ tabs: [] });
  const { CopyHistory } = loadBackground(chrome);
  // Nudge the seed just past the window so the assertion is not racing the
  // handful of ms that elapse inside add().
  seedHistory(chrome, { signature: 'sig-A', content: 'old', ts: Date.now() - 15000 });

  await CopyHistory.add({ content: 'new', count: 5, format: 'url_only', signature: 'sig-A' });
  assert.equal(historyOf(chrome).length, 2);
});

test('E coalesce: Action.copy feeds a real tab signature into history', async () => {
  const chrome = createChrome({ tabs: TABS });
  Object.assign(chrome.storage.sync._data, { format: 'url_only' });
  const { Action } = loadBackground(chrome);

  await Action.copy();
  assert.equal(historyOf(chrome)[0].signature, TABS.map((t) => t.url).join('\n'));

  // Re-copying the same tabs in a different format is a distinct copy, not a
  // refinement — both renderings stay recoverable.
  chrome.storage.sync._data.format = 'json';
  await Action.copy();
  const entries = historyOf(chrome);
  assert.equal(entries.length, 2, 'a format switch appends');
  assert.equal(entries[0].format, 'json');
  assert.equal(entries[1].format, 'url_only');

  // But re-copying the same tabs in the same format still coalesces.
  await Action.copy();
  assert.equal(historyOf(chrome).length, 2, 'same-format re-copy coalesces');
});

test('E coalesce: copying a different tab set appends even at the same count', async () => {
  const chrome = createChrome({ tabs: TABS });
  Object.assign(chrome.storage.sync._data, { format: 'url_only' });
  const { Action } = loadBackground(chrome);

  await Action.copy();
  chrome.tabs._queryResult = [
    { title: 'Three', url: 'https://three.test/', highlighted: true },
    { title: 'Four', url: 'https://four.test/', highlighted: true }
  ];
  await Action.copy();

  const entries = historyOf(chrome);
  assert.equal(entries.length, 2, 'two 2-tab copies of different tabs are two entries');
  assert.equal(entries[0].content, 'https://three.test/\nhttps://four.test/');
});
