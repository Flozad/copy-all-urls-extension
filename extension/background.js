// Import centralized default settings
importScripts('utils/defaults.js', 'utils/history.js');

// ---- Offscreen clipboard bridge -------------------------------------------
// The service worker cannot access the clipboard directly. Headless flows
// (keyboard shortcuts, context menu, action button) route clipboard reads and
// writes through a single offscreen document instead of injecting into a tab —
// which removes the need for host permissions entirely.
const OFFSCREEN_URL = 'offscreen.html';
let offscreenCreating = null;

async function hasOffscreenDocument() {
  // hasDocument() exists in Chrome 116+. The manifest floor is 109 (the first
  // version with chrome.offscreen at all), so on 109-115 fall back to scanning
  // the service worker's clients.
  if (chrome.offscreen && typeof chrome.offscreen.hasDocument === 'function') {
    try {
      return await chrome.offscreen.hasDocument();
    } catch (e) {
      // fall through to the clients-based check
    }
  }
  try {
    const url = chrome.runtime.getURL(OFFSCREEN_URL);
    const matched = await self.clients.matchAll();
    return matched.some((client) => client.url === url);
  } catch (e) {
    return false;
  }
}

async function ensureOffscreen() {
  // Check the in-flight guard BEFORE the first await. Checking it after
  // `await hasOffscreenDocument()` let two callers both observe null and both
  // start a create, and the loser's `finally` would then null out the winner's
  // in-flight promise.
  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }
  if (await hasOffscreenDocument()) {
    return;
  }
  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }
  const creating = chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['CLIPBOARD'],
    justification: 'Read and write the clipboard to copy and paste tab URLs.'
  });
  offscreenCreating = creating;
  try {
    await creating;
  } catch (err) {
    // A concurrent create can win the race; that's fine. Rethrow anything else.
    if (!String(err && err.message).includes('Only a single offscreen')) {
      throw err;
    }
  } finally {
    // Only clear the guard if it is still ours.
    if (offscreenCreating === creating) {
      offscreenCreating = null;
    }
  }
}

async function closeOffscreen() {
  if (!chrome.offscreen || typeof chrome.offscreen.closeDocument !== 'function') {
    return;
  }
  try {
    if (await hasOffscreenDocument()) {
      await chrome.offscreen.closeDocument();
    }
  } catch (e) {
    // Already closed, or closed by a concurrent caller. Nothing to do.
  }
}

// Ref-counted so overlapping clipboard operations share one document and only
// the last one out closes it. Without this the document created on the first
// copy/paste stayed alive for the rest of the browser session.
let offscreenUsers = 0;

async function withOffscreen(fn) {
  await ensureOffscreen();
  offscreenUsers++;
  try {
    return await fn();
  } finally {
    offscreenUsers--;
    if (offscreenUsers === 0) {
      await closeOffscreen();
    }
  }
}

async function writeClipboardViaOffscreen(text) {
  await withOffscreen(() =>
    chrome.runtime.sendMessage({ target: 'offscreen', action: 'copy', text })
  );
}

async function readClipboardViaOffscreen() {
  return await withOffscreen(() =>
    chrome.runtime.sendMessage({ target: 'offscreen', action: 'read' })
  );
}

// Function to update context menus based on settings
async function updateContextMenus() {
  try {
    // Remove all existing context menus
    await chrome.contextMenus.removeAll();

    // Get current setting
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get(['showContextMenu'], (result) => {
        resolve(result);
      });
    });

    const showContextMenu = settings.showContextMenu !== false; // Default to true

    // Create context menus if enabled
    if (showContextMenu) {
      chrome.contextMenus.create({
        id: 'copyUrls',
        title: 'Copy URLs',
        contexts: ['all']
      });

      chrome.contextMenus.create({
        id: 'pasteUrls',
        title: 'Paste URLs',
        contexts: ['all']
      });
    }
  } catch (error) {
    console.error('Failed to update context menus:', error);
  }
}

// Keys retired in schema 2, all of them written by versions that predate
// 1.13.0.
//
// `anchor` is the one that matters. It sat in DEFAULT_SETTINGS until August
// 2025, and the onInstalled handler of that era called
// chrome.storage.sync.set(DEFAULT_SETTINGS) unconditionally on every install
// AND every update. Because .set() merges rather than replaces, every profile
// created before then still carries a stored 'url' — and the key was dropped
// from the defaults without ever being removed from storage.
//
// Nothing read `anchor` for that entire period, so the stored value never
// affected output. 1.13.0 honours it for the first time in getCopySettings().
// Left alone, that would silently flip HTML link text from the page title to
// the raw URL for precisely the oldest profiles. Clearing it restores the
// 'title' default, which is what those profiles have actually been emitting
// all along — preserving observed behaviour rather than an intent the user was
// never able to observe.
//
// The other three were dead in every version that wrote them.
const SCHEMA_2_DROPPED = ['anchor', 'mime', 'mimeType', 'defaultBehavior'];

chrome.runtime.onInstalled.addListener(async (details) => {
  // onInstalled fires on extension updates and Chrome updates too, not just
  // first install. Only fill in settings the user doesn't already have,
  // so existing preferences are never overwritten (issues #6, #14, #18).
  chrome.storage.sync.get(null, (existing) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to read settings, skipping defaults to avoid overwriting:', chrome.runtime.lastError);
      return;
    }

    // An empty profile is a fresh install: there is no legacy value to
    // migrate, so stamp it at the current schema and skip straight to seeding.
    const isNewProfile = Object.keys(existing).length === 0;
    const schema = isNewProfile ? SCHEMA_VERSION : (existing.schemaVersion || 1);

    // Only the retired keys this profile actually has need removing.
    const stale = schema < 2 ? SCHEMA_2_DROPPED.filter((key) => key in existing) : [];

    const updates = {};
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      // Seed anything absent, and restore the default for any still-live
      // setting the migration just dropped (`anchor` returns as 'title').
      if (!(key in existing) || stale.includes(key)) {
        updates[key] = value;
      }
    }
    // Only stamp when it would actually change, so an already-migrated profile
    // with nothing missing still writes nothing at all.
    if (schema !== existing.schemaVersion) {
      updates.schemaVersion = SCHEMA_VERSION;
    }

    const seed = () => {
      if (Object.keys(updates).length > 0) {
        chrome.storage.sync.set(updates);
      }
    };

    if (stale.length > 0) {
      chrome.storage.sync.remove(stale, seed);
    } else {
      seed();
    }
  });

  // Initialize context menus based on settings
  await updateContextMenus();

  // Show the welcome page on first install only — never on updates or on
  // Chrome version bumps, which would hijack a tab for no reason.
  if (details && details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'copyUrls') {
    // Headless: the popup is closed, so the background must write the
    // clipboard itself.
    await Action.copyHeadless();
  } else if (info.menuItemId === 'pasteUrls') {
    try {
      const clipboardData = await readClipboardViaOffscreen();

      if (clipboardData && clipboardData.content && clipboardData.content.trim()) {
        const opened = await Action.paste(clipboardData.content, clipboardData.html);
        if (opened > 0) {
          showSuccessBadge(opened);
        } else {
          showBadge('∅', '#FF9800', 2000);
        }
      } else {
        console.warn('Clipboard is empty for context menu paste');
        showBadge('∅', '#FF9800', 2000);
      }
    } catch (err) {
      console.error('Failed to read clipboard contents from context menu:', err);
      showErrorBadge();
    }
  }
});

function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Tab titles and URLs are attacker-controlled: any page the user visits sets
// its own document.title. The HTML format is written to the clipboard as a real
// text/html flavor, so unescaped markup would paste as live HTML into whatever
// the user pastes into (docs, wikis, CMSes, email). Escape both before
// interpolating.
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// A delimiter is usable unless it is empty or pure whitespace — except for the
// literal whitespace characters, which are a deliberate choice. Padding such as
// " | " is meaningful and must survive.
function isUsableDelimiter(delimiter) {
  if (typeof delimiter !== 'string' || delimiter === '') return false;
  return Boolean(delimiter.trim()) || ['\t', '\n', '\r'].includes(delimiter);
}

const CopyTo = {
  // `anchor` selects the visible link text: 'title' (default) or 'url'. It is
  // surfaced in the options page; before this it was stored and never read, so
  // the control did nothing.
  html: function (tabs, bold = false, anchor = DEFAULT_SETTINGS.anchor) {
    return tabs.map(tab => {
      const label = anchor === 'url' ? tab.url : tab.title;
      const safeLabel = escapeHtml(label);
      const text = bold ? `<strong>${safeLabel}</strong>` : safeLabel;
      return `<a href="${escapeHtml(tab.url)}">${text}</a>`;
    }).join('<br>');
  },
  json: function (tabs) {
    return JSON.stringify(tabs.map(tab => ({ title: tab.title, url: tab.url })), null, 2);
  },
  text: function (tabs) {
    return tabs.map(tab => `${tab.title}: ${tab.url}`).join('\n');
  },
  url_only: function (tabs) {
    return tabs.map(tab => tab.url).join('\n');
  },
  custom: function (tabs, template) {
    const currentDate = getCurrentDate();
    // A blank (or whitespace-only) template would emit one empty line per tab.
    const safeTemplate = (template && template.trim()) ? template : DEFAULT_SETTINGS.customTemplate;
    return tabs.map(tab => {
      let output = safeTemplate.replace(/\$url/g, tab.url).replace(/\$title/g, tab.title);
      output = output.replace(/\$date/g, currentDate);
      return output;
    }).join('\n');
  },
  delimited: function (tabs, delimiter) {
    // The fallback is DEFAULT_SETTINGS.delimiter, not a local '\t'. The two used
    // to disagree, so an unset delimiter produced '--' through the settings path
    // and a tab through any direct call.
    let cleanDelimiter = delimiter || DEFAULT_SETTINGS.delimiter;
    // Handle special characters
    if (cleanDelimiter === '\\t') cleanDelimiter = '\t';
    if (cleanDelimiter === '\\n') cleanDelimiter = '\n';
    if (cleanDelimiter === '\\r') cleanDelimiter = '\r';
    // Only whitespace-only delimiters are rejected. The padding around a
    // delimiter is meaningful — this used to trim unconditionally, which
    // silently turned " | " into "|" and made padded separators unreachable
    // through the UI.
    if (!isUsableDelimiter(cleanDelimiter)) {
      cleanDelimiter = DEFAULT_SETTINGS.delimiter;
    }
    return tabs.map(tab => {
      const title = tab.title.trim();
      const url = tab.url.trim();
      return `${title}${cleanDelimiter}${url}`;
    }).join('\n');
  }
};

// Opening a tab per clipboard line is unbounded by nature — a stray
// Ctrl+Shift+Y after copying a large document could otherwise wedge the browser.
const MAX_PASTE_TABS = 50;

// Messages to the popup are best-effort. Every headless flow (shortcut, context
// menu) runs with the popup closed, where sendMessage rejects with "Receiving
// end does not exist". That is the expected case, not an error.
function notifyUI(message) {
  try {
    const sending = chrome.runtime.sendMessage(message);
    if (sending && typeof sending.catch === 'function') {
      sending.catch(() => { /* no popup listening — expected when headless */ });
    }
  } catch (error) {
    /* no popup listening — expected when headless */
  }
}

// Only http(s) is safe to open from clipboard content. Chrome blocks
// javascript: and top-level data: itself, but chrome:// pages are openable via
// tabs.create and make a usable social-engineering target.
function isOpenableUrl(candidate) {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

// Pull openable URLs out of a single clipboard flavor. Pure: no storage, no
// tab creation — so it can be run against the plain-text flavor first and the
// text/html flavor as a fallback.
function extractUrls(content, smartPaste) {
  let urlList = [];

  // HTML content yields the same URL twice — once from an <a> href and once
  // from the anchor's visible text — so it must be de-duplicated. Plain text
  // is taken literally: two identical lines are two tabs the user asked for.
  const isHtml = /<[^>]+>/.test(content);

  if (smartPaste) {
    const decodeEntities = (s) => s
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Extract URLs using regex (only http/https for security).
    const urlPattern = /https?:\/\/[^\s"'<>]+/g;
    const found = [];

    let cleanContent = content;

    // Check if content looks like HTML (contains tags)
    if (isHtml) {
      // When you copy *rendered* links from a page, the URLs live in the
      // href/src attributes — the plain text is only the link labels. So
      // pull attribute URLs out BEFORE stripping tags, otherwise they are
      // lost and paste fails with "No URL found" (issue: rich-link paste).
      const attrPattern = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
      let attr;
      while ((attr = attrPattern.exec(content)) !== null) {
        const url = decodeEntities(attr[1]).trim();
        if (/^https?:\/\//i.test(url)) {
          found.push(url);
        }
      }

      // Then strip tags + decode entities so bare URLs sitting in the
      // visible text (not inside an attribute) are caught as well.
      cleanContent = decodeEntities(content.replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')  // Collapse multiple spaces
        .trim();
    }

    found.push(...(cleanContent.match(urlPattern) || []));

    urlList = found.map(url => {
      // Clean up URLs: remove trailing punctuation that's not part of URLs
      return url.trim()
        .replace(/^["']|["']$/g, '')
        .replace(/[,;)\]}>]+$/, '');  // Remove trailing punctuation
    });
  } else {
    urlList = content.split('\n').map(url => url.trim()).filter(url => url.length > 0);
  }

  // Enforce the http/https allowlist on *both* paths. Clipboard content is
  // untrusted — it can come from any page the user copied from.
  urlList = urlList.filter(isOpenableUrl);

  // Only HTML collapses duplicates (href + visible text name the same link);
  // plain text keeps every entry so N pasted lines open N tabs.
  return isHtml ? [...new Set(urlList)] : urlList;
}

// Single source of truth for copy settings, so the popup path and the headless
// path can never drift apart. They previously disagreed on the delimiter
// default ('\t' vs '--'), producing different output for the same unset setting.
async function getCopySettings() {
  const items = await chrome.storage.sync.get([
    'format', 'selectedTabsOnly', 'includeAllWindows', 'customTemplate', 'delimiter', 'bold', 'anchor'
  ]);
  return {
    format: items.format || DEFAULT_SETTINGS.format,
    selectedTabsOnly: items.selectedTabsOnly === true,
    includeAllWindows: items.includeAllWindows === true,
    // trim() on the guard, not on the value: a stored template of "   " is as
    // unusable as an empty one, but a template's own leading/trailing spaces
    // are part of the user's intended output.
    customTemplate: (items.customTemplate && items.customTemplate.trim())
      ? items.customTemplate
      : DEFAULT_SETTINGS.customTemplate,
    delimiter: isUsableDelimiter(items.delimiter) ? items.delimiter : DEFAULT_SETTINGS.delimiter,
    bold: items.bold === true,
    anchor: items.anchor === 'url' ? 'url' : DEFAULT_SETTINGS.anchor
  };
}

async function collectTabs(settings) {
  const queryOptions = settings.includeAllWindows ? {} : { currentWindow: true };
  const tabs = await chrome.tabs.query(queryOptions);
  return settings.selectedTabsOnly ? tabs.filter(tab => tab.highlighted) : tabs;
}

function formatTabs(tabs, settings) {
  switch (settings.format) {
    case 'html':
      return CopyTo.html(tabs, settings.bold, settings.anchor);
    case 'json':
      return CopyTo.json(tabs);
    case 'url_only':
      return CopyTo.url_only(tabs);
    case 'custom':
      return CopyTo.custom(tabs, settings.customTemplate);
    case 'delimited':
      return CopyTo.delimited(tabs, settings.delimiter);
    default:
      return CopyTo.text(tabs);
  }
}

// Identity of the tab set being copied, so history can tell "the user is still
// tweaking this copy" apart from "this is a genuinely new copy". Tab count
// alone is not identity — two different windows can hold the same number of
// tabs, and coalescing on count silently destroyed the earlier entry.
function tabsSignature(tabs) {
  return tabs.map(tab => tab.url).join('\n');
}

// Produce the formatted text for the current tabs and record it in history.
// Returns null when there is nothing to copy.
async function buildCopy() {
  const settings = await getCopySettings();
  const tabs = await collectTabs(settings);

  if (tabs.length === 0) {
    return null;
  }

  const content = formatTabs(tabs, settings);

  // The HTML format goes on the clipboard as two flavors. Derive the plain one
  // from the tabs directly — regex-stripping tags out of the HTML string used
  // to be "good enough" only because titles were unescaped. Now that they are
  // properly entity-escaped, stripping would delete the entities (&amp; -> '')
  // and mangle every title containing & < > " '.
  const plainContent = settings.format === 'html' ? CopyTo.text(tabs) : content;

  // Awaited so the service worker stays alive until the write lands.
  await CopyHistory.add({
    content,
    plainContent,
    count: tabs.length,
    format: settings.format,
    signature: tabsSignature(tabs)
  });

  return { content, plainContent, count: tabs.length, format: settings.format };
}

const Action = {
  // Popup-initiated copy. The popup owns the clipboard write so it can put a
  // real text/html flavor on the clipboard, which the offscreen document's
  // execCommand path cannot do.
  copy: async function () {
    try {
      const result = await buildCopy();

      if (!result) {
        console.warn('No tabs found to copy');
        return;
      }

      notifyUI({
        type: 'copy',
        copied_url: result.count,
        content: result.content,
        plainContent: result.plainContent,
        mimeType: result.format === 'html' ? 'html' : 'plaintext'
      });
    } catch (error) {
      console.error('Copy failed:', error);
      notifyUI({ type: 'copy', errorMsg: 'Failed to copy tabs' });
    }
  },

  // Headless copy (keyboard shortcut, context menu). The popup is closed here,
  // so the clipboard write has to happen in the background via the offscreen
  // document. This path previously only posted a message nobody received, so
  // the copy silently never happened.
  copyHeadless: async function () {
    try {
      showLoadingBadge();

      const result = await buildCopy();

      if (!result) {
        showBadge('∅', '#FF9800', 2000);
        return;
      }

      await writeClipboardViaOffscreen(result.content);
      showSuccessBadge(result.count);
    } catch (error) {
      console.error('Headless copy failed:', error);
      showErrorBadge();
    }
  },

  /**
   * Open the URLs found in `content`.
   * @param {string} content Preferred clipboard flavor (usually plain text).
   * @param {string} [htmlFallback] The clipboard's text/html flavor, if any.
   *   When copying rendered links, the plain text is only the link *labels* —
   *   the URLs live in href attributes. So if `content` yields no URLs, retry
   *   against the HTML before giving up.
   * @returns {Promise<number>} how many tabs were actually opened
   */
  paste: async function (content, htmlFallback) {
    // When only the HTML flavor exists, it becomes the primary content — but it
    // is still HTML, so it must go down the extraction path that reads href
    // attributes regardless of the smart-paste setting (see below).
    let contentIsHtmlFlavor = false;
    if (!content && htmlFallback) {
      content = htmlFallback;
      htmlFallback = '';
      contentIsHtmlFlavor = true;
    }

    if (!content) {
      console.error('No content provided for paste function');
      notifyUI({ type: 'paste', errorMsg: 'No content provided for paste function' });
      return 0;
    }

    const items = await chrome.storage.sync.get(['smartPaste']);
    // Absent means enabled: `=== true` would silently fall through to the
    // unvalidated line-splitting path whenever the setting failed to seed.
    const smartPaste = items.smartPaste !== false;

    // The naive path splits on newlines and takes each line as a URL, which is
    // meaningless for an HTML blob: the URLs live in href attributes, not on
    // lines. So HTML is always extracted smartly. Without this, the fallback
    // below re-ran with the same disabled flag and was a guaranteed no-op —
    // pasting rendered links with smart paste off reported "No URL found"
    // while the hrefs sat right there in the markup.
    let urlList = extractUrls(content, smartPaste || contentIsHtmlFlavor);

    // Nothing in the preferred flavor — retry against the HTML. This is the
    // rich-link case: the plain text held only link labels.
    if (urlList.length === 0 && htmlFallback) {
      urlList = extractUrls(htmlFallback, true);
    }

    if (urlList.length === 0) {
      notifyUI({ type: 'paste', errorMsg: 'No URL found in the provided content' });
      return 0;
    }

    const capped = urlList.length > MAX_PASTE_TABS;
    if (capped) {
      console.warn(`Clipboard held ${urlList.length} URLs; opening the first ${MAX_PASTE_TABS}.`);
      urlList = urlList.slice(0, MAX_PASTE_TABS);
    }

    // Awaited so a rejected create surfaces here instead of becoming an
    // unhandled rejection, and so the count we report back is the real one.
    let opened = 0;
    for (const url of urlList) {
      try {
        await chrome.tabs.create({ url });
        opened++;
      } catch (error) {
        console.warn('Failed to open URL:', url, error);
      }
    }

    notifyUI({ type: 'paste', success: true, urlCount: opened, capped });
    return opened;
  }
};

chrome.runtime.onMessage.addListener(function (request) {
  // Each branch is async; catch here so a failure never surfaces as an
  // unhandled rejection in the service worker.
  if (request.type === "copy") {
    Action.copy().catch(err => console.error('Copy failed:', err));
  } else if (request.type === "paste") {
    Action.paste(request.content, request.html).catch(err => console.error('Paste failed:', err));
  } else if (request.type === "updateContextMenus") {
    updateContextMenus().catch(err => console.error('Context menu update failed:', err));
  }
});

// NOTE: there is deliberately no chrome.action.onClicked listener. The manifest
// declares a default_popup, and Chrome does not fire onClicked when one is set —
// any handler here would be dead code. The `defaultBehavior` setting it used to
// read has been removed along with it.

// Helper functions for badge feedback
const BADGE_CLEAR_ALARM = 'clear-badge';

function showBadge(text, color, duration = 2000) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.alarms.clear(BADGE_CLEAR_ALARM);
  if (duration > 0) {
    // setTimeout is the fast path, but it dies with the service worker — which
    // used to leave a ⏳ or ✓ badge stuck indefinitely. The alarm survives a
    // teardown and mops up. Chrome clamps alarms to a 30s floor, so it can only
    // ever be the backstop, never the primary timer.
    setTimeout(() => {
      chrome.alarms.clear(BADGE_CLEAR_ALARM);
      chrome.action.setBadgeText({ text: '' });
    }, duration);
  }
  if (text) {
    // Armed even for duration 0 (the ⏳ loading badge): that one is cleared by
    // the follow-up success/error badge, but if the worker dies mid-flight
    // nothing else would ever clear it.
    chrome.alarms.create(BADGE_CLEAR_ALARM, { delayInMinutes: 0.5 });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === BADGE_CLEAR_ALARM) {
    chrome.action.setBadgeText({ text: '' });
  }
});

function showLoadingBadge() {
  showBadge('⏳', '#FF9800', 0);
}

function showSuccessBadge(count = '') {
  showBadge(count ? `✓${count}` : '✓', '#4CAF50', 2000);
}

function showErrorBadge() {
  showBadge('!', '#F44336', 2000);
}

// Keyboard shortcut handlers
async function handleCopyShortcut() {
  // Same headless path as the context menu: format, write the clipboard via
  // the offscreen document (works even on chrome:// pages), record history,
  // badge the result.
  await Action.copyHeadless();
}

async function handlePasteShortcut() {
  try {
    showLoadingBadge();

    // Read the clipboard via the offscreen document (no tab required).
    const clipboardData = await readClipboardViaOffscreen();

    if (!clipboardData || !clipboardData.content || clipboardData.content.trim() === '') {
      showBadge('∅', '#FF9800', 2000);
      return;
    }

    // Awaited, so the badge reflects how many tabs actually opened instead of
    // unconditionally claiming success on a 500ms timer.
    const opened = await Action.paste(clipboardData.content, clipboardData.html);

    if (opened > 0) {
      showSuccessBadge(opened);
    } else {
      showBadge('∅', '#FF9800', 2000);
    }
  } catch (error) {
    console.error('Paste shortcut failed:', error);
    showErrorBadge();
  }
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  try {
    // Check if keyboard shortcuts are enabled
    const settings = await chrome.storage.sync.get(['enableShortcuts']);
    const shortcutsEnabled = settings.enableShortcuts !== false; // Default to true

    if (!shortcutsEnabled) {
      showBadge('⚠', '#FF9800', 2000);
      return;
    }

    if (command === 'copy-urls') {
      await handleCopyShortcut();
    } else if (command === 'paste-urls') {
      await handlePasteShortcut();
    } else {
      console.warn('Unknown command:', command);
    }
  } catch (error) {
    console.error('Error handling keyboard shortcut:', error);
    showErrorBadge();
  }
});