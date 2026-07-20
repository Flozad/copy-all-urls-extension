// Offscreen document: performs clipboard read/write on behalf of the service
// worker, which cannot access the clipboard directly.
//
// Offscreen documents are never focused, and the async Clipboard API
// (navigator.clipboard.*) requires focus. So we use the legacy execCommand API,
// which works headless given the clipboardRead / clipboardWrite permissions.

const writeEl = document.getElementById('clipboard-write');
const readEl = document.getElementById('clipboard-read');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only handle messages explicitly targeted at the offscreen document; let
  // every other listener (background, popup) ignore ours and vice versa.
  if (!message || message.target !== 'offscreen') {
    return;
  }

  if (message.action === 'copy') {
    handleCopy(message.text);
    sendResponse({ ok: true });
    return;
  }

  if (message.action === 'read') {
    sendResponse(handleRead());
    return;
  }
});

// Write plain text to the clipboard via a hidden textarea.
function handleCopy(text) {
  writeEl.value = text == null ? '' : text;
  writeEl.select();
  document.execCommand('copy');
  writeEl.value = '';
}

// Read the clipboard via a contenteditable div. Prefer plain text (innerText),
// fall back to HTML (innerHTML) — mirroring the previous injected reader so
// Action.paste receives the exact same { content, isHtml } shape.
function handleRead() {
  readEl.innerHTML = '';
  readEl.focus();
  document.execCommand('paste');

  const plain = readEl.innerText;
  const html = readEl.innerHTML;
  readEl.innerHTML = '';

  if (plain && plain.trim()) {
    return { content: plain, isHtml: false };
  }
  if (html && html.trim()) {
    return { content: html, isHtml: true };
  }
  return { content: '', isHtml: false };
}
