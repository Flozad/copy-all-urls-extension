# Test suite — Umbrella / Copy All URLs

590 tests across 14 files, ~1s. Node's built-in test runner (`node --test`)
and `node:assert/strict`. No test framework, no assertion library, no mocking
library.

```bash
npm install       # required now — see below
npm test          # or: node --test 'test/**/*.test.js'
```

Requires Node 18+ (developed on 22).

## The one dependency

`npm install` is now required, where previously the suite ran on a bare
checkout. **jsdom is the single devDependency.** Everything else is still
Node's built-in test runner: the `chrome` API is a local mock, the clipboard is
a local fake, timers are virtual.

jsdom is pinned to `^24` deliberately: 25+ ship ESM-only transitive deps that
`require()` cannot load on Node < 22.12.

The four UI suites (`popup-ui`, `options-ui`, `welcome-ui`, `a11y-keyboard`)
need a real DOM.
`popup.js` and `options.js` are ~1600 lines of DOM code leaning on
`classList.toggle(name, force)`, change events bubbling from a radio to the
container that owns the listener, `dataset`, `DocumentFragment`,
`querySelectorAll` snapshots, and `stopPropagation` interacting with a
document-level outside-click handler. A hand-rolled DOM that got any one of
those subtly wrong would produce a green suite over a broken page — false
confidence, which is worse than the honest gap of no tests at all.

## The harnesses

### `helpers/harness.js` — background / utils, in a `vm` sandbox

Loads the **real** extension source into a `node:vm` context so tests exercise
shipping code, not a copy of it.

- `loadBackground(chrome)` — provides `importScripts` (which evaluates
  `utils/defaults.js` and `utils/history.js` in the same context), stubs the
  service-worker globals (`self`, `clients`), appends a footer hoisting the
  module-scoped `CopyTo` / `Action` consts onto `globalThis`, and returns
  `{ context, CopyTo, Action, CopyHistory, flushTimers }`.
- `loadHistory(chrome)` — just `utils/history.js`.
- `loadStorageUtil(chrome, { skipDefaults })` — runs `utils/defaults.js` first
  because `storage.js` throws without it (`skipDefaults` exists so that guard is
  itself testable), replaces `setTimeout` with an immediate microtask so the
  2^i×100ms retry backoff costs nothing, and captures `console` output so the
  error paths are assertable.

### `helpers/chrome-mock.js` — in-memory `chrome.*`

`createChrome(options)` returns a fresh instance per test; no state leaks. It
records outgoing `runtime.sendMessage` payloads (`_sent`), `tabs.create` args
(`_createdTabs`), full context-menu props (`_contextMenus`, plus a
`_contextMenuIds` getter), badges (`_badges`), and options-page opens.

- **`_fire*` listener drivers.** Every listener registry captures its handlers
  into an array *and* exposes a driver: `runtime._fireMessage(msg, sender)`,
  `runtime._fireInstalled(details)`, `contextMenus._fireClick(info, tab)`,
  `commands._fire(command, tab)`, `action._fireClick(tab)`. Tests drive the real
  chrome events rather than calling the functions those handlers delegate to —
  anything the extension registers must be reachable from a test, or the handler
  is untested by construction.
- **Inducible storage failures.** `syncFailure` / `localFailure` take
  `{ failures: N, failMode: 'lastError' | 'throw' }`. `failures` is a countdown,
  so a test can say "fail the first 2 attempts, then succeed" and reach the
  retry, fallback and give-up branches independently. A success clears
  `runtime.lastError` exactly as real Chrome does (scoped to the running
  callback) — without that, one induced failure would poison every later call
  and the fallback branches would be unreachable.
- **`_lastErrors`.** Because `lastError` is cleared again by the next successful
  call, every message raised is also appended to `_lastErrors`, so a test can
  assert "an error surfaced during this flow" without depending on it still
  being set when the flow finishes.
- **`tabCreateFailures`.** How many `tabs.create()` calls should reject, to
  exercise "one URL fails, the loop keeps going" in `Action.paste`.
- **windowId-aware `tabs.query`.** Records every `queryInfo` in `_queries`, and
  honours `currentWindow` by filtering on `windowId` against
  `_currentWindowId`, so `includeAllWindows` is actually observable. Tabs
  without a `windowId` count as current-window, keeping single-window fixtures
  working unchanged.
- `offscreen.hasDocument` / `createDocument` are configurable
  (`hasOffscreenDocument`, `offscreenCreateError`) so `ensureOffscreen`'s create
  path, its single-document race, and its error propagation are all reachable.

### `helpers/dom-harness.js` — real pages in jsdom

`loadPopup()` / `loadOptions()` / `loadWelcome()` read the **real**
`popup.html` / `options.html` / `welcome.html`, inject the globals, then
evaluate the actual `<script src>` files the HTML references, in document
order, via indirect `window.eval` so `const` declarations land in the page's
global scope exactly as a `<script>` tag's would (`storage.js` needs
`defaults.js`'s `DEFAULT_SETTINGS`). Then it fires `DOMContentLoaded` — once,
tracked, so listeners are never registered twice.

Injected:

- **The chrome mock, with deferred storage callbacks.** `chrome-mock.js`
  invokes callbacks synchronously; real Chrome never does. `popup.js` reads
  `pasteSource` at the top of its `DOMContentLoaded` handler in a callback that
  touches a `const` declared 200 lines below — synchronous is a TDZ
  `ReferenceError`, a browser is fine. The harness restores browser scheduling
  rather than let the page fail on an artifact of the mock. FIFO ordering is
  preserved; the promise-returning form used by `CopyHistory` is untouched.
- **A fake `navigator.clipboard`.** Records `write()` / `writeText()`, serves
  staged `read()` / `readText()` (`stageItems`, `stageText`), and has
  independent failure switches for all four. `read()` yields
  ClipboardItem-shaped objects (`types` + `getType` → Blob) because `popup.js`
  walks that exact shape. `Blob` is swapped for Node's — jsdom 24's predates
  `Blob.prototype.text()`, the only way to assert on the flavours handed to
  `ClipboardItem` — and `ClipboardItem` itself is provided, since jsdom has none.
- **Virtual timers.** `flushTimers(ms)` advances a clock, running due timers one
  at a time with a full microtask drain between each so promise chains (and
  timers they schedule, e.g. StorageUtil's backoff) are picked up in order. The
  500ms input debounces and the 3s/5s toast timeouts are instant and
  deterministic.

`beforeScripts(document, window)` lets a test mutate the DOM before any page
script runs, so the pages' own null-guards are reachable. The returned handle
exposes `click`, `setValue`, `check`, `select`, `pickRadio`, `resolve`,
`isHidden`, `text`, `flush`, `flushTimers`, plus `chrome`, `clipboard`,
`clipboardItems` and captured `console`.

## Per-file coverage

| File | Verifies |
| --- | --- |
| `formats.test.js` | The six `CopyTo` formatters directly: `url_only`, `text`, `html` (± bold, href round-trip, XSS guard), `json`, `custom` (`$url`/`$title`/`$date`, global replace), `delimited` (default fallback, `\t`/`\n`/`\r` escapes, whitespace-only fallback), single-tab and unicode titles. |
| `escaping.test.js` | HTML escaping as a security property: markup in titles, `&`/quotes in URLs, no href attribute break-out, `<strong>` still emitted under bold, and that an html copy sends an intact plain-text flavour alongside while non-html formats send `plainContent === content`. |
| `copy-action.test.js` | `Action.copy` end-to-end per format — message payload, `mimeType`, `selectedTabsOnly`, history recording, empty-tab no-op, `url_only` default — plus `Action.copyHeadless` writing via offscreen and badging empty. |
| `paste-action.test.js` | `Action.paste` URL extraction: rich-HTML anchors (the reported bug case), `&` in query strings, duplicate-line preservation vs. href/visible-text dedupe, trailing-punctuation and quote stripping, non-http(s) scheme filtering, smartPaste-off line splitting, the `MAX_PASTE_TABS` (50) cap, and empty/null content reported not thrown. |
| `rich-link-paste.test.js` | The html-flavour fallback specifically: used when plain text yields no URLs, skipped when plain text has URLs, used when plain text is empty, still enforcing the http(s) allowlist, and reporting an error when neither flavour has URLs. |
| `history.test.js` | `CopyHistory` add/getAll ordering, empty-content skip, `saveHistory` opt-out, `MAX_CONTENT_CHARS` truncation flag, `MAX_ENTRIES` cap, remove/clear, corrupted (non-array) storage tolerance. |
| `offscreen.test.js` | The clipboard bridge: read prefers plain text, falls back to HTML when plain is blank, returns empty on an empty clipboard, writes, and ignores messages not targeted at offscreen. |
| `listeners.test.js` | Every registered background listener, driven through the `_fire*` drivers: `onInstalled` seeding (missing keys only, never overwriting, no-op when complete, early return on `lastError`, welcome tab on first install only, menu init); `updateContextMenus` create/remove/no-duplicate; both context-menu items incl. empty/whitespace/throwing clipboard; both commands incl. the `enableShortcuts` gate and real opened-count badging; `onMessage` copy/paste/updateContextMenus/unknown; that no `action.onClicked` listener exists; badge text, colour and timeout semantics; `ensureOffscreen` (created once, concurrent calls, the single-document race swallowed, other errors propagated); and `Action.paste` surviving a rejecting `tabs.create`. |
| `storage-util.test.js` | `StorageUtil` in isolation: the missing-`defaults.js` guard, `setWithFallback` in all three call shapes with retry, sync→local fallback, both-fail return and the `retries` parameter; `getWithFallback` in string/array/object shapes across working, local-only and both-failed storage; `checkHealth` (both healthy, either broken, probe-key cleanup, unrelated data untouched, cleanup failure swallowed); `repair` success and both failure modes. |
| `popup-ui.test.js` | Behavioural — real `popup.html` + `popup.js` in jsdom. Copy button, format restore and advanced gating on open, all three dropdowns (open/close, mutual exclusion, outside click), paste source persistence, paste from textarea and from clipboard (both flavours, html promotion on empty plain, `read()`→`readText()` fallback, empty clipboard, total permission failure), the auto-copy toggle and copy-on-open in all three stored states, debounced delimiter/template inputs (blank rewrite, burst collapsing, re-copy), every branch of the `onMessage` receiver (ClipboardItem write, its `writeText` fallback, both failing, plain text, error), toasts, and the history panel (render, day grouping, pluralisation, load incl. truncated and failed-write, delete, clear, empty state, live refresh). |
| `options-ui.test.js` | Behavioural — real `options.html` + `options.js` in jsdom. Every control loads from storage and persists on change with its exact key and value; defaults on a fresh profile; the removed `#mime_type` control stays gone; debounced template/delimiter writes; context-menu rebuild messaging (and none when the save fails); history wipe on `saveHistory` opt-out; error toasts on failed writes; reset and repair (defaults restored, `copyHistory` + `pasteSource` preserved, nothing-to-preserve case); the storage health report healthy and broken, asserted to be built from real elements and never `innerHTML`; and shortcut rendering incl. "Not set". |
| `welcome-ui.test.js` | Behavioural — real `welcome.html` + `welcome.js`. `#openOptions` opens the options page exactly once per click; the page navigates nowhere on its own; shortcut labels default to the manifest's suggested keys and are replaced by `commands.getAll` (independently per command, "not set" for unbound); and every degradation path — `lastError`, a non-array result, `chrome.commands` absent entirely, present without `getAll`, and each driven element removed individually and all at once. |
| `a11y-keyboard.test.js` | Keyboard and ARIA behaviour against the real HTML/JS in jsdom — the paths a pointer never exercises. Popup format menu: starts closed with `aria-expanded=false` and six `role=menuitem`s, ArrowDown opens and focuses the first item, arrows rove and wrap both ways, Home/End jump to the ends, Escape closes and restores focus to the trigger, Tab closes without trapping, opening the source menu closes it and resets `aria-expanded`, choosing a format does the same. Options reset dialog: it is a labelled `role=dialog` with `aria-modal`/`aria-labelledby`/`aria-describedby`, opening focuses Cancel rather than the destructive action, Escape cancels and restores focus to the opener, Escape is inert while closed, Tab is trapped and wraps in both directions with the browser default prevented, and cancelling writes nothing. Plus both live regions (`#message_live_region`, `#message`) existing and polite before any message. |
| `dom-wiring.test.js` | Static wiring, catching the "button that does nothing" class of bug: every `getElementById` target in `popup.js` / `options.js` / `welcome.js` exists in its HTML; every format in the popup's JS map has a `data-format` button; every `data-source` is understood by the code; core action buttons exist; every settings control `options.js` references exists in `options.html`; the command names `welcome.js` labels are the ones the manifest declares; every manifest command is handled in `background.js`; every referenced `<script src>` exists on disk. |
| `combinations.test.js` | The generated settings matrix — see below. |

## What is covered, by layer

- **Background listeners** — every listener the extension registers is driven
  through the mock's `_fire*` drivers, not called directly (`listeners.test.js`,
  and the D rows of `combinations.test.js` for the settings that gate them).
- **Formatters** — all six formats, directly (`formats.test.js`), through
  `Action.copy`'s real settings-resolution path (`combinations.test.js` Part A),
  and as an escaping/XSS property (`escaping.test.js`).
- **Paste / URL extraction** — both flavours, the fallback between them, the
  smartPaste split, the http(s) allowlist, dedupe, the 50-tab cap and the error
  paths (`paste-action`, `rich-link-paste`, `combinations` Part C).
- **History**, including **coalescing** — add/cap/truncate/remove/clear
  plus the HTML plain-text flavour it carries for restore (`history.test.js`),
  plus the five conjuncts of the coalescing rule in `combinations.test.js`
  Part E: same signature *and* format inside the 15s window replaces the newest
  entry; a format switch on the same tabs does not; an identical tab *count*
  with a different signature does not; an empty signature never coalesces;
  outside the window it appends; the boundary is exclusive at exactly 15000ms;
  and `Action.copy` feeds a real tab signature in.
- **Storage util** — retry, sync→local fallback, both-failed defaults, health
  check and repair (`storage-util.test.js`).
- **Popup UI**, **options UI**, **welcome UI** — the real HTML and the real
  scripts, asserted on behaviour rather than on internals. Every format radio,
  anchor radio, toggle and theme option is covered individually, as is the
  advanced-block gating for each of the six formats.
- **Keyboard and ARIA** — menu roving/wrap/Home/End/Escape/Tab, the reset
  dialog's focus trap and focus restoration, `aria-expanded` tracking the
  visible state, and the live regions (`a11y-keyboard.test.js`).
- **The combination matrix** (`combinations.test.js`) — everything here is
  driven through the real settings-resolution path (settings written into
  `chrome.storage.sync`, then `Action.copy()` / `Action.paste()` invoked), so
  `getCopySettings()`, `collectTabs()` and `formatTabs()` are exercised as a
  unit rather than bypassed. Expectations come from reference implementations
  written from the spec, deliberately *not* by importing the extension's own
  helpers, so a regression cannot silently move the expectation with it. The
  strategy is exhaustive where the interactions are real and all-pairs where
  they are not:
  - **Part A, exhaustive (288 cases):** `format` × `bold` × `anchor` ×
    `delimiter` × `customTemplate` (6 × 2 × 2 × 4 × 3), plus an *inertness
    proof* — cases are grouped by the axes a format is allowed to depend on, and
    every member of a group must produce byte-identical content, so a setting
    leaking into a format it does not own fails the group.
  - **Part B, exhaustive (4 cases):** `selectedTabsOnly` × `includeAllWindows`
    over two windows, asserting both the opened URLs and the `queryInfo` used.
  - **Part C, exhaustive (8 cases):** `smartPaste` × paste source shape
    (textarea/clipboard) × whether the html fallback is needed.
  - **Part D, all-pairs:** the remaining background-observable settings
    (`saveHistory`, `showContextMenu`, `enableShortcuts`, `autoAction`,
    `smartPaste`, `theme`) — 96 full combinations reduced by a greedy pairwise
    generator, with a meta-test asserting the generated plan leaves zero
    uncovered pairs and is genuinely smaller than the cross-product.

## Known issues pinned by tests, not yet fixed

Found during the audit and deliberately *pinned* — each has a test that asserts
the current (wrong) behaviour with a `// BUG:` comment, so the behaviour cannot
change silently and the fix is a one-line test edit away. `grep -rn 'BUG:' test/`
lists them.

1. **`getWithFallback` spreads array indices** —
   `extension/utils/storage.js:111` (and the identical line 119) branch on
   `typeof keys === 'object'`, which is also true for an array. An array of key
   names therefore takes the object branch and is spread positionally.
   *Impact:* when both storages fail, a caller passing `['format', 'theme']`
   receives the entire `DEFAULT_SETTINGS` object plus junk numeric keys
   `{ '0': 'format', '1': 'theme' }`, with no guarantee the requested keys carry
   sensible values.
   Pinned by `storage-util.test.js:155`.

2. **`CopyTo.delimited` trims non-special delimiters** —
   `extension/background.js:234` unconditionally `.trim()`s any delimiter that
   is not `\t`, `\n` or `\r`.
   *Impact:* a user who configures `" | "` — a padded pipe, the natural choice —
   silently gets `"|"`. The padding is unrecoverable through the UI.
   Pinned by `combinations.test.js:248`.

3. **Empty `customTemplate` copies blank lines** — `DEFAULT_SETTINGS.customTemplate`
   is `''` (`extension/utils/defaults.js:17`) and nothing guards against it.
   *Impact:* selecting the `custom` format without writing a template copies
   N−1 newlines. That is truthy content, so it is written to the clipboard *and*
   recorded in history as a successful N-tab copy.
   Pinned by `combinations.test.js:257`.

4. **The rich-link HTML fallback is a no-op when smartPaste is off** —
   `extension/background.js:506` re-runs `extractUrls(htmlFallback, smartPaste)`
   with the *same* flag that already failed on the plain flavour.
   *Impact:* with smart paste disabled, the html blob is handed to the newline
   splitter as a single line, so pasting rendered links reports "No URL found"
   even though the hrefs are right there. The fallback can never fire in that
   configuration.
   Pinned by `combinations.test.js:415`.

## Bugs fixed during this pass

Each is now guarded by a named test.

1. **Auto-copy default disagreed between popup and options.** `options.js` read
   `autoAction !== false` while `popup.js` read `autoAction === true`, so a
   fresh profile showed the toggle ON in options and OFF in the popup for the
   same absent value. Both now read `=== true`.
   *Guarded by* `options-ui.test.js` "a fresh profile shows every
   DEFAULT_SETTINGS value" and `popup-ui.test.js` "an absent autoAction does not
   copy on popup open".
2. **Three-way delimiter default conflict.** The popup, the options page and
   `CopyTo.delimited` each had their own idea of the default. All three now
   resolve through `DEFAULT_SETTINGS.delimiter` (`'--'`).
   *Guarded by* `combinations.test.js` "A delimiter: unset and whitespace-only
   both resolve to the '--' default" and `formats.test.js` "delimited: an unset
   delimiter falls back to DEFAULT_SETTINGS.delimiter".
3. **`anchor` was a dead setting.** It was stored and surfaced in the UI but
   read by nobody. `CopyTo.html` now consumes it to choose the visible link
   text, and the default was changed `'url'` → `'title'` because `'title'` is
   what `CopyTo.html` has always emitted — leaving it at `'url'` would have
   silently changed the output for every existing user.
   *Guarded by* `combinations.test.js` Part A (the full `anchor` axis) and its
   inertness proof, plus the `options-ui.test.js` "anchor radio ... persists"
   pair.
4. **`mime` / `mimeType` were dead settings.** Nothing read them — the clipboard
   flavour is derived solely from `format === 'html'` — and the stored default
   `'text/plain'` matched no `<option>` value, so the options select rendered
   blank. Removed rather than wired up; leftover keys in existing profiles are
   harmless.
   *Guarded by* `options-ui.test.js` "the #mime_type control is gone along with
   the setting".
5. **`options.js` built the storage health report with `innerHTML`.** The error
   strings come from `chrome.runtime.lastError.message`, which is not ours to
   trust as markup. Rebuilt with `createElement` / `textContent`.
   *Guarded by* `options-ui.test.js` "the health report is built from real
   elements, never innerHTML".
6. **Reset and Repair destroyed copy history and the paste-source preference.**
   Both are user *data* living in `chrome.storage.local` and absent from
   `DEFAULT_SETTINGS`, so a blanket `local.clear()` erased them with nothing
   able to put them back. Both flows now snapshot and restore
   `PRESERVED_LOCAL_KEYS`.
   *Guarded by* `options-ui.test.js` "#confirm_reset restores every default and
   preserves copy history + paste source", its nothing-to-preserve companion,
   and "#repair_storage restores defaults and preserves copy history + paste
   source".

Also fixed earlier and still guarded: rich-link paste failing with "No URL
found" (`Action.paste` stripped `<a href>` before extracting, so hrefs were
discarded — `rich-link-paste.test.js`, `paste-action.test.js`), and the options
footer year element that `options.js` set but `options.html` never contained
(`dom-wiring.test.js`).

## Manual QA checklist

Load the unpacked `extension/` folder via `chrome://extensions` (Developer mode).
This list is deliberately short: it covers only what genuinely cannot be
exercised headlessly. Everything previously listed here that is now automated
has been removed — format switching, delimiter/template live updates, textarea
and clipboard paste, the history panel, the auto-copy toggle, per-control
options persistence, and keyboard navigation of the menus and reset dialog are
all covered by `popup-ui.test.js`, `options-ui.test.js`, `a11y-keyboard.test.js`
and `combinations.test.js`, and do not need manual checking.

- [ ] **Real clipboard flavours across applications.** The suite asserts which
      `ClipboardItem` flavours are constructed; it cannot assert what a
      receiving app does with them. Copy in `html` format and paste into Google
      Docs, Google Sheets and Excel — the `text/html` flavour should produce
      live links, and the `text/plain` flavour should be intact where the target
      takes plain text only.
- [ ] **Real OS keyboard shortcuts.** The command *handlers* are tested; the
      OS-level key binding is not. Verify ⌘⇧U / ⌘⇧Y actually fire, including
      after remapping them at `chrome://extensions/shortcuts`, and that the
      badge feedback appears.
- [ ] **Real context menus.** Menu creation and click handling are tested; the
      rendered Chrome menu is not. Right-click Copy/Paste work, and the items
      disappear when disabled in options.
- [ ] **`storage.sync` propagation across devices.** The mock is per-instance
      and in-memory. Change a setting on one signed-in machine and confirm it
      arrives on another.
- [ ] **Offscreen document lifecycle under real service-worker suspension.**
      `ensureOffscreen` is tested against a mock. Leave the browser idle until
      the worker is suspended, then trigger a copy via shortcut or context menu
      and confirm the document is recreated and the clipboard write succeeds.
- [ ] **First-install welcome page.** `onInstalled` opening the tab is tested;
      the real first-run experience is not. Install fresh into a clean profile
      and confirm the welcome page opens once, renders the correct bound
      shortcuts, and its options link works.
