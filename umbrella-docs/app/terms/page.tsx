import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of Service for Umbrella - Copy All URLs Chrome extension. Read the terms and conditions governing your use of the Extension and Website.',
  alternates: {
    canonical: 'https://tabs.clasicwebtools.com/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-5xl prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-p:leading-relaxed prose-a:text-black prose-a:underline prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:decoration-gray-400 prose-a:transition-colors prose-li:leading-relaxed">
        <h1>Terms of Service</h1>
        <p className="text-sm text-gray-500">
          Last updated: February 7, 2026
        </p>

        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of the
          Umbrella - Copy All URLs Chrome extension (the &quot;Extension&quot;)
          and the website located at{' '}
          <Link href="/">tabs.clasicwebtools.com</Link> (the
          &quot;Website&quot;), provided by Clasic Web Tools
          (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By using the
          Extension or Website, you agree to be bound by these Terms. If you
          do not agree, please do not use the Extension or Website.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By installing, accessing, or using the Extension, or by visiting the
          Website, you acknowledge that you have read, understood, and agree to
          be bound by these Terms and our{' '}
          <Link href="/privacy">Privacy Policy</Link>. If you are using the
          Extension on behalf of an organization, you represent that you have
          the authority to bind that organization to these Terms.
        </p>

        <h2>2. Description of the Extension</h2>
        <p>
          The Extension is a free, open-source browser extension for Google
          Chrome and Chromium-based browsers that allows users to:
        </p>
        <ul>
          <li>
            Copy URLs from open browser tabs in multiple formats (plain text,
            HTML, JSON, and custom templates).
          </li>
          <li>Paste URLs from the clipboard to open them in new tabs.</li>
          <li>
            Configure preferences such as auto-copy, keyboard shortcuts, and
            context menu options.
          </li>
        </ul>

        <h2>3. License</h2>
        <p>
          The Extension is released as open-source software. Subject to the
          terms of the applicable open-source license available in the{' '}
          <a
            href="https://github.com/Flozad/copy-all-urls-extension"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub repository
          </a>
          , you are granted a non-exclusive, worldwide, royalty-free license to
          use, copy, modify, and distribute the Extension in accordance with
          that license.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree to use the Extension and Website only for lawful purposes and in accordance with these Terms. You agree not to:</p>
        <ul>
          <li>
            Use the Extension for any illegal purpose or in violation of any
            applicable local, national, or international law or regulation.
          </li>
          <li>
            Use the Extension to infringe upon the rights of others, including
            intellectual property rights.
          </li>
          <li>
            Modify, reverse-engineer, or create derivative works of the
            Extension except as permitted by the open-source license.
          </li>
          <li>
            Use the Extension to distribute malware, viruses, or other harmful
            software.
          </li>
          <li>
            Use the Extension in a manner that could damage, disable,
            overburden, or impair any server, network, or other infrastructure.
          </li>
          <li>
            Misrepresent the origin of the Extension or claim authorship of the
            original work without attribution.
          </li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <p>
          The &quot;Umbrella&quot; name, logo, and branding are the property of
          Clasic Web Tools. The Extension&apos;s source code is available under
          its open-source license. All content on the Website, including text,
          graphics, and documentation, is owned by or licensed to Clasic Web
          Tools and is protected by applicable intellectual property laws
          worldwide.
        </p>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          <strong>
            THE EXTENSION AND WEBSITE ARE PROVIDED &quot;AS IS&quot; AND
            &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER
            EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
          </strong>
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE EXPRESSLY
          DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul>
          <li>
            <strong>Implied warranties</strong> of merchantability, fitness for
            a particular purpose, title, and non-infringement.
          </li>
          <li>
            <strong>Warranties of accuracy</strong>: We do not warrant that
            the Extension will copy, format, or open URLs without errors.
          </li>
          <li>
            <strong>Warranties of availability</strong>: We do not warrant that
            the Extension will be available, uninterrupted, secure, or
            error-free.
          </li>
          <li>
            <strong>Warranties of compatibility</strong>: We do not warrant
            that the Extension will be compatible with all browsers, operating
            systems, or third-party software.
          </li>
        </ul>

        <h2>7. Limitation of Liability</h2>
        <p>
          <strong>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
            SHALL CLASIC WEB TOOLS, ITS CONTRIBUTORS, OR ITS AFFILIATES BE
            LIABLE FOR ANY:
          </strong>
        </p>
        <ul>
          <li>
            Indirect, incidental, special, consequential, or punitive damages.
          </li>
          <li>
            Loss of profits, revenue, data, goodwill, or business
            opportunities.
          </li>
          <li>
            Damages arising from the use or inability to use the Extension or
            Website.
          </li>
          <li>
            Damages arising from any unauthorized access to or alteration of
            your data or transmissions.
          </li>
          <li>
            Any other damages arising out of or related to these Terms or your
            use of the Extension or Website.
          </li>
        </ul>
        <p>
          THIS LIMITATION APPLIES WHETHER THE CLAIM IS BASED ON WARRANTY,
          CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY
          OTHER LEGAL THEORY, AND WHETHER OR NOT WE HAVE BEEN ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          IN JURISDICTIONS THAT DO NOT ALLOW THE EXCLUSION OR LIMITATION OF
          LIABILITY FOR CERTAIN TYPES OF DAMAGES, OUR LIABILITY SHALL BE
          LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW. IN ANY CASE, OUR
          TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS
          SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE EXTENSION (WHICH IS
          ZERO, AS THE EXTENSION IS FREE).
        </p>

        <h2>8. Indemnification</h2>
        <p>
          To the maximum extent permitted by applicable law, you agree to
          indemnify, defend, and hold harmless Clasic Web Tools and its
          contributors from and against any claims, liabilities, damages,
          losses, costs, or expenses (including reasonable attorneys&apos;
          fees) arising out of or related to your use of the Extension or
          Website, your violation of these Terms, or your violation of any
          rights of a third party. This indemnification obligation does not
          apply in jurisdictions where it is prohibited by law.
        </p>

        <h2>9. Third-Party Services</h2>
        <p>
          The Extension operates within Google Chrome or Chromium-based
          browsers, which are subject to their own terms of service. The
          Extension is distributed through the Chrome Web Store, which is
          governed by Google&apos;s terms. We are not responsible for the
          availability, performance, or policies of any third-party platforms.
        </p>

        <h2>10. Modifications to the Extension and Terms</h2>
        <h3>10.1 Extension Updates</h3>
        <p>
          We may release updates to the Extension from time to time. Updates
          may be distributed through the Chrome Web Store and may be installed
          automatically. Continued use of the Extension after an update
          constitutes acceptance of any changes.
        </p>
        <h3>10.2 Changes to Terms</h3>
        <p>
          We reserve the right to modify these Terms at any time. We will
          indicate changes by updating the &quot;Last updated&quot; date. Your
          continued use of the Extension or Website after changes constitutes
          acceptance of the modified Terms. If you do not agree to the
          modified Terms, you must stop using the Extension and Website.
        </p>

        <h2>11. Termination</h2>
        <p>
          You may stop using the Extension at any time by uninstalling it from
          your browser. We reserve the right to discontinue the Extension or
          Website at any time without notice. Upon termination, all provisions
          of these Terms that by their nature should survive (including
          disclaimers, limitations of liability, and indemnification) shall
          continue in effect.
        </p>

        <h2>12. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the jurisdiction in which Clasic Web Tools operates, without
          regard to conflict of law principles. Any disputes arising from these
          Terms shall be resolved through good-faith negotiation first, and if
          unresolved, through binding arbitration or the competent courts of
          the applicable jurisdiction.
        </p>
        <p>
          For users in the European Union, nothing in these Terms affects your
          rights under mandatory consumer protection laws. You retain the
          right to bring claims in the courts of your country of residence. For
          users in other jurisdictions, your statutory rights under local
          consumer protection laws remain unaffected.
        </p>

        <h2>13. Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable or
          invalid by a court of competent jurisdiction, that provision shall be
          modified to the minimum extent necessary to make it enforceable, or
          if not possible, severed from these Terms. The remaining provisions
          shall continue in full force and effect.
        </p>

        <h2>14. Entire Agreement</h2>
        <p>
          These Terms, together with our{' '}
          <Link href="/privacy">Privacy Policy</Link> and{' '}
          <Link href="/cookies">Cookie Policy</Link>, constitute the entire
          agreement between you and Clasic Web Tools regarding the Extension
          and Website, and supersede all prior agreements and understandings.
        </p>

        <h2>15. Contact Us</h2>
        <p>
          If you have questions about these Terms, please contact us:
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
          <Link href="/cookies">Cookie Policy</Link>
        </p>
      </article>
    </div>
  );
}
