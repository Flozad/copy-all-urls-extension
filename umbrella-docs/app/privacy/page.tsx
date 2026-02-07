import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for Umbrella - Copy All URLs Chrome extension. Learn how we handle your data, what information we collect, and your privacy rights.',
  alternates: {
    canonical: 'https://tabs.clasicwebtools.com/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-5xl prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-p:leading-relaxed prose-a:text-black prose-a:underline prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:decoration-gray-400 prose-a:transition-colors prose-li:leading-relaxed">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-gray-500">
          Last updated: February 7, 2026
        </p>

        <p>
          This Privacy Policy describes how Clasic Web Tools (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;) handles information in connection
          with the Umbrella - Copy All URLs Chrome extension (the
          &quot;Extension&quot;) and the website located at{' '}
          <Link href="/">tabs.clasicwebtools.com</Link> (the
          &quot;Website&quot;). We are committed to protecting your privacy and
          being transparent about our data practices.
        </p>

        <h2>1. Information We Do NOT Collect</h2>
        <p>
          The Extension is designed with privacy as a core principle. We want to
          be clear about what we do <strong>not</strong> do:
        </p>
        <ul>
          <li>
            We do <strong>not</strong> collect, transmit, or store your browsing
            history, URLs, or tab data on any external server.
          </li>
          <li>
            We do <strong>not</strong> track your browsing activity.
          </li>
          <li>
            We do <strong>not</strong> collect personal information such as your
            name, email address, or location through the Extension.
          </li>
          <li>
            We do <strong>not</strong> sell, rent, or share any user data with
            third parties.
          </li>
          <li>
            We do <strong>not</strong> use your data for advertising, profiling,
            or marketing purposes.
          </li>
        </ul>

        <h2>2. How the Extension Works</h2>
        <p>
          The Extension operates entirely within your browser. Here is how data
          is handled:
        </p>

        <h3>2.1 Tab and URL Data</h3>
        <p>
          When you use the Extension to copy URLs, the Extension reads your
          currently open tab titles and URLs using the Chrome{' '}
          <code>tabs</code> API. This data is:
        </p>
        <ul>
          <li>
            Processed <strong>locally</strong> within your browser only.
          </li>
          <li>
            Copied to your <strong>system clipboard</strong> at your explicit
            request.
          </li>
          <li>
            <strong>Never transmitted</strong> to any external server, API, or
            third-party service.
          </li>
        </ul>

        <h3>2.2 Clipboard Access</h3>
        <p>
          The Extension requires clipboard read and write permissions to provide
          its core functionality:
        </p>
        <ul>
          <li>
            <strong>Clipboard Write</strong>: Used to copy formatted URLs to
            your clipboard when you initiate a copy action.
          </li>
          <li>
            <strong>Clipboard Read</strong>: Used to read URLs from your
            clipboard when you initiate a paste action to open tabs.
          </li>
        </ul>
        <p>
          Clipboard access occurs only when you explicitly trigger a copy or
          paste action. We never access your clipboard in the background.
        </p>

        <h3>2.3 Local Storage</h3>
        <p>
          The Extension uses Chrome&apos;s <code>storage</code> API to save
          your preferences (such as default format, auto-copy setting, and
          custom templates). This data is:
        </p>
        <ul>
          <li>
            Stored <strong>locally</strong> in your browser&apos;s extension
            storage.
          </li>
          <li>
            Synced across your Chrome instances only if you have Chrome Sync
            enabled (managed by Google, not by us).
          </li>
          <li>
            <strong>Never sent</strong> to our servers or any third party.
          </li>
        </ul>

        <h3>2.4 Content Scripts</h3>
        <p>
          The Extension uses a content script that runs on web pages solely to
          facilitate clipboard operations in contexts where the extension popup
          is not available. This script does not collect, read, or transmit any
          page content, personal data, or browsing information.
        </p>

        <h2>3. Browser Permissions Explained</h2>
        <p>
          The Extension requests the following Chrome permissions, each for a
          specific and limited purpose:
        </p>
        <ul>
          <li>
            <strong>tabs</strong>: To read the titles and URLs of your open
            tabs for the copy functionality.
          </li>
          <li>
            <strong>activeTab</strong>: To interact with the currently active
            tab when triggered by the user.
          </li>
          <li>
            <strong>storage</strong>: To save your extension preferences
            locally.
          </li>
          <li>
            <strong>clipboardRead / clipboardWrite</strong>: To copy URLs to
            and read URLs from your system clipboard.
          </li>
          <li>
            <strong>contextMenus</strong>: To add right-click menu options for
            copying and pasting URLs.
          </li>
          <li>
            <strong>scripting</strong>: To execute clipboard operations in
            certain browser contexts.
          </li>
        </ul>

        <h2>4. Website Analytics</h2>
        <p>
          Our Website (tabs.clasicwebtools.com) may use Google Analytics to
          understand how visitors interact with the site. If enabled, Google
          Analytics collects:
        </p>
        <ul>
          <li>
            Anonymous usage data such as pages visited, time spent, and
            referral sources.
          </li>
          <li>
            Technical information such as browser type, operating system, and
            screen resolution.
          </li>
          <li>Approximate geographic location (country/city level).</li>
        </ul>
        <p>
          This data is collected by Google and is subject to{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google&apos;s Privacy Policy
          </a>
          . You can opt out of Google Analytics by using the{' '}
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Analytics Opt-out Browser Add-on
          </a>{' '}
          or by adjusting your cookie preferences. See our{' '}
          <Link href="/cookies">Cookie Policy</Link> for more details.
        </p>
        <p>
          <strong>
            The Extension itself does not include any analytics, tracking, or
            telemetry code.
          </strong>
        </p>

        <h2>5. Open Source Transparency</h2>
        <p>
          The Extension is open source and its complete source code is publicly
          available on{' '}
          <a
            href="https://github.com/Flozad/copy-all-urls-extension"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          . You can review, audit, and verify our data handling practices at
          any time.
        </p>

        <h2>6. Data Security</h2>
        <p>
          Because the Extension processes all data locally within your browser
          and does not transmit data to external servers, the risk of data
          breaches related to the Extension is minimal. Your data remains under
          your control and is protected by your browser&apos;s and operating
          system&apos;s security measures.
        </p>

        <h2>7. Children&apos;s Privacy</h2>
        <p>
          The Extension and Website are not directed at children under the age
          of 13 (or the applicable age of digital consent in your
          jurisdiction). We do not knowingly collect personal information from
          children. If you believe a child has provided us with personal
          information, please contact us so we can take appropriate action.
        </p>

        <h2>8. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have the following rights
          regarding your data:
        </p>

        <h3>8.1 General Rights</h3>
        <ul>
          <li>
            <strong>Access and Portability</strong>: Your extension settings
            are stored locally in your browser and are accessible to you at any
            time through the Extension&apos;s options page.
          </li>
          <li>
            <strong>Deletion</strong>: You can delete all Extension data by
            uninstalling the Extension from Chrome, which removes all locally
            stored preferences.
          </li>
          <li>
            <strong>Control</strong>: You have full control over when the
            Extension accesses your tabs and clipboard.
          </li>
        </ul>

        <h3>
          8.2 European Economic Area (EEA), UK, and Swiss Residents (GDPR)
        </h3>
        <p>
          Under the General Data Protection Regulation (GDPR) and the UK GDPR,
          you have the right to access, rectify, erase, restrict processing,
          data portability, and object to processing of your personal data. As
          we do not collect personal data through the Extension, these rights
          primarily apply to any data collected through Website analytics. You
          can exercise your rights by contacting us or by disabling cookies on
          our Website.
        </p>

        <h3>8.3 California Residents (CCPA/CPRA)</h3>
        <p>
          Under the California Consumer Privacy Act (CCPA) and the California
          Privacy Rights Act (CPRA), you have the right to know what personal
          information is collected, to delete your personal information, to opt
          out of the sale or sharing of personal information, and to
          non-discrimination for exercising your rights. We do{' '}
          <strong>not sell or share</strong> personal information as defined
          under the CCPA/CPRA.
        </p>

        <h3>8.4 Brazilian Residents (LGPD)</h3>
        <p>
          Under the Lei Geral de Prote&ccedil;&atilde;o de Dados (LGPD), you
          have the right to access, correct, anonymize, block, or delete
          unnecessary or excessive data, and to revoke consent. As we do not
          collect personal data through the Extension, you can manage Website
          analytics data through cookie settings or by contacting us.
        </p>

        <h3>8.5 Other Jurisdictions</h3>
        <p>
          If you reside in a jurisdiction with applicable data protection laws
          (including but not limited to Canada&apos;s PIPEDA, Australia&apos;s
          Privacy Act, Japan&apos;s APPI, South Korea&apos;s PIPA, or
          India&apos;s DPDP Act), we respect your rights under those laws. As
          our Extension does not collect personal data, these rights primarily
          apply to Website analytics data. Contact us to exercise your rights.
        </p>

        <h2>9. International Data Transfers</h2>
        <p>
          The Extension does not transfer any data internationally. If Google
          Analytics is enabled on our Website, Google may process analytics
          data in accordance with its own data transfer mechanisms and policies.
        </p>

        <h2>10. Third-Party Services</h2>
        <p>The Extension does not integrate with or send data to any third-party services. The only third-party service used is:</p>
        <ul>
          <li>
            <strong>Google Analytics</strong> (Website only, not the Extension): Used for anonymous website usage statistics. Subject to{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Chrome Web Store</strong>: The Extension is distributed through the Chrome Web Store, which is operated by Google and subject to{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </li>
        </ul>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will update the &quot;Last updated&quot; date at
          the top of this page. We encourage you to review this Privacy Policy
          periodically.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          If you have any questions, concerns, or requests regarding this
          Privacy Policy or our data practices, please contact us:
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
          See also: <Link href="/terms">Terms of Service</Link> |{' '}
          <Link href="/cookies">Cookie Policy</Link>
        </p>
      </article>
    </div>
  );
}
