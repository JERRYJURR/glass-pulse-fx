import type { GlassPreset } from '../types';

// Fast pastel ribbons in pink, cyan, lavender, and mint.
export const rush: GlassPreset = {
  name: 'Rush',
  version: 1,
  effectParams: {
    colors: ['#ff7ad9', '#7afcff', '#c9a7ff', '#aaffa3'],
    speed: 0.95,
    scale: 1.2,
    bright: 1.1,
    colorSpread: 0.3,
    velocity: 2,
    rampIn: 0.63,
    rampOut: 0.61,
    interval: 0.54,
  },
  settings: {
    bgBlur: 0,
    frost: 0.84,
    frostInset: 1.5,
    coreBlur: 16,
    innerBloom: { level: 0.55 },
    outerBloom: { size: 24, level: 0.2 },
  },
};
