'use client';

// A shot frame. It holds a short silent clip — a synthetic recording of the
// surface it describes — behind a poster taken from a late frame. The clips
// carry no `autoplay`: an IntersectionObserver starts each one only while it is
// on screen and pauses it the moment it leaves, so a reader who only ever sees
// the masthead never pays to download twelve videos. Off screen (and for anyone
// who asked for reduced motion, where playback never starts) the poster stands
// in — and because posters are late frames, they show the finished result, so
// the page degrades to a clean grid of screenshots.
//
// When a clip has not been rendered yet, pass no `src`: the frame draws its
// empty state (the rain field, a dashed edge, and a note of what belongs here),
// so the page is whole before a single video exists.

import { useEffect, useRef } from 'react';
import { hasMotion } from '@/lib/motion';

type ShotProps = {
  /** e.g. "wide" or "panel" — sets the aspect. */
  shape?: 'wide' | 'panel';
  /** Basename in /motion, e.g. "tour-copy". Omit for the empty state. */
  src?: string;
  label?: string;
  note?: string;
  caption?: React.ReactNode;
  ariaLabel?: string;
};

export function Shot({
  shape = 'wide',
  src,
  label,
  note,
  caption,
  ariaLabel,
}: ShotProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (!('IntersectionObserver' in window)) {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            v.play().catch(() => {
              /* autoplay refused — the poster is a fine screenshot */
            });
          } else {
            v.pause();
          }
        }
      },
      { rootMargin: '15% 0px', threshold: 0.15 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  // No src, or the clip hasn't been rendered yet → the branded empty state.
  if (!hasMotion(src)) {
    return (
      <figure className={`u-shot empty ${shape}`}>
        <div className="u-shot-frame">
          <p className="u-shot-label">{label ?? 'Recording'}</p>
          {note && <p className="u-shot-note">{note}</p>}
        </div>
        {caption && <figcaption className="u-shot-cap">{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className={`u-shot ${shape}`}>
      <div className="u-shot-frame">
        {/* biome-ignore lint/a11y/useMediaCaption: silent UI recording, no audio track */}
        <video
          ref={ref}
          src={`/motion/${src}.mp4`}
          poster={`/motion/${src}.jpg`}
          muted
          loop
          playsInline
          preload="none"
          aria-label={ariaLabel}
        />
      </div>
      {caption && <figcaption className="u-shot-cap">{caption}</figcaption>}
    </figure>
  );
}
