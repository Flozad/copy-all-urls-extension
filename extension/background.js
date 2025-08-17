// Centralized default settings - must match options.js
const DEFAULT_SETTINGS = {
  format: 'url_only',
  anchor: 'url',
  customTemplate: '',
  smartPaste: false,
  includeAllWindows: false,
  selectedTabsOnly: false,
  defaultBehavior: 'menu',
  mimeType: 'plaintext',
  delimiter: '\t'
};

// Storage utility with error handling and fallbacks
const StorageUtil = {
  async setWithFallback(key, value, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.sync.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
        return true;
      } catch (error) {
        console.warn(`Storage set attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          // Fallback to local storage
          try {
            await new Promise((resolve, reject) => {
              chrome.storage.local.set({ [key]: value }, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
            console.log(`Fallback to local storage successful for ${key}`);
            return true;
          } catch (localError) {
            console.error(`Both sync and local storage failed for ${key}:`, localError);
            return false;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // Exponential backoff
      }
    }
    return false;
  },

  async getWithFallback(keys, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await new Promise((resolve, reject) => {
          chrome.storage.sync.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        });
      } catch (error) {
        console.warn(`Storage get attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          // Fallback to local storage
          try {
            const localResult = await new Promise((resolve, reject) => {
              chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(result);
                }
              });
            });
            console.log('Using fallback local storage');
            return localResult;
          } catch (localError) {
            console.error('Both sync and local storage failed:', localError);
            // Return defaults if both storages fail
            return typeof keys === 'object' ? keys : DEFAULT_SETTINGS;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // Exponential backoff
      }
    }
    return typeof keys === 'object' ? keys : DEFAULT_SETTINGS;
  }
};

try {
  chrome.runtime.onInstalled.addListener(async () => {
    // Initialize default settings with error handling
    let allSuccessful = true;
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const success = await StorageUtil.setWithFallback(key, value);
      if (!success) {
        allSuccessful = false;
        console.error(`Failed to set default for ${key}`);
      }
    }
    
    if (allSuccessful) {
      console.log('Default settings have been set successfully.');
    } else {
      console.error('Some default settings failed to initialize.');
    }

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
    return tabs.map(tab => `${tab.url}`).join('\n');
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
    return tabs.map(tab => `${tab.title}${delimiter}${tab.url}`).join('\n');
  }
};

const Action = {
  copy: async function () {
    try {
      const items = await StorageUtil.getWithFallback(DEFAULT_SETTINGS);
      const format = items['format'] || DEFAULT_SETTINGS.format;
      const selectedTabsOnly = items['selectedTabsOnly'] === true;
      const includeAllWindows = items['includeAllWindows'] === true;
      const customTemplate = items['customTemplate'] || DEFAULT_SETTINGS.customTemplate;
      const delimiter = items['delimiter'] || DEFAULT_SETTINGS.delimiter;

      const queryOptions = includeAllWindows ? {} : { currentWindow: true };

      chrome.tabs.query(queryOptions, function (tabs) {
        const filteredTabs = selectedTabsOnly ? tabs.filter(tab => tab.highlighted) : tabs;

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

        chrome.runtime.sendMessage({ type: "copy", copied_url: filteredTabs.length, content: outputText });
      });
    } catch (error) {
      console.error('Error in copy action:', error);
      chrome.runtime.sendMessage({ type: "copy", error: error.message });
    }
  },

  paste: async function (content) {
    try {
      const items = await StorageUtil.getWithFallback(DEFAULT_SETTINGS);
      const format = items['format'] || DEFAULT_SETTINGS.format;
      const smartPaste = items['smartPaste'] === true;

      if (!content) {
        console.error('No content provided for paste function');
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No content provided for paste function" });
        return;
      }

      let urlList = [];

      if (smartPaste) {
        // Extract URLs using regex
        const urlPattern = /([a-zA-Z]+:\/\/[^\s"']+)/g;
        urlList = content.match(urlPattern) || [];
        urlList = urlList.map(url => url.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Treat each line as a separate URL
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
    } catch (error) {
      console.error('Error in paste action:', error);
      chrome.runtime.sendMessage({ type: "paste", error: error.message });
    }
  }
};

chrome.runtime.onMessage.addListener(function (request) {
  if (request.type === "copy") {
    Action.copy();
  } else if (request.type === "paste") {
    Action.paste(request.content);
  }
});

chrome.action.onClicked.addListener(async function () {
  try {
    const items = await StorageUtil.getWithFallback(DEFAULT_SETTINGS);
    const defaultBehavior = items.defaultBehavior || DEFAULT_SETTINGS.defaultBehavior;
    
    if (defaultBehavior === 'copy') {
      Action.copy();
    } else if (defaultBehavior === 'paste') {
      try {
        const text = await navigator.clipboard.readText();
        Action.paste(text);
      } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
      }
    } else {
      chrome.runtime.openOptionsPage();
    }
  } catch (error) {
    console.error('Error in action click handler:', error);
    // Fallback to options page if storage fails
    chrome.runtime.openOptionsPage();
  }
});
