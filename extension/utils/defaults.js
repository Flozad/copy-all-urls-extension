/**
 * Centralized default settings for the extension
 * Single source of truth to prevent persistence bugs
 */
const DEFAULT_SETTINGS = {
  // Core functionality
  format: 'url_only',
  mime: 'text/plain',
  mimeType: 'text/plain',  // Duplicate for compatibility
  selectedTabsOnly: false,
  includeAllWindows: false,

  // Advanced features
  customTemplate: '',
  delimiter: '--',
  smartPaste: true,
  anchor: 'url',  // HTML anchor format: 'url' or 'title'

  // UI behavior
  defaultBehavior: 'copy',
  autoAction: true,  // Auto-copy when popup opens
  theme: 'auto',  // Theme preference: 'auto', 'light', or 'dark'

  // Context menu
  showContextMenu: true,  // Show items in context menu

  // Keyboard shortcuts
  enableShortcuts: true,  // Enable global keyboard shortcuts

  // Formatting options
  bold: false  // Wrap titles in <strong> tags for HTML format
};

// Make available globally for all scripts
if (typeof window !== 'undefined') {
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}

// Make available for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_SETTINGS;
}
