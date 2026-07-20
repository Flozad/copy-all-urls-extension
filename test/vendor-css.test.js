'use strict';

// Guards the generated Tailwind subset (extension/vendor/tailwind.min.css).
//
// The subset is produced by tools/build-tailwind.js from the full upstream
// build. The risk it carries is silent: add a utility class to the markup,
// forget to regenerate, and the class simply has no rule — the page renders
// subtly wrong with nothing failing. These tests make that loud.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'extension');
const SUBSET = path.join(EXT, 'vendor', 'tailwind.min.css');
const SOURCE = path.join(ROOT, 'tools', 'tailwind-2.2.19.min.css');
const BUILDER = path.join(ROOT, 'tools', 'build-tailwind.js');

test('the pages reference the generated subset, not the full build or a CDN', () => {
  for (const page of ['popup.html', 'options.html']) {
    const html = fs.readFileSync(path.join(EXT, page), 'utf8');
    assert.match(html, /vendor\/tailwind\.min\.css/, page + ' links the subset');
    assert.doesNotMatch(html, /cdn\.jsdelivr|unpkg|cdnjs/, page + ' loads no remote CSS');
    assert.doesNotMatch(
      html,
      /tailwind-2\.2\.19\.min\.css/,
      page + ' does not ship the full 2.8MB build'
    );
  }
});

test('the full upstream build is not inside the packaged extension directory', () => {
  const stray = path.join(EXT, 'vendor', 'tailwind-2.2.19.min.css');
  assert.equal(
    fs.existsSync(stray),
    false,
    'the 2.8MB source must live in tools/, never in extension/'
  );
});

test('the committed subset is byte-identical to a fresh build', { skip: !fs.existsSync(SOURCE) && 'tools/tailwind-2.2.19.min.css not present' }, () => {
  const committed = fs.readFileSync(SUBSET, 'utf8');
  execFileSync(process.execPath, [BUILDER], { stdio: 'pipe' });
  const rebuilt = fs.readFileSync(SUBSET, 'utf8');

  assert.equal(
    rebuilt,
    committed,
    'extension/vendor/tailwind.min.css is stale — run: node tools/build-tailwind.js'
  );
});

// Class names a stylesheet defines, with Tailwind's escaping removed.
function definedClasses(css) {
  const defined = new Set();
  const re = /\.((?:[^\s.,:>+~(){}[\]\\]|\\.)+)/g;
  let m;
  while ((m = re.exec(css))) defined.add(m[1].replace(/\\(.)/g, '$1'));
  return defined;
}

function markupClasses() {
  const used = new Set();
  for (const page of ['popup.html', 'options.html']) {
    const html = fs.readFileSync(path.join(EXT, page), 'utf8');
    for (const attr of html.match(/class="[^"]*"/g) || []) {
      for (const cls of attr.slice(7, -1).trim().split(/\s+/)) {
        if (cls) used.add(cls);
      }
    }
  }
  return used;
}

// The invariant that actually matters: subsetting must not lose anything the
// full upstream build would have provided. Classes that upstream never defined
// are a separate problem (see the next test) and must not be blamed on the
// generator.
test('subsetting drops no rule the full build would have provided', { skip: !fs.existsSync(SOURCE) && 'tools/tailwind-2.2.19.min.css not present' }, () => {
  const upstream = definedClasses(fs.readFileSync(SOURCE, 'utf8'));
  const subset = definedClasses(fs.readFileSync(SUBSET, 'utf8'));

  const lost = [...markupClasses()].filter((c) => upstream.has(c) && !subset.has(c));

  assert.deepEqual(
    lost.sort(),
    [],
    'these classes exist upstream but not in the subset — the generator dropped them'
  );
});

// Classes the markup asks for that Tailwind v2 never shipped. These render as
// nothing at all, silently. Tailwind v2 has no `amber` or `teal` palette, no
// `border-3`, and no v3-style arbitrary values like `min-w-[160px]`.
test('the markup references no utility that Tailwind v2 does not define', { skip: !fs.existsSync(SOURCE) && 'tools/tailwind-2.2.19.min.css not present' }, () => {
  const upstream = definedClasses(fs.readFileSync(SOURCE, 'utf8'));

  const TAILWIND_SHAPE =
    /^(?:sm:|md:|lg:|xl:|hover:|focus:|active:|disabled:)*(?:bg|text|border|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|flex|grid|gap|space|font|items|justify|shadow|opacity|z|min|max|overflow|cursor|transition|from|to|via|list|leading|tracking|inset|absolute|relative|fixed|sticky|block|inline|hidden|truncate)(?:-[a-z0-9./[\]%-]+)*$/;

  const dead = [...markupClasses()].filter(
    (c) => TAILWIND_SHAPE.test(c) && !upstream.has(c)
  );

  assert.deepEqual(
    dead.sort(),
    [],
    'these classes do not exist in Tailwind v2 and render as nothing'
  );
});
