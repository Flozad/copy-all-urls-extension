# Changelog

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
