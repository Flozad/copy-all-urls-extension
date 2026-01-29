import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tight mb-6">Umbrella</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Save and restore browser tabs instantly. Copy URLs in multiple
          formats, paste to reopen tabs.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-md bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/Flozad/copy-all-urls-extension"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-black px-6 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Multiple Formats"
          description="Copy URLs as text, HTML, JSON, or custom formats with templates"
        />
        <FeatureCard
          title="Smart Paste"
          description="Paste URLs to open them in new tabs with automatic URL detection"
        />
        <FeatureCard
          title="Keyboard Shortcuts"
          description="Quick access with Ctrl+Shift+U (copy) and Ctrl+Shift+Y (paste)"
        />
        <FeatureCard
          title="Auto-Copy"
          description="Automatically copy URLs when popup opens for faster workflow"
        />
        <FeatureCard
          title="Context Menu"
          description="Right-click anywhere to copy or paste URLs"
        />
        <FeatureCard
          title="Robust Storage"
          description="Settings persist reliably with automatic error recovery"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-6 hover:border-black transition-colors">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
