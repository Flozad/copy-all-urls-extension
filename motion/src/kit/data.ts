import type {BrowserTab} from './Chrome'
import {theme} from './theme'

// One believable working session — the pile of tabs a real person wants to save
// and reopen. Titles + favicon tints for the strip, and the same set expressed
// as the URL list the popup copies. Keep the two in lockstep: the strip and the
// textarea are showing the same tabs.

const F = theme.faviconInk

export const SESSION: {tab: BrowserTab; title: string; url: string}[] = [
  {tab: {title: 'Flozad/copy-all-urls', fav: theme.text, active: true}, title: 'Copy All URLs — GitHub', url: 'https://github.com/Flozad/copy-all-urls-extension'},
  {tab: {title: 'Chrome Web Store', fav: F[1]}, title: 'Chrome Web Store', url: 'https://chromewebstore.google.com/category/extensions'},
  {tab: {title: 'tabs — MDN', fav: F[0]}, title: 'chrome.tabs — MDN', url: 'https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/tabs'},
  {tab: {title: 'Remotion Docs', fav: F[2]}, title: 'Remotion Documentation', url: 'https://www.remotion.dev/docs'},
  {tab: {title: 'Hacker News', fav: F[3]}, title: 'Hacker News', url: 'https://news.ycombinator.com'},
  {tab: {title: 'Stack Overflow', fav: F[4]}, title: 'chrome-extension — Stack Overflow', url: 'https://stackoverflow.com/questions/tagged/chrome-extension'},
  {tab: {title: 'Figma', fav: F[3]}, title: 'Figma — Recent files', url: 'https://www.figma.com/files/recent'},
  {tab: {title: 'Roadmap — Notion', fav: F[1]}, title: 'Roadmap — Notion', url: 'https://www.notion.so/Roadmap'},
  {tab: {title: 'Inbox — Linear', fav: F[2]}, title: 'Inbox — Linear', url: 'https://linear.app/umbrella/inbox'},
  {tab: {title: 'Vercel', fav: F[4]}, title: 'Vercel Dashboard', url: 'https://vercel.com/dashboard'},
  {tab: {title: 'Tailwind CSS', fav: F[0]}, title: 'Docs — Tailwind CSS', url: 'https://tailwindcss.com/docs'},
  {tab: {title: 'YouTube', fav: F[1]}, title: 'Subscriptions — YouTube', url: 'https://www.youtube.com/feed/subscriptions'},
  {tab: {title: 'Google', fav: F[3]}, title: 'save all tabs — Google', url: 'https://www.google.com/search?q=save+all+tabs'},
  {tab: {title: 'ChatGPT', fav: F[0]}, title: 'ChatGPT', url: 'https://chat.openai.com'},
]

export const TABS: BrowserTab[] = SESSION.map((s) => s.tab)
export const URLS: string[] = SESSION.map((s) => s.url)

/** The url_only copy body — one URL per line, exactly what the popup produces. */
export const urlOnlyText = (n = URLS.length) => URLS.slice(0, n).join('\n')

/** The text (URL + Title) body. */
export const textBody = (n = URLS.length) =>
  SESSION.slice(0, n)
    .map((s) => `${s.title}\n${s.url}`)
    .join('\n\n')

/** The JSON body — pretty-printed, what the JSON format emits. */
export const jsonBody = (n = 4) =>
  JSON.stringify(
    SESSION.slice(0, n).map((s) => ({title: s.title, url: s.url})),
    null,
    2,
  )
