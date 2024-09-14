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

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "copy") {
      document.getElementById('copiedContent').value = request.content;
    }
  });
});
