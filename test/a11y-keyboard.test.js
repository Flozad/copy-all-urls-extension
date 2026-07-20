'use strict';

// Keyboard and ARIA behaviour for the popup's menus and the options page's
// destructive-reset dialog, driven against the real HTML/JS in jsdom.
//
// These cover the paths a pointer never exercises: arrow-key roving, Escape,
// focus restoration, and the modal focus trap. They also pin aria-expanded to
// the visible state, which is the attribute most likely to silently drift as
// new open/close call sites get added.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPopup, loadOptions } = require('./helpers/dom-harness');

// Dispatch a real KeyboardEvent from the given element so it bubbles to the
// document- and menu-level handlers exactly as a browser would deliver it.
function press(page, target, key, init = {}) {
  const element = page.resolve(target);
  const event = new page.window.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init
  });
  element.dispatchEvent(event);
  return event;
}

const items = (page, menuId) =>
  Array.from(page.resolve(menuId).querySelectorAll('[role="menuitem"]'));

const active = (page) => page.document.activeElement;

// ---------------------------------------------------------------------------
// Format menu — roving focus
// ---------------------------------------------------------------------------

test('popup: format menu starts closed and reports it', async () => {
  const page = await loadPopup();
  try {
    assert.equal(page.isHidden('formatDropdown'), true);
    assert.equal(
      page.resolve('formatDropdownToggle').getAttribute('aria-expanded'),
      'false'
    );
    assert.equal(items(page, 'formatDropdown').length, 6);
  } finally {
    page.close();
  }
});

test('popup: ArrowDown opens the format menu and focuses the first item', async () => {
  const page = await loadPopup();
  try {
    page.resolve('formatDropdownToggle').focus();
    press(page, 'formatDropdownToggle', 'ArrowDown');
    await page.flush();

    assert.equal(page.isHidden('formatDropdown'), false, 'menu opened');
    assert.equal(
      page.resolve('formatDropdownToggle').getAttribute('aria-expanded'),
      'true'
    );
    assert.equal(active(page), items(page, 'formatDropdown')[0]);
  } finally {
    page.close();
  }
});

test('popup: Arrow keys rove and wrap in both directions', async () => {
  const page = await loadPopup();
  try {
    page.resolve('formatDropdownToggle').focus();
    press(page, 'formatDropdownToggle', 'ArrowDown');
    await page.flush();

    const list = items(page, 'formatDropdown');
    const last = list.length - 1;

    press(page, list[0], 'ArrowDown');
    assert.equal(active(page), list[1], 'Down moves forward');

    press(page, list[1], 'ArrowUp');
    assert.equal(active(page), list[0], 'Up moves back');

    press(page, list[0], 'ArrowUp');
    assert.equal(active(page), list[last], 'Up from the first wraps to the last');

    press(page, list[last], 'ArrowDown');
    assert.equal(active(page), list[0], 'Down from the last wraps to the first');
  } finally {
    page.close();
  }
});

test('popup: Home and End jump to the ends of the format menu', async () => {
  const page = await loadPopup();
  try {
    page.resolve('formatDropdownToggle').focus();
    press(page, 'formatDropdownToggle', 'ArrowDown');
    await page.flush();

    const list = items(page, 'formatDropdown');

    press(page, active(page), 'End');
    assert.equal(active(page), list[list.length - 1]);

    press(page, active(page), 'Home');
    assert.equal(active(page), list[0]);
  } finally {
    page.close();
  }
});

test('popup: Escape closes the format menu and restores focus to the trigger', async () => {
  const page = await loadPopup();
  try {
    const toggle = page.resolve('formatDropdownToggle');
    toggle.focus();
    press(page, 'formatDropdownToggle', 'ArrowDown');
    await page.flush();

    press(page, active(page), 'Escape');
    await page.flush();

    assert.equal(page.isHidden('formatDropdown'), true, 'menu closed');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(active(page), toggle, 'focus went back to the trigger');
  } finally {
    page.close();
  }
});

test('popup: Tab closes the menu without trapping focus', async () => {
  const page = await loadPopup();
  try {
    page.resolve('formatDropdownToggle').focus();
    press(page, 'formatDropdownToggle', 'ArrowDown');
    await page.flush();

    press(page, active(page), 'Tab');
    await page.flush();

    assert.equal(page.isHidden('formatDropdown'), true);
    assert.equal(
      page.resolve('formatDropdownToggle').getAttribute('aria-expanded'),
      'false'
    );
  } finally {
    page.close();
  }
});

// ---------------------------------------------------------------------------
// Menus are mutually exclusive, and aria-expanded tracks the visible state
// ---------------------------------------------------------------------------

test('popup: opening the paste-source menu closes the format menu', async () => {
  const page = await loadPopup();
  try {
    await page.click('formatDropdownToggle');
    assert.equal(page.isHidden('formatDropdown'), false);

    await page.click('currentSourceIndicator');

    assert.equal(page.isHidden('formatDropdown'), true, 'format menu closed');
    assert.equal(page.isHidden('sourceDropdown'), false, 'source menu opened');
    assert.equal(
      page.resolve('formatDropdownToggle').getAttribute('aria-expanded'),
      'false',
      'the closed menu reset its aria-expanded'
    );
    assert.equal(
      page.resolve('currentSourceIndicator').getAttribute('aria-expanded'),
      'true'
    );
  } finally {
    page.close();
  }
});

test('popup: choosing a format closes the menu and resets aria-expanded', async () => {
  const page = await loadPopup();
  try {
    await page.click('formatDropdownToggle');
    const list = items(page, 'formatDropdown');
    list[2].dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await page.flush();

    assert.equal(page.isHidden('formatDropdown'), true);
    assert.equal(
      page.resolve('formatDropdownToggle').getAttribute('aria-expanded'),
      'false'
    );
  } finally {
    page.close();
  }
});

// ---------------------------------------------------------------------------
// Reset confirmation dialog
// ---------------------------------------------------------------------------

test('options: the reset dialog is a labelled modal dialog', async () => {
  const page = await loadOptions();
  try {
    const dialog = page
      .resolve('reset_confirmation')
      .querySelector('[role="dialog"]');

    assert.ok(dialog, 'a role=dialog element exists');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.equal(dialog.getAttribute('aria-labelledby'), 'reset_dialog_title');
    assert.equal(dialog.getAttribute('aria-describedby'), 'reset_dialog_desc');
  } finally {
    page.close();
  }
});

test('options: opening the reset dialog focuses Cancel, not the destructive action', async () => {
  const page = await loadOptions();
  try {
    await page.click('reset_settings');

    assert.equal(page.isHidden('reset_confirmation'), false, 'dialog opened');
    assert.equal(
      active(page),
      page.resolve('cancel_reset'),
      'focus lands on the non-destructive choice'
    );
  } finally {
    page.close();
  }
});

test('options: Escape cancels the reset dialog and restores focus to the opener', async () => {
  const page = await loadOptions();
  try {
    const opener = page.resolve('reset_settings');
    opener.focus();
    await page.click('reset_settings');

    press(page, 'cancel_reset', 'Escape');
    await page.flush();

    assert.equal(page.isHidden('reset_confirmation'), true, 'dialog closed');
    assert.equal(active(page), opener, 'focus returned to the opener');
  } finally {
    page.close();
  }
});

test('options: Escape does nothing while the reset dialog is closed', async () => {
  const page = await loadOptions();
  try {
    assert.equal(page.isHidden('reset_confirmation'), true);
    press(page, 'reset_settings', 'Escape');
    await page.flush();
    assert.equal(page.isHidden('reset_confirmation'), true);
  } finally {
    page.close();
  }
});

test('options: Tab is trapped inside the reset dialog', async () => {
  const page = await loadOptions();
  try {
    await page.click('reset_settings');

    const dialog = page
      .resolve('reset_confirmation')
      .querySelector('[role="dialog"]');
    const focusables = Array.from(dialog.querySelectorAll('button'));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Forward off the last element wraps to the first.
    last.focus();
    const forward = press(page, last, 'Tab');
    assert.equal(forward.defaultPrevented, true, 'the browser default was taken over');
    assert.equal(active(page), first, 'wrapped to the first control');

    // Backward off the first element wraps to the last.
    first.focus();
    const backward = press(page, first, 'Tab', { shiftKey: true });
    assert.equal(backward.defaultPrevented, true);
    assert.equal(active(page), last, 'wrapped to the last control');
  } finally {
    page.close();
  }
});

test('options: cancelling the reset dialog leaves settings untouched', async () => {
  const page = await loadOptions();
  try {
    const before = JSON.parse(JSON.stringify(page.chrome.storage.sync._data));

    await page.click('reset_settings');
    await page.click('cancel_reset');

    assert.equal(page.isHidden('reset_confirmation'), true);
    assert.deepEqual(
      JSON.parse(JSON.stringify(page.chrome.storage.sync._data)),
      before,
      'cancelling wrote nothing'
    );
  } finally {
    page.close();
  }
});

// ---------------------------------------------------------------------------
// Status announcements
// ---------------------------------------------------------------------------

test('options: the toast live region exists before any message is shown', async () => {
  const page = await loadOptions();
  try {
    const region = page.resolve('message_live_region');
    assert.ok(region, 'region is present at first paint');
    assert.equal(region.getAttribute('aria-live'), 'polite');
    assert.equal(region.getAttribute('aria-atomic'), 'true');
    assert.equal(region.textContent.trim(), '', 'and starts empty');
  } finally {
    page.close();
  }
});

test('popup: the status message element is a polite live region', async () => {
  const page = await loadPopup();
  try {
    const message = page.resolve('message');
    assert.equal(message.getAttribute('role'), 'status');
    assert.equal(message.getAttribute('aria-live'), 'polite');
    assert.equal(message.getAttribute('aria-atomic'), 'true');
  } finally {
    page.close();
  }
});
