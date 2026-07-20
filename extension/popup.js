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

// Put an HTML copy on the clipboard as two flavors, so pasting into a rich
// editor yields live links and pasting into a plain field yields the URLs.
// Falls back to plain text wherever ClipboardItem is unavailable or rejected.
function writeRichClipboard(htmlContent, plainTextContent) {
  return new Promise((resolve, reject) => {
    let item;
    try {
      item = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([plainTextContent], { type: 'text/plain' })
      });
    } catch (err) {
      navigator.clipboard.writeText(plainTextContent).then(resolve, reject);
      return;
    }

    navigator.clipboard
      .write([item])
      .then(resolve, () =>
        navigator.clipboard.writeText(plainTextContent).then(resolve, reject)
      );
  });
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
        // Send message to background script to copy URLs when popup opens.
        // No callback: the background never calls sendResponse for this type,
        // so a callback would leave chrome.runtime.lastError set and unread on
        // every auto-copy. The result arrives via the onMessage listener below.
        chrome.runtime.sendMessage({ type: 'copy' }).catch(() => {
          /* background not ready yet — the user can still copy manually */
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
      // Use clipboard - prefer plain text, but keep the HTML flavor too.
      // Copying rendered links puts only the link *labels* in text/plain; the
      // URLs live in the href attributes, so the background needs the HTML to
      // fall back on or rich-link paste fails with "No URL found".
      try {
        let content = '';
        let html = '';

        try {
          // Try to read clipboard items
          const clipboardItems = await navigator.clipboard.read();

          for (const item of clipboardItems) {
            if (item.types.includes('text/html')) {
              const htmlBlob = await item.getType('text/html');
              html = await htmlBlob.text();
            }
            if (item.types.includes('text/plain')) {
              const textBlob = await item.getType('text/plain');
              content = await textBlob.text();
            }
            if (content || html) {
              break;
            }
          }
        } catch (e) {
          console.warn('Clipboard.read() failed, falling back to readText():', e);
          // Fallback to simple text reading
          content = await navigator.clipboard.readText();
        }

        if ((!content || content.trim() === '') && html.trim() !== '') {
          content = html;
          html = '';
        }

        if (!content || content.trim() === '') {
          showMessage('Clipboard is empty. Copy some URLs first.', 'error');
          return;
        }

        chrome.runtime.sendMessage({ type: 'paste', content: content, html: html });
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
      if (request.errorMsg) {
        showMessage(`Error: ${request.errorMsg}`, 'error');
        return;
      }

      document.getElementById('copiedContent').value = request.content;

      // Keep an open history panel in sync with the copy that just happened.
      // The background records history before sending this message, so the
      // new entry is already readable.
      const panel = document.getElementById('historyPanel');
      if (panel && !panel.classList.contains('hidden')) {
        renderHistory();
      }

      if (request.mimeType === 'html') {
        // For HTML content, write both HTML and plain text to clipboard
        try {
          const htmlContent = request.content;
          // Supplied by the background, built from the tabs themselves. Do not
          // regex-strip the HTML to derive this: titles are entity-escaped, so
          // stripping deletes the entities and mangles any title containing
          // & < > " ', and it loses the URLs entirely.
          const plainTextContent = request.plainContent || request.content;
          
          const clipboardData = {
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([plainTextContent], { type: 'text/plain' })
          };
          
          const clipboardItem = new ClipboardItem(clipboardData);
          
          navigator.clipboard.write([clipboardItem]).then(function() {
            showMessage(`Copied ${request.copied_url} URLs as HTML!`);
          }).catch(function(err) {
            // Fallback to plain text. The success message has to live inside
            // this branch — chaining it after the catch ran it on the success
            // path too, immediately overwriting the "as HTML!" confirmation.
            return navigator.clipboard.writeText(plainTextContent).then(function() {
              showMessage(`Copied ${request.copied_url} URLs to clipboard!`);
            });
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
        // Never report a silent truncation as a clean success.
        showMessage(request.capped
          ? `Opened ${request.urlCount} URLs (limit reached — the rest were skipped).`
          : `${request.urlCount} URLs opened successfully!`);
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

  // ---- Menu open/close ----------------------------------------------------
  // Every open and close path goes through setMenuOpen so the visible state and
  // aria-expanded can never drift apart.

  function isMenuOpen(menu) {
    return !!menu && !menu.classList.contains('hidden');
  }

  function setMenuOpen(menu, trigger, open) {
    if (!menu) return;
    menu.classList.toggle('hidden', !open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function menuItems(menu) {
    return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
  }

  function closeAllMenus() {
    setMenuOpen(formatDropdown, formatDropdownToggle, false);
    setMenuOpen(sourceDropdown, currentSourceIndicator, false);
  }

  /**
   * Keyboard support for a trigger/menu pair: Down opens and lands on the first
   * item, Up/Down cycle, Home/End jump, Escape closes and hands focus back to
   * the trigger, Tab closes without stealing focus.
   */
  function wireMenuKeys(menu, trigger) {
    if (!menu || !trigger) return;

    trigger.addEventListener('keydown', function(e) {
      // Enter and Space already reach us as a click; only Down needs handling.
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeAllMenus();
        setMenuOpen(menu, trigger, true);
        const items = menuItems(menu);
        if (items.length) items[0].focus();
      } else if (e.key === 'Escape' && isMenuOpen(menu)) {
        setMenuOpen(menu, trigger, false);
      }
    });

    menu.addEventListener('keydown', function(e) {
      const items = menuItems(menu);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(menu, trigger, false);
        trigger.focus();
      } else if (e.key === 'Tab') {
        setMenuOpen(menu, trigger, false);
      }
    });
  }

  // Toggle dropdown
  if (formatDropdownToggle) {
    formatDropdownToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const open = !isMenuOpen(formatDropdown);
      closeAllMenus();
      setMenuOpen(formatDropdown, formatDropdownToggle, open);
    });
  }

  // Make format indicator clickable to open dropdown
  const formatIndicator = document.getElementById('currentFormatIndicator');
  if (formatIndicator) {
    formatIndicator.addEventListener('click', function(e) {
      e.stopPropagation();
      const open = !isMenuOpen(formatDropdown);
      closeAllMenus();
      setMenuOpen(formatDropdown, formatDropdownToggle, open);
    });
  }

  // Make source indicator clickable to open dropdown
  if (currentSourceIndicator && sourceDropdown) {
    currentSourceIndicator.addEventListener('click', function(e) {
      e.stopPropagation();
      const open = !isMenuOpen(sourceDropdown);
      closeAllMenus();
      setMenuOpen(sourceDropdown, currentSourceIndicator, open);
    });
  }

  wireMenuKeys(formatDropdown, formatDropdownToggle);
  wireMenuKeys(sourceDropdown, currentSourceIndicator);

  // Handle source selection
  sourceOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      e.stopPropagation();
      const source = this.dataset.source;
      currentPasteSource = source;

      // Update indicator
      updateSourceIndicator(source);

      // Hide dropdown, returning focus to the trigger for keyboard users
      setMenuOpen(sourceDropdown, currentSourceIndicator, false);
      if (currentSourceIndicator) currentSourceIndicator.focus();

      // Save to storage
      chrome.storage.local.set({ pasteSource: source });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function() {
    closeAllMenus();
  });

  // Escape closes any open menu from anywhere in the popup
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (isMenuOpen(formatDropdown)) {
      setMenuOpen(formatDropdown, formatDropdownToggle, false);
      if (formatDropdownToggle) formatDropdownToggle.focus();
    }
    if (isMenuOpen(sourceDropdown)) {
      setMenuOpen(sourceDropdown, currentSourceIndicator, false);
      if (currentSourceIndicator) currentSourceIndicator.focus();
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

      // Hide dropdown, returning focus to the trigger for keyboard users
      setMenuOpen(formatDropdown, formatDropdownToggle, false);
      if (formatDropdownToggle) formatDropdownToggle.focus();

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

  // Debounced so typing does not write once per keystroke. chrome.storage.sync
  // enforces MAX_WRITE_OPERATIONS_PER_MINUTE (120) and starts throwing past it,
  // and each write also triggered a full re-copy round-trip. options.js already
  // debounces the identical inputs at 500ms.
  function debounce(fn, wait) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const SETTING_INPUT_DEBOUNCE_MS = 500;

  // Save delimiter changes and update the preview
  if (delimiterInput) {
    const saveDelimiter = debounce(function(value) {
      chrome.storage.sync.set({ delimiter: value }, () => {
        // Re-copy with the new delimiter to show the user what they'll get
        chrome.runtime.sendMessage({ type: 'copy' });
      });
    }, SETTING_INPUT_DEBOUNCE_MS);

    delimiterInput.addEventListener('input', function(e) {
      let value = e.target.value;
      // If empty, default to --
      if (!value.trim()) {
        value = DEFAULT_SETTINGS.delimiter;
        this.value = value;
      }
      saveDelimiter(value);
    });
  }

  // Save custom template changes and update the preview
  if (customTemplateInput) {
    const saveTemplate = debounce(function(value) {
      chrome.storage.sync.set({ customTemplate: value }, () => {
        // Re-copy with the new template to show the user what they'll get
        chrome.runtime.sendMessage({ type: 'copy' });
      });
    }, SETTING_INPUT_DEBOUNCE_MS);

    customTemplateInput.addEventListener('input', function(e) {
      saveTemplate(e.target.value);
    });
  }

  // ==================== Copy History ====================
  // The panel renders lazily — the list is only built when the user opens it,
  // and it is thrown away on close so a long history costs nothing while idle.

  const historyButton = document.getElementById('historyButton');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('historyList');
  const clearHistoryButton = document.getElementById('clearHistoryButton');

  function formatEntryTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // Chrome-history-style grouping: Today / Yesterday / explicit date.
  function formatDayLabel(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) => a.toDateString() === b.toDateString();

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';

    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function buildDayHeader(label) {
    const header = document.createElement('div');
    header.className =
      'history-day px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider';
    header.textContent = label;
    return header;
  }

  function buildEntryRow(entry) {
    const row = document.createElement('div');
    row.className = 'history-entry flex items-center gap-2 px-3 py-2';

    const loadButton = document.createElement('button');
    loadButton.className = 'flex-1 flex items-center gap-2 text-left cursor-pointer';
    loadButton.title = 'Load these URLs into the textarea';

    const time = document.createElement('span');
    time.className = 'text-sm font-medium text-gray-800';
    time.textContent = formatEntryTime(entry.ts);

    const count = document.createElement('span');
    count.className = 'text-sm text-gray-600';
    count.textContent = `${entry.count} ${entry.count === 1 ? 'tab' : 'tabs'}`;

    const format = document.createElement('span');
    format.className = 'text-xs text-gray-500';
    format.textContent = formatDisplayNames[entry.format] || entry.format;

    loadButton.append(time, count, format);

    const deleteButton = document.createElement('button');
    deleteButton.className =
      'shrink-0 px-2 text-gray-500 hover:text-gray-900 cursor-pointer';
    deleteButton.textContent = '×';
    deleteButton.title = 'Remove from history';
    deleteButton.setAttribute('aria-label', 'Remove from history');

    loadButton.addEventListener('click', async function() {
      document.getElementById('copiedContent').value = entry.content;

      try {
        // Restore the same clipboard flavors the original copy wrote. Plain
        // writeText on an HTML entry pastes the raw <a href> markup instead of
        // live links, which is not what the user copied. Entries recorded
        // before plainContent was stored fall back to plain text.
        if (entry.format === 'html' && entry.plainContent) {
          await writeRichClipboard(entry.content, entry.plainContent);
        } else {
          await navigator.clipboard.writeText(entry.content);
        }
        showMessage(
          entry.truncated
            ? `Restored ${entry.count} tabs (list was truncated when saved)`
            : `Restored ${entry.count} URLs to clipboard!`
        );
      } catch (err) {
        // The textarea still holds the content, so this is only a partial failure.
        showMessage('Loaded into textarea, but clipboard write failed', 'error');
      }
    });

    deleteButton.addEventListener('click', async function(e) {
      e.stopPropagation();
      await CopyHistory.remove(entry.id);
      await renderHistory();
    });

    row.append(loadButton, deleteButton);
    return row;
  }

  async function renderHistory() {
    const entries = await CopyHistory.getAll();

    historyList.textContent = '';

    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'px-3 py-4 text-sm text-gray-500 text-center';
      empty.textContent = 'No copies yet. Copy some URLs to see them here.';
      historyList.appendChild(empty);
      clearHistoryButton.classList.add('hidden');
      return;
    }

    clearHistoryButton.classList.remove('hidden');

    // Entries arrive newest-first, so a single pass groups them by day.
    const fragment = document.createDocumentFragment();
    let currentDay = null;

    entries.forEach((entry) => {
      const dayLabel = formatDayLabel(entry.ts);
      if (dayLabel !== currentDay) {
        currentDay = dayLabel;
        fragment.appendChild(buildDayHeader(dayLabel));
      }
      fragment.appendChild(buildEntryRow(entry));
    });

    historyList.appendChild(fragment);
  }

  if (historyButton && historyPanel) {
    historyButton.addEventListener('click', async function(e) {
      e.stopPropagation();
      const isOpening = historyPanel.classList.contains('hidden');

      if (isOpening) {
        await renderHistory();
        historyPanel.classList.remove('hidden');
      } else {
        historyPanel.classList.add('hidden');
        historyList.textContent = '';
      }

      historyButton.setAttribute('aria-expanded', String(isOpening));
    });
  }

  if (clearHistoryButton) {
    clearHistoryButton.addEventListener('click', async function(e) {
      e.stopPropagation();
      await CopyHistory.clear();
      await renderHistory();
      showMessage('History cleared');
    });
  }

});