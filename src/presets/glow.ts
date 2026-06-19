import type { GlassPreset } from '../types';

// Slow neon spokes drifting beneath a dark, translucent glass surface.
export const glow: GlassPreset = {
  name: 'Glow',
  version: 1,
  effectParams: {
    colors: ['#ff2d9b', '#e1ff00', '#00bbff'],
    speed: 0.16,
    scale: 0.1,
    colorSpread: 1.2,
    colorSkew: 0.3,
    colorDrift: 0.47,
    rampIn: 0.77,
    rampOut: 0.39,
    interval: 0,
    motion: 3,
  },
  settings: {
    bgBlur: 12,
    frost: 0.56,
    frostInset: 1,
    coreInset: 0,
    coreBlur: 16,
    coreOpacity: 0.8,
    saturate: 1,
    innerBloom: { size: 3, level: 0.85 },
    outerBloom: { size: 24, level: 0.3 },
  },
};
