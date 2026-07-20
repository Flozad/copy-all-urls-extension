# Changelog

## [1.13.0] - 2026-07-20

### Added
- **Copy history** - The popup keeps a local log of your recent copies, with per-entry delete and a clear-all. Capped at 25 entries and 15,000 characters per entry so it cannot grow unbounded; repeat copies within 15 seconds coalesce into one entry rather than flooding the list. Stored in `chrome.storage.local` (never sync — history is device-local, and sync's 8 KB item cap is smaller than a single large copy). On by default via the new `saveHistory` setting.
- **Welcome page on first install** - Explains copy, paste, and format selection, and shows your *actual* keyboard shortcuts (read via `chrome.commands.getAll()`, so it reflects remapped or unassigned bindings rather than the defaults). Shown only on a genuine install — never on extension or Chrome updates.
- **Full keyboard navigation for the popup menus** - Arrow keys rove and wrap, Home/End jump to the ends, Escape closes and returns focus to the trigger, Tab closes without stealing focus.
- **A test suite** - 619 tests (`npm test`, Node's built-in runner plus jsdom) covering formats, escaping, copy/paste actions, storage, history, background listeners, and the accessibility behaviours above.
- **`npm run build:zip`** - Packages `extension/` for the Web Store, named from the manifest version and excluding dotfiles and macOS resource forks. Previously the upload zip was assembled by hand, which is how jQuery and a deleted `contentScript.js` stayed in shipped packages long after being removed from source.

### Changed
- **Tailwind CSS is no longer loaded from a CDN.** It ships inside the package, so the popup and options pages now make **no network requests at all**. Previously a slow or blocked jsdelivr left both pages completely unstyled, and every popup open told a third party you had used the extension.
- The bundled stylesheet is a generated subset (2.8 MB → 18 KB) built by `tools/build-tailwind.js`. Tests guard it two ways: the committed subset must rebuild byte-identically from the upstream source, and no class used in the markup may be missing from the subset if upstream defines it.
- Manifest now declares `short_name`, `author`, `homepage_url`, and `minimum_chrome_version: "109"` (the first Chrome with `chrome.offscreen`).
- Default custom template is now `$title - $url` instead of blank. A blank template made the `custom` format copy one empty line per tab and record it as a real copy.
- Default HTML anchor text is now `title`, matching what the HTML format has always emitted. The setting was previously read by nothing, so the stored `url` default would have silently changed output for every user once it was wired up.
- Removed three dead settings from the defaults: `mime` and `mimeType` (nothing read them — the clipboard flavour is derived from `format === 'html'` — and their stored value matched no `<option>`, so the options select rendered blank) and `defaultBehavior` (read only by an `action.onClicked` handler that can never fire while the manifest declares a popup). Leftover keys in existing profiles are harmless.
- `StorageUtil` now throws if `defaults.js` was not loaded first, instead of silently falling back to a drifted inline copy of the defaults whose `autoAction` disagreed with the real one. It also attaches to `globalThis` rather than `window`, so the service worker can use it.

### Fixed
- **Stale `anchor` setting no longer changes HTML output for long-time users.** `anchor` sat in the defaults until August 2025, and the handler of that era wrote the whole defaults object into storage on every install *and* update — so profiles created before then still carry a stored `'url'` that was never removed when the key left the defaults. Nothing read it for years, so it never affected output; this release honours it for the first time, which would have silently switched HTML link text from the page title to the raw URL for precisely the oldest profiles. A one-time migration (schema 2) clears it, restoring the `'title'` default those profiles have actually been emitting all along, and retires three keys (`mime`, `mimeType`, `defaultBehavior`) that nothing ever read. The migration is stamped with a `schemaVersion` so it runs exactly once and can never override an `anchor` chosen deliberately afterwards; the reset and repair flows re-stamp it too, since both clear sync storage first.
- **Accessibility**
  - Dropdowns now expose `aria-haspopup`, `aria-expanded`, and `role="menu"`/`menuitem`, with `aria-expanded` guaranteed to track the visible state.
  - The reset-settings confirmation is now a real dialog: `role="dialog"`, `aria-modal`, a focus trap, Escape to cancel, focus restored to the opener, and focus landing on Cancel rather than the destructive button.
  - Copy and paste results are announced to screen readers via live regions; previously they were silent.
  - Added visible focus indicators (Tailwind v2 ships none) and a `prefers-reduced-motion` block.
  - Raised muted-text and toast contrast to meet WCAG AA. Toast text was ~2.6:1 against its green background.
  - Decorative icons are hidden from assistive tech; icon-only buttons have accessible names.
- **Styles that silently never rendered** - Tailwind v2 ships no `amber` or `teal` palette, no `border-3`, and no arbitrary values like `min-w-[160px]`. Four such classes were resolving to nothing, including one that left two textareas with no border at all.
- The reset dialog stayed open behind its own error toast when a reset failed.
- `StorageUtil.getWithFallback(['a','b'])` returned every default plus junk numeric keys, because an array took the object code path.
- Removed leftover jQuery and stray `console.log` calls from the shipped package.
- Badge state is now backstopped by a `chrome.alarms` alarm, so a success or error badge can no longer stick permanently when the service worker is torn down before its `setTimeout` fires. The timeout remains the primary timer — Chrome clamps alarms to a 30-second floor — and it disarms the alarm when it fires so the backstop cannot clear a later badge.
- The offscreen clipboard document is now closed once its work is done. It was created on the first copy or paste and then lived for the rest of the browser session. Concurrent operations share a single document and the last one to finish closes it, including when the clipboard operation throws.

### Security
- Extension pages load no remote resources of any kind. Combined with no host permissions and a `'self'` CSP, all URL and clipboard handling stays on-device.
- Added the Chrome Web Store Limited Use disclosure to the privacy page, as the program policies require it on the developer homepage or one click away.

## [1.12.1] - 2026-07-10

### Fixed
- **CRITICAL: Settings reset on Chrome/extension updates** (Issues #6, #14, #18)
  - `chrome.runtime.onInstalled` fires on extension updates AND Chrome updates, not just first install
  - The handler was unconditionally overwriting all saved settings with defaults on every update
  - Now only fills in settings that are missing (fresh install or newly added options), never overwriting existing user preferences

## [1.12.0] - 2026-01-30

### Added
- **Auto-copy toggle in popup** - Quick access checkbox to enable/disable auto-copy without opening settings
- **Feedback button** - Email link in footer for easy user feedback (clasicwebtools@gmail.com)

### Fixed
- **Paste URLs from Google Sheets** - Fixed HTML markup being appended to URLs when pasting from spreadsheets
  - Now prefers plain text over HTML when reading clipboard for paste operations
  - Strips HTML tags and entities before URL extraction in smart paste mode
  - Removes duplicate URLs from paste results
- **Dark mode footer links** - Links now turn white on hover instead of disappearing in dark mode

### Changed
- Clipboard reading now prioritizes plain text over HTML for better paste accuracy
- Improved URL extraction regex to handle HTML content more reliably

## [1.11.0] - 2026-01-29

### Fixed
- **CRITICAL**: Auto-copy was overwriting clipboard before paste operations
  - When user opened popup to paste URLs, auto-copy would run first
  - This overwrote the user's copied URLs with current tab URLs
  - Result: Pasting would duplicate current tabs instead of user's URLs
  - Fix: Completely disabled auto-copy by default
  - Removed fallback auto-copy in error handler that was bypassing settings

### Changed
- `autoAction` default changed from `true` to `false`
- Removed auto-copy fallback in error handler
- Changed autoAction check from `!== false` to `=== true` for explicit opt-in
- Users must now click "Copy URLs" button or enable auto-copy in settings
- Prevents unexpected clipboard overwrites

## [1.10.5] - 2026-01-29

### Fixed
- **CRITICAL**: Restored v1.5.1 paste logic - NO validation when Smart Paste OFF
  - Removed ALL URL validation when Smart Paste is disabled
  - Now directly opens whatever is on each line (chrome://, file://, etc.)
  - Matches original v1.5.1 working behavior exactly

### Changed
- Simplified paste function from 130+ lines to 30 lines
- Removed unnecessary HTML extraction, URL validation, and format parsing
- Smart Paste OFF = split by newline and open tabs, nothing else

## [1.10.4] - 2026-01-29

### Fixed
- **CRITICAL**: Completely fixed non-http/https URL pasting (#16)
  - Simplified Smart Paste OFF logic to match original v1.5.1 behavior
  - When Smart Paste disabled: treat each line as a URL, no parsing
  - Removed 80 lines of complex format parsing that was breaking URL extraction
  - Now works with ALL URL schemes: chrome://, file://, about:, data:, etc.

### Changed
- Smart Paste OFF now uses dead-simple v1.5.1 approach:
  - Split content by newlines
  - Trim each line
  - Use each line as-is as a URL
  - No format detection, no pattern matching, no parsing

### Technical
- Removed markdown link parsing when Smart Paste OFF
- Removed title:URL parsing when Smart Paste OFF
- Removed delimited format parsing when Smart Paste OFF
- Removed custom template parsing complexity
- Restored original simple behavior from v1.5.1

## [1.10.3] - 2026-01-29

### Fixed
- **Critical**: Complete fix for non-http/https URL pasting when Smart Paste disabled (#16)
  - Fixed URL extraction logic to accept all URL schemes (chrome://, file://, about:, data:, etc.)
  - Fixed URL validation to only filter restricted URLs when Smart Paste enabled
  - Pattern now matches URLs with or without :// (e.g., about:blank, data:text/html,...)
  - Restores v1.5.1 behavior where all URL types can be pasted with Smart Paste disabled

### Changed
- URL extraction patterns now conditional based on Smart Paste setting:
  - Smart Paste ON: Only http/https URLs extracted (security)
  - Smart Paste OFF: All valid URL schemes extracted
- Improved regex patterns to handle edge cases (about:, data:, mailto:, tel:, ftp:, etc.)
- Better error messages that reflect current Smart Paste setting

### Technical
- Added conditional URL scheme pattern matching
- Updated markdown link, title:URL, and delimited format parsers
- Comprehensive URL scheme support: chrome://, chrome-extension://, file://, about:, data:, edge://, view-source:, ftp://, mailto:, tel:

## [1.10.2] - 2026-01-28

### Fixed (Incomplete - superseded by 1.10.3)
- Partial fix for URL validation when Smart Paste disabled
- Note: This version did not fully resolve issue #16

## [1.10.1] - 2026-01-27

### Fixed
- **Critical**: Clipboard reading now properly accesses HTML content from copied links
  - Previously only read plain text, missing URLs from HTML `<a>` tags (Twitter, websites, etc.)
  - Now uses `navigator.clipboard.read()` to check for `text/html` MIME type first
  - Fixed all clipboard reading locations: popup paste, context menu, keyboard shortcuts, and action button
- Improved HTML detection with robust regex pattern
  - Now handles various href formats: `href="..."`, `href='...'`, `href=...`
  - Case-insensitive matching for better compatibility
- Enhanced URL extraction regex to handle complex URLs with special characters
- Better cleanup of extracted URLs (removes trailing punctuation, quotes, brackets)

### Added
- HTML clipboard content is now properly extracted from Twitter and other websites
- Fallback chain for clipboard reading: HTML → Plain Text → readText() for maximum compatibility
- Debug logging to help troubleshoot clipboard reading issues
- Test file `test-clipboard.html` for inspecting clipboard MIME types

### Changed
- All clipboard reading operations now prioritize HTML content over plain text
- More informative error messages when URL extraction fails

## [1.10.0] - 2026-01-26

### Fixed
- **Critical**: Settings persistence bug due to mismatched defaults across files
- **Critical**: Keyboard shortcuts completely redesigned with simpler, more reliable implementation
- Race conditions between auto-copy and keyboard shortcuts eliminated
- Settings now persist correctly across browser restarts

### Added
- Auto-copy configuration setting in options page (can now disable auto-copy on popup open)
- Context menu toggle option - hide "Copy URLs" and "Paste URLs" from right-click menu
- Bold formatting option for HTML format - wrap titles in `<strong>` tags
- Enhanced paste parsing with support for:
  - Markdown links `[title](url)`
  - Quoted URLs `"url"` or `'url'`
  - URL-encoded characters (automatic decoding)
  - Better handling of trailing punctuation
- Clean shadcn-style UI with Tailwind CSS
- Smooth message transitions with fade in/out effects
- Centralized default settings system (utils/defaults.js)

### Changed
- Keyboard shortcuts now use direct clipboard access via content script injection
- Removed complex timestamp/localStorage workaround for keyboard shortcuts
- Replaced notification spam with clean badge feedback (✓, !, ∅, ⏳)
- Improved popup UI with better visual hierarchy and spacing
- All message displays now use smooth opacity transitions
- Better error messages with success/error styling

### Technical
- Created centralized defaults file to prevent settings mismatch bugs
- Unified storage handling across all extension files
- Simplified keyboard shortcut implementation (removed 70+ lines of complex code)
- Context menus now dynamically created/removed based on user preference
- Improved code organization and maintainability

## [1.9.3] - 2025-08-18

### Fixed
- Keyboard shortcuts now work from background without requiring active tab
- Fixed clipboard access issues in Manifest V3 service worker context
- Improved keyboard shortcut reliability with proper error handling
- Added visual feedback with extension badge for shortcut actions
- Added notifications to guide users for paste operations

### Changed  
- Keyboard shortcuts now show notifications and use extension popup for clipboard access
- Enhanced error handling for clipboard operations across different contexts
- Improved user feedback with badge indicators for shortcut status

## [1.9.2] - 2025-08-18

### Added
- Keyboard shortcuts for Copy (Alt+Shift+C) and Paste (Alt+Shift+V) commands
- Keyboard shortcuts section in options page showing available shortcuts
- Global shortcuts that work when Chrome is active

### Technical
- Implemented Chrome commands API for keyboard shortcuts
- Added command listeners in background script
- Enhanced options page with shortcuts documentation

## [1.9.1] - 2025-08-18

### Changed
- Automatically copy URLs when popup opens for faster workflow

## [1.9.0] - 2025-08-18

### Added
- Context menu toggle functionality for quick access
- Enhanced HTML clipboard support with proper formatting
- Export functionality with TXT and CSV formats
- Bold formatting option for URLs

### Changed
- Improved storage management architecture
- Enhanced user interface for better usability
- Updated options page with new features

### Technical
- Implemented StorageUtil for robust storage operations
- Added comprehensive error handling
- Improved clipboard handling with multiple format support

## [1.8.1] - 2025-08-17

### Added
- Storage health check functionality in options page
- Storage repair tool for troubleshooting
- Comprehensive error handling with user-friendly notifications
- Fallback mechanism for storage operations
- New UI elements for storage management

### Fixed
- Issue #6: Settings being forgotten or reset to defaults
- Improved storage persistence with retry logic
- Better error handling for storage operations
- Added fallback to local storage when sync storage fails

### Changed
- Refactored storage handling with StorageUtil wrapper
- Enhanced settings management with better error recovery
- Improved user feedback for settings operations
- Updated options page with new storage health tools

### Technical
- Added exponential backoff for storage operations
- Implemented comprehensive storage health checks
- Added storage repair functionality
- Unified default settings between background and options
- Added robust error handling throughout the application

## [1.8.0] - Previous version

Initial release of the modernized extension with basic functionality.
