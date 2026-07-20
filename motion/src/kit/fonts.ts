// The Pressroom's three voices, loaded for the headless renderer. Naming a
// family in a style rule is not enough in Remotion's browser — the faces must be
// fetched and the render held until they parse, or every heading silently falls
// back (Newsreader → Georgia) and the recordings drift off-brand.
//
// Matches umbrella-docs: Newsreader (masthead/display, with a true italic for
// the "verdict" line), Geist (grotesque body), Geist Mono (eyebrows, captions,
// metadata). @remotion/google-fonts self-hosts each and wires delayRender for us.

import {loadFont as loadGeist} from '@remotion/google-fonts/Geist'
import {loadFont as loadGeistMono} from '@remotion/google-fonts/GeistMono'
import {loadFont as loadNewsreader} from '@remotion/google-fonts/Newsreader'

const news = loadNewsreader('normal', {weights: ['400', '500', '600'], subsets: ['latin']})
loadNewsreader('italic', {weights: ['400', '500'], subsets: ['latin']})
const geist = loadGeist('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']})
const mono = loadGeistMono('normal', {weights: ['400', '500', '600'], subsets: ['latin']})

export const FONT = {
  display: news.fontFamily, // "Newsreader"
  sans: geist.fontFamily, // "Geist"
  mono: mono.fontFamily, // "Geist Mono"
}
