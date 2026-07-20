'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CONSENT_KEY,
  type ConsentValue,
  GA_MEASUREMENT_ID,
} from '@/lib/analytics';

/**
 * Google Consent Mode v2 banner.
 *
 * The Website's Cookie Policy (§4) commits to obtaining consent through a
 * "clearly visible cookie consent mechanism before setting non-essential
 * cookies", and §3.1 says withdrawing consent stops further collection. To
 * honour both, gtag.js is not loaded by the layout at all — it is injected
 * here only once the visitor has opted in. Declining or ignoring the banner
 * means no request is ever made to Google.
 *
 * The Cookie Policy (§3.4) also commits to honouring Do Not Track, so a DNT
 * signal is treated as a standing refusal: no banner, no tag, no cookies. A
 * visitor who has explicitly chosen already is never re-prompted.
 */

export const OPEN_PREFERENCES_EVENT = 'umbrella:open-cookie-preferences';

const GTAG_SCRIPT_ID = 'google-analytics-tag';

/**
 * Injects gtag.js and fires the initial config. Called only on consent, so a
 * visitor who declines never contacts Google at all — not even a cookieless
 * ping. Idempotent: repeated accepts do not stack duplicate tags.
 */
function loadAnalytics() {
  if (!GA_MEASUREMENT_ID) return;
  if (document.getElementById(GTAG_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = GTAG_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    GA_MEASUREMENT_ID
  )}`;
  document.head.appendChild(script);

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
    .gtag;
  gtag?.('js', new Date());
  gtag?.('config', GA_MEASUREMENT_ID);
}

function readStoredConsent(): ConsentValue | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    // Storage can throw in private modes or when cookies are blocked
    // entirely. Treat it as "no choice recorded" and stay denied.
    return null;
  }
}

function hasDoNotTrackSignal(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const win = window as Window & { doNotTrack?: string };
  return (
    nav.doNotTrack === '1' || win.doNotTrack === '1' || nav.msDoNotTrack === '1'
  );
}

function applyConsent(value: ConsentValue) {
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
    .gtag;
  gtag?.('consent', 'update', { analytics_storage: value });
}

/**
 * Clears the Google Analytics cookies set while consent was granted. Called on
 * withdrawal so that "you can change your mind" is actually true rather than
 * just stopping future writes.
 *
 * Covers every cookie named in the Cookie Policy's table (§2.2), not only the
 * GA4 pair — if that table changes, this list must change with it.
 */
function clearAnalyticsCookies() {
  const { hostname } = window.location;
  // Google scopes _ga to the registrable domain, so the cookie must be
  // expired against each parent domain to actually disappear.
  const domains = hostname
    .split('.')
    .map((_, index, parts) => parts.slice(index).join('.'))
    .filter((domain) => domain.includes('.'));

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name) continue;

    const isAnalyticsCookie =
      name === '_ga' ||
      name === '_gid' ||
      name === '_gat' ||
      name.startsWith('_ga_') ||
      name.startsWith('_gat_');
    if (!isAnalyticsCookie) continue;

    for (const domain of [...domains, '']) {
      const scope = domain ? `; domain=.${domain}` : '';
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT${scope}`;
    }
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only prompt when analytics is actually configured for this deployment.
    if (!GA_MEASUREMENT_ID) return;

    const stored = readStoredConsent();
    if (stored === 'granted') {
      // Returning visitor who already opted in — load the tag without asking
      // again.
      loadAnalytics();
      return;
    }
    if (stored === 'denied') return;
    if (hasDoNotTrackSignal()) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_PREFERENCES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, reopen);
  }, []);

  const choose = useCallback((value: ConsentValue) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // A visitor blocking storage still gets their choice applied for this
      // page view; it simply cannot be remembered.
    }
    applyConsent(value);
    if (value === 'granted') {
      loadAnalytics();
    } else {
      clearAnalyticsCookies();
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-labelledby="cookie-consent-heading"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black bg-white p-4 sm:p-6"
      role="dialog"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="font-display text-base font-semibold"
            id="cookie-consent-heading"
          >
            Analytics cookies
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">
            We use Google Analytics to understand how this site is used. It sets
            cookies only if you accept. The Umbrella extension itself contains
            no analytics or tracking of any kind. See our{' '}
            <a
              className="underline decoration-2 underline-offset-4 hover:decoration-gray-400"
              href="/cookies"
            >
              Cookie Policy
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="border border-black px-4 py-2 text-sm font-medium hover:bg-gray-100"
            onClick={() => choose('denied')}
            type="button"
          >
            Decline
          </button>
          <button
            className="border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            onClick={() => choose('granted')}
            type="button"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline control that reopens the banner. Used by the Privacy and Cookie
 * policies so their references to adjustable "cookie preferences" point at a
 * real mechanism.
 */
export function CookiePreferencesLink({
  children = 'cookie preferences',
}: {
  children?: React.ReactNode;
}) {
  // Inlined at build time and identical on server and client, so this gate is
  // hydration-safe. When analytics is not configured for a deployment the
  // policies still read correctly — the phrase just isn't a control.
  if (!GA_MEASUREMENT_ID) return <>{children}</>;

  return (
    <button
      className="underline decoration-2 underline-offset-4 hover:decoration-gray-400"
      onClick={() =>
        window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))
      }
      type="button"
    >
      {children}
    </button>
  );
}
