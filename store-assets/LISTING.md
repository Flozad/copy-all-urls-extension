# Chrome Web Store listing copy

Paste-ready text for the Developer Dashboard. Every field below is written
against the published requirements — see `## Compliance notes` at the end for
which rule each choice is satisfying.

Verify limits after any edit:

```bash
node tools/check-listing.js
```

---

## Category

**Workflow & Planning** (primary).

Rationale: the quality-guidelines FAQ names "tab management" as an example of a
valid narrow *browser function*. "Tools" is the plausible alternative but is
broader and more crowded. Not "Developer Tools" — the audience is general.

---

## Title

```
Umbrella - Copy All URLs
```

24 characters. No Google or Chrome trademark, per the branding rules.

> **Open risk — read before submitting.** "Copy All URLs" is also the name of a
> long-established extension. The listing guidance asks for titles that are
> unique and not similar to existing items, and the spam policy prohibits
> duplicate experiences. The "Umbrella - " prefix reduces but does not remove
> this. If the review comes back contested, leading with the brand
> ("Umbrella — Tab List Copier") is the fallback.

---

## Summary

Shown on the homepage, category pages, and search results. **132 character
limit.** Plain text only — no HTML.

```
Save every open tab to your clipboard in the format you want, then paste the list back any time to reopen them all.
```

115 characters. No superlatives, no competitor references.

---

## Description

Structured as an overview paragraph followed by a feature list, which is the
format the listing guidance asks for.

```
Umbrella saves the tabs you have open as plain text you can keep, send, or store anywhere — then turns that text back into open tabs whenever you need it.

Working on something across a dozen pages and need to stop? Save them to a note and restore the whole set later. Handing research to a colleague? Send them a list they can reopen in one action. No account, no sync service, no sign-in.

WHAT IT DOES

• Save all open tabs to your clipboard in one click, one keyboard shortcut, or from the right-click menu
• Paste a list back to reopen every link in it
• Six output formats: URL only, title and link, HTML, JSON, delimited, or your own template
• Custom templates using $url, $title, and $date, with configurable delimiters
• Recent-copy history, kept on your device, so you can go back to an earlier set
• Works across one window or all of them, and can be limited to just the ones you have highlighted
• Light and dark themes, full keyboard navigation, and screen-reader support

PRIVACY

Umbrella runs entirely on your machine. It requests no access to the sites you visit, injects no scripts into pages, and loads nothing from the network — the extension pages make zero web requests. What you save goes to your clipboard and nowhere else.

Open source: https://github.com/Flozad/copy-all-urls-extension
Documentation: https://tabs.clasicwebtools.com/docs
```

---

## Privacy tab

### Single purpose

```
Umbrella copies the URLs and titles of the user's open tabs to the clipboard in a text format of the user's choosing, and reopens tabs from a list of URLs pasted back in. That is its only function. It has no host permissions, injects no content scripts, changes no browser settings, and transmits no data off the device.
```

### Permission justifications

One per declared permission. Keep them specific — vague justifications get
rejected.

**tabs**
```
Required to read the url and title of the user's open tabs, which is the data this extension exists to copy. chrome.tabs.query returns tab objects with the url and title fields stripped unless this permission is granted, so without it the core feature cannot function at all. Tab data is formatted and written to the clipboard on the user's explicit action, and is never transmitted off the device or stored anywhere except a local, user-toggleable copy history in chrome.storage.local.
```

**clipboardWrite**
```
Required to write the formatted list to the clipboard from the extension's service worker when the user triggers the copy action via the keyboard shortcut or the right-click menu. In those paths no extension popup is open, so there is no focused document able to perform a user-activated clipboard write.
```

**clipboardRead**
```
Required to read a list of URLs the user has copied elsewhere so the extension can reopen them as tabs. This is the paste half of the extension's core function. As with copying, it runs only on an explicit user action (toolbar button, keyboard shortcut, or right-click menu).
```

**offscreen**
```
The clipboard APIs require a DOM document, and a Manifest V3 service worker has none. The extension creates a single offscreen document solely to perform the clipboard read or write. This design deliberately avoids the alternative — injecting a content script into the user's page to borrow its document — which would require host permissions across all sites.
```

**storage**
```
Stores the user's preferences (chosen output format, custom template, delimiter, theme, and which actions are enabled) and the local copy history. All of it stays on the device; chrome.storage.sync is used only so a user's own preferences follow their own Chrome profile.
```

**contextMenus**
```
Adds two right-click menu entries, "Copy URLs" and "Paste URLs", so the user can trigger the extension's two actions without opening the popup. The user can turn these off in the options page.
```

**alarms**
```
Used to clear the toolbar badge a few seconds after a copy or paste confirmation is shown. A plain setTimeout is unreliable here because the service worker can be terminated before it fires, which would leave a confirmation badge stuck on the toolbar indefinitely.
```

### Remote code

Select **No, I am not using remote code.**

```
All logic ships inside the extension package. There is no eval, no new Function, no string-based script injection, and no remotely hosted script or stylesheet — the Tailwind CSS build is vendored into the package rather than loaded from a CDN. The content security policy is restricted to script-src 'self'; object-src 'self'.
```

### Data usage

Check **exactly one** data type:

- [x] **Web browsing activity**
- [ ] everything else — leave unchecked

Why this one is checked: the published definition of web browsing activity
covers "the domains or URLs the browser interacts with." Tab URLs meet that
definition even though Umbrella never transmits them. Under-disclosing here is
a removal trigger, because the listing rules treat any contradiction between the
privacy fields and actual behaviour as grounds for takedown. The privacy policy
is where the "processed locally, never transmitted" nuance belongs.

Then certify all three: not sold to third parties, not used for any purpose
unrelated to the single purpose, and not used for creditworthiness or lending.
All three are true.

### Privacy policy URL

```
https://tabs.clasicwebtools.com/privacy
```

Required even though all handling is local — the requirement fires on
*handling* user data, not on transmitting it. The page must carry the Limited
Use disclosure, which it now does.

---

## Dashboard fields

| Field | Value |
|---|---|
| Website | `https://tabs.clasicwebtools.com` |
| Support URL | `https://tabs.clasicwebtools.com/docs/troubleshooting` |
| Developer name | Must match the manifest `author` — see below |

> **Reconcile developer identity before submitting.** The name currently appears
> four different ways: manifest `author` ("Lozard"), the dashboard developer
> name, the "Umbrella" product brand, and the `clasicwebtools.com` domain.
> Mismatched developer metadata is explicitly listed as misleading listing
> information. Pick one public-facing developer name and use it in the manifest
> and the dashboard.

---

## Compliance notes

- **Summary ≤ 132 chars**, plain text, no superlatives, no competitor names.
- **No keyword stuffing.** "Unnatural repetition of the same keyword more than
  5 times" is the stated threshold; `tools/check-listing.js` enforces it.
- **No unattributed testimonials** — the description contains none, and none
  should be added.
- **No false badges.** Never claim "Editor's Choice", "Number One", or a
  Featured status the item does not hold.
- **Screenshots must match the shipped version.** `05-settings.png` will need
  regenerating if the options page is restyled.
- **Promo tiles**: the guidance warns against heavy white and light grey,
  because tiles sit on a light grey background, and asks that the image work at
  half size. The strict-mono brand needs a near-black tile background to stay
  legible rather than a white one.
- **Featured badge is requested, not granted automatically.** Submit the
  nomination via the Chrome Web Store One Stop Support form once the listing is
  final.
