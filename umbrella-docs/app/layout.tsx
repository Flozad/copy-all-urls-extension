import './globals.css';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Newsreader } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import { createSoftwareApplicationSchema } from '@/lib/metadata';
import { Mark } from '@/components/mark';

// Newsreader — the masthead/display voice. Variable weight + a true italic for
// the "verdict" line, self-hosted by next/font so no third-party origin is hit
// at runtime. Distinct on purpose from the reference site's Fraunces.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const CHROME_STORE =
  'https://chromewebstore.google.com/detail/umbrella-copy-all-urls/iodlbflkegnangnopebgjojlgmcbbpdh';
const GITHUB = 'https://github.com/Flozad/copy-all-urls-extension';

export const metadata: Metadata = {
  metadataBase: new URL('https://tabs.clasicwebtools.com'),
  title: {
    default: 'Umbrella — Copy All URLs | Chrome Extension for Tab Management',
    template: '%s | Umbrella',
  },
  description:
    'Save every tab in one clip and restore the whole session later. Umbrella copies your open tabs in text, HTML, JSON or custom formats and pastes them back as new tabs. Free, open-source, no server.',
  keywords: [
    'chrome extension',
    'tab management',
    'url copier',
    'browser tabs',
    'productivity tool',
    'clipboard manager',
    'tab saver',
    'session manager',
    'browser productivity',
    'open source extension',
    'url manager',
    'tab organizer',
  ],
  authors: [{ name: 'Lozard', url: 'https://clasicwebtools.com' }],
  creator: 'Lozard',
  publisher: 'Clasic Web Tools',
  applicationName: 'Umbrella — Copy All URLs',
  alternates: { canonical: 'https://tabs.clasicwebtools.com' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tabs.clasicwebtools.com',
    title: 'Umbrella — Copy All URLs | Chrome Extension for Tab Management',
    description:
      'Save every tab in one clip and restore the whole session later. Copy your open tabs in multiple formats, paste them back as new tabs. Free and open-source.',
    siteName: 'Umbrella',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Umbrella — save every tab, restore the session',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umbrella — Copy All URLs | Chrome Extension',
    description:
      'Save every tab in one clip and restore the whole session later. Copy your open tabs in multiple formats, paste them back as new tabs.',
    images: ['/og-image.png'],
    creator: '@lozards',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  manifest: '/manifest.json',
  category: 'technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const softwareSchema = createSoftwareApplicationSchema();

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${newsreader.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <Script
          id="schema-software"
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD schema
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
        >
          Skip to main content
        </a>

        {/* ── Masthead nav ── */}
        <header className="u-header">
          <nav className="u-nav" aria-label="Main navigation">
            <Link className="u-brand" href="/" aria-label="Umbrella home">
              <Mark className="u-mark" />
              <strong>Umbrella</strong>
            </Link>
            <span className="u-links">
              <Link className="u-nav-hide" href="/#loop">
                How it works
              </Link>
              <Link className="u-nav-hide" href="/#tour">
                Tour
              </Link>
              <Link href="/docs">Docs</Link>
              <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a
                className="u-install"
                href={CHROME_STORE}
                target="_blank"
                rel="noopener noreferrer"
              >
                Add to Chrome
              </a>
            </span>
          </nav>
        </header>

        <main id="main-content">{children}</main>

        {/* ── Colophon footer — the page signs itself over a settling rain ── */}
        <footer className="u-footer" role="contentinfo">
          <div className="u-wrap u-colophon">
            <div className="u-colophon-brand">
              <Mark className="u-mark-lg" />
              <p className="u-wordmark">Umbrella</p>
              <p className="u-colophon-line">
                Save every tab. Restore the session. Never lose the day&rsquo;s
                reading to a closed window again.
              </p>
            </div>
            <dl className="u-colophon-meta">
              <div>
                <dt>Ships as</dt>
                <dd>A Chrome extension</dd>
              </div>
              <div>
                <dt>Formats</dt>
                <dd>Text · HTML · JSON · URL only · Delimited · Custom</dd>
              </div>
              <div>
                <dt>Shortcuts</dt>
                <dd>⌘⇧U copy · ⌘⇧Y paste</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>Free &amp; open source</dd>
              </div>
            </dl>
          </div>
          <div className="u-wrap u-colophon-foot">
            <a href={CHROME_STORE} target="_blank" rel="noopener noreferrer">
              Chrome Web Store
            </a>
            <Link href="/docs">Docs</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <span className="u-colophon-rule" aria-hidden="true" />
            <span>Built by Lozard · Clasic Web Tools</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
