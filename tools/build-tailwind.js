#!/usr/bin/env node
'use strict';

/**
 * Produces extension/vendor/tailwind.min.css — the subset of the full Tailwind
 * v2 build that this extension actually references.
 *
 * Why this exists: the full v2 stylesheet is ~2.8 MB, and the browser parses it
 * on every popup open. Tailwind's own purge needs a PostCSS/CLI pipeline that
 * this repo deliberately doesn't have, so instead of adding a build toolchain
 * we subset the already-vendored file with plain string work.
 *
 * Safety: every Tailwind class in this project is a literal in HTML or a
 * literal in JS (verified — the only computed className is `message ${type}`,
 * whose values are not Tailwind classes). If that ever stops being true, add
 * the constructed names to SAFELIST below or this script will drop them.
 *
 * Run:  node tools/build-tailwind.js
 * Then: npm test   (test/vendor-css.test.js checks the output stays in sync)
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'extension');
// Full upstream build. Lives outside extension/ so it is never packaged.
const SOURCE = path.join(__dirname, 'tailwind-2.2.19.min.css');
const OUTPUT = path.join(EXT, 'vendor', 'tailwind.min.css');

// Files whose class references must be honoured.
const SCAN = ['popup.html', 'options.html', 'welcome.html', 'offscreen.html',
              'popup.js', 'options.js', 'welcome.js', 'background.js', 'offscreen.js'];

// Classes that are never spelled out in the sources. Empty today; keep it here
// so a future dynamic class has an obvious home.
const SAFELIST = [];

// ---------------------------------------------------------------------------
// 1. Collect candidate class tokens from the sources
// ---------------------------------------------------------------------------
function collectTokens() {
  const tokens = new Set(SAFELIST);

  for (const file of SCAN) {
    const full = path.join(EXT, file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');

    // Any run of characters that could plausibly be a utility class. Being
    // generous here only costs a few unused rules; being stingy loses styles.
    const matches = text.match(/[A-Za-z0-9_][A-Za-z0-9_:./\\[\]%-]*/g) || [];
    for (const raw of matches) tokens.add(raw);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// 2. Split the stylesheet into top-level blocks, descending into at-rules
// ---------------------------------------------------------------------------
function splitBlocks(css) {
  const blocks = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        blocks.push(css.slice(start, i + 1));
        start = i + 1;
      }
    }
  }
  const tail = css.slice(start).trim();
  if (tail) blocks.push(tail);
  return blocks;
}

// Class names referenced by a selector, with Tailwind's CSS escaping removed
// (e.g. `.hover\:bg-gray-300:hover` -> `hover:bg-gray-300`).
function selectorClasses(selector) {
  const found = [];
  const re = /\.((?:[^\s.,:>+~()[\]{}\\]|\\.)+)/g;
  let m;
  while ((m = re.exec(selector))) {
    found.push(m[1].replace(/\\(.)/g, '$1'));
  }
  return found;
}

function keepRule(rule, tokens) {
  const brace = rule.indexOf('{');
  if (brace < 0) return true;
  const selector = rule.slice(0, brace);

  // At-rules that carry no selector of their own (keyframes, font-face) stay.
  if (selector.trim().startsWith('@')) return true;

  // A selector may be a comma-separated list; keep the whole rule if any part
  // survives. Rewriting the list would be more aggressive but risks changing
  // specificity ordering, which is not worth it for the bytes involved.
  const parts = selector.split(',');
  return parts.some((part) => {
    const classes = selectorClasses(part);
    // Element/base/reset selectors carry no class at all — always keep.
    if (classes.length === 0) return true;
    return classes.every((cls) => tokens.has(cls));
  });
}

function filterCss(css, tokens) {
  return splitBlocks(css)
    .map((block) => {
      const brace = block.indexOf('{');
      const head = brace >= 0 ? block.slice(0, brace).trim() : '';

      // Descend into conditional groups so their inner rules get filtered too.
      if (head.startsWith('@media') || head.startsWith('@supports')) {
        const inner = block.slice(brace + 1, block.lastIndexOf('}'));
        const kept = filterCss(inner, tokens);
        return kept.trim() ? head + '{' + kept + '}' : '';
      }

      return keepRule(block, tokens) ? block : '';
    })
    .join('');
}

// ---------------------------------------------------------------------------
// 3. Build
// ---------------------------------------------------------------------------
function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Missing ' + path.relative(ROOT, SOURCE) + '.');
    console.error('Download it first:\n  curl -fsSL "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" -o ' + path.relative(ROOT, SOURCE));
    process.exit(1);
  }

  const source = fs.readFileSync(SOURCE, 'utf8');
  const tokens = collectTokens();
  const out = filterCss(source, tokens);

  const banner = '/*! tailwindcss v2.2.19 | MIT License | https://tailwindcss.com */\n'
    + '/* Subset generated by tools/build-tailwind.js — do not edit by hand. */\n';

  fs.writeFileSync(OUTPUT, banner + out);

  const pct = ((1 - out.length / source.length) * 100).toFixed(1);
  console.log('source : ' + (source.length / 1024).toFixed(0) + ' KB');
  console.log('output : ' + (out.length / 1024).toFixed(0) + ' KB  (' + pct + '% smaller)');
  console.log('written: ' + path.relative(ROOT, OUTPUT));
}

main();
