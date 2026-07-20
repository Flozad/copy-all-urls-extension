// Which motion clips exist in /public/motion. The <Shot> component gates on this:
// a listed id renders its <video>; anything else falls back to the branded
// empty-state (the rain field + a note of what belongs there), so the page always
// looks intentional — before, during, and after a render pass.
//
// Add an id here the moment its scene is rendered by motion/scripts/render-all.ts.

export const RENDERED = new Set<string>([
  'hero-demo',
  'tour-copy',
  'tour-formats',
  'tour-paste',
  'tour-autocopy',
  'tour-shortcuts',
  'tour-context',
  'tour-windows',
  'tour-options',
  'tour-storage',
  'tour-dark',
]);

export const hasMotion = (id?: string): boolean => !!id && RENDERED.has(id);
