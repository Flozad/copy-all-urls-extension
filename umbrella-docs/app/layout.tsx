import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <Link href="/" className="text-xl font-bold">
                  Umbrella
                </Link>
                <div className="flex items-center gap-6">
                  <Link
                    href="/docs"
                    className="text-sm font-medium hover:underline"
                  >
                    Documentation
                  </Link>
                  <a
                    href="https://github.com/Flozad/copy-all-urls-extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-600">
                Built by{' '}
                <a
                  href="https://github.com/Flozad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-black"
                >
                  Lozard
                </a>
                . Open source on{' '}
                <a
                  href="https://github.com/Flozad/copy-all-urls-extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-black"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
