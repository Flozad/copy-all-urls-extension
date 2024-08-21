document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('actionCopy').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'copy' });
  });

  document.getElementById('actionPaste').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'paste' });
  });

  document.getElementById('actionOption').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
});
