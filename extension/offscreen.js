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

// Read the clipboard via a contenteditable div. Returns BOTH flavors: plain
// text is preferred, but the HTML is always included as `html` so Action.paste
// can fall back to it. Returning only the plain text made the href/src
// extraction unreachable — a rich-link copy always carries a text/plain flavor
// (the link labels), so the HTML branch never ran and paste failed with
// "No URL found" on exactly the content it was written for.
function handleRead() {
  readEl.innerHTML = '';
  readEl.focus();
  document.execCommand('paste');

  const plain = readEl.innerText;
  const html = readEl.innerHTML;
  readEl.innerHTML = '';

  const hasPlain = Boolean(plain && plain.trim());
  const hasHtml = Boolean(html && html.trim());

  return {
    content: hasPlain ? plain : (hasHtml ? html : ''),
    html: hasHtml ? html : '',
    isHtml: !hasPlain && hasHtml
  };
}
