import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Complete guide for Umbrella Chrome extension. Learn how to copy URLs in multiple formats, use keyboard shortcuts, create custom templates, and troubleshoot issues.',
};

const navigation = [
  { name: 'Getting Started', href: '/docs' },
  {
    name: 'Features',
    children: [
      { name: 'URL Formats', href: '/docs/formats' },
      { name: 'Keyboard Shortcuts', href: '/docs/shortcuts' },
      { name: 'Custom Templates', href: '/docs/templates' },
      { name: 'Auto-Copy', href: '/docs/auto-copy' },
      { name: 'Context Menu', href: '/docs/context-menu' },
    ],
  },
  { name: 'Troubleshooting', href: '/docs/troubleshooting' },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex gap-12 py-12">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block" aria-label="Documentation navigation">
          <nav className="sticky top-24 space-y-8" role="navigation">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-sm font-semibold hover:underline underline-offset-4 transition-all"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {item.name}
                    </p>
                    {item.children && (
                      <ul className="space-y-2.5 border-l-2 border-gray-100 pl-4 hover:border-gray-200 transition-colors">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className="block text-sm text-gray-600 hover:text-black hover:translate-x-0.5 transition-all"
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-5xl prose-h1:mb-8 prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-p:leading-relaxed prose-a:text-black prose-a:underline prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:decoration-gray-400 prose-a:transition-colors prose-pre:bg-gray-50 prose-pre:border-2 prose-pre:border-gray-200 prose-pre:rounded-xl prose-code:text-black prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            {children}
          </article>
        </div>
      </div>
    </div>
  );
}
