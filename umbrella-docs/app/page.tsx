import type { Metadata } from 'next';
import { Constellation } from '@/components/constellation';
import { Shot } from '@/components/shot';

export const metadata: Metadata = {
  title: 'Umbrella — Copy All URLs | Free Chrome Extension for Tab Management',
  description:
    'Save every tab in one clip and restore the whole session later. Umbrella copies your open tabs in text, HTML, JSON or custom formats and pastes them back as new tabs. Free, open-source, no server.',
  alternates: { canonical: 'https://tabs.clasicwebtools.com' },
};

const CHROME_STORE =
  'https://chromewebstore.google.com/detail/umbrella-copy-all-urls/iodlbflkegnangnopebgjojlgmcbbpdh';

export default function HomePage() {
  return (
    <>
      {/* ═══ Masthead ═══ */}
      <header className="u-hero">
        <div className="u-masthead">
          <div className="u-rain" aria-hidden="true" />
          <Constellation />
          <Dome />
          <p className="u-eyebrow-top">Copy All URLs · Chrome extension</p>
          <h1 className="u-h1 u-reveal">
            Save every tab.
            <span className="u-said">Restore the whole session.</span>
          </h1>
          <p className="u-lede u-reveal d1">
            One click puts every open tab on your clipboard — as a list, HTML,
            JSON, or your own format. Paste it back tomorrow and the whole
            session re-opens. Umbrella keeps the day&rsquo;s reading dry.
          </p>
          <div className="u-cta u-reveal d2">
            <a
              className="u-btn primary"
              href={CHROME_STORE}
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Chrome — it&rsquo;s free
            </a>
            <a className="u-btn quiet" href="#loop">
              See how it works
            </a>
          </div>
          <p className="u-hero-meta u-reveal d2">
            <span>No account</span>
            <span>No server</span>
            <span>Open source</span>
          </p>
        </div>
      </header>

      {/* ═══ The demo stage — the whole loop, one take ═══ */}
      <section className="u-demo" aria-label="Umbrella, end to end">
        <div className="u-demo-wrap">
          <p className="u-eyebrow">The whole thing, in one take</p>
          <div className="u-demo-shot">
            <Shot
              shape="wide"
              src="hero-demo"
              ariaLabel="A window full of tabs copied to the clipboard in one click, then pasted back into a fresh window so every tab re-opens."
              caption="Copy a window full of tabs. Paste them back later and the session returns. Nothing here is a mockup — it's the extension, running on real tabs."
            />
          </div>
        </div>
      </section>

      {/* ═══ 01 — The problem ═══ */}
      <section id="why" className="u-section">
        <div className="u-wrap">
          <p className="u-eyebrow">01 — The problem</p>
          <h2 className="u-h2">
            A closed window takes <em>the whole day with it</em>
          </h2>
          <p className="u-standfirst">
            You had forty tabs open for a reason — a plan half-formed across a
            dozen tabs. Then Chrome restarts, or you close the wrong window, and
            it&rsquo;s gone. Bookmarking each one was never going to happen.
          </p>

          <figure className="u-specimen">
            <figure>
              <div className="u-spec-plate u-spec-mess" aria-hidden="true" />
              <figcaption>Forty tabs, none of them saved.</figcaption>
            </figure>
            <figure>
              <div className="u-spec-plate u-spec-order" aria-hidden="true" />
              <figcaption>One clip on the clipboard.</figcaption>
            </figure>
          </figure>

          <div className="u-callout">
            <p>
              A session is a document. It deserves a{' '}
              <strong>copy and a paste</strong>, not a graveyard of bookmarks
              you&rsquo;ll never open.
            </p>
          </div>

          <p className="u-lead">
            Umbrella turns the tabs you have open into text you can keep, send,
            or re-open — in whatever shape the next step needs. Grab everything,
            or just the tabs you selected. Paste it into a doc, a ticket, a chat,
            or straight back into Chrome.
          </p>
        </div>
      </section>

      {/* ═══ 02 — How it works ═══ */}
      <section id="loop" className="u-section">
        <div className="u-wrap">
          <p className="u-eyebrow">02 — How it works</p>
          <h2 className="u-h2">One loop, four moves</h2>
          <ol className="u-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Dial index={i} />
                <h3>{s.title}</h3>
                <p dangerouslySetInnerHTML={{ __html: s.body }} />
              </li>
            ))}
          </ol>
          <p className="u-loop-coda">
            <span>04 → 01</span>
            The pasted tabs open, you keep reading, and tonight you copy them
            again. That&rsquo;s the loop — your session, saved and restored as
            often as you like.
          </p>
        </div>
      </section>

      {/* ═══ 03 — The tour ═══ */}
      <section id="tour" className="u-section">
        <div className="u-wrap">
          <p className="u-eyebrow">03 — The tour</p>
          <h2 className="u-h2">Every feature, and what it&rsquo;s for</h2>
          <p className="u-lead">
            A popup with two buttons, a format menu, a full options page, and a
            right-click menu on every page. That&rsquo;s the whole app — no
            account, nothing to configure before it works.
          </p>

          <div className="u-tour">
            {TOUR.map((t) => (
              <article key={t.src}>
                <p className="u-where">{t.where}</p>
                <h3>{t.title}</h3>
                <p dangerouslySetInnerHTML={{ __html: t.body }} />
                <Shot
                  shape={t.shape}
                  src={t.src}
                  label={t.label}
                  note={t.note}
                  ariaLabel={t.aria}
                  caption={t.caption}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 04 — The details ═══ */}
      <section id="details" className="u-section">
        <div className="u-wrap">
          <p className="u-eyebrow">04 — The details</p>
          <h2 className="u-h2">Built to be dependable</h2>
          <dl className="u-specs">
            {SPECS.map((sp) => (
              <div key={sp.key}>
                <dt>
                  <span className="u-spec-glyph">{sp.glyph}</span>
                  <span>{sp.key}</span>
                </dt>
                <dd>
                  <h3>{sp.title}</h3>
                  <p>{sp.body}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ═══ 05 — Privacy ═══ */}
      <section id="privacy" className="u-section">
        <div className="u-wrap">
          <p className="u-eyebrow">05 — Privacy</p>
          <h2 className="u-h2">There is no server</h2>
          <p className="u-lead">
            Umbrella runs entirely in your browser. There&rsquo;s no backend, no
            account, and no analytics on your tabs. Your URLs go to your
            clipboard and nowhere else — the extension never phones home because
            there&rsquo;s no home to phone.
          </p>
          <p className="u-lead u-mt">
            Settings are stored with Chrome&rsquo;s own sync, with a local
            fallback and a built-in repair tool if storage ever gets into a bad
            state. The code is open source — read every line on{' '}
            <a
              className="u-inline"
              href="https://github.com/Flozad/copy-all-urls-extension"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
          <p className="u-mt">
            <a className="u-inline" href="/privacy">
              Read the full privacy policy →
            </a>
          </p>
        </div>
      </section>
    </>
  );
}

/* ── The hero canopy: a wide hairline umbrella floated behind the nameplate ── */
function Dome() {
  return (
    <svg
      className="u-dome"
      viewBox="0 0 560 210"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMin meet"
    >
      <g stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="1.4">
        {/* canopy */}
        <path d="M30 180 A250 150 0 0 1 530 180" />
        {/* scalloped hem */}
        <path d="M30 180 Q 55 196 80 180 Q 105 196 130 180 Q 155 196 180 180 Q 205 196 230 180 Q 255 196 280 180 Q 305 196 330 180 Q 355 196 380 180 Q 405 196 430 180 Q 455 196 480 180 Q 505 196 530 180" />
        {/* ribs */}
        <path d="M280 32 L80 180 M280 32 L180 180 M280 32 L280 180 M280 32 L380 180 M280 32 L480 180" />
        {/* pole */}
        <path
          d="M280 32 V 208"
          strokeOpacity="0.22"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/* ── One loop dial: a canopy-arc gauge that fills one more quadrant per step ── */
function Dial({ index }: { index: number }) {
  return (
    <span className="u-dial" aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <title>Step {index + 1}</title>
        <circle className="track" cx="50" cy="50" r="34" />
        <circle className="arc" cx="50" cy="50" r="34" pathLength={4} />
      </svg>
      <b>{`0${index + 1}`}</b>
    </span>
  );
}

const STEPS = [
  {
    title: 'Open the popup',
    body: 'Click the Umbrella icon in your toolbar — or press <span class="u-code">⌘⇧U</span>. It reads every open tab in the current window (or every window, if you ask).',
  },
  {
    title: 'Pick a format',
    body: 'A plain list, HTML links, JSON, URL-only, delimited, or a custom template of your own. Choose once and it sticks.',
  },
  {
    title: 'Copy every tab',
    body: 'One click puts the whole set on your clipboard. Paste it into a doc, a ticket, a chat — or keep it as tonight&rsquo;s session file.',
  },
  {
    title: 'Paste to restore',
    body: 'Drop a list of URLs into Umbrella and hit <em>Paste</em>. Every link re-opens as a new tab, and the session you saved is back.',
  },
];

const TOUR: {
  where: string;
  title: string;
  body: string;
  src?: string;
  label?: string;
  note?: string;
  shape: 'wide' | 'panel';
  aria: string;
  caption: React.ReactNode;
}[] = [
  {
    where: 'Popup · Copy',
    title: 'One button, every tab',
    body: '<strong>Copy URLs</strong> grabs the whole window at once. A quiet toast tells you how many it took, and the text is on your clipboard before the popup closes.',
    src: 'tour-copy',
    shape: 'panel',
    aria:
      'The Umbrella popup: the Copy URLs button pressed, a toast reading “47 URLs copied”.',
    caption: (
      <>
        The popup, mid-copy — <code>47 URLs copied</code>, done in one press.
      </>
    ),
  },
  {
    where: 'Popup · Formats',
    title: 'Six ways out',
    body: 'The little chevron opens the format menu: <strong>Text</strong> (URL + title), <strong>HTML</strong> links, <strong>JSON</strong>, <strong>URL only</strong>, <strong>Delimited</strong>, or a <strong>Custom</strong> template built from <span class="u-code">$url</span>, <span class="u-code">$title</span> and <span class="u-code">$date</span>.',
    src: 'tour-formats',
    shape: 'panel',
    aria:
      'The format dropdown cycling through Text, HTML, JSON, URL only, Delimited and Custom, the preview changing with each.',
    caption: 'The format menu, and the same tabs rendered six different ways.',
  },
  {
    where: 'Popup · Paste',
    title: 'Paste, and the session re-opens',
    body: 'Drop any list of URLs into the box and hit <strong>Paste URLs</strong>. Umbrella finds the links in whatever you pasted — even a messy log — and opens each one as a new tab.',
    src: 'tour-paste',
    shape: 'wide',
    aria:
      'A list of URLs pasted into the box, the Paste button pressed, and a fresh window filling with tabs one after another.',
    caption:
      'A saved list pasted back in — every link re-opening as its own tab.',
  },
  {
    where: 'Popup · Auto-copy',
    title: 'Copies the moment it opens',
    body: 'Turn on <strong>Auto-copy</strong> and the tabs are on your clipboard as soon as the popup appears — no click at all. Open, switch away, paste. Built for the times you do this fifty times a day.',
    src: 'tour-autocopy',
    shape: 'panel',
    aria:
      'The popup opening with Auto-copy enabled and immediately showing a “copied” toast without any button press.',
    caption: 'Auto-copy on: the clipboard is loaded before you touch anything.',
  },
  {
    where: 'Anywhere · Keyboard',
    title: 'Never leave the keyboard',
    body: 'Press <span class="u-code">⌘⇧U</span> to copy every tab and <span class="u-code">⌘⇧Y</span> to paste them back — from any page, without opening the popup. Rebind them in Chrome&rsquo;s shortcuts if you like.',
    src: 'tour-shortcuts',
    shape: 'wide',
    aria:
      'Keyboard keys Command, Shift and U lighting up, and the copy confirmation appearing over the page.',
    caption: (
      <>
        <code>⌘⇧U</code> to copy, <code>⌘⇧Y</code> to paste — no popup needed.
      </>
    ),
  },
  {
    where: 'Any page · Right-click',
    title: 'On the context menu, too',
    body: 'Right-click anywhere on a page and Umbrella is right there in the menu — copy the tabs or paste them back without reaching for the toolbar.',
    src: 'tour-context',
    label: 'Recording — right-click menu',
    note: 'The context menu, on every page you visit.',
    shape: 'wide',
    aria:
      'A right-click context menu open on a web page with Umbrella&rsquo;s copy and paste entries highlighted.',
    caption: 'The right-click menu, on every page you visit.',
  },
  {
    where: 'Popup · Scope',
    title: 'This window, or all of them',
    body: 'One toggle switches Umbrella between the current window and <strong>every window</strong> you have open. Watch the count jump as it takes in the lot.',
    src: 'tour-windows',
    label: 'Recording — all windows',
    note: 'All-windows on — the count takes in every open window.',
    shape: 'panel',
    aria:
      'The “all windows” toggle switched on, and the tab count rising from one window&rsquo;s worth to every window&rsquo;s.',
    caption: 'All-windows on — the count jumps to take in every open window.',
  },
  {
    where: 'Options',
    title: 'Settings that stay put',
    body: 'Default action, default format, custom template, delimiters, dark mode, auto-copy — all on one page, all remembered. Set it the way you work and forget it.',
    src: 'tour-options',
    label: 'Recording — options page',
    note: 'The options page — every default, in one place.',
    shape: 'panel',
    aria:
      'The options page scrolling through default action, format, custom template and delimiter settings.',
    caption: 'The options page — every default, in one place.',
  },
  {
    where: 'Options · Storage',
    title: 'A repair tool, just in case',
    body: 'Settings sync across your machines, with a local fallback if sync hiccups. A built-in <strong>health check</strong> shows the state of both, and a <strong>repair</strong> button fixes it if anything ever drifts.',
    src: 'tour-storage',
    label: 'Recording — storage health',
    note: 'Storage health check and one-click repair.',
    shape: 'panel',
    aria:
      'The storage health panel reporting sync and local status, then a repair action resolving to all-green.',
    caption: 'Storage health check and one-click repair.',
  },
  {
    where: 'Everywhere · Theme',
    title: 'Dark by default, if you are',
    body: 'Umbrella follows your system theme and ships a proper dark mode — the popup and the options page both, easy on the eyes at midnight.',
    src: 'tour-dark',
    label: 'Recording — dark mode',
    note: 'Light and dark — the popup switching cleanly between them.',
    shape: 'panel',
    aria:
      'The popup switching from light to dark theme, every surface recolouring cleanly.',
    caption: 'Light and dark — the popup switching cleanly between them.',
  },
];

const SPECS = [
  {
    key: 'Local',
    title: 'It runs in your browser',
    body: 'No server, no account, no telemetry on your tabs. Everything happens on your machine, between the browser and your clipboard.',
    glyph: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="2.7" r="0.95" fill="currentColor" />
        <path
          d="M4 16 A12 12 0 0 1 28 16 Q 25 18.4 22 16 Q 19 18.4 16 16 Q 13 18.4 10 16 Q 7 18.4 4 16 Z"
          fill="currentColor"
        />
        <path
          d="M16 4 V 24 a 2.6 2.6 0 0 1 -5.2 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'Formats',
    title: 'Whatever the next step needs',
    body: 'Text, HTML, JSON, URL-only, delimited, or a custom template. The tabs come out in the shape that fits the doc, ticket or chat you’re pasting into.',
    glyph: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 8 H27 M5 14 H21 M5 20 H27 M5 26 H17" />
        </g>
      </svg>
    ),
  },
  {
    key: 'Resilient',
    title: 'Settings that survive',
    body: 'Chrome sync with a local fallback, a health check, and a repair tool — because a preferences page that silently forgets your settings is worse than none.',
    glyph: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4 L27 8 V15 C27 22 22 26 16 28 C10 26 5 22 5 15 V8 Z" />
          <path d="M11.5 16 L15 19.5 L21 12.5" />
        </g>
      </svg>
    ),
  },
  {
    key: 'Free',
    title: 'Free, and open source',
    body: 'No paid tier, no upsell, no catch. Every line is on GitHub under an open licence — fork it, read it, or send a pull request.',
    glyph: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="12" />
          <path d="M16 9 V16 L21 19" />
        </g>
      </svg>
    ),
  },
];
