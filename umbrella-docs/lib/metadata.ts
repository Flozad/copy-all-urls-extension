const baseUrl = 'https://tabs.clasicwebtools.com';
const defaultDescription =
  'Save every tab in one clip and restore the whole session later. Umbrella copies your open tabs in text, HTML, JSON or custom formats and pastes them back as new tabs. Free, open-source, no server.';

// Structured data for JSON-LD. Only aggregateRating that reflects real,
// on-page, verifiable reviews is allowed by Google's structured-data policy —
// so we intentionally omit it rather than ship fabricated numbers.
export function createSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Umbrella - Copy All URLs',
    applicationCategory: 'BrowserExtension',
    operatingSystem: 'Chrome, Chromium',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: defaultDescription,
    url: baseUrl,
    author: {
      '@type': 'Person',
      name: 'Lozard',
      url: 'https://clasicwebtools.com',
    },
    screenshot: `${baseUrl}/screenshot.png`,
    featureList: [
      'Copy URLs in multiple formats (HTML, JSON, Text, Custom)',
      'Paste URLs to restore tabs instantly',
      'Keyboard shortcuts for quick access',
      'Context menu integration',
      'Auto-copy on popup open',
      'Custom URL templates',
      'Smart paste with URL detection',
    ],
  };
}
