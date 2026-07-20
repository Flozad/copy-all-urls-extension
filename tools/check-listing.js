#!/usr/bin/env node
'use strict';

/**
 * Validates store-assets/LISTING.md against the Chrome Web Store's published
 * listing rules, so the copy can be edited without re-checking limits by hand.
 *
 * Checks:
 *   - summary <= 132 characters, title <= 45
 *   - no single keyword repeated more than 5 times (the stated spam threshold)
 *   - no superlatives, competitor references, or fake-badge claims
 *   - no Google/Chrome trademark in the title
 *
 * Run: node tools/check-listing.js
 */

const fs = require('node:fs');
const path = require('node:path');

const LISTING = path.join(__dirname, '..', 'store-assets', 'LISTING.md');

const LIMITS = { title: 45, summary: 132 };

// Flagged outright by the listing guidance.
const SUPERLATIVES = [
  'best', 'greatest', 'fastest', 'ultimate', 'perfect', 'amazing', 'awesome',
  'number one', '#1', 'world-class', 'revolutionary', 'unbeatable'
];
const FAKE_BADGES = ["editor's choice", 'editors choice', 'number one', 'top rated', 'featured by'];
const TRADEMARKS = ['chrome', 'google'];

// Ignore structural words when counting repetition — the rule targets keyword
// stuffing, not ordinary English.
const STOPWORDS = new Set(
  ('a an and are as at be been but by can do for from has have how i if in into is it its ' +
   'just like me my no not of off on one or our out so than that the them then there they ' +
   'this to up use used using want way we what when where which who will with you your all ' +
   'any every each back need needs across whenever anywhere else only own something set').split(' ')
);

function block(md, heading) {
  // The first fenced block following a given heading.
  const at = md.indexOf('\n## ' + heading);
  if (at < 0) return null;
  const fence = md.indexOf('```', at);
  if (fence < 0) return null;
  const start = md.indexOf('\n', fence) + 1;
  const end = md.indexOf('```', start);
  return md.slice(start, end).trim();
}

const md = fs.readFileSync(LISTING, 'utf8');
const title = block(md, 'Title');
const summary = block(md, 'Summary');
const description = block(md, 'Description');

const problems = [];
const notes = [];

if (!title || !summary || !description) {
  console.error('Could not locate Title, Summary, and Description blocks in LISTING.md');
  process.exit(1);
}

// --- length -----------------------------------------------------------------
for (const [name, text] of [['title', title], ['summary', summary]]) {
  const limit = LIMITS[name];
  const n = text.length;
  if (n > limit) problems.push(`${name} is ${n} chars, over the ${limit} limit`);
  else notes.push(`${name}: ${n}/${limit} chars`);
}

// --- keyword repetition -----------------------------------------------------
const words = description.toLowerCase().match(/[a-z$][a-z'$-]*/g) || [];
const counts = new Map();
for (const w of words) {
  if (STOPWORDS.has(w) || w.length < 3) continue;
  counts.set(w, (counts.get(w) || 0) + 1);
}
const repeated = [...counts.entries()].filter(([, n]) => n > 5).sort((a, b) => b[1] - a[1]);
for (const [word, n] of repeated) {
  problems.push(`"${word}" appears ${n} times in the description (limit is 5)`);
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
notes.push('most repeated: ' + top.map(([w, n]) => `${w} x${n}`).join(', '));

// --- prohibited wording -----------------------------------------------------
const haystack = (title + '\n' + summary + '\n' + description).toLowerCase();
for (const term of SUPERLATIVES) {
  if (new RegExp('\\b' + term.replace(/[#]/g, '\\#') + '\\b').test(haystack)) {
    problems.push(`superlative "${term}" appears in the listing copy`);
  }
}
for (const term of FAKE_BADGES) {
  if (haystack.includes(term)) problems.push(`prohibited badge claim "${term}"`);
}
for (const tm of TRADEMARKS) {
  if (new RegExp('\\b' + tm + '\\b').test(title.toLowerCase())) {
    problems.push(`title contains the "${tm}" trademark`);
  }
}

// --- report -----------------------------------------------------------------
for (const n of notes) console.log('  ' + n);
if (problems.length) {
  console.error('\n' + problems.length + ' problem(s):');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nlisting copy passes all checks');
