import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-7xl font-bold tracking-tight mb-8 leading-tight">
          Umbrella
        </h1>
        <p className="text-xl text-gray-600 mb-12 leading-relaxed">
          Save and restore browser tabs instantly. Copy URLs in multiple
          formats, paste to reopen tabs.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg bg-black px-8 py-3.5 text-sm font-medium text-white hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/Flozad/copy-all-urls-extension"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border-2 border-black px-8 py-3.5 text-sm font-medium hover:bg-black hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            View on GitHub →
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-32 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Multiple Formats"
          description="Copy URLs as text, HTML, JSON, or custom formats with templates"
          href="/docs/formats"
        />
        <FeatureCard
          title="Smart Paste"
          description="Paste URLs to open them in new tabs with automatic URL detection"
          href="/docs"
        />
        <FeatureCard
          title="Keyboard Shortcuts"
          description="Quick access with Ctrl+Shift+U (copy) and Ctrl+Shift+Y (paste)"
          href="/docs/shortcuts"
        />
        <FeatureCard
          title="Auto-Copy"
          description="Automatically copy URLs when popup opens for faster workflow"
          href="/docs/auto-copy"
        />
        <FeatureCard
          title="Context Menu"
          description="Right-click anywhere to copy or paste URLs"
          href="/docs/context-menu"
        />
        <FeatureCard
          title="Robust Storage"
          description="Settings persist reliably with automatic error recovery"
          href="/docs/troubleshooting"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border-2 border-gray-100 p-8 hover:border-black transition-all hover:shadow-lg"
    >
      <h3 className="font-semibold text-lg mb-3 group-hover:underline">
        {title}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      <div className="mt-4 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Learn more →
      </div>
    </Link>
  );
}
