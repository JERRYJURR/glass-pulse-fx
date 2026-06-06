// Performance / sizing constants for the shared renderer and per-instance crop.
// Pulled out so the frame rate and GL resolution are a single source of truth.

import type { Kind } from '../types';

/** Offscreen GL canvas edge in CSS px (squared, then DPR-scaled). */
export const GL_SIZE = 96;

/** Device pixel ratio, capped at 2. Guarded for SSR (only read in the browser). */
export const DPR =
  typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

/** Shared loop frame rate. Lower (e.g. 15) for lighter GPU load. */
export const FPS = 30;
export const FRAME_MS = 1000 / FPS;

// Resolution-independent crop divisors (DPR cancels): srcW = cssW * glW / CROP_W / shaderScale
export const CROP_W = 140;
export const CROP_H = 40;

/** Per-kind shader crop scale — how much of the shader field a shape samples. */
export const SHADER_SCALE: Record<Kind, number> = {
  pill: 1.6,
  circle: 1.3,
  rect: 1.7,
  tag: 1.25,
  card: 2.4,
  icon: 1.15,
};

/** Max raster edge for a bloom canvas (keeps the soft glow cheap). */
export const BLOOM_MAX = 240;
