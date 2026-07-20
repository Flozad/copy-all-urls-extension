'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read } = require('./helpers/harness');

// Drives offscreen.js (the clipboard bridge) with a fake DOM. The bridge reads
// via a contenteditable div and writes via a hidden textarea, using
// execCommand. We simulate execCommand('paste') by copying a fake clipboard
// into the read element, and execCommand('copy') by capturing the textarea.

function loadOffscreen(clipboard) {
  const captured = { written: null, listener: null };

  function makeEl() {
    return { value: '', innerText: '', innerHTML: '', select() {}, focus() {} };
  }
  const writeEl = makeEl();
  const readEl = makeEl();

  const document = {
    getElementById: (id) => (id === 'clipboard-write' ? writeEl : readEl),
    execCommand: (cmd) => {
      if (cmd === 'copy') {
        captured.written = writeEl.value;
      } else if (cmd === 'paste') {
        readEl.innerText = clipboard.plain || '';
        readEl.innerHTML = clipboard.html || '';
      }
      return true;
    }
  };

  const chrome = {
    runtime: { onMessage: { addListener: (fn) => (captured.listener = fn) } }
  };

  const context = { document, chrome, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(context);
  vm.runInContext(read('offscreen.js'), context, { filename: 'offscreen.js' });
  return captured;
}

function callRead(listener) {
  let response;
  listener({ target: 'offscreen', action: 'read' }, null, (r) => (response = r));
  return response;
}

test('read prefers the plain-text flavour when present', () => {
  const { listener } = loadOffscreen({ plain: 'https://a.test/', html: '<a href="https://a.test/">A</a>' });
  const res = callRead(listener);
  assert.equal(res.content, 'https://a.test/');
  assert.equal(res.isHtml, false);
});

test('read falls back to HTML when plain text is blank', () => {
  const { listener } = loadOffscreen({ plain: '   ', html: '<a href="https://a.test/">A</a>' });
  const res = callRead(listener);
  assert.equal(res.isHtml, true);
  assert.match(res.content, /href="https:\/\/a.test\/"/);
});

test('read returns empty when the clipboard is empty', () => {
  const { listener } = loadOffscreen({ plain: '', html: '' });
  const res = callRead(listener);
  assert.equal(res.content, '');
  assert.equal(res.isHtml, false);
});

test('write copies the given text to the clipboard', () => {
  const captured = loadOffscreen({});
  let ack;
  captured.listener({ target: 'offscreen', action: 'copy', text: 'hello urls' }, null, (r) => (ack = r));
  assert.equal(captured.written, 'hello urls');
  assert.equal(ack.ok, true);
});

test('messages not targeted at offscreen are ignored', () => {
  const captured = loadOffscreen({ plain: 'x' });
  let called = false;
  const ret = captured.listener({ target: 'background', action: 'read' }, null, () => (called = true));
  assert.equal(called, false);
  assert.equal(ret, undefined);
});
