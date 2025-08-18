# Copy All URLs Chrome Extension

This Chrome extension allows users to copy the URLs of all open tabs or selected tabs, and paste them to open new tabs. It's based on the original **CopyAllURLs** extension, with enhancements and custom features.

## Features

- Copy URLs in different formats: text, HTML, JSON, custom
- Paste URLs to open them in new tabs
- Option to include all Chrome windows
- Set default actions and MIME types
- Customizable settings for more control
- Robust storage system with fallback mechanisms
- Built-in storage health check and repair tools
- Smart error handling with user-friendly notifications

## Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in your Chrome browser
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory where you cloned/downloaded this repository

## Usage

- Click the extension icon in the Chrome toolbar
- Use the popup to copy or paste URLs
- Go to the "Options" page to customize settings
- Use the storage health check tool if settings aren't persisting
- Use the repair tool to fix any storage issues

### Advanced Features

#### Storage Management
- **Health Check**: Verify the status of both sync and local storage
- **Repair Tool**: Fix storage issues and restore default settings
- **Fallback System**: Automatic fallback to local storage if sync fails

#### Custom Formatting
- Use custom templates with variables: $url, $title, $date
- Multiple format options: text, HTML, JSON, delimited
- Configurable delimiters for separated values

#### Settings Persistence
- Robust storage system with retry mechanism
- Automatic error recovery
- User-friendly notifications for all operations

## Troubleshooting

If you experience issues with settings not being saved:

1. Go to the Options page
2. Click "Check Storage Health" to diagnose any issues
3. Use the "Repair Storage" tool if problems are detected
4. Check the extension's console for detailed error messages

## Contributing

Contributions are welcome! Please fork this repository, make your changes, and submit a pull request.

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and changes.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more details.

## Acknowledgments

- Inspired by the original [CopyAllURLs](https://github.com/vincepare/CopyAllUrl_Chrome) Chrome extension
- Built by [Lozard](https://github.com/Flozad)