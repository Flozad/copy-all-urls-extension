// Centralized default settings
const DEFAULT_SETTINGS = {
  format: 'url_only',
  mime: 'text/plain',
  selectedTabsOnly: false,
  includeAllWindows: false,
  customTemplate: '',
  defaultBehavior: 'copy',  // Ensure this is set to 'copy'
  smartPaste: true,
  delimiter: '--',
  autoAction: true  // New setting to control automatic copy on popup open
};

try {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      console.log('Default settings have been set.');
    });

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
  });
} catch (error) {
  console.error('Service worker registration failed:', error);
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'copyUrls') {
    Action.copy();
  } else if (info.menuItemId === 'pasteUrls') {
    navigator.clipboard.readText().then(function(text) {
      Action.paste(text);
    }).catch(function(err) {
      console.error('Failed to read clipboard contents: ', err);
    });
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
  html: function (tabs) {
    return tabs.map(tab => `<a href="${tab.url}">${tab.title}</a>`).join('<br>');
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
    chrome.storage.sync.get(['format', 'mime', 'selectedTabsOnly', 'includeAllWindows', 'customTemplate', 'delimiter'], function (items) {
      const format = items['format'] || 'url_only';
      const selectedTabsOnly = items['selectedTabsOnly'] === true;
      const includeAllWindows = items['includeAllWindows'] === true;
      const customTemplate = items['customTemplate'] || '';
      const delimiter = items['delimiter'] || '\t';

      const queryOptions = includeAllWindows ? {} : { currentWindow: true };

      chrome.tabs.query(queryOptions, function (tabs) {
        const filteredTabs = selectedTabsOnly ? tabs.filter(tab => tab.highlighted) : tabs;

        if (filteredTabs.length === 0) {
          chrome.runtime.sendMessage({ 
            type: "copy", 
            error: "No tabs found to copy" 
          });
          return;
        }

        let outputText;

        switch (format) {
          case 'html':
            outputText = CopyTo.html(filteredTabs);
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

      if (!content) {
        console.error('No content provided for paste function');
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No content provided for paste function" });
        return;
      }

      let urlList = [];

      if (smartPaste) {
        // Extract URLs using regex - improved pattern to handle more URL formats
        const urlPattern = /(https?:\/\/[^\s"'<>\]]+)/g;
        urlList = content.match(urlPattern) || [];
        urlList = urlList.map(url => url.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Check if content looks like HTML first
        if (content.includes('<a href=') && content.includes('</a>')) {
          // HTML content - extract all URLs from href attributes
          const htmlUrlPattern = /href\s*=\s*["']([^"']+)["']/gi;
          const matches = [...content.matchAll(htmlUrlPattern)];
          urlList = matches.map(match => match[1].trim());
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
            urlList = lines.map(line => {
              if (line.startsWith('http://') || line.startsWith('https://')) {
                return line.trim();
              } else if (line.includes(': http')) {
                const match = line.match(/: (https?:\/\/[^\s]+)/);
                return match ? match[1].trim() : null;
              } else if (line.includes(delimiter)) {
                const parts = line.split(delimiter);
                for (const part of parts) {
                  if (part.trim().startsWith('http://') || part.trim().startsWith('https://')) {
                    return part.trim();
                  }
                }
              }
              return null;
            }).filter(url => url !== null);
          }
        }
      }

      if (urlList.length === 0) {
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No valid URLs found in the provided content. Make sure the content contains URLs starting with http:// or https://" });
        return;
      }

      // Validate URLs before opening
      const validUrls = urlList.filter(url => {
        try {
          new URL(url);
          return true;
        } catch (e) {
          return false;
        }
      });

      if (validUrls.length === 0) {
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No valid URLs found. URLs must start with http:// or https://" });
        return;
      }

      validUrls.forEach(url => {
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
  }
});

chrome.action.onClicked.addListener(function () {
  chrome.storage.sync.get(['defaultBehavior'], function (items) {
    if (items.defaultBehavior === 'copy') {
      Action.copy();
    } else if (items.defaultBehavior === 'paste') {
      navigator.clipboard.readText().then(function(text) {
        Action.paste(text);
      }).catch(function(err) {
        console.error('Failed to read clipboard contents: ', err);
      });
    } else {
      chrome.runtime.openOptionsPage();
    }
  });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('Command triggered:', command);
  
  if (command === 'copy-urls') {
    Action.copy();
  } else if (command === 'paste-urls') {
    navigator.clipboard.readText().then(function(text) {
      Action.paste(text);
    }).catch(function(err) {
      console.error('Failed to read clipboard contents for paste shortcut: ', err);
    });
  }
});