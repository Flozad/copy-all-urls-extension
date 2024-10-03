document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('actionCopy').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'copy' });
  });

  document.getElementById('actionPaste').addEventListener('click', function() {
    const textareaContent = document.getElementById('copiedContent').value;
    chrome.runtime.sendMessage({ type: 'paste', content: textareaContent }, function(response) {
    });
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
