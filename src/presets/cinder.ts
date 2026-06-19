import type { GlassPreset } from '../types';

// Vertical orange and gold flames with a long, hot trailing glow.
export const cinder: GlassPreset = {
  name: 'Cinder',
  version: 1,
  effectParams: {
    colors: ['#ff3d00', '#ff8a00', '#ffc400'],
    speed: 1.19,
    scale: 1.4,
    bright: 0.95,
    colorSpread: 1,
    colorSkew: 0.1,
    rampIn: 0.5,
    rampOut: 0.85,
    interval: 0.64,
    angle: 90,
  },
  settings: {
    frostInset: 2,
    saturate: 1.4,
    innerBloom: { size: 4 },
    outerBloom: { size: 24, level: 0.4 },
  },
};
