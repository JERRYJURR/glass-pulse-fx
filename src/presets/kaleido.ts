import type { GlassPreset } from '../types';

// A rotating five-color field with continuously shifting spokes.
export const kaleido: GlassPreset = {
  name: 'Kaleido',
  version: 1,
  effectParams: {
    colors: ['#70ff94', '#8044ca', '#57aeff', '#ff6666', '#aeaf55'],
    speed: -0.42,
    scale: 2.1,
    bright: 1.1,
    colorSpread: 0.7,
    colorSkew: 0.4,
    colorDrift: 0.22,
    velocity: 0,
    rampIn: 0.59,
    rampOut: 0.55,
    interval: 0,
    motion: 3,
  },
  settings: {
    bgBlur: 16,
    frost: 0.6,
    frostInset: 1,
    coreInset: 4,
    saturate: 1.4,
    innerBloom: { level: 0.7 },
    outerBloom: { size: 24, level: 0.3 },
  },
};
