import Link from 'next/link';

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
      <div className="flex gap-8 py-8">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className="sticky top-8 space-y-8">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium">{item.name}</p>
                    {item.children && (
                      <ul className="space-y-2 border-l border-gray-200 pl-4">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className="text-sm text-gray-600 hover:text-black hover:underline"
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
        <div className="flex-1 min-w-0">
          <article className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-black prose-a:underline hover:prose-a:no-underline prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200">
            {children}
          </article>
        </div>
      </div>
    </div>
  );
}
