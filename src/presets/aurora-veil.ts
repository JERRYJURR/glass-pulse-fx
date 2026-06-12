import type { GlassPreset } from '../types';

// Slow teal-to-violet curtains breathing from the center — calm, ambient.
export const auroraVeil: GlassPreset = {
  name: 'Aurora Veil',
  version: 1,
  effectParams: {
    colors: ['#16e0b8', '#27b6ff', '#8a5cff', '#e85cff'],
    motion: 1, speed: 0.08, scale: 1.1, interval: 0.12,
    rampIn: 0.9, rampOut: 0.9, colorSpread: 1.5, colorDrift: 0.12, velocity: 0,
  },
  settings: { bgBlur: 8, outerBloom: { size: 20, level: 0.5 } },
};
