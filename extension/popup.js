document.addEventListener('DOMContentLoaded', async function() {
  // Wait a short moment for the popup to fully initialize
  setTimeout(() => {
    // Send message to background script to copy URLs when popup opens
    chrome.runtime.sendMessage({ type: 'copy' }, (response) => {
    });
  }, 100);

  // Initialize paste source from storage immediately
  try {
    const result = await StorageUtil.getWithFallback('pasteSource');
    const pasteSource = result.pasteSource || 'clipboard';
    const radio = document.querySelector(`input[name="pasteSource"][value="${pasteSource}"]`);
    if (radio) {
      radio.checked = true;
      // If clipboard is selected, focus the button, otherwise focus textarea
      if (pasteSource === 'clipboard') {
        document.getElementById('actionPaste').focus();
      } else {
        document.getElementById('copiedContent').focus();
      }
    }
  } catch (error) {
    console.error('Failed to load paste source:', error);
    // Use default value
    const radio = document.querySelector('input[name="pasteSource"][value="clipboard"]');
    if (radio) {
      radio.checked = true;
      document.getElementById('actionPaste').focus();
    }
  }

  document.getElementById('actionCopy').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'copy' });
  });

  document.getElementById('actionPaste').addEventListener('click', async function() {
    const pasteSource = document.querySelector('input[name="pasteSource"]:checked').value;
    if (pasteSource === 'clipboard') {
      try {
        const text = await navigator.clipboard.readText();
        if (!text || text.trim() === '') {
          document.getElementById('message').textContent = 'Clipboard is empty or contains no text';
          setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
          return;
        }
        chrome.runtime.sendMessage({ type: 'paste', content: text });
      } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        document.getElementById('message').textContent = 'Failed to read clipboard. Please paste manually in textarea.';
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
      }
    } else {
      const textareaContent = document.getElementById('copiedContent').value;
      if (!textareaContent || textareaContent.trim() === '') {
        document.getElementById('message').textContent = 'Textarea is empty. Please paste some URLs.';
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
        return;
      }
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
      
      if (request.mimeType === 'html') {
        // For HTML content, write both HTML and plain text to clipboard
        try {
          const htmlContent = request.content;
          const plainTextContent = request.content
            .replace(/<[^>]*>/g, '')
            .replace(/&[^;]+;/g, '')
            .trim();
          
          const clipboardData = {
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([plainTextContent], { type: 'text/plain' })
          };
          
          const clipboardItem = new ClipboardItem(clipboardData);
          
          navigator.clipboard.write([clipboardItem]).then(function() {
            document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard as HTML!`;
            setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
          }).catch(function(err) {
            // Fallback to plain text
            return navigator.clipboard.writeText(plainTextContent);
          }).then(function() {
            document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard!`;
            setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
          }).catch(function(err) {
            document.getElementById('message').textContent = 'Failed to copy to clipboard';
            setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
          });
        } catch (err) {
          // Fallback to simple plain text copy
          navigator.clipboard.writeText(request.content).then(function() {
            document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard!`;
            setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
          }).catch(function(err) {
            document.getElementById('message').textContent = 'Failed to copy to clipboard';
            setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
          });
        }
      } else {
        // Plain text copy
        navigator.clipboard.writeText(request.content).then(function() {
          document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard!`;
          setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
        }).catch(function(err) {
          document.getElementById('message').textContent = 'Failed to copy to clipboard';
          setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
        });
      }
    } else if (request.type === "paste") {
      if (request.success) {
        document.getElementById('message').textContent = `${request.urlCount} URLs opened successfully!`;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
      } else if (request.errorMsg) {
        document.getElementById('message').textContent = `Error: ${request.errorMsg}`;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
      } else if (request.error) {
        document.getElementById('message').textContent = `Error: ${request.error}`;
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
    delimiter: '--',
    customTemplate: '{title} - {url}'
  }, function(settings) {
    // Set format dropdown
    document.getElementById('formatSelector').value = settings.format;
    
    // Set input values with proper handling of special characters
    const delimiterInput = document.getElementById('delimiterInput');
    if (settings.delimiter === '\\t') {
      delimiterInput.value = '\\t';
    } else if (settings.delimiter === '\\n') {
      delimiterInput.value = '\\n';
    } else if (settings.delimiter === '\\r') {
      delimiterInput.value = '\\r';
    } else {
      delimiterInput.value = settings.delimiter;
    }
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
    let value = e.target.value;
    // If empty, default to --
    if (!value.trim()) {
      value = '--';
      this.value = value;
    }
    chrome.storage.sync.set({ delimiter: value });
  });

  // Save custom template changes
  document.getElementById('customTemplateInput').addEventListener('input', function(e) {
    chrome.storage.sync.set({ customTemplate: e.target.value });
  });

  // Add paste event listener to textarea
  document.getElementById('copiedContent').addEventListener('paste', function(e) {
    // Small delay to ensure the paste content is in the textarea
    setTimeout(() => {
      if (this.value.trim()) {
        document.getElementById('actionPaste').focus();
      }
    }, 100);
  });

  // Export functionality
  const exportButton = document.getElementById('exportButton');
  const exportDropdown = document.getElementById('exportDropdown');
  const exportFormatButtons = document.querySelectorAll('.export-format-btn');

  // Toggle dropdown
  exportButton.addEventListener('click', function(e) {
    e.stopPropagation();
    exportDropdown.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function() {
    exportDropdown.classList.add('hidden');
  });

  exportFormatButtons.forEach(button => {
    button.addEventListener('click', function() {
      const format = this.dataset.format;
      const content = document.getElementById('copiedContent').value;
      
      let exportContent = '';
      if (format === 'txt') {
        exportContent = content;
      } else if (format === 'csv') {
        let lines;
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].title || parsed[0].url)) {
            lines = parsed.map(item => {
              if (item.title && item.url) {
                return `${item.title}\t${item.url}`;
              }
              return item.url || item.title || '';
            });
          } else {
            lines = content.split('\n').filter(line => line.trim());
          }
        } catch (e) {
          lines = content.split('\n').filter(line => line.trim());
        }

        exportContent = 'url,title\n' + lines.map(line => {
          const [title, url] = line.split('\t');
          if (url) {
            return `${url.trim()},${title.trim()}`;
          }
          return `${line.trim()},`;
        }).join('\n');
      }

      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `urls.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      exportDropdown.classList.add('hidden');
      document.getElementById('message').textContent = `URLs exported as ${format.toUpperCase()}!`;
      setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
    });
  });
});