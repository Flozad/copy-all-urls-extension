'use client';

import { useEffect, useRef } from 'react';

/**
 * A hairline constellation: fine ink dots that drift and link with a thread when
 * they drift close. Pure ink, no colour — the same "weather" language as the
 * rain field, but interlinked. Sits behind the nameplate; the radial mask keeps
 * it dense at the edges and thin behind the type.
 */
export function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Ink, matching --ink #16161a at low alpha.
    const INK = '22, 22, 26';
    const LINK_DIST = 132; // px within which two dots thread together
    const POINTER_DIST = 168; // px within which the cursor threads to dots

    let width = 0;
    let height = 0;
    let dpr = 1;
    let points: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let raf = 0;

    // A gentle deterministic pseudo-random so the field looks scattered without
    // needing Math.random at module scope.
    let seed = 20260715;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with area, capped so large screens stay light.
      const count = Math.min(88, Math.round((width * height) / 13000));
      points = Array.from({ length: count }, () => ({
        x: rand() * width,
        y: rand() * height,
        vx: (rand() - 0.5) * 0.22,
        vy: (rand() - 0.5) * 0.22,
        r: 0.9 + rand() * 1.1,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Threads first, so dots sit on top.
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        for (let j = i + 1; j < points.length; j++) {
          const b = points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.16;
            ctx.strokeStyle = `rgba(${INK}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Thread to the cursor for a touch of life.
        if (pointer.active) {
          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < POINTER_DIST) {
            const alpha = (1 - dist / POINTER_DIST) * 0.24;
            ctx.strokeStyle = `rgba(${INK}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // Dots.
      for (const p of points) {
        ctx.fillStyle = `rgba(${INK}, 0.34)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;
        // Wrap around the edges so the field never empties out.
        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        else if (p.y > height + 20) p.y = -20;
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    build();

    if (reduced) {
      draw(); // one static frame, no motion
    } else {
      raf = requestAnimationFrame(step);
    }

    const onResize = () => {
      cancelAnimationFrame(raf);
      build();
      if (reduced) draw();
      else raf = requestAnimationFrame(step);
    };

    window.addEventListener('resize', onResize);
    const host = canvas.parentElement ?? canvas;
    host.addEventListener('pointermove', onPointerMove as EventListener);
    host.addEventListener('pointerleave', onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointermove', onPointerMove as EventListener);
      host.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="u-web" aria-hidden="true" />;
}
