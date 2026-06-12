import type { GlassPreset } from '../types';

// Phosphor-green sweep with a sharp head and long decaying tail.
export const radar: GlassPreset = {
  name: 'Radar',
  version: 1,
  effectParams: {
    colors: ['#0aff6e', '#00c853', '#0a4f2a'],
    motion: 3, scale: 1, speed: 0.15, interval: 0.6,
    rampIn: 0.06, rampOut: 0.9, colorSpread: 1, velocity: 0,
  },
  settings: { innerBloom: { size: 3, level: 1 }, outerBloom: { size: 18, level: 0.5 } },
};
