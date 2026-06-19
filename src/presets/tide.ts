import type { GlassPreset } from '../types';

// Peach, aqua, and acid-lime light flowing inward beneath a saturated veil.
export const tide: GlassPreset = {
  name: 'Tide',
  version: 1,
  effectParams: {
    colors: ['#fda163', '#7eddd2', '#dbfd5d'],
    speed: -0.84,
    scale: 1.7,
    bright: 0.85,
    colorSpread: 0.5,
    colorSkew: 0.2,
    colorDrift: -0.13,
    velocity: 3,
    rampIn: 0.21,
    rampOut: 0.45,
    motion: 1,
  },
  settings: {
    bgBlur: 20,
    frost: 0.9,
    frostInset: 3,
    shaderInset: 2,
    coreInset: 0,
    coreBlur: 0,
    coreOpacity: 0.5,
    saturate: 2,
    innerBloom: { level: 0.8 },
    outerBloom: { size: 12, level: 0.3 },
  },
};
