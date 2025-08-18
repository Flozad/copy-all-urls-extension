// Content script for Copy All URLs extension
// This script runs in the context of web pages and can interact with the DOM

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle any content script specific functionality here
  // Currently no content script functionality is needed for this extension
  // as all operations are handled by the background script and popup
});

// The extension primarily uses background script and popup
// Content script is minimal for this URL copying/pasting extension
