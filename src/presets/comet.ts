import type { GlassPreset } from '../types';

// A fast, narrow orbiting glint softened by a deep background blur.
export const comet: GlassPreset = {
  name: 'Comet',
  version: 1,
  effectParams: {
    speed: 1.67,
    scale: 1.4,
    bright: 2,
    colorSpread: 1.7,
    colorSkew: 0.8,
    colorDrift: 0.28,
    velocity: 0,
    rampIn: 0.99,
    rampOut: 0.01,
    interval: 0.86,
    motion: 3,
  },
  settings: {
    bgBlur: 20,
    frostInset: 2,
    coreOpacity: 0.78,
    saturate: 2,
    innerBloom: { size: 4 },
    outerBloom: { size: 24 },
  },
};
