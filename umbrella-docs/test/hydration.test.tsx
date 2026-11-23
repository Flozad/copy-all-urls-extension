import { expect, test } from 'bun:test';
import { JSDOM, VirtualConsole } from 'jsdom';
import { renderToString } from 'react-dom/server';
import HomePage from '../app/page';

// Hydration is the behaviour under test: when the server markup and the first
// client render disagree, React logs an error (#418 in production) and
// regenerates the whole tree — the landing page did exactly that from the SVG
// dials' hoisted <title> and the hero clip's muted attribute. This renders the
// real page, hydrates it in a DOM, and fails on any such mismatch. It also
// pins the clip to stay muted once the effect runs, since `muted` now lives
// there instead of in the JSX.

const ADOPT = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLVideoElement',
  'HTMLCanvasElement',
  'SVGElement',
  'Element',
  'Node',
  'Event',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
] as const;

function adoptWindow(win: JSDOM['window']) {
  // jsdom ships no matchMedia; every browser has one, and the page only reads
  // prefers-reduced-motion from it.
  if (typeof win.matchMedia !== 'function') {
    win.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof win.matchMedia;
  }
  const saved = new Map<string, PropertyDescriptor | undefined>();
  for (const name of ADOPT) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    const value =
      name === 'window'
        ? win
        : name === 'document'
          ? win.document
          : (win as unknown as Record<string, unknown>)[name];
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  return () => {
    for (const [name, descriptor] of saved) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete (globalThis as Record<string, unknown>)[name];
      }
    }
  };
}

test('the landing page hydrates with no server/client mismatch', async () => {
  const html = renderToString(<HomePage />);
  const dom = new JSDOM(
    `<!doctype html><html><body><div id="root">${html}</div></body></html>`,
    { virtualConsole: new VirtualConsole(), pretendToBeVisual: true }
  );
  const restore = adoptWindow(dom.window);
  const recoverable: string[] = [];
  const consoleErrors: string[] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' '));
  };
  try {
    const { hydrateRoot } = await import('react-dom/client');
    const container = dom.window.document.getElementById('root');
    if (!container) throw new Error('no #root to hydrate');
    const root = hydrateRoot(container, <HomePage />, {
      onRecoverableError: (error) => recoverable.push(String(error)),
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(dom.window.document.querySelector('video')?.muted).toBe(true);
    root.unmount();
    // React flushes passive effects on its own scheduler; let it finish before
    // the window globals go away below.
    await new Promise((resolve) => setTimeout(resolve, 250));
  } finally {
    console.error = origError;
    restore();
  }
  // Every recoverable error is a server/client mismatch: in development React
  // names the mismatched nodes, in production it is the minified "#418" — the
  // string the live site logged. Nothing here may be filtered away, or the
  // guard goes green on a broken page in a production build.
  expect(recoverable.map((e) => e.split('\n')[0])).toEqual([]);
  // Console output carries unrelated noise, but a hydration complaint in it is
  // still a complaint.
  expect(
    consoleErrors.filter((e) =>
      /hydrat|did not match|minified react error #4/i.test(e)
    )
  ).toEqual([]);
});
