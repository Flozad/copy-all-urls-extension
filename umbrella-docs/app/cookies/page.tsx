import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Cookie Policy for Umbrella - Copy All URLs Chrome extension website. Learn about the cookies and similar technologies used on our site.',
  alternates: {
    canonical: 'https://tabs.clasicwebtools.com/cookies',
  },
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-5xl prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-p:leading-relaxed prose-a:text-black prose-a:underline prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:decoration-gray-400 prose-a:transition-colors prose-li:leading-relaxed">
        <h1>Cookie Policy</h1>
        <p className="text-sm text-gray-500">
          Last updated: February 7, 2026
        </p>

        <p>
          This Cookie Policy explains how Clasic Web Tools (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;) uses cookies and similar
          technologies on the website located at{' '}
          <Link href="/">tabs.clasicwebtools.com</Link> (the
          &quot;Website&quot;). This policy does not apply to the Umbrella -
          Copy All URLs Chrome extension (the &quot;Extension&quot;), which
          does not use cookies.
        </p>

        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files that are stored on your device (computer,
          tablet, or mobile phone) when you visit a website. They are widely
          used to make websites work more efficiently, provide a better user
          experience, and give website owners information about how their site
          is used.
        </p>

        <h2>2. Cookies Used on This Website</h2>
        <p>
          This Website is a static documentation site and uses minimal cookies.
          Below is a description of the cookies that may be set:
        </p>

        <h3>2.1 Essential Cookies</h3>
        <p>
          This Website does not currently use essential cookies, as it is a
          static site that does not require user authentication, sessions, or
          personalization.
        </p>

        <h3>2.2 Analytics Cookies (Optional)</h3>
        <p>
          If Google Analytics is enabled on this Website, the following cookies
          may be set by Google:
        </p>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>_ga</code></td>
                <td>Google Analytics</td>
                <td>Distinguishes unique visitors by assigning a randomly generated number as a client identifier.</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><code>_ga_*</code></td>
                <td>Google Analytics</td>
                <td>Used to persist session state and track session-level data.</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><code>_gid</code></td>
                <td>Google Analytics</td>
                <td>Distinguishes unique visitors for the current 24-hour period.</td>
                <td>24 hours</td>
              </tr>
              <tr>
                <td><code>_gat</code></td>
                <td>Google Analytics</td>
                <td>Used to throttle the request rate to Google Analytics.</td>
                <td>1 minute</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          These cookies collect anonymous, aggregated data about how visitors
          use the Website. They do not identify you personally.
        </p>

        <h3>2.3 Cookies Set by the Extension</h3>
        <p>
          <strong>
            The Extension does not set, read, or use any cookies.
          </strong>{' '}
          The Extension stores preferences locally using Chrome&apos;s{' '}
          <code>storage</code> API, which is entirely separate from the
          cookie system.
        </p>

        <h2>3. Your Choices Regarding Cookies</h2>
        <p>
          You have several options for controlling or limiting how cookies are
          used:
        </p>

        <h3>3.1 Browser Settings</h3>
        <p>
          Most web browsers allow you to manage cookies through their settings.
          You can typically:
        </p>
        <ul>
          <li>Block all cookies.</li>
          <li>Block only third-party cookies.</li>
          <li>Delete cookies when you close your browser.</li>
          <li>
            View and selectively delete cookies already stored on your device.
          </li>
        </ul>
        <p>
          Please note that blocking all cookies may affect the functionality of
          some websites (though this Website will function normally without
          cookies).
        </p>

        <h3>3.2 Google Analytics Opt-Out</h3>
        <p>
          You can specifically opt out of Google Analytics tracking by:
        </p>
        <ul>
          <li>
            Installing the{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </li>
          <li>
            Enabling &quot;Do Not Track&quot; in your browser settings.
          </li>
          <li>
            Blocking third-party cookies in your browser settings.
          </li>
          <li>
            Using a privacy-focused browser extension or ad blocker that blocks
            analytics scripts.
          </li>
        </ul>

        <h3>3.3 Do Not Track</h3>
        <p>
          We respect the &quot;Do Not Track&quot; (DNT) browser signal. If your
          browser sends a DNT signal, we honor that preference where
          technically feasible.
        </p>

        <h2>4. Legal Basis for Cookies (EU/EEA/UK Users)</h2>
        <p>
          In accordance with the EU ePrivacy Directive (Cookie Law), the UK
          PECR, and the GDPR:
        </p>
        <ul>
          <li>
            <strong>Essential cookies</strong> (if any in the future) would be
            placed under the &quot;legitimate interest&quot; or &quot;strictly
            necessary&quot; exemption and would not require consent.
          </li>
          <li>
            <strong>Analytics cookies</strong> require your consent before
            being placed on your device. If we implement analytics, we will
            obtain your consent through a clearly visible cookie consent
            mechanism before setting non-essential cookies.
          </li>
        </ul>

        <h2>5. Similar Technologies</h2>
        <p>
          In addition to cookies, websites may use other similar technologies:
        </p>
        <ul>
          <li>
            <strong>Local Storage</strong>: The Website does not currently use
            browser local storage. The Extension uses Chrome&apos;s{' '}
            <code>storage</code> API (not local storage) for user preferences.
          </li>
          <li>
            <strong>Pixels and Beacons</strong>: The Website does not use
            tracking pixels or web beacons.
          </li>
          <li>
            <strong>Fingerprinting</strong>: We do not use browser
            fingerprinting techniques.
          </li>
        </ul>

        <h2>6. Changes to This Cookie Policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes
          in the cookies we use or for regulatory reasons. We will update the
          &quot;Last updated&quot; date at the top of this page. We encourage
          you to review this Cookie Policy periodically.
        </p>

        <h2>7. Contact Us</h2>
        <p>
          If you have questions about our use of cookies, please contact us:
        </p>
        <ul>
          <li>
            Website:{' '}
            <a
              href="https://clasicwebtools.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              clasicwebtools.com
            </a>
          </li>
          <li>
            GitHub:{' '}
            <a
              href="https://github.com/Flozad/copy-all-urls-extension/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open an issue
            </a>
          </li>
        </ul>

        <hr />
        <p className="text-sm text-gray-500">
          See also: <Link href="/privacy">Privacy Policy</Link> |{' '}
          <Link href="/terms">Terms of Service</Link>
        </p>
      </article>
    </div>
  );
}
