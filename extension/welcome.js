/**
 * Welcome page shown once, on first install.
 *
 * Two jobs: open the options page, and show the shortcuts the user actually
 * has rather than the hardcoded defaults — they differ per platform and the
 * user may already have remapped them at chrome://extensions/shortcuts.
 */

document.addEventListener('DOMContentLoaded', () => {
    const openOptions = document.getElementById('openOptions');
    if (openOptions) {
        openOptions.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Replace the default shortcut labels with the real, live bindings.
    if (chrome.commands && chrome.commands.getAll) {
        chrome.commands.getAll((commands) => {
            if (chrome.runtime.lastError || !commands) return;

            const targets = {
                'copy-urls': document.getElementById('kbdCopy'),
                'paste-urls': document.getElementById('kbdPaste')
            };

            for (const command of commands) {
                const el = targets[command.name];
                if (!el) continue;

                if (command.shortcut) {
                    el.textContent = command.shortcut;
                } else {
                    // The user cleared it, or Chrome couldn't assign it because
                    // another extension already claimed the combination.
                    el.textContent = 'not set';
                }
            }
        });
    }
});
