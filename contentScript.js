chrome.storage.sync.get({
  format: 'text',
  anchor: 'url',
  customTemplate: '',
  smartPaste: false,
  includeAllWindows: false,
  selectedTabsOnly: false,
  defaultBehavior: 'menu',
  mimeType: 'plaintext',
}, function(settings) {
  console.log("Loaded settings: ", settings);

});
