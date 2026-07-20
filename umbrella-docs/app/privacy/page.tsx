import Link from 'next/link';
import { Metadata } from 'next';
import { CookiePreferencesLink } from '@/components/cookie-consent';

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
          Last updated: July 20, 2026
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

        {/*
          Chrome Web Store requires an affirmative Limited Use disclosure on the
          developer's homepage or one click away. Keep this prominent and do not
          bury it inside a numbered section.
        */}
        <div className="not-prose my-8 rounded-lg border border-gray-300 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 mt-0 text-base font-semibold uppercase tracking-wide">
            Limited Use Disclosure
          </h2>
          <p className="m-0 text-sm leading-relaxed">
            Umbrella - Copy All URLs&apos; use and transfer of information
            received from Google APIs to any other app will adhere to the{' '}
            <a
              href="https://developer.chrome.com/docs/webstore/program-policies/limited-use/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chrome Web Store User Data Policy
            </a>
            , including the Limited Use requirements. The Extension processes tab
            URLs, tab titles, and clipboard contents entirely on your device. It
            transmits no user data off your device, sells no user data, and uses
            no user data for advertising, credit assessment, or any purpose
            unrelated to the Extension&apos;s single user-facing function of
            copying and reopening browser tabs. No humans read your data.
          </p>
        </div>

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
          The Extension uses Chrome&apos;s <code>storage</code> API to save your
          preferences (such as default format, auto-copy setting, and custom
          templates). This data is:
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

        <h3>2.4 Copy History</h3>
        <p>
          The Extension keeps a list of your recent copies so you can return to
          an earlier set of tabs. This history contains the URLs and titles you
          copied, and it is:
        </p>
        <ul>
          <li>
            Stored on <strong>your device only</strong>, in local extension
            storage. It is deliberately never synced, so it does not travel
            between your computers.
          </li>
          <li>
            Capped at 25 entries, with older entries discarded automatically.
          </li>
          <li>
            Deletable at any time — individually or all at once — from the
            Extension&apos;s popup, and switched off entirely in Settings.
          </li>
          <li>
            <strong>Never transmitted</strong> anywhere.
          </li>
        </ul>

        <h3>2.5 No Content Scripts</h3>
        <p>
          The Extension runs <strong>no code on the pages you visit</strong>. It
          registers no content scripts and requests no host permissions, so it
          cannot read or modify the content of any website.
        </p>
        <p>
          When you copy or paste using a keyboard shortcut or the right-click
          menu, there is no open popup to perform the clipboard operation. In
          that case the Extension creates a short-lived, invisible{' '}
          <a
            href="https://developer.chrome.com/docs/extensions/reference/api/offscreen"
            target="_blank"
            rel="noopener noreferrer"
          >
            offscreen document
          </a>{' '}
          — a page belonging to the Extension itself, not to any website — and
          performs the clipboard operation there. This design was chosen
          specifically so that the Extension never needs access to the sites you
          browse.
        </p>

        <h2>3. Browser Permissions Explained</h2>
        <p>
          The Extension requests the following Chrome permissions, each for a
          specific and limited purpose:
        </p>
        {/*
          This list must match extension/manifest.json exactly. Claiming a
          permission the extension does not hold is as much a listing-accuracy
          problem as omitting one it does.
        */}
        <ul>
          <li>
            <strong>tabs</strong>: To read the titles and URLs of your open
            tabs, which is the data the Extension copies.
          </li>
          <li>
            <strong>storage</strong>: To save your preferences and your local
            copy history on your device.
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
            <strong>offscreen</strong>: Clipboard access requires a document,
            and the Extension&apos;s background service worker does not have
            one. A minimal offscreen document performs the clipboard operation.
            This deliberately avoids the alternative of injecting a script into
            the pages you visit, which is why the Extension needs no access to
            any website.
          </li>
          <li>
            <strong>alarms</strong>: To clear the toolbar badge a few seconds
            after a copy or paste confirmation.
          </li>
        </ul>
        <p>
          The Extension requests <strong>no host permissions</strong> and
          registers <strong>no content scripts</strong>, so it has no access to
          the content of the pages you visit.
        </p>

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
          , by declining analytics cookies when first prompted, or by reopening
          your <CookiePreferencesLink /> at any time to withdraw consent already
          given. See our <Link href="/cookies">Cookie Policy</Link> for more
          details.
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
          primarily apply to any data collected through Website analytics.
          Analytics cookies are set on the Website only after you consent; you
          can refuse them when first prompted, withdraw consent at any time via
          your <CookiePreferencesLink />, or exercise any other right by
          contacting us.
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
          collect personal data through the Extension, you can revoke consent
          for Website analytics at any time via your{' '}
          <CookiePreferencesLink /> or by contacting us.
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
