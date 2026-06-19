import type { GlassPreset } from '../types';

// Periwinkle and red waves splitting outward through translucent glass.
export const plasma: GlassPreset = {
  name: 'Plasma',
  version: 1,
  effectParams: {
    colors: ['#808eff', '#ff3d3d'],
    speed: 0.41,
    scale: 1.85,
    bright: 1.1,
    colorSpread: 1.1,
    colorDrift: -0.36,
    velocity: 2,
    rampIn: 0.5,
    rampOut: 0.85,
    interval: 0,
    angle: 79,
    motion: 1,
  },
  settings: {
    bgBlur: 20,
    frost: 0.3,
    frostInset: 1.5,
    coreInset: 0,
    coreBlur: 12,
    saturate: 1.4,
    innerBloom: { size: 4, level: 0.75 },
    outerBloom: { size: 22, level: 0.4 },
  },
};
