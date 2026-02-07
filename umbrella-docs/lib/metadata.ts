import { Metadata } from 'next';

const baseUrl = 'https://tabs.clasicwebtools.com';
const siteName = 'Umbrella - Copy All URLs';
const defaultDescription =
  'Save and restore browser tabs instantly with Umbrella Chrome extension. Copy URLs in multiple formats (HTML, JSON, custom), paste to reopen tabs, and boost your productivity.';

export function createMetadata({
  title,
  description = defaultDescription,
  path = '',
  keywords = [],
  image = '/og-image.png',
  noIndex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${baseUrl}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  const defaultKeywords = [
    'chrome extension',
    'tab management',
    'url copier',
    'browser tabs',
    'productivity tool',
    'clipboard manager',
    'tab saver',
    'url manager',
    'session manager',
    'browser productivity',
  ];

  return {
    title,
    description,
    keywords: [...defaultKeywords, ...keywords],
    authors: [{ name: 'Lozard', url: 'https://clasicwebtools.com' }],
    creator: 'Lozard',
    publisher: 'Clasic Web Tools',
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url,
      title,
      description,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: '@lozards',
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
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
    other: {
      'google-site-verification': 'ADD_YOUR_VERIFICATION_CODE',
    },
  };
}

// Structured data for JSON-LD
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
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '100',
      bestRating: '5',
      worstRating: '1',
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

export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

export function createArticleSchema({
  title,
  description,
  path,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url: `${baseUrl}${path}`,
    datePublished: datePublished || new Date().toISOString(),
    dateModified: dateModified || new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: 'Lozard',
      url: 'https://clasicwebtools.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Clasic Web Tools',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icon.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}${path}`,
    },
  };
}
