# Changelog

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
