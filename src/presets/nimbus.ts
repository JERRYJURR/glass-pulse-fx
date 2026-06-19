import type { GlassPreset } from '../types';

// High-contrast black and white spokes folding into a liquid moire.
export const nimbus: GlassPreset = {
  name: 'Nimbus',
  version: 1,
  effectParams: {
    colors: ['#000000', '#ffffff'],
    speed: 0.1,
    scale: 4,
    colorSpread: 3.7,
    colorSkew: 2.4,
    colorDrift: 0.57,
    velocity: 0,
    rampIn: 0.9,
    rampOut: 0.9,
    interval: 0,
    motion: 3,
  },
  settings: {
    bgBlur: 12,
    frost: 0.5,
    frostInset: 2,
    coreBlur: 16,
    innerBloom: { size: 4 },
    outerBloom: { size: 8, level: 0.5 },
  },
};
