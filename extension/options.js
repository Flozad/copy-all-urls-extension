document.addEventListener('DOMContentLoaded', function() {
    const manifestData = chrome.runtime.getManifest();
    document.getElementById('version_label').textContent = manifestData.version;
  
    const defaultSettings = {
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
  
    chrome.storage.sync.get(defaultSettings, function(settings) {
        document.querySelector(`#format_${settings.format}`).checked = true;
  
        const anchorOptionsElement = document.getElementById('anchor_options');
        if (anchorOptionsElement) {
            document.querySelector(`#anchor_${settings.anchor}`).checked = true;
        }
  
        document.querySelector('#custom_template').value = settings.customTemplate;
        document.getElementById('smart_paste').checked = settings.smartPaste;
        document.getElementById('include_all_windows').checked = settings.includeAllWindows;
        document.getElementById('selected_tabs_only').checked = settings.selectedTabsOnly;
        document.getElementById('mime_type').value = settings.mimeType;
        document.getElementById('delimiter_input').value = settings.delimiter;
  
        toggleAdvancedOptions(settings.format);
    });
  
    document.getElementById('formats').addEventListener('change', function(e) {
        chrome.storage.sync.set({ format: e.target.value });
        toggleAdvancedOptions(e.target.value);
    });
  
    const anchorOptionsElement = document.getElementById('anchor_options');
    if (anchorOptionsElement) {
        anchorOptionsElement.addEventListener('change', function(e) {
            chrome.storage.sync.set({ anchor: e.target.value });
        });
    }
  
    document.getElementById('custom_template').addEventListener('input', function(e) {
        chrome.storage.sync.set({ customTemplate: e.target.value });
    });
  
    document.getElementById('smart_paste').addEventListener('change', function(e) {
        chrome.storage.sync.set({ smartPaste: e.target.checked });
    });
  
    document.getElementById('include_all_windows').addEventListener('change', function(e) {
        chrome.storage.sync.set({ includeAllWindows: e.target.checked });
    });
  
    document.getElementById('selected_tabs_only').addEventListener('change', function(e) {
        chrome.storage.sync.set({ selectedTabsOnly: e.target.checked });
    });
  
    document.getElementById('mime_type').addEventListener('change', function(e) {
        chrome.storage.sync.set({ mimeType: e.target.value });
    });
  
    document.getElementById('delimiter_input').addEventListener('input', function(e) {
        chrome.storage.sync.set({ delimiter: e.target.value });
    });
  
    document.getElementById('reset_settings').addEventListener('click', function() {
        document.getElementById('reset_confirmation').classList.remove('hidden');
    });
  
    document.getElementById('cancel_reset').addEventListener('click', function() {
        document.getElementById('reset_confirmation').classList.add('hidden');
    });
  
    document.getElementById('confirm_reset').addEventListener('click', function() {
        chrome.storage.sync.clear(function() {
            location.reload();
        });
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
  });
  