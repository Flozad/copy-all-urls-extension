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
      navigator.clipboard.writeText(request.content).then(function() {
        console.log('Copied to clipboard successfully!');
        document.getElementById('message').textContent = `Copied ${request.copied_url} URLs to clipboard!`;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 3000);
      }, function(err) {
        console.error('Could not copy text: ', err);
      });
    } else if (request.type === "paste") {
      if (request.success) {
        document.getElementById('message').textContent = `${request.urlCount} URLs opened successfully!`;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 3000);
      } else if (request.errorMsg) {
        document.getElementById('message').textContent = request.errorMsg;
        setTimeout(() => { document.getElementById('message').textContent = ''; }, 3000);
      }
    }
  });
});
