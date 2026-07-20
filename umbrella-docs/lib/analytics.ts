/**
 * Shared analytics configuration.
 *
 * The measurement ID is validated against Google's format rather than trusted
 * verbatim, because it is interpolated into an inline <Script> body in the
 * root layout. next/script assigns string children to innerHTML, so an
 * unvalidated value containing a quote could break out of the string literal.
 * The value is build-time only (anyone who can set it can already influence
 * the build), so this is defense in depth, not a fix for a live hole.
 */

const RAW_GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const GA_MEASUREMENT_ID =
  RAW_GA_ID && /^G-[A-Z0-9]{4,20}$/.test(RAW_GA_ID) ? RAW_GA_ID : null;

/** Local storage key holding the visitor's cookie choice. */
export const CONSENT_KEY = 'umbrella:cookie-consent';

export type ConsentValue = 'granted' | 'denied';
