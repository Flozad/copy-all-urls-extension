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
    chrome.storage.sync.get(['format', 'customTemplate', 'smartPaste', 'delimiter'], function (items) {
      const format = items['format'] || 'text';
      const smartPaste = items['smartPaste'] === true;
      const delimiter = items['delimiter'] || '\t';
      const customTemplate = items['customTemplate'] || '';

      console.log('Paste function called');
      console.log('SmartPaste enabled:', smartPaste);
      console.log('Content length:', content ? content.length : 0);
      console.log('Content preview:', content ? content.substring(0, 200) : 'empty');

      if (!content) {
        console.error('No content provided for paste function');
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No content provided for paste function" });
        return;
      }

      let urlList = [];

      // ALWAYS check for HTML first, regardless of smartPaste setting
      // More robust HTML detection: check for any href attribute
      const hasHtmlTags = content.includes('<') && content.includes('>');
      const hasHrefAttribute = /href\s*=\s*["']/i.test(content);

      if (hasHtmlTags && hasHrefAttribute) {
        // HTML content - extract all URLs from href attributes
        // This regex handles various href formats: href="...", href='...', href=...
        const htmlUrlPattern = /href\s*=\s*["']([^"']+)["']|href\s*=\s*([^\s>]+)/gi;
        const matches = [...content.matchAll(htmlUrlPattern)];
        urlList = matches.map(match => (match[1] || match[2]).trim());
        console.log('HTML format detected, extracted URLs:', urlList);
      } else if (smartPaste) {
        // Enhanced URL extraction with improved regex
        // This regex handles URLs more robustly, including query params and fragments
        const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
        const matches = content.match(urlPattern);

        if (matches) {
          urlList = matches.map(url => {
            // Remove trailing punctuation that's not part of the URL
            url = url.replace(/[.,;:!?)"'\]]+$/, '');
            // Remove any leading/trailing quotes or brackets
            url = url.replace(/^["'<\[]+|["'>\]]+$/g, '');
            try {
              // Decode URL-encoded characters
              return decodeURIComponent(url);
            } catch (e) {
              // If decoding fails, return cleaned URL
              return url;
            }
          });
        }

        console.log('Smart paste extracted URLs:', urlList);
      } else {
        // Parse content based on format
        const lines = content.split(/\n|<br\s*\/?>/i).map(line => line.trim()).filter(line => line.length > 0);

        if (format === 'custom' && customTemplate) {
          // Convert template to regex pattern
          let pattern = customTemplate
            .replace(/\$/g, '\\$')  // Escape $ in template
            .replace(/\$url/g, '(https?:\\/\\/[^\\s]+)')  // Capture URL
            .replace(/\$title/g, '([^\\n]+)')  // Capture title
            .replace(/\$date/g, '\\d{4}-\\d{2}-\\d{2}');  // Match date format

          try {
            const regex = new RegExp(pattern, 'g');
            lines.forEach(line => {
              const match = line.match(regex);
              if (match) {
                // Extract URL from the match based on template
                const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                  urlList.push(urlMatch[1].trim());
                }
              }
            });
          } catch (e) {
            console.error('Invalid custom template pattern:', e);
          }
        } else {
          // When Smart Paste is disabled, accept all URL schemes
          // URL pattern: matches http://, https://, chrome://, file://, about:, data:, etc.
          const urlSchemePattern = smartPaste
            ? /^https?:\/\//  // Only http/https when Smart Paste enabled
            : /^[a-z][a-z0-9+.-]*:/i;  // All URL schemes when Smart Paste disabled (with or without //)

          urlList = lines.map(line => {
            // Check for markdown link format first
            const markdownPattern = smartPaste
              ? /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/  // Only http/https
              : /\[([^\]]+)\]\(([a-z][a-z0-9+.-]*:[^\s)]+)\)/i;  // All schemes
            const markdownMatch = line.match(markdownPattern);
            if (markdownMatch) {
              return markdownMatch[2];
            }

            // Check for direct URL
            if (urlSchemePattern.test(line.trim())) {
              return line.trim();
            }

            // Check for "Title: URL" format
            const titleUrlPattern = smartPaste
              ? /:\s*(https?:\/\/[^\s]+)/  // Only http/https
              : /:\s*([a-z][a-z0-9+.-]*:[^\s]+)/i;  // All schemes
            const titleMatch = line.match(titleUrlPattern);
            if (titleMatch) {
              return titleMatch[1].trim();
            }

            // Check for delimited format
            if (line.includes(delimiter)) {
              const parts = line.split(delimiter);
              for (const part of parts) {
                if (urlSchemePattern.test(part.trim())) {
                  return part.trim();
                }
              }
            }

            return null;
          }).filter(url => url !== null);

          // Decode URLs
          urlList = urlList.map(url => {
            try {
              return decodeURIComponent(url);
            } catch (e) {
              return url;
            }
          });
        }
      }

      console.log('Extracted URL list:', urlList);

      if (urlList.length === 0) {
        const errorMsg = smartPaste
          ? "No valid URLs found. Try disabling Smart Paste in settings if the content has a specific format."
          : "No valid URLs found in the provided content.";
        console.error('URL extraction failed. Content format might not be recognized.');
        chrome.runtime.sendMessage({ type: "paste", errorMsg });
        return;
      }

      // Validate URLs before opening
      // When Smart Paste is disabled, allow ALL URL schemes (chrome://, file://, etc.)
      // When Smart Paste is enabled, filter out restricted URLs for safety
      const validUrls = urlList.filter(url => {
        try {
          new URL(url);
          // Only filter restricted URLs if Smart Paste is enabled
          if (smartPaste) {
            const isValid = !isRestrictedUrl(url);
            console.log(`URL validation for ${url}: ${isValid} (Smart Paste enabled)`);
            return isValid;
          } else {
            // Smart Paste disabled - allow all valid URLs including chrome://, file://, etc.
            console.log(`URL validation for ${url}: true (Smart Paste disabled - all schemes allowed)`);
            return true;
          }
        } catch (e) {
          console.log(`URL validation failed for ${url}:`, e.message);
          return false;
        }
      });

      console.log('Valid URLs after filtering:', validUrls);

      if (validUrls.length === 0) {
        const errorMsg = smartPaste
          ? "No valid URLs found. URLs must start with http:// or https:// and cannot be restricted URLs like chrome:// or chrome-extension://"
          : "No valid URLs found. Make sure the URLs are properly formatted.";
        chrome.runtime.sendMessage({ type: "paste", errorMsg });
        return;
      }

      console.log(`Opening ${validUrls.length} tabs...`);
      validUrls.forEach(url => {
        console.log(`Creating tab for: ${url}`);
        chrome.tabs.create({ url });
      });

      chrome.runtime.sendMessage({ type: "paste", success: true, urlCount: validUrls.length });
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