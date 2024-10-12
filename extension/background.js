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
  custom: function (tabs, template) {
    const currentDate = getCurrentDate();

    return tabs.map(tab => {
      let output = template.replace(/\$url/g, tab.url).replace(/\$title/g, tab.title);
      output = output.replace(/\$date/g, currentDate);
      return output;
    }).join('\n');
  }
};

const Action = {
  copy: function () {
    chrome.storage.sync.get(['format', 'mime', 'selectedTabsOnly', 'includeAllWindows', 'customTemplate'], function (items) {
      const format = items['format'] || 'text';
      const selectedTabsOnly = items['selectedTabsOnly'] === true;
      const includeAllWindows = items['includeAllWindows'] === true;
      const customTemplate = items['customTemplate'] || '';

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
          case 'custom':
            outputText = CopyTo.custom(filteredTabs, customTemplate);
            break;
          default:
            outputText = CopyTo.text(filteredTabs);
            break;
        }

        chrome.runtime.sendMessage({ type: "copy", copied_url: filteredTabs.length, content: outputText });
      });
    });
  },

  paste: function (content) {
    chrome.storage.sync.get(['format', 'customTemplate'], function (items) {
      const format = items['format'] || 'text';

      if (!content) {
        console.error('No content provided for paste function');
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No content provided for paste function" });
        return;
      }

      let urlList = [];

      if (format === 'custom') {
        const urlPattern = /href=["'](https?:\/\/[^\s"']+)["']/g;
        let match;
        while ((match = urlPattern.exec(content)) !== null) {
          urlList.push(match[1]);
        }
      } else {
        const urlPattern = /(https?:\/\/[^\s"']+)/g;
        urlList = content.match(urlPattern) || [];
        urlList = urlList.map(url => url.trim().replace(/^["']|["']$/g, ''));
      }

      if (urlList.length === 0) {
        chrome.runtime.sendMessage({ type: "paste", errorMsg: "No URL found in the provided content" });
        return;
      }

      urlList.forEach(url => {
        if (url.startsWith('http') || url.startsWith('https')) {
          chrome.tabs.create({ url });
        }
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
