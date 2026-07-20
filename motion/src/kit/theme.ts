// The Umbrella palette — strict monochrome. The shipping product is black ink on
// white paper with grey surfaces (see extension/popup.html), and these recordings
// hold to exactly that: there is NO accent colour anywhere. Emphasis is carried
// by ink alone — a black slab for an action, an ink tick for success, a hairline
// for structure. That restraint is the entire look, and it matches the landing
// page's "Pressroom" identity token-for-token (umbrella-docs/app/globals.css).
//
// Every scene and every store still draws from this object, so the whole set —
// clips and PNGs alike — reads as one product, in one voice: ink.

export const theme = {
  // Paper — a neutral graphite range shared with the site (--paper / --panel).
  bg: '#eae9e6', // the ground the recordings sit on (site --paper)
  bg2: '#e1e0dc', // a stop deeper: wells, the marquee's lower field (site --paper-2)
  panel: '#ffffff', // the popup, the page, any bright surface (the real product is white)
  panelSunk: '#f3f4f6', // chips, the textarea's rail, controls
  panelSunk2: '#e9ebf0', // a touch deeper still

  // Ink — the type and every "coloured" thing on the page.
  text: '#16161a',
  textSoft: '#35353b', // body copy, secondary ink
  dim: 'rgba(22, 22, 26, 0.62)',
  dim2: 'rgba(22, 22, 26, 0.34)',
  line: 'rgba(22, 22, 26, 0.13)',
  lineSoft: 'rgba(22, 22, 26, 0.06)',

  // The single voice is INK. These names are kept so every scene and still that
  // references `theme.brand` keeps working — they now all resolve to ink, which
  // is the whole point of the monochrome direction.
  brand: '#16161a',
  brandDeep: '#000000',
  brandLift: '#2c2c31',
  brandSoft: 'rgba(22, 22, 26, 0.10)',
  brandSofter: 'rgba(22, 22, 26, 0.05)',
  onBrand: '#ffffff',

  // Status inks — monochrome. Success is an ink tick on a pale grey well; error
  // is ink on a slightly deeper grey. No green, no red: the brief is gray/black.
  green: '#16161a',
  greenSoft: 'rgba(22, 22, 26, 0.08)',
  err: '#16161a',
  errSoft: 'rgba(22, 22, 26, 0.11)',

  // The favicon squares on the tab strip — all greys, believable and mono. A
  // monochrome browser mock reads as intentional, not a stripped screenshot.
  faviconInk: ['#3a3a3e', '#4c4c52', '#26262a', '#5c5c62', '#67676d'],

  // The "gradient" — a subtle ink slab, defined once for the mark tile and the
  // marquee thread. Two ink stops, no hue.
  gradient: 'linear-gradient(135deg, #2c2c31, #16161a 55%, #000000)',

  // The aura — a soft neutral field behind the hero browser. Grey, never a glow.
  aura: [
    'radial-gradient(120% 130% at 84% -16%, rgba(22, 22, 26, 0.10) 0%, rgba(22, 22, 26, 0.05) 44%, transparent 68%)',
    'radial-gradient(120% 120% at 8% 116%, rgba(22, 22, 26, 0.06) 0%, transparent 55%)',
  ].join(', '),

  // Film grain — a faint turbulence tile over flat fills so big paper areas don't
  // band. Felt, not seen.
  noise: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,

  // Radii — the popup's own scale.
  radius: {sm: 8, md: 10, lg: 12, xl: 16, panel: 18, pill: 999},

  font: {
    // The three Pressroom voices, matching umbrella-docs token-for-token. The
    // faces themselves are fetched in kit/fonts (imported once in Root); these
    // stacks name them, with system fallbacks so an editor preview still renders.
    // Geist is the grotesque body, Geist Mono the register for eyebrows/captions,
    // Newsreader the display serif for the wordmark, headlines and italic asides.
    sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mono: '"Geist Mono", ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace',
    serif: '"Newsreader", "Iowan Old Style", Georgia, "Times New Roman", serif',
  },

  // Elevation — soft, ink-based drops. A floating popup carries the deepest.
  shadow: {
    card: '0 1px 2px rgba(15,15,15,0.05), 0 8px 24px -14px rgba(15,15,15,0.18)',
    pop: '0 12px 40px -12px rgba(15,15,15,0.28), 0 0 0 1px rgba(15,15,15,0.06)',
    lift: '0 30px 70px -28px rgba(15,15,15,0.42)',
    popup: '0 18px 48px -12px rgba(15,15,15,0.32), 0 4px 12px -6px rgba(15,15,15,0.18)',
  },
} as const

/**
 * The house primary button: the product's own black slab with a soft top glint.
 * The real popup ships these in black, and — now that the marketing direction is
 * strict monochrome — so do the recordings. Ink is the action colour.
 */
export const primary = (radius: number = theme.radius.lg) =>
  ({
    background: `linear-gradient(180deg, ${theme.brandLift}, ${theme.brand} 60%, ${theme.brandDeep})`,
    color: theme.onBrand,
    borderRadius: radius,
    boxShadow:
      '0 1px 2px rgba(15,15,15,0.24), 0 8px 20px -10px rgba(15,15,15,0.45), inset 0 1px 0 rgba(255,255,255,0.16)',
  }) as const

// Canvas sizes.
// Store stills — the Chrome Web Store's own slot dimensions.
export const SHOT = {width: 1280, height: 800, fps: 30} as const
export const MARQUEE = {width: 1400, height: 560, fps: 30} as const
export const PROMO = {width: 440, height: 280, fps: 30} as const

// Motion — a 16/9 stage the wide clips are cut for, and a 4/5 panel stage for the
// tall, popup-only clips (matches the site's .u-shot.panel plates).
export const WIDE = {width: 1600, height: 900, fps: 30} as const
export const PANEL = {width: 960, height: 1200, fps: 30} as const
