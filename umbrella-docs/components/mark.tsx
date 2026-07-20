// The Umbrella mark. One drawing at every size — a scalloped canopy (the
// shelter) over a pole and hook (the stalk), built from primitives so it holds
// at favicon size. Monochrome by construction: it paints in `currentColor`, so
// the same file is the nav mark, the footer signing mark, and the spec glyphs.

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Ferrule tip */}
      <circle cx="16" cy="2.7" r="0.95" fill="currentColor" />
      {/* Canopy — top semicircle closed by a scalloped hem */}
      <path
        d="M3 16.4 A13 13 0 0 1 29 16.4 Q 25.75 19 22.5 16.4 Q 19.25 19 16 16.4 Q 12.75 19 9.5 16.4 Q 6.25 19 3 16.4 Z"
        fill="currentColor"
      />
      {/* A single rib crease, to read the canopy as ribbed, not a dome */}
      <path
        d="M16 3.4 V 16.4 M9.6 6 Q 12 12 12.6 16.4 M22.4 6 Q 20 12 19.4 16.4"
        stroke="var(--panel, #faf9f7)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Pole + J-hook handle */}
      <path
        d="M16 3.2 V 25.2 a 2.7 2.7 0 0 1 -5.4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
