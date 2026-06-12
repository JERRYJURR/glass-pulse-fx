import type { GlassPreset } from '../types';

// Warm fire tones rising vertically, soft trailing fades — cozy, slow.
export const ember: GlassPreset = {
  name: 'Ember',
  version: 1,
  effectParams: {
    colors: ['#ff3d00', '#ff8a00', '#ffc400'],
    angle: 90, speed: 0.15, scale: 1.4, interval: 0.5,
    rampIn: 0.5, rampOut: 0.85, colorSpread: 1.2, bright: 1.1,
  },
  settings: { saturate: 1.4, outerBloom: { size: 22, level: 0.5 } },
};
