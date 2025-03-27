document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('actionCopy').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'copy' });
  });

  document.getElementById('actionPaste').addEventListener('click', function() {
    const pasteSource = document.querySelector('input[name="pasteSource"]:checked').value;
    if (pasteSource === 'clipboard') {
      navigator.clipboard.readText().then(function(text) {
        chrome.runtime.sendMessage({ type: 'paste', content: text });
      }).catch(function(err) {
        console.error('Failed to read clipboard contents: ', err);
      });
    } else {
      const textareaContent = document.getElementById('copiedContent').value;
      chrome.runtime.sendMessage({ type: 'paste', content: textareaContent });
    }
  });

  document.getElementById('actionOption').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // Restore the last selected paste source
  chrome.storage.local.get(['pasteSource'], function(result) {
    const pasteSource = result.pasteSource || 'clipboard';
    document.querySelector(`input[name="pasteSource"][value="${pasteSource}"]`).checked = true;
  });

  // Save paste source selection
  const pasteSourceRadios = document.querySelectorAll('input[name="pasteSource"]');
  pasteSourceRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      chrome.storage.local.set({ pasteSource: this.value });
    });
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "copy") {
      document.getElementById('copiedContent').value = request.content;
      navigator.clipboard.writeText(request.content).then(function() {
        console.log('Copied to clipboard successfully!');
        document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard!`;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
      }, function(err) {
        console.error('Could not copy text: ', err);
      });
    } else if (request.type === "paste") {
      if (request.success) {
        document.getElementById('message').textContent = `${request.urlCount} URLs opened successfully!`;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
      } else if (request.errorMsg) {
        document.getElementById('message').textContent = request.errorMsg;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
      }
    }
  });

  // Load the current format setting when popup opens
  chrome.storage.sync.get(['format'], function(items) {
    const formatSelector = document.getElementById('formatSelector');
    if (formatSelector && items.format) {
      formatSelector.value = items.format;
    }
  });
  
  // Set up the format selector change event
  const formatSelector = document.getElementById('formatSelector');
  if (formatSelector) {
    formatSelector.addEventListener('change', function(e) {
      const format = e.target.value;
      const advancedSettings = document.getElementById('formatAdvancedSettings');
      const delimitedSettings = document.getElementById('delimitedSettings');
      const customSettings = document.getElementById('customSettings');
      
      // Show/hide appropriate settings
      advancedSettings.classList.toggle('hidden', format !== 'delimited' && format !== 'custom');
      delimitedSettings.classList.toggle('hidden', format !== 'delimited');
      customSettings.classList.toggle('hidden', format !== 'custom');
      
      // Save format selection
      chrome.storage.sync.set({ format: format });
    });
  }

  // Load saved settings
  chrome.storage.sync.get({
    format: 'text',
    delimiter: '\t',
    customTemplate: '{title} - {url}'
  }, function(settings) {
    // Set format dropdown
    document.getElementById('formatSelector').value = settings.format;
    
    // Set input values
    document.getElementById('delimiterInput').value = settings.delimiter;
    document.getElementById('customTemplateInput').value = settings.customTemplate;
    
    // Show/hide settings based on format
    const advancedSettings = document.getElementById('formatAdvancedSettings');
    const delimitedSettings = document.getElementById('delimitedSettings');
    const customSettings = document.getElementById('customSettings');
    
    advancedSettings.classList.toggle('hidden', settings.format !== 'delimited' && settings.format !== 'custom');
    delimitedSettings.classList.toggle('hidden', settings.format !== 'delimited');
    customSettings.classList.toggle('hidden', settings.format !== 'custom');
  });

  // Save delimiter changes
  document.getElementById('delimiterInput').addEventListener('input', function(e) {
    chrome.storage.sync.set({ delimiter: e.target.value });
  });

  // Save custom template changes
  document.getElementById('customTemplateInput').addEventListener('input', function(e) {
    chrome.storage.sync.set({ customTemplate: e.target.value });
  });
});
