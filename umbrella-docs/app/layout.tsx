import './globals.css';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Link from 'next/link';
import Script from 'next/script';
import { createSoftwareApplicationSchema } from '@/lib/metadata';

export const metadata: Metadata = {
  metadataBase: new URL('https://tabs.clasicwebtools.com'),
  title: {
    default: 'Umbrella - Copy All URLs | Chrome Extension for Tab Management',
    template: '%s | Umbrella',
  },
  description:
    'Save and restore browser tabs instantly with Umbrella Chrome extension. Copy URLs in multiple formats (HTML, JSON, custom), paste to reopen tabs. Free, open-source, and privacy-focused.',
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
  applicationName: 'Umbrella - Copy All URLs',
  alternates: {
    canonical: 'https://tabs.clasicwebtools.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tabs.clasicwebtools.com',
    title: 'Umbrella - Copy All URLs | Chrome Extension for Tab Management',
    description:
      'Save and restore browser tabs instantly. Copy URLs in multiple formats, paste to reopen tabs. Free and open-source.',
    siteName: 'Umbrella',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Umbrella Chrome Extension - Tab Management Made Easy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umbrella - Copy All URLs | Chrome Extension',
    description:
      'Save and restore browser tabs instantly. Copy URLs in multiple formats, paste to reopen tabs.',
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
    icon: '/icon.png',
    shortcut: '/icon.png',
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Favicon and icons */}
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        {/* JSON-LD Structured Data */}
        <Script
          id="schema-software"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareSchema),
          }}
        />

        {/* Google Analytics - Replace with your tracking ID */}
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
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
        >
          Skip to main content
        </a>
        <div className="min-h-screen flex flex-col bg-white">
          <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
            <nav
              className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
              aria-label="Main navigation"
            >
              <div className="flex h-16 items-center justify-between">
                <Link
                  href="/"
                  className="text-xl font-bold hover:opacity-70 transition-opacity"
                  aria-label="Umbrella home page"
                >
                  Umbrella
                </Link>
                <div className="flex items-center gap-8">
                  <Link
                    href="/docs"
                    className="text-sm font-medium hover:underline underline-offset-4 transition-all"
                  >
                    Documentation
                  </Link>
                  <a
                    href="https://github.com/Flozad/copy-all-urls-extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline underline-offset-4 transition-all"
                    aria-label="View source code on GitHub"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </nav>
          </header>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <footer className="border-t bg-gray-50" role="contentinfo">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center gap-4">
                <p className="text-center text-sm text-gray-600">
                  Built by{' '}
                  <a
                    href="https://clasicwebtools.com"
                    target="_blank"
                    rel="noopener noreferrer author"
                    className="font-medium text-black hover:underline underline-offset-4"
                  >
                    Lozard
                  </a>
                </p>
                <nav className="flex items-center gap-6 flex-wrap justify-center" aria-label="Footer navigation">
                  <a
                    href="https://github.com/Flozad/copy-all-urls-extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-black transition-colors"
                  >
                    GitHub
                  </a>
                  <Link
                    href="/docs"
                    className="text-sm text-gray-600 hover:text-black transition-colors"
                  >
                    Documentation
                  </Link>
                  <a
                    href="https://chromewebstore.google.com/detail/umbrella-copy-all-urls/iodlbflkegnangnopebgjojlgmcbbpdh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-black transition-colors"
                  >
                    Chrome Web Store
                  </a>
                </nav>
                <nav className="flex items-center gap-6 flex-wrap justify-center" aria-label="Legal">
                  <Link
                    href="/privacy"
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/terms"
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Terms of Service
                  </Link>
                  <Link
                    href="/cookies"
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </nav>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
