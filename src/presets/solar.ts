import type { GlassPreset } from '../types';

// Golden light emanating from the center — warm rays, generous glow.
export const solar: GlassPreset = {
  name: 'Solar',
  version: 1,
  effectParams: {
    colors: ['#fff3c4', '#ffd23f', '#ff9d00'],
    motion: 1, speed: 0.3, scale: 1.8, interval: 0.45,
    rampIn: 0.2, rampOut: 0.6, colorSpread: 1.2, velocity: 1,
  },
  settings: { saturate: 1.4, outerBloom: { size: 24, level: 0.55 } },
};
