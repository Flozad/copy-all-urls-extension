/**
 * Copy history storage.
 *
 * Design notes (memory / quota):
 * - Lives in chrome.storage.local, never sync. History is device-local by
 *   nature and sync caps items at 8KB, which a single copy can blow past.
 * - Hard caps on both entry count and per-entry size so the list can never
 *   grow unbounded. Worst case is roughly MAX_ENTRIES * MAX_CONTENT_CHARS.
 * - Nothing is held in memory between calls: every operation is a
 *   read-modify-write, so the service worker can be torn down at any time.
 * - Rapid re-copies coalesce into the newest entry (see COALESCE_WINDOW_MS),
 *   which keeps format switching and delimiter typing from flooding the list.
 *
 * Loaded via importScripts() in the service worker and a <script> tag in the
 * popup, so it must not touch `window` at the top level.
 */

const HISTORY_KEY = 'copyHistory';

// Keep the most recent N copies. 25 is enough to be useful without turning
// the popup into a scroll marathon or holding megabytes in storage.
const MAX_ENTRIES = 25;

// Truncate a single copy's content. 15k chars covers ~300 typical URLs.
const MAX_CONTENT_CHARS = 15000;

// Copies within this window that produced the same tab count replace the
// newest entry instead of appending a new one.
const COALESCE_WINDOW_MS = 15000;

// Every mutation is a read-modify-write against chrome.storage.local. Two
// concurrent calls (a shortcut copy landing while the popup re-copies) would
// interleave their reads and lose one entry, so mutations are serialized
// through this promise chain. Reads are not queued — they are single ops.
let writeQueue = Promise.resolve();

function serialize(operation) {
  const result = writeQueue.then(operation, operation);
  // Keep the chain alive even if this operation rejects.
  writeQueue = result.catch(() => {});
  return result;
}

const CopyHistory = {
  MAX_ENTRIES,
  MAX_CONTENT_CHARS,

  /**
   * @returns {Promise<Array>} Newest-first list of history entries.
   */
  async getAll() {
    try {
      const stored = await chrome.storage.local.get([HISTORY_KEY]);
      const entries = stored[HISTORY_KEY];
      return Array.isArray(entries) ? entries : [];
    } catch (error) {
      console.error('Failed to read copy history:', error);
      return [];
    }
  },

  /**
   * Record a copy. Silently does nothing when the user has history disabled.
   * @param {{content: string, count: number, format: string, signature?: string,
   *          plainContent?: string}} copy
   *   `signature` identifies the tab set being copied (see tabsSignature in
   *   background.js) and is what coalescing keys on.
   *   `plainContent` is the text/plain flavor for formats that go on the
   *   clipboard as rich content (html). Stored only when it differs from
   *   `content`, so plain formats cost nothing extra.
   */
  async add({ content, count, format, signature, plainContent }) {
    if (!content) {
      return;
    }

    // Read the opt-out defensively and in its own try block. A sync-storage
    // failure (signed-out profile, quota, transient error) must not be able to
    // silently drop the copy — absent or unreadable means enabled.
    let enabled = true;
    try {
      const settings = await chrome.storage.sync.get(['saveHistory']);
      enabled = settings.saveHistory !== false;
    } catch (error) {
      console.warn('[history] could not read saveHistory, assuming enabled:', error);
    }

    if (!enabled) {
      return;
    }

    return serialize(async () => {
      try {
        const truncated = content.length > MAX_CONTENT_CHARS;
        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ts: Date.now(),
          count: count || 0,
          format: format || 'url_only',
          signature: signature || '',
          content: truncated ? content.slice(0, MAX_CONTENT_CHARS) : content,
          truncated
        };

        // Restoring an HTML copy has to put both flavors back on the clipboard
        // or it pastes as raw <a href> markup instead of live links. The plain
        // flavor cannot be derived from the HTML after the fact — titles are
        // entity-escaped, so stripping tags mangles & < > " ' — so it has to be
        // carried alongside.
        if (plainContent && plainContent !== content) {
          entry.plainContent = plainContent.slice(0, MAX_CONTENT_CHARS);
        }

        const entries = await this.getAll();
        const newest = entries[0];

        // Coalesce only when this is the *same set of tabs* re-copied in the
        // *same format* within the window — i.e. the user is tweaking a
        // delimiter or template. Keying on tab count alone silently destroyed
        // entries: copying 5 tabs in window A then 5 different tabs in window B
        // replaced A's entry. Ignoring format did the same across a format
        // switch: the popup re-copies on every dropdown change, so picking HTML
        // right after a Text copy overwrote the Text entry and the earlier
        // rendering was gone. Switching format now appends. An absent signature
        // never coalesces, so a caller that omits it can only ever over-record,
        // never lose data.
        const isRefinementOfNewest =
          newest &&
          entry.signature !== '' &&
          newest.signature === entry.signature &&
          newest.format === entry.format &&
          entry.ts - newest.ts < COALESCE_WINDOW_MS;

        const next = isRefinementOfNewest
          ? [entry, ...entries.slice(1)]
          : [entry, ...entries];

        await chrome.storage.local.set({
          [HISTORY_KEY]: next.slice(0, MAX_ENTRIES)
        });
      } catch (error) {
        // History is a convenience — never let a failure here break copying.
        console.error('[history] failed to record copy:', error);
      }
    });
  },

  /**
   * @param {string} id
   */
  async remove(id) {
    return serialize(async () => {
      try {
        const entries = await this.getAll();
        await chrome.storage.local.set({
          [HISTORY_KEY]: entries.filter((entry) => entry.id !== id)
        });
      } catch (error) {
        console.error('Failed to remove history entry:', error);
      }
    });
  },

  async clear() {
    // Serialized alongside add()/remove(): options.js clears the moment the
    // user opts out of history, and an add() already queued behind a slow read
    // would otherwise land after the clear and resurrect an entry.
    return serialize(async () => {
      try {
        await chrome.storage.local.remove(HISTORY_KEY);
      } catch (error) {
        console.error('Failed to clear copy history:', error);
      }
    });
  }
};

// Available to the service worker (importScripts) and popup (script tag) alike.
if (typeof globalThis !== 'undefined') {
  globalThis.CopyHistory = CopyHistory;
}
