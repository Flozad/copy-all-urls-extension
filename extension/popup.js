// Theme management
function applyTheme(theme) {
  // Remove all theme classes
  document.body.classList.remove('theme-auto', 'theme-light', 'theme-dark');

  // Add the appropriate theme class
  if (theme === 'auto') {
    document.body.classList.add('theme-auto');
  } else if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  }
}

// Helper function to show messages with smooth transitions
function showMessage(text, type = 'success') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.classList.remove('opacity-0', 'bg-green-200', 'bg-red-100', 'text-green-800', 'text-red-700');

  if (type === 'success') {
    messageEl.classList.add('bg-green-200', 'text-green-800');
  } else {
    messageEl.classList.add('bg-red-100', 'text-red-700');
  }

  messageEl.classList.add('opacity-100');

  setTimeout(() => {
    messageEl.classList.remove('opacity-100');
    messageEl.classList.add('opacity-0');
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.classList.remove('bg-green-200', 'bg-red-100', 'text-green-800', 'text-red-700');
    }, 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', async function() {
  // Load and apply theme
  chrome.storage.sync.get(['theme'], function(result) {
    const theme = result.theme || DEFAULT_SETTINGS.theme;
    applyTheme(theme);
  });

  // Auto-copy on popup open (if enabled in settings)
  try {
    const settings = await chrome.storage.sync.get(['autoAction']);
    const autoAction = settings.autoAction === true; // Default to FALSE - no auto-copy

    if (autoAction) {
      // Wait a short moment for the popup to fully initialize
      setTimeout(() => {
        // Send message to background script to copy URLs when popup opens
        chrome.runtime.sendMessage({ type: 'copy' }, (response) => {
        });
      }, 100);
    }
  } catch (error) {
    console.error('Error checking auto-action setting:', error);
    // DO NOT auto-copy on error - let user click button manually
  }

  // Paste source management
  let currentPasteSource = 'clipboard'; // clipboard or textarea

  // Load stored paste source
  chrome.storage.local.get(['pasteSource'], function(result) {
    currentPasteSource = result.pasteSource || 'clipboard';
    updateSourceIndicator(currentPasteSource);
  });

  // Auto-copy toggle management
  const autoCopyToggle = document.getElementById('autoCopyToggle');

  // Load current auto-copy setting
  chrome.storage.sync.get(['autoAction'], function(result) {
    autoCopyToggle.checked = result.autoAction === true;
  });

  // Handle auto-copy toggle changes
  autoCopyToggle.addEventListener('change', function() {
    const isEnabled = this.checked;
    chrome.storage.sync.set({ autoAction: isEnabled }, function() {
      const message = isEnabled
        ? 'Auto-copy enabled - URLs will copy when popup opens'
        : 'Auto-copy disabled';
      showMessage(message, 'success');
    });
  });

  document.getElementById('actionCopy').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'copy' });
  });

  document.getElementById('actionPaste').addEventListener('click', async function() {
    const textareaContent = document.getElementById('copiedContent').value;

    if (currentPasteSource === 'textarea') {
      // Use textarea
      if (!textareaContent || textareaContent.trim() === '') {
        showMessage('Textarea is empty. Please paste URLs here first.', 'error');
        return;
      }
      chrome.runtime.sendMessage({ type: 'paste', content: textareaContent });
    } else {
      // Use clipboard - prefer plain text for better URL extraction
      try {
        let content = '';

        try {
          // Try to read clipboard items
          const clipboardItems = await navigator.clipboard.read();

          for (const item of clipboardItems) {
            // Prefer plain text over HTML for URL pasting
            if (item.types.includes('text/plain')) {
              const textBlob = await item.getType('text/plain');
              content = await textBlob.text();
              console.log('Read plain text from clipboard');
              break;
            }

            // Fallback to HTML if plain text not available
            if (item.types.includes('text/html')) {
              const htmlBlob = await item.getType('text/html');
              content = await htmlBlob.text();
              console.log('Read HTML from clipboard (plain text not available)');
              break;
            }
          }
        } catch (e) {
          console.log('Clipboard.read() failed, falling back to readText():', e);
          // Fallback to simple text reading
          content = await navigator.clipboard.readText();
        }

        if (!content || content.trim() === '') {
          showMessage('Clipboard is empty. Copy some URLs first.', 'error');
          return;
        }

        chrome.runtime.sendMessage({ type: 'paste', content: content });
      } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        showMessage('Failed to read clipboard. Check permissions.', 'error');
      }
    }
  });

  // Options button click handler
  const optionsButton = document.getElementById('optionsButton');
  if (optionsButton) {
    optionsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  }

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
            showMessage(`Copied ${request.copied_url} URLs as HTML!`);
          }).catch(function(err) {
            // Fallback to plain text
            return navigator.clipboard.writeText(plainTextContent);
          }).then(function() {
            showMessage(`Copied ${request.copied_url} URLs to clipboard!`);
          }).catch(function(err) {
            showMessage('Failed to copy to clipboard', 'error');
          });
        } catch (err) {
          // Fallback to simple plain text copy
          navigator.clipboard.writeText(request.content).then(function() {
            showMessage(`Copied ${request.copied_url} URLs to clipboard!`);
          }).catch(function(err) {
            showMessage('Failed to copy to clipboard', 'error');
          });
        }
      } else {
        // Plain text copy
        navigator.clipboard.writeText(request.content).then(function() {
          showMessage(`Copied ${request.copied_url} URLs to clipboard!`);
        }).catch(function(err) {
          showMessage('Failed to copy to clipboard', 'error');
        });
      }
    } else if (request.type === "paste") {
      if (request.success) {
        showMessage(`${request.urlCount} URLs opened successfully!`);
      } else if (request.errorMsg) {
        showMessage(`Error: ${request.errorMsg}`, 'error');
      } else if (request.error) {
        showMessage(`Error: ${request.error}`, 'error');
      }
    }
  });

  // Format dropdown handling
  const formatDropdownToggle = document.getElementById('formatDropdownToggle');
  const formatDropdown = document.getElementById('formatDropdown');
  const formatOptions = document.querySelectorAll('.format-option');
  const delimiterInput = document.getElementById('delimiterInput');
  const customTemplateInput = document.getElementById('customTemplateInput');
  const advancedSettings = document.getElementById('formatAdvancedSettings');
  const delimitedSettings = document.getElementById('delimitedSettings');
  const customSettings = document.getElementById('customSettings');

  let currentFormat = DEFAULT_SETTINGS.format;

  // Source dropdown handling
  const currentSourceIndicator = document.getElementById('currentSourceIndicator');
  const sourceDropdown = document.getElementById('sourceDropdown');
  const sourceOptions = document.querySelectorAll('.source-option');

  // Map format codes to display names
  const formatDisplayNames = {
    'url_only': 'URL Only',
    'text': 'Text (URL + Title)',
    'html': 'HTML',
    'json': 'JSON',
    'delimited': 'Delimited',
    'custom': 'Custom'
  };

  // Map source codes to display names
  const sourceDisplayNames = {
    'clipboard': 'Clipboard',
    'textarea': 'Textarea'
  };

  // Function to update format indicator
  function updateFormatIndicator(format) {
    const indicator = document.getElementById('currentFormatIndicator');
    if (indicator) {
      const displayName = formatDisplayNames[format] || format;
      const span = indicator.querySelector('span');
      if (span) {
        span.textContent = `Format: ${displayName}`;
      } else {
        // Fallback if span not found (shouldn't happen)
        indicator.textContent = `Format: ${displayName}`;
      }
    }
  }

  // Function to update source indicator
  function updateSourceIndicator(source) {
    const indicator = document.getElementById('currentSourceIndicator');
    if (indicator) {
      const displayName = sourceDisplayNames[source] || source;
      const span = indicator.querySelector('span');
      if (span) {
        span.textContent = `Paste: ${displayName}`;
      }
    }
    updateSourceCheckmark(source);
  }

  function updateSourceCheckmark(source) {
    // Remove all checkmarks
    sourceOptions.forEach(opt => {
      const check = opt.querySelector('span');
      if (check) check.textContent = '';
    });

    // Add checkmark to selected
    const selectedOption = document.querySelector(`.source-option[data-source="${source}"]`);
    if (selectedOption) {
      let check = selectedOption.querySelector('span');
      if (check) {
        check.textContent = '✓';
      }
    }
  }

  // Function to show/hide advanced settings based on format
  function updateAdvancedSettings(format) {
    if (advancedSettings && delimitedSettings && customSettings) {
      advancedSettings.classList.toggle('hidden', format !== 'delimited' && format !== 'custom');
      delimitedSettings.classList.toggle('hidden', format !== 'delimited');
      customSettings.classList.toggle('hidden', format !== 'custom');
    }
  }

  // Load saved format
  chrome.storage.sync.get(['format'], function(items) {
    if (items.format) {
      currentFormat = items.format;
      updateFormatCheckmark(currentFormat);
      updateFormatIndicator(currentFormat);
      updateAdvancedSettings(currentFormat);
    } else {
      updateFormatIndicator(currentFormat);
      updateAdvancedSettings(currentFormat);
    }
  });

  // Toggle dropdown
  if (formatDropdownToggle) {
    formatDropdownToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      formatDropdown.classList.toggle('hidden');
    });
  }

  // Make format indicator clickable to open dropdown
  const formatIndicator = document.getElementById('currentFormatIndicator');
  if (formatIndicator) {
    formatIndicator.addEventListener('click', function(e) {
      e.stopPropagation();
      formatDropdown.classList.toggle('hidden');
    });
  }

  // Make source indicator clickable to open dropdown
  if (currentSourceIndicator && sourceDropdown) {
    currentSourceIndicator.addEventListener('click', function(e) {
      e.stopPropagation();
      sourceDropdown.classList.toggle('hidden');
      // Close format dropdown if open
      if (formatDropdown && !formatDropdown.classList.contains('hidden')) {
        formatDropdown.classList.add('hidden');
      }
    });
  }

  // Handle source selection
  sourceOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      e.stopPropagation();
      const source = this.dataset.source;
      currentPasteSource = source;

      // Update indicator
      updateSourceIndicator(source);

      // Hide dropdown
      sourceDropdown.classList.add('hidden');

      // Save to storage
      chrome.storage.local.set({ pasteSource: source });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function() {
    if (formatDropdown && !formatDropdown.classList.contains('hidden')) {
      formatDropdown.classList.add('hidden');
    }
    if (sourceDropdown && !sourceDropdown.classList.contains('hidden')) {
      sourceDropdown.classList.add('hidden');
    }
  });

  // Handle format selection
  formatOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      e.stopPropagation();
      const format = this.dataset.format;
      currentFormat = format;

      // Update checkmark
      updateFormatCheckmark(format);

      // Update format indicator
      updateFormatIndicator(format);

      // Show/hide advanced settings
      updateAdvancedSettings(format);

      // Hide dropdown
      formatDropdown.classList.add('hidden');

      // Save and re-copy
      chrome.storage.sync.set({ format: format }, () => {
        chrome.runtime.sendMessage({ type: 'copy' });
      });
    });
  });

  function updateFormatCheckmark(format) {
    // Remove all checkmarks
    formatOptions.forEach(opt => {
      const check = opt.querySelector('span');
      if (check) check.textContent = '';
    });

    // Add checkmark to selected
    const selectedOption = document.querySelector(`.format-option[data-format="${format}"]`);
    if (selectedOption) {
      let check = selectedOption.querySelector('span');
      if (!check) {
        check = document.createElement('span');
        check.className = 'mr-2';
        selectedOption.insertBefore(check, selectedOption.firstChild);
      }
      check.textContent = '✓';
    }
  }

  // Set default values for advanced inputs
  if (delimiterInput) {
    delimiterInput.value = DEFAULT_SETTINGS.delimiter;
  }
  if (customTemplateInput) {
    customTemplateInput.value = DEFAULT_SETTINGS.customTemplate;
  }

  // Load saved settings and update if different from defaults
  chrome.storage.sync.get(['delimiter', 'customTemplate'], function(settings) {
    // Update delimiter if stored value exists and is different
    if (delimiterInput && settings.delimiter !== undefined) {
      const delimiter = settings.delimiter;
      if (delimiter === '\\t') {
        delimiterInput.value = '\\t';
      } else if (delimiter === '\\n') {
        delimiterInput.value = '\\n';
      } else if (delimiter === '\\r') {
        delimiterInput.value = '\\r';
      } else {
        delimiterInput.value = delimiter;
      }
    }

    // Update custom template if stored value exists and is different
    if (customTemplateInput && settings.customTemplate !== undefined) {
      customTemplateInput.value = settings.customTemplate;
    }
  });

  // Save delimiter changes and instantly update preview
  if (delimiterInput) {
    delimiterInput.addEventListener('input', function(e) {
      let value = e.target.value;
      // If empty, default to --
      if (!value.trim()) {
        value = '--';
        this.value = value;
      }
      chrome.storage.sync.set({ delimiter: value }, () => {
        // Instantly re-copy with new delimiter to show user what they'll get
        chrome.runtime.sendMessage({ type: 'copy' });
      });
    });
  }

  // Save custom template changes and instantly update preview
  if (customTemplateInput) {
    customTemplateInput.addEventListener('input', function(e) {
      chrome.storage.sync.set({ customTemplate: e.target.value }, () => {
        // Instantly re-copy with new template to show user what they'll get
        chrome.runtime.sendMessage({ type: 'copy' });
      });
    });
  }

});