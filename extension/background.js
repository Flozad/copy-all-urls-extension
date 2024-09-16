try {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
      format: 'text',
      mime: 'text/plain',
      selectedTabsOnly: false,
      includeAllWindows: false,
      customTemplate: '',
      defaultBehavior: 'copy'
    }, () => {
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

    console.log('Context menus have been created.');
  });
} catch (error) {
  console.error('Service worker registration failed:', error);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'copyUrls') {
    chrome.windows.getCurrent(function(win) {
      if (chrome.runtime.lastError || !win || !win.id) {
        console.error("Error getting current window or invalid window object:", chrome.runtime.lastError || "Window object is undefined");
        return;
      }
      Action.copy({ window: win });
    });
  } else if (info.menuItemId === 'pasteUrls') {
    Action.paste();
  }
});

function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function processCustomTemplate(template) {
  return template.replace('$date', getCurrentDate());
}

const CopyTo = {
  html: function(tabs) {
    return tabs.map(tab => `<a href="${tab.url}">${tab.title}</a>`).join('<br>');
  },
  json: function(tabs) {
    return JSON.stringify(tabs.map(tab => ({ title: tab.title, url: tab.url })), null, 2);
  },
  text: function(tabs) {
    return tabs.map(tab => `${tab.title}: ${tab.url}`).join('\n');
  },
  custom: function(tabs, template) {
    const processedTemplate = processCustomTemplate(template);
    return tabs.map(tab => processedTemplate.replace(/\$url/g, tab.url).replace(/\$title/g, tab.title)).join('\n');
  }
};

const Action = {
  copy: function(opt) {
    chrome.storage.sync.get(['format', 'mime', 'selectedTabsOnly', 'includeAllWindows', 'customTemplate'], function(items) {
      const format = items['format'] || 'text';
      const extended_mime = items['mime'] === 'html';
      const selectedTabsOnly = items['selectedTabsOnly'] === true;
      const includeAllWindows = items['includeAllWindows'] === true;
      const customTemplate = items['customTemplate'] || '';

      let queryOptions = includeAllWindows ? {} : { windowId: opt.window.id };

      chrome.tabs.query(queryOptions, function(tabs) {
        let filteredTabs = selectedTabsOnly ? tabs.filter(tab => tab.highlighted) : tabs;
        let outputText;

        switch (format) {
          case 'html':
            outputText = CopyTo.html(filteredTabs);
            break;
          case 'json':
            outputText = CopyTo.json(filteredTabs);
            break;
          case 'custom':
            outputText = CopyTo.custom(filteredTabs, customTemplate);
            break;
          default:
            outputText = CopyTo.text(filteredTabs);
            break;
        }

        const activeTab = tabs.find(tab => tab.active);
        if (!activeTab) {
          console.error("No active tab found.");
          return;
        }

        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: (text, extended_mime) => {
            const textarea = document.createElement("textarea");
            document.body.appendChild(textarea);
            textarea.value = text;
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);

            if (extended_mime) {
              document.oncopy = function(e) {
                e.preventDefault();
                e.clipboardData.setData("text/html", text);
                e.clipboardData.setData("text/plain", text);
              };
            }
          },
          args: [outputText, extended_mime],
        });

        chrome.runtime.sendMessage({ type: "copy", copied_url: filteredTabs.length, content: outputText });
      });
    });
  },

  paste: function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || tabs.length === 0) {
        console.error("No active tab found.");
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const textarea = document.createElement("textarea");
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("paste");
          const clipboardContent = textarea.value;
          document.body.removeChild(textarea);
          return clipboardContent;
        }
      }, (results) => {
        if (!results || results.length === 0) {
          console.error("Failed to retrieve clipboard content.");
          return;
        }

        const clipboardString = results[0].result;
        const urlList = clipboardString.match(/(https?:\/\/[^\s]+)/g) || [];

        if (urlList.length === 0) {
          chrome.runtime.sendMessage({ type: "paste", errorMsg: "No URL found in the clipboard" });
          return;
        }

        urlList.forEach(url => chrome.tabs.create({ url }));
      });
    });
  }
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === "copy") {
    chrome.windows.getCurrent(function(win) {
      if (chrome.runtime.lastError || !win || !win.id) {
        console.error("Error getting current window or invalid window object:", chrome.runtime.lastError || "Window object is undefined");
        return;
      }
      Action.copy({ window: win });
    });
  } else if (request.type === "paste") {
    Action.paste();
  }
});

chrome.action.onClicked.addListener(function(tab) {
  chrome.storage.sync.get(['defaultBehavior'], function(items) {
    if (items.defaultBehavior === 'copy') {
      chrome.windows.getCurrent(function(win) {
        if (chrome.runtime.lastError || !win || !win.id) {
          console.error("Error getting current window or invalid window object:", chrome.runtime.lastError || "Window object is undefined");
          return;
        }
        Action.copy({ window: win });
      });
    } else if (items.defaultBehavior === 'paste') {
      Action.paste();
    } else {
      chrome.runtime.openOptionsPage();
    }
  });
});
