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
      
      // Handle HTML vs plain text clipboard
      if (request.mimeType === 'html') {
        // For HTML content, write both HTML and plain text to clipboard
        // Add proper HTML structure for better compatibility
        const htmlContent = `<meta charset='utf-8'>${request.content}`;
        const plainTextContent = request.content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '');
        
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainTextContent], { type: 'text/plain' });
        
        // Try to include multiple format types for better compatibility
        const clipboardData = {
          'text/html': htmlBlob,
          'text/plain': textBlob
        };
        
        const clipboardItem = new ClipboardItem(clipboardData);
        
        navigator.clipboard.write([clipboardItem]).then(function() {
          console.log('Copied HTML to clipboard successfully!');
          document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard as HTML!`;
          setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
        }, function(err) {
          console.error('Could not copy HTML: ', err);
          // Fallback to plain text
          navigator.clipboard.writeText(request.content).then(function() {
            console.log('Copied as plain text fallback!');
            document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard!`;
            setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
          });
        });
      } else {
        // Plain text copy
        navigator.clipboard.writeText(request.content).then(function() {
          console.log('Copied to clipboard successfully!');
          document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard!`;
          setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
        }, function(err) {
          console.error('Could not copy text: ', err);
        });
      }
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
        // For TXT, just use the exact content from input
        exportContent = content;
      } else if (format === 'csv') {
        // Check if content is JSON for CSV export
        let lines;
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].title || parsed[0].url)) {
            // Convert JSON to lines format
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
          // Not JSON, process normally
          lines = content.split('\n').filter(line => line.trim());
        }

        // Create CSV
        exportContent = 'url,title\n' + lines.map(line => {
          const [title, url] = line.split('\t');
          if (url) {
            return `${url.trim()},${title.trim()}`;
          }
          return `${line.trim()},`;
        }).join('\n');
      }

      // Create and trigger download
      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `urls.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Close dropdown and show success message
      exportDropdown.classList.add('hidden');
      document.getElementById('message').textContent = `URLs exported as ${format.toUpperCase()}!`;
      setTimeout(() => { document.getElementById('message').textContent = ''; }, 5000);
    });
  });
});
