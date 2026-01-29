# Changelog

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
