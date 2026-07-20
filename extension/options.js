// Theme management function
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

document.addEventListener('DOMContentLoaded', function() {
    const manifestData = chrome.runtime.getManifest();
    document.getElementById('version_label').textContent = manifestData.version;

    // Use centralized defaults from utils/defaults.js (loaded via script tag)
    const defaultSettings = DEFAULT_SETTINGS;

    // Use centralized StorageUtil from utils/storage.js (loaded via script tag)
  
    // Load settings with error handling
    (async function loadSettings() {
        try {
            const settings = await StorageUtil.getWithFallback(defaultSettings);
            
            // Apply settings to UI with error checking
            const formatElement = document.querySelector(`#format_${settings.format}`);
            if (formatElement) {
                formatElement.checked = true;
            } else {
                console.warn(`Format element not found for: ${settings.format}`);
                // Fallback to default
                const defaultFormatElement = document.querySelector(`#format_${defaultSettings.format}`);
                if (defaultFormatElement) defaultFormatElement.checked = true;
            }
      
            const anchorOptionsElement = document.getElementById('anchor_options');
            if (anchorOptionsElement) {
                const anchorValue = settings.anchor || defaultSettings.anchor;
                const anchorElement = document.querySelector(`#anchor_${anchorValue}`);
                if (anchorElement) {
                    anchorElement.checked = true;
                } else {
                    console.warn(`Anchor element not found for: ${anchorValue}`);
                    const defaultAnchorElement = document.querySelector(`#anchor_${defaultSettings.anchor}`);
                    if (defaultAnchorElement) defaultAnchorElement.checked = true;
                }
            }
      
            const customTemplateElement = document.querySelector('#custom_template');
            if (customTemplateElement) {
                customTemplateElement.value = settings.customTemplate || defaultSettings.customTemplate;
            }
            
            const smartPasteElement = document.getElementById('smart_paste');
            if (smartPasteElement) {
                // Absent means enabled, matching how background.js reads it.
                smartPasteElement.checked = settings.smartPaste !== false;
            }
            
            const includeAllWindowsElement = document.getElementById('include_all_windows');
            if (includeAllWindowsElement) {
                includeAllWindowsElement.checked = settings.includeAllWindows || false;
            }
            
            const selectedTabsOnlyElement = document.getElementById('selected_tabs_only');
            if (selectedTabsOnlyElement) {
                selectedTabsOnlyElement.checked = settings.selectedTabsOnly || false;
            }
            
            const delimiterElement = document.getElementById('delimiter_input');
            if (delimiterElement) {
                delimiterElement.value = settings.delimiter || defaultSettings.delimiter;
            }

            const showContextMenuElement = document.getElementById('show_context_menu');
            if (showContextMenuElement) {
                showContextMenuElement.checked = settings.showContextMenu !== false;
            }

            const saveHistoryElement = document.getElementById('save_history');
            if (saveHistoryElement) {
                saveHistoryElement.checked = settings.saveHistory !== false;
            }

            const autoActionElement = document.getElementById('auto_action');
            if (autoActionElement) {
                // Must match popup.js's reading (`=== true`). Reading `!== false`
                // here made a fresh profile show auto-copy ON in options and OFF
                // in the popup for the same stored (absent) value.
                autoActionElement.checked = settings.autoAction === true;
            }

            const boldTitlesElement = document.getElementById('bold_titles');
            if (boldTitlesElement) {
                boldTitlesElement.checked = settings.bold === true;
            }

            const themePreferenceElement = document.getElementById('theme_preference');
            if (themePreferenceElement) {
                themePreferenceElement.value = settings.theme || defaultSettings.theme;
            }

            // Apply theme to options page
            applyTheme(settings.theme || defaultSettings.theme);

            toggleAdvancedOptions(settings.format);
        } catch (error) {
            console.error('Error loading settings:', error);
            // Show user-friendly error message
            showErrorMessage('Failed to load settings. Using defaults.');
            // Apply default settings to UI
            applyDefaultsToUI();
        }
    })();

    // Register a listener only if the element exists. Calling
    // getElementById(...).addEventListener directly throws on a missing
    // element, which aborts the rest of DOMContentLoaded — so one renamed or
    // removed control would silently unregister every handler below it.
    function bind(id, event, handler) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`[options] control not found, skipping listener: #${id}`);
            return;
        }
        element.addEventListener(event, handler);
    }

    bind('formats', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('format', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save format setting.');
        }
        toggleAdvancedOptions(e.target.value);
    });
  
    const anchorOptionsElement = document.getElementById('anchor_options');
    if (anchorOptionsElement) {
        anchorOptionsElement.addEventListener('change', async function(e) {
            const success = await StorageUtil.setWithFallback('anchor', e.target.value);
            if (!success) {
                showErrorMessage('Failed to save anchor setting.');
            }
        });
    }
  
    bind('custom_template', 'input', debounce(async function(e) {
        const success = await StorageUtil.setWithFallback('customTemplate', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save custom template.');
        }
    }, 500));
  
    bind('smart_paste', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('smartPaste', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save smart paste setting.');
        }
    });
  
    bind('include_all_windows', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('includeAllWindows', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save include all windows setting.');
        }
    });
  
    bind('selected_tabs_only', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('selectedTabsOnly', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save selected tabs only setting.');
        }
    });
  
    bind('delimiter_input', 'input', debounce(async function(e) {
        const success = await StorageUtil.setWithFallback('delimiter', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save delimiter setting.');
        }
    }, 500));

    bind('show_context_menu', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('showContextMenu', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save context menu setting.');
        } else {
            // Send message to background script to reinitialize context menus
            try {
                await chrome.runtime.sendMessage({ type: 'updateContextMenus' });
            } catch (error) {
                console.error('Failed to update context menus:', error);
            }
        }
    });

    bind('save_history', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('saveHistory', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save history setting.');
            return;
        }
        // Opting out should also discard what was already recorded.
        if (!e.target.checked) {
            await CopyHistory.clear();
        }
    });

    bind('auto_action', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('autoAction', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save auto-action setting.');
        }
    });

    bind('bold_titles', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('bold', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save bold formatting setting.');
        }
    });

    bind('theme_preference', 'change', async function(e) {
        const success = await StorageUtil.setWithFallback('theme', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save theme preference.');
        } else {
            applyTheme(e.target.value);
        }
    });

    // ---- Reset confirmation dialog -----------------------------------------
    // A destructive confirm has to behave like a real dialog: focus moves in,
    // stays trapped while it is open, Escape cancels, and focus returns to
    // whatever opened it.

    let resetDialogOpener = null;

    function resetDialogFocusables() {
        const dialog = document.getElementById('reset_confirmation');
        if (!dialog) return [];
        return Array.prototype.slice
            .call(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            // Visibility in this page is driven by the `hidden` class, so test
            // that rather than offsetParent — the latter depends on computed
            // layout and reports everything as hidden when none has been done,
            // which would silently turn the focus trap into a no-op.
            .filter((el) => !el.disabled && !el.hasAttribute('hidden') && !el.closest('.hidden'));
    }

    function openResetDialog() {
        const dialog = document.getElementById('reset_confirmation');
        if (!dialog) return;
        resetDialogOpener = document.activeElement;
        dialog.classList.remove('hidden');
        // Land on Cancel, not the destructive action.
        const cancel = document.getElementById('cancel_reset');
        if (cancel) cancel.focus();
    }

    function closeResetDialog() {
        const dialog = document.getElementById('reset_confirmation');
        if (!dialog) return;
        dialog.classList.add('hidden');
        if (resetDialogOpener && typeof resetDialogOpener.focus === 'function') {
            resetDialogOpener.focus();
        }
        resetDialogOpener = null;
    }

    function isResetDialogOpen() {
        const dialog = document.getElementById('reset_confirmation');
        return !!dialog && !dialog.classList.contains('hidden');
    }

    document.addEventListener('keydown', function(e) {
        if (!isResetDialogOpen()) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeResetDialog();
            return;
        }

        if (e.key !== 'Tab') return;

        // Focus trap: wrap at both ends so Tab can never reach the page behind.
        const items = resetDialogFocusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        } else if (!items.includes(document.activeElement)) {
            e.preventDefault();
            first.focus();
        }
    });

    bind('reset_settings', 'click', openResetDialog);

    bind('cancel_reset', 'click', closeResetDialog);
  
    // `copyHistory` and `pasteSource` live in chrome.storage.local but are user
    // DATA, not settings — they are absent from DEFAULT_SETTINGS, so a plain
    // storage.local.clear() destroys them with nothing able to restore them.
    // Reset/repair snapshot them first and write them back afterwards.
    const PRESERVED_LOCAL_KEYS = ['copyHistory', 'pasteSource'];

    function snapshotPreservedLocalData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(PRESERVED_LOCAL_KEYS, (result) => {
                if (chrome.runtime.lastError) {
                    console.warn('[options] could not read preserved data:', chrome.runtime.lastError.message);
                    resolve({});
                    return;
                }
                const preserved = {};
                PRESERVED_LOCAL_KEYS.forEach((key) => {
                    if (result[key] !== undefined) preserved[key] = result[key];
                });
                resolve(preserved);
            });
        });
    }

    function restorePreservedLocalData(preserved) {
        return new Promise((resolve) => {
            if (!preserved || Object.keys(preserved).length === 0) {
                resolve(true);
                return;
            }
            chrome.storage.local.set(preserved, () => {
                if (chrome.runtime.lastError) {
                    console.error('[options] could not restore preserved data:', chrome.runtime.lastError.message);
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }

    bind('confirm_reset', 'click', async function() {
        try {
            // Snapshot user data before wiping local storage (see above).
            const preserved = await snapshotPreservedLocalData();

            // Clear both sync and local storage
            await new Promise((resolve, reject) => {
                chrome.storage.sync.clear(() => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            await new Promise((resolve, reject) => {
                chrome.storage.local.clear(() => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            // Set defaults with error handling
            let allSuccessful = true;
            for (const [key, value] of Object.entries(defaultSettings)) {
                const success = await StorageUtil.setWithFallback(key, value);
                if (!success) {
                    allSuccessful = false;
                    console.error(`Failed to reset ${key}`);
                }
            }

            // Re-stamp the schema. sync.clear() above wiped the marker, and a
            // profile without one looks like a pre-1.13.0 profile to the
            // onInstalled migration — which would then reset `anchor` on the
            // next update, silently discarding a choice made here after a reset.
            await StorageUtil.setWithFallback('schemaVersion', SCHEMA_VERSION);

            // Put copy history / paste source back now that defaults are in place.
            await restorePreservedLocalData(preserved);

            // Dismiss before reporting, so the result message isn't rendered
            // behind a modal that is still holding focus.
            closeResetDialog();

            if (allSuccessful) {
                showSuccessMessage('Settings reset successfully!');
                setTimeout(() => location.reload(), 1000);
            } else {
                showErrorMessage('Some settings failed to reset. Please try again.');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            closeResetDialog();
            showErrorMessage('Failed to reset settings. Please try again.');
        }
    });
  
    function toggleAdvancedOptions(format) {
        document.getElementById('html_advanced').style.display = format === 'html' ? 'block' : 'none';
        document.getElementById('custom_advanced').style.display = format === 'custom' ? 'block' : 'none';
        document.getElementById('delimited_advanced').style.display = format === 'delimited' ? 'block' : 'none';
    }
  
    function getCurrentDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
  
    // Utility functions
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function showErrorMessage(message) {
        showMessage(message, 'error');
    }
    
    function showSuccessMessage(message) {
        showMessage(message, 'success');
    }
    
    /**
     * The live region has to exist in the DOM *before* its text changes for a
     * screen reader to announce it, so it ships in options.html rather than
     * being appended with the first message. Recreated here only as a guard.
     */
    function getLiveRegion() {
        let region = document.getElementById('message_live_region');
        if (!region) {
            region = document.createElement('div');
            region.id = 'message_live_region';
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'true');
            region.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000;';
            document.body.appendChild(region);
        }
        return region;
    }

    function showMessage(message, type) {
        const region = getLiveRegion();

        // Remove existing messages
        region.textContent = '';

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        // Errors interrupt; successes wait their turn.
        messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');
        // Darker than the stock Material red/green so white body text clears
        // the 4.5:1 AA contrast threshold.
        messageDiv.style.cssText = `
            padding: 10px 15px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            ${type === 'error' ? 'background-color: #c62828;' : 'background-color: #2e7d32;'}
        `;

        region.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
    
    function applyDefaultsToUI() {
        // Apply default settings to UI elements
        const defaultFormatElement = document.querySelector(`#format_${defaultSettings.format}`);
        if (defaultFormatElement) defaultFormatElement.checked = true;
        
        const defaultAnchorElement = document.querySelector(`#anchor_${defaultSettings.anchor}`);
        if (defaultAnchorElement) defaultAnchorElement.checked = true;
        
        const customTemplateElement = document.querySelector('#custom_template');
        if (customTemplateElement) customTemplateElement.value = defaultSettings.customTemplate;
        
        const smartPasteElement = document.getElementById('smart_paste');
        if (smartPasteElement) smartPasteElement.checked = defaultSettings.smartPaste;
        
        const includeAllWindowsElement = document.getElementById('include_all_windows');
        if (includeAllWindowsElement) includeAllWindowsElement.checked = defaultSettings.includeAllWindows;
        
        const selectedTabsOnlyElement = document.getElementById('selected_tabs_only');
        if (selectedTabsOnlyElement) selectedTabsOnlyElement.checked = defaultSettings.selectedTabsOnly;
        
        const delimiterElement = document.getElementById('delimiter_input');
        if (delimiterElement) delimiterElement.value = defaultSettings.delimiter;

        const showContextMenuElement = document.getElementById('show_context_menu');
        if (showContextMenuElement) showContextMenuElement.checked = defaultSettings.showContextMenu;

        const saveHistoryElement = document.getElementById('save_history');
        if (saveHistoryElement) saveHistoryElement.checked = defaultSettings.saveHistory;

        const autoActionElement = document.getElementById('auto_action');
        if (autoActionElement) autoActionElement.checked = defaultSettings.autoAction;

        const boldTitlesElement = document.getElementById('bold_titles');
        if (boldTitlesElement) boldTitlesElement.checked = defaultSettings.bold;

        toggleAdvancedOptions(defaultSettings.format);
    }
    
    // Storage health check functionality
    bind('storage_health_check', 'click', async function() {
        try {
            showMessage('Checking storage health...', 'info');
            const report = await performStorageHealthCheck();
            displayStorageHealthResults(report);
        } catch (error) {
            showErrorMessage('Failed to check storage health: ' + error.message);
        }
    });
    
    bind('repair_storage', 'click', async function() {
        try {
            showMessage('Repairing storage...', 'info');
            const result = await repairStorage();
            if (result.success) {
                showSuccessMessage('Storage repair completed successfully!');
                setTimeout(() => location.reload(), 2000);
            } else {
                showErrorMessage('Storage repair failed: ' + result.errors.join(', '));
            }
        } catch (error) {
            showErrorMessage('Failed to repair storage: ' + error.message);
        }
    });
    
    async function performStorageHealthCheck() {
        const results = {
            sync: { available: false, readable: false, writable: false, quota: null },
            local: { available: false, readable: false, writable: false, quota: null },
            errors: [],
            recommendations: []
        };

        // Test sync storage
        try {
            // Test write
            await new Promise((resolve, reject) => {
                chrome.storage.sync.set({ healthCheck: Date.now() }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            results.sync.writable = true;

            // Test read
            await new Promise((resolve, reject) => {
                chrome.storage.sync.get(['healthCheck'], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });
            results.sync.readable = true;
            results.sync.available = true;

            // Clean up test data
            chrome.storage.sync.remove(['healthCheck']);

        } catch (syncError) {
            results.errors.push(`Sync storage failed: ${syncError.message}`);
        }

        // Test local storage
        try {
            // Test write
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ healthCheck: Date.now() }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            results.local.writable = true;

            // Test read
            await new Promise((resolve, reject) => {
                chrome.storage.local.get(['healthCheck'], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });
            results.local.readable = true;
            results.local.available = true;

            // Clean up test data
            chrome.storage.local.remove(['healthCheck']);

        } catch (localError) {
            results.errors.push(`Local storage failed: ${localError.message}`);
        }

        // Generate recommendations
        if (!results.sync.available) {
            results.recommendations.push('Chrome Sync storage is not available. Check Chrome sync settings.');
        }
        
        if (!results.local.available) {
            results.recommendations.push('Local storage is not available. This is a critical issue.');
        }
        
        if (results.errors.length > 0) {
            results.recommendations.push('Storage errors detected. Consider running repair operation.');
        }

        if (results.sync.available && results.local.available) {
            results.recommendations.push('Storage appears healthy. Settings loss may be due to external factors.');
        }

        return results;
    }
    
    async function repairStorage() {
        const repairResults = {
            success: false,
            syncCleared: false,
            localCleared: false,
            settingsRestored: false,
            errors: []
        };

        try {
            // Snapshot user data (copy history / paste source) before wiping
            // local storage — DEFAULT_SETTINGS cannot restore it.
            const preserved = await snapshotPreservedLocalData();

            // Clear both storages
            try {
                await new Promise((resolve, reject) => {
                    chrome.storage.sync.clear(() => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                });
                repairResults.syncCleared = true;
            } catch (error) {
                repairResults.errors.push(`Failed to clear sync storage: ${error.message}`);
            }

            try {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.clear(() => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                });
                repairResults.localCleared = true;
            } catch (error) {
                repairResults.errors.push(`Failed to clear local storage: ${error.message}`);
            }

            // Restore default settings
            try {
                for (const [key, value] of Object.entries(defaultSettings)) {
                    await StorageUtil.setWithFallback(key, value);
                }
                // Re-stamp the schema for the same reason the reset flow does:
                // sync.clear() wiped the marker, and an unstamped profile looks
                // pre-1.13.0 to the onInstalled migration.
                await StorageUtil.setWithFallback('schemaVersion', SCHEMA_VERSION);
                repairResults.settingsRestored = true;
            } catch (error) {
                repairResults.errors.push(`Failed to restore settings: ${error.message}`);
            }

            // Put copy history / paste source back now that defaults are in place.
            const dataRestored = await restorePreservedLocalData(preserved);
            if (!dataRestored) {
                repairResults.errors.push('Failed to restore copy history / paste source.');
            }

            repairResults.success = repairResults.settingsRestored && repairResults.errors.length === 0;
        } catch (error) {
            repairResults.errors.push(`Repair operation failed: ${error.message}`);
        }

        return repairResults;
    }
    
    function displayStorageHealthResults(results) {
        const statusDiv = document.getElementById('storage_status');
        const resultsDiv = document.getElementById('storage_results');
        
        // Built with createElement/textContent rather than innerHTML: the error
        // strings come from chrome.runtime.lastError.message, which is not ours
        // to trust as markup.
        function createElement(tag, className, text) {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (text !== undefined) element.textContent = text;
            return element;
        }

        function createStatusLine(label, value, ok) {
            const paragraph = createElement('p', null, `${label}: `);
            paragraph.appendChild(createElement('span', ok ? 'text-green-600' : 'text-red-600', value));
            return paragraph;
        }

        function createStorageSection(title, state) {
            const section = createElement('div', 'border p-3 rounded');
            section.appendChild(createElement('h5', 'font-semibold', title));
            section.appendChild(createStatusLine('Available', state.available ? 'Yes' : 'No', state.available));
            if (state.available) {
                section.appendChild(createStatusLine('Readable', 'Yes', true));
                section.appendChild(createStatusLine('Writable', 'Yes', true));
            }
            return section;
        }

        function createListSection(title, items, wrapperClass, headingClass, listClass) {
            const section = createElement('div', wrapperClass);
            section.appendChild(createElement('h5', headingClass, title));
            const list = createElement('ul', listClass);
            items.forEach(item => {
                list.appendChild(createElement('li', null, item));
            });
            section.appendChild(list);
            return section;
        }

        const container = createElement('div', 'space-y-4');
        container.appendChild(createStorageSection('Chrome Sync Storage', results.sync));
        container.appendChild(createStorageSection('Local Storage', results.local));

        if (results.errors.length > 0) {
            container.appendChild(createListSection(
                'Errors',
                results.errors,
                'border border-red-300 p-3 rounded bg-red-50',
                'font-semibold text-red-700',
                'list-disc list-inside text-red-600'
            ));
        }

        if (results.recommendations.length > 0) {
            container.appendChild(createListSection(
                'Recommendations',
                results.recommendations,
                'border border-blue-300 p-3 rounded bg-blue-50',
                'font-semibold text-blue-700',
                'list-disc list-inside text-blue-600'
            ));
        }

        resultsDiv.textContent = '';
        resultsDiv.appendChild(container);
        statusDiv.classList.remove('hidden');
    }

    // Keyboard Shortcuts Section
    // Fetch actual shortcuts from Chrome
    const copyShortcutEl = document.getElementById('copyShortcut');
    const pasteShortcutEl = document.getElementById('pasteShortcut');

    // Load actual keyboard shortcuts from Chrome
    chrome.commands.getAll(function(commands) {
        commands.forEach(function(command) {
            if (command.name === 'copy-urls' && copyShortcutEl) {
                copyShortcutEl.textContent = command.shortcut || 'Not set';
            } else if (command.name === 'paste-urls' && pasteShortcutEl) {
                pasteShortcutEl.textContent = command.shortcut || 'Not set';
            }
        });
    });

    // Load enable_shortcuts setting
    const enableShortcutsEl = document.getElementById('enable_shortcuts');
    if (enableShortcutsEl) {
        chrome.storage.sync.get(['enableShortcuts'], function(result) {
            enableShortcutsEl.checked = result.enableShortcuts !== false; // Default to true
        });

        // Save enable_shortcuts setting
        enableShortcutsEl.addEventListener('change', async function() {
            const success = await StorageUtil.setWithFallback('enableShortcuts', this.checked);
            if (!success) {
                showErrorMessage('Failed to save keyboard shortcuts setting.');
            }
        });
    }

    // Customize shortcuts button
    const customizeShortcutsBtn = document.getElementById('customizeShortcuts');
    if (customizeShortcutsBtn) {
        customizeShortcutsBtn.addEventListener('click', function() {
            chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        });
    }

    // Set footer year
    const yearFooter = document.getElementById('year_footer');
    if (yearFooter) {
        yearFooter.textContent = new Date().getFullYear();
    }
  });
  