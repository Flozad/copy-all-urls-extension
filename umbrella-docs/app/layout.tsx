import './globals.css';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Link from 'next/link';

export const metadata: Metadata = {
  metadataBase: new URL('https://umbrella-docs.vercel.app'),
  title: {
    default: 'Umbrella - Copy All URLs Documentation',
    template: '%s | Umbrella Docs',
  },
  description:
    'Documentation for Umbrella Chrome extension. Save and restore browser tabs instantly with multiple formats and keyboard shortcuts.',
  keywords: [
    'chrome extension',
    'tab management',
    'url copier',
    'browser tabs',
    'productivity',
    'clipboard',
  ],
  authors: [{ name: 'Lozard', url: 'https://github.com/Flozad' }],
  creator: 'Lozard',
  publisher: 'Lozard',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://umbrella-docs.vercel.app',
    title: 'Umbrella - Copy All URLs Documentation',
    description:
      'Save and restore browser tabs instantly with Umbrella Chrome extension',
    siteName: 'Umbrella Docs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umbrella - Copy All URLs Documentation',
    description:
      'Save and restore browser tabs instantly with Umbrella Chrome extension',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <div className="min-h-screen flex flex-col bg-white">
          <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <Link
                  href="/"
                  className="text-xl font-bold hover:opacity-70 transition-opacity"
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
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center gap-4">
                <p className="text-center text-sm text-gray-600">
                  Built by{' '}
                  <a
                    href="https://github.com/Flozad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-black hover:underline underline-offset-4"
                  >
                    Lozard
                  </a>
                </p>
                <div className="flex items-center gap-6">
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
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
