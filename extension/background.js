// Import centralized default settings
importScripts('utils/defaults.js');

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
      console.log('Context menus created');
    } else {
      console.log('Context menus hidden per user preference');
    }
  } catch (error) {
    console.error('Failed to update context menus:', error);
  }
}

try {
  chrome.runtime.onInstalled.addListener(async () => {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      console.log('Default settings have been set.');
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
      if (tab) {
        // Check if tab is restricted
        if (isRestrictedUrl(tab.url)) {
          // Try to find a non-restricted tab
          const tabs = await chrome.tabs.query({ currentWindow: true });
          const nonRestrictedTab = tabs.find(t => !isRestrictedUrl(t.url));

          if (!nonRestrictedTab) {
            console.warn('Cannot paste: all tabs are restricted pages');
            return;
          }

          tab = nonRestrictedTab;
        }

        // Inject script to read clipboard (HTML or text) from content script context
        const results = await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          func: async () => {
            try {
              // Try to read clipboard with HTML support
              const clipboardItems = await navigator.clipboard.read();

              for (const item of clipboardItems) {
                // Check if HTML is available
                if (item.types.includes('text/html')) {
                  const htmlBlob = await item.getType('text/html');
                  const htmlText = await htmlBlob.text();
                  return { content: htmlText, isHtml: true };
                }

                // Fallback to plain text
                if (item.types.includes('text/plain')) {
                  const textBlob = await item.getType('text/plain');
                  const plainText = await textBlob.text();
                  return { content: plainText, isHtml: false };
                }
              }

              // Last resort: use readText()
              const text = await navigator.clipboard.readText();
              return { content: text, isHtml: false };
            } catch (error) {
              console.error('Clipboard read error:', error);
              return null;
            }
          }
        });

        const clipboardData = results[0]?.result;

        if (clipboardData && clipboardData.content && clipboardData.content.trim()) {
          Action.paste(clipboardData.content);
        } else {
          console.warn('Clipboard is empty for context menu paste');
        }
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

      console.log('========== PASTE FUNCTION (v1.5.1 STYLE) ==========');
      console.log('SmartPaste enabled:', smartPaste);
      console.log('Content:', content);

      if (!content) {
        console.error('No content provided for paste function');
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No content provided for paste function" });
        return;
      }

      let urlList = [];

      if (smartPaste) {
        // Extract URLs using regex (only http/https for security)
        const urlPattern = /https?:\/\/[^\s"']+/g;
        urlList = content.match(urlPattern) || [];
        urlList = urlList.map(url => url.trim().replace(/^["']|["']$/g, ''));
        console.log('Smart Paste ON - extracted http/https URLs:', urlList);
      } else {
        // Treat each line as a separate URL - NO VALIDATION!
        urlList = content.split('\n').map(url => url.trim()).filter(url => url.length > 0);
        console.log('Smart Paste OFF - using each line as-is:', urlList);
      }

      if (urlList.length === 0) {
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No URL found in the provided content" });
        return;
      }

      console.log(`Opening ${urlList.length} tabs...`);
      urlList.forEach(url => {
        console.log(`Creating tab for: ${url}`);
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
        if (tab) {
          // Check if tab is restricted
          if (isRestrictedUrl(tab.url)) {
            // Try to find a non-restricted tab
            const tabs = await chrome.tabs.query({ currentWindow: true });
            const nonRestrictedTab = tabs.find(t => !isRestrictedUrl(t.url));

            if (!nonRestrictedTab) {
              console.warn('Cannot paste: all tabs are restricted pages');
              return;
            }

            tab = nonRestrictedTab;
          }

          // Inject script to read clipboard (HTML or text) from content script context
          const results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: async () => {
              try {
                // Try to read clipboard with HTML support
                const clipboardItems = await navigator.clipboard.read();

                for (const item of clipboardItems) {
                  // Check if HTML is available
                  if (item.types.includes('text/html')) {
                    const htmlBlob = await item.getType('text/html');
                    const htmlText = await htmlBlob.text();
                    return { content: htmlText, isHtml: true };
                  }

                  // Fallback to plain text
                  if (item.types.includes('text/plain')) {
                    const textBlob = await item.getType('text/plain');
                    const plainText = await textBlob.text();
                    return { content: plainText, isHtml: false };
                  }
                }

                // Last resort: use readText()
                const text = await navigator.clipboard.readText();
                return { content: text, isHtml: false };
              } catch (error) {
                console.error('Clipboard read error:', error);
                return null;
              }
            }
          });

          const clipboardData = results[0]?.result;

          if (clipboardData && clipboardData.content && clipboardData.content.trim()) {
            Action.paste(clipboardData.content);
          } else {
            console.warn('Clipboard is empty for action button paste');
          }
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

// Helper function to check if a URL is restricted (can't inject scripts)
function isRestrictedUrl(url) {
  if (!url) return true;
  const restrictedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'data:',
    'file://',
    'view-source:'
  ];
  const restrictedDomains = [
    'chrome.google.com/webstore',
    'microsoftedge.microsoft.com/addons'
  ];

  // Check prefixes
  if (restrictedPrefixes.some(prefix => url.startsWith(prefix))) {
    return true;
  }

  // Check domains
  if (restrictedDomains.some(domain => url.includes(domain))) {
    return true;
  }

  return false;
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

    // Get active tab to inject clipboard write script
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      throw new Error('No active tab found');
    }

    // Check if current tab is restricted
    if (isRestrictedUrl(activeTab.url)) {
      // Try to find a non-restricted tab to inject into
      const nonRestrictedTab = tabs.find(tab => !isRestrictedUrl(tab.url));

      if (nonRestrictedTab) {
        // Use a non-restricted tab for clipboard access
        await chrome.scripting.executeScript({
          target: { tabId: nonRestrictedTab.id },
          func: (text) => {
            navigator.clipboard.writeText(text);
          },
          args: [outputText]
        });
      } else {
        // No non-restricted tabs available
        console.warn('Cannot copy: all tabs are restricted pages');
        showBadge('⚠', '#FF9800', 2000);
        return;
      }
    } else {
      // Inject script to write to clipboard in active tab
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (text) => {
          navigator.clipboard.writeText(text);
        },
        args: [outputText]
      });
    }

    showSuccessBadge(filteredTabs.length);
  } catch (error) {
    console.error('Copy shortcut failed:', error);
    showErrorBadge();
  }
}

async function handlePasteShortcut() {
  try {
    showLoadingBadge();

    // Get all tabs to find a non-restricted one
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab) {
      throw new Error('No active tab found');
    }

    let targetTab = activeTab;

    // Check if current tab is restricted
    if (isRestrictedUrl(activeTab.url)) {
      // Try to find a non-restricted tab to inject into
      const nonRestrictedTab = tabs.find(tab => !isRestrictedUrl(tab.url));

      if (nonRestrictedTab) {
        targetTab = nonRestrictedTab;
      } else {
        // No non-restricted tabs available
        console.warn('Cannot paste: all tabs are restricted pages');
        showBadge('⚠', '#FF9800', 2000);
        return;
      }
    }

    // Inject script to read from clipboard (HTML or text)
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func: async () => {
        try {
          // Try to read clipboard with HTML support
          const clipboardItems = await navigator.clipboard.read();

          for (const item of clipboardItems) {
            // Check if HTML is available
            if (item.types.includes('text/html')) {
              const htmlBlob = await item.getType('text/html');
              const htmlText = await htmlBlob.text();
              return { content: htmlText, isHtml: true };
            }

            // Fallback to plain text
            if (item.types.includes('text/plain')) {
              const textBlob = await item.getType('text/plain');
              const plainText = await textBlob.text();
              return { content: plainText, isHtml: false };
            }
          }

          // Last resort: use readText()
          const text = await navigator.clipboard.readText();
          return { content: text, isHtml: false };
        } catch (error) {
          console.error('Clipboard read error:', error);
          return null;
        }
      }
    });

    const clipboardData = results[0]?.result;
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
  console.log('Keyboard shortcut triggered:', command);

  try {
    // Check if keyboard shortcuts are enabled
    const settings = await chrome.storage.sync.get(['enableShortcuts']);
    const shortcutsEnabled = settings.enableShortcuts !== false; // Default to true

    if (!shortcutsEnabled) {
      console.log('Keyboard shortcuts are disabled in settings');
      showBadge('⚠', '#FF9800', 2000);
      return;
    }

    if (command === 'copy-urls') {
      console.log('Executing copy command via shortcut');
      await handleCopyShortcut();
    } else if (command === 'paste-urls') {
      console.log('Executing paste command via shortcut');
      await handlePasteShortcut();
    } else {
      console.warn('Unknown command:', command);
    }
  } catch (error) {
    console.error('Error handling keyboard shortcut:', error);
    showErrorBadge();
  }
});

// Old ActionKeyboard object removed - keyboard shortcuts now use direct clipboard access via content script injection