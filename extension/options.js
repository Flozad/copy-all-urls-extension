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
                const anchorElement = document.querySelector(`#anchor_${settings.anchor}`);
                if (anchorElement) {
                    anchorElement.checked = true;
                } else {
                    console.warn(`Anchor element not found for: ${settings.anchor}`);
                }
            }
      
            const customTemplateElement = document.querySelector('#custom_template');
            if (customTemplateElement) {
                customTemplateElement.value = settings.customTemplate || '';
            }
            
            const smartPasteElement = document.getElementById('smart_paste');
            if (smartPasteElement) {
                smartPasteElement.checked = settings.smartPaste || false;
            }
            
            const includeAllWindowsElement = document.getElementById('include_all_windows');
            if (includeAllWindowsElement) {
                includeAllWindowsElement.checked = settings.includeAllWindows || false;
            }
            
            const selectedTabsOnlyElement = document.getElementById('selected_tabs_only');
            if (selectedTabsOnlyElement) {
                selectedTabsOnlyElement.checked = settings.selectedTabsOnly || false;
            }
            
            const mimeTypeElement = document.getElementById('mime_type');
            if (mimeTypeElement) {
                mimeTypeElement.value = settings.mimeType || defaultSettings.mimeType;
            }
            
            const delimiterElement = document.getElementById('delimiter_input');
            if (delimiterElement) {
                delimiterElement.value = settings.delimiter || defaultSettings.delimiter;
            }

            const showContextMenuElement = document.getElementById('show_context_menu');
            if (showContextMenuElement) {
                showContextMenuElement.checked = settings.showContextMenu !== false;
            }

            const autoActionElement = document.getElementById('auto_action');
            if (autoActionElement) {
                autoActionElement.checked = settings.autoAction !== false;
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
  
    document.getElementById('formats').addEventListener('change', async function(e) {
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
  
    document.getElementById('custom_template').addEventListener('input', debounce(async function(e) {
        const success = await StorageUtil.setWithFallback('customTemplate', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save custom template.');
        }
    }, 500));
  
    document.getElementById('smart_paste').addEventListener('change', async function(e) {
        const success = await StorageUtil.setWithFallback('smartPaste', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save smart paste setting.');
        }
    });
  
    document.getElementById('include_all_windows').addEventListener('change', async function(e) {
        const success = await StorageUtil.setWithFallback('includeAllWindows', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save include all windows setting.');
        }
    });
  
    document.getElementById('selected_tabs_only').addEventListener('change', async function(e) {
        const success = await StorageUtil.setWithFallback('selectedTabsOnly', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save selected tabs only setting.');
        }
    });
  
    document.getElementById('mime_type').addEventListener('change', async function(e) {
        const success = await StorageUtil.setWithFallback('mimeType', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save MIME type setting.');
        }
    });
  
    document.getElementById('delimiter_input').addEventListener('input', debounce(async function(e) {
        const success = await StorageUtil.setWithFallback('delimiter', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save delimiter setting.');
        }
    }, 500));

    document.getElementById('show_context_menu').addEventListener('change', async function(e) {
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

    document.getElementById('auto_action').addEventListener('change', async function(e) {
        const success = await StorageUtil.setWithFallback('autoAction', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save auto-action setting.');
        }
    });

    document.getElementById('bold_titles').addEventListener('change', async function(e) {
        const success = await StorageUtil.setWithFallback('bold', e.target.checked);
        if (!success) {
            showErrorMessage('Failed to save bold formatting setting.');
        }
    });

    document.getElementById('theme_preference').addEventListener('change', async function(e) {
        const success = await StorageUtil.setWithFallback('theme', e.target.value);
        if (!success) {
            showErrorMessage('Failed to save theme preference.');
        } else {
            applyTheme(e.target.value);
        }
    });

    document.getElementById('reset_settings').addEventListener('click', function() {
        document.getElementById('reset_confirmation').classList.remove('hidden');
    });
  
    document.getElementById('cancel_reset').addEventListener('click', function() {
        document.getElementById('reset_confirmation').classList.add('hidden');
    });
  
    document.getElementById('confirm_reset').addEventListener('click', async function() {
        try {
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
            
            if (allSuccessful) {
                showSuccessMessage('Settings reset successfully!');
                setTimeout(() => location.reload(), 1000);
            } else {
                showErrorMessage('Some settings failed to reset. Please try again.');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
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
  
    function processCustomTemplate(template) {
        return template.replace('$date', getCurrentDate());
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
    
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            ${type === 'error' ? 'background-color: #f44336;' : 'background-color: #4CAF50;'}
        `;
        
        document.body.appendChild(messageDiv);
        
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
        
        const mimeTypeElement = document.getElementById('mime_type');
        if (mimeTypeElement) mimeTypeElement.value = defaultSettings.mimeType;
        
        const delimiterElement = document.getElementById('delimiter_input');
        if (delimiterElement) delimiterElement.value = defaultSettings.delimiter;

        const showContextMenuElement = document.getElementById('show_context_menu');
        if (showContextMenuElement) showContextMenuElement.checked = defaultSettings.showContextMenu;

        const autoActionElement = document.getElementById('auto_action');
        if (autoActionElement) autoActionElement.checked = defaultSettings.autoAction;

        const boldTitlesElement = document.getElementById('bold_titles');
        if (boldTitlesElement) boldTitlesElement.checked = defaultSettings.bold;

        toggleAdvancedOptions(defaultSettings.format);
    }
    
    // Storage health check functionality
    document.getElementById('storage_health_check').addEventListener('click', async function() {
        try {
            showMessage('Checking storage health...', 'info');
            const report = await performStorageHealthCheck();
            displayStorageHealthResults(report);
        } catch (error) {
            showErrorMessage('Failed to check storage health: ' + error.message);
        }
    });
    
    document.getElementById('repair_storage').addEventListener('click', async function() {
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
                repairResults.settingsRestored = true;
            } catch (error) {
                repairResults.errors.push(`Failed to restore settings: ${error.message}`);
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
        
        let html = '<div class="space-y-4">';
        
        // Sync storage status
        html += '<div class="border p-3 rounded">';
        html += '<h5 class="font-semibold">Chrome Sync Storage</h5>';
        html += `<p>Available: <span class="${results.sync.available ? 'text-green-600' : 'text-red-600'}">${results.sync.available ? 'Yes' : 'No'}</span></p>`;
        if (results.sync.available) {
            html += `<p>Readable: <span class="text-green-600">Yes</span></p>`;
            html += `<p>Writable: <span class="text-green-600">Yes</span></p>`;
        }
        html += '</div>';
        
        // Local storage status
        html += '<div class="border p-3 rounded">';
        html += '<h5 class="font-semibold">Local Storage</h5>';
        html += `<p>Available: <span class="${results.local.available ? 'text-green-600' : 'text-red-600'}">${results.local.available ? 'Yes' : 'No'}</span></p>`;
        if (results.local.available) {
            html += `<p>Readable: <span class="text-green-600">Yes</span></p>`;
            html += `<p>Writable: <span class="text-green-600">Yes</span></p>`;
        }
        html += '</div>';
        
        // Errors
        if (results.errors.length > 0) {
            html += '<div class="border border-red-300 p-3 rounded bg-red-50">';
            html += '<h5 class="font-semibold text-red-700">Errors</h5>';
            html += '<ul class="list-disc list-inside text-red-600">';
            results.errors.forEach(error => {
                html += `<li>${error}</li>`;
            });
            html += '</ul></div>';
        }
        
        // Recommendations
        if (results.recommendations.length > 0) {
            html += '<div class="border border-blue-300 p-3 rounded bg-blue-50">';
            html += '<h5 class="font-semibold text-blue-700">Recommendations</h5>';
            html += '<ul class="list-disc list-inside text-blue-600">';
            results.recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul></div>';
        }
        
        html += '</div>';
        
        resultsDiv.innerHTML = html;
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
  