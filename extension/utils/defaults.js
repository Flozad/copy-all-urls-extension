/**
 * Centralized default settings for the extension
 * Single source of truth to prevent persistence bugs
 */
const DEFAULT_SETTINGS = {
  // Core functionality
  format: 'url_only',
  // NOTE: `mime` / `mimeType` used to live here. Nothing ever read them — the
  // clipboard flavour is derived solely from `format === 'html'` in
  // background.js — and the stored default ('text/plain') matched neither
  // <option> value, so the options select rendered blank. Removed rather than
  // wired up. Leftover keys in existing profiles are harmless.
  selectedTabsOnly: false,
  includeAllWindows: false,

  // Advanced features
  // A blank template is never what anyone wants: format 'custom' would copy one
  // empty line per tab and record that as a real copy in history. There has to
  // be a usable starting template, so the textarea prefills with this and a
  // blank value falls back to it.
  customTemplate: '$title - $url',
  delimiter: '--',
  smartPaste: true,
  // HTML anchor link text: 'title' or 'url'. Defaults to 'title' because that
  // is what CopyTo.html has always emitted — the setting was previously read by
  // nobody, so 'url' would have silently changed output for every user.
  anchor: 'title',

  // UI behavior
  autoAction: false,  // Auto-copy when popup opens (DISABLED to prevent clipboard overwrite)
  theme: 'auto',  // Theme preference: 'auto', 'light', or 'dark'

  // Context menu
  showContextMenu: true,  // Show items in context menu

  // History
  saveHistory: true,  // Keep a local, capped log of recent copies

  // Keyboard shortcuts
  enableShortcuts: true,  // Enable global keyboard shortcuts

  // Formatting options
  bold: false  // Wrap titles in <strong> tags for HTML format
};

/**
 * Bumped whenever a stored key changes meaning or is retired, so onInstalled
 * can run a one-time migration and know not to run it a second time.
 *
 * Deliberately NOT a member of DEFAULT_SETTINGS: the seeding loop iterates that
 * object, and a schema marker is bookkeeping rather than a user preference.
 */
const SCHEMA_VERSION = 2;

// Make available globally for all scripts
if (typeof window !== 'undefined') {
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.SCHEMA_VERSION = SCHEMA_VERSION;
}

// Make available for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_SETTINGS;
  // Non-enumerable: Object.keys/entries(DEFAULT_SETTINGS) drives both the
  // seeding loop and several tests, and neither should ever see this as a
  // setting. It is reachable as require('.../defaults.js').SCHEMA_VERSION.
  Object.defineProperty(module.exports, 'SCHEMA_VERSION', {
    value: SCHEMA_VERSION
  });
}
