// Import centralized default settings
importScripts('utils/defaults.js');

// ---- Offscreen clipboard bridge -------------------------------------------
// The service worker cannot access the clipboard directly. Headless flows
// (keyboard shortcuts, context menu, action button) route clipboard reads and
// writes through a single offscreen document instead of injecting into a tab —
// which removes the need for host permissions entirely.
const OFFSCREEN_URL = 'offscreen.html';
let offscreenCreating = null;

async function hasOffscreenDocument() {
  // hasDocument() exists in Chrome 116+. On older Chrome (109-115) fall back to
  // scanning the service worker's clients, so every offscreen-capable version
  // is supported without pinning a minimum_chrome_version.
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
  if (await hasOffscreenDocument()) {
    return;
  }
  // Guard against two concurrent operations both trying to create the document.
  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }
  try {
    offscreenCreating = chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['CLIPBOARD'],
      justification: 'Read and write the clipboard to copy and paste tab URLs.'
    });
    await offscreenCreating;
  } catch (err) {
    // A concurrent create can win the race; that's fine. Rethrow anything else.
    if (!String(err && err.message).includes('Only a single offscreen')) {
      throw err;
    }
  } finally {
    offscreenCreating = null;
  }
}

async function writeClipboardViaOffscreen(text) {
  await ensureOffscreen();
  await chrome.runtime.sendMessage({ target: 'offscreen', action: 'copy', text });
}

async function readClipboardViaOffscreen() {
  await ensureOffscreen();
  return await chrome.runtime.sendMessage({ target: 'offscreen', action: 'read' });
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

try {
  chrome.runtime.onInstalled.addListener(async () => {
    // onInstalled fires on extension updates and Chrome updates too, not just
    // first install. Only fill in settings the user doesn't already have,
    // so existing preferences are never overwritten (issues #6, #14, #18).
    chrome.storage.sync.get(null, (existing) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to read settings, skipping defaults to avoid overwriting:', chrome.runtime.lastError);
        return;
      }

      const missingDefaults = {};
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!(key in existing)) {
          missingDefaults[key] = value;
        }
      }

      if (Object.keys(missingDefaults).length > 0) {
        chrome.storage.sync.set(missingDefaults);
      }
    });

    // Initialize context menus based on settings
    await updateContextMenus();
  });
} catch (error) {
  console.error('Service worker registration failed:', error);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'copyUrls') {
    Action.copy();
  } else if (info.menuItemId === 'pasteUrls') {
    try {
      const clipboardData = await readClipboardViaOffscreen();

      if (clipboardData && clipboardData.content && clipboardData.content.trim()) {
        Action.paste(clipboardData.content);
      } else {
        console.warn('Clipboard is empty for context menu paste');
      }
    } catch (err) {
      console.error('Failed to read clipboard contents from context menu:', err);
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

const CopyTo = {
  html: function (tabs, bold = false) {
    return tabs.map(tab => {
      const title = bold ? `<strong>${tab.title}</strong>` : tab.title;
      return `<a href="${tab.url}">${title}</a>`;
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
    return tabs.map(tab => {
      let output = template.replace(/\$url/g, tab.url).replace(/\$title/g, tab.title);
      output = output.replace(/\$date/g, currentDate);
      return output;
    }).join('\n');
  },
  delimited: function (tabs, delimiter) {
    let cleanDelimiter = delimiter || '\t';
    // Handle special characters
    if (cleanDelimiter === '\\t') cleanDelimiter = '\t';
    if (cleanDelimiter === '\\n') cleanDelimiter = '\n';
    if (cleanDelimiter === '\\r') cleanDelimiter = '\r';
    // Remove any whitespace from the delimiter itself unless it's a special character
    if (!['\t', '\n', '\r'].includes(cleanDelimiter)) {
      cleanDelimiter = cleanDelimiter.trim();
    }
    // If delimiter is empty after trimming, use tab as default
    if (!cleanDelimiter) {
      cleanDelimiter = '\t';
    }
    return tabs.map(tab => {
      const title = tab.title.trim();
      const url = tab.url.trim();
      return `${title}${cleanDelimiter}${url}`;
    }).join('\n');
  }
};

const Action = {
  copy: function () {
    chrome.storage.sync.get(['format', 'mime', 'selectedTabsOnly', 'includeAllWindows', 'customTemplate', 'delimiter', 'bold'], function (items) {
      const format = items['format'] || 'url_only';
      const selectedTabsOnly = items['selectedTabsOnly'] === true;
      const includeAllWindows = items['includeAllWindows'] === true;
      const customTemplate = items['customTemplate'] || '';
      const delimiter = items['delimiter'] || '\t';
      const bold = items['bold'] === true;

      const queryOptions = includeAllWindows ? {} : { currentWindow: true };

      chrome.tabs.query(queryOptions, function (tabs) {
        const filteredTabs = selectedTabsOnly ? tabs.filter(tab => tab.highlighted) : tabs;

        if (filteredTabs.length === 0) {
          console.warn('No tabs found to copy');
          return;
        }

        let outputText;

        switch (format) {
          case 'html':
            outputText = CopyTo.html(filteredTabs, bold);
            break;
          case 'json':
            outputText = CopyTo.json(filteredTabs);
            break;
          case 'url_only':
            outputText = CopyTo.url_only(filteredTabs);
            break;
          case 'custom':
            outputText = CopyTo.custom(filteredTabs, customTemplate);
            break;
          case 'delimited':
            outputText = CopyTo.delimited(filteredTabs, delimiter);
            break;
          default:
            outputText = CopyTo.text(filteredTabs);
            break;
        }

        chrome.runtime.sendMessage({ 
          type: "copy", 
          copied_url: filteredTabs.length, 
          content: outputText,
          mimeType: format === 'html' ? 'html' : 'plaintext'
        });
      });
    });
  },

  paste: function (content) {
    chrome.storage.sync.get(['smartPaste'], function (items) {
      const smartPaste = items['smartPaste'] === true;

      if (!content) {
        console.error('No content provided for paste function');
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No content provided for paste function" });
        return;
      }

      let urlList = [];

      if (smartPaste) {
        // First, strip HTML tags to get clean text
        let cleanContent = content;

        // Check if content looks like HTML (contains tags)
        if (/<[^>]+>/.test(content)) {
          // Remove HTML tags and decode HTML entities
          cleanContent = content
            .replace(/<[^>]*>/g, ' ')  // Replace tags with spaces
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')  // Collapse multiple spaces
            .trim();
        }

        // Extract URLs using regex (only http/https for security)
        // Updated pattern to stop at common URL-ending characters
        const urlPattern = /https?:\/\/[^\s"'<>]+/g;
        urlList = cleanContent.match(urlPattern) || [];
        urlList = urlList.map(url => {
          // Clean up URLs: remove trailing punctuation that's not part of URLs
          return url.trim()
            .replace(/^["']|["']$/g, '')
            .replace(/[,;)\]}>]+$/, '');  // Remove trailing punctuation
        });

        // Remove duplicates
        urlList = [...new Set(urlList)];
      } else {
        // Treat each line as a separate URL - NO VALIDATION!
        urlList = content.split('\n').map(url => url.trim()).filter(url => url.length > 0);
      }

      if (urlList.length === 0) {
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No URL found in the provided content" });
        return;
      }

      urlList.forEach(url => {
        chrome.tabs.create({ url });
      });

      chrome.runtime.sendMessage({ type: "paste", success: true, urlCount: urlList.length });
    });
  }
};

chrome.runtime.onMessage.addListener(function (request) {
  if (request.type === "copy") {
    Action.copy();
  } else if (request.type === "paste") {
    Action.paste(request.content);
  } else if (request.type === "updateContextMenus") {
    updateContextMenus();
  }
});

chrome.action.onClicked.addListener(async function (tab) {
  chrome.storage.sync.get(['defaultBehavior'], async function (items) {
    if (items.defaultBehavior === 'copy') {
      Action.copy();
    } else if (items.defaultBehavior === 'paste') {
      try {
        const clipboardData = await readClipboardViaOffscreen();

        if (clipboardData && clipboardData.content && clipboardData.content.trim()) {
          Action.paste(clipboardData.content);
        } else {
          console.warn('Clipboard is empty for action button paste');
        }
      } catch (err) {
        console.error('Failed to read clipboard contents from action button:', err);
      }
    } else {
      chrome.runtime.openOptionsPage();
    }
  });
});

// Helper functions for badge feedback
function showBadge(text, color, duration = 2000) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  if (duration > 0) {
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), duration);
  }
}

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
  try {
    showLoadingBadge();

    // Get settings
    const settings = await chrome.storage.sync.get([
      'format', 'selectedTabsOnly', 'includeAllWindows', 'customTemplate', 'delimiter', 'bold'
    ]);

    const format = settings.format || 'url_only';
    const selectedTabsOnly = settings.selectedTabsOnly === true;
    const includeAllWindows = settings.includeAllWindows === true;
    const customTemplate = settings.customTemplate || '';
    const delimiter = settings.delimiter || '--';
    const bold = settings.bold === true;

    // Query tabs
    const queryOptions = includeAllWindows ? {} : { currentWindow: true };
    const tabs = await chrome.tabs.query(queryOptions);
    const filteredTabs = selectedTabsOnly ? tabs.filter(tab => tab.highlighted) : tabs;

    if (filteredTabs.length === 0) {
      showBadge('∅', '#FF9800', 2000);
      return;
    }

    // Format URLs
    let outputText;
    switch (format) {
      case 'html':
        outputText = CopyTo.html(filteredTabs, bold);
        break;
      case 'json':
        outputText = CopyTo.json(filteredTabs);
        break;
      case 'url_only':
        outputText = CopyTo.url_only(filteredTabs);
        break;
      case 'custom':
        outputText = CopyTo.custom(filteredTabs, customTemplate);
        break;
      case 'delimited':
        outputText = CopyTo.delimited(filteredTabs, delimiter);
        break;
      default:
        outputText = CopyTo.text(filteredTabs);
        break;
    }

    // Write the formatted URLs to the clipboard via the offscreen document.
    // Works regardless of which tab is active (including chrome:// pages).
    await writeClipboardViaOffscreen(outputText);

    showSuccessBadge(filteredTabs.length);
  } catch (error) {
    console.error('Copy shortcut failed:', error);
    showErrorBadge();
  }
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

    // Use the existing paste action
    Action.paste(clipboardData.content);

    // Badge will be updated after paste completes
    setTimeout(() => showSuccessBadge(), 500);
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