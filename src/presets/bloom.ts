import type { GlassPreset } from '../types';

// Cyan, acid green, and coral light blooming outward from the center.
export const bloom: GlassPreset = {
  name: 'Bloom',
  version: 1,
  effectParams: {
    colors: ['#00e1ff', '#47ff6c', '#ff7161', '#dc83e2'],
    speed: 0.85,
    scale: 1.5,
    bright: 0.75,
    colorSpread: 0.4,
    colorSkew: 0.3,
    colorDrift: -0.34,
    velocity: 2,
    rampIn: 0.49,
    rampOut: 0.49,
    motion: 1,
  },
  settings: {
    frost: 0.78,
    frostInset: 1,
    coreBlur: 23,
    saturate: 1.45,
    innerBloom: { size: 3, level: 0.75 },
    outerBloom: { level: 0.4 },
  },
};
