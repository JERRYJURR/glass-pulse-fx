import type { GlassPreset } from '../types';

// A broad halo rotating in reverse around a crisp exposed rim.
export const halo: GlassPreset = {
  name: 'Halo',
  version: 1,
  effectParams: {
    speed: -0.84,
    scale: 1.55,
    velocity: 0,
    rampIn: 0.51,
    rampOut: 0.51,
    motion: 3,
  },
  settings: {
    frostInset: 2,
  },
};
